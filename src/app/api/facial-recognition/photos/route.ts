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

    // Assess photo quality (simulated - in production, use AI service)
    const qualityAssessment = assessPhotoQuality(file);

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
 * Simulate photo quality assessment
 * In production, this would use an AI service for accurate assessment
 */
function assessPhotoQuality(file: File): {
  grade: PhotoQualityGrade;
  score: number;
  factors: PhotoQualityFactors;
} {
  // Simulated quality assessment based on file size
  // In production, analyze actual image properties
  const fileSizeMB = file.size / (1024 * 1024);

  // Base scores (simulated)
  const factors: PhotoQualityFactors = {
    lighting: Math.min(100, 60 + Math.random() * 40),
    focus: Math.min(100, 70 + Math.random() * 30),
    resolution: fileSizeMB > 1 ? 85 + Math.random() * 15 : 50 + Math.random() * 30,
    faceVisibility: Math.min(100, 65 + Math.random() * 35),
    occlusion: Math.min(100, 75 + Math.random() * 25),
    angle: Math.min(100, 70 + Math.random() * 30),
    overall: 0,
  };

  // Calculate overall score
  factors.overall = Math.round(
    (factors.lighting * 0.15 +
      factors.focus * 0.25 +
      factors.resolution * 0.2 +
      factors.faceVisibility * 0.25 +
      factors.occlusion * 0.1 +
      factors.angle * 0.05)
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
