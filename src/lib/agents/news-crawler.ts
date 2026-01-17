/**
 * News Article Crawler Agent
 * Searches news sources for articles related to missing persons cases
 */

import { BaseAgent } from "./base-agent";
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
    this.settings = config.settings as NewsCrawlerSettings;
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
    // Query database for active cases with generated search terms
    // In production, this builds terms from name, aliases, location, etc.
    return [];
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

    // In production, fetch and parse RSS feed
    console.log(`[NewsCrawlerAgent] Searching RSS feed: ${source.name}`);

    // Would parse RSS XML and filter by terms
    return [];
  }

  private async searchNewsAPI(
    source: NewsSource,
    terms: string[]
  ): Promise<NewsArticle[]> {
    this.addMetric("api_searches", 1);

    // In production, call news API (NewsAPI, GDELT, etc.)
    console.log(`[NewsCrawlerAgent] Searching news API: ${source.name}`);

    // Build query
    const query = terms.slice(0, 10).join(" OR ");
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.settings.lookbackDays);

    console.log(`[NewsCrawlerAgent] Query: ${query}`);
    console.log(`[NewsCrawlerAgent] Since: ${lookbackDate.toISOString()}`);

    return [];
  }

  private async scrapeNewsSource(
    source: NewsSource,
    terms: string[]
  ): Promise<NewsArticle[]> {
    this.addMetric("pages_scraped", 1);

    // In production, scrape news website
    console.log(`[NewsCrawlerAgent] Scraping: ${source.name}`);

    // Would use puppeteer or similar to scrape
    return [];
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
    console.log(
      `[NewsCrawlerAgent] Storing article for case ${caseId}: ${article.title}`
    );
    // Store in database and create lead
  }

  private async triggerAlert(
    caseId: string,
    article: NewsArticle
  ): Promise<void> {
    console.log(
      `[NewsCrawlerAgent] High-relevance article alert for case ${caseId}`
    );
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
