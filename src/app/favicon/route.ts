import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db/queries";
import { buildDefaultLogoSvg } from "@/lib/default-logo";
import { resolveEffectiveShopLogo } from "@/lib/shop-logo";

let cached: {
  url: string;
  body: ArrayBuffer | string;
  contentType: string;
  expiresAt: number;
} | null = null;

function withCacheHeaders(body: ArrayBuffer | string, contentType: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}

function renderGeneratedLogo(seed: string, cacheKey: string) {
  const now = Date.now();
  if (cached && cached.url === cacheKey && cached.expiresAt > now) {
    return withCacheHeaders(cached.body, cached.contentType);
  }

  const body = buildDefaultLogoSvg(seed);
  cached = {
    url: cacheKey,
    body,
    contentType: "image/svg+xml",
    expiresAt: now + 6 * 60 * 60 * 1000,
  };
  return withCacheHeaders(body, "image/svg+xml");
}

export async function GET(request: Request) {
  let target = "";
  let logoUpdatedAt: string | null = null;
  let shopName = "";
  let instanceId = "";
  try {
    const [logo, logoSource, updatedAt, name, registryInstanceId] = await Promise.all([
      getSetting("shop_logo"),
      getSetting("shop_logo_source"),
      getSetting("shop_logo_updated_at"),
      getSetting("shop_name"),
      getSetting("registry_instance_id"),
    ]);
    target = resolveEffectiveShopLogo(logo, logoSource).effectiveLogo;
    logoUpdatedAt = updatedAt;
    shopName = (name || "").trim();
    instanceId = (registryInstanceId || "").trim();
  } catch {
    // best effort
  }

  const requestHost = new URL(request.url).host;
  const generatedSeed = [instanceId, shopName, requestHost].filter(Boolean).join("|") || "ldc-shop";
  const generatedKey = `generated:${generatedSeed}`;

  if (!target) {
    return renderGeneratedLogo(generatedSeed, generatedKey);
  }

  const isDataUrl = target.startsWith("data:")
  const baseUrl = isDataUrl
    ? target
    : target.startsWith("http://") || target.startsWith("https://")
    ? target
    : new URL(target, request.url).toString();
  const url = isDataUrl ? baseUrl : (() => {
    if (!logoUpdatedAt) return baseUrl;
    try {
      const u = new URL(baseUrl);
      u.searchParams.set("v", logoUpdatedAt);
      return u.toString();
    } catch {
      return baseUrl;
    }
  })();
  const cacheKey = isDataUrl && logoUpdatedAt ? `${baseUrl}#${logoUpdatedAt}` : url;

  try {
    const now = Date.now();
    if (cached && cached.url === cacheKey && cached.expiresAt > now) {
      return withCacheHeaders(cached.body, cached.contentType);
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch_failed");
    const contentType = res.headers.get("content-type") || "image/png";
    const body = await res.arrayBuffer();
    cached = {
      url: cacheKey,
      body,
      contentType,
      expiresAt: now + 6 * 60 * 60 * 1000,
    };
    return withCacheHeaders(body, contentType);
  } catch {
    return renderGeneratedLogo(generatedSeed, generatedKey);
  }
}
