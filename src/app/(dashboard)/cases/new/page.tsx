"use client";

import { useState } from "react";
import { cn } from "@/lib";

type Step = "reporter" | "missing-person" | "circumstances" | "contacts" | "risks" | "review";

const steps: { id: Step; title: string; titleFr: string }[] = [
  { id: "reporter", title: "Your Information", titleFr: "Vos informations" },
  { id: "missing-person", title: "Missing Person", titleFr: "Personne disparue" },
  { id: "circumstances", title: "Circumstances", titleFr: "Circonstances" },
  { id: "contacts", title: "Known Contacts", titleFr: "Contacts connus" },
  { id: "risks", title: "Risk Factors", titleFr: "Facteurs de risque" },
  { id: "review", title: "Review & Submit", titleFr: "Révision et soumission" },
];

export default function NewCasePage() {
  const [currentStep, setCurrentStep] = useState<Step>("reporter");
  const [language, setLanguage] = useState<"en" | "fr">("en");

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "en" ? "Report a Missing Person" : "Signaler une personne disparue"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {language === "en"
              ? "Complete all sections to file a report"
              : "Remplissez toutes les sections pour déposer un signalement"}
          </p>
        </div>
        <button
          onClick={() => setLanguage(language === "en" ? "fr" : "en")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {language === "en" ? "Français" : "English"}
        </button>
      </div>

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={cn("relative", index !== steps.length - 1 && "flex-1")}
            >
              <div className="flex items-center">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",
                    index < currentStepIndex
                      ? "border-cyan-600 bg-cyan-600 text-white"
                      : index === currentStepIndex
                      ? "border-cyan-600 text-cyan-600"
                      : "border-gray-300 text-gray-500"
                  )}
                >
                  {index < currentStepIndex ? "✓" : index + 1}
                </span>
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "ml-2 h-0.5 flex-1",
                      index < currentStepIndex ? "bg-cyan-600" : "bg-gray-300"
                    )}
                  />
                )}
              </div>
              <span className="mt-2 block text-xs font-medium text-gray-500">
                {language === "en" ? step.title : step.titleFr}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Form Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {currentStep === "reporter" && <ReporterForm language={language} />}
        {currentStep === "missing-person" && <MissingPersonForm language={language} />}
        {currentStep === "circumstances" && <CircumstancesForm language={language} />}
        {currentStep === "contacts" && <ContactsForm language={language} />}
        {currentStep === "risks" && <RisksForm language={language} />}
        {currentStep === "review" && <ReviewForm language={language} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {language === "en" ? "← Previous" : "← Précédent"}
        </button>
        {currentStep === "review" ? (
          <button className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-700">
            {language === "en" ? "Submit Report" : "Soumettre le signalement"}
          </button>
        ) : (
          <button
            onClick={nextStep}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            {language === "en" ? "Next →" : "Suivant →"}
          </button>
        )}
      </div>

      {/* Consent Notice */}
      <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
        <p className="font-medium">
          {language === "en" ? "Privacy Notice" : "Avis de confidentialité"}
        </p>
        <p className="mt-1">
          {language === "en"
            ? "Information collected will be shared with law enforcement agencies as required. By submitting this form, you consent to the processing of this data in accordance with Quebec privacy laws."
            : "Les informations recueillies seront partagées avec les organismes d'application de la loi selon les besoins. En soumettant ce formulaire, vous consentez au traitement de ces données conformément aux lois québécoises sur la vie privée."}
        </p>
      </div>
    </div>
  );
}

