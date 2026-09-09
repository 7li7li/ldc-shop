'use client'

import { useEffect, useMemo, useState } from "react"
import { buildDefaultLogoDataUrl } from "@/lib/default-logo"
import { isLikelyLinuxDoAvatarUrl } from "@/lib/shop-logo"
import { cn } from "@/lib/utils"

interface ShopLogoProps {
    name: string
    url: string
    logo?: string | null
    updatedAt?: number | null
}

function getOrigin(url: string) {
    try {
        return new URL(url).origin
    } catch {
        return ""
    }
}

export function ShopLogo({ name, url, logo, updatedAt }: ShopLogoProps) {
    const [error, setError] = useState(false)
    const [index, setIndex] = useState(0)
    const candidates = useMemo(() => {
        const list: string[] = []
        const trimmedLogo = (logo || "").trim()
        if (trimmedLogo && !isLikelyLinuxDoAvatarUrl(trimmedLogo)) {
            list.push(trimmedLogo)
        }
        const origin = getOrigin(url)
        if (origin) {
            const favicon = updatedAt ? `${origin}/favicon?v=${updatedAt}` : `${origin}/favicon`
            list.push(favicon)
            list.push(`${origin}/icon.svg`)
            list.push(`${origin}/favicon.ico`)
        }
        list.push(buildDefaultLogoDataUrl(`${name}|${url}`))
        return Array.from(new Set(list))
    }, [logo, name, updatedAt, url])

    useEffect(() => {
        setError(false)
        setIndex(0)
    }, [candidates.join("|")])

    const src = candidates[index] || ""

    return (
        <div
            className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/40 text-sm font-semibold text-muted-foreground",
                src && !error ? "bg-transparent" : ""
            )}
        >
            {src && !error ? (
                <img
                    src={src}
                    alt={name}
                    className="h-12 w-12 rounded-xl object-cover"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    referrerPolicy="no-referrer"
                    onError={() => {
                        if (index + 1 < candidates.length) {
                            setIndex((current) => current + 1)
                        } else {
                            setError(true)
                        }
                    }}
                />
            ) : (
                <img
                    src={buildDefaultLogoDataUrl(`${name}|${url}`)}
                    alt={name}
                    className="h-12 w-12 rounded-xl object-cover"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                />
            )}
        </div>
    )
}
