
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { Resend } from "resend";
import { InputError, validateSubmission } from "./model";
import {
  processSubmission,
  SubmissionError,
  type RecordData,
  type Store,
} from "./workflow";
import { createSubmissionPdf } from "./submission-pdf";
import { createPrivate, readPrivate, updatePrivate } from "@/lib/onboarding/private-store";
import { ensurePolicyInvitation } from "@/lib/onboarding/policy-consents";
import { applicationBaseUrl } from "@/lib/onboarding/urls";
import { isAllowedApplicationOrigin } from "./origin";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

const store: Store = {
  async read(key) {
    const result = await get(key, { access: "private", useCache: false });
    if (!result) return null;
    if (result.statusCode !== 200) throw Error("Storage read failed");
    return {
      record: (await new Response(result.stream).json()) as RecordData,
      version: result.blob.etag,
    };
  },
  async create(key, record) {
    try {
      const result = await put(key, JSON.stringify(record), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
      });
      return { record, version: result.etag };
    } catch (error) {
      if (
        error instanceof Error &&
        /already exists|precondition/i.test(error.message)
      )
        return null;
      throw error;
    }
  },
  async save(key, record, version) {
    try {
      const result = await put(key, JSON.stringify(record), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        ifMatch: version,
        contentType: "application/json",
      });
      return { record, version: result.etag };
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) return null;
      throw error;
    }
  },
};
function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
type IpRateLimit = { count: number; expiresAt: number };
async function allowNetworkSubmission(ip: string, secret: string, now = Date.now()) {
  const hour = Math.floor(now / (60 * 60 * 1000));
  const ipHash = createHmac("sha256", secret).update(ip).digest("hex");
  const key = `onboarding/application-rate-limits/${hour}/${ipHash}.json`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readPrivate<IpRateLimit>(key);
    if (current && current.value.expiresAt > now) {
      if (current.value.count >= 30) return false;
      const updated = await updatePrivate(key, {
        count: current.value.count + 1,
        expiresAt: current.value.expiresAt,
      }, current.etag);
      if (updated) return true;
      continue;
    }
    const created = await createPrivate(key, { count: 1, expiresAt: (hour + 2) * 60 * 60 * 1000 });
    if (created) return true;
  }
  throw new Error("Application rate limit state changed repeatedly");
}
export async function handleApplication(
  request: Request,
  kind: "quick" | "full",
  verifiedEmail?: string,
  sourceQuickId?: string,
) {
  try {
    if (!isAllowedApplicationOrigin(request.headers.get("origin"), request.url))
      return reply({ success: false, message: "Invalid request origin." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return reply(
        { success: false, message: "Send application data as JSON." },
        415,
      );
    if (Number(request.headers.get("content-length")) > 750000)
      return reply(
        { success: false, message: "Application is too large." },
        413,
      );
    // Bound the streamed body too: Content-Length alone is not a reliable limit.
    const reader = request.body?.getReader();
    if (!reader) throw new InputError("Missing application.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 750000) {
        await reader.cancel();
        return reply(
          { success: false, message: "Application is too large." },
          413,
        );
      }
      chunks.push(part.value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new InputError("Invalid application data.");
    }
    const payload = validateSubmission(kind, input);
    if (
      kind === "full" &&
      (!verifiedEmail || payload.email !== verifiedEmail.trim().toLowerCase())
    )
      return reply(
        { success: false, message: "Verify the invitation email before submitting." },
        403,
      );
    if (
      !process.env.RESEND_API_KEY ||
      !process.env.BLOB_READ_WRITE_TOKEN ||
      !process.env.APPLICATION_KEY_SECRET
    )
      return reply(
        {
          success: false,
          message:
            "Applications are temporarily unavailable. Please contact info@moonterallc.com.",
        },
        503,
      );
    const ipAddress = request.headers.get("x-real-ip")?.trim().slice(0, 64);
    if (ipAddress && !(await allowNetworkSubmission(ipAddress, process.env.APPLICATION_KEY_SECRET)))
      return reply({ success: false, message: "Too many application attempts from this network. Please try again later or contact info@moonterallc.com." }, 429);
    const key = `applications/${kind}/${createHmac("sha256", process.env.APPLICATION_KEY_SECRET).update(payload.email).digest("hex")}.json`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await processSubmission(key, payload, {
      store,
      ...(kind === "full" && sourceQuickId ? { sourceQuickId } : {}),
      historyKey:
        kind === "quick"
          ? (currentKey, requestId) => {
              const emailHash = path.basename(currentKey, ".json");
              return `applications/quick/history/${emailHash}/${requestId}.json`;
            }
          : undefined,
      pdf: async (submission, id, date) => {
        const [font, template] = await Promise.all([
          readFile(path.join(process.cwd(), "public/fonts/Geist-Regular.ttf")),
          readFile(
            path.join(process.cwd(), "assets/application-reference.pdf"),
          ),
        ]);
        return createSubmissionPdf(submission, id, date, font, template);
      },
      send: async (record, recipient) => {
        const title =
          record.payload.kind === "quick"
            ? "Quick Application"
            : "Full Driver Application";
        const from =
          process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
        const owner = recipient === "owner";
        const policyUrl = !owner && record.payload.kind === "full" && sourceQuickId
          ? `${applicationBaseUrl()}/apply/documents#quickId=${encodeURIComponent(sourceQuickId)}&fullId=${encodeURIComponent(record.id)}&token=${await ensurePolicyInvitation(record.id, sourceQuickId, record.payload.email)}`
          : "";
        const { data, error } = await resend.emails.send(
          {
            from,
            to: [owner ? "llcmoontera@gmail.com" : record.payload.email],
            replyTo: owner ? record.payload.email : "info@moonterallc.com",
            subject: owner
              ? `New ${title} - ${record.payload.name}`
              : `${title} submitted - Moontera LLC`,
            text: owner
              ? `${record.payload.name} submitted a ${title.toLowerCase()}.\n\nThe completed application is attached as a PDF.\nReference: ${record.id}\nReceived: ${record.createdAt}\nContact: ${record.payload.email}`
              : `Hello ${record.payload.name},\n\nYour ${title.toLowerCase()} has been submitted to Moontera LLC. Our team will review it and contact you if more information is needed. You do not need to submit this application again.${policyUrl ? `\n\nNext step: review and acknowledge the three driver policies using this secure link (valid for 14 days):\n${policyUrl}\n\nAfter you finish, you and Moontera will each receive a PDF copy showing your name and signing date.` : ""}\n\nReference: ${record.id}\n\nQuestions or corrections? Contact info@moonterallc.com or 773-882-5595.\n\nMoontera LLC`,
            ...(policyUrl ? { html: `<p>Hello ${escapeHtml(record.payload.name)},</p><p>Your ${escapeHtml(title.toLowerCase())} has been submitted to Moontera LLC. Our team will review it and contact you if more information is needed. You do not need to submit this application again.</p><p><strong>Next step:</strong> read and acknowledge the three driver policies using this secure link. The link is valid for 14 days.</p><p><a href="${policyUrl}">Review and sign driver policies</a></p><p>After you finish, you and Moontera will each receive the signed PDF copy showing your name and signing date.</p><p>Reference: ${escapeHtml(record.id)}</p><p>Questions? Contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a> or 773-882-5595.</p><p>Moontera LLC</p>` } : {}),
            ...(owner
              ? {
                  attachments: [
                    {
                      filename: `Moontera-${record.payload.kind}-application-${record.id.slice(0, 8)}.pdf`,
                      content: record.pdf,
                    },
                  ],
                }
              : {}),
          },
          { idempotencyKey: `application/${record.id}/${recipient}` },
        );
        if (error || !data?.id)
          throw Error("Email provider did not accept message");
        return data.id;
      },
    });
    return reply({
      success: true,
      ...result,
      message: "Application submitted. A confirmation email has been sent.",
    });
  } catch (error) {
    if (error instanceof InputError)
      return reply({ success: false, message: error.message }, 400);
    if (error instanceof SubmissionError)
      return reply({ success: false, message: error.message }, error.status);
    console.error(
      "Application intake failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return reply(
      {
        success: false,
        message:
          "We could not complete your submission. Please retry; repeated attempts will not create another application.",
      },
      503,
    );
  }
}
