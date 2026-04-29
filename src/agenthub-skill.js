import crypto from "node:crypto";

export function sha256Hex(input = "") {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hmacSha256Hex(secret, input) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

export function buildCanonicalString({
  timestamp,
  nonce,
  method,
  pathWithQuery,
  bodySha256,
}) {
  return `${timestamp}.${nonce}.${method.toUpperCase()}.${pathWithQuery}.${bodySha256}`;
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

function validateRange(name, value, min, max) {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return value;
}

function parseErrorPayload(status, payloadText) {
  try {
    const payload = JSON.parse(payloadText);
    if (payload && typeof payload.error === "string") {
      return `[${status}] ${payload.error}`;
    }
  } catch {
    // Keep raw payload text for debugging.
  }

  return `[${status}] ${payloadText || "Request failed"}`;
}

export class AgentHubSkill {
  constructor({
    baseUrl = "https://agthub.info",
    apiKeyId = process.env.AGENTHUB_API_KEY_ID,
    apiSecret = process.env.AGENTHUB_API_SECRET,
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
    generateNonce = () => crypto.randomBytes(12).toString("hex"),
    timeoutMs = 15_000,
  } = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.apiKeyId = apiKeyId;
    this.apiSecret = apiSecret;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.generateNonce = generateNonce;
    this.timeoutMs = timeoutMs;
  }

  assertConfigured() {
    if (!this.apiKeyId) {
      throw new Error(
        "Missing AGENTHUB_API_KEY_ID. Set env or pass apiKeyId in constructor."
      );
    }
    if (!this.apiSecret) {
      throw new Error(
        "Missing AGENTHUB_API_SECRET. Set env or pass apiSecret in constructor."
      );
    }
    if (typeof this.fetchImpl !== "function") {
      throw new Error("No fetch implementation available.");
    }
  }

  createSignedHeaders({ method, pathWithQuery, body = "" }) {
    const timestamp = String(this.now());
    const nonce = String(this.generateNonce());

    if (nonce.length < 8 || nonce.length > 128) {
      throw new Error("Generated nonce must be 8-128 characters.");
    }

    const bodySha256 = sha256Hex(body);
    const canonical = buildCanonicalString({
      timestamp,
      nonce,
      method,
      pathWithQuery,
      bodySha256,
    });
    const signature = hmacSha256Hex(this.apiSecret, canonical);

    return {
      headers: {
        Accept: "application/json",
        "x-api-key": this.apiKeyId,
        "x-api-signature": signature,
        "x-api-timestamp": timestamp,
        "x-api-nonce": nonce,
      },
      canonical,
      signature,
      timestamp,
      nonce,
      bodySha256,
    };
  }

  async requestJson({ method = "GET", pathWithQuery, body = "" }) {
    this.assertConfigured();

    const { headers } = this.createSignedHeaders({
      method,
      pathWithQuery,
      body,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${pathWithQuery}`, {
        method: method.toUpperCase(),
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const payloadText = await response.text();
    if (!response.ok) {
      throw new Error(parseErrorPayload(response.status, payloadText));
    }

    return JSON.parse(payloadText);
  }

  buildFeedPath({ limit, page = 1, pageSize = 12 } = {}) {
    const params = new URLSearchParams();

    if (limit !== undefined) {
      params.set("limit", String(validateRange("limit", limit, 1, 30)));
    }
    if (page !== undefined) {
      params.set("page", String(validateRange("page", page, 1, 1_000_000)));
    }
    if (pageSize !== undefined) {
      params.set("pageSize", String(validateRange("pageSize", pageSize, 1, 50)));
    }

    const query = params.toString();
    return query ? `/api/feed?${query}` : "/api/feed";
  }

  async getFeed(options = {}) {
    const pathWithQuery = this.buildFeedPath(options);
    return this.requestJson({ method: "GET", pathWithQuery });
  }

  async getSkillDescriptor() {
    return this.requestJson({ method: "GET", pathWithQuery: "/api/skill" });
  }

  async getOpenApiSpec() {
    return this.requestJson({ method: "GET", pathWithQuery: "/api/openapi" });
  }

  static summarizeFeed(feed, maxItems = 10) {
    const items = Array.isArray(feed?.items) ? feed.items : [];
    const trimmed = items.slice(0, Math.max(0, maxItems));
    return trimmed
      .map((item, index) => {
        const source = item.source || "unknown";
        const title = item.title || "(untitled)";
        const url = item.url || "";
        return `${index + 1}. [${source}] ${title}${url ? ` - ${url}` : ""}`;
      })
      .join("\n");
  }
}

