"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { IntakeLanguageSection, PhotoUpload } from "@/components/intake";
import { LanguageBadge } from "@/components/ui/LanguageSelect";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useTranslations } from "@/hooks/useTranslations";
import {
  validateReporterForm,
  validateMissingPersonForm,
  validateCircumstancesForm,
  hasValidationErrors,
  type ValidationResult,
} from "@/lib/utils/validation";
import { saveDraft, loadDraft, clearDraft, hasDraft } from "@/lib/utils/draft";

type Step =
  | "reporter"
  | "missing-person"
  | "circumstances"
  | "contacts"
  | "languages"
  | "risks"
  | "review";

const steps: Step[] = [
  "reporter",
  "missing-person",
  "circumstances",
  "contacts",
  "languages",
  "risks",
  "review",
];

export default function NewCasePage() {
  const t = useTranslations("intake");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("reporter");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, ValidationResult>>({});

  const [reporterFirstName, setReporterFirstName] = useState("");
  const [reporterLastName, setReporterLastName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterAddress, setReporterAddress] = useState("");
  const [reporterRelationship, setReporterRelationship] = useState("");
  const [missingFirstName, setMissingFirstName] = useState("");
  const [missingLastName, setMissingLastName] = useState("");
  const [missingDateOfBirth, setMissingDateOfBirth] = useState("");
  const [missingGender, setMissingGender] = useState("");
  const [missingHeight, setMissingHeight] = useState("");
  const [missingWeight, setMissingWeight] = useState("");
  const [missingHairColor, setMissingHairColor] = useState("");
  const [missingEyeColor, setMissingEyeColor] = useState("");
  const [missingDistinguishing, setMissingDistinguishing] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [lastSeenDate, setLastSeenDate] = useState("");
  const [lastSeenTime, setLastSeenTime] = useState("");
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [lastSeenLocationDetails, setLastSeenLocationDetails] = useState("");
  const [outOfCharacter, setOutOfCharacter] = useState(false);
  const [circumstances, setCircumstances] = useState("");
  const [contactEmails, setContactEmails] = useState("");
  const [contactPhones, setContactPhones] = useState("");
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});
  const [contactFriends, setContactFriends] = useState([
    { name: "", relationship: "", contact: "" },
  ]);
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [mentalHealthStatus, setMentalHealthStatus] = useState("");
  const [suicidalRisk, setSuicidalRisk] = useState(false);
  const [threats, setThreats] = useState([
    { name: "", relationship: "", description: "" },
  ]);
  const [reporterLanguages, setReporterLanguages] = useState<string[]>([]);
  const [reporterPreferredLanguage, setReporterPreferredLanguage] = useState("");
  const [reporterNeedsInterpreter, setReporterNeedsInterpreter] = useState(false);
  const [reporterOtherLanguage, setReporterOtherLanguage] = useState("");
  const [subjectPrimaryLanguages, setSubjectPrimaryLanguages] = useState<string[]>([]);
  const [subjectRespondsToLanguages, setSubjectRespondsToLanguages] = useState<string[]>([]);
  const [subjectCanCommunicateOfficial, setSubjectCanCommunicateOfficial] = useState(true);
  const [subjectOtherLanguage, setSubjectOtherLanguage] = useState("");

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && hasDraft()) {
      // Restore all form fields from draft
      setReporterFirstName(draft.reporterFirstName || "");
      setReporterLastName(draft.reporterLastName || "");
      setReporterEmail(draft.reporterEmail || "");
      setReporterPhone(draft.reporterPhone || "");
      setReporterAddress(draft.reporterAddress || "");
      setReporterRelationship(draft.reporterRelationship || "");
      setMissingFirstName(draft.missingFirstName || "");
      setMissingLastName(draft.missingLastName || "");
      setMissingDateOfBirth(draft.missingDateOfBirth || "");
      setMissingGender(draft.missingGender || "");
      setMissingHeight(draft.missingHeight || "");
      setMissingWeight(draft.missingWeight || "");
      setMissingHairColor(draft.missingHairColor || "");
      setMissingEyeColor(draft.missingEyeColor || "");
      setMissingDistinguishing(draft.missingDistinguishing || "");
      setPhotoUrl(draft.photoUrl || "");
      setLastSeenDate(draft.lastSeenDate || "");
      setLastSeenTime(draft.lastSeenTime || "");
      setLastSeenLocation(draft.lastSeenLocation || "");
      setLastSeenLocationDetails(draft.lastSeenLocationDetails || "");
      setOutOfCharacter(draft.outOfCharacter || false);
      setCircumstances(draft.circumstances || "");
      setContactEmails(draft.contactEmails || "");
      setContactPhones(draft.contactPhones || "");
      setSocialHandles(draft.socialHandles || {});
      setContactFriends(draft.contactFriends || [{ name: "", relationship: "", contact: "" }]);
      setMedicalConditions(draft.medicalConditions || "");
      setMedications(draft.medications || "");
      setMentalHealthStatus(draft.mentalHealthStatus || "");
      setSuicidalRisk(draft.suicidalRisk || false);
      setThreats(draft.threats || [{ name: "", relationship: "", description: "" }]);
      setReporterLanguages(draft.reporterLanguages || []);
      setReporterPreferredLanguage(draft.reporterPreferredLanguage || "");
      setReporterNeedsInterpreter(draft.reporterNeedsInterpreter || false);
      setReporterOtherLanguage(draft.reporterOtherLanguage || "");
      setSubjectPrimaryLanguages(draft.subjectPrimaryLanguages || []);
      setSubjectRespondsToLanguages(draft.subjectRespondsToLanguages || []);
      setSubjectCanCommunicateOfficial(draft.subjectCanCommunicateOfficial ?? true);
      setSubjectOtherLanguage(draft.subjectOtherLanguage || "");
    }
  }, []);

  const handleSaveDraft = useCallback(() => {
    saveDraft({
      reporterFirstName,
      reporterLastName,
      reporterEmail,
      reporterPhone,
      reporterAddress,
      reporterRelationship,
      missingFirstName,
      missingLastName,
      missingDateOfBirth,
      missingGender,
      missingHeight,
      missingWeight,
      missingHairColor,
      missingEyeColor,
      missingDistinguishing,
      photoUrl,
      lastSeenDate,
      lastSeenTime,
      lastSeenLocation,
      lastSeenLocationDetails,
      outOfCharacter,
      circumstances,
      contactEmails,
      contactPhones,
      socialHandles,
      contactFriends,
      medicalConditions,
      medications,
      mentalHealthStatus,
      suicidalRisk,
      threats,
      reporterLanguages,
      reporterPreferredLanguage,
      reporterNeedsInterpreter,
      reporterOtherLanguage,
      subjectPrimaryLanguages,
      subjectRespondsToLanguages,
      subjectCanCommunicateOfficial,
      subjectOtherLanguage,
    });
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [
    reporterFirstName,
    reporterLastName,
    reporterEmail,
    reporterPhone,
    reporterAddress,
    reporterRelationship,
    missingFirstName,
    missingLastName,
    missingDateOfBirth,
    missingGender,
    missingHeight,
    missingWeight,
    missingHairColor,
    missingEyeColor,
    missingDistinguishing,
    photoUrl,
    lastSeenDate,
    lastSeenTime,
    lastSeenLocation,
    lastSeenLocationDetails,
    outOfCharacter,
    circumstances,
    contactEmails,
    contactPhones,
    socialHandles,
    contactFriends,
    medicalConditions,
    medications,
    mentalHealthStatus,
    suicidalRisk,
    threats,
    reporterLanguages,
    reporterPreferredLanguage,
    reporterNeedsInterpreter,
    reporterOtherLanguage,
    subjectPrimaryLanguages,
    subjectRespondsToLanguages,
    subjectCanCommunicateOfficial,
    subjectOtherLanguage,
  ]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleSaveDraft();
    }, 30000);

    return () => clearInterval(interval);
  }, [handleSaveDraft]);

  useEffect(() => {
    if (reporterLanguages.length === 0) {
      setReporterPreferredLanguage("");
      return;
    }

    if (!reporterLanguages.includes(reporterPreferredLanguage)) {
      setReporterPreferredLanguage(reporterLanguages[0]);
    }
  }, [reporterLanguages, reporterPreferredLanguage]);

  const currentStepIndex = steps.findIndex((s) => s === currentStep);

  const validateCurrentStep = (): boolean => {
    setValidationErrors({});
    
    if (currentStep === "reporter") {
      const errors = validateReporterForm({
        firstName: reporterFirstName,
        lastName: reporterLastName,
        email: reporterEmail,
        phone: reporterPhone,
        relationship: reporterRelationship,
      });
      
      if (hasValidationErrors(errors)) {
        setValidationErrors(errors);
        return false;
      }
    }
    
    if (currentStep === "missing-person") {
      const errors = validateMissingPersonForm({
        firstName: missingFirstName,
        lastName: missingLastName,
        dateOfBirth: missingDateOfBirth,
      });
      
      if (hasValidationErrors(errors)) {
        setValidationErrors(errors);
        return false;
      }
    }
    
    if (currentStep === "circumstances") {
      const errors = validateCircumstancesForm({
        lastSeenDate,
        lastSeenLocation,
      });
      
      if (hasValidationErrors(errors)) {
        setValidationErrors(errors);
        return false;
      }
    }
    
    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const updateFriend = (
    index: number,
    field: "name" | "relationship" | "contact",
    value: string
  ) => {
    setContactFriends((prev) =>
      prev.map((friend, i) =>
        i === index ? { ...friend, [field]: value } : friend
      )
    );
  };

  const addFriend = () => {
    setContactFriends((prev) => [
      ...prev,
      { name: "", relationship: "", contact: "" },
    ]);
  };

  const updateThreat = (
    index: number,
    field: "name" | "relationship" | "description",
    value: string
  ) => {
    setThreats((prev) =>
      prev.map((threat, i) =>
        i === index ? { ...threat, [field]: value } : threat
      )
    );
  };

  const addThreat = () => {
    setThreats((prev) => [
      ...prev,
      { name: "", relationship: "", description: "" },
    ]);
  };

  const parseList = (value: string) =>
    value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const parseHeightCm = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    const footInchMatch = trimmed.match(
      /(\d+)\s*(?:ft|')\s*(\d+)?\s*(?:in|\"|inches)?/
    );
    if (footInchMatch) {
      const feet = Number.parseInt(footInchMatch[1], 10);
      const inches = footInchMatch[2]
        ? Number.parseInt(footInchMatch[2], 10)
        : 0;
      if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
        return Math.round((feet * 12 + inches) * 2.54);
      }
    }

    const cmMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*cm/);
    if (cmMatch) {
      return Math.round(Number.parseFloat(cmMatch[1]));
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return Math.round(numeric);
    }

    return null;
  };

  const parseWeightKg = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    const kgMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*kg/);
    if (kgMatch) {
      return Math.round(Number.parseFloat(kgMatch[1]));
    }

    const lbMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*lb/);
    if (lbMatch) {
      return Math.round(Number.parseFloat(lbMatch[1]) * 0.453592);
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return Math.round(numeric);
    }

    return null;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!missingFirstName || !missingLastName || !lastSeenDate) {
      setSubmitError("Missing required fields.");
      return;
    }

    setSubmitting(true);

    const timeValue = lastSeenTime || "00:00";
    const lastSeenDateTime = new Date(`${lastSeenDate}T${timeValue}:00`);
    if (Number.isNaN(lastSeenDateTime.getTime())) {
      setSubmitError("Invalid last seen date or time.");
      setSubmitting(false);
      return;
    }

    try {
      const heightCm = parseHeightCm(missingHeight);
      const weightKg = parseWeightKg(missingWeight);
      const parsedMedicalConditions = parseList(medicalConditions);
      const parsedMedications = parseList(medications);
      const parsedContactEmails = parseList(contactEmails);
      const parsedContactPhones = parseList(contactPhones);
      const parsedFriends = contactFriends.filter(
        (friend) => friend.name || friend.relationship || friend.contact
      );
      const parsedThreats = threats.filter(
        (threat) => threat.name || threat.relationship || threat.description
      );
      const mentalHealthConditions =
        mentalHealthStatus && mentalHealthStatus !== "none"
          ? [mentalHealthStatus]
          : [];
      const socialMediaAccounts = Object.entries(socialHandles)
        .map(([platform, handle]) => ({ platform, handle: handle.trim() }))
        .filter((account) => account.handle);

      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterFirstName,
          reporterLastName,
          reporterEmail,
          reporterPhone,
          reporterAddress,
          reporterRelationship,
          firstName: missingFirstName,
          lastName: missingLastName,
          dateOfBirth: missingDateOfBirth || null,
          gender: missingGender || null,
          heightCm,
          weightKg,
          hairColor: missingHairColor,
          eyeColor: missingEyeColor,
          distinguishingFeatures: missingDistinguishing,
          photoUrl: photoUrl || null,
          lastSeenDate: lastSeenDateTime.toISOString(),
          lastSeenLocation,
          locationDetails: lastSeenLocationDetails,
          outOfCharacter,
          circumstances,
          medicalConditions: parsedMedicalConditions,
          medications: parsedMedications,
          mentalHealthConditions,
          isSuicidalRisk: suicidalRisk,
          contactEmails: parsedContactEmails,
          contactPhones: parsedContactPhones,
          contactFriends: parsedFriends,
          socialMediaAccounts,
          threats: parsedThreats,
          reporterLanguages,
          reporterPreferredLanguage,
          reporterNeedsInterpreter,
          reporterOtherLanguage,
          subjectPrimaryLanguages,
          subjectRespondsToLanguages,
          subjectCanCommunicateOfficial,
          subjectOtherLanguage,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setSubmitError(payload?.error || "Failed to submit report.");
        return;
      }
      
      // Clear draft on successful submission
      clearDraft();
      
      const caseNumber = payload?.data?.case_number as string | undefined;
      const successUrl = caseNumber
        ? `/cases/success?case=${encodeURIComponent(caseNumber)}`
        : "/cases/success";
      router.push(successUrl);
    } catch {
      setSubmitError("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("header.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("header.subtitle")}
          </p>
          {draftSaved && (
            <p className="mt-1 text-xs text-green-600">
              ✓ {t("navigation.draftSaved")}
            </p>
          )}
        </div>
        <LocaleSwitcher label={tCommon("language.label")} />
      </div>

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step}
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
                {t(`steps.${step}.title`)}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Form Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {currentStep === "reporter" && (
          <ReporterForm
            reporterFirstName={reporterFirstName}
            reporterLastName={reporterLastName}
            reporterEmail={reporterEmail}
            reporterPhone={reporterPhone}
            reporterAddress={reporterAddress}
            reporterRelationship={reporterRelationship}
            onReporterFirstNameChange={setReporterFirstName}
            onReporterLastNameChange={setReporterLastName}
            onReporterEmailChange={setReporterEmail}
            onReporterPhoneChange={setReporterPhone}
            onReporterAddressChange={setReporterAddress}
            onReporterRelationshipChange={setReporterRelationship}
            validationErrors={validationErrors}
          />
        )}
        {currentStep === "missing-person" && (
          <MissingPersonForm
            firstName={missingFirstName}
            lastName={missingLastName}
            dateOfBirth={missingDateOfBirth}
            gender={missingGender}
            height={missingHeight}
            weight={missingWeight}
            hairColor={missingHairColor}
            eyeColor={missingEyeColor}
            distinguishing={missingDistinguishing}
            photoUrl={photoUrl}
            onFirstNameChange={setMissingFirstName}
            onLastNameChange={setMissingLastName}
            onDateOfBirthChange={setMissingDateOfBirth}
            onGenderChange={setMissingGender}
            onHeightChange={setMissingHeight}
            onWeightChange={setMissingWeight}
            onHairColorChange={setMissingHairColor}
            onEyeColorChange={setMissingEyeColor}
            onDistinguishingChange={setMissingDistinguishing}
            onPhotoUrlChange={setPhotoUrl}
            validationErrors={validationErrors}
          />
        )}
        {currentStep === "circumstances" && (
          <CircumstancesForm
            lastSeenDate={lastSeenDate}
            lastSeenTime={lastSeenTime}
            lastSeenLocation={lastSeenLocation}
            lastSeenLocationDetails={lastSeenLocationDetails}
            outOfCharacter={outOfCharacter}
            circumstances={circumstances}
            onLastSeenDateChange={setLastSeenDate}
            onLastSeenTimeChange={setLastSeenTime}
            onLastSeenLocationChange={setLastSeenLocation}
            onLastSeenLocationDetailsChange={setLastSeenLocationDetails}
            onOutOfCharacterChange={setOutOfCharacter}
            onCircumstancesChange={setCircumstances}
            validationErrors={validationErrors}
          />
        )}
        {currentStep === "contacts" && (
          <ContactsForm
            contactEmails={contactEmails}
            contactPhones={contactPhones}
            socialHandles={socialHandles}
            contactFriends={contactFriends}
            onContactEmailsChange={setContactEmails}
            onContactPhonesChange={setContactPhones}
            onSocialHandleChange={(platform, value) =>
              setSocialHandles((prev) => ({ ...prev, [platform]: value }))
            }
            onFriendChange={updateFriend}
            onAddFriend={addFriend}
          />
        )}
        {currentStep === "languages" && (
          <IntakeLanguageSection
            reporterLanguages={reporterLanguages}
            onReporterLanguagesChange={setReporterLanguages}
            reporterPreferredLanguage={reporterPreferredLanguage}
            onReporterPreferredLanguageChange={setReporterPreferredLanguage}
            reporterNeedsInterpreter={reporterNeedsInterpreter}
            onReporterNeedsInterpreterChange={setReporterNeedsInterpreter}
            reporterOtherLanguage={reporterOtherLanguage}
            onReporterOtherLanguageChange={setReporterOtherLanguage}
            subjectPrimaryLanguages={subjectPrimaryLanguages}
            onSubjectPrimaryLanguagesChange={setSubjectPrimaryLanguages}
            subjectRespondsToLanguages={subjectRespondsToLanguages}
            onSubjectRespondsToLanguagesChange={setSubjectRespondsToLanguages}
            subjectCanCommunicateOfficial={subjectCanCommunicateOfficial}
            onSubjectCanCommunicateOfficialChange={setSubjectCanCommunicateOfficial}
            subjectOtherLanguage={subjectOtherLanguage}
            onSubjectOtherLanguageChange={setSubjectOtherLanguage}
          />
        )}
        {currentStep === "risks" && (
          <RisksForm
            medicalConditions={medicalConditions}
            medications={medications}
            mentalHealthStatus={mentalHealthStatus}
            suicidalRisk={suicidalRisk}
            threats={threats}
            onMedicalConditionsChange={setMedicalConditions}
            onMedicationsChange={setMedications}
            onMentalHealthStatusChange={setMentalHealthStatus}
            onSuicidalRiskChange={setSuicidalRisk}
            onThreatChange={updateThreat}
            onAddThreat={addThreat}
          />
        )}
        {currentStep === "review" && (
          <ReviewForm
            reporterLanguages={reporterLanguages}
            subjectPrimaryLanguages={subjectPrimaryLanguages}
            reporterOtherLanguage={reporterOtherLanguage}
            subjectOtherLanguage={subjectOtherLanguage}
          />
        )}
      </div>

      {/* Navigation */}
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t("navigation.previous")}
        </button>
        {currentStep === "review" ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {submitting ? t("navigation.submitting") : t("navigation.submit")}
          </button>
        ) : (
          <button
            onClick={nextStep}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            {t("navigation.next")}
          </button>
        )}
      </div>

      {/* Consent Notice */}
      <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
        <p className="font-medium">{t("privacy.title")}</p>
        <p className="mt-1">{t("privacy.body")}</p>
      </div>
    </div>
  );
}

