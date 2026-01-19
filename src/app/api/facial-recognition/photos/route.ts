/**
 * Photo Submissions API Routes (LC-FEAT-030)
 * Handles photo uploads, quality assessment, and processing for facial recognition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapPhotoSubmissionFromDb,
  PhotoQualityGrade,
  PhotoQualityFactors,
} from '@/types/facial-recognition.types';

/**
 * GET /api/facial-recognition/photos
 * Retrieve photo submissions with filtering
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const status = searchParams.get('status');
  const qualityGrade = searchParams.get('qualityGrade');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('photo_submissions')
    .select('*', { count: 'exact' });

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (status === 'processed') {
    query = query.eq('is_processed', true);
  } else if (status === 'pending') {
    query = query.eq('is_processed', false);
  }

  if (qualityGrade) {
    query = query.eq('quality_grade', qualityGrade);
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching photo submissions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const photos = (data || []).map((row) => mapPhotoSubmissionFromDb(row as Record<string, unknown>));

  return NextResponse.json({
    data: photos,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/facial-recognition/photos
 * Upload a new photo for facial recognition processing
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const submissionSource = formData.get('submissionSource') as string || 'family_upload';
    const consentRecordId = formData.get('consentRecordId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC' },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB' },
        { status: 400 }
      );
    }

    // Verify consent if required
    if (consentRecordId) {
      const { data: consent, error: consentError } = await supabase
        .from('consent_records')
        .select('consent_status')
        .eq('id', consentRecordId)
        .single();

      if (consentError || !consent || consent.consent_status !== 'granted') {
        return NextResponse.json(
          { error: 'Valid consent required for photo upload' },
          { status: 403 }
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${caseId || 'uncategorized'}/${timestamp}-${crypto.randomUUID()}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('facial-recognition-photos')
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('facial-recognition-photos')
      .getPublicUrl(uploadData.path);

    // Assess photo quality using image analysis
    const qualityAssessment = await assessPhotoQuality(file);

    // Create database record
    const photoRecord = {
      case_id: caseId,
      submitted_by: user.id,
      submission_source: submissionSource,
      original_filename: file.name,
      file_path: uploadData.path,
      file_url: urlData.publicUrl,
      file_size_bytes: file.size,
      mime_type: file.type,
      quality_grade: qualityAssessment.grade,
      quality_score: qualityAssessment.score,
      quality_factors: qualityAssessment.factors,
      consent_record_id: consentRecordId,
      is_consent_verified: !!consentRecordId,
      has_face_detected: false, // Will be updated by processing job
      face_count: 0,
      is_processed: false,
    };

    const { data: photo, error: dbError } = await supabase
      .from('photo_submissions')
      .insert(photoRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('facial-recognition-photos').remove([uploadData.path]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Queue for facial detection processing (would trigger background job)
    // await queuePhotoProcessing(photo.id);

    return NextResponse.json({
      data: mapPhotoSubmissionFromDb(photo as Record<string, unknown>),
      qualityAssessment: {
        grade: qualityAssessment.grade,
        score: qualityAssessment.score,
        factors: qualityAssessment.factors,
        enhancementRecommended: qualityAssessment.score < 60,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Assess photo quality using image analysis
 * Uses multiple techniques: file metadata, dimension analysis, and optional AI services
 */
