import { useCallback, useEffect, useRef, useState } from 'react';

import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import Ticker from './components/Ticker';
import UploadPanel from './components/UploadPanel';
import VisitorCounter from './components/VisitorCounter';
import Webring from './components/Webring';

import { fileToDesireImage, releaseDesireImage, UploadError } from './generation/imageLoading';
import { buildPlan } from './generation/plan';
import { randomSeed } from './generation/random';
import { downloadWallpaperPng } from './generation/render';
import type { DesireImage, ManifestationPlan } from './generation/types';
import { useTemplateShelf } from './hooks/useTemplateShelf';
import { useToast } from './hooks/useToast';

type Screen = 'home' | 'loading' | 'result';
type SlotTuple = [DesireImage | null, DesireImage | null];

const HOME_STATUS = 'Waiting for two desires… the machine is warm.';

export default function App() {
  const shelf = useTemplateShelf();
  const { message: toast, showToast } = useToast();

  const [screen, setScreen] = useState<Screen>('home');
  const [variant, setVariant] = useState<'first' | 'again'>('first');
  const [slots, setSlots] = useState<SlotTuple>([null, null]);
  const [plan, setPlan] = useState<ManifestationPlan | null>(null);
  const [manifests, setManifests] = useState(0);
  const [status, setStatus] = useState(HOME_STATUS);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pool = shelf?.pool ?? [];
  const shelfReady = shelf !== null && shelf.pool.length > 0;

  /* ---------------------------------------------------------------- upload */
  const handlePick = useCallback(
    async (index: 0 | 1, file: File) => {
      setError(null);
      setStatus(`📥 READING “${file.name}” …`);
      try {
        const desire = await fileToDesireImage(file);
        setSlots((previous) => {
          const next = [...previous] as SlotTuple;
          releaseDesireImage(next[index]);
          next[index] = desire;
          return next;
        });
        setStatus(
          `✅ THING #${index + 1} ACCEPTED · ${desire.name} · ${desire.width}×${desire.height}${
            desire.hasAlpha ? ' · transparency kept' : ' · used as-is (no background removal)'
          }`,
        );
      } catch (caught) {
        const message =
          caught instanceof UploadError ? caught.message : 'That file could not be read. Try another PNG or JPG.';
        setError(`❌ ${message}`);
        showToast(`❌ ${message}`);
      }
    },
    [showToast],
  );

  const handleClear = useCallback((index: 0 | 1) => {
    setSlots((previous) => {
      const next = [...previous] as SlotTuple;
      releaseDesireImage(next[index]);
      next[index] = null;
      return next;
    });
    setError(null);
    setStatus(`🗑️ THING #${index + 1} removed. The machine has forgotten it.`);
  }, []);

  /* -------------------------------------------------------------- manifest */
  const runManifest = useCallback(
    (again: boolean) => {
      const first = slots[0];
      const second = slots[1];
      if (!first || !second) {
        showToast('❌ Two things, remember? Two.');
        return;
      }
      setPlan(
        buildPlan({
          seed: randomSeed(),
          pool,
          images: [first, second],
          templateImages: shelf?.images ?? {},
        }),
      );
      setVariant(again ? 'again' : 'first');
      setScreen('loading');
    },
    [pool, shelf, showToast, slots],
  );

  const finishLoading = useCallback(() => {
    setScreen('result');
    setManifests((count) => count + 1);
    setStatus('✨ Done. Your manifestation is on the wall.');
  }, []);

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !plan) return;
    const saved = await downloadWallpaperPng(canvas, `cyber-manifestation-${plan.meta.serial}.png`);
    showToast(
      saved
        ? `⤓ Saved · ${plan.size.width}×${plan.size.height} PNG · 顯化完成`
        : '❌ This browser could not export the PNG.',
    );
  }, [plan, showToast]);

  /* ------------------------------------------------------------- shortcuts */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const file = event.clipboardData?.files?.[0];
      if (!file || !/^image\//.test(file.type)) return;
      if (slots[0] && slots[1]) {
        showToast('Both boxes are already full. Remove one first.');
        return;
      }
      void handlePick(slots[0] ? 1 : 0, file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handlePick, showToast, slots]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && screen === 'result') {
        event.preventDefault();
        void handleDownload();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDownload, screen]);

  /* ------------------------------------------------------------------ view */
  const templateImage = plan && shelf ? shelf.images[plan.templateId] ?? null : null;
  const missingTemplates = shelf?.missing ?? [];

  return (
    <div className="app">
      <Ticker />

      <main className="shell">
        <div className="paper">
          <span className="paper__glitter" aria-hidden="true" />

          <header className="hero">
            <div className="hero__stickers" aria-hidden="true">
              <span className="sticker sticker--pink">EST. 2003</span>
              <span className="sticker sticker--cyan">100% REAL ✨</span>
              <span className="sticker sticker--lime">免費 FREE</span>
            </div>

            <h1 className="title">
              <span className="title__cyber">CYBER</span>
              <span className="title__manifest">
                MANIFESTATION<sup>™</sup>
              </span>
            </h1>

            <p className="subtitle">
              <strong>Make your wishes visible.</strong>{' '}
              <span className="subtitle__cn">把心裡想要的，印成一張手機桌布。</span>
            </p>
            <p className="tagline">
              Upload two things you <em>REALLY REALLY</em> want. The machine does the arranging.
            </p>

            <div className="construction" role="presentation">
              🚧 網站施工中 · UNDER CONSTRUCTION SINCE 2003 · 88% LOADED 🚧
            </div>
          </header>

          <div className="statusbar">
            <VisitorCounter manifests={manifests} />
            <p className="statusbar__shelf" aria-live="polite">
              {shelf === null && '⏳ LOADING THE FOUR ARTWORKS…'}
              {shelf !== null && shelf.missing.length === 0 && '🖼️ TEMPLATE MACHINE: 4 / 4 READY'}
              {shelf !== null && shelf.missing.length > 0 && (
                <>
                  ⚠️ TEMPLATE MACHINE: {shelf.pool.length} / 4 FOUND — missing {shelf.missing.join(', ')}
                </>
              )}
            </p>
          </div>

          {screen === 'home' && (
            <UploadPanel
              slots={slots}
              busy={false}
              ready={shelfReady}
              status={status}
              error={error}
              onPick={(index, file) => void handlePick(index, file)}
              onClear={handleClear}
              onReject={(message) => {
                setError(message);
                showToast(message);
              }}
              onManifest={() => runManifest(false)}
            />
          )}

          {screen === 'loading' && plan && (
            <LoadingScreen variant={variant} serial={plan.meta.serial} onDone={finishLoading} />
          )}

          {screen === 'result' && plan && slots[0] && slots[1] && (
            <ResultScreen
              plan={plan}
              images={[slots[0], slots[1]]}
              templateImage={templateImage}
              canvasRef={canvasRef}
              missingTemplates={missingTemplates}
              onAgain={() => runManifest(true)}
              onDownload={() => void handleDownload()}
              onStartOver={() => {
                setScreen('home');
                setStatus('The machine is ready again. Change your desires or keep them.');
              }}
            />
          )}

          <Webring onToast={showToast} />
        </div>

        <Footer />
      </main>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
