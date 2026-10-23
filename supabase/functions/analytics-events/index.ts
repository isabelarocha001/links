const MAX_BODY_BYTES = 256 * 1024
const encoder = new TextEncoder()

type JsonObject = Record<string, unknown>

function json(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

function record(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null
}

function normalizeSyncPayEvent(value: unknown): string | null {
  const event = String(value ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[_.\s—–]+/g, "-").replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!event || event.length > 120) return null
  if (event.includes("cash-in") || event.includes("cashin") || event.includes("recebimento")) return "cash-in"
  if (event.includes("cash-out") || event.includes("cashout")) return "cash-out"
  if (event.includes("med") || event.includes("infracao")) return "med"
  if (event.includes("transacao") || event.startsWith("transaction")) return "transaction"
  if (event.includes("assinatura") || event.startsWith("subscription")) {
    if (event.includes("atraso") || event.includes("overdue") || event.includes("late")) return "subscription-overdue"
    if (event.includes("suspensa") || event.includes("suspended")) return "subscription-suspended"
    if (event.includes("cancelada") || event.includes("cancelled") || event.includes("canceled")) return "subscription-cancelled"
    if (event.includes("reativada") || event.includes("reactivated")) return "subscription-reactivated"
    if (event.includes("renovada") || event.includes("renewed") || event.includes("renewal")) return "subscription-renewed"
    if (event.includes("expirada") || event.includes("expired")) return "subscription-expired"
    if (event.includes("ativada") || event.includes("activated")) return "subscription-activated"
  }
  return event
}

// Only transaction/operational fields needed for event analytics are retained.
// Customer data, Pix keys/codes, addresses, and arbitrary provider fields are dropped.
const SAFE_FIELDS = [
  "id", "transaction_id", "transactionId", "status", "amount", "value",
  "currency", "payment_method", "paymentMethod", "method", "created_at",
  "createdAt", "updated_at", "updatedAt", "paid_at", "paidAt", "expires_at",
  "expiresAt", "external_id", "externalId", "reference_id", "referenceId",
  "identifier", "previous_status", "previousStatus", "subscription_id", "subscriptionId",
  "net_amount", "netAmount", "refunded_at", "refundedAt", "origin", "end_to_end_id",
] as const

function safeTransactionData(body: JsonObject): JsonObject {
  const output: JsonObject = {}
  const data = record(body.data)
  const transaction = record(body.transaction) || record(data?.transaction)
  const subscription = record(body.subscription) || record(data?.subscription)
  const candidates = [body, data, transaction, subscription].filter((item): item is JsonObject => item !== null)
  for (const candidate of candidates) {
    for (const key of SAFE_FIELDS) {
      const value = candidate[key]
      if (value === null || value === undefined) continue
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        output[key] = typeof value === "string" ? value.slice(0, 300) : value
      }
    }
  }
  return output
}

