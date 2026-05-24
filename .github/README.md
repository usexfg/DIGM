# GitHub Actions for DIGM Platform

## Workflows

### 1. CI (`ci.yml`) — Primary

**Triggers**: Push/PR to main or develop

**Jobs**:

| Job | What it does | Directory |
|-----|-------------|-----------|
| `rust` | `cargo check` + `cargo test` + `cargo clippy` (9 crates in parallel) | `libfuego_core/` |
| `rust-format` | `cargo fmt --check` | `libfuego_core/` |
| `flutter` | `flutter pub get` + `flutter analyze` + `flutter test` | `flutter_app/` |
| `frontend` | `npm ci` + `npm run build` | `frontend/` |
| `renderer` | `npm ci` + `npm run lint` + `npm run build` | `renderer/` |

### 2. Flutter (`flutter.yml`)

Path-scoped: only runs when `flutter_app/` or `libfuego_core/ffi-bridge/dart/` changes.

- `flutter analyze`
- `flutter build apk --debug`

### 3. Rust (`rust.yml`)

Path-scoped: only runs when `libfuego_core/` changes.

- `cargo check` + `cargo test` for each crate (matrix)

### 4. Deploy (`deploy.yml`)

Triggers on push to main. Builds frontend and deploys to GitHub Pages.

### 5. Build (legacy) (`build.yml`)

No-op placeholder. Superseded by `ci.yml`.

## Secrets Required

- `GITHUB_TOKEN` — auto-provided (all workflows)
- Deployment secrets — for `deploy.yml` GH Pages publishing
