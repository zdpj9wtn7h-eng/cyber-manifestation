import { useEffect, useState, type RefObject } from 'react';
import { renderWallpaper } from '../generation/render';
import type { DesireImage, ManifestationPlan } from '../generation/types';

interface Props {
  plan: ManifestationPlan;
  images: [DesireImage, DesireImage];
  templateImage: CanvasImageSource | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  missingTemplates: string[];
  onAgain: () => void;
  onDownload: () => void;
  onStartOver: () => void;
}

export default function ResultScreen({
  plan,
  images,
  templateImage,
  canvasRef,
  missingTemplates,
  onAgain,
  onDownload,
  onStartOver,
}: Props) {
  const [ready, setReady] = useState(false);
  const ratio = plan.size.width / plan.size.height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    renderWallpaper({ canvas, plan, images, templateImage });
    const id = window.setTimeout(() => setReady(true), 70);
    return () => window.clearTimeout(id);
  }, [plan, images, templateImage, canvasRef]);

  return (
    <section className="result" aria-label="Generated wallpaper">
      <div className="result__stage">
        <h2 className="result__heading">
          YOUR MANIFESTATION<span aria-hidden="true"> ✧</span>
        </h2>

        <div
          className={`phone${ready ? ' phone--ready' : ''}`}
          style={{ width: `min(460px, 92vw, calc(68vh * ${ratio.toFixed(4)}))` }}
        >
          <div className="phone__bar">
            <span>◍</span>
            <span className="phone__bar-label">MANIFEST OS 2003</span>
            <span>▮▮▮</span>
          </div>
          <div className="phone__screen">
            <canvas
              ref={canvasRef}
              className="phone__canvas"
              width={plan.size.width}
              height={plan.size.height}
              role="img"
              aria-label={`Generated manifestation wallpaper, template ${plan.templateId}, ${plan.meta.modeLabel}`}
            />
            <span className="phone__sticker phone__sticker--tl">
              {plan.size.width}×{plan.size.height}
            </span>
            <span className="phone__sticker phone__sticker--br">NO.{plan.meta.serial}</span>
          </div>
        </div>

        <div className="result__buttons">
          <button type="button" className="manifest-btn manifest-btn--small" onClick={onAgain}>
            <span className="manifest-btn__label">✨ MANIFEST AGAIN ✨</span>
          </button>
          <button type="button" className="glossy-btn" onClick={onDownload}>
            ⤓ DOWNLOAD PNG
          </button>
          <button type="button" className="mini" onClick={onStartOver}>
            ← START OVER
          </button>
        </div>

        <p className="result__note">
          Saved at {plan.size.width} × {plan.size.height} · same ratio as the artwork · the two pictures never left your
          browser.
        </p>

        {missingTemplates.length > 0 && (
          <p className="result__warning">
            ⚠️ Missing artwork: {missingTemplates.join(', ')} — the machine used a stand-in. Drop the real PNG in and
            reload.
          </p>
        )}
      </div>

    </section>
  );
}
