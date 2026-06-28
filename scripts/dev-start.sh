#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FFI_DIR="$ROOT/libfuego_core/ffi-bridge"
FLUTTER_DIR="$ROOT/flutter_app"

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "${FLUTTER_PID:-}" ] && kill "$FLUTTER_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. Build & start the Rust API server ──────────────────────
echo "==> Building Rust API server..."
(cd "$FFI_DIR" && cargo build --quiet 2>&1)
echo "==> Starting API server on http://localhost:8889"
(cd "$FFI_DIR" && cargo run --quiet 2>&1) &
API_PID=$!

# Wait for the server to respond
echo "==> Waiting for API server..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8889/api/digm/address > /dev/null 2>&1; then
    echo "==> API server ready"
    break
  fi
  sleep 1
done

# ── 2. Launch Flutter desktop app ─────────────────────────────
echo "==> Starting Flutter macOS app..."
(cd "$FLUTTER_DIR" && flutter run -d macos --no-pub 2>&1) &
FLUTTER_PID=$!

echo ""
echo "  API server : http://localhost:8889"
echo "  Flutter    : running on macOS"
echo "  Press Ctrl+C to stop both"
echo ""

wait
