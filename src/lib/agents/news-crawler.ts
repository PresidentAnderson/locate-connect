/**
 * News Article Crawler Agent
 * Searches news sources for articles related to missing persons cases
 */

import { BaseAgent } from "./base-agent";
import { createClient } from "@/lib/supabase/server";
import type { AgentConfig, NewsArticle } from "@/types/agent.types";

interface NewsCrawlerSettings {
  sources: NewsSource[];
  searchTerms: string[];
  maxArticlesPerRun: number;
  minRelevanceScore: number;
  lookbackDays: number;
}

interface NewsSource {
  id: string;
  name: string;
  type: "rss" | "api" | "scrape";
  url: string;
  apiKey?: string;
  enabled: boolean;
  priority: number;
}

interface CaseSearchTerms {
  caseId: string;
  caseNumber: string;
  terms: string[];
  lastSeenLocation?: string;
  priority: number;
}

export class NewsCrawlerAgent extends BaseAgent {
  private settings: NewsCrawlerSettings;

  constructor(config: AgentConfig) {
    super(config);
    this.settings = (config.settings as unknown) as NewsCrawlerSettings;
  }

  protected async execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }> {
    let itemsProcessed = 0;
    let leadsGenerated = 0;
    let alertsTriggered = 0;

    // Get active cases with search terms
    const cases = await this.getActiveCasesWithSearchTerms();
    this.addMetric("cases_to_search", cases.length);

    const enabledSources = this.settings.sources
      .filter((s) => s.enabled)
      .sort((a, b) => a.priority - b.priority);
    this.addMetric("sources_to_search", enabledSources.length);

    // Search each source
    for (const source of enabledSources) {
      try {
        const articles = await this.searchSource(source, cases);
        itemsProcessed += articles.length;

        for (const article of articles) {
          // Calculate relevance for each case
          const matchedCase = this.findBestCaseMatch(article, cases);

          if (matchedCase && article.relevanceScore >= this.settings.minRelevanceScore) {
            // Store article
            await this.storeArticle(article, matchedCase.caseId);
            leadsGenerated++;

            // Alert for high-relevance articles
            if (article.relevanceScore >= 80) {
              await this.triggerAlert(matchedCase.caseId, article);
              alertsTriggered++;
            }
          }
        }

        this.addMetric(`source_${source.id}_articles`, articles.length);
      } catch (error) {
        console.error(
          `[NewsCrawlerAgent] Error searching source ${source.name}:`,
          error
        );
        this.errors.push(this.createError(error));
      }

      // Rate limiting between sources
      await this.sleep(3000);
    }

    return { itemsProcessed, leadsGenerated, alertsTriggered };
  }

  private async getActiveCasesWithSearchTerms(): Promise<CaseSearchTerms[]> {
    const supabase = await createClient();

    // Get active cases with relevant information for search
    const { data: cases, error } = await supabase
      .from("case_reports")
      .select(`
        id,
        case_number,
        status,
        priority,
        missing_person:missing_persons(
          first_name,
          last_name,
          aliases,
          last_seen_city,
          last_seen_province
        )
      `)
      .in("status", ["open", "active"])
      .order("priority", { ascending: true })
      .limit(50);

    if (error || !cases) {
      console.error("[NewsCrawlerAgent] Error fetching cases:", error);
      return [];
    }

    const caseSearchTerms: CaseSearchTerms[] = [];

    for (const caseData of cases) {
      const missingPerson = caseData.missing_person as {
        first_name?: string;
        last_name?: string;
        aliases?: string[];
        last_seen_city?: string;
        last_seen_province?: string;
      } | null;

      if (!missingPerson) continue;

      const terms: string[] = [];

      // Full name
      if (missingPerson.first_name && missingPerson.last_name) {
        terms.push(`"${missingPerson.first_name} ${missingPerson.last_name}"`);
        // Also search without quotes for partial matches
        terms.push(`${missingPerson.first_name} ${missingPerson.last_name}`);
      }

      // Aliases
      if (missingPerson.aliases?.length) {
        for (const alias of missingPerson.aliases) {
          terms.push(`"${alias}"`);
        }
      }

      // Location-based search terms
      const location = [
        missingPerson.last_seen_city,
        missingPerson.last_seen_province,
      ]
        .filter(Boolean)
        .join(", ");

      if (location && missingPerson.last_name) {
        terms.push(`"missing" "${missingPerson.last_name}" ${location}`);
      }

      // Generic terms with name
      if (missingPerson.last_name) {
        terms.push(`missing person ${missingPerson.last_name}`);
        terms.push(`found ${missingPerson.last_name}`);
      }

      if (terms.length > 0) {
        caseSearchTerms.push({
          caseId: caseData.id,
          caseNumber: caseData.case_number,
          terms,
          lastSeenLocation: location || undefined,
          priority: caseData.priority || 3,
        });
      }
    }

    return caseSearchTerms;
  }

  private async searchSource(
    source: NewsSource,
    cases: CaseSearchTerms[]
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    // Build combined search query from all cases
    const allTerms = new Set<string>();
    for (const caseData of cases) {
      caseData.terms.forEach((term) => allTerms.add(term));
    }

    switch (source.type) {
      case "rss":
        return this.searchRSSFeed(source, Array.from(allTerms));
      case "api":
        return this.searchNewsAPI(source, Array.from(allTerms));
      case "scrape":
        return this.scrapeNewsSource(source, Array.from(allTerms));
      default:
        return articles;
    }
  }

  private async searchRSSFeed(
    source: NewsSource,
    terms: string[]
  ): Promise<NewsArticle[]> {
    this.addMetric("rss_feeds_searched", 1);
    console.log(`[NewsCrawlerAgent] Searching RSS feed: ${source.name}`);

    try {
      // Build search URL for Google News RSS
      const searchQuery = terms.slice(0, 5).join(" OR ");
      let feedUrl = source.url;

      if (source.id === "google_news") {
        feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-CA&gl=CA&ceid=CA:en`;
      }

      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "LocateConnect/1.0 (News Monitoring Agent)",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[NewsCrawlerAgent] RSS fetch failed: ${response.status}`);
        return [];
      }

      const xmlText = await response.text();
      return this.parseRSSFeed(xmlText, source, terms);
    } catch (error) {
      console.error(`[NewsCrawlerAgent] RSS error:`, error);
      return [];
    }
  }

  /**
   * Parse RSS XML into NewsArticle objects
   */
  private parseRSSFeed(
    xml: string,
    source: NewsSource,
    terms: string[]
  ): NewsArticle[] {
    const articles: NewsArticle[] = [];
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.settings.lookbackDays);

    // Simple XML parsing for RSS items
    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemPattern.exec(xml)) !== null && articles.length < this.settings.maxArticlesPerRun) {
      const itemXml = match[1];

      // Extract fields
      const title = this.extractXMLField(itemXml, "title");
      const link = this.extractXMLField(itemXml, "link");
      const description = this.extractXMLField(itemXml, "description");
      const pubDate = this.extractXMLField(itemXml, "pubDate");
      const guid = this.extractXMLField(itemXml, "guid") || link;

      if (!title || !link) continue;

      // Parse date and check against lookback
      const publishedAt = pubDate ? new Date(pubDate) : new Date();
      if (publishedAt < lookbackDate) continue;

      // Calculate relevance score based on term matches
      const contentText = `${title} ${description}`.toLowerCase();
      let relevanceScore = 0;

      for (const term of terms) {
        const cleanTerm = term.replace(/"/g, "").toLowerCase();
        if (contentText.includes(cleanTerm)) {
          relevanceScore += 15;
        }
      }

      // Boost for certain keywords
      if (contentText.includes("missing")) relevanceScore += 10;
      if (contentText.includes("found")) relevanceScore += 10;
      if (contentText.includes("amber alert")) relevanceScore += 20;
      if (contentText.includes("police")) relevanceScore += 5;
      if (contentText.includes("search")) relevanceScore += 5;

      if (relevanceScore > 0) {
        articles.push({
          id: guid || crypto.randomUUID(),
          title: this.decodeHTMLEntities(title),
          content: this.decodeHTMLEntities(description || ""),
          url: link,
          sourceId: source.id,
          sourceName: source.name,
          publishedAt: publishedAt.toISOString(),
          crawledAt: new Date().toISOString(),
          relevanceScore: Math.min(100, relevanceScore),
          sentiment: "neutral",
          matchedTerms: terms.filter((t) =>
            contentText.includes(t.replace(/"/g, "").toLowerCase())
          ),
        });
      }
    }

    console.log(`[NewsCrawlerAgent] Found ${articles.length} relevant articles from ${source.name}`);
    return articles;
  }

  /**
   * Extract field from XML
   */
  private extractXMLField(xml: string, field: string): string | null {
    // Handle CDATA
    const cdataPattern = new RegExp(`<${field}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${field}>`, "i");
    const cdataMatch = xml.match(cdataPattern);
    if (cdataMatch) return cdataMatch[1].trim();

    // Handle regular content
    const pattern = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, "i");
    const match = xml.match(pattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Decode HTML entities
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/<[^>]*>/g, ""); // Strip remaining HTML tags
  }

  private async searchNewsAPI(
    source: NewsSource,
    terms: string[]
  ): Promise<NewsArticle[]> {
    this.addMetric("api_searches", 1);
    console.log(`[NewsCrawlerAgent] Searching news API: ${source.name}`);

    // Check for API key
    const apiKey = source.apiKey || process.env.NEWSAPI_KEY;
    if (!apiKey) {
      console.log(`[NewsCrawlerAgent] No API key for ${source.name}, skipping`);
      return [];
    }

    try {
      // Build query - NewsAPI supports OR operator
      const query = terms
        .slice(0, 10)
        .map((t) => t.replace(/"/g, ""))
        .join(" OR ");

      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - this.settings.lookbackDays);

      console.log(`[NewsCrawlerAgent] Query: ${query}`);
      console.log(`[NewsCrawlerAgent] Since: ${lookbackDate.toISOString()}`);

      // NewsAPI endpoint
      const url = new URL(`${source.url}/everything`);
      url.searchParams.set("q", query);
      url.searchParams.set("from", lookbackDate.toISOString().split("T")[0]);
      url.searchParams.set("sortBy", "relevancy");
      url.searchParams.set("language", "en");
      url.searchParams.set("pageSize", String(Math.min(100, this.settings.maxArticlesPerRun)));

      const response = await fetch(url.toString(), {
        headers: {
          "X-Api-Key": apiKey,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[NewsCrawlerAgent] NewsAPI error: ${response.status} - ${errorText}`);
        return [];
      }

      const data = await response.json() as {
        status: string;
        totalResults: number;
        articles: Array<{
          source?: { id?: string; name?: string };
          author?: string;
          title?: string;
          description?: string;
          url?: string;
          urlToImage?: string;
          publishedAt?: string;
          content?: string;
        }>;
      };

      if (data.status !== "ok") {
        console.error("[NewsCrawlerAgent] NewsAPI returned error status");
        return [];
      }

      const articles: NewsArticle[] = [];

      for (const article of data.articles || []) {
        if (!article.title || !article.url) continue;

        // Calculate relevance
        const contentText = `${article.title} ${article.description || ""} ${article.content || ""}`.toLowerCase();
        let relevanceScore = 0;

        for (const term of terms) {
          const cleanTerm = term.replace(/"/g, "").toLowerCase();
          if (contentText.includes(cleanTerm)) {
            relevanceScore += 15;
          }
        }

        if (contentText.includes("missing")) relevanceScore += 10;
        if (contentText.includes("found")) relevanceScore += 10;
        if (contentText.includes("amber alert")) relevanceScore += 20;
        if (contentText.includes("police")) relevanceScore += 5;

        if (relevanceScore > 0) {
          articles.push({
            id: crypto.randomUUID(),
            title: article.title,
            content: article.description || article.content || "",
            url: article.url,
            sourceId: source.id,
            sourceName: article.source?.name || source.name,
            imageUrl: article.urlToImage,
            publishedAt: article.publishedAt || new Date().toISOString(),
            crawledAt: new Date().toISOString(),
            author: article.author,
            relevanceScore: Math.min(100, relevanceScore),
            sentiment: "neutral",
            matchedTerms: terms.filter((t) =>
              contentText.includes(t.replace(/"/g, "").toLowerCase())
            ),
          });
        }
      }

      console.log(`[NewsCrawlerAgent] Found ${articles.length} relevant articles from NewsAPI`);
      return articles;
    } catch (error) {
      console.error(`[NewsCrawlerAgent] NewsAPI error:`, error);
      return [];
    }
  }

  private async scrapeNewsSource(
    source: NewsSource,
    terms: string[]
  ): Promise<NewsArticle[]> {
    this.addMetric("pages_scraped", 1);
    console.log(`[NewsCrawlerAgent] Scraping: ${source.name}`);

    // Web scraping for news sites - uses basic HTML parsing
    // Note: More robust scraping would use puppeteer or playwright
    try {
      // Build search URL based on source
      const searchQuery = terms.slice(0, 3).map((t) => t.replace(/"/g, "")).join("+");
      const searchUrl = `${source.url}/search?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LocateConnect/1.0; +https://locateconnect.ca)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.log(`[NewsCrawlerAgent] Scrape failed: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseScrapedHTML(html, source, terms);
    } catch (error) {
      console.error(`[NewsCrawlerAgent] Scrape error:`, error);
      return [];
    }
  }

  /**
   * Parse scraped HTML for article links
   */
  private parseScrapedHTML(
    html: string,
    source: NewsSource,
    terms: string[]
  ): NewsArticle[] {
    const articles: NewsArticle[] = [];

    // Look for common article patterns
    // Pattern 1: <article> tags
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let match;

    while ((match = articlePattern.exec(html)) !== null && articles.length < 20) {
      const articleHtml = match[1];

      // Try to extract title and link
      const titleMatch = articleHtml.match(/<h[1-3][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
      if (!titleMatch) continue;

      const [, link, title] = titleMatch;

      // Get description if available
      const descMatch = articleHtml.match(/<p[^>]*class="[^"]*(?:summary|desc|excerpt)[^"]*"[^>]*>([^<]+)<\/p>/i);
      const description = descMatch ? descMatch[1] : "";

      // Calculate relevance
      const contentText = `${title} ${description}`.toLowerCase();
      let relevanceScore = 0;

      for (const term of terms) {
        const cleanTerm = term.replace(/"/g, "").toLowerCase();
        if (contentText.includes(cleanTerm)) {
          relevanceScore += 15;
        }
      }

      if (relevanceScore > 0) {
        // Resolve relative URLs
        const fullUrl = link.startsWith("http") ? link : `${source.url}${link}`;

        articles.push({
          id: crypto.randomUUID(),
          title: this.decodeHTMLEntities(title.trim()),
          content: this.decodeHTMLEntities(description.trim()),
          url: fullUrl,
          sourceId: source.id,
          sourceName: source.name,
          publishedAt: new Date().toISOString(),
          crawledAt: new Date().toISOString(),
          relevanceScore: Math.min(100, relevanceScore),
          sentiment: "neutral",
          matchedTerms: terms.filter((t) =>
            contentText.includes(t.replace(/"/g, "").toLowerCase())
          ),
        });
      }
    }

    console.log(`[NewsCrawlerAgent] Scraped ${articles.length} articles from ${source.name}`);
    return articles;
  }

  private findBestCaseMatch(
    article: NewsArticle,
    cases: CaseSearchTerms[]
  ): CaseSearchTerms | null {
    let bestMatch: CaseSearchTerms | null = null;
    let bestScore = 0;

    const articleText = `${article.title} ${article.content}`.toLowerCase();

    for (const caseData of cases) {
      let score = 0;

      for (const term of caseData.terms) {
        if (articleText.includes(term.toLowerCase())) {
          score += 10;
        }
      }

      // Boost score for location matches
      if (
        caseData.lastSeenLocation &&
        articleText.includes(caseData.lastSeenLocation.toLowerCase())
      ) {
        score += 20;
      }

      // Adjust by case priority
      score *= 1 + (5 - caseData.priority) * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = caseData;
      }
    }

    if (bestMatch && bestScore > 0) {
      // Update article relevance score
      article.relevanceScore = Math.min(100, bestScore);
    }

    return bestMatch;
  }

  private async storeArticle(
    article: NewsArticle,
    caseId: string
  ): Promise<void> {
    const supabase = await createClient();

    console.log(
      `[NewsCrawlerAgent] Storing article for case ${caseId}: ${article.title}`
    );

    try {
      // Check if article already exists (by URL)
      const { data: existing } = await supabase
        .from("news_articles")
        .select("id")
        .eq("url", article.url)
        .single();

      if (existing) {
        // Link to additional case if not already linked
        await supabase.from("case_news_articles").upsert(
          {
            case_id: caseId,
            news_article_id: existing.id,
          },
          { onConflict: "case_id,news_article_id" }
        );
        return;
      }

      // Store new article
      const { data: newArticle, error } = await supabase
        .from("news_articles")
        .insert({
          title: article.title,
          content: article.content,
          url: article.url,
          source: article.sourceName,
          image_url: article.imageUrl,
          published_at: article.publishedAt,
          author: article.author,
          relevance_score: article.relevanceScore,
          sentiment: article.sentiment,
          keywords: article.matchedTerms,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[NewsCrawlerAgent] Error storing article:", error);
        return;
      }

      // Link article to case
      await supabase.from("case_news_articles").insert({
        case_id: caseId,
        news_article_id: newArticle.id,
        relevance_score: article.relevanceScore,
      });

      // Create a lead for significant articles
      if (article.relevanceScore >= 50) {
        await supabase.from("leads").insert({
          case_id: caseId,
          source_type: "news_article",
          source_id: newArticle.id,
          title: `News Article: ${article.title.substring(0, 100)}`,
          description: `Relevant news article found from ${article.sourceName}. Relevance score: ${article.relevanceScore}%.`,
          priority: article.relevanceScore >= 80 ? "high" : "medium",
          status: "new",
          submitted_by: "system",
          metadata: {
            article_url: article.url,
            source: article.sourceName,
            published_at: article.publishedAt,
          },
        });
      }
    } catch (error) {
      console.error("[NewsCrawlerAgent] Error storing article:", error);
    }
  }

  private async triggerAlert(
    caseId: string,
    article: NewsArticle
  ): Promise<void> {
    const supabase = await createClient();

    console.log(
      `[NewsCrawlerAgent] High-relevance article alert for case ${caseId}`
    );

    try {
      // Get case details for the notification
      const { data: caseData } = await supabase
        .from("case_reports")
        .select("case_number, assigned_to")
        .eq("id", caseId)
        .single();

      if (!caseData) return;

      // Create notification for assigned investigator
      if (caseData.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: caseData.assigned_to,
          type: "news_alert",
          title: "High-Relevance News Article Found",
          message: `A highly relevant news article has been found for case ${caseData.case_number}: "${article.title.substring(0, 80)}..."`,
          data: {
            case_id: caseId,
            case_number: caseData.case_number,
            article_url: article.url,
            article_title: article.title,
            relevance_score: article.relevanceScore,
            source: article.sourceName,
          },
          priority: "high",
        });
      }

      // Log the alert in case activity
      await supabase.from("case_activity").insert({
        case_id: caseId,
        activity_type: "news_alert",
        description: `High-relevance news article found: "${article.title.substring(0, 100)}"`,
        metadata: {
          article_url: article.url,
          source: article.sourceName,
          relevance_score: article.relevanceScore,
        },
      });
    } catch (error) {
      console.error("[NewsCrawlerAgent] Error triggering alert:", error);
    }
  }

  protected clone(config: AgentConfig): BaseAgent {
    return new NewsCrawlerAgent(config);
  }
}

export function createNewsCrawlerAgent(
  id: string,
  settings?: Partial<NewsCrawlerSettings>
): NewsCrawlerAgent {
  const defaultSources: NewsSource[] = [
    {
      id: "google_news",
      name: "Google News",
      type: "rss",
      url: "https://news.google.com/rss",
      enabled: true,
      priority: 1,
    },
    {
      id: "newsapi",
      name: "NewsAPI",
      type: "api",
      url: "https://newsapi.org/v2",
      enabled: false, // Requires API key
      priority: 2,
    },
  ];

  const config: AgentConfig = {
    id,
    type: "news_crawler",
    name: "News Crawler Agent",
    enabled: true,
    schedule: "0 */2 * * *", // Every 2 hours
    timeout: 600000, // 10 minutes
    retryAttempts: 2,
    retryDelay: 60000,
    settings: {
      sources: defaultSources,
      searchTerms: ["missing person", "unidentified", "found deceased", "jane doe", "john doe"],
      maxArticlesPerRun: 200,
      minRelevanceScore: 40,
      lookbackDays: 7,
      ...settings,
    },
  };

  return new NewsCrawlerAgent(config);
}
