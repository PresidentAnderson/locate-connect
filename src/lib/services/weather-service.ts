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
}

const weatherApiKey = process.env.WEATHERAPI_API_KEY;

export function getWeatherProvider(): WeatherProvider {
  if (weatherApiKey) {
    return new WeatherApiProvider(weatherApiKey);
  }
  return new MockWeatherProvider();
}

export function calculateWeatherRisk(
  observation: WeatherObservation,
  alerts: WeatherAlert[]
) {
  let points = 0;
  const reasons: string[] = [];

  if (observation.temperatureC <= -10) {
    points += 5;
    reasons.push("Extreme cold");
  }

  if (observation.temperatureC >= 35) {
    points += 4;
    reasons.push("Extreme heat");
  }

  if (observation.windKph >= 50) {
    points += 3;
    reasons.push("High winds");
  }

  if (observation.precipitationChance >= 0.7) {
    points += 2;
    reasons.push("Heavy precipitation risk");
  }

  const severeAlert = alerts.find(
    (alert) => alert.severity === "severe" || alert.severity === "extreme"
  );
  if (severeAlert) {
    points += 5;
    reasons.push(severeAlert.title);
  }

  const bounded = Math.max(0, Math.min(10, points));
  return {
    points: bounded,
    reasons,
  };
}

export function calculateExposureRisk(
  observation: WeatherObservation,
  shelterAccess: boolean
) {
  const tempFactor = Math.max(0, 20 - Math.abs(observation.temperatureC - 10));
  const windFactor = Math.min(20, observation.windKph / 2);
  const precipFactor = Math.min(20, observation.precipitationChance * 20);
  const shelterFactor = shelterAccess ? 10 : 25;

  const score = Math.min(100, tempFactor + windFactor + precipFactor + shelterFactor);

  return {
    score,
    explanation: shelterAccess
      ? "Shelter access available; exposure risk moderated."
      : "Limited shelter access increases exposure risk.",
  };
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
    };
  }

  async getDailyForecast(
    coordinates: Coordinates | null,
    days: number
  ): Promise<WeatherForecastDay[]> {
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

  private async fetchForecast(coordinates: Coordinates | null, days: number) {
    const location = coordinates ? `${coordinates.lat},${coordinates.lng}` : "Canada";
    const url = new URL("https://api.weatherapi.com/v1/forecast.json");
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("q", location);
    url.searchParams.set("days", String(Math.min(7, Math.max(1, days))));
    url.searchParams.set("alerts", "yes");

    const response = await fetch(url.toString(), { next: { revalidate: 600 } });
    if (!response.ok) {
      throw new Error("Weather provider error");
    }
    return (await response.json()) as WeatherApiForecastResponse;
  }

  private mapSeverity(severity: string | undefined): WeatherAlert["severity"] {
    if (!severity) return "moderate";
    const normalized = severity.toLowerCase();
    if (normalized.includes("extreme") || normalized.includes("severe")) {
      return "severe";
    }
    if (normalized.includes("moderate") || normalized.includes("minor")) {
      return "moderate";
    }
    return "moderate";
  }
}

interface WeatherApiForecastResponse {
  current: {
    last_updated: string;
    temp_c: number;
    wind_kph: number;
    precip_mm?: number;
    condition?: { text?: string };
  };
  forecast?: {
    forecastday?: Array<{
      date: string;
      day?: {
        maxtemp_c?: number;
        mintemp_c?: number;
        maxwind_kph?: number;
        daily_chance_of_rain?: number;
        condition?: { text?: string };
      };
    }>;
  };
  alerts?: {
    alert?: Array<{
      headline: string;
      severity?: string;
      desc: string;
      effective: string;
      expires: string;
    }>;
  };
}

class MockWeatherProvider implements WeatherProvider {
  async getCurrent(): Promise<WeatherObservation> {
    return {
      observedAt: new Date().toISOString(),
      temperatureC: 4,
      windKph: 22,
      precipitationChance: 0.4,
      condition: "Overcast",
    };
  }

  async getDailyForecast(_: Coordinates | null, days: number) {
    const today = new Date();
    return Array.from({ length: days }, (_, index) => {
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
    return [
      {
        title: "Cold temperature advisory",
        severity: "moderate",
        description: "Overnight lows below freezing expected.",
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
}
