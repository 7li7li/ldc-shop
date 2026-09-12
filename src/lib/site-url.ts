import { headers } from "next/headers"

function normalizeBaseUrl(value: string | undefined | null) {
    const trimmed = value?.trim()
    if (!trimmed) return null
    return trimmed.replace(/\/+$/, '')
}

function isLocalhostUrl(value: string) {
    try {
        const url = new URL(value)
        return url.hostname === 'localhost' ||
            url.hostname === '127.0.0.1' ||
            url.hostname === '::1' ||
            url.hostname === '0.0.0.0'
    } catch {
        return false
    }
}

export async function resolveSiteBaseUrl() {
    // APP_URL is a server-only runtime setting. Prefer it over NEXT_PUBLIC_APP_URL,
    // which Next.js may have inlined from an older build environment.
    const configured = normalizeBaseUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)

    const headerList = await headers()
    const forwardedProto = headerList.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const forwardedHost = headerList.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || headerList.get('host')?.trim()
    const proto = forwardedProto || (host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https')
    const requestBaseUrl = host ? normalizeBaseUrl(`${proto}://${host}`) : null

    if (configured && (!isLocalhostUrl(configured) || !requestBaseUrl || isLocalhostUrl(requestBaseUrl))) {
        return configured
    }

    if (requestBaseUrl) return requestBaseUrl

    if (configured) return configured
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing NEXT_PUBLIC_APP_URL or APP_URL for payment callback URLs')
    }

    return 'http://localhost:3000'
}