async function assessPhotoQuality(file: File): Promise<{
  grade: PhotoQualityGrade;
  score: number;
  factors: PhotoQualityFactors;
}> {
  const fileSizeMB = file.size / (1024 * 1024);

  // Parse image to get actual dimensions and properties
  const imageData = await parseImageData(file);

  // Calculate resolution score based on actual pixel dimensions
  const minDimension = Math.min(imageData.width, imageData.height);
  const maxDimension = Math.max(imageData.width, imageData.height);
  let resolutionScore: number;
  if (minDimension >= 1080) {
    resolutionScore = 95;
  } else if (minDimension >= 720) {
    resolutionScore = 85;
  } else if (minDimension >= 480) {
    resolutionScore = 70;
  } else if (minDimension >= 240) {
    resolutionScore = 50;
  } else {
    resolutionScore = 30;
  }

  // Aspect ratio check for portrait photos (faces are typically in portrait orientation)
  const aspectRatio = maxDimension / minDimension;
  const aspectPenalty = aspectRatio > 3 ? -15 : aspectRatio > 2 ? -5 : 0;
  resolutionScore = Math.max(0, resolutionScore + aspectPenalty);

  // Estimate compression quality from file size vs dimensions
  const expectedSizeKB = (imageData.width * imageData.height * 3) / 1024 / 10; // Rough estimate for JPEG
  const actualSizeKB = file.size / 1024;
  const compressionRatio = actualSizeKB / expectedSizeKB;
  let compressionScore: number;
  if (compressionRatio >= 0.5) {
    compressionScore = 90; // Low compression, good quality
  } else if (compressionRatio >= 0.25) {
    compressionScore = 75;
  } else if (compressionRatio >= 0.1) {
    compressionScore = 55;
  } else {
    compressionScore = 35; // Heavily compressed
  }

  // Try to use AI service for face detection and quality (if configured)
  let faceAnalysis = {
    faceVisibility: 70,
    lighting: 70,
    focus: 75,
    occlusion: 80,
    angle: 75,
  };

  // Try Azure Face API if configured
  const azureKey = process.env.AZURE_FACE_API_KEY;
  const azureEndpoint = process.env.AZURE_FACE_API_ENDPOINT;
  if (azureKey && azureEndpoint) {
    const aiAnalysis = await analyzeWithAzureFace(file, azureKey, azureEndpoint);
    if (aiAnalysis) {
      faceAnalysis = aiAnalysis;
    }
  } else {
    // Try AWS Rekognition if configured
    const awsRegion = process.env.AWS_REGION;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (awsRegion && awsAccessKey && awsSecretKey) {
      const aiAnalysis = await analyzeWithRekognition(file, awsRegion, awsAccessKey, awsSecretKey);
      if (aiAnalysis) {
        faceAnalysis = aiAnalysis;
      }
    }
  }

  // Compile final factors
  const factors: PhotoQualityFactors = {
    lighting: faceAnalysis.lighting,
    focus: Math.round((faceAnalysis.focus + compressionScore) / 2), // Combine AI focus with compression
    resolution: resolutionScore,
    faceVisibility: faceAnalysis.faceVisibility,
    occlusion: faceAnalysis.occlusion,
    angle: faceAnalysis.angle,
    overall: 0,
  };

  // Calculate weighted overall score
  factors.overall = Math.round(
    factors.lighting * 0.15 +
      factors.focus * 0.25 +
      factors.resolution * 0.2 +
      factors.faceVisibility * 0.25 +
      factors.occlusion * 0.1 +
      factors.angle * 0.05
  );

  // Determine grade
  let grade: PhotoQualityGrade;
  if (factors.overall >= 90) {
    grade = 'excellent';
  } else if (factors.overall >= 75) {
    grade = 'good';
  } else if (factors.overall >= 55) {
    grade = 'fair';
  } else if (factors.overall >= 30) {
    grade = 'poor';
  } else {
    grade = 'unusable';
  }

  return {
    grade,
    score: factors.overall,
    factors,
  };
}

/**
 * Parse image data to extract dimensions
 */
async function parseImageData(file: File): Promise<{ width: number; height: number }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check for JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return parseJpegDimensions(bytes);
  }

  // Check for PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return parsePngDimensions(bytes);
  }

  // Check for WebP
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return parseWebPDimensions(bytes);
  }

  // Default fallback - estimate from file size
  const estimatedPixels = file.size / 3;
  const side = Math.sqrt(estimatedPixels);
  return { width: Math.round(side), height: Math.round(side) };
}

/**
 * Parse JPEG dimensions from file header
 */
function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  let offset = 2;
  while (offset < bytes.length - 8) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];
    // SOF markers (Start Of Frame)
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return { width, height };
    }

    // Skip this segment
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + segmentLength;
  }

  return { width: 800, height: 600 }; // Default fallback
}

/**
 * Parse PNG dimensions from file header
 */
function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } {
  // PNG dimensions are at bytes 16-23 in the IHDR chunk
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  return { width, height };
}

/**
 * Parse WebP dimensions from file header
 */
function parseWebPDimensions(bytes: Uint8Array): { width: number; height: number } {
  // Check for VP8 (lossy)
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
    const width = ((bytes[26] | (bytes[27] << 8)) & 0x3fff);
    const height = ((bytes[28] | (bytes[29] << 8)) & 0x3fff);
    return { width, height };
  }

  // Check for VP8L (lossless)
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4c) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  return { width: 800, height: 600 }; // Default fallback
}

/**
 * Analyze image using Azure Face API
 */