function ReporterForm({
  reporterFirstName,
  reporterLastName,
  reporterEmail,
  reporterPhone,
  reporterAddress,
  reporterRelationship,
  onReporterFirstNameChange,
  onReporterLastNameChange,
  onReporterEmailChange,
  onReporterPhoneChange,
  onReporterAddressChange,
  onReporterRelationshipChange,
  validationErrors = {},
}: {
  reporterFirstName: string;
  reporterLastName: string;
  reporterEmail: string;
  reporterPhone: string;
  reporterAddress: string;
  reporterRelationship: string;
  onReporterFirstNameChange: (value: string) => void;
  onReporterLastNameChange: (value: string) => void;
  onReporterEmailChange: (value: string) => void;
  onReporterPhoneChange: (value: string) => void;
  onReporterAddressChange: (value: string) => void;
  onReporterRelationshipChange: (value: string) => void;
  validationErrors?: Record<string, ValidationResult>;
}) {
  const t = useTranslations("intake");
  const relationships = [
    "parent",
    "spouse",
    "sibling",
    "child",
    "friend",
    "employer",
    "coworker",
    "neighbor",
    "other",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("reporter.title")}</h2>
        <p className="text-sm text-gray-500">{t("reporter.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("reporter.firstName")}</label>
          <input
            type="text"
            value={reporterFirstName}
            onChange={(e) => onReporterFirstNameChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.firstName && !validationErrors.firstName.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.firstName && !validationErrors.firstName.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.firstName.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("reporter.lastName")}</label>
          <input
            type="text"
            value={reporterLastName}
            onChange={(e) => onReporterLastNameChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.lastName && !validationErrors.lastName.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.lastName && !validationErrors.lastName.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.lastName.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("reporter.email")}</label>
          <input
            type="email"
            value={reporterEmail}
            onChange={(e) => onReporterEmailChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.email && !validationErrors.email.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.email && !validationErrors.email.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.email.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("reporter.phone")}</label>
          <input
            type="tel"
            value={reporterPhone}
            onChange={(e) => onReporterPhoneChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.phone && !validationErrors.phone.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.phone && !validationErrors.phone.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.phone.error}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("reporter.relationship")}</label>
          <select
            value={reporterRelationship}
            onChange={(e) => onReporterRelationshipChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.relationship && !validationErrors.relationship.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          >
            <option value="">{t("reporter.selectRelationship")}</option>
            {relationships.map((key) => (
              <option key={key} value={key}>
                {t(`reporter.relationships.${key}`)}
              </option>
            ))}
          </select>
          {validationErrors.relationship && !validationErrors.relationship.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.relationship.error}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("reporter.address")}</label>
          <input
            type="text"
            value={reporterAddress}
            onChange={(e) => onReporterAddressChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}

function MissingPersonForm({
  firstName,
  lastName,
  dateOfBirth,
  gender,
  height,
  weight,
  hairColor,
  eyeColor,
  distinguishing,
  photoUrl,
  onFirstNameChange,
  onLastNameChange,
  onDateOfBirthChange,
  onGenderChange,
  onHeightChange,
  onWeightChange,
  onHairColorChange,
  onEyeColorChange,
  onDistinguishingChange,
  onPhotoUrlChange,
  validationErrors = {},
}: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  height: string;
  weight: string;
  hairColor: string;
  eyeColor: string;
  distinguishing: string;
  photoUrl: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onDateOfBirthChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onHairColorChange: (value: string) => void;
  onEyeColorChange: (value: string) => void;
  onDistinguishingChange: (value: string) => void;
  onPhotoUrlChange: (value: string) => void;
  validationErrors?: Record<string, ValidationResult>;
}) {
  const t = useTranslations("intake");
  const genderOptions = ["male", "female", "other"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("missingPerson.title")}</h2>
        <p className="text-sm text-gray-500">{t("missingPerson.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.firstName")}</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.firstName && !validationErrors.firstName.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.firstName && !validationErrors.firstName.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.firstName.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.lastName")}</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.lastName && !validationErrors.lastName.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.lastName && !validationErrors.lastName.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.lastName.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.dob")}</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => onDateOfBirthChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.dateOfBirth && !validationErrors.dateOfBirth.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.dateOfBirth && !validationErrors.dateOfBirth.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.dateOfBirth.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.gender")}</label>
          <select
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">{t("missingPerson.selectGender")}</option>
            {genderOptions.map((key) => (
              <option key={key} value={key}>
                {t(`missingPerson.genderOptions.${key}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.height")}</label>
          <input
            type="text"
            placeholder={t("missingPerson.heightPlaceholder")}
            value={height}
            onChange={(e) => onHeightChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.weight")}</label>
          <input
            type="text"
            placeholder={t("missingPerson.weightPlaceholder")}
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.hairColor")}</label>
          <input
            type="text"
            value={hairColor}
            onChange={(e) => onHairColorChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.eyeColor")}</label>
          <input
            type="text"
            value={eyeColor}
            onChange={(e) => onEyeColorChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("missingPerson.distinguishing")}</label>
          <p className="text-xs text-gray-500">{t("missingPerson.distinguishingHelp")}</p>
          <textarea
            rows={3}
            value={distinguishing}
            onChange={(e) => onDistinguishingChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <PhotoUpload
          onUploadComplete={onPhotoUrlChange}
          currentPhotoUrl={photoUrl}
          label={t("missingPerson.photo")}
          helper={t("missingPerson.photoHelper")}
          uploading={t("missingPerson.photoUploading")}
          uploaded={t("missingPerson.photoUploaded")}
          remove={t("missingPerson.photoRemove")}
          maxSize={t("missingPerson.photoMaxSize")}
          formats={t("missingPerson.photoFormats")}
        />
      </div>
    </div>
  );
}

function CircumstancesForm({
  lastSeenDate,
  lastSeenTime,
  lastSeenLocation,
  lastSeenLocationDetails,
  outOfCharacter,
  circumstances,
  onLastSeenDateChange,
  onLastSeenTimeChange,
  onLastSeenLocationChange,
  onLastSeenLocationDetailsChange,
  onOutOfCharacterChange,
  onCircumstancesChange,
  validationErrors = {},
}: {
  lastSeenDate: string;
  lastSeenTime: string;
  lastSeenLocation: string;
  lastSeenLocationDetails: string;
  outOfCharacter: boolean;
  circumstances: string;
  onLastSeenDateChange: (value: string) => void;
  onLastSeenTimeChange: (value: string) => void;
  onLastSeenLocationChange: (value: string) => void;
  onLastSeenLocationDetailsChange: (value: string) => void;
  onOutOfCharacterChange: (value: boolean) => void;
  onCircumstancesChange: (value: string) => void;
  validationErrors?: Record<string, ValidationResult>;
}) {
  const t = useTranslations("intake");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("circumstances.title")}</h2>
        <p className="text-sm text-gray-500">{t("circumstances.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("circumstances.lastSeenDate")}</label>
          <input
            type="date"
            value={lastSeenDate}
            onChange={(e) => onLastSeenDateChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.lastSeenDate && !validationErrors.lastSeenDate.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.lastSeenDate && !validationErrors.lastSeenDate.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.lastSeenDate.error}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("circumstances.lastSeenTime")}</label>
          <input
            type="time"
            value={lastSeenTime}
            onChange={(e) => onLastSeenTimeChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("circumstances.lastSeenLocation")}</label>
          <input
            type="text"
            placeholder={t("circumstances.locationPlaceholder")}
            value={lastSeenLocation}
            onChange={(e) => onLastSeenLocationChange(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
              validationErrors.lastSeenLocation && !validationErrors.lastSeenLocation.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
            )}
          />
          {validationErrors.lastSeenLocation && !validationErrors.lastSeenLocation.isValid && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.lastSeenLocation.error}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("circumstances.locationDetails")}</label>
          <p className="text-xs text-gray-500">{t("circumstances.locationDetailsHelp")}</p>
          <textarea
            rows={2}
            value={lastSeenLocationDetails}
            onChange={(e) => onLastSeenLocationDetailsChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("circumstances.circumstances")}</label>
          <p className="text-xs text-gray-500">{t("circumstances.circumstancesHelp")}</p>
          <textarea
            rows={4}
            value={circumstances}
            onChange={(e) => onCircumstancesChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={outOfCharacter}
              onChange={(e) => onOutOfCharacterChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-cyan-600"
            />
            <span className="text-sm text-gray-700">{t("circumstances.outOfCharacter")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ContactsForm({
  contactEmails,
  contactPhones,
  socialHandles,
  contactFriends,
  onContactEmailsChange,
  onContactPhonesChange,
  onSocialHandleChange,
  onFriendChange,
  onAddFriend,
}: {
  contactEmails: string;
  contactPhones: string;
  socialHandles: Record<string, string>;
  contactFriends: { name: string; relationship: string; contact: string }[];
  onContactEmailsChange: (value: string) => void;
  onContactPhonesChange: (value: string) => void;
  onSocialHandleChange: (platform: string, value: string) => void;
  onFriendChange: (
    index: number,
    field: "name" | "relationship" | "contact",
    value: string
  ) => void;
  onAddFriend: () => void;
}) {
  const t = useTranslations("intake");
  const platforms = ["Facebook", "Instagram", "Twitter/X", "TikTok", "LinkedIn"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("contacts.title")}</h2>
        <p className="text-sm text-gray-500">{t("contacts.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("contacts.emails")}</label>
          <p className="text-xs text-gray-500">{t("contacts.emailsHelp")}</p>
          <textarea
            rows={3}
            value={contactEmails}
            onChange={(e) => onContactEmailsChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("contacts.phones")}</label>
          <p className="text-xs text-gray-500">{t("contacts.phonesHelp")}</p>
          <textarea
            rows={3}
            value={contactPhones}
            onChange={(e) => onContactPhonesChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("contacts.social")}</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {platforms.map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-24">{platform}</span>
                <input
                  type="text"
                  placeholder="@username"
                  value={socialHandles[platform] ?? ""}
                  onChange={(e) => onSocialHandleChange(platform, e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{t("contacts.friends")}</label>
          <p className="text-xs text-gray-500">{t("contacts.friendsHelp")}</p>
          <div className="mt-2 space-y-2">
            {contactFriends.map((friend, index) => (
              <div key={`friend-${index}`} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("contacts.namePlaceholder")}
                  value={friend.name}
                  onChange={(e) => onFriendChange(index, "name", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder={t("contacts.relationshipPlaceholder")}
                  value={friend.relationship}
                  onChange={(e) =>
                    onFriendChange(index, "relationship", e.target.value)
                  }
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder={t("contacts.contactPlaceholder")}
                  value={friend.contact}
                  onChange={(e) =>
                    onFriendChange(index, "contact", e.target.value)
                  }
                  className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onAddFriend}
            className="mt-2 text-sm text-cyan-600 hover:text-cyan-700"
          >
            {t("contacts.addFriend")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RisksForm({
  medicalConditions,
  medications,
  mentalHealthStatus,
  suicidalRisk,
  threats,
  onMedicalConditionsChange,
  onMedicationsChange,
  onMentalHealthStatusChange,
  onSuicidalRiskChange,
  onThreatChange,
  onAddThreat,
}: {
  medicalConditions: string;
  medications: string;
  mentalHealthStatus: string;
  suicidalRisk: boolean;
  threats: { name: string; relationship: string; description: string }[];
  onMedicalConditionsChange: (value: string) => void;
  onMedicationsChange: (value: string) => void;
  onMentalHealthStatusChange: (value: string) => void;
  onSuicidalRiskChange: (value: boolean) => void;
  onThreatChange: (
    index: number,
    field: "name" | "relationship" | "description",
    value: string
  ) => void;
  onAddThreat: () => void;
}) {
  const t = useTranslations("intake");
  const mentalOptions = ["none", "history", "current", "crisis"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("risks.title")}</h2>
        <p className="text-sm text-gray-500">{t("risks.subtitle")}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("risks.medical")}</label>
          <p className="text-xs text-gray-500">{t("risks.medicalHelp")}</p>
          <textarea
            rows={2}
            placeholder={t("risks.medicalPlaceholder")}
            value={medicalConditions}
            onChange={(e) => onMedicalConditionsChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("risks.medications")}</label>
          <p className="text-xs text-gray-500">{t("risks.medicationsHelp")}</p>
          <textarea
            rows={2}
            placeholder={t("risks.medicationsPlaceholder")}
            value={medications}
            onChange={(e) => onMedicationsChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("risks.mental")}</label>
          <select
            value={mentalHealthStatus}
            onChange={(e) => onMentalHealthStatusChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {mentalOptions.map((key) => (
              <option key={key} value={key}>
                {t(`risks.mentalOptions.${key}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={suicidalRisk}
              onChange={(e) => onSuicidalRiskChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600"
            />
            <div>
              <span className="text-sm font-medium text-orange-800">{t("risks.suicidal")}</span>
              <p className="text-xs text-orange-600">{t("risks.suicidalWarning")}</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("risks.threats")}</label>
          <p className="text-xs text-gray-500">{t("risks.threatsHelp")}</p>
          <div className="mt-2 rounded-lg border border-gray-200 p-4">
            {threats.map((threat, index) => (
              <div key={`threat-${index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder={t("risks.threatName")}
                  value={threat.name}
                  onChange={(e) => onThreatChange(index, "name", e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder={t("risks.threatRelation")}
                  value={threat.relationship}
                  onChange={(e) =>
                    onThreatChange(index, "relationship", e.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder={t("risks.threatDescription")}
                  value={threat.description}
                  onChange={(e) =>
                    onThreatChange(index, "description", e.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddThreat}
              className="mt-3 text-sm text-cyan-600 hover:text-cyan-700"
            >
              {t("risks.addThreat")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({
  reporterLanguages,
  subjectPrimaryLanguages,
  reporterOtherLanguage,
  subjectOtherLanguage,
}: {
  reporterLanguages: string[];
  subjectPrimaryLanguages: string[];
  reporterOtherLanguage: string;
  subjectOtherLanguage: string;
}) {
  const t = useTranslations("intake");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("review.title")}</h2>
        <p className="text-sm text-gray-500">{t("review.subtitle")}</p>
      </div>

      <div className="space-y-4">
        <ReviewSection
          title={t("review.reporterTitle")}
          items={[
            { label: t("review.reporterNameLabel"), value: "[Your name]" },
            { label: t("review.reporterRelationshipLabel"), value: "[Relationship]" },
          ]}
        />
        <ReviewSection
          title={t("review.missingPersonTitle")}
          items={[
            { label: t("review.missingPersonNameLabel"), value: "[Missing person name]" },
            { label: t("review.missingPersonAgeLabel"), value: "[Age]" },
            { label: t("review.missingPersonLastSeenLabel"), value: "[Location]" },
          ]}
        />
        <ReviewSection
          title={t("review.riskTitle")}
          items={[
            { label: t("review.riskMedicalLabel"), value: "[Conditions]" },
            { label: t("review.riskMentalLabel"), value: "[Status]" },
          ]}
        />
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900">{t("review.languageTitle")}</h3>
          <dl className="mt-2 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">{t("review.languageReporterLabel")}</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {reporterLanguages.length > 0 ? (
                  reporterLanguages.map((code) => (
                    <LanguageBadge key={code} code={code} size="sm" />
                  ))
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </dd>
              {reporterOtherLanguage && (
                <p className="mt-1 text-xs text-gray-500">
                  {reporterOtherLanguage}
                </p>
              )}
            </div>
            <div>
              <dt className="text-gray-500">{t("review.languageSubjectLabel")}</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {subjectPrimaryLanguages.length > 0 ? (
                  subjectPrimaryLanguages.map((code) => (
                    <LanguageBadge key={code} code={code} size="sm" />
                  ))
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </dd>
              {subjectOtherLanguage && (
                <p className="mt-1 text-xs text-gray-500">
                  {subjectOtherLanguage}
                </p>
              )}
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg bg-cyan-50 p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600" />
          <span className="text-sm text-gray-700">{t("review.confirmText")}</span>
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
