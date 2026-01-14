import { getSetting } from "@/lib/db/queries"
import { AdminExportContent } from "@/components/admin/export-content"

export default async function AdminExportPage() {
  let shopName: string | null = null
  try {
    shopName = await getSetting("shop_name")
  } catch {
    shopName = null
  }

  return <AdminExportContent shopName={shopName} />
}

