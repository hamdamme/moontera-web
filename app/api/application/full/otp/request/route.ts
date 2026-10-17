import { requestFullEmailCode } from "@/lib/onboarding/full-auth";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { JsonBodyError, readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonBody(request, 4096);
    const token = typeof body?.token === "string" ? body.token : "";
    if (!token || token.length > 64)
      return Response.json({ message: "This invitation link is invalid or expired." }, { status: 400 });
    const result = await requestFullEmailCode(token);
    if (!result)
      return Response.json({ message: "This invitation link is invalid or expired." }, { status: 400 });
    return Response.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof JsonBodyError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json({ message: "We could not send a verification code. Try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
