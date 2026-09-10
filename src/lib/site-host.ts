export function getPlatformHostname(): string {
  try {
    return new URL(process.env.APP_BASE_URL || "https://menuor.com").hostname.toLowerCase();
  } catch {
    return "menuor.com";
  }
}

export function isPlatformHost(hostname: string): boolean {
  const platformHost = getPlatformHostname();
  return (
    hostname === platformHost ||
    hostname === `www.${platformHost}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}
