/**
 * Prafund public reviews API.
 *
 * GET  /reviews            → { rows: [...] } newest first, max 500
 * POST /reviews            → { review }      anonymously, validated + IP rate limited
 * DELETE /reviews?id&token → { ok }: only with the delete token issued at post time
 * OPTIONS *                → CORS preflight for the Prafund site origins
 *
 *{ "d1_databases": [{ "binding": "REVIEWS" }] }
 */

const ORIGINS = new Set([
  "https://pranaygollu2009-create.github.io",
  "https://prafund.co",
  "http://localhost:8080",
  "http://localhost:5173",
]);

function corsHeaders(origin) {
  const allow = ORIGINS.has(origin) || !origin ? origin || "*" : "https://pranaygollu2009-create.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });

async function ensureSchema(env) {
  if (env.__reviewsReady) return;
  await env.REVIEWS.batch([
    env.REVIEWS.prepare(
      "CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, name TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), body TEXT NOT NULL CHECK (length(body) <= 400), ip_hash TEXT NOT NULL, delete_token TEXT NOT NULL, created_at TEXT NOT NULL)"
    ),
    env.REVIEWS.prepare("CREATE INDEX IF NOT EXISTS reviews_created_idx ON reviews (created_at DESC)"),
  ]);
  env.__reviewsReady = true;
}

async function hashIp(ip) {
  const data = new TextEncoder().encode("prafund-reviews:" + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest.slice(0, 12))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      await ensureSchema(env);

      if (request.method === "GET" && path === "/reviews") {
        const { results } = await env.REVIEWS.prepare(
          "SELECT id, name, rating, body, created_at FROM reviews ORDER BY created_at DESC LIMIT 500"
        ).all();
        return json({ rows: results }, 200, cors);
      }

      if (request.method === "POST" && path === "/reviews") {
        let input;
        try {
          input = await request.json();
        } catch {
          return json({ error: "Body must be JSON." }, 400, cors);
        }
        const name = String(input.name ?? "").trim().slice(0, 40);
        const body = String(input.body ?? "").trim().slice(0, 400);
        const rating = Number(input.rating);
        if (name.length < 1) return json({ error: "Name is required." }, 400, cors);
        if (body.length < 3) return json({ error: "Review text is too short." }, 400, cors);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return json({ error: "Rating must be a whole number from 1 to 5." }, 400, cors);
        }

        // Light flooding guard: max 5 posts per IP per hour.
        const ipHash = await hashIp(request.headers.get("CF-Connecting-IP") || "unknown");
        const { count } = await env.REVIEWS.prepare(
          "SELECT COUNT(*) AS count FROM reviews WHERE ip_hash = ?1 AND created_at > ?2"
        )
          .bind(ipHash, new Date(Date.now() - 3600_000).toISOString())
          .first();
        if ((count ?? 0) >= 5) {
          return json({ error: "Too many posts from this network right now. Try again later." }, 429, cors);
        }

        const id = crypto.randomUUID();
        const deleteToken = [...crypto.getRandomValues(new Uint8Array(16))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const createdAt = new Date().toISOString();
        await env.REVIEWS.prepare(
          "INSERT INTO reviews (id, name, rating, body, ip_hash, delete_token, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )
          .bind(id, name, rating, body, ipHash, deleteToken, createdAt)
          .run();
        return json({ review: { id, name, rating, body, created_at: createdAt }, delete_token: deleteToken }, 201, cors);
      }

      if (request.method === "DELETE" && path === "/reviews") {
        const id = url.searchParams.get("id") || "";
        const token = url.searchParams.get("token") || "";
        if (!id || !token) return json({ error: "id and token are required." }, 400, cors);
        const result = await env.REVIEWS.prepare("DELETE FROM reviews WHERE id = ?1 AND delete_token = ?2")
          .bind(id, token)
          .run();
        if (!result.meta.changes) return json({ error: "Not found or token mismatch." }, 404, cors);
        return json({ ok: true }, 200, cors);
      }

      return json({ error: "Not found. Use GET or POST /reviews." }, 404, cors);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "Internal error" }, 500, cors);
    }
  },
};
