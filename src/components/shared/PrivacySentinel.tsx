import useLiveFeed from '@/hooks/useLiveFeed'

export default function PrivacySentinel() {
  const feed = useLiveFeed()

  const recent = feed.currentEvents.slice(-8)
  const tagged = recent.filter((e) => (e.privacyTags || []).length > 0)

  return (
    <div className="fixed top-14 left-6 z-50">
      <div className="glass-card p-2 px-3 rounded-md text-xs font-mono text-text-muted">
        <div className="flex items-center gap-3">
          <div className="text-[12px] font-bold text-platinum">Privacy</div>
          <div className="text-lime font-bold">{tagged.length}</div>
          <div className="text-text-muted">/ {recent.length} recent</div>
        </div>
      </div>
    </div>
  )
}
