import { useState } from 'react'
import { Check, FolderOpen, X } from 'lucide-react'
import { presets, Provider, Settings as SettingsType } from '../../shared/model'
import { useWork } from './context'

export function Settings({ close }: { close: () => void }): React.JSX.Element {
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
      notify('设置已保存')
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
            <span className="eyebrow">MAKE ROOM</span>
            <h2 id="settings-title">适合你的节奏</h2>
          </div>
          <button className="icon-button" title="关闭设置" onClick={close}>
            <X size={19} />
          </button>
        </div>
        <label>
          快速捕捉快捷键
          <input
            value={settings.shortcut}
            onChange={(e) => setSettings({ ...settings, shortcut: e.target.value })}
          />
        </label>
        <p className="fine-print">
          默认 Ctrl + Shift + Space。支持如 Ctrl+Alt+N；软件在托盘中运行时也可使用。
        </p>
        <div className="check-row">
          <label>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => setSettings({ ...settings, sound: e.target.checked })}
            />
            拼接时轻轻发声
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })}
            />
            减少动态效果
          </label>
        </div>
        <div className="settings-divider" />
        <h3>AI 接口</h3>
        <p className="fine-print">
          默认 DeepSeek；只在点击 AI 按钮时调用。支持三种接口协议与自定义服务。
        </p>
        <div className="form-grid">
          <label>
            厂商
            <select
              value={settings.provider.preset}
              onChange={(e) =>
                setSettings({ ...settings, provider: { ...presets[e.target.value] } })
              }
            >
              {Object.keys(presets).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            协议
            <select
              value={settings.provider.protocol}
              onChange={(e) => updateProvider({ protocol: e.target.value as Provider['protocol'] })}
            >
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic Messages</option>
              <option value="gemini">Gemini GenerateContent</option>
            </select>
          </label>
        </div>
        <label>
          接口基础地址
          <input
            value={settings.provider.baseUrl}
            onChange={(e) => updateProvider({ baseUrl: e.target.value })}
          />
        </label>
        <label>
          模型名称
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
              启用接口 JSON 模式
            </label>
            <span className="fine-print">不兼容时可关闭，本地校验仍然有效。</span>
          </div>
        )}
        <label>
          API 密钥
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={snapshot.hasKey ? '当前接口已保存密钥，留空保留' : '输入你的 API 密钥'}
          />
        </label>
        <p className="fine-print">
          密钥由 Windows
          加密后保存在本机，不包含在思路纸导出中。更换接口地址后需为该地址单独保存密钥。
        </p>
        {snapshot.hasKey && (
          <button
            className="text-button danger"
            onClick={() => {
              void window.desktop
                .key('delete')
                .then(() => notify('当前接口密钥已删除'))
                .catch((e) => notify(e.message))
            }}
          >
            删除当前已保存的密钥
          </button>
        )}
        <div className="settings-divider" />
        <div className="storage-row">
          <div>
            <h3>留在本机</h3>
            <p className="fine-print">
              自动保存，保留两份最近备份。关闭主窗口后驻留托盘；在托盘菜单中退出。
            </p>
          </div>
          <button
            title="打开数据目录"
            onClick={() => {
              void window.desktop.openStorage()
            }}
          >
            <FolderOpen size={15} />
          </button>
        </div>
        <div className="modal-footer">
          <button onClick={close}>稍后</button>
          <button
            className="primary"
            disabled={saving}
            onClick={() => {
              void save()
            }}
          >
            <Check size={16} />
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      </section>
    </div>
  )
}
