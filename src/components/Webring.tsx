interface Props {
  onToast: (message: string) => void;
}

const LINKS: Array<[string, string]> = [
  ['◀ PREV', 'The previous site in the webring went offline in 2009.'],
  ['🎲 RANDOM', 'The random button also went offline. Everything here is random enough already.'],
  ['NEXT ▶', 'That one is still loading. It has been loading since 1998.'],
];

export default function Webring({ onToast }: Props) {
  return (
    <nav className="webring" aria-label="Fake webring">
      <span className="webring__label">✿ 顯化 WEBRING ✿</span>
      {LINKS.map(([label, message]) => (
        <button key={label} type="button" className="webring__link" onClick={() => onToast(message)}>
          {label}
        </button>
      ))}
      <span className="webring__hits">PAGE HITS: 887,412</span>
    </nav>
  );
}
