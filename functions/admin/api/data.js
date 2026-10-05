import adminWorker from "../../_admin_worker.js";

export async function onRequest({ request, env }) {
  return adminWorker.fetch(request, env);
}
