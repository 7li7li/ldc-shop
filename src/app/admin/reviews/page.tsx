import { db } from "@/lib/db"
import { products, reviews, reviewReplies } from "@/lib/db/schema"
import { desc, eq, inArray } from "drizzle-orm"
import { AdminReviewsContent } from "@/components/admin/reviews-content"
import { Suspense } from "react"

async function ReviewsContent() {
  const rows = await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      productName: products.name,
      orderId: reviews.orderId,
      userId: reviews.userId,
      username: reviews.username,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt))
    .limit(100)

  const reviewIds = rows.map((r: any) => r.id).filter(Boolean)
  const replyRows = reviewIds.length
    ? await db
      .select({
        id: reviewReplies.id,
        reviewId: reviewReplies.reviewId,
        userId: reviewReplies.userId,
        username: reviewReplies.username,
        comment: reviewReplies.comment,
        createdAt: reviewReplies.createdAt,
      })
      .from(reviewReplies)
      .where(inArray(reviewReplies.reviewId, reviewIds))
      .orderBy(desc(reviewReplies.createdAt))
    : []

  const replyMap = new Map<number, Array<{
    id: number
    reviewId: number
    userId: string
    username: string
    comment: string
    createdAt: Date | null
  }>>()

  for (const reply of replyRows as any[]) {
    const list = replyMap.get(reply.reviewId) ?? []
    list.push({
      id: reply.id,
      reviewId: reply.reviewId,
      userId: reply.userId,
      username: reply.username,
      comment: reply.comment,
      createdAt: reply.createdAt,
    })
    replyMap.set(reply.reviewId, list)
  }

  return (
    <AdminReviewsContent
      reviews={rows.map((r: any) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName || r.productId,
        orderId: r.orderId,
        userId: r.userId,
        username: r.username,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        replies: replyMap.get(r.id) || [],
      }))}
    />
  )
}

function ReviewsFallback() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 rounded-md bg-muted/60 animate-pulse" />
      <div className="h-20 w-full rounded-xl bg-muted/40 animate-pulse" />
      <div className="h-20 w-full rounded-xl bg-muted/40 animate-pulse" />
      <div className="h-20 w-full rounded-xl bg-muted/40 animate-pulse" />
    </div>
  )
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<ReviewsFallback />}>
      <ReviewsContent />
    </Suspense>
  )
}
