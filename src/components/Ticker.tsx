const LINE =
  '★ CYBER MANIFESTATION™ 顯化壁紙製造機 ★ 100% FREE 免費 ★ UPLOAD TWO DESIRES, RECEIVE ONE WALLPAPER ★ WELCOME BACK ★ 好運連連 ★ ';

export default function Ticker() {
  return (
    <div className="ticker" role="presentation">
      <div className="ticker__track">
        <span>{LINE}</span>
        <span aria-hidden="true">{LINE}</span>
      </div>
    </div>
  );
}
