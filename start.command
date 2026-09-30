#!/bin/zsh
# ---------------------------------------------------------------------------
# Double-click this file in Finder to start CYBER MANIFESTATION locally.
# It finds a usable Node.js (system install, Homebrew, or the one that ships
# with Codex), then starts the Vite dev server on http://localhost:5173.
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  for candidate in \
    "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin" \
    /opt/homebrew/bin \
    /usr/local/bin \
    /usr/bin
  do
    if [ -x "$candidate/node" ]; then
      export PATH="$candidate:$PATH"
      break
    fi
  done
fi

if ! command -v node >/dev/null 2>&1; then
  echo "No Node.js found. Install it from https://nodejs.org (or: brew install node), then try again."
  read -r "?Press Return to close."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (one time)…"
  npm install
fi

echo "Starting CYBER MANIFESTATION on http://localhost:5173 …"
./node_modules/.bin/vite dev --port 5173 --open
