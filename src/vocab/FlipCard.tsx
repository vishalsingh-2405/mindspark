import type { VocabEntry } from './bank'

interface Props {
  entry: VocabEntry
  mode: 'word-to-meaning' | 'meaning-to-word'
  flipped: boolean
  onFlip: () => void
}

export function FlipCard({ entry, mode, flipped, onFlip }: Props) {
  const wordFirst = mode === 'word-to-meaning'
  
  return (
    <button
      type="button"
      className={`flip-card${flipped ? ' is-flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? 'card revealed' : 'tap to reveal'}
      disabled={flipped}
    >
      <div className="flip-card__inner">
        {!flipped && (
          <div className="flip-card__face flip-card__face--front">
            {wordFirst ? (
              <>
                <div className="flip-card__word">{entry.word}</div>
                <div className="flip-card__pos">{entry.pos}</div>
              </>
            ) : (
              <>
                <div className="flip-card__meaning">{entry.meaning}</div>
                <div className="flip-card__pos">{entry.pos} · starts with "{entry.word[0]}"</div>
              </>
            )}
            <div className="flip-card__hint">tap to reveal</div>
          </div>
        )}
        {flipped && (
          <div className="flip-card__face flip-card__face--back">
            {wordFirst ? (
              <>
                <div className="flip-card__word flip-card__word--small">{entry.word}</div>
                <div className="flip-card__meaning">{entry.meaning}</div>
              </>
            ) : (
              <div className="flip-card__word">{entry.word}</div>
            )}
            {entry.example && <div className="flip-card__example">"{entry.example}"</div>}
          </div>
        )}
      </div>
    </button>
  )
}
