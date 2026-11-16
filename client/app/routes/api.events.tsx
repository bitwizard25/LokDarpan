import type { ActionFunctionArgs } from "@remix-run/node";
import { getServerApiBaseUrl } from "~/lib/api";
import { getUserFromSession } from "~/services/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    const text = await request.text();
    if (text.length > 65536) {
      return new Response(null, { status: 413 });
    }

    const session = await getUserFromSession(request);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const base = getServerApiBaseUrl();
    await fetch(`${base}/recommendation-events`, {
      method: "POST",
      headers,
      body: text,
    });
  } catch {
    // Swallow tracking errors
  }

  return new Response(null, { status: 204 });
}
