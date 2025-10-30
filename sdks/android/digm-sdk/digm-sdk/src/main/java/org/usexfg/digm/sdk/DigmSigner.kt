package org.usexfg.digm.sdk

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.util.Base64

data class DigmSignatureBundle(
    val sha256Base64: String,
    val signatureBase64: String,
    val publicKeyBase64: String,
    val nonce: String,
    val timestampMs: Long
)

class DigmSigner(private val context: Context) {
    private val alias = "digm_sign_key"

    private fun ensureKey() {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (ks.containsAlias(alias)) return
        val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_SIGN
        )
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setUserAuthenticationRequired(false)
            .build()
        kpg.initialize(spec)
        kpg.generateKeyPair()
    }

    fun sign(sha256: ByteArray, nonce: String = java.util.UUID.randomUUID().toString()): DigmSignatureBundle {
        ensureKey()
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val entry = ks.getEntry(alias, null) as KeyStore.PrivateKeyEntry
        val privateKey = entry.privateKey
        val publicKey = entry.certificate.publicKey.encoded

        val sig = java.security.Signature.getInstance("SHA256withECDSA")
        sig.initSign(privateKey)
        sig.update(sha256)
        val signature = sig.sign()

        val b64 = Base64.getEncoder()
        return DigmSignatureBundle(
            sha256Base64 = b64.encodeToString(sha256),
            signatureBase64 = b64.encodeToString(signature),
            publicKeyBase64 = b64.encodeToString(publicKey),
            nonce = nonce,
            timestampMs = System.currentTimeMillis()
        )
    }
}
