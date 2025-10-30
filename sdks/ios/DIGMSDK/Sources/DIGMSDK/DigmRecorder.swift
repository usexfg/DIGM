import AVFoundation
import CryptoKit

public struct DigmRecordingResult {
    public let audioURL: URL
    public let sha256: Data
}

public final class DigmRecorder: NSObject {
    private let engine = AVAudioEngine()
    private var file: AVAudioFile?
    private var hasher = SHA256()
    private var format: AVAudioFormat!

    public override init() {
        super.init()
    }

    public func start() throws -> URL {
        let session = AVAudioSession.sharedInstance()
        if let builtIn = session.availableInputs?.first(where: { $0.portType == .builtInMic }) {
            try session.setPreferredInput(builtIn)
        }
        try session.setCategory(.playAndRecord)
        try session.setActive(true)
        format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 48000, channels: 1, interleaved: true)!
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".wav")
        file = try AVAudioFile(forWriting: url, settings: format.settings)
        let input = engine.inputNode
        input.installTap(onBus: 0, bufferSize: 2048, format: input.inputFormat(forBus: 0)) { [weak self] buf, _ in
            guard let self else { return }
            if let data = buf.int16DataLE() {
                self.hasher.update(data: data)
            }
            try? self.file?.write(from: buf)
        }
        engine.prepare()
        try engine.start()
        return url
    }

    public func stop() -> DigmRecordingResult? {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        guard let fileURL = file?.url else { return nil }
        let digest = Data(hasher.finalize())
        return DigmRecordingResult(audioURL: fileURL, sha256: digest)
    }
}

private extension AVAudioPCMBuffer {
    func int16DataLE() -> Data? {
        guard format.commonFormat == .pcmFormatInt16, let d = int16ChannelData else { return nil }
        var data = Data(capacity: Int(frameLength) * 2)
        for i in 0..<Int(frameLength) {
            data.append(contentsOf: withUnsafeBytes(of: d[0][i].littleEndian) { Data($0) })
        }
        return data
    }
}
