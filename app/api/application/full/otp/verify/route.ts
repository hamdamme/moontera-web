import { validAdminOrigin } from "@/lib/onboarding/admin-auth";
import {
  fullSessionCookie,
  verifyFullEmailCode,
} from "@/lib/onboarding/full-auth";
import { JsonBodyError, readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonBody(request, 4096);
    const token = typeof body?.token === "string" ? body.token : "";
    const code = typeof body?.code === "string" ? body.code : "";
    const result = await verifyFullEmailCode(token, code);
    if (!result)
      return Response.json(
        { message: "The code is invalid, expired, or has reached its attempt limit." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": fullSessionCookie(result.sessionToken, process.env.NODE_ENV === "production"),
        },
      },
    );
  } catch (error) {
    if (error instanceof JsonBodyError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json({ message: "Email verification is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
