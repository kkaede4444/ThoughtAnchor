import { useEffect, useState } from 'react'
import { RefreshCw, Link2, Unlink, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import type { SyncStatus } from '../../shared/model'
import { t } from '../../shared/i18n'
import { useWork } from './context'

export function SyncSettings(): React.JSX.Element {
  const { notify } = useWork()
  const [status, setStatus] = useState<SyncStatus | null>(null),
    [value, setValue] = useState(''),
    [qr, setQR] = useState('')
  async function action(
    action: Parameters<typeof window.desktop.sync>[0],
    input?: string
  ): Promise<void> {
    try {
      const result = await window.desktop.sync(action, input)
      setStatus(result)
      if (result.pairing)
        setQR(
          await QRCode.toDataURL(result.pairing, {
            width: 256,
            margin: 2,
            color: { dark: '#292822', light: '#FAF9F5' }
          })
        )
      else setQR('')
    } catch (error) {
      notify((error as Error).message)
    }
  }
  useEffect(() => {
    void action('status')
    const timer = setInterval(() => void action('status'), 5000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="sync-settings">
      <h3>{t('局域网同步')}</h3>
      <p className="fine-print">{t('同一网络下与运行中的 Windows 同步，离线时继续本地保存。')}</p>
      {status && (
        <p className="sync-state" role="status">
          {status.error ||
            (status.connected ? t('已连接') : status.enabled ? t('等待连接') : t('未启用'))}
          {status.lastSync && <small>{new Date(status.lastSync).toLocaleTimeString()}</small>}
        </p>
      )}
      {window.desktop.platform === 'windows' ? (
        <>
          <button onClick={() => void action(status?.enabled ? 'disable' : 'enable')}>
            {status?.enabled ? t('关闭同步') : t('开启同步')}
          </button>
          {status?.enabled && (
            <>
              <button onClick={() => void action('pair')}>
                <QrCode size={16} />
                {t('生成配对码')}
              </button>
              <p className="fine-print">{status.address}</p>
            </>
          )}
        </>
      ) : (
        <>
          <label>
            {t('配对码')}
            <textarea
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="thoughtanchor://pair?data=…"
            />
          </label>
          <button disabled={!value.trim()} onClick={() => void action('connect', value)}>
            <Link2 size={16} />
            {t('连接电脑')}
          </button>
          <button onClick={() => void action('connect', 'scan')}>
            <QrCode size={16} />
            {t('扫描配对码')}
          </button>
        </>
      )}
      {qr && (
        <div className="pairing-code">
          <img src={qr} alt={t('配对码')} />
          <textarea readOnly aria-label={t('配对码')} value={status?.pairing ?? ''} />
        </div>
      )}
      {status?.paired && (
        <>
          <button onClick={() => void action('now')}>
            <RefreshCw size={16} />
            {t('立即同步')}
          </button>
          <button onClick={() => void action('disconnect')}>
            <Unlink size={16} />
            {t('撤销配对')}
          </button>
        </>
      )}
      {!!status?.conflicts && <p className="fine-print">{t('冲突内容已保留为独立思路纸。')}</p>}
      {status?.settingsConflict && (
        <div role="alert">
          <p>{t('两台设备都修改了通用设置，请选择采用哪一份。')}</p>
          <button onClick={() => void action('resolve-local')}>{t('采用本机设置')}</button>
          <button onClick={() => void action('resolve-remote')}>{t('采用电脑设置')}</button>
        </div>
      )}
    </div>
  )
}
