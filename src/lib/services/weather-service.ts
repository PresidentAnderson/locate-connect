export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherObservation {
  observedAt: string;
  temperatureC: number;
  windKph: number;
  precipitationChance: number;
  condition: string;
  isNight: boolean;
}

export interface HistoricalWeatherDay {
  date: string;
  avgTempC: number;
  minTempC: number;
  maxTempC: number;
  totalPrecipMm: number;
  avgWindKph: number;
  condition: string;
}

export interface WeatherForecastDay {
  date: string;
  highC: number;
  lowC: number;
  windKph: number;
  precipitationChance: number;
  condition: string;
}

export interface WeatherAlert {
  title: string;
  severity: "moderate" | "severe" | "extreme";
  description: string;
  startsAt: string;
  endsAt: string;
}

export interface WeatherProvider {
  getCurrent(coordinates: Coordinates | null): Promise<WeatherObservation>;
  getDailyForecast(
    coordinates: Coordinates | null,
    days: number
  ): Promise<WeatherForecastDay[]>;
  getAlerts(coordinates: Coordinates | null): Promise<WeatherAlert[]>;
  getHistorical(
    coordinates: Coordinates | null,
    days: number
  ): Promise<HistoricalWeatherDay[]>;
}

const weatherApiKey = process.env.WEATHERAPI_API_KEY;

export function getWeatherProvider(): WeatherProvider {
  if (weatherApiKey) {
    return new WeatherApiProvider(weatherApiKey);
  }
  return new MockWeatherProvider();
}

/**
 * Calculate weather-based risk points according to issue #92 requirements:
 * | Condition          | Risk Increase           |
 * |--------------------|-------------------------|
 * | Below -10C         | +20 priority points     |
 * | Above 35C          | +15 priority points     |
 * | Severe storm       | +25 priority points     |
 * | Heavy rain/snow    | +10 priority points     |
 * | Night + cold       | +30 priority points     |
 */
export function calculateWeatherRisk(
  observation: WeatherObservation,
  alerts: WeatherAlert[]
) {
  let points = 0;
  const reasons: string[] = [];

  const isCold = observation.temperatureC <= 0;
  if (observation.isNight && isCold) {
    points += 30;
    reasons.push("Night + cold conditions");
  } else {
    if (observation.temperatureC <= -10) {
      points += 20;
      reasons.push("Extreme cold (below -10C)");
    } else if (observation.temperatureC >= 35) {
      points += 15;
      reasons.push("Extreme heat (above 35C)");
    }
  }

  if (observation.precipitationChance >= 0.7) {
    points += 10;
    reasons.push("Heavy rain/snow risk");
  }

  if (observation.windKph >= 50) {
    points += 10;
    reasons.push("High winds");
  }

  const severeAlert = alerts.find(
    (alert) => alert.severity === "severe" || alert.severity === "extreme"
  );
  if (severeAlert) {
    points += 25;
    reasons.push("Severe alert: " + severeAlert.title);
  }

  const bounded = Math.min(100, points);
  return { points: bounded, reasons };
}

export function calculateExposureRisk(
  observation: WeatherObservation,
  shelterAccess: boolean
) {
  let tempFactor = 0;
  if (observation.temperatureC < 10) {
    tempFactor = Math.min(40, (10 - observation.temperatureC) * 4);
  } else if (observation.temperatureC > 20) {
    tempFactor = Math.min(30, (observation.temperatureC - 20) * 3);
  }

  const windFactor = Math.min(20, observation.windKph / 2.5);
  const precipFactor = Math.min(20, observation.precipitationChance * 20);
  const nightFactor = observation.isNight ? 15 : 0;
  const shelterFactor = shelterAccess ? -20 : 10;

  const score = Math.max(0, Math.min(100, tempFactor + windFactor + precipFactor + nightFactor + shelterFactor));

  let explanation;
  if (score >= 70) explanation = "High exposure risk - immediate shelter needed.";
  else if (score >= 40) explanation = "Moderate exposure risk - shelter recommended within hours.";
  else if (shelterAccess) explanation = "Shelter access available; exposure risk moderated.";
  else explanation = "Low exposure risk under current conditions.";

  return { score, explanation };
}

class WeatherApiProvider implements WeatherProvider {
  constructor(private readonly apiKey: string) {}

  async getCurrent(coordinates: Coordinates | null): Promise<WeatherObservation> {
    const response = await this.fetchForecast(coordinates, 1);
    const current = response.current;
    return {
      observedAt: current.last_updated,
      temperatureC: current.temp_c,
      windKph: current.wind_kph,
      precipitationChance: Math.min(1, (current.precip_mm ?? 0) / 10),
      condition: current.condition?.text ?? "Unknown",
      isNight: current.is_day === 0,
    };
  }

  async getDailyForecast(coordinates: Coordinates | null, days: number): Promise<WeatherForecastDay[]> {
    const response = await this.fetchForecast(coordinates, days);
    return (response.forecast?.forecastday ?? []).map((day) => ({
      date: day.date,
      highC: day.day?.maxtemp_c ?? 0,
      lowC: day.day?.mintemp_c ?? 0,
      windKph: day.day?.maxwind_kph ?? 0,
      precipitationChance: (day.day?.daily_chance_of_rain ?? 0) / 100,
      condition: day.day?.condition?.text ?? "Unknown",
    }));
  }

