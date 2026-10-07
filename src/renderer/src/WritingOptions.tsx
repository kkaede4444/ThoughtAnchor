import type { Settings } from '../../shared/model'
import { useEffect, useRef, useState } from 'react'
import { languages, t } from '../../shared/i18n'

export function WritingOptions({
  value,
  change
}: {
  value: Settings
  change: (value: Settings) => void
}): React.JSX.Element {
  const writing = value.writing
  const [custom, setCustom] = useState(writing.custom)
  const editing = useRef(false)
  useEffect(() => {
    if (!editing.current) setCustom(writing.custom)
  }, [writing.custom])
  const update = (patch: Partial<Settings['writing']>): void =>
    change({ ...value, writing: { ...writing, ...patch } })
  return (
    <div className="writing-options">
      <label>
        <input
          type="checkbox"
          checked={writing.allowReorder}
          onChange={(e) => update({ allowReorder: e.target.checked })}
        />{' '}
        {t('允许 AI 重排')}
      </label>
      <label>
        {t('文学传统')}
        <select
          value={writing.tradition}
          onChange={(e) =>
            update({ tradition: e.target.value as Settings['writing']['tradition'] })
          }
        >
          <option value="auto">{t('自动跟随语言')}</option>
          {languages.map(({ code, tradition }) => (
            <option key={code} value={code}>
              {t(tradition)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('表达风格')}
        <select
          value={writing.expression}
          onChange={(e) =>
            update({ expression: e.target.value as Settings['writing']['expression'] })
          }
        >
          {(
            [
              ['natural', '自然随笔'],
              ['restrained', '克制抒情'],
              ['narrative', '叙事散文'],
              ['poetic', '轻诗意']
            ] as const
          ).map(([code, name]) => (
            <option key={code} value={code}>
              {t(name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('自定义要求')}
        <textarea
          maxLength={2000}
          value={custom}
          onFocus={() => {
            editing.current = true
          }}
          onChange={(e) => {
            setCustom(e.target.value)
            update({ custom: e.target.value })
          }}
          onBlur={() => {
            editing.current = false
            if (custom !== writing.custom) update({ custom })
          }}
        />
      </label>
    </div>
  )
}
