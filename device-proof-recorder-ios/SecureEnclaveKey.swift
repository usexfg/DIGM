import CryptoKit
import Security
import Foundation

final class SecureEnclaveKeyManager {
    static let shared = SecureEnclaveKeyManager()
    
    private var key: SecureEnclave.P256.Signing.PrivateKey?
    
    private init() {}
    
    func getKey() throws -> SecureEnclave.P256.Signing.PrivateKey {
        if let existingKey = key {
            return existingKey
        }
        
        // Create access control for Secure Enclave
        let accessControl = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .privateKeyUsage,
            nil
        )!
        
        // Create new key in Secure Enclave
        let privateKey = try SecureEnclave.P256.Signing.PrivateKey(
            accessControl: accessControl
        )
        
        key = privateKey
        return privateKey
    }
    
    func sign(data: Data) throws -> Data {
        let privateKey = try getKey()
        let signature = try privateKey.signature(for: data)
        return signature.derRepresentation
    }
    
    func publicKey() throws -> Data {
        let privateKey = try getKey()
        return privateKey.publicKey.compactRepresentation ?? privateKey.publicKey.rawRepresentation
    }
    
    func publicKeyHex() throws -> String {
        let publicKeyData = try publicKey()
        return publicKeyData.map { String(format: "%02x", $0) }.joined()
    }
}

// Helper extension for DER signature format
extension P256.Signing.ECDSASignature {
    var derRepresentation: Data {
        var der = Data()
        
        // DER SEQUENCE tag
        der.append(0x30)
        
        // Length (will be calculated)
        var lengthBytes = Data()
        
        // r value
        var rBytes = Data(self.rawRepresentation.prefix(32))
        // Remove leading zeros
        while rBytes.first == 0 { rBytes.removeFirst() }
        
        // Add INTEGER tag and length
        lengthBytes.append(0x02)  // INTEGER tag
        lengthBytes.append(UInt8(rBytes.count))
        lengthBytes.append(contentsOf: rBytes)
        
        // s value
        var sBytes = Data(self.rawRepresentation.suffix(32))
        // Remove leading zeros
        while sBytes.first == 0 { sBytes.removeFirst() }
        
        // Add INTEGER tag and length
        lengthBytes.append(0x02)  // INTEGER tag
        lengthBytes.append(UInt8(sBytes.count))
        lengthBytes.append(contentsOf: sBytes)
        
        // Set overall length
        if lengthBytes.count < 128 {
            der.append(UInt8(lengthBytes.count))
        } else {
            let lengthLength = getLengthLength(lengthBytes.count)
            der.append(0x80 | UInt8(lengthLength))
            der.append(contentsOf: getLengthBytes(lengthBytes.count, lengthLength))
        }
        
        der.append(contentsOf: lengthBytes)
        
        return der
    }
    
    private func getLengthLength(_ length: Int) -> Int {
        if length < 128 { return 1 }
        if length < 256 { return 2 }
        if length < 65536 { return 3 }
        if length < 16777216 { return 4 }
        return 5
    }
    
    private func getLengthBytes(_ length: Int, _ bytes: Int) -> Data {
        var result = Data()
        var value = length
        for _ in 0..<bytes {
            result.insert(UInt8(value & 0xFF), at: 0)
            value >>= 8
        }
        return result
    }
}

