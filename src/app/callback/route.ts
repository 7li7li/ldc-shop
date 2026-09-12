import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { resolveSiteBaseUrl } from "@/lib/site-url"

function normalizeOrderId(input: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  // Handle "123?out_trade_no=123" style junk
  if (trimmed.includes("?")) {
    return trimmed.split("?")[0] || null
  }
  return trimmed
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const queryOrder =
    normalizeOrderId(url.searchParams.get("out_trade_no")) ||
    normalizeOrderId(url.searchParams.get("order_no")) ||
    normalizeOrderId(url.searchParams.get("orderId"))

  let orderId = queryOrder
  if (!orderId) {
    const cookieStore = await cookies()
    orderId = normalizeOrderId(cookieStore.get("ldc_pending_order")?.value ?? null)
  }

  const destination = orderId ? `/order/${orderId}` : "/orders"

  // Never use the payment provider's request host as the redirect origin.
  // In Docker this can be `0.0.0.0:3000`, which is an internal bind address
  // and not reachable by the customer. Prefer the configured public URL.
  const baseUrl = await resolveSiteBaseUrl()
  return NextResponse.redirect(new URL(destination, baseUrl))
}
