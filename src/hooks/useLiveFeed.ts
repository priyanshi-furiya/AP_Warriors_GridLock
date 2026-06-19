import { useLiveStreamStore, type LiveEvent } from '@/stores/liveStreamStore'

export type DemoEvent = LiveEvent

export function useLiveFeed() {
  const events = useLiveStreamStore((s) => s.events)
  const currentWindow = useLiveStreamStore((s) => s.currentWindow)
  const currentIncident = useLiveStreamStore((s) => s.currentIncident)
  const currentIndex = useLiveStreamStore((s) => s.currentIndex)

  return {
    events,
    currentEvents: currentWindow,
    currentWindow,
    currentIncident,
    index: currentIndex,
  }
}

export default useLiveFeed
