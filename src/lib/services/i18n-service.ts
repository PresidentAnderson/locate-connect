/**
 * Internationalization Service
 * Full EN/FR support with indigenous language infrastructure
 */

import type {
  SupportedLanguage,
  LanguageConfig,
  TranslationNamespace,
} from "@/types/compliance.types";

// Language configurations
const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    enabled: true,
    isIndigenous: false,
    completionPercentage: 100,
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    direction: "ltr",
    enabled: true,
    isIndigenous: false,
    completionPercentage: 100,
  },
  cr: {
    code: "cr",
    name: "Cree",
    nativeName: "ᓀᐦᐃᔭᐍᐏᐣ",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    region: "Plains, Woods, Swampy",
    fallbackLanguage: "en",
    completionPercentage: 45,
  },
  oj: {
    code: "oj",
    name: "Ojibwe",
    nativeName: "ᐊᓂᔑᓈᐯᒧᐎᓐ",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    fallbackLanguage: "en",
    completionPercentage: 40,
  },
  iu: {
    code: "iu",
    name: "Inuktitut",
    nativeName: "ᐃᓄᒃᑎᑐᑦ",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    region: "Nunavut, Nunavik",
    fallbackLanguage: "en",
    completionPercentage: 50,
  },
  moh: {
    code: "moh",
    name: "Mohawk",
    nativeName: "Kanien'kéha",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    region: "Six Nations",
    fallbackLanguage: "en",
    completionPercentage: 35,
  },
  mi: {
    code: "mi",
    name: "Mi'kmaq",
    nativeName: "Míkmaq",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    region: "Atlantic",
    fallbackLanguage: "en",
    completionPercentage: 30,
  },
  dak: {
    code: "dak",
    name: "Dakota",
    nativeName: "Dakȟótiyapi",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    fallbackLanguage: "en",
    completionPercentage: 25,
  },
  bla: {
    code: "bla",
    name: "Blackfoot",
    nativeName: "Siksiká",
    direction: "ltr",
    enabled: true,
    isIndigenous: true,
    fallbackLanguage: "en",
    completionPercentage: 25,
  },
};

// English translations
const EN_TRANSLATIONS: TranslationNamespace = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    search: "Search",
    filter: "Filter",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Information",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    submit: "Submit",
    reset: "Reset",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    select: "Select",
    required: "Required",
    optional: "Optional",
  },
  navigation: {
    dashboard: "Dashboard",
    cases: "Cases",
    leads: "Leads",
    alerts: "Alerts",
    reports: "Reports",
    settings: "Settings",
    profile: "Profile",
    logout: "Logout",
    help: "Help",
    search: "Search",
    notifications: "Notifications",
  },
  forms: {
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    city: "City",
    province: "Province",
    postalCode: "Postal Code",
    country: "Country",
    dateOfBirth: "Date of Birth",
    gender: "Gender",
    description: "Description",
    notes: "Notes",
    attachments: "Attachments",
    uploadFile: "Upload File",
    dragDrop: "Drag and drop files here",
  },
  errors: {
    required: "This field is required",
    invalidEmail: "Please enter a valid email address",
    invalidPhone: "Please enter a valid phone number",
    minLength: "Minimum {min} characters required",
    maxLength: "Maximum {max} characters allowed",
    networkError: "Network error. Please try again.",
    serverError: "Server error. Please try again later.",
    unauthorized: "You are not authorized to perform this action",
    notFound: "Resource not found",
  },
  accessibility: {
    skipToMain: "Skip to main content",
    skipToNav: "Skip to navigation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    expandSection: "Expand section",
    collapseSection: "Collapse section",
    loading: "Loading, please wait",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    rowSelected: "Row selected",
    pageOf: "Page {current} of {total}",
  },
  cases: {
    newCase: "New Case",
    caseNumber: "Case Number",
    status: "Status",
    priority: "Priority",
    missingPerson: "Missing Person",
    lastSeen: "Last Seen",
    dateReported: "Date Reported",
    assignedTo: "Assigned To",
    timeline: "Timeline",
    documents: "Documents",
    active: "Active",
    closed: "Closed",
    resolved: "Resolved",
  },
  leads: {
    newLead: "New Lead",
    leadSource: "Lead Source",
    confidence: "Confidence",
    verified: "Verified",
    unverified: "Unverified",
    assignLead: "Assign Lead",
    verifyLead: "Verify Lead",
    closeLead: "Close Lead",
  },
  alerts: {
    amberAlert: "AMBER Alert",
    silverAlert: "Silver Alert",
    missingAlert: "Missing Person Alert",
    activeAlerts: "Active Alerts",
    alertHistory: "Alert History",
    issueAlert: "Issue Alert",
    cancelAlert: "Cancel Alert",
  },
  settings: {
    account: "Account",
    security: "Security",
    notifications: "Notifications",
    language: "Language",
    accessibility: "Accessibility",
    privacy: "Privacy",
    changePassword: "Change Password",
    twoFactor: "Two-Factor Authentication",
  },
  intake: {
    reportMissing: "Report Missing Person",
    relationship: "Relationship to Missing Person",
    circumstances: "Circumstances of Disappearance",
    physicalDescription: "Physical Description",
    clothing: "Clothing Last Seen Wearing",
    medicalConditions: "Medical Conditions",
    medications: "Medications",
    mentalHealth: "Mental Health Information",
    vehicleInfo: "Vehicle Information",
    socialMedia: "Social Media Accounts",
    knownAssociates: "Known Associates",
    frequentedPlaces: "Frequented Places",
  },
  public: {
    submitTip: "Submit a Tip",
    anonymousTip: "Anonymous Tip",
    tipSubmitted: "Thank you for your tip",
    tipCode: "Your tip code is",
    checkTipStatus: "Check Tip Status",
    faq: "Frequently Asked Questions",
    contactUs: "Contact Us",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    accessibility: "Accessibility",
  },
};

