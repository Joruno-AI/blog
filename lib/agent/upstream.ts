export class UpstreamResponseTooLargeError extends Error {
  constructor() {
    super("上游响应体积超过安全上限。");
    this.name = "UpstreamResponseTooLargeError";
  }
}

type NextFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

export async function fetchWithTimeout(
  input: string | URL | Request,
  init: NextFetchInit = {},
  timeoutMs = 12_000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function readLimitedText(response: Response, maximumBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel();
    throw new UpstreamResponseTooLargeError();
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new UpstreamResponseTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
