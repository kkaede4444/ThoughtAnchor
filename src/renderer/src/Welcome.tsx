import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { Locale } from '../../shared/model'
import { languages, t } from '../../shared/i18n'
import { ArtDefs, Mark, Paint } from './Art'

export function Welcome({
  initialLocale,
  busy,
  error,
  onStart
}: {
  initialLocale: Locale
  busy: boolean
  error: string
  onStart: (locale: Locale) => void
}): React.JSX.Element {
  const [locale, setLocale] = useState(initialLocale)
  return (
    <main className="welcome" lang={locale}>
      <ArtDefs />
      <div className="paper-texture" aria-hidden="true" />
      <section className="welcome-paper" aria-labelledby="welcome-heading">
        <Paint color="sage" />
        <header>
          <Mark />
          <span>ThoughtAnchor</span>
        </header>
        <p className="eyebrow">{t('把闪念留住，把思路拼起来。', {}, locale)}</p>
        <h1 id="welcome-heading">{t('选择你的语言', {}, locale)}</h1>
        <p className="welcome-intro">{t('从熟悉的语言开始，让想法慢慢落在纸上。', {}, locale)}</p>
        <fieldset className="welcome-languages" disabled={busy}>
          <legend>{t('界面语言', {}, locale)}</legend>
          {languages.map(({ code, name }) => (
            <label key={code} className={locale === code ? 'chosen' : ''} lang={code}>
              <input
                type="radio"
                name="welcome-language"
                value={code}
                checked={locale === code}
                onChange={() => setLocale(code)}
              />
              <span>{name}</span>
              <Check size={17} aria-hidden="true" />
            </label>
          ))}
        </fieldset>
        <p className="welcome-hint">
          {t('之后也可以在设置中切换。已保存的笔记会保留原文。', {}, locale)}
        </p>
        {error && (
          <p role="alert" className="welcome-error">
            {error}
          </p>
        )}
        <button className="primary welcome-start" disabled={busy} onClick={() => onStart(locale)}>
          {busy ? t('正在保存…', {}, locale) : t('开始使用', {}, locale)}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
    </main>
  )
}
