/**
 * Volunteer Network API Route
 * Volunteer coordination endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { volunteerNetworkService } from "@/lib/services/volunteer-network-service";
import type { VolunteerOpportunity } from "@/types/compliance.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "volunteer":
        const volunteerId = searchParams.get("volunteerId");
        if (!volunteerId) {
          return NextResponse.json({ error: "Volunteer ID required" }, { status: 400 });
        }
        const volunteer = volunteerNetworkService.getVolunteer(volunteerId);
        if (!volunteer) {
          return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
        }
        return NextResponse.json(volunteer);

      case "search":
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const radius = searchParams.get("radius");
        const skills = searchParams.get("skills")?.split(",");
        const verifiedOnly = searchParams.get("verifiedOnly") === "true";
        const availableNow = searchParams.get("availableNow") === "true";

        const volunteers = volunteerNetworkService.searchVolunteers({
          location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
          radius: radius ? parseFloat(radius) : undefined,
          skills,
          verifiedOnly,
          availableNow,
        });
        return NextResponse.json(volunteers);

      case "opportunity":
        const oppId = searchParams.get("opportunityId");
        if (!oppId) {
          return NextResponse.json({ error: "Opportunity ID required" }, { status: 400 });
        }
        const opportunity = volunteerNetworkService.getOpportunity(oppId);
        if (!opportunity) {
          return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
        }
        return NextResponse.json(opportunity);

      case "opportunities":
        const caseId = searchParams.get("caseId") || undefined;
        const type = searchParams.get("type") as VolunteerOpportunity["type"] | undefined;
        const status = searchParams.get("status") as VolunteerOpportunity["status"] | undefined;
        const oppLat = searchParams.get("lat");
        const oppLng = searchParams.get("lng");
        const oppRadius = searchParams.get("radius");

        const opportunities = volunteerNetworkService.listOpportunities({
          caseId,
          type,
          status,
          location: oppLat && oppLng ? { lat: parseFloat(oppLat), lng: parseFloat(oppLng) } : undefined,
          radius: oppRadius ? parseFloat(oppRadius) : undefined,
        });
        return NextResponse.json(opportunities);

      case "statistics":
        const stats = volunteerNetworkService.getStatistics();
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Volunteers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "register":
        const { name, email, phone, location, skills, languages, availability, searchRadius } = body;
        if (!name || !email || !phone || !location || !availability) {
          return NextResponse.json(
            { error: "name, email, phone, location, and availability required" },
            { status: 400 }
          );
        }
        const newVolunteer = await volunteerNetworkService.registerVolunteer({
          name,
          email,
          phone,
          location,
          skills,
          languages,
          availability,
          searchRadius,
        });
        return NextResponse.json(newVolunteer);

      case "update":
        const { volunteerId: updateId, updates } = body;
        if (!updateId || !updates) {
          return NextResponse.json(
            { error: "volunteerId and updates required" },
            { status: 400 }
          );
        }
        const updatedVolunteer = await volunteerNetworkService.updateVolunteer(
          updateId,
          updates
        );
        if (!updatedVolunteer) {
          return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
        }
        return NextResponse.json(updatedVolunteer);

      case "verify":
        const { volunteerId: verifyId, backgroundCheckStatus } = body;
        if (!verifyId || !backgroundCheckStatus) {
          return NextResponse.json(
            { error: "volunteerId and backgroundCheckStatus required" },
            { status: 400 }
          );
        }
        const verifyResult = await volunteerNetworkService.verifyVolunteer(
          verifyId,
          backgroundCheckStatus
        );
        return NextResponse.json({ success: verifyResult });

      case "updateStatus":
        const { volunteerId: statusId, status: newStatus } = body;
        if (!statusId || !newStatus) {
          return NextResponse.json(
            { error: "volunteerId and status required" },
            { status: 400 }
          );
        }
        const statusResult = await volunteerNetworkService.updateStatus(statusId, newStatus);
        return NextResponse.json({ success: statusResult });

      case "createOpportunity":
        const { caseId, title, description, type, dateTime, duration, opportunityLocation, volunteersNeeded, skills: oppSkills, languages: oppLangs, requirements } = body;
        if (!caseId || !title || !description || !type || !dateTime || !opportunityLocation || !volunteersNeeded) {
          return NextResponse.json(
            { error: "All required fields must be provided" },
            { status: 400 }
          );
        }
        const newOpportunity = await volunteerNetworkService.createOpportunity({
          caseId,
          title,
          description,
          type,
          dateTime,
          duration,
          location: opportunityLocation,
          volunteersNeeded,
          skills: oppSkills,
          languages: oppLangs,
          requirements,
        });
        return NextResponse.json(newOpportunity);

      case "registerForOpportunity":
        const { volunteerId: regVolId, opportunityId: regOppId } = body;
        if (!regVolId || !regOppId) {
          return NextResponse.json(
            { error: "volunteerId and opportunityId required" },
            { status: 400 }
          );
        }
        const regResult = await volunteerNetworkService.registerForOpportunity(
          regVolId,
          regOppId
        );
        return NextResponse.json({ success: regResult });

      case "recordHours":
        const { volunteerId: hoursVolId, hours, opportunityId: hoursOppId } = body;
        if (!hoursVolId || hours === undefined) {
          return NextResponse.json(
            { error: "volunteerId and hours required" },
            { status: 400 }
          );
        }
        const hoursResult = await volunteerNetworkService.recordHours(
          hoursVolId,
          hours,
          hoursOppId
        );
        return NextResponse.json({ success: hoursResult });

      case "rate":
        const { volunteerId: rateVolId, rating } = body;
        if (!rateVolId || rating === undefined) {
          return NextResponse.json(
            { error: "volunteerId and rating required" },
            { status: 400 }
          );
        }
        const rateResult = await volunteerNetworkService.rateVolunteer(rateVolId, rating);
        return NextResponse.json({ success: rateResult });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Volunteers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
