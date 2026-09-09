const PRODUCT_IMAGE_DATA_URL_PREFIX = 'data:'

export const PRODUCT_GALLERY_MAX_ITEMS = 8
export const PRODUCT_IMAGE_MAX_DATA_URL_LENGTH = 900_000
export const PRODUCT_IMAGE_MAX_URL_LENGTH = 2_000
export const PRODUCT_GALLERY_MAX_JSON_LENGTH = 1_200_000

export function normalizeProductImageRefs(values: Array<string | null | undefined>) {
    const seen = new Set<string>()
    const normalized: string[] = []

    for (const value of values) {
        const image = String(value || '').trim()
        if (!image || seen.has(image)) continue
        seen.add(image)
        normalized.push(image)
    }

    return normalized
}

export function parseStoredProductImages(raw: string | null | undefined) {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return normalizeProductImageRefs(parsed.filter((item) => typeof item === 'string'))
    } catch {
        return []
    }
}

export function buildProductImageGallery(primaryImage: string | null | undefined, rawProductImages: string | null | undefined) {
    return normalizeProductImageRefs([primaryImage, ...parseStoredProductImages(rawProductImages)])
}

export function splitProductImageGallery(primaryImage: string | null | undefined, rawProductImages: string | null | undefined) {
    const gallery = buildProductImageGallery(primaryImage, rawProductImages)
    return {
        primaryImage: gallery[0] || '',
        additionalImages: gallery.slice(1),
        additionalImagesJson: gallery.length > 1 ? JSON.stringify(gallery.slice(1)) : null,
    }
}

export function validateProductImageRef(value: string, label: string) {
    const image = String(value || '').trim()
    if (!image) return

    if (image.startsWith(PRODUCT_IMAGE_DATA_URL_PREFIX)) {
        if (!image.startsWith('data:image/')) {
            throw new Error(`${label} must be an image`)
        }
        if (image.length > PRODUCT_IMAGE_MAX_DATA_URL_LENGTH) {
            throw new Error(`${label} is too large`)
        }
        return
    }

    if (image.length > PRODUCT_IMAGE_MAX_URL_LENGTH) {
        throw new Error(`${label} URL is too long`)
    }
}