// French translations
const FR_TRANSLATIONS: TranslationNamespace = {
  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    close: "Fermer",
    search: "Rechercher",
    filter: "Filtrer",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    warning: "Avertissement",
    info: "Information",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    submit: "Soumettre",
    reset: "Réinitialiser",
    yes: "Oui",
    no: "Non",
    all: "Tout",
    none: "Aucun",
    select: "Sélectionner",
    required: "Obligatoire",
    optional: "Facultatif",
  },
  navigation: {
    dashboard: "Tableau de bord",
    cases: "Dossiers",
    leads: "Pistes",
    alerts: "Alertes",
    reports: "Rapports",
    settings: "Paramètres",
    profile: "Profil",
    logout: "Déconnexion",
    help: "Aide",
    search: "Rechercher",
    notifications: "Notifications",
  },
  forms: {
    firstName: "Prénom",
    lastName: "Nom de famille",
    email: "Courriel",
    phone: "Téléphone",
    address: "Adresse",
    city: "Ville",
    province: "Province",
    postalCode: "Code postal",
    country: "Pays",
    dateOfBirth: "Date de naissance",
    gender: "Genre",
    description: "Description",
    notes: "Notes",
    attachments: "Pièces jointes",
    uploadFile: "Téléverser un fichier",
    dragDrop: "Glissez et déposez les fichiers ici",
  },
  errors: {
    required: "Ce champ est obligatoire",
    invalidEmail: "Veuillez entrer une adresse courriel valide",
    invalidPhone: "Veuillez entrer un numéro de téléphone valide",
    minLength: "Minimum {min} caractères requis",
    maxLength: "Maximum {max} caractères permis",
    networkError: "Erreur réseau. Veuillez réessayer.",
    serverError: "Erreur serveur. Veuillez réessayer plus tard.",
    unauthorized: "Vous n'êtes pas autorisé à effectuer cette action",
    notFound: "Ressource introuvable",
  },
  accessibility: {
    skipToMain: "Passer au contenu principal",
    skipToNav: "Passer à la navigation",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    expandSection: "Développer la section",
    collapseSection: "Réduire la section",
    loading: "Chargement en cours, veuillez patienter",
    sortAscending: "Trier par ordre croissant",
    sortDescending: "Trier par ordre décroissant",
    rowSelected: "Ligne sélectionnée",
    pageOf: "Page {current} sur {total}",
  },
  cases: {
    newCase: "Nouveau dossier",
    caseNumber: "Numéro de dossier",
    status: "Statut",
    priority: "Priorité",
    missingPerson: "Personne disparue",
    lastSeen: "Dernière fois vue",
    dateReported: "Date du signalement",
    assignedTo: "Assigné à",
    timeline: "Chronologie",
    documents: "Documents",
    active: "Actif",
    closed: "Fermé",
    resolved: "Résolu",
  },
  leads: {
    newLead: "Nouvelle piste",
    leadSource: "Source de la piste",
    confidence: "Confiance",
    verified: "Vérifié",
    unverified: "Non vérifié",
    assignLead: "Assigner la piste",
    verifyLead: "Vérifier la piste",
    closeLead: "Fermer la piste",
  },
  alerts: {
    amberAlert: "Alerte AMBER",
    silverAlert: "Alerte Argent",
    missingAlert: "Alerte personne disparue",
    activeAlerts: "Alertes actives",
    alertHistory: "Historique des alertes",
    issueAlert: "Émettre une alerte",
    cancelAlert: "Annuler l'alerte",
  },
  settings: {
    account: "Compte",
    security: "Sécurité",
    notifications: "Notifications",
    language: "Langue",
    accessibility: "Accessibilité",
    privacy: "Confidentialité",
    changePassword: "Changer le mot de passe",
    twoFactor: "Authentification à deux facteurs",
  },
  intake: {
    reportMissing: "Signaler une personne disparue",
    relationship: "Relation avec la personne disparue",
    circumstances: "Circonstances de la disparition",
    physicalDescription: "Description physique",
    clothing: "Vêtements portés lors de la dernière observation",
    medicalConditions: "Conditions médicales",
    medications: "Médicaments",
    mentalHealth: "Informations sur la santé mentale",
    vehicleInfo: "Informations sur le véhicule",
    socialMedia: "Comptes de médias sociaux",
    knownAssociates: "Associés connus",
    frequentedPlaces: "Lieux fréquentés",
  },
  public: {
    submitTip: "Soumettre un indice",
    anonymousTip: "Indice anonyme",
    tipSubmitted: "Merci pour votre indice",
    tipCode: "Votre code d'indice est",
    checkTipStatus: "Vérifier le statut de l'indice",
    faq: "Foire aux questions",
    contactUs: "Nous contacter",
    privacyPolicy: "Politique de confidentialité",
    termsOfService: "Conditions d'utilisation",
    accessibility: "Accessibilité",
  },
};

