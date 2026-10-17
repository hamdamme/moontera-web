import { getAdminSession } from "@/lib/onboarding/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession(request);
    return Response.json(
      session ? { authenticated: true, email: session.email } : { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ authenticated: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
