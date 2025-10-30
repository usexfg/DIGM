# digm-sdk (Android)

Minimal Android SDK to record from the device mic, hash audio, and sign via Android Keystore.

## Build

```
cd sdks/android/digm-sdk
./gradlew :digm-sdk:assemble
```

## Usage

```kotlin
val recorder = DigmRecorder(context)
val file = recorder.start()
// ... later ...
val result = recorder.stop()
val signer = DigmSigner(context)
val bundle = signer.sign(result.sha256)
```
