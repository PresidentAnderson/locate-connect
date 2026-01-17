/**
 * Media Charter and FAQ Service
 * Manages media access and public FAQ
 */

import type {
  MediaAccessCharter,
  MediaAccessLevel,
  MediaRequest,
  FAQCategory,
  FAQItem,
  SupportedLanguage,
} from "@/types/compliance.types";

// Default media access charter
const DEFAULT_CHARTER: MediaAccessCharter = {
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  accessLevels: [
    {
      id: "public",
      name: "Public Information",
      description: "Information available to general public",
      dataAccess: ["case_number", "missing_person_name", "age", "last_seen_location", "photos"],
      restrictions: ["No minor details without guardian consent"],
      approvalRequired: false,
    },
    {
      id: "media_basic",
      name: "Basic Media Access",
      description: "Standard media access for accredited journalists",
      dataAccess: ["public", "case_status", "search_updates", "official_statements"],
      restrictions: ["No speculation", "Must verify information"],
      approvalRequired: true,
    },
    {
      id: "media_enhanced",
      name: "Enhanced Media Access",
      description: "Extended access for investigative reporting",
      dataAccess: ["media_basic", "timeline", "search_coordination"],
      restrictions: ["Embargo periods apply", "Pre-publication review"],
      approvalRequired: true,
    },
  ],
  requestProcess:
    "Submit request via media portal. Include organization credentials, story angle, and deadline.",
  responseTimeframe: 24,
  appealProcess: "Appeals can be submitted within 48 hours to the Communications Director.",
  restrictions: [
    {
      id: "minor_protection",
      category: "Privacy",
      description: "Information about minors requires guardian consent",
      legalBasis: "Youth Protection Act",
    },
    {
      id: "investigation_integrity",
      category: "Investigation",
      description: "Information that could compromise active investigations",
      legalBasis: "Law Enforcement Cooperation",
    },
    {
      id: "victim_dignity",
      category: "Privacy",
      description: "Information that could harm victim dignity",
      legalBasis: "Privacy legislation",
    },
  ],
  mediaContact: {
    name: "Media Relations",
    title: "Communications Officer",
    email: "media@locateconnect.ca",
    phone: "1-800-555-0100",
  },
};

// Default FAQ categories and items
const DEFAULT_FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: "general",
    name: { en: "General Information", fr: "Informations générales" } as Record<SupportedLanguage, string>,
    description: {
      en: "Basic information about our services",
      fr: "Informations de base sur nos services",
    } as Record<SupportedLanguage, string>,
    order: 1,
    icon: "info",
  },
  {
    id: "reporting",
    name: { en: "Reporting a Missing Person", fr: "Signaler une personne disparue" } as Record<SupportedLanguage, string>,
    description: {
      en: "How to report and what to expect",
      fr: "Comment signaler et à quoi s'attendre",
    } as Record<SupportedLanguage, string>,
    order: 2,
    icon: "report",
  },
  {
    id: "tips",
    name: { en: "Submitting Tips", fr: "Soumettre des indices" } as Record<SupportedLanguage, string>,
    description: {
      en: "How to submit tips and information",
      fr: "Comment soumettre des indices et des informations",
    } as Record<SupportedLanguage, string>,
    order: 3,
    icon: "lightbulb",
  },
  {
    id: "privacy",
    name: { en: "Privacy & Security", fr: "Confidentialité et sécurité" } as Record<SupportedLanguage, string>,
    description: {
      en: "How we protect your information",
      fr: "Comment nous protégeons vos informations",
    } as Record<SupportedLanguage, string>,
    order: 4,
    icon: "shield",
  },
  {
    id: "volunteering",
    name: { en: "Volunteering", fr: "Bénévolat" } as Record<SupportedLanguage, string>,
    description: {
      en: "How to help and get involved",
      fr: "Comment aider et s'impliquer",
    } as Record<SupportedLanguage, string>,
    order: 5,
    icon: "people",
  },
];

