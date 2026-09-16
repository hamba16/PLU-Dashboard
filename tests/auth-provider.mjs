// Test-only GoTrue HTTP double. Bound to loopback; never imported by application code.
// This verifies our orchestration, not Supabase email delivery or the live provider.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
const url = process.env.TEST_DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Isolated local test database required.");
const db = new pg.Pool({ connectionString: url });
const passwords = new Map();
const initial = "InitialPassword99";
function session(user) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      iat: now,
      exp: now + 3600,
      session_id: randomUUID(),
    },
    "test-signature",
  ]
    .map((v) =>
      Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString(
        "base64url",
      ),
    )
    .join(".");
  return {
    access_token: jwt,
    refresh_token: randomUUID(),
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
    },
  };
}
createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  function send(status, value) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(value));
  }
  try {
    if (path.endsWith("/logout")) return send(200, {});
    if (path.includes("/admin/users")) {
      const id =
        path.split("/").at(-1) === "users" ? body.id : path.split("/").at(-1);
      if (body.password === "ProviderFailure99")
        return send(503, { message: "Simulated provider failure" });
      passwords.set(id, body.password);
      return send(200, {
        id,
        email: body.email || "test@test.invalid",
        aud: "authenticated",
        created_at: new Date().toISOString(),
      });
    }
    const user = (
      await db.query("select * from plu_private.users where email=$1", [
        body.email,
      ])
    ).rows[0];
    if (!user) return send(400, { message: "Invalid credentials" });
    if (path.endsWith("/token"))
      return body.password === (passwords.get(user.id) || initial)
        ? send(200, session(user))
        : send(400, { message: "Invalid credentials" });
    if (path.endsWith("/otp")) return send(200, {});
    if (path.endsWith("/verify"))
      return body.token === "123456"
        ? send(200, session(user))
        : send(400, { message: "Invalid code" });
    send(404, { message: "Unknown provider endpoint" });
  } catch {
    send(500, { message: "Test provider error" });
  }
}).listen(55440, "127.0.0.1", () =>
  console.log(
    "Isolated test Auth double listening on loopback:55440. No email is sent.",
  ),
);