async function analyzeWithAzureFace(
  file: File,
  apiKey: string,
  endpoint: string
): Promise<{
  faceVisibility: number;
  lighting: number;
  focus: number;
  occlusion: number;
  angle: number;
} | null> {
  try {
    const buffer = await file.arrayBuffer();

    const response = await fetch(
      `${endpoint}/face/v1.0/detect?returnFaceAttributes=headPose,blur,exposure,noise,occlusion,qualityForRecognition`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      console.error('[PhotoQuality] Azure Face API error:', await response.text());
      return null;
    }

    const faces = (await response.json()) as Array<{
      faceAttributes: {
        blur: { blurLevel: string; value: number };
        exposure: { exposureLevel: string; value: number };
        noise: { noiseLevel: string; value: number };
        occlusion: { foreheadOccluded: boolean; eyeOccluded: boolean; mouthOccluded: boolean };
        headPose: { pitch: number; roll: number; yaw: number };
        qualityForRecognition: string;
      };
    }>;

    if (faces.length === 0) {
      return { faceVisibility: 0, lighting: 50, focus: 50, occlusion: 100, angle: 50 };
    }

    const face = faces[0];
    const attrs = face.faceAttributes;

    // Calculate focus from blur value (0-1, lower is better)
    const focusScore = Math.round(100 - attrs.blur.value * 100);

    // Calculate lighting from exposure (0-1, 0.5 is ideal)
    const exposureDeviation = Math.abs(attrs.exposure.value - 0.5);
    const lightingScore = Math.round(100 - exposureDeviation * 200);

    // Calculate occlusion score
    const occlusionCount = [attrs.occlusion.foreheadOccluded, attrs.occlusion.eyeOccluded, attrs.occlusion.mouthOccluded]
      .filter(Boolean).length;
    const occlusionScore = Math.round(100 - occlusionCount * 30);

    // Calculate angle score from head pose
    const totalAngle = Math.abs(attrs.headPose.pitch) + Math.abs(attrs.headPose.roll) + Math.abs(attrs.headPose.yaw);
    const angleScore = Math.max(0, Math.round(100 - totalAngle));

    // Map quality for recognition to visibility
    const qualityMap: Record<string, number> = { high: 95, medium: 70, low: 40 };
    const faceVisibility = qualityMap[attrs.qualityForRecognition] || 50;

    return {
      faceVisibility,
      lighting: Math.max(0, Math.min(100, lightingScore)),
      focus: Math.max(0, Math.min(100, focusScore)),
      occlusion: Math.max(0, Math.min(100, occlusionScore)),
      angle: Math.max(0, Math.min(100, angleScore)),
    };
  } catch (error) {
    console.error('[PhotoQuality] Azure Face API error:', error);
    return null;
  }
}

/**
 * Analyze image using AWS Rekognition
 */
async function analyzeWithRekognition(
  file: File,
  region: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<{
  faceVisibility: number;
  lighting: number;
  focus: number;
  occlusion: number;
  angle: number;
} | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    // AWS Signature V4 setup
    const service = 'rekognition';
    const host = `rekognition.${region}.amazonaws.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const requestBody = JSON.stringify({
      Image: { Bytes: base64 },
      Attributes: ['ALL'],
    });

    // Create canonical request
    const method = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const payloadHash = await sha256Hex(requestBody);
    const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:RekognitionService.DetectFaces\n`;
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

    // Calculate signature
    const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(`https://${host}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Date': amzDate,
        'X-Amz-Target': 'RekognitionService.DetectFaces',
        Authorization: authorizationHeader,
      },
      body: requestBody,
    });

    if (!response.ok) {
      console.error('[PhotoQuality] Rekognition error:', await response.text());
      return null;
    }

    const result = (await response.json()) as {
      FaceDetails?: Array<{
        Confidence: number;
        Quality: { Brightness: number; Sharpness: number };
        Pose: { Roll: number; Yaw: number; Pitch: number };
        Sunglasses?: { Value: boolean };
        EyesOpen?: { Value: boolean };
        MouthOpen?: { Value: boolean };
      }>;
    };

    if (!result.FaceDetails || result.FaceDetails.length === 0) {
      return { faceVisibility: 0, lighting: 50, focus: 50, occlusion: 100, angle: 50 };
    }

    const face = result.FaceDetails[0];

    // Map Rekognition values to our scoring system
    const faceVisibility = Math.round(face.Confidence);
    const lighting = Math.round(face.Quality.Brightness);
    const focus = Math.round(face.Quality.Sharpness);

    // Calculate occlusion from sunglasses and eye visibility
    let occlusion = 100;
    if (face.Sunglasses?.Value) occlusion -= 40;
    if (face.EyesOpen?.Value === false) occlusion -= 20;
    occlusion = Math.max(0, occlusion);

    // Calculate angle from pose
    const totalAngle = Math.abs(face.Pose.Pitch) + Math.abs(face.Pose.Roll) + Math.abs(face.Pose.Yaw);
    const angle = Math.max(0, Math.round(100 - totalAngle));

    return {
      faceVisibility,
      lighting: Math.max(0, Math.min(100, lighting)),
      focus: Math.max(0, Math.min(100, focus)),
      occlusion,
      angle,
    };
  } catch (error) {
    console.error('[PhotoQuality] Rekognition error:', error);
    return null;
  }
}

// Helper functions for AWS Signature V4
async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const signature = await hmacSha256(key, message);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}