const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  {
    id: "what-is-locateconnect",
    categoryId: "general",
    question: {
      en: "What is LocateConnect?",
      fr: "Qu'est-ce que LocateConnect?",
    } as Record<SupportedLanguage, string>,
    answer: {
      en: "LocateConnect is a comprehensive missing persons case management system designed to help law enforcement, families, and communities work together to locate missing individuals.",
      fr: "LocateConnect est un système complet de gestion des cas de personnes disparues conçu pour aider les forces de l'ordre, les familles et les communautés à travailler ensemble pour localiser les personnes disparues.",
    } as Record<SupportedLanguage, string>,
    order: 1,
    tags: ["about", "general"],
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "how-to-report",
    categoryId: "reporting",
    question: {
      en: "How do I report a missing person?",
      fr: "Comment signaler une personne disparue?",
    } as Record<SupportedLanguage, string>,
    answer: {
      en: "First, contact your local police department immediately. They will file an official missing persons report. You can also submit information through our portal, but this does not replace an official police report.",
      fr: "Tout d'abord, contactez immédiatement votre service de police local. Ils déposeront un rapport officiel de personne disparue. Vous pouvez également soumettre des informations via notre portail, mais cela ne remplace pas un rapport de police officiel.",
    } as Record<SupportedLanguage, string>,
    order: 1,
    tags: ["report", "police", "process"],
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "waiting-period",
    categoryId: "reporting",
    question: {
      en: "Do I have to wait 24 or 48 hours to report?",
      fr: "Dois-je attendre 24 ou 48 heures pour signaler?",
    } as Record<SupportedLanguage, string>,
    answer: {
      en: "No. This is a myth. There is NO waiting period to report a missing person. You should report immediately, especially if the person is a child, elderly, or has medical conditions.",
      fr: "Non. C'est un mythe. Il n'y a AUCUNE période d'attente pour signaler une personne disparue. Vous devez signaler immédiatement, surtout si la personne est un enfant, une personne âgée ou a des conditions médicales.",
    } as Record<SupportedLanguage, string>,
    order: 2,
    tags: ["myth", "waiting", "urgent"],
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "anonymous-tips",
    categoryId: "tips",
    question: {
      en: "Can I submit a tip anonymously?",
      fr: "Puis-je soumettre un indice de façon anonyme?",
    } as Record<SupportedLanguage, string>,
    answer: {
      en: "Yes. You can submit tips completely anonymously through our secure portal. You will receive a tip code that allows you to check the status of your tip and add follow-up information without revealing your identity.",
      fr: "Oui. Vous pouvez soumettre des indices de manière totalement anonyme via notre portail sécurisé. Vous recevrez un code d'indice qui vous permettra de vérifier l'état de votre indice et d'ajouter des informations de suivi sans révéler votre identité.",
    } as Record<SupportedLanguage, string>,
    order: 1,
    tags: ["anonymous", "tips", "privacy"],
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "data-protection",
    categoryId: "privacy",
    question: {
      en: "How is my information protected?",
      fr: "Comment mes informations sont-elles protégées?",
    } as Record<SupportedLanguage, string>,
    answer: {
      en: "We employ industry-standard encryption, access controls, and comply with Canadian privacy laws including Quebec's Law 25. Your data is only shared with authorized personnel on a need-to-know basis.",
      fr: "Nous utilisons un cryptage standard de l'industrie, des contrôles d'accès et nous conformons aux lois canadiennes sur la vie privée, y compris la Loi 25 du Québec. Vos données ne sont partagées qu'avec le personnel autorisé selon le besoin de savoir.",
    } as Record<SupportedLanguage, string>,
    order: 1,
    tags: ["privacy", "security", "encryption"],
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "how-to-volunteer",
    categoryId: "volunteering",
    question: {
      en: "How can I volunteer to help?",
      fr: "Comment puis-je me porter volontaire pour aider?",
    } as Record<SupportedLanguage, string>,
    answer: {
      en: "Register as a volunteer through our portal. After registration and background check, you can participate in search parties, poster distribution, social media campaigns, and more.",
      fr: "Inscrivez-vous comme bénévole via notre portail. Après l'inscription et la vérification des antécédents, vous pouvez participer aux équipes de recherche, à la distribution d'affiches, aux campagnes sur les réseaux sociaux, et plus encore.",
    } as Record<SupportedLanguage, string>,
    order: 1,
    tags: ["volunteer", "help", "community"],
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class MediaFAQService {
  private charter: MediaAccessCharter;
  private mediaRequests: Map<string, MediaRequest> = new Map();
  private faqCategories: FAQCategory[];
  private faqItems: Map<string, FAQItem> = new Map();

  constructor() {
    this.charter = DEFAULT_CHARTER;
    this.faqCategories = DEFAULT_FAQ_CATEGORIES;

    for (const item of DEFAULT_FAQ_ITEMS) {
      this.faqItems.set(item.id, item);
    }
  }

  // ==================== MEDIA CHARTER ====================

  /**
   * Get media access charter
   */
  getCharter(): MediaAccessCharter {
    return this.charter;
  }

  /**
   * Get access levels
   */
  getAccessLevels(): MediaAccessLevel[] {
    return this.charter.accessLevels;
  }

  /**
   * Submit media request
   */
  async submitMediaRequest(input: {
    organizationName: string;
    journalistName: string;
    email: string;
    phone?: string;
    requestType: MediaRequest["requestType"];
    description: string;
    caseIds?: string[];
  }): Promise<MediaRequest> {
    const id = crypto.randomUUID();

    const request: MediaRequest = {
      id,
      organizationName: input.organizationName,
      journalistName: input.journalistName,
      email: input.email,
      phone: input.phone,
      requestType: input.requestType,
      description: input.description,
      caseIds: input.caseIds,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.mediaRequests.set(id, request);
    console.log(`[Media] Request submitted by ${input.organizationName}`);

    return request;
  }

  /**
   * Get media request
   */
  getMediaRequest(requestId: string): MediaRequest | null {
    return this.mediaRequests.get(requestId) || null;
  }

  /**
   * List media requests
   */
  listMediaRequests(status?: MediaRequest["status"]): MediaRequest[] {
    let requests = Array.from(this.mediaRequests.values());

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    return requests.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Respond to media request
   */
  async respondToRequest(
    requestId: string,
    status: "approved" | "denied",
    response: string,
    accessLevel?: string
  ): Promise<MediaRequest | null> {
    const request = this.mediaRequests.get(requestId);
    if (!request) return null;

    request.status = status;
    request.respondedAt = new Date().toISOString();
    request.response = response;
    if (accessLevel) request.accessLevel = accessLevel;

    this.mediaRequests.set(requestId, request);
    console.log(`[Media] Request ${requestId} ${status}`);

    return request;
  }

  // ==================== FAQ ====================

  /**
   * Get FAQ categories
   */
  getFAQCategories(): FAQCategory[] {
    return this.faqCategories.sort((a, b) => a.order - b.order);
  }

  /**
   * Get FAQ items by category
   */
  getFAQByCategory(categoryId: string): FAQItem[] {
    return Array.from(this.faqItems.values())
      .filter((item) => item.categoryId === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get all FAQ items
   */
  getAllFAQ(): FAQItem[] {
    return Array.from(this.faqItems.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Search FAQ
   */
  searchFAQ(query: string, language: SupportedLanguage = "en"): FAQItem[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.faqItems.values()).filter((item) => {
      const question = item.question[language]?.toLowerCase() || "";
      const answer = item.answer[language]?.toLowerCase() || "";
      const tags = item.tags.join(" ").toLowerCase();

      return (
        question.includes(lowerQuery) ||
        answer.includes(lowerQuery) ||
        tags.includes(lowerQuery)
      );
    });
  }

  /**
   * Get FAQ item
   */
  getFAQItem(itemId: string): FAQItem | null {
    return this.faqItems.get(itemId) || null;
  }

  /**
   * Add FAQ item
   */
  addFAQItem(
    input: Omit<FAQItem, "id" | "helpful" | "notHelpful" | "createdAt" | "updatedAt">
  ): FAQItem {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const item: FAQItem = {
      ...input,
      id,
      helpful: 0,
      notHelpful: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.faqItems.set(id, item);
    return item;
  }

  /**
   * Update FAQ item
   */
  updateFAQItem(
    itemId: string,
    updates: Partial<
      Pick<FAQItem, "question" | "answer" | "order" | "tags" | "categoryId">
    >
  ): FAQItem | null {
    const item = this.faqItems.get(itemId);
    if (!item) return null;

    Object.assign(item, updates);
    item.updatedAt = new Date().toISOString();
    this.faqItems.set(itemId, item);

    return item;
  }

  /**
   * Delete FAQ item
   */
  deleteFAQItem(itemId: string): boolean {
    return this.faqItems.delete(itemId);
  }

  /**
   * Record FAQ feedback
   */
  recordFAQFeedback(itemId: string, helpful: boolean): boolean {
    const item = this.faqItems.get(itemId);
    if (!item) return false;

    if (helpful) {
      item.helpful++;
    } else {
      item.notHelpful++;
    }

    this.faqItems.set(itemId, item);
    return true;
  }

  /**
   * Get popular FAQ items
   */
  getPopularFAQ(limit = 5): FAQItem[] {
    return Array.from(this.faqItems.values())
      .sort((a, b) => b.helpful - a.helpful)
      .slice(0, limit);
  }
}

export const mediaFAQService = new MediaFAQService();
