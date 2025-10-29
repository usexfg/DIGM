import SwiftUI
import AVFoundation
import CryptoKit

class DigmOriginsRecorder: ObservableObject {
    @Published var isRecording = false
    @Published var duration: Int?
    @Published var fileSize: String?
    @Published var recordings: [Recording] = []
    @Published var showError = false
    @Published var errorMessage = ""
    @Published var showSettings = false
    @Published var showRecordingsList = false
    @Published var isProcessing = false
    
    private let recorder = MicRecorder()
    private var timer: Timer?
    private var audioPlayer: AVAudioPlayer?
    private var nonce = UUID().uuidString
    
    init() {
        loadRecordings()
    }
    
    func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            startRecording()
        }
    }
    
    private func startRecording() {
        Task {
            do {
                try await recorder.checkPermissions()
                
                let audioURL = try recorder.start()
                await MainActor.run {
                    isRecording = true
                    startTimer()
                }
            } catch {
                await MainActor.run {
                    handleError(error)
                }
            }
        }
    }
    
    private func stopRecording() {
        Task {
            await MainActor.run {
                isRecording = false
                isProcessing = true
            }
            
            timer?.invalidate()
            
            do {
                let (audioURL, digest) = try recorder.stop()
                
                // Sign with Secure Enclave
                let keyManager = SecureEnclaveKeyManager.shared
                let signature = try keyManager.sign(data: digest)
                let pubKey = try keyManager.publicKey()
                
                // Create .digm proof
                let proof = createProof(
                    audioURL: audioURL,
                    digest: digest,
                    signature: signature,
                    publicKey: pubKey
                )
                
                // Save recording
                let recording = Recording(
                    name: "Recording \(recordings.count + 1)",
                    date: Date(),
                    duration: duration ?? 0,
                    audioURL: audioURL,
                    proofURL: proof
                )
                
                await MainActor.run {
                    recordings.append(recording)
                    saveRecordings()
                    isProcessing = false
                    duration = nil
                }
            } catch {
                await MainActor.run {
                    handleError(error)
                }
            }
        }
    }
    
    private func createProof(audioURL: URL, digest: Data, signature: Data, publicKey: Data) -> URL? {
        do {
            let proofURL = audioURL.deletingPathExtension().appendingPathExtension("proof.json")
            
            // Read audio file
            let audioData = try Data(contentsOf: audioURL)
            
            // Create proof JSON
            let proof: [String: Any] = [
                "h": digest.base64EncodedString(),
                "s": signature.base64EncodedString(),
                "audio_hash": digest.base64EncodedString(),
                "audio_size": audioData.count,
                "pubKey": publicKey.base64EncodedString(),
                "nonce": nonce,
                "timestamp": ISO8601DateFormatter().string(from: Date()),
                "device": [
                    "model": UIDevice.current.model,
                    "platform": "iOS",
                    "version": UIDevice.current.systemVersion
                ]
            ]
            
            let jsonData = try JSONSerialization.data(withJSONObject: proof, options: .prettyPrinted)
            try jsonData.write(to: proofURL)
            
            nonce = UUID().uuidString
            
            return proofURL
        } catch {
            return nil
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
        errorMessage = error.localizedDescription
        showError = true
    }
    
    func share(_ recording: Recording) {
        let activityVC = UIActivityViewController(
            activityItems: [recording.audioURL, recording.proofURL ?? recording.audioURL],
            applicationActivities: nil
        )
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            activityVC.popoverPresentationController?.sourceView = window
            rootVC.present(activityVC, animated: true)
        }
    }
    
    func play(_ recording: Recording) {
        do {
            if let player = audioPlayer, player.isPlaying {
                player.stop()
                audioPlayer = nil
                recordings = recordings.map { r in
                    var rec = r
                    rec.isPlaying = false
                    return rec
                }
                return
            }
            
            let player = try AVAudioPlayer(contentsOf: recording.audioURL)
            player.play()
            audioPlayer = player
            
            recordings = recordings.map { r in
                var rec = r
                rec.isPlaying = (r.id == recording.id)
                return rec
            }
            
            // Stop after duration
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(recording.duration)) {
                self.audioPlayer?.stop()
                self.audioPlayer = nil
                self.recordings = self.recordings.map { r in
                    var rec = r
                    rec.isPlaying = false
                    return rec
                }
            }
        } catch {
            handleError(error)
        }
    }
    
    func delete(at offsets: IndexSet) {
        recordings.remove(atOffsets: offsets)
        saveRecordings()
    }
    
    private func saveRecordings() {
        // Save to UserDefaults or file system
        // In production, would use CoreData or CloudKit
    }
    
    private func loadRecordings() {
        // Load from storage
        // In production, would use CoreData or CloudKit
    }
}


