import { db } from "@/lib/db"
import { products, reviews } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { AdminReviewsContent } from "@/components/admin/reviews-content"

export default async function AdminReviewsPage() {
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
      }))}
    />
  )
}

