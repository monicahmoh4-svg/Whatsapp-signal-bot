// ─── Direct Whapi.Cloud client (runs in the browser) ─────────────────────────
// Messages are sent directly from the user's browser to gate.whapi.cloud.
// This bypasses the Vercel backend entirely, which solves the issue where
// messages appeared to succeed on the server but never arrived in WhatsApp
// (Vercel's serverless network egress may block outbound calls to Whapi).
//
// The API token is stored only in the user's browser (localStorage) and is
// sent directly to Whapi — it never touches our backend server.

const WHAPI = "https://gate.whapi.cloud";

async function whapiCall(
  token: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: object
): Promise<any> {
  if (!token?.trim()) throw new Error("Whapi API token is missing. Go to Settings and add your token.");

  const isBody = method === "POST" || method === "PUT";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/json",
  };
  if (isBody && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${WHAPI}${endpoint}`, {
    method,
    headers,
    ...(isBody && body ? { body: JSON.stringify(body) } : {}),
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "(unreadable)");
    throw new Error(
      `Whapi returned non-JSON (HTTP ${res.status}). ` +
      `Check that your API token is correct. Body: ${txt.substring(0, 200)}`
    );
  }

  const data = await res.json();

  // Surface Whapi error messages
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || data?.message;
    throw new Error(typeof msg === "string" ? msg : `Whapi error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

// Sanitize group ID — always needs @g.us suffix for groups
export function sanitizeGroupId(id: string): string {
  const clean = (id || "").trim().replace(/\s+/g, "");
  if (!clean) return clean;
  if (clean.endsWith("@g.us")) return clean;
  if (clean.includes("@")) return clean.split("@")[0] + "@g.us";
  return clean + "@g.us";
}

// ── Get all groups the connected number is in ─────────────────────────────────
export async function whapiGetGroups(token: string): Promise<{
  id: string; name: string; participants: number; isAdmin: boolean;
}[]> {
  const data = await whapiCall(token, "/groups?count=100", "GET");
  const raw = Array.isArray(data) ? data : (data.groups || data.items || []);
  return raw.map((g: any) => ({
    id: g.id,
    name: g.subject || g.name || g.id,
    participants: g.size || g.participants_count || 0,
    isAdmin: g.is_admin || g.isAdmin || false,
  }));
}

// ── Verify token is valid by checking channel health ─────────────────────────
export async function whapiVerify(token: string): Promise<{
  phone: string; name: string; status: string;
}> {
  const data = await whapiCall(token, "/health", "GET");
  return {
    phone: data.account_info?.phone || data.phone || "Connected",
    name: data.account_info?.name || data.name || "WhatsApp Account",
    status: data.status?.status || data.status || "ok",
  };
}

// ── Send a text message to a group ───────────────────────────────────────────
export async function whapiSend(
  token: string,
  groupId: string,
  text: string
): Promise<{ success: boolean; messageId: string }> {
  const cleanId = sanitizeGroupId(groupId);
  if (!cleanId) throw new Error("Group ID is missing or invalid.");

  const data = await whapiCall(token, "/messages/text", "POST", {
    to: cleanId,
    body: text,
  });

  // Whapi success response: { sent: true, message: { id: "..." } }
  const msgId = data?.message?.id || data?.id || "sent";

  if (data.error) {
    const errMsg = typeof data.error === "string" ? data.error : data.error?.message || JSON.stringify(data.error);
    throw new Error(errMsg);
  }

  if (!data.sent && !data.message?.id && !data.id) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : `Message not delivered to group ${cleanId}. Check that your WhatsApp number is a member of the group and the token is correct.`
    );
  }

  return { success: true, messageId: msgId };
}

// ── Delete a message (used for auto-delete after 10 minutes) ─────────────────
export async function whapiDelete(token: string, messageId: string): Promise<void> {
  try {
    await whapiCall(token, `/messages/${messageId}`, "DELETE");
  } catch {
    // Already deleted = fine, ignore
  }
}

// ── Send a test connection message ────────────────────────────────────────────
export async function whapiTest(
  token: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; messageId: string; groupName: string }> {
  const text =
    `✅ *WhatsApp Signal Bot Connected!*\n\n` +
    `Your dashboard is now linked to *${groupName || groupId}*.\n` +
    `Trading alerts will be delivered here automatically.\n\n` +
    `⏰ _Verified: ${new Date().toUTCString()}_`;

  const result = await whapiSend(token, groupId, text);
  return { ...result, groupName: groupName || groupId };
}
