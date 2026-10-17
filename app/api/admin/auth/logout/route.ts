import {
  adminCookieOptions,
  revokeAdminSession,
  validAdminOrigin,
} from "@/lib/onboarding/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    await revokeAdminSession(request);
    return Response.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": adminCookieOptions(process.env.NODE_ENV === "production"),
        },
      },
    );
  } catch {
    return Response.json({ success: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
