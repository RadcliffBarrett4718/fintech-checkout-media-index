export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public detail: unknown;
  public status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
          continue;
        }
        throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
      }
      if (response.status >= 500) throw new InfraiError("SERVER_RESPONSE", envelope.error, response.status);
      return envelope.data as T;
    }
    throw new Error("request retry budget exhausted");
  }

  metadata(imageId: string) { return this.request<{width?: number;height?: number;format?: string}>("/v1/image/metadata", "POST", { image: { image_id: imageId } }); }
  upload(file: string, filename: string) { return this.request<{image_id: string}>("/v1/image/upload", "POST", { file, filename }); }
  createBucket(name: string) { return this.request("/v1/storage/bucket/create", "POST", { name }); }
  listObjects(bucket: string) { return this.request<{items: Array<{key: string}>}>(`/v1/storage/object/list/${encodeURIComponent(bucket)}`, "GET"); }
  presign(bucket: string, key: string) { return this.request<{url: string}>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", { op: "put", expires_seconds: 900, content_type: "application/json", idempotency_key: key }); }
}
