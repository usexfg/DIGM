import Foundation
import CryptoKit

public struct DigmSignatureBundle: Codable {
    public let sha256Base64: String
    public let signatureBase64: String
    public let publicKeyBase64: String
    public let nonce: String
    public let timestampISO8601: String

    public init(sha256: Data, signature: Data, publicKey: Data, nonce: String) {
        self.sha256Base64 = sha256.base64EncodedString()
        self.signatureBase64 = signature.base64EncodedString()
        self.publicKeyBase64 = publicKey.base64EncodedString()
        self.nonce = nonce
        self.timestampISO8601 = ISO8601DateFormatter().string(from: Date())
    }
}

public final class DigmSigner {
    private var key: SecureEnclave.P256.Signing.PrivateKey?

    public init() {}

    private func getKey() throws -> SecureEnclave.P256.Signing.PrivateKey {
        if let k = key { return k }
        let k = try SecureEnclave.P256.Signing.PrivateKey()
        key = k
        return k
    }

    public func sign(sha256: Data, nonce: String = UUID().uuidString) throws -> DigmSignatureBundle {
        let signature = try getKey().signature(for: sha256)
        let pub = try getKey().publicKey.rawRepresentation
        return DigmSignatureBundle(
            sha256: sha256,
            signature: signature.derRepresentation,
            publicKey: pub,
            nonce: nonce
        )
    }
}
