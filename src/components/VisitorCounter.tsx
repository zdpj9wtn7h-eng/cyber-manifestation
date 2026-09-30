const BASE = 887412;

function digits(value: number): string[] {
  return String(value).padStart(8, '0').split('');
}

interface Props {
  /** Bumped every time the machine finishes a wallpaper. */
  manifests: number;
}

export default function VisitorCounter({ manifests }: Props) {
  const today = new Date();
  const stamp = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(
    today.getDate(),
  ).padStart(2, '0')}`;

  return (
    <div className="counter" aria-label="fake visitor counter">
      <span className="counter__label">YOU ARE VISITOR NO.</span>
      <span className="counter__digits">
        {digits(BASE + manifests * 137).map((digit, index) => (
          <b key={`${digit}-${index}`}>{digit}</b>
        ))}
      </span>
      <span className="counter__meta">
        <i className="blink">●</i> ONLINE SINCE {stamp} · MANIFESTS TODAY: {manifests}
      </span>
    </div>
  );
}
