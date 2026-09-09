export const THEME_FONT_VALUES = [
    'inter',
    'system',
    'rounded',
    'serif',
    'notoSansSc',
    'notoSerifSc',
] as const

export type ThemeFont = (typeof THEME_FONT_VALUES)[number]

export const DEFAULT_THEME_FONT: ThemeFont = 'inter'

export const DEFAULT_MONO_FONT_STACK = [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    '"Liberation Mono"',
    '"Courier New"',
    'monospace',
].join(', ')

const THEME_FONT_STACKS: Record<ThemeFont, string> = {
    inter: [
        '"Inter"',
        '"PingFang SC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei UI"',
        '"Microsoft YaHei"',
        'system-ui',
        'sans-serif',
    ].join(', '),
    system: [
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        '"PingFang SC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei UI"',
        '"Microsoft YaHei"',
        'sans-serif',
    ].join(', '),
    rounded: [
        'ui-rounded',
        '"SF Pro Rounded"',
        '"Avenir Next Rounded"',
        '"Arial Rounded MT Bold"',
        '"PingFang SC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei UI"',
        '"Microsoft YaHei"',
        'sans-serif',
    ].join(', '),
    serif: [
        '"Iowan Old Style"',
        '"Palatino Linotype"',
        '"Noto Serif CJK SC"',
        '"Source Han Serif SC"',
        '"Songti SC"',
        '"STSong"',
        'serif',
    ].join(', '),
    notoSansSc: [
        '"Noto Sans SC"',
        '"PingFang SC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei UI"',
        '"Microsoft YaHei"',
        'sans-serif',
    ].join(', '),
    notoSerifSc: [
        '"Noto Serif SC"',
        '"Noto Serif CJK SC"',
        '"Source Han Serif SC"',
        '"Songti SC"',
        '"STSong"',
        'serif',
    ].join(', '),
}

const THEME_FONT_STYLESHEETS: Partial<Record<ThemeFont, string>> = {
    inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    notoSansSc: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap',
    notoSerifSc: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap',
}

export function isThemeFont(value: string | null | undefined): value is ThemeFont {
    return THEME_FONT_VALUES.includes((value || '').trim() as ThemeFont)
}

export function normalizeThemeFont(value: string | null | undefined): ThemeFont {
    const normalized = (value || '').trim()
    return isThemeFont(normalized) ? normalized : DEFAULT_THEME_FONT
}

export function getThemeFontStack(value: string | null | undefined) {
    return THEME_FONT_STACKS[normalizeThemeFont(value)]
}

export function getThemeFontStylesheetHref(value: string | null | undefined) {
    return THEME_FONT_STYLESHEETS[normalizeThemeFont(value)] || null
}
