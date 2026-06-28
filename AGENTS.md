## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Session Summary — May 26, 2026

### Goal
Build DIGM decentralized music platform: Sovereign Audio, P2P reward streaming (Paradio), artist/curator token-gated studios, and CURA curation economy.

### Constraints
- Brand: Fuchsia/pink gradients, glass-morphism, dark/purple backgrounds
- Paradio: No transport controls; "tune in" and earn PARA
- Architecture: Rust core → FFI/HTTP bridge → Flutter/React UI
- Artist Studio requires VOX (DIGM coin), Curator Studio requires CURA token
- Curator revenue: 30% cut from streams

### What We Built (this session)
1. **P2P Streaming Pipeline**: `PcmAudioSink` + `AudioPlayerService` + `/api/digm/next-pcm-frame` endpoint. Polls every 20ms, encodes PCM→WAV via `audioplayers` `BytesSource`.
2. **Artist Dashboard**: `ArtistDashboardScreen` — earnings header, metric grid, release list with pool progress bars, "Release New Music" CTA.
3. **Curator Dashboard** (`CuratorDashboardScreen`): 33% curator / 33.5% artist / 33.5% listener revenue split with visual breakdown. CURA station limit counter (x/10) with progress bar and "Create Station" CTA. Station rotation shown as immutable (lock icons).
4. **Curator Profile Screen** (`CuratorProfileScreen`): Station rotation is immutable (lock icons). Added mutable **"Curator's Pick"** playlist section — freely changeable, add/remove tracks, persists via bridge.
5. **Token-Gated Access**: `AccessLockedScreen` — glass-morphism locked tile. `WalletScreen` intercepts Artist/Curator navigation with VOX > 0 / CURA > 0 checks.
6. **Studio Hub in WalletScreen**: Dual entry buttons with balance display.
7. **Bridge Refactor**: `DigmCore` sync getters for cached UI data, async for audio streaming. `ApiDigmCore` matches bridge signatures + PCM streaming.
8. **CURA Station System** (full stack):
   - Rust core: `Station` struct, `stations` HashMap in `GlobalState`, `stations_created` counter in `UserAccount`, `MAX_STATIONS = 10` limit
   - Rust `DigmApp`: `create_station`, `get_curator_stations`, `curator_stations_remaining`, `update_curator_vibe`, `set_curator_playlist` methods
   - Rust FFI bridge: all station methods exposed
   - Rust API server: 6 new routes (`create-station`, `curator-stations/:address`, `curator-vibe`, `curator-playlist`, `stations-remaining/:address`)
   - Dart bridge: matching methods on `DigmCore` (with mock defaults) + `ApiDigmCore` (API calls)
   - `ApiClient`: `createStation`, `getCuratorStations`, `updateCuratorVibe`, `setCuratorPlaylist`, `stationsRemaining`
9. **UI Redesign (Awwwards-tier)**:
   - Ethereal Glass theme: `oledBlack` background, radial mesh gradients, ultra-thin hairlines
   - Double-Bezel (Doppelrand) nested architecture: outer shell + inner core with concentric squircle radii
   - Asymmetrical Bento layout in dashboard: revenue column pairs with station controls side-by-side on wide screens
   - Button-in-Button pattern: all CTAs have nested circular icon wrappers flush with button inner padding
   - Staggered entry animations: `AnimationController` with `Cubic(0.32, 0.72, 0.0, 1.0)` spring curve, 6 staggered intervals
   - Macro-whitespace: `py-40`-equivalent spacing, generous insets throughout
   - Mutable playlist on profile uses emerald accent + "EDITABLE" badge; rotation uses lock icons + "IMMUTABLE"/"LOCKED" badges

### What We Fixed
- `wallet_screen.dart`: import paths, duplicate `Column`, missing `GoogleFonts` import, deprecated `withOpacity` → `withValues`
- `curator_dashboard_screen.dart`: `DigmHTheme` typo → `DigmTheme`
- `player_provider.dart`: `toDouble()` on `String` → `double.tryParse` with safe division
- `create_album_screen.dart` & `staking_screen.dart`: `text.trim` → `text.trim()` (function not called)
- `digm_core.dart` & `api_digm_core.dart`: added `purchase_album` and `stake_single` methods (were missing from Dart bridge)
- `curator_profile_screen.dart`: `DigmHTheme` → `DigmTheme`

### CI Status
- **Rust (pass)**: all 9 crates pass `cargo check`, `test`, `clippy`
- **Flutter**: errors introduced this session should now be fixed (no local SDK to verify)
- **Renderer (Electron)**: pre-existing `NodeJS` namespace error in `Paradio.tsx` (needs `@types/node`)
- **Frontend (Web)**: pre-existing build failure (exit code 1)

### Known Remaining Issues
- `widget_test.dart`: `overrideWithValue` not on `FutureProvider` (pre-existing)
- UniFFI bindings not generated (no `uniffi-bindgen` CLI)
- VOX→CURA burning not yet implemented
- P2P chunk fetching not wired into playback loop
- Frontend + Renderer builds failing (pre-existing TS issues)

## Desktop Development Workflow

### Prerequisites
```bash
# Install Flutter (if not present)
brew install flutter  # macOS
# Enable macOS desktop
flutter config --enable-macos-desktop
```

### Quick Start (API + Flutter together)
```bash
# Terminal 1: Start the Rust API server (http://localhost:8889)
cd libfuego_core/ffi-bridge && cargo run

# Terminal 2: Launch Flutter macOS app (falls back to mock if API is down)
cd flutter_app && flutter run -d macos
```

### VS Code (tasks.json + launch.json configured)
- `Full Stack (API + Flutter)` compound launch — debugs both
- `dev: Start API Server` task — runs Rust backend
- `dev: Run Flutter macOS` task — launches Flutter after API is up
- `build: Rust core` / `build: All Rust crates` — compile checks

### Script
```bash
./scripts/dev-start.sh    # starts API server + Flutter macOS, Ctrl+C to stop
```

### Architecture (for testing context)
- **Mock mode** (no API server): App runs with hardcoded fake data via `DigmCore(useMock: true)`
- **Native mode** (API server on :8889): App uses `ApiDigmCore` — talks to real Rust backend
- The `digmCoreProvider` tries API first, falls back to mock gracefully