function ReporterForm({ language }: { language: "en" | "fr" }) {
  const t = {
    en: {
      title: "Your Information",
      subtitle: "We need your details to verify and follow up on this report",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      relationship: "Relationship to Missing Person",
      address: "Your Address",
      selectRelationship: "Select relationship",
      relationships: {
        parent: "Parent",
        spouse: "Spouse/Partner",
        sibling: "Sibling",
        child: "Child",
        friend: "Friend",
        employer: "Employer",
        coworker: "Coworker",
        neighbor: "Neighbor",
        other: "Other",
      },
    },
    fr: {
      title: "Vos informations",
      subtitle: "Nous avons besoin de vos coordonnées pour vérifier et suivre ce signalement",
      firstName: "Prénom",
      lastName: "Nom de famille",
      email: "Adresse courriel",
      phone: "Numéro de téléphone",
      relationship: "Lien avec la personne disparue",
      address: "Votre adresse",
      selectRelationship: "Sélectionnez le lien",
      relationships: {
        parent: "Parent",
        spouse: "Conjoint(e)/Partenaire",
        sibling: "Frère/Sœur",
        child: "Enfant",
        friend: "Ami(e)",
        employer: "Employeur",
        coworker: "Collègue",
        neighbor: "Voisin(e)",
        other: "Autre",
      },
    },
  };

  const text = t[language];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{text.title}</h2>
        <p className="text-sm text-gray-500">{text.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.firstName}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.lastName}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.email}</label>
          <input
            type="email"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.phone}</label>
          <input
            type="tel"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.relationship}</label>
          <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500">
            <option value="">{text.selectRelationship}</option>
            {Object.entries(text.relationships).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.address}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}

function MissingPersonForm({ language }: { language: "en" | "fr" }) {
  const t = {
    en: {
      title: "Missing Person Details",
      subtitle: "Provide as much information as possible about the missing person",
      firstName: "First Name",
      lastName: "Last Name",
      dob: "Date of Birth",
      gender: "Gender",
      height: "Height",
      weight: "Weight",
      hairColor: "Hair Color",
      eyeColor: "Eye Color",
      distinguishing: "Distinguishing Features",
      distinguishingHelp: "Tattoos, scars, birthmarks, clothing last seen wearing",
      photo: "Upload Photo",
    },
    fr: {
      title: "Détails de la personne disparue",
      subtitle: "Fournissez autant d'informations que possible sur la personne disparue",
      firstName: "Prénom",
      lastName: "Nom de famille",
      dob: "Date de naissance",
      gender: "Genre",
      height: "Taille",
      weight: "Poids",
      hairColor: "Couleur des cheveux",
      eyeColor: "Couleur des yeux",
      distinguishing: "Signes distinctifs",
      distinguishingHelp: "Tatouages, cicatrices, taches de naissance, vêtements portés",
      photo: "Télécharger une photo",
    },
  };

  const text = t[language];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{text.title}</h2>
        <p className="text-sm text-gray-500">{text.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.firstName}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.lastName}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.dob}</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.gender}</label>
          <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500">
            <option value="male">{language === "en" ? "Male" : "Homme"}</option>
            <option value="female">{language === "en" ? "Female" : "Femme"}</option>
            <option value="other">{language === "en" ? "Other" : "Autre"}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.height}</label>
          <input
            type="text"
            placeholder={language === "en" ? "e.g., 5'10\" or 178cm" : "ex: 178cm"}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.weight}</label>
          <input
            type="text"
            placeholder={language === "en" ? "e.g., 160lbs or 72kg" : "ex: 72kg"}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.hairColor}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.eyeColor}</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.distinguishing}</label>
          <p className="text-xs text-gray-500">{text.distinguishingHelp}</p>
          <textarea
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.photo}</label>
          <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10">
            <div className="text-center">
              <span className="text-4xl">📷</span>
              <p className="mt-2 text-sm text-gray-600">
                {language === "en" ? "Click to upload or drag and drop" : "Cliquez pour télécharger ou glissez-déposez"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CircumstancesForm({ language }: { language: "en" | "fr" }) {
  const t = {
    en: {
      title: "Circumstances of Disappearance",
      subtitle: "Details about when and where the person was last seen",
      lastSeenDate: "Date Last Seen",
      lastSeenTime: "Time Last Seen",
      lastSeenLocation: "Last Known Location",
      locationDetails: "Location Details",
      locationDetailsHelp: "Address, neighborhood, landmarks",
      circumstances: "Circumstances",
      circumstancesHelp: "What was the person doing? Was this out of character?",
      outOfCharacter: "Is this disappearance out of character?",
    },
    fr: {
      title: "Circonstances de la disparition",
      subtitle: "Détails sur quand et où la personne a été vue pour la dernière fois",
      lastSeenDate: "Date de dernière observation",
      lastSeenTime: "Heure de dernière observation",
      lastSeenLocation: "Dernier emplacement connu",
      locationDetails: "Détails de l'emplacement",
      locationDetailsHelp: "Adresse, quartier, points de repère",
      circumstances: "Circonstances",
      circumstancesHelp: "Que faisait la personne? Était-ce inhabituel?",
      outOfCharacter: "Cette disparition est-elle inhabituelle?",
    },
  };

  const text = t[language];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{text.title}</h2>
        <p className="text-sm text-gray-500">{text.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.lastSeenDate}</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.lastSeenTime}</label>
          <input
            type="time"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.lastSeenLocation}</label>
          <input
            type="text"
            placeholder={language === "en" ? "City, Province" : "Ville, Province"}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.locationDetails}</label>
          <p className="text-xs text-gray-500">{text.locationDetailsHelp}</p>
          <textarea
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.circumstances}</label>
          <p className="text-xs text-gray-500">{text.circumstancesHelp}</p>
          <textarea
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-cyan-600" />
            <span className="text-sm text-gray-700">{text.outOfCharacter}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ContactsForm({ language }: { language: "en" | "fr" }) {
  const t = {
    en: {
      title: "Known Contacts & Social Media",
      subtitle: "Help us locate friends and monitor online activity",
      emails: "Known Email Addresses",
      emailsHelp: "Enter each email on a new line",
      phones: "Known Phone Numbers",
      phonesHelp: "Enter each number on a new line",
      social: "Social Media Accounts",
      friends: "Close Friends/Associates",
      friendsHelp: "People who might know their whereabouts",
      addFriend: "+ Add Contact",
    },
    fr: {
      title: "Contacts connus et réseaux sociaux",
      subtitle: "Aidez-nous à localiser les amis et surveiller l'activité en ligne",
      emails: "Adresses courriel connues",
      emailsHelp: "Entrez chaque courriel sur une nouvelle ligne",
      phones: "Numéros de téléphone connus",
      phonesHelp: "Entrez chaque numéro sur une nouvelle ligne",
      social: "Comptes de réseaux sociaux",
      friends: "Amis proches/Associés",
      friendsHelp: "Personnes qui pourraient connaître leur emplacement",
      addFriend: "+ Ajouter un contact",
    },
  };

  const text = t[language];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{text.title}</h2>
        <p className="text-sm text-gray-500">{text.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.emails}</label>
          <p className="text-xs text-gray-500">{text.emailsHelp}</p>
          <textarea
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.phones}</label>
          <p className="text-xs text-gray-500">{text.phonesHelp}</p>
          <textarea
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.social}</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {["Facebook", "Instagram", "Twitter/X", "TikTok", "LinkedIn"].map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-24">{platform}</span>
                <input
                  type="text"
                  placeholder="@username"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{text.friends}</label>
          <p className="text-xs text-gray-500">{text.friendsHelp}</p>
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={language === "en" ? "Name" : "Nom"}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder={language === "en" ? "Relationship" : "Lien"}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder={language === "en" ? "Contact" : "Contact"}
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button className="mt-2 text-sm text-cyan-600 hover:text-cyan-700">{text.addFriend}</button>
        </div>
      </div>
    </div>
  );
}

