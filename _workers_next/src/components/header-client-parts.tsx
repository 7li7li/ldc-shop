'use client'

import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Input } from "@/components/ui/input"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getMyUnreadCount } from "@/actions/user-notifications"
import { Heart, Users } from "lucide-react"

export function HeaderLogo({ adminName, shopNameOverride, shopLogoVersion }: { adminName?: string; shopNameOverride?: string | null; shopLogoVersion?: string | null }) {
    const { t } = useI18n()
    const override = shopNameOverride?.trim()
    const shopName = adminName
        ? t('common.shopNamePattern', { name: adminName, appName: t('common.appName') })
        : t('common.appName')
    const logoUrl = shopLogoVersion ? `/favicon?v=${shopLogoVersion}` : "/favicon"

    return (
        <Link href="/" className="flex items-center gap-2 min-w-0 group text-muted-foreground hover:text-primary transition-colors duration-200 hover:-translate-y-0.5">
            <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-cover shadow-sm transition-all duration-300 group-hover:shadow-md" />
            <span className="text-xs sm:text-sm font-semibold tracking-tight truncate max-w-[160px] sm:max-w-[220px] md:max-w-none">
                {override || shopName}
            </span>
        </Link>
    )
}

export function HeaderNav({ isAdmin, isLoggedIn, showNav = true }: { isAdmin: boolean; isLoggedIn: boolean; showNav?: boolean }) {
    const { t } = useI18n()
    const isZh = t('common.myOrders').includes('订单')

    return (
        <div className="hidden md:flex items-center gap-6">
            {showNav && (
                <Link
                    href="/nav"
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 hover:-translate-y-0.5"
                >
                    {t('common.navigator')}
                </Link>
            )}
            {isLoggedIn && (
                <>
                    <Link
                        href="/profile"
                        className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 hover:-translate-y-0.5"
                    >
                        {isZh ? "个人中心" : "Profile"}
                    </Link>
                </>
            )}
            {isAdmin && (
                <Link
                    href="/admin/settings"
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 hover:-translate-y-0.5"
                >
                    {t('common.admin')}
                </Link>
            )}
        </div>
    )
}

export function HeaderSearch({ className }: { className?: string }) {
    const { t } = useI18n()
    const router = useRouter()
    const [q, setQ] = useState("")

    return (
        <form
            className={cn("w-full", className)}
            onSubmit={(e) => {
                e.preventDefault()
                const query = q.trim()
                if (!query) return
                router.push(`/search?q=${encodeURIComponent(query)}`)
            }}
        >
            <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('search.placeholder')}
            />
        </form>
    )
}

export function HeaderQuickActions({ wishlistEnabled, visitorCount }: { wishlistEnabled: boolean; visitorCount: number | null }) {
    const { t } = useI18n()

    if (!wishlistEnabled && typeof visitorCount !== "number") return null

    return (
        <div className="flex items-center gap-1">
            {wishlistEnabled && (
                <Link
                    href="/wishlist"
                    aria-label={t('wishlist.title')}
                    title={t('wishlist.title')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-background/70 hover:text-primary"
                >
                    <Heart className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{t('wishlist.title')}</span>
                </Link>
            )}
            {typeof visitorCount === "number" && (
                <div
                    title={t('home.visitorCount', { count: visitorCount })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground"
                >
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold tabular-nums text-foreground">{visitorCount}</span>
                    <span className="hidden xl:inline">{t('home.metrics.visitors')}</span>
                </div>
            )}
        </div>
    )
}

export function HeaderUserMenuItems({ isAdmin, showNav = true }: { isAdmin: boolean; showNav?: boolean }) {
    const { t } = useI18n()

    return (
        <>
            {showNav && (
                <DropdownMenuItem asChild>
                    <Link href="/nav">{t('common.navigator')}</Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
                <Link href="/profile" className="flex w-full items-center justify-between gap-2">
                    <span>{t('common.myOrders').includes('订单') ? "个人中心" : "Profile"}</span>
                    <HeaderUnreadBadge className="ml-2" />
                </Link>
            </DropdownMenuItem>
            {isAdmin && (
                <DropdownMenuItem asChild>
                    <Link href="/admin/settings">{t('common.admin')}</Link>
                </DropdownMenuItem>
            )}
        </>
    )
}

export { LanguageSwitcher }

export function HeaderUnreadBadge({ initialCount = 0, desktopEnabled = false, className }: { initialCount?: number; desktopEnabled?: boolean; className?: string }) {
    const { t } = useI18n()
    const [count, setCount] = useState(initialCount)
    const pathname = usePathname()
    const prevCountRef = useRef(initialCount)

    const refresh = useCallback(async () => {
        try {
            const res = await getMyUnreadCount()
            if (res?.success) {
                const nextCount = res.count || 0
                setCount(nextCount)
                if (desktopEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                    if (nextCount > prevCountRef.current) {
                        new Notification(t('profile.desktopNotifications.newTitle'), {
                            body: t('profile.desktopNotifications.newBody', { count: nextCount })
                        })
                    }
                }
                prevCountRef.current = nextCount
            }
        } catch {
            // ignore
        }
    }, [desktopEnabled, t])

    useEffect(() => {
        refresh()
    }, [pathname, refresh])

    useEffect(() => {
        const handler = () => {
            void refresh()
        }
        if (typeof window !== "undefined") {
            window.addEventListener("ldc:notifications-updated", handler)
        }
        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("ldc:notifications-updated", handler)
            }
        }
    }, [refresh])

    if (!count) return null

    return (
        <span className={cn("inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white", className)}>
            {count > 99 ? "99+" : count}
        </span>
    )
}
