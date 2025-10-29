import AVFoundation
import CryptoKit
import Foundation

enum RecorderError: Error {
    case noInputsAvailable
    case noBuiltInMic
    case externalMicDetected
    case recordingFailed
    case permissionDenied
}

final class MicRecorder {
    private let engine = AVAudioEngine()
    private var file: AVAudioFile?
    private var hasher = SHA256()
    private var format: AVAudioFormat!
    private var audioURL: URL?
    
    // Recording state
    private var isRecording: Bool = false
    private var startTime: Date?
    
    func enforceBuiltInMic() throws {
        let session = AVAudioSession.sharedInstance()
        
        guard let availableInputs = session.availableInputs else {
            throw RecorderError.noInputsAvailable
        }
        
        // Find built-in microphone
        guard let builtInMic = availableInputs.first(where: {
            $0.portType == .builtInMic
        }) else {
            throw RecorderError.noBuiltInMic
        }
        
        // Set built-in mic as preferred input
        try session.setPreferredInput(builtInMic)
        
        // Verify current input is built-in mic
        guard let currentInput = session.currentRoute.inputs.first,
              currentInput.portType == .builtInMic else {
            throw RecorderError.externalMicDetected
        }
    }
    
    func checkPermissions() async throws {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            return
        case .denied:
            throw RecorderError.permissionDenied
        case .undetermined:
            let granted = await AVAudioSession.sharedInstance().requestRecordPermission()
            if !granted {
                throw RecorderError.permissionDenied
            }
        @unknown default:
            throw RecorderError.permissionDenied
        }
    }
    
    func start() throws -> URL {
        guard !isRecording else { throw RecorderError.recordingFailed }
        
        // Force built-in microphone
        try enforceBuiltInMic()
        
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .measurement, options: [])
        try session.setActive(true)
        
        // Setup audio format (48kHz, 16-bit, mono)
        format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 48000, channels: 1, interleaved: true)!
        
        // Create temporary file
        audioURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("wav")
        
        guard let audioURL = audioURL else {
            throw RecorderError.recordingFailed
        }
        
        // Create audio file
        file = try AVAudioFile(forWriting: audioURL, settings: format.settings)
        
        // Setup hashing and recording
        let input = engine.inputNode
        input.installTap(onBus: 0, bufferSize: 2048, format: format) { buffer, _ in
            // Hash audio data in real-time
            if let data = buffer.int16DataLE() {
                self.hasher.update(data: data)
            }
            
            // Write to file
            try? self.file?.write(from: buffer)
        }
        
        engine.prepare()
        try engine.start()
        
        isRecording = true
        startTime = Date()
        
        return audioURL
    }
    
    func stop() throws -> (URL, Data) {
        guard isRecording, let audioURL = audioURL else {
            throw RecorderError.recordingFailed
        }
        
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        
        isRecording = false
        let hash = hasher.finalize()
        
        // Cleanup
        self.hasher = SHA256()
        
        return (audioURL, hash)
    }
    
    func getCurrentDuration() -> TimeInterval? {
        guard isRecording, let startTime = startTime else { return nil }
        return Date().timeIntervalSince(startTime)
    }
}

extension AVAudioPCMBuffer {
    func int16DataLE() -> Data? {
        guard format.commonFormat == .pcmFormatInt16,
              let int16ChannelData = int16ChannelData else {
            return nil
        }
        
        let frameLength = Int(self.frameLength)
        let channelCount = Int(format.channelCount)
        var data = Data(capacity: frameLength * channelCount * 2)
        
        for frame in 0..<frameLength {
            for channel in 0..<channelCount {
                let sample = int16ChannelData[channel][frame]
                data.append(contentsOf: withUnsafeBytes(of: sample.littleEndian) { Data($0) })
            }
        }
        
        return data
    }
}

