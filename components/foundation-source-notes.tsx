const PREVIEW_NOTE_COUNT = 2;
const PREVIEW_NOTE_MAX_CHARS = 90;

function shortenNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length <= PREVIEW_NOTE_MAX_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, PREVIEW_NOTE_MAX_CHARS).trim()}…`;
}

interface FoundationSourceNotesProps {
  notes: string[];
}

export function FoundationSourceNotes({ notes }: FoundationSourceNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  const previewNotes = notes.slice(0, PREVIEW_NOTE_COUNT).map(shortenNote);

  return (
    <div className="foundationSourceNotes">
      {previewNotes.length > 0 ? (
        <div className="foundationSourceNotesPreview" role="note">
          {previewNotes.map((note, idx) => (
            <p key={`preview-${idx}-${note.slice(0, 24)}`} className="cardMeta">
              {note}
            </p>
          ))}
        </div>
      ) : null}

      <details className="betaReferenceDetails">
        <summary>Source notes ({notes.length})</summary>
        {notes.map((note, idx) => (
          <p key={`all-${idx}-${note.slice(0, 24)}`} className="cardMeta">
            {note}
          </p>
        ))}
      </details>
    </div>
  );
}
