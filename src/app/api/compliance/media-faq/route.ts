/**
 * Media & FAQ API Route
 * Media charter and public FAQ endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { mediaFAQService } from "@/lib/services/media-faq-service";
import type { MediaRequest, SupportedLanguage } from "@/types/compliance.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const language = (searchParams.get("language") || "en") as SupportedLanguage;

    switch (action) {
      // Media Charter
      case "charter":
        const charter = mediaFAQService.getCharter();
        return NextResponse.json(charter);

      case "accessLevels":
        const levels = mediaFAQService.getAccessLevels();
        return NextResponse.json(levels);

      case "mediaRequest":
        const requestId = searchParams.get("requestId");
        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }
        const mediaRequest = mediaFAQService.getMediaRequest(requestId);
        if (!mediaRequest) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        return NextResponse.json(mediaRequest);

      case "mediaRequests":
        const status = searchParams.get("status") as MediaRequest["status"] | undefined;
        const requests = mediaFAQService.listMediaRequests(status);
        return NextResponse.json(requests);

      // FAQ
      case "categories":
        const categories = mediaFAQService.getFAQCategories();
        return NextResponse.json(categories);

      case "faq":
        const categoryId = searchParams.get("categoryId");
        if (categoryId) {
          const items = mediaFAQService.getFAQByCategory(categoryId);
          return NextResponse.json(items);
        }
        const allItems = mediaFAQService.getAllFAQ();
        return NextResponse.json(allItems);

      case "faqItem":
        const itemId = searchParams.get("itemId");
        if (!itemId) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }
        const item = mediaFAQService.getFAQItem(itemId);
        if (!item) {
          return NextResponse.json({ error: "FAQ item not found" }, { status: 404 });
        }
        return NextResponse.json(item);

      case "search":
        const query = searchParams.get("query");
        if (!query) {
          return NextResponse.json({ error: "Query required" }, { status: 400 });
        }
        const results = mediaFAQService.searchFAQ(query, language);
        return NextResponse.json(results);

      case "popular":
        const limit = parseInt(searchParams.get("limit") || "5");
        const popular = mediaFAQService.getPopularFAQ(limit);
        return NextResponse.json(popular);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Media FAQ error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // Media requests
      case "submitMediaRequest":
        const { organizationName, journalistName, email, phone, requestType, description, caseIds } = body;
        if (!organizationName || !journalistName || !email || !requestType || !description) {
          return NextResponse.json(
            { error: "All required fields must be provided" },
            { status: 400 }
          );
        }
        const newRequest = await mediaFAQService.submitMediaRequest({
          organizationName,
          journalistName,
          email,
          phone,
          requestType,
          description,
          caseIds,
        });
        return NextResponse.json(newRequest);

      case "respondToRequest":
        const { requestId, status, response, accessLevel } = body;
        if (!requestId || !status || !response) {
          return NextResponse.json(
            { error: "requestId, status, and response required" },
            { status: 400 }
          );
        }
        const respondResult = await mediaFAQService.respondToRequest(
          requestId,
          status,
          response,
          accessLevel
        );
        if (!respondResult) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        return NextResponse.json(respondResult);

      // FAQ management
      case "addFAQ":
        const { categoryId, question, answer, order, tags } = body;
        if (!categoryId || !question || !answer) {
          return NextResponse.json(
            { error: "categoryId, question, and answer required" },
            { status: 400 }
          );
        }
        const newItem = mediaFAQService.addFAQItem({
          categoryId,
          question,
          answer,
          order: order || 1,
          tags: tags || [],
        });
        return NextResponse.json(newItem);

      case "updateFAQ":
        const { itemId: updateItemId, updates } = body;
        if (!updateItemId || !updates) {
          return NextResponse.json(
            { error: "itemId and updates required" },
            { status: 400 }
          );
        }
        const updatedItem = mediaFAQService.updateFAQItem(updateItemId, updates);
        if (!updatedItem) {
          return NextResponse.json({ error: "FAQ item not found" }, { status: 404 });
        }
        return NextResponse.json(updatedItem);

      case "deleteFAQ":
        const { itemId: deleteItemId } = body;
        if (!deleteItemId) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }
        const deleted = mediaFAQService.deleteFAQItem(deleteItemId);
        return NextResponse.json({ success: deleted });

      case "feedback":
        const { itemId: feedbackItemId, helpful } = body;
        if (!feedbackItemId || helpful === undefined) {
          return NextResponse.json(
            { error: "itemId and helpful required" },
            { status: 400 }
          );
        }
        const feedbackResult = mediaFAQService.recordFAQFeedback(feedbackItemId, helpful);
        return NextResponse.json({ success: feedbackResult });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Media FAQ error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
