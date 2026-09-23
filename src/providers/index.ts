import type { BusinessDataProvider } from "./types";
import { DemoProvider } from "./demo";
import { OpenStreetMapProvider } from "./openstreetmap";
import { GooglePlacesProvider } from "./google";

export const PROVIDERS: Record<string, BusinessDataProvider> = {
  demo: new DemoProvider(),
  openstreetmap: new OpenStreetMapProvider(),
  google: new GooglePlacesProvider(),
};

export function getProvider(key: string): BusinessDataProvider | null {
  return PROVIDERS[key] ?? null;
}

export function listProviders(): BusinessDataProvider[] {
  return Object.values(PROVIDERS);
}

export * from "./types";
