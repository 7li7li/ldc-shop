'use client'

import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ShoppingBag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function HeaderLogo({ adminName, shopNameOverride }: { adminName?: string; shopNameOverride?: string | null }) {
    const { t } = useI18n()
    const override = shopNameOverride?.trim()
    const shopName = adminName
        ? t('common.shopNamePattern', { name: adminName, appName: t('common.appName') })
        : t('common.appName')

    return (
        <Link href="/" className="flex items-center gap-2 min-w-0 group text-muted-foreground hover:text-primary transition-colors">
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center transition-all duration-300">
                <ShoppingBag className="h-4 w-4 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight truncate max-w-[140px] sm:max-w-[220px] md:max-w-none">
                {override || shopName}
            </span>
        </Link>
    )
}

export function HeaderNav({ isAdmin }: { isAdmin: boolean }) {
    const { t } = useI18n()

    return (
        <>
            {isAdmin && (
                <Link
                    href="/admin"
                    className="hidden lg:flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
                >
                    {t('common.admin')}
                </Link>
            )}
        </>
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

export function HeaderUserMenuItems({ isAdmin }: { isAdmin: boolean }) {
    const { t } = useI18n()

    return (
        <>
            <DropdownMenuItem asChild>
                <Link href="/orders">{t('common.myOrders')}</Link>
            </DropdownMenuItem>
            {isAdmin && (
                <>
                    <DropdownMenuItem asChild>
                        <Link href="/admin/collect">{t('payment.adminMenu')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/admin">{t('common.dashboard')}</Link>
                    </DropdownMenuItem>
                </>
            )}
        </>
    )
}

export { LanguageSwitcher }