// Indigenous language translations (partial - for intake forms)
const INDIGENOUS_INTAKE_TRANSLATIONS: Partial<Record<SupportedLanguage, Partial<TranslationNamespace["intake"]>>> = {
  cr: {
    reportMissing: "ᐊᒋᒧ ᑳ ᐗᓂᐦᐋᑲᓂᐎᑦ ᐊᐎᔭ",
    relationship: "ᑖᓂᓯ ᑳ ᐃᔑ ᐗᐦᑯᒫᑐᔭᐣ",
    physicalDescription: "ᑖᓂᓯ ᐁ ᐃᔑᓈᑯᓯᑦ",
  },
  iu: {
    reportMissing: "ᐅᖃᐅᓯᖃᕐᓗᑎᑦ ᐊᓯᐊᒍᑦ",
    relationship: "ᖃᓄᖅ ᐃᓚᒋᔭᐅᓂᖓ",
    physicalDescription: "ᑕᐅᑐᒐᒃᓴᖓ",
  },
  oj: {
    reportMissing: "Dibaajimo wanishinowin",
    relationship: "Aaniin ezhi-inawemad",
    physicalDescription: "Aaniin ezhiwebak",
  },
  moh: {
    reportMissing: "Satahonhsíyohst ne yonkwaterihwá",
    relationship: "Oh niyohtónhak",
  },
};

