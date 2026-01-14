import { getCategories } from "@/lib/db/queries"
import { AdminCategoriesContent } from "@/components/admin/categories-content"

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await getCategories()
  return <AdminCategoriesContent categories={categories} />
}

