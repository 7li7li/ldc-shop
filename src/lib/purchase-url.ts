export const PURCHASE_URL_MAX_LENGTH = 2048

export function getSafePurchaseUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null

    const url = value.trim()
    if (!url || url.length > PURCHASE_URL_MAX_LENGTH) return null
    if (!/^https?:\/\//i.test(url)) return null

    try {
        const parsed = new URL(url)
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname) return null
        return url
    } catch {
        return null
    }
}

export function validatePurchaseUrl(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (!raw) return null

    const url = getSafePurchaseUrl(raw)
    if (!url) {
        throw new Error('invalid_purchase_url')
    }
    return url
}
