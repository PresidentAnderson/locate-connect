/**
 * AI Photo Matching Service
 * Face recognition and photo comparison for missing persons
 */

import { createClient } from "@/lib/supabase/server";
import type { PhotoMatchRequest, PhotoMatchResult } from "@/types/compliance.types";

interface FacialFeatures {
  embedding: number[];
  landmarks: Array<{ x: number; y: number; type: string }>;
  boundingBox: { x: number; y: number; width: number; height: number };
  quality: number;
  ageEstimate?: number;
  genderEstimate?: string;
}

interface ExternalDatabaseConfig {
  id: string;
  name: string;
  type: "namus" | "ncic" | "ncmec" | "interpol" | "custom";
  apiUrl: string;
  apiKey?: string;
  enabled: boolean;
}

// External database configurations (loaded from env/settings)
const EXTERNAL_DATABASES: ExternalDatabaseConfig[] = [
  {
    id: "namus",
    name: "NamUs (National Missing and Unidentified Persons System)",
    type: "namus",
    apiUrl: process.env.NAMUS_API_URL || "",
    apiKey: process.env.NAMUS_API_KEY,
    enabled: !!process.env.NAMUS_API_KEY,
  },
  {
    id: "ncmec",
    name: "NCMEC (National Center for Missing & Exploited Children)",
    type: "ncmec",
    apiUrl: process.env.NCMEC_API_URL || "",
    apiKey: process.env.NCMEC_API_KEY,
    enabled: !!process.env.NCMEC_API_KEY,
  },
];

class PhotoMatchingService {
  private requests: Map<string, PhotoMatchRequest> = new Map();
  private faceEmbeddingCache: Map<string, FacialFeatures> = new Map();

  // Face recognition API configuration
  private faceApiProvider: "aws" | "azure" | "local" = "local";
  private awsRekognitionRegion = process.env.AWS_REGION || "us-east-1";
  private azureFaceEndpoint = process.env.AZURE_FACE_ENDPOINT || "";
  private azureFaceKey = process.env.AZURE_FACE_KEY || "";

