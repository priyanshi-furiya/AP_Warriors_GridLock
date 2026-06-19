import { useEffect, useRef } from 'react'
import useLiveFeed from '@/hooks/useLiveFeed'
import { useAppStore } from '@/stores/appStore'

export default function LiveSupervisor() {
  const feed = useLiveFeed()
  const addAlert = useAppStore((s) => (s as any).addAlert)
  const seenRef = useRef(new Set<string>())

  useEffect(() => {
    // watch latest incident and push alert when thresholds met
    const last = feed.currentIncident
    if (!last) return
    if (seenRef.current.has(last.id)) return
    seenRef.current.add(last.id)

    // simple rules for demo: high impact or long congestion or parking violation
    const isCritical = (last.impactScore ?? 0) >= 80 || (last.congestionDelayMins ?? 0) >= 20
    const isWarning = (last.impactScore ?? 0) >= 50 || (last.congestionDelayMins ?? 0) >= 10

    if (isCritical) {
      addAlert({ title: 'Critical Incident', message: `${last.violationType} at ${last.hotspot} — high impact`, level: 'critical' })
    } else if (isWarning) {
      addAlert({ title: 'Incident', message: `${last.violationType} at ${last.hotspot}`, level: 'warning' })
    } else if (last.parkingViolation) {
      addAlert({ title: 'Parking Violation', message: `${last.plateNumber} @ ${last.hotspot}`, level: 'info' })
    }
  }, [feed.currentIncident, addAlert])

  return null
}
