const PRODUCTION_ORIGINS = new Set([
  "https://www.moonterallc.com",
  "https://moonterallc.com",
]);

export function isAllowedApplicationOrigin(
  origin: string | null,
  requestUrl: string,
) {
  if (!origin) return false;
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  try {
    return origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}