function transactionId(body: JsonObject): string | null {
  const data = record(body.data)
  const transaction = record(body.transaction) || record(data?.transaction)
  const subscription = record(body.subscription) || record(data?.subscription)
  const value = body.event_id ?? body.transaction_id ?? body.transactionId ?? body.id ??
    data?.event_id ?? data?.transaction_id ?? data?.transactionId ?? data?.id ??
    transaction?.reference_id ?? transaction?.id ?? subscription?.reference_id ?? subscription?.id ?? null
  if (value === null || value === undefined) return null
  const id = String(value).trim()
  return id && id.length <= 200 ? id : null
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405)

  const authorization = request.headers.get("authorization") || ""
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || ""
  const provided = request.headers.get("x-webhook-secret")?.trim() || bearer
  if (!provided) return json({ ok: false, error: "unauthorized" }, 401)

  const cashInToken = Deno.env.get("SYNCPAY_CASHIN_WEBHOOK_TOKEN") || ""
  const cashOutToken = Deno.env.get("SYNCPAY_CASHOUT_WEBHOOK_TOKEN") || ""
  let configuredTokens: string[] = []
  let configuredEventTokens: Array<{ eventType: string; token: string }> = []
  try {
    const parsed = JSON.parse(Deno.env.get("SYNCPAY_WEBHOOK_TOKENS") || "[]")
    if (Array.isArray(parsed)) {
      configuredTokens = parsed.filter((item) => typeof item === "string" && item.length > 0)
      // Compatibility with the four-token list created before event names were stored.
      const legacyEventOrder = [
        "transaction",
        "subscription-activated",
        "subscription-overdue",
        "subscription-suspended",
      ]
      configuredEventTokens = configuredTokens.flatMap((token, index) => {
        const eventType = legacyEventOrder[index]
        return eventType ? [{ eventType, token }] : []
      })
    } else {
      const tokenMap = record(parsed)
      if (!tokenMap) throw new Error("Expected an array or event-to-token object")
      configuredEventTokens = Object.entries(tokenMap).flatMap(([eventName, token]) => {
        const eventType = normalizeSyncPayEvent(eventName)
        return typeof token === "string" && token.length > 0 && eventType
          ? [{ eventType, token }]
          : []
      })
    }
  } catch {
    console.error("SYNCPAY_WEBHOOK_TOKENS must be a JSON array or event-to-token object")
    return json({ ok: false, error: "webhook_not_configured" }, 503)
  }
  const sharedSecret = Deno.env.get("ANALYTICS_EVENTS_WEBHOOK_SECRET") || ""
  let authenticatedEvent: "cash-in" | "cash-out" | null = null
  if (cashInToken && constantTimeEqual(provided, cashInToken)) authenticatedEvent = "cash-in"
  else if (cashOutToken && constantTimeEqual(provided, cashOutToken)) authenticatedEvent = "cash-out"
  const tokenEvent = configuredEventTokens.find(({ token }) => constantTimeEqual(provided, token))?.eventType || null
  const authenticatedSyncPay = Boolean(authenticatedEvent || tokenEvent) ||
    configuredTokens.some((token) => constantTimeEqual(provided, token))
  if (!authenticatedSyncPay && (!sharedSecret || !constantTimeEqual(provided, sharedSecret))) {
    return json({ ok: false, error: "unauthorized" }, 401)
  }

  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413)
  const rawBody = await request.text()
  if (encoder.encode(rawBody).length > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413)

  let body: JsonObject
  try {
    const parsed: unknown = JSON.parse(rawBody)
    const parsedObject = record(parsed)
    if (!parsedObject) return json({ ok: false, error: "expected_json_object" }, 400)
    body = parsedObject
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400)
  }

  const url = new URL(request.url)
  const headerEvent = request.headers.get("x-syncpay-event") || ""
  const rawEventType = String(headerEvent || url.searchParams.get("event_type") || body.event_type || body.type || body.event || "").trim()
  const hintedEvent = normalizeSyncPayEvent(
    headerEvent || url.searchParams.get("event_type") || body.event_type || body.type || body.event,
  )
  if (authenticatedEvent && hintedEvent && authenticatedEvent !== hintedEvent) {
    return json({ ok: false, error: "event_token_mismatch" }, 400)
  }
  if (tokenEvent && hintedEvent && hintedEvent !== "subscription" && tokenEvent !== hintedEvent) {
    return json({ ok: false, error: "event_token_mismatch" }, 400)
  }
  const eventType = tokenEvent || authenticatedEvent || hintedEvent ||
    (!rawEventType || rawEventType.length > 120 ? null : rawEventType)
  if (!eventType) return json({ ok: false, error: "invalid_event_type" }, 400)

  const isSyncPay = Boolean(authenticatedSyncPay || headerEvent || url.searchParams.has("event_type"))
  const txId = isSyncPay ? transactionId(body) : (() => {
    const value = body.event_id ?? body.id ?? null
    return value == null ? null : String(value).trim().slice(0, 200) || null
  })()
  const data = isSyncPay ? safeTransactionData(body) : body
  // Cash-in webhooks report status changes. Include status/time in the dedupe key
  // so a later update for the same payment is not discarded as a duplicate.
  const updateMarker = isSyncPay
    ? String(data.updated_at ?? data.updatedAt ?? data.status ?? data.previous_status ?? "created").slice(0, 55)
    : "created"
  const eventId = txId ? (isSyncPay ? `${eventType}:${txId.slice(0, 120)}:${updateMarker}`.slice(0, 200) : txId) : null

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase service credentials are unavailable")
    return json({ ok: false, error: "storage_not_configured" }, 503)
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/analytics_webhook_events?on_conflict=source,event_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        source: isSyncPay ? "syncpay" : (String(body.source || "agent").trim().slice(0, 80) || "agent"),
        event_id: eventId,
        event_type: eventType,
        payload: data,
      }),
    },
  )

  if (!response.ok) {
    console.error("Could not persist SyncPay webhook event", response.status)
    return json({ ok: false, error: "event_storage_failed" }, 502)
  }
  return json({ ok: true, received: true, event_type: eventType })
})
