import UploadSlot from './UploadSlot';
import type { DesireImage } from '../generation/types';

interface Props {
  slots: [DesireImage | null, DesireImage | null];
  busy: boolean;
  ready: boolean;
  status: string;
  error: string | null;
  onPick: (index: 0 | 1, file: File) => void;
  onClear: (index: 0 | 1) => void;
  onReject: (message: string) => void;
  onManifest: () => void;
}

export default function UploadPanel({
  slots,
  busy,
  ready,
  status,
  error,
  onPick,
  onClear,
  onReject,
  onManifest,
}: Props) {
  const canManifest = Boolean(slots[0] && slots[1]) && !busy && ready;

  return (
    <section className="machine" aria-label="Manifestation machine">
      <div className="machine__marquee">
        <span>
          👉 STEP 1: GIVE THE MACHINE TWO THINGS &nbsp;·&nbsp; STEP 2: PRESS THE BIG BUTTON &nbsp;·&nbsp; STEP 3: THE
          MACHINE DECIDES THE REST 👈
        </span>
      </div>

      <div className="upload-grid">
        <UploadSlot
          index={0}
          image={slots[0]}
          disabled={busy}
          onPick={(file) => onPick(0, file)}
          onClear={() => onClear(0)}
          onReject={onReject}
        />
        <div className="upload-grid__join" aria-hidden="true">
          <span>✚</span>
        </div>
        <UploadSlot
          index={1}
          image={slots[1]}
          disabled={busy}
          onPick={(file) => onPick(1, file)}
          onClear={() => onClear(1)}
          onReject={onReject}
        />
      </div>

      <div className="machine__button-row">
        <button
          type="button"
          className="manifest-btn"
          onClick={onManifest}
          disabled={!canManifest}
          aria-describedby="machine-status"
        >
          <span className="manifest-btn__spark manifest-btn__spark--l" aria-hidden="true">
            ✨
          </span>
          <span className="manifest-btn__label">MANIFEST</span>
          <span className="manifest-btn__spark manifest-btn__spark--r" aria-hidden="true">
            ✨
          </span>
        </button>
        <p className="machine__note">
          {canManifest
            ? 'The machine will pick the layout, the copies, the angles and the words. You just wish.'
            : 'Both boxes must be full before the machine will start.'}
        </p>
      </div>

      <p id="machine-status" className={`machine__status${error ? ' machine__status--error' : ''}`} role="status" aria-live="polite">
        {error ?? status}
      </p>
    </section>
  );
}
