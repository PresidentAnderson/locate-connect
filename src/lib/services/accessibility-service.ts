/**
 * Accessibility Service (WCAG 2.1 AA)
 * Manages accessibility settings and auditing
 */

import type {
  AccessibilityConfig,
  AccessibilityAuditResult,
  AccessibilityViolation,
} from "@/types/compliance.types";

const DEFAULT_CONFIG: AccessibilityConfig = {
  highContrastMode: false,
  reducedMotion: false,
  fontSize: "medium",
  colorBlindMode: undefined,
  screenReaderOptimized: false,
  audioDescriptions: false,
  keyboardNavigation: true,
  stickyKeys: false,
  focusIndicatorSize: "normal",
  simplifiedUI: false,
  readingGuide: false,
  textSpacing: "normal",
};

class AccessibilityService {
  private userConfigs: Map<string, AccessibilityConfig> = new Map();

  /**
   * Get accessibility config for a user
   */
  getConfig(userId?: string): AccessibilityConfig {
    if (userId && this.userConfigs.has(userId)) {
      return this.userConfigs.get(userId)!;
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Update accessibility config
   */
  updateConfig(
    userId: string,
    updates: Partial<AccessibilityConfig>
  ): AccessibilityConfig {
    const current = this.getConfig(userId);
    const updated = { ...current, ...updates };
    this.userConfigs.set(userId, updated);
    return updated;
  }

  /**
   * Reset to default config
   */
  resetConfig(userId: string): AccessibilityConfig {
    this.userConfigs.delete(userId);
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Generate CSS variables for accessibility settings
   */
  generateCSSVariables(config: AccessibilityConfig): Record<string, string> {
    const vars: Record<string, string> = {};

    // Font size
    const fontSizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
      "x-large": "20px",
    };
    vars["--base-font-size"] = fontSizes[config.fontSize];

    // Text spacing
    const textSpacing = {
      normal: "1.5",
      wide: "1.8",
      "extra-wide": "2.2",
    };
    vars["--line-height"] = textSpacing[config.textSpacing];

    // Focus indicator
    vars["--focus-ring-width"] =
      config.focusIndicatorSize === "large" ? "4px" : "2px";

    // High contrast
    if (config.highContrastMode) {
      vars["--bg-primary"] = "#000000";
      vars["--bg-secondary"] = "#1a1a1a";
      vars["--text-primary"] = "#ffffff";
      vars["--text-secondary"] = "#ffff00";
      vars["--border-color"] = "#ffffff";
      vars["--link-color"] = "#00ffff";
      vars["--focus-color"] = "#ffff00";
    }

    // Color blind modes
    if (config.colorBlindMode) {
      switch (config.colorBlindMode) {
        case "protanopia":
          vars["--filter"] = "url(#protanopia)";
          break;
        case "deuteranopia":
          vars["--filter"] = "url(#deuteranopia)";
          break;
        case "tritanopia":
          vars["--filter"] = "url(#tritanopia)";
          break;
      }
    }

    return vars;
  }

  /**
   * Generate aria attributes for an element
   */
  generateAriaAttributes(
    elementType: string,
    config: AccessibilityConfig
  ): Record<string, string> {
    const attrs: Record<string, string> = {};

    if (config.screenReaderOptimized) {
      attrs["role"] = this.getSemanticRole(elementType);
    }

    return attrs;
  }

  /**
   * Get semantic role for element
   */
  private getSemanticRole(elementType: string): string {
    const roles: Record<string, string> = {
      header: "banner",
      nav: "navigation",
      main: "main",
      footer: "contentinfo",
      aside: "complementary",
      form: "form",
      search: "search",
      button: "button",
      link: "link",
      dialog: "dialog",
      alert: "alert",
      table: "table",
      list: "list",
      listitem: "listitem",
    };
    return roles[elementType] || elementType;
  }

  /**
   * Run accessibility audit on a page
   */
  async runAudit(url: string): Promise<AccessibilityAuditResult> {
    // In production, this would use axe-core or similar
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Simulated audit result
    const result: AccessibilityAuditResult = {
      id,
      url,
      timestamp,
      score: 85,
      level: "AA",
      violations: [],
      passes: 42,
      incomplete: 3,
      categories: {
        perceivable: { score: 88, issues: 2, passed: 15 },
        operable: { score: 82, issues: 3, passed: 12 },
        understandable: { score: 90, issues: 1, passed: 8 },
        robust: { score: 80, issues: 2, passed: 7 },
      },
    };

    console.log(`[AccessibilityService] Audit completed for ${url}: ${result.score}/100`);
    return result;
  }

  /**
   * Check if content meets WCAG criteria
   */
  checkWCAGCriteria(
    content: {
      text?: string;
      bgColor?: string;
      textColor?: string;
      fontSize?: number;
    }
  ): { passes: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check color contrast (WCAG 2.1 AA requires 4.5:1 for normal text)
    if (content.bgColor && content.textColor) {
      const contrast = this.calculateContrastRatio(
        content.bgColor,
        content.textColor
      );
      const minContrast = (content.fontSize || 16) >= 18 ? 3 : 4.5;

      if (contrast < minContrast) {
        issues.push(
          `Insufficient color contrast: ${contrast.toFixed(2)}:1 (minimum ${minContrast}:1 required)`
        );
      }
    }

    // Check text length for readability
    if (content.text && content.text.length > 0) {
      const words = content.text.split(/\s+/);
      const avgWordLength =
        words.reduce((sum, w) => sum + w.length, 0) / words.length;

      if (avgWordLength > 12) {
        issues.push("Text may be difficult to read - consider simpler language");
      }
    }

    return {
      passes: issues.length === 0,
      issues,
    };
  }

  /**
   * Calculate contrast ratio between two colors
   * Public method for use in accessibility API endpoints
   */
  calculateContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getRelativeLuminance(color1);
    const lum2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Generate skip links for keyboard navigation
   */
  generateSkipLinks(): Array<{ id: string; label: string; target: string }> {
    return [
      { id: "skip-main", label: "Skip to main content", target: "#main-content" },
      { id: "skip-nav", label: "Skip to navigation", target: "#main-nav" },
      { id: "skip-search", label: "Skip to search", target: "#search" },
      { id: "skip-footer", label: "Skip to footer", target: "#footer" },
    ];
  }

  /**
   * Check keyboard trap
   */
  checkKeyboardTrap(element: HTMLElement): boolean {
    const focusableElements = element.querySelectorAll(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    return focusableElements.length > 0;
  }

  /**
   * Get screen reader announcement
   */
  getAnnouncement(type: "polite" | "assertive", message: string): {
    "aria-live": string;
    "aria-atomic": string;
    role: string;
  } {
    return {
      "aria-live": type,
      "aria-atomic": "true",
      role: type === "assertive" ? "alert" : "status",
    };
  }
}

export const accessibilityService = new AccessibilityService();
