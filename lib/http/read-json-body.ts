export class JsonBodyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json")
    throw new JsonBodyError("Send the request as JSON.", 415);

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength))
      throw new JsonBodyError("Invalid request body.", 400);
    if (Number(contentLength) > maxBytes)
      throw new JsonBodyError("Request body is too large.", 413);
  }

  const reader = request.body?.getReader();
  if (!reader) throw new JsonBodyError("Missing request body.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new JsonBodyError("Request body is too large.", 413);
    }
    chunks.push(part.value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new Error("JSON body must be an object");
    return value as Record<string, unknown>;
  } catch {
    throw new JsonBodyError("Invalid JSON request body.", 400);
  }
}
