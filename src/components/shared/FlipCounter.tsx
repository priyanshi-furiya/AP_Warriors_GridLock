import { useState, useEffect, useRef, useCallback } from 'react'

interface FlipCounterProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-IN')
}

/** A single digit cell with a physical flip-board look */
function DigitCell({ digit, flipping }: { digit: string; flipping: boolean }) {
  const isComma = digit === ','

  if (isComma) {
    return (
      <span className="text-text-muted mx-[1px] text-[0.7em] self-end pb-1 font-mono">
        ,
      </span>
    )
  }

  return (
    <div
      className="relative inline-flex flex-col w-[1.1em] h-[1.6em] mx-[1px]
                 bg-bg-secondary rounded-[4px]
                 border border-[rgba(163,255,18,0.08)]
                 overflow-hidden"
      style={{ perspective: '200px' }}
    >
      {/* Top half */}
      <div className="relative flex-1 flex items-end justify-center overflow-hidden
                      bg-gradient-to-b from-[#111118] to-[#0D0D14]">
        <span
          className={`font-mono font-semibold text-platinum leading-none translate-y-[55%]
                      transition-transform duration-200 ${flipping ? 'animate-[counter-flip_0.4s_ease-in-out]' : ''}`}
        >
          {digit}
        </span>
      </div>

      {/* Split line */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-px h-[1px]
                      bg-[rgba(0,0,0,0.6)] z-10" />
      <div className="absolute left-0 right-0 top-1/2 h-[1px]
                      bg-[rgba(163,255,18,0.04)] z-10" />

      {/* Bottom half */}
      <div className="relative flex-1 flex items-start justify-center overflow-hidden
                      bg-gradient-to-b from-[#0D0D14] to-[#0A0A12]">
        <span
          className={`font-mono font-semibold text-platinum leading-none -translate-y-[45%]
                      transition-transform duration-200 ${flipping ? 'animate-[counter-flip_0.4s_ease-in-out]' : ''}`}
        >
          {digit}
        </span>
      </div>
    </div>
  )
}

export default function FlipCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 2000,
  className = '',
}: FlipCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const startValueRef = useRef(0)

  const animateTo = useCallback(
    (target: number) => {
      startValueRef.current = displayValue
      startTimeRef.current = performance.now()
      setFlipping(true)

      const step = (now: number) => {
        const elapsed = now - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(
          startValueRef.current + (target - startValueRef.current) * eased
        )

        setDisplayValue(current)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          setDisplayValue(target)
          setFlipping(false)
        }
      }

      rafRef.current = requestAnimationFrame(step)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration]
  )

  useEffect(() => {
    animateTo(value)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, animateTo])

  const formatted = formatWithCommas(displayValue)
  const chars = formatted.split('')

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {prefix && (
        <span className="font-mono text-text-muted text-[0.65em] mr-1">
          {prefix}
        </span>
      )}

      <div className="inline-flex items-center">
        {chars.map((char, i) => (
          <DigitCell key={`${i}-${char}`} digit={char} flipping={flipping} />
        ))}
      </div>

      {suffix && (
        <span className="font-mono text-text-muted text-[0.65em] ml-1">
          {suffix}
        </span>
      )}
    </div>
  )
}
