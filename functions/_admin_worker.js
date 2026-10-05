const HERO = ["heroKicker", "heroTitle", "heroText", "ctaPrimary", "ctaSecondary"];
const SET = ["email", "phone", "whatsapp", "provinces", "title", "analytics"];
const json = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...h } });

async function load(db) {
  const q = (t) => db.prepare(t).all().then((r) => r.results);
  const [sv, fq, pf, st] = await Promise.all([
    q("SELECT * FROM services ORDER BY sort_order,id"),
    q("SELECT * FROM faq ORDER BY sort_order,id"),
    q("SELECT * FROM proof ORDER BY sort_order,id"),
    q("SELECT * FROM settings"),
  ]);
  const kv = Object.fromEntries(st.map((r) => [r.key, r.value]));
  const content = { faq: fq.map((r) => ({ q: r.question, a: r.answer })) };
  HERO.forEach((k) => (content[k] = kv[k] ?? ""));
  const settings = { maint: kv.maint === "1" };
  SET.forEach((k) => (settings[k] = kv[k] ?? ""));
  return {
    content, settings,
    services: sv.map((r) => ({ t: r.title, d: r.description, v: !!r.visible })),
    proof: pf.map((r) => ({ t: r.title, d: r.details, ok: !!r.verified, pub: !!r.published })),
  };
}

async function save(db, b) {
  const s = (x) => String(x ?? "");
  const st = [...HERO.map((k) => [k, s(b.content[k])]), ...SET.map((k) => [k, s(b.settings[k])]), ["maint", b.settings.maint ? "1" : "0"]];
  await db.batch([
    db.prepare("DELETE FROM services"), db.prepare("DELETE FROM faq"), db.prepare("DELETE FROM proof"), db.prepare("DELETE FROM settings"),
    ...b.services.map((r, i) => db.prepare("INSERT INTO services (title,description,visible,sort_order) VALUES (?,?,?,?)").bind(s(r.t), s(r.d), r.v ? 1 : 0, i)),
    ...b.content.faq.map((r, i) => db.prepare("INSERT INTO faq (question,answer,sort_order) VALUES (?,?,?)").bind(s(r.q), s(r.a), i)),
    // unverified proof can never be published
    ...b.proof.map((r, i) => db.prepare("INSERT INTO proof (title,details,verified,published,sort_order) VALUES (?,?,?,?,?)").bind(s(r.t), s(r.d), r.ok ? 1 : 0, r.ok && r.pub ? 1 : 0, i)),
    ...st.map(([k, v]) => db.prepare("INSERT INTO settings (key,value) VALUES (?,?)").bind(k, v)),
  ]);
}

// Passwords are stored in D1 (table "users") as salted PBKDF2-SHA256 hashes.
const okCache = new Set(); // per-isolate cache of verified logins, avoids re-hashing on every autosave
const hex = (s) => Uint8Array.from(s.match(/../g).map((x) => parseInt(x, 16)));
async function verify(db, role, pw) {
  if (!pw || pw.length > 200) return false;
  const ck = role + "\0" + pw;
  if (okCache.has(ck)) return true;
  const u = await db.prepare("SELECT salt,hash,iterations FROM users WHERE role=?").bind(role).first();
  if (!u) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hex(u.salt), iterations: u.iterations }, key, 256));
  const want = hex(u.hash);
  let d = 0;
  for (let i = 0; i < 32; i++) d |= bits[i] ^ want[i];
  if (d === 0) okCache.add(ck);
  return d === 0;
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/admin/api/public") {
      const d = await load(env.DB);
      return json(
        { content: d.content, settings: d.settings, services: d.services.filter((x) => x.v), proof: d.proof.filter((x) => x.ok && x.pub) },
        200, { "access-control-allow-origin": "https://ubunye.weybrand.co.za" }
      );
    }
    if (u.pathname === "/admin/api/data") {
      const auth = req.headers.get("authorization") || "";
      const role = req.headers.get("x-role") === "dev" ? "dev" : "director";
      if (!auth.startsWith("Bearer ") || !(await verify(env.DB, role, auth.slice(7)))) return json({ error: "unauthorized" }, 401);
      if (req.method === "GET") return json(await load(env.DB));
      if (req.method === "PUT") {
        try {
          const b = await req.json();
          if (role !== "dev") {
            // directors cannot change technical settings
            const c = await load(env.DB);
            b.settings.title = c.settings.title; b.settings.analytics = c.settings.analytics; b.settings.maint = c.settings.maint;
          }
          await save(env.DB, b);
        } catch (e) { return json({ error: "bad request" }, 400); }
        return json({ ok: true });
      }
      return json({ error: "method not allowed" }, 405);
    }
    return env.ASSETS.fetch(req);
  },
};
