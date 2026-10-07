import type { Locale } from './model'
import { translations } from './translations'
import { mobileTranslations } from './mobile-translations'
export const languages: { code: Locale; name: string; tradition: string }[] = [
  { code: 'zh-CN', name: '简体中文', tradition: '大陆中文现代文学' },
  { code: 'zh-TW', name: '繁體中文', tradition: '台湾中文现代文学' },
  { code: 'en-US', name: 'English', tradition: '美国现代文学' },
  { code: 'ja-JP', name: '日本語', tradition: '日本现代文学' },
  { code: 'ko-KR', name: '한국어', tradition: '韩国现代文学' },
  { code: 'fr-FR', name: 'Français', tradition: '法国现代文学' },
  { code: 'de-DE', name: 'Deutsch', tradition: '德国现代文学' },
  { code: 'es-ES', name: 'Español', tradition: '西班牙现代文学' }
]
let currentLocale: Locale = 'zh-CN'
export function setLocale(locale: Locale): void {
  currentLocale = locale
}
// Rows: Simplified Chinese, Traditional Chinese, English, Japanese, Korean, French, German, Spanish.
export const catalog: Record<string, string[]> = { ...translations, ...mobileTranslations }
export function t(
  source: string,
  vars: Record<string, string | number> = {},
  locale = currentLocale
): string {
  const index = languages.findIndex((l) => l.code === locale)
  const text = index <= 0 ? source : (catalog[source]?.[index - 1] ?? source)
  return text.replace(/\{([^}]+)\}/g, (match, key: string) =>
    vars[key] === undefined ? match : String(vars[key])
  )
}
export function tr(strings: TemplateStringsArray, ...values: (string | number)[]): string {
  const source = strings.reduce(
    (s, part, i) => s + part + (i < values.length ? '{' + i + '}' : ''),
    ''
  )
  return t(source, Object.fromEntries(values.map((value, i) => [String(i), value])))
}
