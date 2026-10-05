import { handleAdminApi, json } from "../../lib/admin.js";

export async function onRequest({ request, env }) {
  try {
    return await handleAdminApi(request, env);
  } catch (error) {
    console.error("Admin public-data request failed", error);
    return json({ error: "The admin service is temporarily unavailable." }, 500);
  }
}
