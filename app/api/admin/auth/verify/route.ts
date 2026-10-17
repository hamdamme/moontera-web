import {
  adminSessionCookie,
  consumeAdminMagicLink,
  validAdminOrigin,
} from "@/lib/onboarding/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const session = await consumeAdminMagicLink(token);
    if (!session)
      return Response.json(
        { success: false, message: "This sign-in link is expired or already used. Request a new one." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": adminSessionCookie(session, process.env.NODE_ENV === "production"),
        },
      },
    );
  } catch {
    return Response.json(
      { success: false, message: "Sign-in is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
