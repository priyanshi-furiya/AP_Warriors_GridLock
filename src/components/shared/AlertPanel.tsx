import { useAppStore } from '@/stores/appStore'

export default function AlertPanel() {
  const alerts = useAppStore((s) => (s as any).alerts)
  const dismiss = useAppStore((s) => (s as any).dismissAlert)

  if (!alerts || alerts.length === 0) return null

  return (
    <div className="fixed top-14 right-6 z-50 w-96 max-h-[60vh] overflow-y-auto space-y-2">
      {alerts.map((a: any) => (
        <div key={a.id} className={`glass-panel p-3 border-l-4 ${a.level === 'critical' ? 'border-l-red' : a.level === 'warning' ? 'border-l-amber' : 'border-l-lime'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-platinum">{a.title}</div>
              <div className="text-text-muted text-xs mt-1">{a.message}</div>
              <div className="text-text-muted text-[10px] mt-1 font-mono">{new Date(a.timestamp).toLocaleString()}</div>
            </div>
            <div className="flex-shrink-0">
              <button onClick={() => dismiss(a.id)} className="text-[10px] text-text-muted hover:text-platinum">Dismiss</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
