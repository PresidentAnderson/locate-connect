import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateExposureRisk,
  calculateWeatherRisk,
  getWeatherProvider,
} from "@/lib/services";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCaseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string
) {
  if (uuidRegex.test(caseId)) {
    return caseId;
  }

  const { data, error } = await supabase
    .from("cases")
    .select("id")
    .eq("case_number", caseId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await params;
  const resolvedCaseId = await getCaseId(supabase, caseId);

  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { data: caseRecord, error } = await supabase
    .from("cases")
    .select(
      "last_seen_latitude, last_seen_longitude, last_seen_city, last_seen_province"
    )
    .eq("id", resolvedCaseId)
    .single();

  if (error || !caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const coordinates =
    caseRecord.last_seen_latitude && caseRecord.last_seen_longitude
      ? {
          lat: caseRecord.last_seen_latitude,
          lng: caseRecord.last_seen_longitude,
        }
      : null;

  const provider = getWeatherProvider();
  const [current, forecast, alerts] = await Promise.all([
    provider.getCurrent(coordinates),
    provider.getDailyForecast(coordinates, 7),
    provider.getAlerts(coordinates),
  ]);

  const shelterAccess = new URL(request.url).searchParams.get("shelterAccess") === "true";
  const weatherRisk = calculateWeatherRisk(current, alerts);
  const exposureRisk = calculateExposureRisk(current, shelterAccess);

  return NextResponse.json(
    {
      location: {
        city: caseRecord.last_seen_city,
        province: caseRecord.last_seen_province,
      },
      current,
      forecast,
      alerts,
      risk: {
        weatherPoints: weatherRisk.points,
        weatherReasons: weatherRisk.reasons,
        exposureScore: exposureRisk.score,
        exposureExplanation: exposureRisk.explanation,
      },
    },
    { status: 200 }
  );
}
