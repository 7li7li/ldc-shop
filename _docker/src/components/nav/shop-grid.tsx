"use client"

import Link from "next/link"
import { startTransition, useEffect, useMemo, useRef, useState } from "react"
import { ShopLogo } from "@/components/nav/shop-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"

const INITIAL_BATCH = 24
const LOAD_BATCH = 18

type NavigatorShop = {
    name: string
    url: string
    logo?: string | null
    description?: string | null
    updated_at?: number
}

export function ShopGrid({ shops }: { shops: NavigatorShop[] }) {
    const { t } = useI18n()
    const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_BATCH, shops.length))
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const hasMore = visibleCount < shops.length

    useEffect(() => {
        setVisibleCount(Math.min(INITIAL_BATCH, shops.length))
    }, [shops])

    const visibleShops = useMemo(() => shops.slice(0, visibleCount), [shops, visibleCount])

    const loadMore = () => {
        startTransition(() => {
            setVisibleCount((current) => Math.min(current + LOAD_BATCH, shops.length))
        })
    }

    useEffect(() => {
        if (!hasMore || !sentinelRef.current) return

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry?.isIntersecting) {
                    loadMore()
                }
            },
            { rootMargin: "320px 0px" }
        )

        observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [hasMore, visibleCount, shops.length])

    return (
        <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleShops.map((shop) => (
                    <Card key={shop.url} className="group h-full border-border/60 bg-background/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                        <CardHeader className="flex flex-row items-start gap-4">
                            <ShopLogo name={shop.name} url={shop.url} logo={shop.logo} updatedAt={shop.updated_at} />
                            <div className="flex flex-col gap-1">
                                <CardTitle className="text-lg leading-tight">{shop.name}</CardTitle>
                                <p className="text-xs text-muted-foreground break-all">{shop.url}</p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {shop.description || t('buy.noDescription')}
                            </p>
                            <Button asChild variant="outline" className="w-fit">
                                <Link href={shop.url} target="_blank" rel="noreferrer">
                                    {t('registry.visit')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {hasMore && (
                <div className="mt-8 flex flex-col items-center gap-4">
                    <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
                    <Button variant="outline" onClick={loadMore}>
                        {t('common.loadMore')}
                    </Button>
                </div>
            )}
        </>
    )
}
