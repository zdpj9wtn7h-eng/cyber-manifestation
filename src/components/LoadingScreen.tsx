import { useEffect, useMemo, useRef, useState } from 'react';

const FIRST_MESSAGES = [
  'CONNECTING TO THE UNIVERSE…',
  'COLLECTING YOUR DESIRES…',
  'SUMMONING GOOD LUCK…',
  'COMPRESSING 88 HEARTS…',
  'YOUR FUTURE IS LOADING…',
];

const AGAIN_MESSAGES = [
  'RE-ROLLING DESTINY…',
  'SHUFFLING THE 4 TEMPLATES…',
  'RECALIBRATING LUCK…',
  'YOUR FUTURE IS LOADING…',
];

const FILES = [
  'wish.dll',
  'money_coming.jpg',
  'passport_final_FINAL.psd',
  'good_luck_patch_v2.zip',
  'lotus_glow_88.png',
  'dream_big.ico',
  'manifest.mdb',
];

interface Props {
  variant: 'first' | 'again';
  serial: string;
  onDone: () => void;
}

export default function LoadingScreen({ variant, serial, onDone }: Props) {
  const messages = variant === 'first' ? FIRST_MESSAGES : AGAIN_MESSAGES;
  const duration = variant === 'first' ? 1700 : 1150;
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  const fileList = useMemo(() => [...FILES].sort(() => Math.random() - 0.5).slice(0, 4), []);

  useEffect(() => {
    const started = performance.now();
    let frame = 0;
    const tick = (): void => {
      const elapsed = performance.now() - started;
      const ratio = Math.min(1, elapsed / duration);
      // deliberately lumpy: old web progress bars never moved smoothly
      const lumpy = Math.min(1, ratio * (0.82 + Math.sin(elapsed / 130) * 0.06) + (ratio > 0.94 ? 1 : 0));
      setProgress(Math.round(lumpy * 100));
      if (ratio < 1) {
        frame = window.requestAnimationFrame(tick);
      } else if (!done.current) {
        done.current = true;
        onDone();
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, onDone]);

  const total = 21;
  const filled = Math.round((progress / 100) * total);
  const bar = '█'.repeat(filled) + '░'.repeat(total - filled);
  const message = messages[Math.min(messages.length - 1, Math.floor((progress / 100) * messages.length))];

  return (
    <section className="loading" aria-live="polite" aria-busy="true">
      <div className="loading__window">
        <div className="loading__titlebar">
          <span>✦ MANIFESTING.EXE ✦</span>
          <span className="loading__buttons">
            <i>_</i>
            <i>□</i>
            <i>✕</i>
          </span>
        </div>

        <div className="loading__body">
          <p className="loading__message">{message}</p>

          <pre className="loading__bar">
            {bar} {String(progress).padStart(3, ' ')}%
          </pre>

          <div className="loading__spinner" aria-hidden="true">
            <span>✳</span>
          </div>

          <ul className="loading__files">
            {fileList.map((file, index) => (
              <li key={file}>
                {progress > (index + 1) * 18 ? '✔' : '⏳'} {file}
                {progress > (index + 1) * 18 ? ' … done' : ' … 56.6k'}
              </li>
            ))}
          </ul>

          <p className="loading__foot">
            DO NOT CLOSE THIS WINDOW · 願望處理中 · ORDER #{serial}
          </p>
        </div>
      </div>
    </section>
  );
}
