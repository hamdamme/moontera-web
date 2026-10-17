import { requestAdminMagicLink, validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { JsonBodyError, readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonBody(request, 4096);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
      await requestAdminMagicLink(email);
    return Response.json(
      { success: true, message: "If this address is authorized, a sign-in link will arrive shortly." },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof JsonBodyError)
      return Response.json(
        { success: false, message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { success: false, message: "Sign-in is temporarily unavailable. Try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
