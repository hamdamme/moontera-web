export function applicationBaseUrl() {
  if (process.env.APP_BASE_URL)
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production")
    return "https://www.moonterallc.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
