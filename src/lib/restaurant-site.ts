const DEFAULT_APP_BASE_URL = "https://menuor.com";

const HOSTNAME_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export interface RestaurantSiteConfig {
  slug: string;
  customDomain?: string | null;
  domainVerifiedAt?: Date | string | null;
  landingEnabled?: boolean;
}

export function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL).replace(/\/+$/, "");
}

export function normalizeDomain(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return trimmed || null;
}

export function isValidDomain(hostname: string): boolean {
  return HOSTNAME_REGEX.test(hostname);
}

export function hasVerifiedCustomDomain(site: Pick<RestaurantSiteConfig, "customDomain" | "domainVerifiedAt">): boolean {
  return Boolean(site.customDomain && site.domainVerifiedAt);
}

export function getRestaurantMenuPath(site: RestaurantSiteConfig): string {
  if (hasVerifiedCustomDomain(site)) {
    return site.landingEnabled ? "/menu" : "/";
  }

  return `/menu/${site.slug}`;
}

export function getRestaurantLandingPath(site: RestaurantSiteConfig): string {
  if (hasVerifiedCustomDomain(site)) {
    return "/";
  }

  return `/landing/${site.slug}`;
}

export function getRestaurantMenuUrl(site: RestaurantSiteConfig): string {
  if (hasVerifiedCustomDomain(site)) {
    return `https://${site.customDomain}${getRestaurantMenuPath(site)}`;
  }

  return `${getAppBaseUrl()}${getRestaurantMenuPath(site)}`;
}

export function getRestaurantLandingUrl(site: RestaurantSiteConfig): string {
  if (hasVerifiedCustomDomain(site)) {
    return `https://${site.customDomain}${getRestaurantLandingPath(site)}`;
  }

  return `${getAppBaseUrl()}${getRestaurantLandingPath(site)}`;
}
