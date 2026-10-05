import { handleAdminApi, json } from "./lib/admin.js";

export async function onRequest(context) {
  const { request, env } = context;
  const pathname = new URL(request.url).pathname;

  if (pathname !== "/admin/api/public" && pathname !== "/admin/api/data") {
    return context.next();
  }

  try {
    return await handleAdminApi(request, env);
  } catch (error) {
    console.error("Admin API request failed", error);
    return json({ error: "The admin service is temporarily unavailable." }, 500);
  }
}