class I18nService {
  private currentLanguage: SupportedLanguage = "en";
  private translations: Map<SupportedLanguage, TranslationNamespace> = new Map();

  constructor() {
    this.translations.set("en", EN_TRANSLATIONS);
    this.translations.set("fr", FR_TRANSLATIONS);
  }

  /**
   * Get current language
   */
  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setLanguage(language: SupportedLanguage): void {
    if (LANGUAGE_CONFIGS[language]) {
      this.currentLanguage = language;
      console.log(`[i18n] Language set to ${language}`);
    }
  }

  /**
   * Get all language configs
   */
  getLanguageConfigs(): LanguageConfig[] {
    return Object.values(LANGUAGE_CONFIGS);
  }

  /**
   * Get enabled languages
   */
  getEnabledLanguages(): LanguageConfig[] {
    return Object.values(LANGUAGE_CONFIGS).filter((l) => l.enabled);
  }

  /**
   * Get indigenous languages
   */
  getIndigenousLanguages(): LanguageConfig[] {
    return Object.values(LANGUAGE_CONFIGS).filter((l) => l.isIndigenous);
  }

  /**
   * Get language config
   */
  getLanguageConfig(code: SupportedLanguage): LanguageConfig | undefined {
    return LANGUAGE_CONFIGS[code];
  }

  /**
   * Translate a key
   */
  t(
    namespace: keyof TranslationNamespace,
    key: string,
    params?: Record<string, string | number>
  ): string {
    const translations = this.translations.get(this.currentLanguage);
    const fallbackTranslations = this.translations.get("en");

    let value =
      translations?.[namespace]?.[key] ||
      fallbackTranslations?.[namespace]?.[key] ||
      key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }

    return value;
  }

  /**
   * Get all translations for a namespace
   */
  getNamespace(namespace: keyof TranslationNamespace): Record<string, string> {
    const translations = this.translations.get(this.currentLanguage);
    const fallbackTranslations = this.translations.get("en");

    return {
      ...fallbackTranslations?.[namespace],
      ...translations?.[namespace],
    };
  }

  /**
   * Get intake form translations for indigenous languages
   */
  getIndigenousIntakeTranslations(
    language: SupportedLanguage
  ): Partial<TranslationNamespace["intake"]> {
    return INDIGENOUS_INTAKE_TRANSLATIONS[language] || {};
  }

  /**
   * Add custom translations
   */
  addTranslations(
    language: SupportedLanguage,
    namespace: keyof TranslationNamespace,
    translations: Record<string, string>
  ): void {
    const current = this.translations.get(language) || ({} as TranslationNamespace);
    current[namespace] = {
      ...current[namespace],
      ...translations,
    };
    this.translations.set(language, current);
  }

  /**
   * Format date for current locale
   */
  formatDate(date: Date | string, format: "short" | "medium" | "long" = "medium"): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const locale = this.currentLanguage === "fr" ? "fr-CA" : "en-CA";

    const formatOptions = {
      short: { month: "numeric", day: "numeric", year: "2-digit" },
      medium: { month: "short", day: "numeric", year: "numeric" },
      long: { month: "long", day: "numeric", year: "numeric", weekday: "long" },
    } as const;
    const options: Intl.DateTimeFormatOptions = formatOptions[format];

    return d.toLocaleDateString(locale, options);
  }

  /**
   * Format number for current locale
   */
  formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    const locale = this.currentLanguage === "fr" ? "fr-CA" : "en-CA";
    return num.toLocaleString(locale, options);
  }

  /**
   * Get direction for current language
   */
  getDirection(): "ltr" | "rtl" {
    return LANGUAGE_CONFIGS[this.currentLanguage]?.direction || "ltr";
  }

  /**
   * Check if current language is indigenous
   */
  isIndigenousLanguage(): boolean {
    return LANGUAGE_CONFIGS[this.currentLanguage]?.isIndigenous || false;
  }

  /**
   * Get fallback language
   */
  getFallbackLanguage(): SupportedLanguage {
    return LANGUAGE_CONFIGS[this.currentLanguage]?.fallbackLanguage || "en";
  }
}

export const i18nService = new I18nService();
