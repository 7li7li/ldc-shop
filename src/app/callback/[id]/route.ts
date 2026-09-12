import { NextResponse } from "next/server"
import { resolveSiteBaseUrl } from "@/lib/site-url"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const orderId = (id || "").trim()
  const baseUrl = await resolveSiteBaseUrl()

  if (orderId) {
    return NextResponse.redirect(new URL(`/order/${orderId}`, baseUrl))
  }

  return NextResponse.redirect(new URL("/", baseUrl))
}
