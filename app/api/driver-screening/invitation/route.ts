import { readActiveInvitation } from "@/lib/onboarding/invitations";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { JsonBodyError, readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonBody(request, 4096);
    const token = typeof body?.token === "string" ? body.token : "";
    const invitation = await readActiveInvitation(token, "screening");
    if (!invitation)
      return Response.json({ message: "This Screening invitation is invalid or expired." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return Response.json(
      {
        valid: true,
        email: invitation.email,
        applicationReference: invitation.quickId,
        expiresAt: invitation.expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof JsonBodyError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json({ message: "The invitation could not be checked." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
