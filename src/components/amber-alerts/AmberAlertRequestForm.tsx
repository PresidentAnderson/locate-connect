// AMBER Alert Request Form - Backend Integration
// LC-FEAT-026: AMBER Alert Integration
// Connects existing AmberAlertForm UI to new backend API

"use client";

import { useState, useCallback } from "react";
import { AmberAlertForm } from "@/components/alerts/AmberAlertForm";
import type { AmberAlertRequest as UIAlertRequest } from "@/components/alerts/AmberAlertForm";
import type { CreateAmberAlertRequest, DistributionChannel } from "@/types/amber-alert.types";

interface AmberAlertRequestFormProps {
  caseData: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    nickname?: string;
    age_at_disappearance: number;
    date_of_birth: string;
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
    hair_color?: string;
    eye_color?: string;
    distinguishing_features?: string;
    clothing_description?: string;
    primary_photo_url?: string;
    last_seen_date: string;
    last_seen_location?: string;
    last_seen_city?: string;
    last_seen_province?: string;
    circumstances?: string;
  };
  onSuccess?: (alertId: string) => void;
  onCancel?: () => void;
}

/**
 * AMBER Alert Request Form with backend integration
 */
export function AmberAlertRequestForm({
  caseData,
  onSuccess,
  onCancel,
}: AmberAlertRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (formData: UIAlertRequest) => {
      setIsSubmitting(true);

      try {
        // Map distribution channels from form checkboxes to our enum
        const channels: DistributionChannel[] = [];
        if (formData.includeWirelessAlert) channels.push("wea");
        if (formData.includeBroadcastAlert) channels.push("eas", "broadcast_media");
        if (formData.includeHighwaySignage) channels.push("highway_signage");
        if (formData.includeSocialMedia) channels.push("social_media");
        
        // Always include AMBER Alert systems
        channels.push("amber_canada");
        if (formData.targetProvinces.includes("QC")) {
          channels.push("amber_quebec");
        }

        // Create request payload
        const request: CreateAmberAlertRequest = {
          case_id: formData.caseId,
          requesting_agency: formData.lawEnforcementAgency,

          // Child information
          child_first_name: formData.childFirstName,
          child_last_name: formData.childLastName,
          child_age: formData.childAge,
          child_date_of_birth: caseData.date_of_birth,
          child_sex: formData.childGender,
          child_height_cm: formData.childHeight
            ? parseInt(formData.childHeight.replace(/[^\d]/g, ""))
            : undefined,
          child_weight_kg: formData.childWeight
            ? parseInt(formData.childWeight.replace(/[^\d]/g, ""))
            : undefined,
          child_eye_color: formData.childEyeColor,
          child_hair_color: formData.childHairColor,
          child_description:
            formData.childDistinguishingFeatures ||
            `${formData.childGender} child, age ${formData.childAge}`,
          child_photo_url: formData.childPhotoUrl,

          // Abduction details
          abduction_date: `${formData.abductionDate}${formData.abductionTime ? `T${formData.abductionTime}:00` : "T00:00:00"}`,
          abduction_location: formData.abductionLocation,
          abduction_circumstances: formData.circumstances,

          // Suspect information (if provided)
          suspect_name:
            formData.suspectKnown && formData.suspectFirstName
              ? `${formData.suspectFirstName} ${formData.suspectLastName || ""}`
              : undefined,
          suspect_age: formData.suspectAge,
          suspect_description: formData.suspectDescription,
          suspect_photo_url: formData.suspectPhotoUrl,

          // Vehicle information (if provided)
          vehicle_make: formData.vehicleInvolved ? formData.vehicleMake : undefined,
          vehicle_model: formData.vehicleInvolved ? formData.vehicleModel : undefined,
          vehicle_year: formData.vehicleYear
            ? parseInt(formData.vehicleYear)
            : undefined,
          vehicle_color: formData.vehicleColor,
          vehicle_license_plate: formData.vehicleLicensePlate,
          vehicle_license_province: formData.vehicleLicenseProvince,
          vehicle_description: formData.vehicleDescription,

          // Distribution settings
          geographic_scope: formData.targetProvinces as any[],
          target_radius_km: formData.targetRadius || 100,
          distribution_channels: channels,

          // Law enforcement contact
          le_contact_name: formData.lawEnforcementContact,
          le_contact_phone: formData.lawEnforcementPhone,
          le_contact_email: formData.lawEnforcementContact
            ? `${formData.lawEnforcementContact.toLowerCase().replace(/\s+/g, ".")}@${formData.lawEnforcementAgency.toLowerCase().replace(/\s+/g, "-")}.ca`
            : "", // Generate placeholder email if not provided
          le_agency_case_number: formData.caseFileNumber,
        };

        // Submit to backend API
        const response = await fetch("/api/amber-alerts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to submit AMBER alert request");
        }

        const result = await response.json();
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result.id);
        }
      } catch (error) {
        console.error("Error submitting AMBER alert:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [caseData, onSuccess]
  );

  return (
    <AmberAlertForm
      caseData={{
        id: caseData.id,
        caseNumber: caseData.case_number,
        firstName: caseData.first_name,
        lastName: caseData.last_name,
        age: caseData.age_at_disappearance,
        gender: caseData.gender || "Unknown",
        heightCm: caseData.height_cm,
        weightKg: caseData.weight_kg,
        hairColor: caseData.hair_color,
        eyeColor: caseData.eye_color,
        distinguishingFeatures: caseData.distinguishing_features,
        clothingLastSeen: caseData.clothing_description,
        primaryPhotoUrl: caseData.primary_photo_url,
        lastSeenDate: caseData.last_seen_date,
        lastSeenLocation: caseData.last_seen_location,
        lastSeenCity: caseData.last_seen_city,
        lastSeenProvince: caseData.last_seen_province,
        circumstances: caseData.circumstances,
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel || (() => {})}
    />
  );
}
