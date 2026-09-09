'use server'

import { auth } from "@/lib/auth"
import { canUserReview, getProductReviews } from "@/lib/db/queries"
import { getEmailSettings } from "@/lib/email"

interface BuyMetaReview {
    id: number
    username: string
    userId: string | null
    rating: number
    comment: string | null
    createdAt: string | null
    replies: Array<{
        id: number
        username: string
        userId: string | null
        comment: string
        createdAt: string | null
    }>
}

interface BuyPageMeta {
    reviews: BuyMetaReview[]
    averageRating: number
    reviewCount: number
    canReview: boolean
    reviewOrderId?: string
    emailConfigured: boolean
}

const EMPTY_BUY_META: BuyPageMeta = {
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
    canReview: false,
    reviewOrderId: undefined,
    emailConfigured: false,
}

function toIsoString(value: Date | string | null): string | null {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export async function getBuyPageMeta(productId: string): Promise<BuyPageMeta> {
    const id = productId.trim()
    if (!id) return { ...EMPTY_BUY_META }

    const session = await auth()

    const [rawReviews, emailSettings] = await Promise.all([
        getProductReviews(id).catch(() => [] as Array<{
            id: number
            username: string
            userId: string | null
            rating: number
            comment: string | null
            createdAt: Date | string | null
        }>),
        getEmailSettings().catch(() => ({ apiKey: null, fromEmail: null, enabled: false, fromName: null })),
    ])

    const reviews: BuyMetaReview[] = rawReviews.map((review: any) => ({
        id: Number(review.id),
        username: review.username || "",
        userId: review.userId || null,
        rating: Number(review.rating || 0),
        comment: review.comment || null,
        createdAt: toIsoString(review.createdAt),
        replies: Array.isArray((review as any).replies)
            ? (review as any).replies.map((reply: any) => ({
                id: Number(reply.id),
                username: reply.username || "",
                userId: reply.userId || null,
                comment: reply.comment || "",
                createdAt: toIsoString(reply.createdAt),
            }))
            : [],
    }))

    let canReview = false
    let reviewOrderId: string | undefined = undefined

    if (session?.user?.id) {
        try {
            const eligibility = await canUserReview(session.user.id, id, session.user.username || undefined)
            canReview = eligibility.canReview
            reviewOrderId = eligibility.orderId
        } catch {
            canReview = false
            reviewOrderId = undefined
        }
    }

    const reviewCount = reviews.length
    const averageRating = reviewCount > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : 0

    return {
        reviews,
        averageRating,
        reviewCount,
        canReview,
        reviewOrderId,
        emailConfigured: !!(emailSettings?.enabled && emailSettings?.apiKey && emailSettings?.fromEmail),
    }
}
