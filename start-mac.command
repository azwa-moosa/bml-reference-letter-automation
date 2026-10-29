#!/bin/bash
# Reference Letter Automation: one-click start for macOS.
# Double-click this file (or run ./start-mac.command in Terminal).
set -e
cd "$(dirname "$0")"
HERE="$(pwd)"

say() { printf "\n\033[1m%s\033[0m\n" "$1"; }
fail() { printf "\n\033[31m%s\033[0m\n\n" "$1"; read -r -p "Press Enter to close."; exit 1; }

# 1. Leave iCloud-synced folders: Next.js hangs at "Compiling /" there.
case "$HERE" in
  "$HOME/Documents"*|"$HOME/Desktop"*|*"Mobile Documents"*)
    TARGET="$HOME/Projects/bml-reference-letters"
    say "This folder is synced by iCloud, which stops the app from starting. Copying it to $TARGET ..."
    mkdir -p "$HOME/Projects"
    if [ -e "$TARGET" ]; then mv "$TARGET" "$TARGET-old-$(date +%Y%m%d%H%M%S)"; fi
    mkdir -p "$TARGET"
    tar --exclude node_modules --exclude .next -cf - . | (cd "$TARGET" && tar -xf -)
    exec "$TARGET/start-mac.command"
    ;;
esac

# 2. Node.js 20.19 or later
command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install the LTS version from https://nodejs.org, then double-click this file again."
NODE_OK=$(node -e 'const [a,b]=process.versions.node.split(".").map(Number);console.log(a>20||(a===20&&b>=19)?1:0)')
[ "$NODE_OK" = "1" ] || fail "Node.js $(node -v) is too old. Install the LTS version from https://nodejs.org."

# 3. Disk space (install + build need about 1.5 GB)
FREE_KB=$(df -k "$HERE" | awk 'NR==2{print $4}')
if [ "${FREE_KB:-0}" -lt 2000000 ]; then
  fail "Only $((FREE_KB/1024)) MB free on this Mac. Free up at least 2 GB, then try again."
fi

# 4. Install, set up the sample database, build, start
if [ ! -d node_modules/next ]; then say "Installing libraries (first run, a few minutes) ..."; npm ci --no-audit --no-fund; fi
if [ ! -f prisma/dev.db ]; then say "Creating the database with the sample data ..."; npm run setup
else say "Updating the database (keeps your data) ..."; node scripts/ensure-env.mjs; npm run db:generate; npm run db:migrate; fi
say "Building the app ..."
npm run build
say "Starting at http://localhost:3000  (press Ctrl+C here to stop)"
( sleep 3; open "http://localhost:3000" ) &
# Sample-data sandbox on this Mac only: keep the "Viewing as" switcher, listen on localhost only.
export ALLOW_DEMO_SIGNIN=1 LOCAL_HTTP=1  # plain http on localhost (Safari drops Secure cookies there)
export APP_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))')"
npx next start -H 127.0.0.1 -p 3000
