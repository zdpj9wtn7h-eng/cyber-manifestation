#!/bin/zsh
# ---------------------------------------------------------------------------
# 双击这个文件 = 重新打包网站并更新 GitHub Pages 上的线上版本。
# 需要先完成过一次 git 推送设置（git remote origin 已经指向你的仓库）。
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  for candidate in \
    "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin" \
    /opt/homebrew/bin \
    /usr/local/bin
  do
    if [ -x "$candidate/node" ]; then
      export PATH="$candidate:$PATH"
      break
    fi
  done
fi

echo "① building the site…"
./node_modules/.bin/vite build

echo "② refreshing the gh-pages branch…"
git checkout -q gh-pages
rm -rf index.html assets templates .nojekyll
cp -R dist/. .
git add -A
git -c commit.gpgsign=false commit -qm "Deploy $(date '+%Y-%m-%d %H:%M')" || echo "   (nothing changed)"
git checkout -q main

echo "③ pushing to GitHub…"
git push origin gh-pages

echo "✔ done — the live site updates in about a minute."
read -r "?Press Return to close."
