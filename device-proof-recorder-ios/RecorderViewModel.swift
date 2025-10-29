import SwiftUI
import Combine

final class RecorderViewModel: ObservableObject {
    @Published var status = "Ready"
    @Published var isRecording = false
    @Published var isProcessing = false
    @Published var exportURL: URL?
    @Published var duration: Int?
    @Published var fileSize: String?
    @Published var showExternalMicAlert = false
    
    private var recorder = MicRecorder()
    private var nonce = UUID().uuidString
    private var timer: Timer?
    
    var statusColor: Color {
        switch status {
        case "Recording...":
            return .red
        case "Processing...":
            return .orange
        case "Done":
            return .green
        default:
            return .blue
        }
    }
    
    func prepare() {
        status = "Ready"
        isRecording = false
        exportURL = nil
        duration = nil
        fileSize = nil
        nonce = UUID().uuidString
        timer?.invalidate()
    }
    
    func toggleRecording() {
        if isRecording {
            stopAndSign()
        } else {
            startRecording()
        }
    }
    
    private func startRecording() {
        Task {
            do {
                // Check permissions
                try await recorder.checkPermissions()
                
                // Start recording
                let audioURL = try recorder.start()
                await MainActor.run {
                    isRecording = true
                    status = "Recording..."
                    startTimer()
                }
            } catch {
                await MainActor.run {
                    handleError(error)
                }
            }
        }
    }
    
    private func stopAndSign() {
        Task {
            await MainActor.run {
                isRecording = false
                isProcessing = true
                status = "Processing..."
            }
            
            timer?.invalidate()
            
            do {
                let (audioURL, digest) = try recorder.stop()
                
                // Sign with Secure Enclave
                let keyManager = SecureEnclaveKeyManager.shared
                let signature = try keyManager.sign(data: digest)
                let pubKey = try keyManager.publicKey()
                
                // Create proof bundle
                let proof: [String: Any] = [
                    "sha256": digest.base64EncodedString(),
                    "signature": signature.base64EncodedString(),
                    "pubKey": pubKey.base64EncodedString(),
                    "nonce": nonce,
                    "timestamp": ISO8601DateFormatter().string(from: Date()),
                    "device": [
                        "model": UIDevice.current.model,
                        "platform": "iOS",
                        "version": UIDevice.current.systemVersion
                    ]
                ]
                
                // Save proof JSON
                let jsonURL = audioURL.deletingPathExtension().appendingPathExtension("proof.json")
                let data = try JSONSerialization.data(withJSONObject: proof, options: .prettyPrinted)
                try data.write(to: jsonURL)
                
                // Get file size
                let fileAttributes = try FileManager.default.attributesOfItem(atPath: audioURL.path)
                if let size = fileAttributes[.size] as? UInt64 {
                    await MainActor.run {
                        fileSize = formatFileSize(size)
                    }
                }
                
                await MainActor.run {
                    exportURL = jsonURL
                    status = "Done"
                    isProcessing = false
                }
            } catch {
                await MainActor.run {
                    handleError(error)
                }
            }
        }
    }
    
    private func startTimer() {
        var seconds = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            seconds += 1
            DispatchQueue.main.async {
                self?.duration = seconds
            }
        }
    }
    
    private func handleError(_ error: Error) {
        isRecording = false
        isProcessing = false
        
        if let recorderError = error as? RecorderError {
            switch recorderError {
            case .externalMicDetected:
                status = "External Mic Detected"
                showExternalMicAlert = true
            case .permissionDenied:
                status = "Permission Denied"
            default:
                status = "Error: \(recorderError.localizedDescription)"
            }
        } else {
            status = "Error: \(error.localizedDescription)"
        }
    }
    
    private func formatFileSize(_ bytes: UInt64) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useBytes, .useKB, .useMB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }
    
    func share(url: URL) {
        let activityVC = UIActivityViewController(
            activityItems: [url],
            applicationActivities: nil
        )
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            activityVC.popoverPresentationController?.sourceView = window
            rootVC.present(activityVC, animated: true)
        }
    }
    
    func dismissAlert() {
        showExternalMicAlert = false
    }
}

