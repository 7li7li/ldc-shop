export type Locale = "en" | "zh";

export function isLocale(value: unknown): value is Locale {
    return value === "en" || value === "zh";
}

export function detectLocaleFromAcceptLanguage(headerValue?: string | null): Locale {
    const normalized = (headerValue || "").toLowerCase();
    return normalized.includes("zh") ? "zh" : "en";
}
