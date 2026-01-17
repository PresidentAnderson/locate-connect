/**
 * AI Photo Matching Service
 * Face recognition and photo comparison for missing persons
 */

import type { PhotoMatchRequest, PhotoMatchResult } from "@/types/compliance.types";

interface FacialFeatures {
  embedding: number[];
  landmarks: Array<{ x: number; y: number; type: string }>;
  boundingBox: { x: number; y: number; width: number; height: number };
  quality: number;
  ageEstimate?: number;
  genderEstimate?: string;
}

class PhotoMatchingService {
  private requests: Map<string, PhotoMatchRequest> = new Map();
  private faceDatabase: Map<string, FacialFeatures[]> = new Map(); // caseId -> features

  /**
   * Submit photo for matching
   */
  async submitMatchRequest(
    caseId: string,
    imageUrl: string
  ): Promise<PhotoMatchRequest> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const request: PhotoMatchRequest = {
      id,
      caseId,
      sourceImageUrl: imageUrl,
      status: "pending",
      createdAt: now,
    };

    this.requests.set(id, request);
    console.log(`[PhotoMatching] Request submitted for case ${caseId}`);

    // Process asynchronously
    this.processMatchRequest(id).catch((error) => {
      console.error(`[PhotoMatching] Error processing request ${id}:`, error);
      request.status = "failed";
      this.requests.set(id, request);
    });

    return request;
  }

  /**
   * Get match request status
   */
  getRequest(requestId: string): PhotoMatchRequest | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * List match requests for a case
   */
  listRequests(caseId: string): PhotoMatchRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.caseId === caseId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  /**
   * Process match request
   */
  private async processMatchRequest(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) return;

    request.status = "processing";
    this.requests.set(requestId, request);

    try {
      // Extract facial features from source image
      const sourceFeatures = await this.extractFacialFeatures(
        request.sourceImageUrl
      );

      if (!sourceFeatures) {
        request.status = "failed";
        this.requests.set(requestId, request);
        return;
      }

      // Store features for case
      const caseFeatures = this.faceDatabase.get(request.caseId) || [];
      caseFeatures.push(sourceFeatures);
      this.faceDatabase.set(request.caseId, caseFeatures);

      // Search for matches across databases
      const results = await this.searchForMatches(sourceFeatures, request.caseId);

      request.status = "completed";
      request.completedAt = new Date().toISOString();
      request.results = results;
      this.requests.set(requestId, request);

      console.log(
        `[PhotoMatching] Request ${requestId} completed with ${results.length} matches`
      );
    } catch (error) {
      request.status = "failed";
      this.requests.set(requestId, request);
      throw error;
    }
  }

  /**
   * Extract facial features from image
   */
  private async extractFacialFeatures(
    imageUrl: string
  ): Promise<FacialFeatures | null> {
    // In production, use face-api.js, AWS Rekognition, or similar
    console.log(`[PhotoMatching] Extracting features from ${imageUrl}`);

    // Simulated feature extraction
    const features: FacialFeatures = {
      embedding: Array(128)
        .fill(0)
        .map(() => Math.random()),
      landmarks: [
        { x: 100, y: 100, type: "leftEye" },
        { x: 150, y: 100, type: "rightEye" },
        { x: 125, y: 130, type: "nose" },
        { x: 125, y: 160, type: "mouth" },
      ],
      boundingBox: { x: 50, y: 50, width: 150, height: 180 },
      quality: 0.85,
      ageEstimate: 35,
      genderEstimate: "unknown",
    };

    return features;
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
    const results: PhotoMatchResult[] = [];

    for (const [caseId, features] of this.faceDatabase) {
      if (caseId === excludeCaseId) continue;

      for (const feature of features) {
        const similarity = this.calculateCosineSimilarity(
          sourceFeatures.embedding,
          feature.embedding
        );

        if (similarity >= 0.7) {
          results.push({
            id: crypto.randomUUID(),
            matchedImageUrl: "", // Would be actual URL
            source: "internal_database",
            confidence: Math.round(similarity * 100),
            facialFeatures: {
              similarity,
              ageEstimate: feature.ageEstimate,
              genderEstimate: feature.genderEstimate,
            },
          });
        }
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
    // In production, integrate with NamUs, NCIC, etc.
    console.log("[PhotoMatching] Searching external databases");

    // Simulated external search
    return [];
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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
    const request = this.requests.get(requestId);
    if (!request || !request.results) return false;

    const result = request.results.find((r) => r.id === resultId);
    if (!result) return false;

    result.verifiedBy = verifierId;
    result.verifiedAt = new Date().toISOString();
    result.isMatch = isMatch;

    this.requests.set(requestId, request);
    console.log(
      `[PhotoMatching] Match ${resultId} verified as ${isMatch ? "MATCH" : "NOT MATCH"}`
    );

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
   * Age progression simulation
   */
  async generateAgeProgression(
    imageUrl: string,
    targetAge: number
  ): Promise<{ progressedImageUrl: string; confidence: number }> {
    // In production, use AI age progression model
    console.log(
      `[PhotoMatching] Generating age progression to age ${targetAge}`
    );

    // Would return URL to generated image
    return {
      progressedImageUrl: imageUrl, // Placeholder
      confidence: 75,
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRequests: number;
    completed: number;
    pending: number;
    matchesFound: number;
    verifiedMatches: number;
  } {
    const requests = Array.from(this.requests.values());

    let matchesFound = 0;
    let verifiedMatches = 0;

    for (const request of requests) {
      if (request.results) {
        matchesFound += request.results.length;
        verifiedMatches += request.results.filter((r) => r.isMatch).length;
      }
    }

    return {
      totalRequests: requests.length,
      completed: requests.filter((r) => r.status === "completed").length,
      pending: requests.filter(
        (r) => r.status === "pending" || r.status === "processing"
      ).length,
      matchesFound,
      verifiedMatches,
    };
  }
}

export const photoMatchingService = new PhotoMatchingService();
