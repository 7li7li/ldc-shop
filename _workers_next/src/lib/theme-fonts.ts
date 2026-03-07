export const THEME_FONT_VALUES = ['inter', 'system', 'rounded', 'serif'] as const

export type ThemeFont = (typeof THEME_FONT_VALUES)[number]

export const DEFAULT_THEME_FONT: ThemeFont = 'inter'

export const DEFAULT_MONO_FONT_STACK = [
    'ui-monospace',
    'SFMono-Regular',
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
        'var(--font-inter)',
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
        '"Avenir Next"',
        '"Nunito Sans"',
        '"Segoe UI"',
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
}

export function isThemeFont(value: string | null | undefined): value is ThemeFont {
    return THEME_FONT_VALUES.includes((value || '').trim() as ThemeFont)
}

export function getThemeFontStack(value: string | null | undefined) {
    const normalized = (value || '').trim()
    return THEME_FONT_STACKS[isThemeFont(normalized) ? normalized : DEFAULT_THEME_FONT]
}
