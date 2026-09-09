function normalizeHost(host: string): string {
    return host.trim().toLowerCase().replace(/\.$/, "")
}

export function isLikelyLinuxDoAvatarUrl(url: string | null | undefined): boolean {
    const trimmed = (url || "").trim()
    if (!trimmed) return false

    try {
        const parsed = new URL(trimmed)
        const host = normalizeHost(parsed.hostname)
        const path = parsed.pathname.toLowerCase()
        const isLinuxDoHost = host === "linux.do" || host.endsWith(".linux.do")
        const looksLikeAvatarPath =
            path.includes("/user_avatar/") ||
            path.includes("/letter_avatar/") ||
            path.includes("/avatar/")

        return isLinuxDoHost && looksLikeAvatarPath
    } catch {
        return false
    }
}

export function resolveEffectiveShopLogo(rawLogo: string | null | undefined, source: string | null | undefined) {
    const logo = (rawLogo || "").trim()
    const normalizedSource = (source || "").trim().toLowerCase()
    const isGenerated = normalizedSource === "generated"
    const isCustom = normalizedSource === "custom"
    const isLegacyAuto = !isCustom && isLikelyLinuxDoAvatarUrl(logo)
    const effectiveLogo = !logo || isGenerated || isLegacyAuto ? "" : logo

    return {
        rawLogo: logo,
        effectiveLogo,
        isCustom,
        isGenerated,
        isLegacyAuto,
    }
}

export function buildShopFaviconUrl(origin: string, logoUpdatedAt?: string | null) {
    const normalizedOrigin = origin.replace(/\/+$/, "")
    if (!logoUpdatedAt) {
        return `${normalizedOrigin}/favicon`
    }
    return `${normalizedOrigin}/favicon?v=${encodeURIComponent(logoUpdatedAt)}`
}