function RisksForm({ language }: { language: "en" | "fr" }) {
  const t = {
    en: {
      title: "Risk Assessment",
      subtitle: "This information helps prioritize the search",
      medical: "Medical Conditions",
      medicalHelp: "Any conditions that require ongoing treatment",
      medications: "Required Medications",
      medicationsHelp: "List medications they need to take regularly",
      mental: "Mental Health",
      mentalOptions: {
        none: "No known concerns",
        history: "History of mental health conditions",
        current: "Currently in treatment",
        crisis: "Recent mental health crisis",
      },
      threats: "Potential Threats",
      threatsHelp: "Are there people who might want to harm this person?",
      threatName: "Name",
      threatRelation: "Relationship",
      threatDescription: "Description of concern",
      addThreat: "+ Add Person of Concern",
      suicidal: "Is there any concern about self-harm or suicidal ideation?",
      suicidalWarning: "If immediate danger, call 911",
    },
    fr: {
      title: "Évaluation des risques",
      subtitle: "Ces informations aident à prioriser la recherche",
      medical: "Conditions médicales",
      medicalHelp: "Toute condition nécessitant un traitement continu",
      medications: "Médicaments requis",
      medicationsHelp: "Listez les médicaments qu'ils doivent prendre régulièrement",
      mental: "Santé mentale",
      mentalOptions: {
        none: "Aucune préoccupation connue",
        history: "Historique de conditions de santé mentale",
        current: "Actuellement en traitement",
        crisis: "Crise de santé mentale récente",
      },
      threats: "Menaces potentielles",
      threatsHelp: "Y a-t-il des personnes qui pourraient vouloir nuire à cette personne?",
      threatName: "Nom",
      threatRelation: "Lien",
      threatDescription: "Description de la préoccupation",
      addThreat: "+ Ajouter une personne préoccupante",
      suicidal: "Y a-t-il des préoccupations concernant l'automutilation ou les idées suicidaires?",
      suicidalWarning: "En cas de danger immédiat, appelez le 911",
    },
  };

  const text = t[language];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{text.title}</h2>
        <p className="text-sm text-gray-500">{text.subtitle}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{text.medical}</label>
          <p className="text-xs text-gray-500">{text.medicalHelp}</p>
          <textarea
            rows={2}
            placeholder={language === "en" ? "e.g., HIV, diabetes, heart condition" : "ex: VIH, diabète, condition cardiaque"}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{text.medications}</label>
          <p className="text-xs text-gray-500">{text.medicationsHelp}</p>
          <textarea
            rows={2}
            placeholder={language === "en" ? "e.g., Dovato (daily), insulin" : "ex: Dovato (quotidien), insuline"}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{text.mental}</label>
          <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500">
            {Object.entries(text.mentalOptions).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600" />
            <div>
              <span className="text-sm font-medium text-orange-800">{text.suicidal}</span>
              <p className="text-xs text-orange-600">{text.suicidalWarning}</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{text.threats}</label>
          <p className="text-xs text-gray-500">{text.threatsHelp}</p>
          <div className="mt-2 rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="text"
                placeholder={text.threatName}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder={text.threatRelation}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder={text.threatDescription}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button className="mt-3 text-sm text-cyan-600 hover:text-cyan-700">{text.addThreat}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ language }: { language: "en" | "fr" }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {language === "en" ? "Review Your Report" : "Révisez votre signalement"}
        </h2>
        <p className="text-sm text-gray-500">
          {language === "en"
            ? "Please review all information before submitting"
            : "Veuillez vérifier toutes les informations avant de soumettre"}
        </p>
      </div>

      <div className="space-y-4">
        <ReviewSection
          title={language === "en" ? "Reporter Information" : "Informations du déclarant"}
          items={[
            { label: language === "en" ? "Name" : "Nom", value: "[Your name]" },
            { label: language === "en" ? "Relationship" : "Lien", value: "[Relationship]" },
          ]}
        />
        <ReviewSection
          title={language === "en" ? "Missing Person" : "Personne disparue"}
          items={[
            { label: language === "en" ? "Name" : "Nom", value: "[Missing person name]" },
            { label: language === "en" ? "Age" : "Âge", value: "[Age]" },
            { label: language === "en" ? "Last Seen" : "Dernière observation", value: "[Location]" },
          ]}
        />
        <ReviewSection
          title={language === "en" ? "Risk Factors" : "Facteurs de risque"}
          items={[
            { label: language === "en" ? "Medical" : "Médical", value: "[Conditions]" },
            { label: language === "en" ? "Mental Health" : "Santé mentale", value: "[Status]" },
          ]}
        />
      </div>

      <div className="rounded-lg bg-cyan-50 p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600" />
          <span className="text-sm text-gray-700">
            {language === "en"
              ? "I confirm that all information provided is accurate to the best of my knowledge. I understand this report will be shared with law enforcement."
              : "Je confirme que toutes les informations fournies sont exactes au meilleur de ma connaissance. Je comprends que ce signalement sera partagé avec les forces de l'ordre."}
          </span>
        </label>
      </div>
    </div>
  );
}

function ReviewSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <dl className="mt-2 space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <dt className="text-gray-500">{item.label}</dt>
            <dd className="text-gray-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
