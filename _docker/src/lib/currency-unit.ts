import type { Locale } from "@/lib/i18n/shared"

export const DEFAULT_CURRENCY_UNIT_BY_LOCALE: Record<Locale, string> = {
    zh: "积分",
    en: "Credits",
}

export const DEFAULT_STORE_CURRENCY_UNIT = DEFAULT_CURRENCY_UNIT_BY_LOCALE.zh

export function normalizeCurrencyUnit(value: string | null | undefined): string | null {
    const trimmed = String(value ?? "").trim()
    return trimmed || null
}

export function resolveCurrencyUnit(locale: Locale, configuredUnit: string | null | undefined): string {
    return normalizeCurrencyUnit(configuredUnit) || DEFAULT_CURRENCY_UNIT_BY_LOCALE[locale]
}
