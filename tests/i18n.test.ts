import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { catalog, languages, setLocale, t, tr } from '../src/shared/i18n'

describe('eight-language catalog', () => {
  it('has complete translations and matching interpolation fields for every entry', () => {
    expect(languages.map((l) => l.code)).toEqual([
      'zh-CN',
      'zh-TW',
      'en-US',
      'ja-JP',
      'ko-KR',
      'fr-FR',
      'de-DE',
      'es-ES'
    ])
    const fields = (s: string) => [...s.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort()
    for (const [key, row] of Object.entries(catalog)) {
      expect(row, key).toHaveLength(7)
      for (const value of row) {
        expect(value.trim(), key).not.toBe('')
        expect(fields(value), key).toEqual(fields(key))
      }
    }
  })
  it('covers authored UI labels, tagged messages and application errors', () => {
    const keys = new Set<string>()
    function scan(folder: string) {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        const path = join(folder, entry.name)
        if (entry.isDirectory()) scan(path)
        else if (/\.tsx?$/.test(path) && !/translations|i18n/.test(entry.name)) {
          const source = ts.createSourceFile(
            path,
            readFileSync(path, 'utf8'),
            ts.ScriptTarget.Latest,
            true,
            path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
          )
          function visit(node: ts.Node) {
            if (
              (ts.isCallExpression(node) && node.expression.getText(source) === 't') ||
              (ts.isNewExpression(node) && node.expression.getText(source) === 'Error')
            ) {
              const first = node.arguments?.[0]
              if (first && ts.isStringLiteral(first) && /[\u4e00-\u9fff]/.test(first.text))
                keys.add(first.text)
            }
            if (ts.isTaggedTemplateExpression(node) && node.tag.getText(source) === 'tr') {
              const template = node.template
              if (ts.isNoSubstitutionTemplateLiteral(template)) keys.add(template.text)
              else
                keys.add(
                  template.head.text +
                    template.templateSpans.map((part, i) => `{${i}}` + part.literal.text).join('')
                )
            }
            ts.forEachChild(node, visit)
          }
          visit(source)
        }
      }
    }
    scan(join(process.cwd(), 'src'))
    expect([...keys].filter((key) => !catalog[key])).toEqual([])
  })
  it('switches language without changing values and interpolates localized messages', () => {
    setLocale('ja-JP')
    expect(t('拼接')).not.toBe('拼接')
    expect(tr`${'blue'}颜色`).toBe('blueの色')
    setLocale('zh-CN')
    expect(t('拼接')).toBe('拼接')
  })
})
