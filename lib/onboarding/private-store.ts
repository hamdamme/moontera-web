import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";

export type Stored<T> = { value: T; etag: string };

export async function readPrivate<T>(key: string): Promise<Stored<T> | null> {
  const result = await get(key, { access: "private", useCache: false });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error("Private record read failed");
  return {
    value: (await new Response(result.stream).json()) as T,
    etag: result.blob.etag,
  };
}

export async function createPrivate<T>(key: string, value: T) {
  try {
    const result = await put(key, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });
    return result.etag;
  } catch (error) {
    if (error instanceof Error && /already exists|precondition/i.test(error.message))
      return null;
    throw error;
  }
}

export async function updatePrivate<T>(
  key: string,
  value: T,
  etag: string,
) {
  try {
    const result = await put(key, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: etag,
      contentType: "application/json",
    });
    return result.etag;
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) return null;
    throw error;
  }
}

export async function deletePrivate(key: string) {
  await del(key);
}
