import { useEffect } from 'react'
import { NeonButton } from '../components/NeonButton'
import { toDayString } from '../lib/dates'
import { FlipCard } from '../vocab/FlipCard'
import { useAppStore } from '../state/store'
import { useVocabStore } from '../state/vocabStore'

export function Vocab() {
  const vocab = useVocabStore()
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const mode = settings?.vocabMode ?? 'word-to-meaning'

  useEffect(() => {
    const stale = vocab.day !== null && vocab.day !== toDayString(new Date())
    if (vocab.status === 'idle' || stale) void vocab.initToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab.status, vocab.day])

  if (vocab.status === 'idle' || vocab.status === 'loading') {
    return <div className="screen" style={{ textAlign: 'center' }}><h1 className="app-title">WORD VAULT</h1><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  }

  if (vocab.status === 'error') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1 className="app-title">WORD VAULT</h1>
        <p style={{ color: 'var(--muted)' }}>Couldn't load the word bank.</p>
        <NeonButton onClick={() => void vocab.initToday()}>Retry</NeonButton>
      </div>
    )
  }

  if (vocab.status === 'complete') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1 className="app-title">WORD VAULT</h1>
        <div className="results panel" style={{ marginTop: '5vh' }}>
          <h2>Deck complete</h2>
          <div className="results__score">{vocab.summary?.score ?? 0}</div>
          <div className="results__delta">
            {vocab.summary ? `${vocab.summary.known}/${vocab.summary.total} known · ${vocab.summary.reviews} reviews` : ''}
          </div>
          <div className="results__delta">🔥 streak day banked — fresh words tomorrow</div>
        </div>
      </div>
    )
  }

  const deck = vocab.deck!
  const pct = Math.round((vocab.index / deck.length) * 100)
  return (
    <div className="screen">
      <h1 className="app-title">WORD VAULT</h1>
      <div className="vocab__mode" role="tablist">
        <button type="button" className={mode === 'word-to-meaning' ? 'is-on' : ''}
          onClick={() => void updateSettings({ vocabMode: 'word-to-meaning' })}>Word → Meaning</button>
        <button type="button" className={mode === 'meaning-to-word' ? 'is-on' : ''}
          onClick={() => void updateSettings({ vocabMode: 'meaning-to-word' })}>Meaning → Word</button>
      </div>
      <div className="vocab__progress"><span style={{ width: `${pct}%` }} /></div>
      <div className="vocab__meta">
        <span>Card {vocab.index + 1} of {deck.length}</span>
        <span>{deck[vocab.index].isReview ? 'review' : 'new word'}</span>
      </div>
      {vocab.entry ? (
        <FlipCard entry={vocab.entry} mode={mode} flipped={vocab.flipped} onFlip={vocab.flip} />
      ) : (
        <div className="panel" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>This word is no longer in the bank.</p>
          <NeonButton onClick={() => {
            const s = useVocabStore.getState()
            if (s.entry) return // only ghost cards are skippable; a fast second click must not touch the next real card
            s.flip()
            void s.grade(true)
          }}>Skip</NeonButton>
        </div>
      )}
      {vocab.flipped && (
        <div className="vocab__grade">
          <NeonButton variant="magenta" onClick={() => void vocab.grade(false)}>✕ Didn't know</NeonButton>
          <NeonButton variant="lime" onClick={() => void vocab.grade(true)}>✓ Knew it</NeonButton>
        </div>
      )}
    </div>
  )
}
