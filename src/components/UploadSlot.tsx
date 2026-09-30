import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import type { DesireImage } from '../generation/types';

interface Props {
  index: 0 | 1;
  image: DesireImage | null;
  disabled?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onReject: (message: string) => void;
}

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif';

export default function UploadSlot({ index, image, disabled, onPick, onClear, onReject }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = (): void => {
    if (!disabled) inputRef.current?.click();
  };

  const accept = (files: FileList | null): void => {
    const file = files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      onReject(`❌ "${file.name}" is not an image. PNG / JPG only.`);
      return;
    }
    onPick(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files);
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <section className={`slot${image ? ' slot--filled' : ''}${dragging ? ' slot--drag' : ''}`}>
      <div className="slot__ribbon">
        <span className="slot__ribbon-inner">THING I WANT #{index + 1}</span>
      </div>

      <div
        className="slot__box"
        role="button"
        tabIndex={0}
        aria-label={`Upload thing I want number ${index + 1}`}
        onClick={openPicker}
        onKeyDown={handleKey}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="slot__spark slot__spark--tl" aria-hidden="true">
          ✨
        </span>
        <span className="slot__spark slot__spark--br" aria-hidden="true">
          ♡
        </span>

        {image ? (
          <img className="slot__preview" src={image.url} alt={`Thing I want #${index + 1}: ${image.name}`} />
        ) : (
          <div className="slot__empty">
            <span className="slot__empty-icon" aria-hidden="true">
              🖼️
            </span>
            <strong>DROP IT HERE</strong>
            <em>or click to choose a file</em>
            <span className="slot__empty-note">PNG · JPG · WEBP</span>
          </div>
        )}
      </div>

      <div className="slot__bar">
        <span className="slot__status" role="status">
          {image ? (
            <>
              ✅ {image.name.slice(0, 26)}
              {image.name.length > 26 ? '…' : ''}
              {image.hasAlpha ? ' · transparent ✓' : ' · opaque'}
            </>
          ) : (
            <>⬜ NO IMAGE YET · waiting for your desire</>
          )}
        </span>
        <span className="slot__actions">
          {image ? (
            <>
              <button type="button" className="mini" onClick={openPicker} disabled={disabled}>
                🔁 REPLACE
              </button>
              <button type="button" className="mini mini--danger" onClick={onClear} disabled={disabled}>
                ✖ REMOVE
              </button>
            </>
          ) : (
            <button type="button" className="mini" onClick={openPicker} disabled={disabled}>
              📂 CHOOSE FILE
            </button>
          )}
        </span>
      </div>

      <p className="slot__tip">💡 Transparent PNG recommended. JPG works too — we use it exactly as it is.</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="slot__input"
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = '';
        }}
      />
    </section>
  );
}
