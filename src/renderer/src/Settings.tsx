import { useEffect, useState } from 'react'
import { Check, FolderOpen, X } from 'lucide-react'
import { presets, Provider, Settings as SettingsType } from '../../shared/model'
import { useWork } from './context'
import { languages, t } from '../../shared/i18n'
import { WritingOptions } from './WritingOptions'
import { SyncSettings } from './SyncSettings'

export function Settings({ close }: { close: () => void }): React.JSX.Element {
  useEffect(() => {
    const back = (event: Event) => {
      event.preventDefault()
      close()
    }
    window.addEventListener('anchor-back', back)
    return () => window.removeEventListener('anchor-back', back)
  }, [close])
  const { snapshot, run, notify } = useWork()
  const [settings, setSettings] = useState<SettingsType>(
    structuredClone(snapshot.workspace.settings)
  )
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const updateProvider = (patch: Partial<Provider>): void =>
    setSettings((s) => ({ ...s, provider: { ...s.provider, ...patch } }))
  async function save(): Promise<void> {
    setSaving(true)
    try {
      const next = await run({ type: 'settings', settings })
      if (!next) return
      if (key.trim()) await window.desktop.key('set', key)
      notify(t('设置已保存'))
      close()
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{t('设置')}</span>
            <h2 id="settings-title">{t('适合你的节奏')}</h2>
          </div>
          <button className="icon-button" title={t('关闭设置')} onClick={close}>
            <X size={19} />
          </button>
        </div>
        <label>
          {t('界面模式')}
          <select
            aria-label={t('界面模式')}
            value={settings.interfaceMode}
            onChange={(e) =>
              setSettings({
                ...settings,
                interfaceMode: e.target.value as SettingsType['interfaceMode']
              })
            }
          >
            <option value="auto">{t('自动：手机用移动界面，平板用桌面界面')}</option>
            <option value="mobile">{t('移动端界面')}</option>
            <option value="desktop">{t('桌面端界面')}</option>
          </select>
        </label>
        <p className="fine-print">{t('界面模式仅保存在这台设备，不随同步改变。')}</p>
        <div className="check-row">
          <label>
            <input
              type="checkbox"
              checked={settings.directCardDrawing}
              onChange={(e) => setSettings({ ...settings, directCardDrawing: e.target.checked })}
            />
            {t('直接在卡片上绘制')}
          </label>
        </div>
        <p className="fine-print">
          {t('默认关闭。开启后，卡片内落笔自动保存；仍可打开绘图小窗。此选项仅保存在本机。')}
        </p>
        <label>
          {t('界面及美化输出语言')}
          <select
            value={settings.locale}
            onChange={(e) =>
              setSettings({ ...settings, locale: e.target.value as SettingsType['locale'] })
            }
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
        </label>
        <WritingOptions value={settings} change={setSettings} />
        {window.desktop.platform === 'windows' && (
          <>
            <label>
              {t('快速捕捉快捷键')}
              <input
                value={settings.shortcut}
                onChange={(e) => setSettings({ ...settings, shortcut: e.target.value })}
              />
            </label>
            <p className="fine-print">
              {t('默认 Ctrl + Shift + Space。支持如 Ctrl+Alt+N；软件在托盘中运行时也可使用。')}
            </p>
          </>
        )}
        <div className="check-row">
          <label>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => setSettings({ ...settings, sound: e.target.checked })}
            />
            {t('拼接时轻轻发声')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })}
            />
            {t('减少动态效果')}
          </label>
        </div>
        <div className="settings-divider" />
        <h3>{t('AI 接口')}</h3>
        <p className="fine-print">
          {t('默认 DeepSeek；只在点击 AI 按钮时调用。支持三种接口协议与自定义服务。')}
        </p>
        <div className="form-grid">
          <label>
            {t('厂商')}
            <select
              value={settings.provider.preset}
              onChange={(e) =>
                setSettings({ ...settings, provider: { ...presets[e.target.value] } })
              }
            >
              {Object.keys(presets).map((name) => (
                <option key={name} value={name}>
                  {name === '自定义' ? t('自定义') : name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('协议')}
            <select
              value={settings.provider.protocol}
              onChange={(e) => updateProvider({ protocol: e.target.value as Provider['protocol'] })}
            >
              <option value="openai">{t('OpenAI 兼容')}</option>
              <option value="anthropic">Anthropic Messages</option>
              <option value="gemini">Gemini GenerateContent</option>
            </select>
          </label>
        </div>
        <label>
          {t('接口基础地址')}
          <input
            value={settings.provider.baseUrl}
            onChange={(e) => updateProvider({ baseUrl: e.target.value })}
          />
        </label>
        <label>
          {t('模型名称')}
          <input
            value={settings.provider.model}
            onChange={(e) => updateProvider({ model: e.target.value })}
          />
        </label>
        {settings.provider.protocol === 'openai' && (
          <div className="check-row">
            <label>
              <input
                type="checkbox"
                checked={settings.provider.jsonMode !== false}
                onChange={(e) => updateProvider({ jsonMode: e.target.checked })}
              />
              {t('启用接口 JSON 模式')}
            </label>
            <span className="fine-print">{t('不兼容时可关闭，本地校验仍然有效。')}</span>
          </div>
        )}
        <label>
          {t('API 密钥')}
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={
              snapshot.hasKey ? t('当前接口已保存密钥，留空保留') : t('输入你的 API 密钥')
            }
          />
        </label>
        <p className="fine-print">
          {window.desktop.platform === 'android'
            ? t('密钥由 Android 加密后保存在本机，不包含在导出和同步中。')
            : t(
                '密钥由 Windows 加密后保存在本机，不包含在思路纸导出中。更换接口地址后需为该地址单独保存密钥。'
              )}
        </p>
        {snapshot.hasKey && (
          <button
            className="text-button danger"
            onClick={() => {
              void window.desktop
                .key('delete')
                .then(() => notify(t('当前接口密钥已删除')))
                .catch((e) => notify(e.message))
            }}
          >
            {t('删除当前已保存的密钥')}
          </button>
        )}
        <div className="settings-divider" />
        <SyncSettings />
        <div className="settings-divider" />
        <div className="storage-row">
          <div>
            <h3>{t('留在本机')}</h3>
            <p className="fine-print">
              {window.desktop.platform === 'android'
                ? t('自动保存，保留两份最近备份。')
                : t('自动保存，保留两份最近备份。关闭主窗口后驻留托盘；在托盘菜单中退出。')}
            </p>
          </div>
          {window.desktop.platform === 'windows' && (
            <button
              title={t('打开数据目录')}
              onClick={() => {
                void window.desktop.openStorage()
              }}
            >
              <FolderOpen size={15} />
            </button>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={close}>{t('稍后')}</button>
          <button
            className="primary"
            disabled={saving}
            onClick={() => {
              void save()
            }}
          >
            <Check size={16} />
            {saving ? t('保存中…') : t('保存设置')}
          </button>
        </div>
      </section>
    </div>
  )
}
