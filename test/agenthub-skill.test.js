import test from "node:test";
import assert from "node:assert/strict";
import {
  AgentHubSkill,
  sha256Hex,
  hmacSha256Hex,
  buildCanonicalString,
} from "../src/agenthub-skill.js";

test("sha256Hex returns expected digest for empty string", () => {
  assert.equal(
    sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

test("buildCanonicalString follows AgentHub format", () => {
  const canonical = buildCanonicalString({
    timestamp: "1714286400000",
    nonce: "abc123nonce",
    method: "get",
    pathWithQuery: "/api/feed?page=1&pageSize=12",
    bodySha256:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  });

  assert.equal(
    canonical,
    "1714286400000.abc123nonce.GET./api/feed?page=1&pageSize=12.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

test("createSignedHeaders produces deterministic signature with fixed timestamp/nonce", () => {
  const skill = new AgentHubSkill({
    apiKeyId: "kid_123",
    apiSecret: "secret_123",
    now: () => 1714286400000,
    generateNonce: () => "abc123nonce",
    fetchImpl: async () => {
      throw new Error("fetch should not be called in this test");
    },
  });

  const signed = skill.createSignedHeaders({
    method: "GET",
    pathWithQuery: "/api/feed?page=1&pageSize=12",
    body: "",
  });

  const expectedCanonical =
    "1714286400000.abc123nonce.GET./api/feed?page=1&pageSize=12.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const expectedSignature = hmacSha256Hex("secret_123", expectedCanonical);

  assert.equal(signed.canonical, expectedCanonical);
  assert.equal(signed.signature, expectedSignature);
  assert.equal(signed.headers["x-api-key"], "kid_123");
  assert.equal(signed.headers["x-api-timestamp"], "1714286400000");
  assert.equal(signed.headers["x-api-nonce"], "abc123nonce");
});

test("buildFeedPath validates ranges and builds query string", () => {
  const skill = new AgentHubSkill({
    apiKeyId: "kid",
    apiSecret: "sec",
    fetchImpl: async () => ({ ok: true, text: async () => "{}" }),
  });

  assert.equal(
    skill.buildFeedPath({ limit: 5, page: 2, pageSize: 20 }),
    "/api/feed?limit=5&page=2&pageSize=20"
  );

  assert.throws(() => skill.buildFeedPath({ limit: 99 }), /limit must be between 1 and 30/);
  assert.throws(
    () => skill.buildFeedPath({ pageSize: 0 }),
    /pageSize must be between 1 and 50/
  );
});

test("getFeed sends signed request and parses JSON", async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [{ source: "github", title: "Repo", url: "https://example.com" }],
          pagination: { page: 1, pageSize: 12 },
        }),
    };
  };

  const skill = new AgentHubSkill({
    baseUrl: "https://agthub.info",
    apiKeyId: "kid",
    apiSecret: "secret",
    now: () => 1714286400000,
    generateNonce: () => "abcdef123456",
    fetchImpl: fakeFetch,
  });

  const data = await skill.getFeed({ page: 1, pageSize: 12 });

  assert.equal(captured.url, "https://agthub.info/api/feed?page=1&pageSize=12");
  assert.equal(captured.init.method, "GET");
  assert.equal(captured.init.headers["x-api-key"], "kid");
  assert.equal(typeof captured.init.headers["x-api-signature"], "string");
  assert.equal(data.items[0].source, "github");
});

