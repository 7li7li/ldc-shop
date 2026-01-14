'use client'

import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

function downloadUrl(params: Record<string, string>) {
  const search = new URLSearchParams(params)
  return `/admin/export/download?${search.toString()}`
}

export function AdminExportContent({ shopName }: { shopName: string | null }) {
  const { t } = useI18n()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.export.title')}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t('admin.export.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" />{t('admin.export.orders')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "orders", format: "csv" })}>{t('admin.export.csv')}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "orders", format: "json" })}>{t('admin.export.json')}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "orders", format: "csv", includeSecrets: "1" })}>{t('admin.export.csvWithSecrets')}</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" />{t('admin.export.products')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "products", format: "json" })}>{t('admin.export.json')}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "products", format: "csv" })}>{t('admin.export.csv')}</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" />{t('admin.export.reviews')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "reviews", format: "csv" })}>{t('admin.export.csv')}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "reviews", format: "json" })}>{t('admin.export.json')}</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" />{t('admin.export.settings')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "settings", format: "json" })}>{t('admin.export.json')}</a>
            </Button>
            {shopName && (
              <p className="text-xs text-muted-foreground w-full mt-2">
                {t('admin.export.currentShopName')}: <span className="font-medium text-foreground">{shopName}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" />{t('admin.export.fullDump')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "full", format: "json" })}>{t('admin.export.json')}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={downloadUrl({ type: "full", format: "sql" })}>{t('admin.export.d1Sql')}</a>
            </Button>
            <p className="text-xs text-muted-foreground w-full mt-2">{t('admin.export.fullDumpHint')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

