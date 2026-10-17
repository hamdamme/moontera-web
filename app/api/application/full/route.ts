import { handleApplication } from "@/lib/applications/server";
import { getFullApplicantSession } from "@/lib/onboarding/full-auth";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const session = await getFullApplicantSession(request);
    if (!session)
      return Response.json(
        { success: false, message: "Verify your email using a valid invitation before submitting." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    return handleApplication(request, "full", session.email);
  } catch {
    return Response.json(
      { success: false, message: "Application verification is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
