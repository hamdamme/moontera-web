import { handleApplication } from "@/lib/applications/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return handleApplication(request, "full");
}
