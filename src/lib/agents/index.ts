/**
 * Agents Module Index
 * Export all monitoring agents and utilities
 */

// Base agent framework
export { BaseAgent, AgentRegistry, agentRegistry } from "./base-agent";
import { agentRegistry } from "./base-agent";

// Monitoring agents
export {
  SocialMediaAgent,
  createSocialMediaAgent,
} from "./social-media-agent";
import { createSocialMediaAgent } from "./social-media-agent";

export {
  EmailTrackingAgent,
  createEmailTrackingAgent,
  generateTrackingPixel,
} from "./email-tracking-agent";
import { createEmailTrackingAgent } from "./email-tracking-agent";

export {
  HospitalRegistryAgent,
  createHospitalRegistryAgent,
} from "./hospital-registry-agent";
import { createHospitalRegistryAgent } from "./hospital-registry-agent";

export {
  PriorityEscalationAgent,
  createPriorityEscalationAgent,
} from "./priority-escalation-agent";
import { createPriorityEscalationAgent } from "./priority-escalation-agent";

// Crawler agents
export {
  NewsCrawlerAgent,
  createNewsCrawlerAgent,
} from "./news-crawler";
import { createNewsCrawlerAgent } from "./news-crawler";

export {
  PublicRecordsCrawlerAgent,
  createPublicRecordsCrawlerAgent,
} from "./public-records-crawler";
import { createPublicRecordsCrawlerAgent } from "./public-records-crawler";

// Initialize all default agents
export function initializeAgents(): void {
  // Create and register default agents
  const socialMedia = createSocialMediaAgent("default-social-media");
  const emailTracking = createEmailTrackingAgent("default-email-tracking");
  const hospitalRegistry = createHospitalRegistryAgent("default-hospital-registry");
  const priorityEscalation = createPriorityEscalationAgent("default-priority-escalation");
  const newsCrawler = createNewsCrawlerAgent("default-news-crawler");
  const publicRecords = createPublicRecordsCrawlerAgent("default-public-records");

  agentRegistry.register(socialMedia);
  agentRegistry.register(emailTracking);
  agentRegistry.register(hospitalRegistry);
  agentRegistry.register(priorityEscalation);
  agentRegistry.register(newsCrawler);
  agentRegistry.register(publicRecords);

  console.log("[Agents] Initialized all default agents");
}
