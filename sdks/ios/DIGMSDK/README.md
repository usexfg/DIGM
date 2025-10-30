# DIGMSDK (iOS)

Minimal SDK to record from the built-in mic, hash audio, and sign with Secure Enclave.

## Install

Add the package to your Xcode project:
- File > Add Packages…
- Use local path `sdks/ios/DIGMSDK`

## Usage

```swift
import DIGMSDK

let recorder = DigmRecorder()
let signer = DigmSigner()

let url = try recorder.start()
// ... later ...
if let result = recorder.stop() {
    let bundle = try signer.sign(sha256: result.sha256)
    // Save bundle as JSON alongside audio if desired
}
```
