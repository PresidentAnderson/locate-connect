/**
 * Accessibility API Route
 * WCAG 2.1 AA compliance endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { accessibilityService } from "@/lib/services/accessibility-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId") || undefined;

    switch (action) {
      case "config":
        const config = accessibilityService.getConfig(userId);
        return NextResponse.json(config);

      case "css":
        const cssConfig = accessibilityService.getConfig(userId);
        const cssVariables = accessibilityService.generateCSSVariables(cssConfig);
        return NextResponse.json(cssVariables);

      case "audit":
        const url = searchParams.get("url");
        if (!url) {
          return NextResponse.json({ error: "URL required" }, { status: 400 });
        }
        const auditResult = await accessibilityService.runAudit(url);
        return NextResponse.json(auditResult);

      case "contrast":
        const color1 = searchParams.get("color1");
        const color2 = searchParams.get("color2");
        if (!color1 || !color2) {
          return NextResponse.json({ error: "Both colors required" }, { status: 400 });
        }
        const ratio = accessibilityService.calculateContrastRatio(color1, color2);
        return NextResponse.json({
          ratio,
          passesAA: ratio >= 4.5,
          passesAAA: ratio >= 7,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Accessibility error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, config } = body;

    switch (action) {
      case "update":
        if (!userId || !config) {
          return NextResponse.json(
            { error: "userId and config required" },
            { status: 400 }
          );
        }
        const updatedConfig = accessibilityService.updateConfig(userId, config);
        return NextResponse.json(updatedConfig);

      case "check":
        const { content } = body;
        if (!content) {
          return NextResponse.json({ error: "Content required" }, { status: 400 });
        }
        const wcagResult = accessibilityService.checkWCAGCriteria(content);
        return NextResponse.json(wcagResult);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Accessibility error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
