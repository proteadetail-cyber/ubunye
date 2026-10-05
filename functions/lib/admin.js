const HERO = ["heroKicker", "heroTitle", "heroText", "ctaPrimary", "ctaSecondary"];
const SET = ["email", "phone", "mickPhone", "whatsapp", "provinces", "title", "analytics"];
const ROLES = new Set(["director", "dev"]);

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

async function rows(db, sql) {
  const result = await db.prepare(sql).all();
  return result.results;
}

export async function load(db) {
  const [services, faq, proof, settings, courses] = await Promise.all([
    rows(db, "SELECT * FROM services ORDER BY sort_order,id"),
    rows(db, "SELECT * FROM faq ORDER BY sort_order,id"),
    rows(db, "SELECT * FROM proof ORDER BY sort_order,id"),
    rows(db, "SELECT * FROM settings"),
    rows(db, "SELECT * FROM training_courses ORDER BY sort_order,id"),
  ]);
  const values = Object.fromEntries(settings.map((item) => [item.key, item.value]));
  const content = { faq: faq.map((item) => ({ q: item.question, a: item.answer })) };
  HERO.forEach((key) => (content[key] = values[key] ?? ""));
  const siteSettings = { maint: values.maint === "1" };
  SET.forEach((key) => (siteSettings[key] = values[key] ?? ""));

  return {
    content,
    settings: siteSettings,
    services: services.map((item) => ({
      t: item.title,
      d: item.description,
      v: Boolean(item.visible),
    })),
    courses: courses.map((item) => ({ t: item.title, v: Boolean(item.visible) })),
    proof: proof.map((item) => ({
      t: item.title,
      d: item.details,
      ok: Boolean(item.verified),
      pub: Boolean(item.published),
    })),
  };
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value, maxLength) =>
  typeof value === "string" && value.length <= maxLength;

function validateItems(items, label, fields, maxItems) {
  if (!Array.isArray(items) || items.length > maxItems) {
    return `${label} must contain at most ${maxItems} items.`;
  }

  for (const item of items) {
    if (!isObject(item)) return `${label} contains an invalid item.`;
    for (const [key, maxLength] of fields) {
      if (!text(item[key], maxLength)) return `${label} contains an invalid ${key} field.`;
    }
    if (Object.hasOwn(item, "v") && typeof item.v !== "boolean") {
      return `${label} visibility must be true or false.`;
    }
    if (Object.hasOwn(item, "ok") && typeof item.ok !== "boolean") {
      return `${label} verification must be true or false.`;
    }
    if (Object.hasOwn(item, "pub") && typeof item.pub !== "boolean") {
      return `${label} publication status must be true or false.`;
    }
  }
  return "";
}

function validateBody(body) {
  if (!isObject(body) || !isObject(body.content) || !isObject(body.settings)) {
    return "The request body is missing content or settings.";
  }
  for (const key of HERO) {
    if (!text(body.content[key], 4000)) return `The ${key} field is invalid.`;
  }
  if (typeof body.content.faq === "undefined") return "FAQ content is required.";

  const collections = [
    validateItems(body.services, "Services", [["t", 160], ["d", 2000]], 30),
    validateItems(body.courses, "Courses", [["t", 160]], 30),
    validateItems(body.content.faq, "FAQs", [["q", 500], ["a", 4000]], 50),
    validateItems(body.proof, "Proof", [["t", 160], ["d", 4000]], 50),
  ];
  const invalid = collections.find(Boolean);
  if (invalid) return invalid;

  for (const key of SET) {
    if (!text(body.settings[key], 500)) return `The ${key} setting is invalid.`;
  }
  if (typeof body.settings.maint !== "boolean") return "Maintenance mode must be true or false.";
  return "";
}

async function save(db, body) {
  const string = (value) => String(value ?? "");
  const settingValues = [
    ...HERO.map((key) => [key, string(body.content[key])]),
    ...SET.map((key) => [key, string(body.settings[key])]),
    ["maint", body.settings.maint ? "1" : "0"],
  ];
  const statements = [
    db.prepare("DELETE FROM services"),
    db.prepare("DELETE FROM training_courses"),
    db.prepare("DELETE FROM faq"),
    db.prepare("DELETE FROM proof"),
    ...body.services.map((item, index) =>
      db.prepare("INSERT INTO services (title,description,visible,sort_order) VALUES (?,?,?,?)")
        .bind(string(item.t), string(item.d), item.v ? 1 : 0, index)),
    ...body.courses.map((item, index) =>
      db.prepare("INSERT INTO training_courses (title,visible,sort_order) VALUES (?,?,?)")
        .bind(string(item.t), item.v ? 1 : 0, index)),
    ...body.content.faq.map((item, index) =>
      db.prepare("INSERT INTO faq (question,answer,sort_order) VALUES (?,?,?)")
        .bind(string(item.q), string(item.a), index)),
    ...body.proof.map((item, index) =>
      db.prepare("INSERT INTO proof (title,details,verified,published,sort_order) VALUES (?,?,?,?,?)")
        .bind(string(item.t), string(item.d), item.ok ? 1 : 0, item.ok && item.pub ? 1 : 0, index)),
    ...settingValues.map(([key, value]) =>
      db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
        .bind(key, value)),
  ];
  await db.batch(statements);
}

const hex = (bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
const fromHex = (value) => {
  if (typeof value !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error("Invalid stored password hash.");
  }
  return Uint8Array.from(value.match(/../g), (part) => Number.parseInt(part, 16));
};

async function verify(db, role, password) {
  if (!ROLES.has(role) || typeof password !== "string" || !password || password.length > 200) {
    return false;
  }
  const user = await db.prepare("SELECT salt,hash,iterations FROM users WHERE role=?")
    .bind(role).first();
  if (!user || !Number.isInteger(user.iterations) || user.iterations < 100000) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(user.salt),
      iterations: user.iterations,
    },
    key,
    256,
  ));
  const expected = fromHex(user.hash);
  if (expected.length !== bits.length) return false;
  let difference = 0;
  for (let index = 0; index < bits.length; index++) difference |= bits[index] ^ expected[index];
  return difference === 0;
}

export async function handleAdminApi(request, env) {
  const { pathname } = new URL(request.url);
  if (!env.DB) return json({ error: "The admin database binding is not configured." }, 503);

  if (pathname === "/admin/api/public") {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
    const data = await load(env.DB);
    const { email, phone, mickPhone, whatsapp, provinces } = data.settings;
    return json({
      content: data.content,
      settings: { email, phone, mickPhone, whatsapp, provinces },
      services: data.services.filter((item) => item.v),
      courses: data.courses.filter((item) => item.v),
      proof: data.proof.filter((item) => item.ok && item.pub),
    });
  }

  if (pathname !== "/admin/api/data") return json({ error: "Not found." }, 404);
  const authorization = request.headers.get("authorization") || "";
  const role = request.headers.get("x-role") || "";
  if (!authorization.startsWith("Bearer ") || !ROLES.has(role)) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!(await verify(env.DB, role, authorization.slice(7)))) {
    return json({ error: "Unauthorized." }, 401);
  }

  if (request.method === "GET") return json(await load(env.DB));
  if (request.method !== "PUT") return json({ error: "Method not allowed." }, 405);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 256 * 1024) return json({ error: "Request is too large." }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }
  const invalid = validateBody(body);
  if (invalid) return json({ error: invalid }, 400);

  if (role !== "dev") {
    const current = await load(env.DB);
    body.settings.title = current.settings.title;
    body.settings.analytics = current.settings.analytics;
    body.settings.maint = current.settings.maint;
  }
  await save(env.DB, body);
  return json({ ok: true });
}
