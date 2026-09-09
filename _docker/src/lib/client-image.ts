const COMPRESSIBLE_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp',
])

function isImageFile(file: File) {
    const type = (file.type || '').toLowerCase()
    if (type.startsWith('image/')) return true
    return /\.(png|jpe?g|webp|gif|svg|ico|bmp)$/i.test(file.name || '')
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result)
                return
            }
            reject(new Error('image_read_failed'))
        }
        reader.onerror = () => reject(new Error('image_read_failed'))
        reader.readAsDataURL(blob)
    })
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file)
        const image = new Image()
        image.onload = () => {
            URL.revokeObjectURL(objectUrl)
            resolve(image)
        }
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('image_load_failed'))
        }
        image.src = objectUrl
    })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
                return
            }
            reject(new Error('image_compression_failed'))
        }, type, quality)
    })
}

export async function prepareUploadedImage(
    file: File,
    options: {
        maxBytes: number
        maxDimension: number
    }
) {
    if (!isImageFile(file)) {
        throw new Error('invalid_image_file')
    }

    if (file.size <= options.maxBytes) {
        return {
            dataUrl: await readBlobAsDataUrl(file),
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            wasCompressed: false,
        }
    }

    const fileType = (file.type || '').toLowerCase()
    if (!COMPRESSIBLE_IMAGE_TYPES.has(fileType)) {
        throw new Error('image_compression_unsupported')
    }

    const image = await loadImage(file)
    const largestSide = Math.max(image.naturalWidth || 0, image.naturalHeight || 0, 1)
    const dimensionScale = Math.min(1, options.maxDimension / largestSide)
    const outputTypes = fileType === 'image/jpeg' || fileType === 'image/jpg'
        ? ['image/jpeg', 'image/webp']
        : fileType === 'image/webp'
            ? ['image/webp', 'image/jpeg']
            : ['image/webp', 'image/jpeg']

    const scaleCandidates = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.5, 0.4]
        .map((factor) => Math.max(0.1, Math.min(1, dimensionScale * factor)))
        .filter((value, index, arr) => arr.indexOf(value) === index)
    const qualityCandidates = [0.92, 0.86, 0.8, 0.74, 0.68, 0.6, 0.52, 0.44]

    for (const scale of scaleCandidates) {
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale))
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('image_compression_failed')
        }
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)

        for (const outputType of outputTypes) {
            for (const quality of qualityCandidates) {
                const blob = await canvasToBlob(canvas, outputType, quality)
                if (blob.size > options.maxBytes) continue

                return {
                    dataUrl: await readBlobAsDataUrl(blob),
                    mimeType: blob.type || outputType,
                    sizeBytes: blob.size,
                    wasCompressed: true,
                }
            }
        }
    }

    throw new Error('image_compression_failed')
}
