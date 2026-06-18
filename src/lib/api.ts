import { useEffect, useState } from 'react'

export function useApiResource<T>(endpoint: string, fallback: T): T {
  const [data, setData] = useState<T>(fallback)

  useEffect(() => {
    let cancelled = false

    fetch(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        return response.json() as Promise<T>
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(fallback)
      })

    return () => {
      cancelled = true
    }
  }, [endpoint, fallback])

  return data
}

export async function postApi<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}
