import { create } from 'zustand'
import demoStream from '@/data/real/demo_stream.json'
import { useDataStore } from './dataStore'

export type LiveEvent = {
  id: string
  timestamp: string
  station?: string
  hotspot?: string
  location?: string
  vehicleClass?: string
  violationType?: string
  plateNumber?: string
  parkingViolation?: boolean
  congestionDelayMins?: number
  highRisk?: boolean
  impactScore?: number
  privacyTags?: string[]
  position?: [number, number, number]
}

type LiveStreamState = {
  events: LiveEvent[]
  currentIndex: number
  currentIncident: LiveEvent | null
  currentWindow: LiveEvent[]
}

const sourceEvents: LiveEvent[] = ((demoStream as any).events ?? []).slice(-25)

const buildWindow = (index: number) => sourceEvents.slice(Math.max(0, index - 25), index)

export const useLiveStreamStore = create<LiveStreamState>(() => ({
  events: sourceEvents,
  currentIndex: sourceEvents.length > 0 ? 1 : 0,
  currentIncident: sourceEvents.length > 0 ? sourceEvents[0] : null,
  currentWindow: sourceEvents.length > 0 ? sourceEvents.slice(0, 1) : [],
}))

let timerStarted = false

function advanceStream() {
  const state = useLiveStreamStore.getState()
  if (state.events.length === 0) return

  const nextIndex = state.currentIndex >= state.events.length ? 1 : state.currentIndex + 1
  const currentIncident = state.events[nextIndex - 1] ?? null
  
  // Push the new event to the global data store to update the dashboards
  if (currentIncident) {
    useDataStore.getState().addIncident(currentIncident)
  }

  useLiveStreamStore.setState({
    currentIndex: nextIndex,
    currentIncident,
    currentWindow: buildWindow(nextIndex),
  })
}

export function startLiveStream() {
  if (timerStarted || typeof window === 'undefined') return
  timerStarted = true

  // 120000 ms = 2 minutes as requested
  const stepMs = 120000
  window.setInterval(advanceStream, stepMs)
}

startLiveStream()
