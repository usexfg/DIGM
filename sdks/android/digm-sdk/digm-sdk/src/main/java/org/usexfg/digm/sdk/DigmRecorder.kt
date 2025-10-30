package org.usexfg.digm.sdk

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File
import java.security.MessageDigest

data class DigmRecordingResult(
    val file: File,
    val sha256: ByteArray
)

class DigmRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private val digest = MessageDigest.getInstance("SHA-256")

    fun start(): File {
        val dir = File(context.cacheDir, "digm").apply { mkdirs() }
        val out = File(dir, "rec_${System.currentTimeMillis()}.m4a")
        outputFile = out

        val r = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else MediaRecorder()
        recorder = r
        r.setAudioSource(MediaRecorder.AudioSource.MIC)
        r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        r.setAudioEncodingBitRate(128_000)
        r.setAudioSamplingRate(48_000)
        r.setOutputFile(out.absolutePath)
        r.prepare()
        r.start()
        return out
    }

    fun stop(): DigmRecordingResult {
        val r = recorder ?: throw IllegalStateException("Not recording")
        try {
            r.stop()
        } finally {
            r.release()
            recorder = null
        }
        val file = outputFile ?: throw IllegalStateException("No file")
        val bytes = file.readBytes()
        val hash = digest.digest(bytes)
        return DigmRecordingResult(file, hash)
    }
}