  async getAlerts(coordinates: Coordinates | null): Promise<WeatherAlert[]> {
    const response = await this.fetchForecast(coordinates, 1);
    const alerts = response.alerts?.alert ?? [];
    return alerts.map((alert) => ({
      title: alert.headline,
      severity: this.mapSeverity(alert.severity),
      description: alert.desc,
      startsAt: alert.effective,
      endsAt: alert.expires,
    }));
  }

  async getHistorical(coordinates: Coordinates | null, days: number): Promise<HistoricalWeatherDay[]> {
    const results: HistoricalWeatherDay[] = [];
    const location = coordinates ? coordinates.lat + "," + coordinates.lng : "Canada";
    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      try {
        const url = new URL("https://api.weatherapi.com/v1/history.json");
        url.searchParams.set("key", this.apiKey);
        url.searchParams.set("q", location);
        url.searchParams.set("dt", dateStr);
        const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
        if (response.ok) {
          const data = (await response.json()) as WeatherApiHistoryResponse;
          const day = data.forecast?.forecastday?.[0];
          if (day) {
            results.push({
              date: day.date,
              avgTempC: day.day?.avgtemp_c ?? 0,
              minTempC: day.day?.mintemp_c ?? 0,
              maxTempC: day.day?.maxtemp_c ?? 0,
              totalPrecipMm: day.day?.totalprecip_mm ?? 0,
              avgWindKph: day.day?.avgvis_km ?? 0,
              condition: day.day?.condition?.text ?? "Unknown",
            });
          }
        }
      } catch { /* Skip failed historical data fetches */ }
    }
    return results;
  }

  private async fetchForecast(coordinates: Coordinates | null, days: number) {
    const location = coordinates ? coordinates.lat + "," + coordinates.lng : "Canada";
    const url = new URL("https://api.weatherapi.com/v1/forecast.json");
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("q", location);
    url.searchParams.set("days", String(Math.min(7, Math.max(1, days))));
    url.searchParams.set("alerts", "yes");
    const response = await fetch(url.toString(), { next: { revalidate: 600 } });
    if (!response.ok) throw new Error("Weather provider error");
    return (await response.json()) as WeatherApiForecastResponse;
  }

  private mapSeverity(severity: string | undefined): WeatherAlert["severity"] {
    if (!severity) return "moderate";
    const normalized = severity.toLowerCase();
    if (normalized.includes("extreme")) return "extreme";
    if (normalized.includes("severe")) return "severe";
    return "moderate";
  }
}

interface WeatherApiForecastResponse {
  current: { last_updated: string; temp_c: number; wind_kph: number; precip_mm?: number; is_day?: number; condition?: { text?: string } };
  forecast?: { forecastday?: Array<{ date: string; day?: { maxtemp_c?: number; mintemp_c?: number; maxwind_kph?: number; daily_chance_of_rain?: number; condition?: { text?: string } } }> };
  alerts?: { alert?: Array<{ headline: string; severity?: string; desc: string; effective: string; expires: string }> };
}

interface WeatherApiHistoryResponse {
  forecast?: { forecastday?: Array<{ date: string; day?: { avgtemp_c?: number; mintemp_c?: number; maxtemp_c?: number; totalprecip_mm?: number; avgvis_km?: number; condition?: { text?: string } } }> };
}

class MockWeatherProvider implements WeatherProvider {
  async getCurrent(): Promise<WeatherObservation> {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 20;
    return {
      observedAt: new Date().toISOString(),
      temperatureC: 4,
      windKph: 22,
      precipitationChance: 0.4,
      condition: "Overcast",
      isNight,
    };
  }

  async getDailyForecast(_: Coordinates | null, days: number) {
    const today = new Date();
    return Array.from({ length: days }, (__, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index + 1);
      return {
        date: date.toISOString().slice(0, 10),
        highC: 6 + index,
        lowC: -2 + index,
        windKph: 18 + index * 2,
        precipitationChance: 0.2 + index * 0.05,
        condition: index % 2 === 0 ? "Cloudy" : "Light rain",
      } satisfies WeatherForecastDay;
    });
  }

  async getAlerts(): Promise<WeatherAlert[]> {
    return [{
      title: "Cold temperature advisory",
      severity: "moderate",
      description: "Overnight lows below freezing expected.",
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }];
  }

  async getHistorical(_: Coordinates | null, days: number): Promise<HistoricalWeatherDay[]> {
    const results: HistoricalWeatherDay[] = [];
    const today = new Date();
    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      results.push({
        date: date.toISOString().slice(0, 10),
        avgTempC: 2 - i,
        minTempC: -3 - i,
        maxTempC: 7 - i,
        totalPrecipMm: 2 + i,
        avgWindKph: 15 + i,
        condition: i % 2 === 0 ? "Partly cloudy" : "Light snow",
      });
    }
    return results;
  }
}
