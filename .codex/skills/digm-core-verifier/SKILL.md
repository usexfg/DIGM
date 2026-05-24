# Skill: digm-core-verifier

## Purpose
This skill automates the build and verification loop for the DIGM Rust core (`libfuego_core`) and the UniFFI bridge (`ffi-bridge`). It ensures that changes to the core logic do not break the FFI contract or the build pipeline.

## When to Use
Use this skill when:
- Modifying any crate within the `libfuego_core` workspace.
- Updating the `ffi-bridge` interface.
- Preparing a release of the native core for the Flutter app.
- Fixing build errors related to dependency mismatches in the Rust workspace.

## Workflow

### 1. Workspace Build
Execute a full build of the FFI bridge to ensure all dependencies are resolved and the final binary is linkable.
`cargo build -p ffi-bridge`

### 2. FFI Contract Validation
Verify that the UniFFI generated bindings match the current Rust implementation. Check for missing functions or type mismatches in the generated `ffi_bridge` outputs.

### 3. Targeted Testing
Run unit tests specifically for the crate that was modified to catch regressions before they hit the FFI layer.
`cargo test -p <crate-name>`

### 4. Flutter Compatibility Check
Ensure that the resulting `.so`, `.dylib`, or `.a` file is placed in the correct `flutter_app/android` or `flutter_app/ios` directory for the native shell to load.

## Guardrails
- **No Dirty Builds**: Always run `cargo clean` if encountering strange linking errors during FFI generation.
- **Dependency Locking**: Ensure `Cargo.lock` is updated and committed to avoid "works on my machine" build failures.
- **FFI Safety**: Any change to `pub` functions in the bridge must be verified against the Flutter MethodChannel expectations.
