import { readActiveInvitation } from "@/lib/onboarding/invitations";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
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
  } catch {
    return Response.json({ message: "The invitation could not be checked." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
