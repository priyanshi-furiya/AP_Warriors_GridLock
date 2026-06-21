import { useState, useEffect, useCallback, useRef } from 'react'
import { useDataStore } from '@/stores/dataStore'
import useLiveFeed from '@/hooks/useLiveFeed'

export interface InsightEntry {
  id: string
  icon: string
  title: string
  description: string
  severity: 'warning' | 'danger' | 'info'
  metric: string
  metricLabel: string
}

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY

export function useLiveInsights() {
  const feed = useLiveFeed()
  const summary = useDataStore((s) => s.summary)
  const updateInsights = useDataStore((s) => s.updateInsights)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoSync, setAutoSync] = useState(true)

  const lastProcessedIncidentId = useRef<string | null>(null)
  const lastUpdateTime = useRef<number>(0)

  const generate = useCallback(async (force = false) => {
    if (!MISTRAL_API_KEY) {
      setError('VITE_MISTRAL_API_KEY is not set')
      return
    }

    const now = Date.now()
    // Rate limit auto-updates to once every 60 seconds
    if (!force && now - lastUpdateTime.current < 60000) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const liveEvents = feed.currentEvents || []
      const summaryStats = {
        totalViolations: summary.totalViolations,
        approvalRate: summary.approvalRate,
        highRiskRate: summary.highRiskRate,
        peakHour: summary.peakHour,
        totalStations: summary.totalStations,
      }

      const promptContext = `
You are the GridLock AI Command Center analyst. 
Generate 5-6 real-time, data-backed operational insights for the traffic command dashboard based on the latest live data and system summary metrics.
Base the insights specifically on the active 25 incidents in the sliding window, relating them to overall city trends when possible.

Current System Summary:
${JSON.stringify(summaryStats, null, 2)}

Active 25 Incidents in the sliding window:
${JSON.stringify(
  liveEvents.map((e) => ({
    id: e.id,
    station: e.station,
    hotspot: e.hotspot,
    vehicleClass: e.vehicleClass,
    violationType: e.violationType,
    congestionDelayMins: e.congestionDelayMins,
    highRisk: e.highRisk,
    impactScore: e.impactScore,
  })),
  null,
  2
)}

You MUST analyze this data and return a JSON array of objects matching this TypeScript schema:
Array<{
  "id": string, // Unique slug (e.g. 'live-hotspot-delay', 'live-2w-spurt')
  "icon": string, // A single relevant emoji (e.g. '⚠️', '🛵', '🛑', '🚗', '📉', '🚨')
  "title": string, // Concise title, max 6 words
  "description": string, // Specific, data-backed explanation mentioning stations/hotspots/vehicle types, recommending operational response
  "severity": "warning" | "danger" | "info",
  "metric": string, // A short string like '12 mins', '5 cases', '84%', '+18%'
  "metricLabel": string // Label for the metric, e.g. 'Max Delay', 'HSR Layout', '2W Share'
}>

Ensure the response is strictly valid JSON and nothing else. Do not wrap in markdown code blocks like \`\`\`json.
`

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content:
                'You are GridLock AI, a smart city traffic analyst AI. Always respond with a valid JSON array of insights.',
            },
            { role: 'user', content: promptContext },
          ],
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const text = data.choices[0].message.content

      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7)
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3)
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3)
      }
      cleanText = cleanText.trim()

      // The response might be wrapped in an object like { "insights": [...] } or be the array directly
      let parsed = JSON.parse(cleanText)
      let insights: InsightEntry[] = []
      if (Array.isArray(parsed)) {
        insights = parsed
      } else if (parsed && Array.isArray(parsed.insights)) {
        insights = parsed.insights
      } else if (parsed && typeof parsed === 'object') {
        // Look for any array property
        const arrays = Object.values(parsed).filter(Array.isArray)
        if (arrays.length > 0) {
          insights = arrays[0] as InsightEntry[]
        }
      }

      if (insights.length > 0) {
        updateInsights(insights)
        setLastUpdated(new Date())
        lastUpdateTime.current = Date.now()
        if (feed.currentIncident) {
          lastProcessedIncidentId.current = feed.currentIncident.id
        }
      } else {
        throw new Error('No valid insights found in API response')
      }
    } catch (err: any) {
      console.error('Failed to generate AI insights:', err)
      setError(err?.message || 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }, [feed.currentEvents, feed.currentIncident, summary, updateInsights])

  // Trigger auto generation on mount and when new incidents come in (debounced to 60s)
  useEffect(() => {
    if (!autoSync) return

    const lastIncident = feed.currentIncident
    if (!lastIncident) return

    // If we haven't processed this incident yet, or if it's the first run
    if (lastIncident.id !== lastProcessedIncidentId.current) {
      generate(false)
    }
  }, [feed.currentIncident, autoSync, generate])

  return {
    loading,
    error,
    lastUpdated,
    autoSync,
    setAutoSync,
    generate: () => generate(true),
  }
}