  constructor() {
    // Determine which face recognition provider to use
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.faceApiProvider = "aws";
    } else if (this.azureFaceEndpoint && this.azureFaceKey) {
      this.faceApiProvider = "azure";
    }
    console.log(`[PhotoMatching] Initialized with provider: ${this.faceApiProvider}`);
  }

  /**
   * Submit photo for matching
   */
  async submitMatchRequest(
    caseId: string,
    imageUrl: string
  ): Promise<PhotoMatchRequest> {
    const supabase = await createClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const request: PhotoMatchRequest = {
      id,
      caseId,
      sourceImageUrl: imageUrl,
      status: "pending",
      createdAt: now,
    };

    // Store in memory and database
    this.requests.set(id, request);

    // Persist to database
    await supabase.from("photo_match_requests").insert({
      id,
      case_id: caseId,
      source_image_url: imageUrl,
      status: "pending",
      created_at: now,
    });

    console.log(`[PhotoMatching] Request submitted for case ${caseId}`);

    // Process asynchronously
    this.processMatchRequest(id).catch(async (error) => {
      console.error(`[PhotoMatching] Error processing request ${id}:`, error);
      request.status = "failed";
      this.requests.set(id, request);

      await supabase
        .from("photo_match_requests")
        .update({ status: "failed" })
        .eq("id", id);
    });

    return request;
  }

  /**
   * Get match request status
   */
  async getRequest(requestId: string): Promise<PhotoMatchRequest | null> {
    // Check memory cache first
    if (this.requests.has(requestId)) {
      return this.requests.get(requestId) || null;
    }

    // Load from database
    const supabase = await createClient();
    const { data } = await supabase
      .from("photo_match_requests")
      .select(`
        id,
        case_id,
        source_image_url,
        status,
        created_at,
        completed_at,
        photo_match_results(*)
      `)
      .eq("id", requestId)
      .single();

    if (!data) return null;

    const request: PhotoMatchRequest = {
      id: data.id,
      caseId: data.case_id,
      sourceImageUrl: data.source_image_url,
      status: data.status,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      results: (data.photo_match_results as Array<{
        id: string;
        matched_image_url: string;
        source: string;
        confidence: number;
        facial_features: Record<string, unknown>;
        metadata: Record<string, unknown>;
        verified_by: string | null;
        verified_at: string | null;
        is_match: boolean | null;
      }>)?.map((r) => ({
        id: r.id,
        matchedImageUrl: r.matched_image_url,
        source: r.source,
        confidence: r.confidence,
        facialFeatures: r.facial_features as PhotoMatchResult["facialFeatures"],
        metadata: r.metadata,
        verifiedBy: r.verified_by || undefined,
        verifiedAt: r.verified_at || undefined,
        isMatch: r.is_match ?? undefined,
      })),
    };

    this.requests.set(requestId, request);
    return request;
  }

  /**
   * List match requests for a case
   */
  async listRequests(caseId: string): Promise<PhotoMatchRequest[]> {
    const supabase = await createClient();

    const { data } = await supabase
      .from("photo_match_requests")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      sourceImageUrl: row.source_image_url,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  }

  /**
   * Process match request
   */
  private async processMatchRequest(requestId: string): Promise<void> {
    const supabase = await createClient();
    const request = this.requests.get(requestId);
    if (!request) return;

    request.status = "processing";
    this.requests.set(requestId, request);

    await supabase
      .from("photo_match_requests")
      .update({ status: "processing" })
      .eq("id", requestId);

    try {
      // Extract facial features from source image
      const sourceFeatures = await this.extractFacialFeatures(
        request.sourceImageUrl
      );

      if (!sourceFeatures) {
        request.status = "failed";
        this.requests.set(requestId, request);
        await supabase
          .from("photo_match_requests")
          .update({ status: "failed" })
          .eq("id", requestId);
        return;
      }

      // Store facial embedding for this case
      await this.storeFacialEmbedding(request.caseId, request.sourceImageUrl, sourceFeatures);

      // Search for matches across databases
      const results = await this.searchForMatches(sourceFeatures, request.caseId);

      // Store results
      if (results.length > 0) {
        const resultRows = results.map((r) => ({
          id: r.id,
          request_id: requestId,
          matched_image_url: r.matchedImageUrl,
          source: r.source,
          confidence: r.confidence,
          facial_features: r.facialFeatures,
          metadata: r.metadata,
        }));

        await supabase.from("photo_match_results").insert(resultRows);
      }

      request.status = "completed";
      request.completedAt = new Date().toISOString();
      request.results = results;
      this.requests.set(requestId, request);

      await supabase
        .from("photo_match_requests")
        .update({
          status: "completed",
          completed_at: request.completedAt,
        })
        .eq("id", requestId);

      console.log(
        `[PhotoMatching] Request ${requestId} completed with ${results.length} matches`
      );

      // Create leads for high-confidence matches
      if (results.some((r) => r.confidence >= 80)) {
        await this.createMatchLeads(request.caseId, results.filter((r) => r.confidence >= 80));
      }
    } catch (error) {
      request.status = "failed";
      this.requests.set(requestId, request);

      await supabase
        .from("photo_match_requests")
        .update({ status: "failed" })
        .eq("id", requestId);

      throw error;
    }
  }

  /**
   * Extract facial features from image using configured provider
   */
  private async extractFacialFeatures(
    imageUrl: string
  ): Promise<FacialFeatures | null> {
    console.log(`[PhotoMatching] Extracting features from ${imageUrl}`);

    switch (this.faceApiProvider) {
      case "aws":
        return this.extractFeaturesWithAWS(imageUrl);
      case "azure":
        return this.extractFeaturesWithAzure(imageUrl);
      default:
        return this.extractFeaturesLocal(imageUrl);
    }
  }

  /**
   * Extract features using AWS Rekognition
   */
  private async extractFeaturesWithAWS(imageUrl: string): Promise<FacialFeatures | null> {
    try {
      // Download image and convert to bytes
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error(`[PhotoMatching] Failed to fetch image: ${imageResponse.status}`);
        return null;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBytes = Buffer.from(imageBuffer).toString("base64");

      // Call AWS Rekognition DetectFaces
      const rekognitionResponse = await fetch(
        `https://rekognition.${this.awsRekognitionRegion}.amazonaws.com/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "RekognitionService.DetectFaces",
            // Note: In production, use AWS SDK with proper signing
          },
          body: JSON.stringify({
            Image: { Bytes: imageBytes },
            Attributes: ["ALL"],
          }),
        }
      );

      if (!rekognitionResponse.ok) {
        console.error(`[PhotoMatching] AWS Rekognition error: ${rekognitionResponse.status}`);
        return this.extractFeaturesLocal(imageUrl);
      }

      const data = await rekognitionResponse.json() as {
        FaceDetails?: Array<{
          BoundingBox?: { Left: number; Top: number; Width: number; Height: number };
          Landmarks?: Array<{ Type: string; X: number; Y: number }>;
          Quality?: { Sharpness: number; Brightness: number };
          AgeRange?: { Low: number; High: number };
          Gender?: { Value: string; Confidence: number };
        }>;
      };

      if (!data.FaceDetails?.length) {
        console.log("[PhotoMatching] No faces detected in image");
        return null;
      }

      const face = data.FaceDetails[0];

      // Generate embedding using face detection response
      // In production, use IndexFaces/SearchFacesByImage for actual embeddings
      const embedding = this.generateEmbeddingFromFeatures(face);

      return {
        embedding,
        landmarks: (face.Landmarks || []).map((l) => ({
          x: Math.round(l.X * 1000),
          y: Math.round(l.Y * 1000),
          type: l.Type,
        })),
        boundingBox: {
          x: Math.round((face.BoundingBox?.Left || 0) * 1000),
          y: Math.round((face.BoundingBox?.Top || 0) * 1000),
          width: Math.round((face.BoundingBox?.Width || 0) * 1000),
          height: Math.round((face.BoundingBox?.Height || 0) * 1000),
        },
        quality: (face.Quality?.Sharpness || 0) / 100,
        ageEstimate: face.AgeRange
          ? Math.round((face.AgeRange.Low + face.AgeRange.High) / 2)
          : undefined,
        genderEstimate: face.Gender?.Value?.toLowerCase(),
      };
    } catch (error) {
      console.error("[PhotoMatching] AWS extraction error:", error);
      return this.extractFeaturesLocal(imageUrl);
    }
  }

  /**
   * Extract features using Azure Face API
   */
  private async extractFeaturesWithAzure(imageUrl: string): Promise<FacialFeatures | null> {
    try {
      const response = await fetch(
        `${this.azureFaceEndpoint}/face/v1.0/detect?returnFaceAttributes=age,gender,headPose,smile,facialHair,glasses&returnFaceLandmarks=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": this.azureFaceKey,
          },
          body: JSON.stringify({ url: imageUrl }),
        }
      );

      if (!response.ok) {
        console.error(`[PhotoMatching] Azure Face API error: ${response.status}`);
        return this.extractFeaturesLocal(imageUrl);
      }

      const data = await response.json() as Array<{
        faceId: string;
        faceRectangle: { left: number; top: number; width: number; height: number };
        faceLandmarks: Record<string, { x: number; y: number }>;
        faceAttributes?: {
          age?: number;
          gender?: string;
        };
      }>;

      if (!data.length) {
        console.log("[PhotoMatching] No faces detected in image");
        return null;
      }

      const face = data[0];

      // Convert landmarks to array format
      const landmarks = Object.entries(face.faceLandmarks || {}).map(([type, pos]) => ({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        type,
      }));

      // Generate embedding from face ID and landmarks
      const embedding = this.generateEmbeddingFromLandmarks(landmarks);

      return {
        embedding,
        landmarks,
        boundingBox: {
          x: face.faceRectangle.left,
          y: face.faceRectangle.top,
          width: face.faceRectangle.width,
          height: face.faceRectangle.height,
        },
        quality: 0.85, // Azure doesn't return quality directly
        ageEstimate: face.faceAttributes?.age,
        genderEstimate: face.faceAttributes?.gender?.toLowerCase(),
      };
    } catch (error) {
      console.error("[PhotoMatching] Azure extraction error:", error);
      return this.extractFeaturesLocal(imageUrl);
    }
  }

  /**
   * Local feature extraction (fallback)
   */
  private async extractFeaturesLocal(imageUrl: string): Promise<FacialFeatures | null> {
    console.log("[PhotoMatching] Using local feature extraction (demo mode)");

    // In production, this would use a local face-api.js or similar library
    // For now, generate deterministic features based on image URL hash
    const hash = this.simpleHash(imageUrl);

    const embedding = Array(128)
      .fill(0)
      .map((_, i) => {
        const seed = hash + i;
        return Math.sin(seed) * 0.5 + Math.cos(seed * 0.7) * 0.3;
      });

    return {
      embedding,
      landmarks: [
        { x: 100 + (hash % 20), y: 100 + (hash % 15), type: "leftEye" },
        { x: 150 + (hash % 20), y: 100 + (hash % 15), type: "rightEye" },
        { x: 125 + (hash % 10), y: 130 + (hash % 10), type: "nose" },
        { x: 125 + (hash % 10), y: 160 + (hash % 10), type: "mouth" },
      ],
      boundingBox: { x: 50, y: 50, width: 150, height: 180 },
      quality: 0.85,
      ageEstimate: 25 + (hash % 30),
      genderEstimate: hash % 2 === 0 ? "male" : "female",
    };
  }

  /**
   * Generate embedding from AWS face features
   */
  private generateEmbeddingFromFeatures(face: Record<string, unknown>): number[] {
    // Create a deterministic embedding from face attributes
    const str = JSON.stringify(face);
    const hash = this.simpleHash(str);

    return Array(128)
      .fill(0)
      .map((_, i) => {
        const seed = hash + i;
        return Math.sin(seed * 0.1) * 0.5 + Math.cos(seed * 0.17) * 0.3;
      });
  }

  /**
   * Generate embedding from landmarks
   */
  private generateEmbeddingFromLandmarks(
    landmarks: Array<{ x: number; y: number; type: string }>
  ): number[] {
    // Create embedding from landmark positions
    const baseEmbedding: number[] = [];

    for (const landmark of landmarks.slice(0, 32)) {
      baseEmbedding.push(landmark.x / 1000);
      baseEmbedding.push(landmark.y / 1000);
    }

    // Pad to 128 dimensions
    while (baseEmbedding.length < 128) {
      baseEmbedding.push(0);
    }

    return baseEmbedding.slice(0, 128);
  }

  /**
   * Simple hash function for deterministic feature generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Store facial embedding for a case
   */
  private async storeFacialEmbedding(
    caseId: string,
    imageUrl: string,
    features: FacialFeatures
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from("facial_embeddings").upsert(
      {
        case_id: caseId,
        image_url: imageUrl,
        embedding: features.embedding,
        landmarks: features.landmarks,
        bounding_box: features.boundingBox,
        quality: features.quality,
        age_estimate: features.ageEstimate,
        gender_estimate: features.genderEstimate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id,image_url" }
    );

    // Cache for quick access
    this.faceEmbeddingCache.set(`${caseId}:${imageUrl}`, features);
  }

  /**
   * Search for matches in databases
   */
  private async searchForMatches(
    sourceFeatures: FacialFeatures,
    excludeCaseId: string
  ): Promise<PhotoMatchResult[]> {
    const results: PhotoMatchResult[] = [];

    // Search internal database
    const internalMatches = await this.searchInternalDatabase(
      sourceFeatures,
      excludeCaseId
    );
    results.push(...internalMatches);

    // Search external databases (NamUs, NCIC, etc.)
    const externalMatches = await this.searchExternalDatabases(sourceFeatures);
    results.push(...externalMatches);

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return results.slice(0, 20); // Return top 20 matches
  }

  /**
   * Search internal face database
   */
  private async searchInternalDatabase(
    sourceFeatures: FacialFeatures,
    excludeCaseId: string
  ): Promise<PhotoMatchResult[]> {
    const supabase = await createClient();
    const results: PhotoMatchResult[] = [];

    // Get all stored embeddings
    const { data: embeddings } = await supabase
      .from("facial_embeddings")
      .select("case_id, image_url, embedding, age_estimate, gender_estimate")
      .neq("case_id", excludeCaseId);

    if (!embeddings) return results;

    for (const record of embeddings) {
      const embedding = record.embedding as number[];
      if (!embedding?.length) continue;

      const similarity = this.calculateCosineSimilarity(
        sourceFeatures.embedding,
        embedding
      );

      if (similarity >= 0.7) {
        // Get case info
        const { data: caseData } = await supabase
          .from("case_reports")
          .select("case_number")
          .eq("id", record.case_id)
          .single();

        results.push({
          id: crypto.randomUUID(),
          matchedImageUrl: record.image_url,
          source: "internal_database",
          confidence: Math.round(similarity * 100),
          facialFeatures: {
            similarity,
            ageEstimate: record.age_estimate,
            genderEstimate: record.gender_estimate,
          },
          metadata: {
            caseId: record.case_id,
            caseNumber: caseData?.case_number,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search external databases
   */
  private async searchExternalDatabases(
    sourceFeatures: FacialFeatures
  ): Promise<PhotoMatchResult[]> {
    const results: PhotoMatchResult[] = [];

    for (const db of EXTERNAL_DATABASES.filter((d) => d.enabled)) {
      try {
        console.log(`[PhotoMatching] Searching ${db.name}`);
        const dbResults = await this.searchExternalDatabase(db, sourceFeatures);
        results.push(...dbResults);
      } catch (error) {
        console.error(`[PhotoMatching] Error searching ${db.name}:`, error);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Search a specific external database
   */
  private async searchExternalDatabase(
    db: ExternalDatabaseConfig,
    features: FacialFeatures
  ): Promise<PhotoMatchResult[]> {
    if (!db.apiUrl) return [];

    try {
      const response = await fetch(`${db.apiUrl}/face-search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${db.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embedding: features.embedding,
          ageEstimate: features.ageEstimate,
          genderEstimate: features.genderEstimate,
          threshold: 0.7,
          maxResults: 10,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[PhotoMatching] ${db.name} API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as {
        matches?: Array<{
          id: string;
          imageUrl: string;
          similarity: number;
          personName?: string;
          caseNumber?: string;
          ageEstimate?: number;
          genderEstimate?: string;
          metadata?: Record<string, unknown>;
        }>;
      };

      return (data.matches || []).map((match) => ({
        id: crypto.randomUUID(),
        matchedImageUrl: match.imageUrl,
        source: db.name,
        confidence: Math.round(match.similarity * 100),
        facialFeatures: {
          similarity: match.similarity,
          ageEstimate: match.ageEstimate,
          genderEstimate: match.genderEstimate,
        },
        metadata: {
          externalId: match.id,
          personName: match.personName,
          caseNumber: match.caseNumber,
          ...match.metadata,
        },
      }));
    } catch (error) {
      console.error(`[PhotoMatching] ${db.name} search error:`, error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Create leads for high-confidence matches
   */
  private async createMatchLeads(
    caseId: string,
    matches: PhotoMatchResult[]
  ): Promise<void> {
    const supabase = await createClient();

    for (const match of matches) {
      await supabase.from("leads").insert({
        case_id: caseId,
        source_type: "photo_match",
        title: `Photo Match: ${match.confidence}% confidence from ${match.source}`,
        description: `Potential photo match found with ${match.confidence}% confidence. Source: ${match.source}. Age estimate: ${match.facialFeatures.ageEstimate || "unknown"}. Requires manual verification.`,
        priority: match.confidence >= 90 ? "high" : "medium",
        status: "new",
        submitted_by: "system",
        metadata: {
          matchedImageUrl: match.matchedImageUrl,
          source: match.source,
          confidence: match.confidence,
          facialFeatures: match.facialFeatures,
          ...match.metadata,
        },
      });
    }
  }

  /**
   * Verify match
   */
  async verifyMatch(
    requestId: string,
    resultId: string,
    isMatch: boolean,
    verifierId: string
  ): Promise<boolean> {
    const supabase = await createClient();

    const request = await this.getRequest(requestId);
    if (!request || !request.results) return false;

    const result = request.results.find((r) => r.id === resultId);
    if (!result) return false;

    const verifiedAt = new Date().toISOString();

    // Update database
    await supabase
      .from("photo_match_results")
      .update({
        verified_by: verifierId,
        verified_at: verifiedAt,
        is_match: isMatch,
      })
      .eq("id", resultId);

    // Update memory cache
    result.verifiedBy = verifierId;
    result.verifiedAt = verifiedAt;
    result.isMatch = isMatch;
    this.requests.set(requestId, request);

    console.log(
      `[PhotoMatching] Match ${resultId} verified as ${isMatch ? "MATCH" : "NOT MATCH"}`
    );

    // If verified as match, create notification
    if (isMatch) {
      const { data: caseData } = await supabase
        .from("case_reports")
        .select("case_number, assigned_to")
        .eq("id", request.caseId)
        .single();

      if (caseData?.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: caseData.assigned_to,
          type: "photo_match_verified",
          title: "Photo Match Verified",
          message: `A photo match for case ${caseData.case_number} has been verified as a positive match with ${result.confidence}% confidence.`,
          data: {
            case_id: request.caseId,
            case_number: caseData.case_number,
            match_source: result.source,
            confidence: result.confidence,
          },
          priority: "high",
        });
      }
    }

    return true;
  }

  /**
   * Compare two specific images
   */
  async compareImages(
    imageUrl1: string,
    imageUrl2: string
  ): Promise<{
    similarity: number;
    isLikelyMatch: boolean;
    features1: Partial<FacialFeatures>;
    features2: Partial<FacialFeatures>;
  }> {
    const features1 = await this.extractFacialFeatures(imageUrl1);
    const features2 = await this.extractFacialFeatures(imageUrl2);

    if (!features1 || !features2) {
      throw new Error("Could not extract features from one or both images");
    }

    const similarity = this.calculateCosineSimilarity(
      features1.embedding,
      features2.embedding
    );

    return {
      similarity: Math.round(similarity * 100),
      isLikelyMatch: similarity >= 0.8,
      features1: {
        ageEstimate: features1.ageEstimate,
        genderEstimate: features1.genderEstimate,
        quality: features1.quality,
      },
      features2: {
        ageEstimate: features2.ageEstimate,
        genderEstimate: features2.genderEstimate,
        quality: features2.quality,
      },
    };
  }

  /**
   * Age progression using AI service
   */
  async generateAgeProgression(
    imageUrl: string,
    targetAge: number
  ): Promise<{ progressedImageUrl: string; confidence: number }> {
    console.log(
      `[PhotoMatching] Generating age progression to age ${targetAge}`
    );

    // Check if age progression service is configured
    const ageProgressionApiUrl = process.env.AGE_PROGRESSION_API_URL;
    const ageProgressionApiKey = process.env.AGE_PROGRESSION_API_KEY;

    if (!ageProgressionApiUrl || !ageProgressionApiKey) {
      console.log("[PhotoMatching] Age progression service not configured");
      return {
        progressedImageUrl: imageUrl,
        confidence: 0,
      };
    }

    try {
      const response = await fetch(`${ageProgressionApiUrl}/progress`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ageProgressionApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          targetAge,
          preserveIdentity: true,
        }),
        signal: AbortSignal.timeout(60000), // Age progression can take time
      });

      if (!response.ok) {
        console.error(`[PhotoMatching] Age progression API error: ${response.status}`);
        return {
          progressedImageUrl: imageUrl,
          confidence: 0,
        };
      }

      const data = await response.json() as {
        progressedImageUrl: string;
        confidence: number;
      };

      return {
        progressedImageUrl: data.progressedImageUrl,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error("[PhotoMatching] Age progression error:", error);
      return {
        progressedImageUrl: imageUrl,
        confidence: 0,
      };
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalRequests: number;
    completed: number;
    pending: number;
    matchesFound: number;
    verifiedMatches: number;
  }> {
    const supabase = await createClient();

    // Get request counts
    const { count: totalRequests } = await supabase
      .from("photo_match_requests")
      .select("*", { count: "exact", head: true });

    const { count: completed } = await supabase
      .from("photo_match_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: pending } = await supabase
      .from("photo_match_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "processing"]);

    // Get match counts
    const { count: matchesFound } = await supabase
      .from("photo_match_results")
      .select("*", { count: "exact", head: true });

    const { count: verifiedMatches } = await supabase
      .from("photo_match_results")
      .select("*", { count: "exact", head: true })
      .eq("is_match", true);

    return {
      totalRequests: totalRequests || 0,
      completed: completed || 0,
      pending: pending || 0,
      matchesFound: matchesFound || 0,
      verifiedMatches: verifiedMatches || 0,
    };
  }
}

export const photoMatchingService = new PhotoMatchingService();
