package org.usexfg.digmorigins.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class RecorderViewModel : ViewModel() {
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _duration = MutableStateFlow(0)
    val duration: StateFlow<Int> = _duration.asStateFlow()

    private val _fileSize = MutableStateFlow("")
    val fileSize: StateFlow<String> = _fileSize.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    private val _showRecordingsList = MutableStateFlow(false)
    val showRecordingsList: StateFlow<Boolean> = _showRecordingsList.asStateFlow()

    private val _showSettings = MutableStateFlow(false)
    val showSettings: StateFlow<Boolean> = _showSettings.asStateFlow()

    fun toggleRecording() {
        viewModelScope.launch {
            if (_isRecording.value) {
                stopRecording()
            } else {
                startRecording()
            }
        }
    }

    private fun startRecording() {
        _isRecording.value = true
        // TODO: Start audio recording with MicRecorder
        // TODO: Start timer for duration
    }

    private fun stopRecording() {
        _isProcessing.value = true
        _isRecording.value = false
        // TODO: Stop recording and generate .digm proof
        // TODO: Sign with Android Keystore
        viewModelScope.launch {
            // Simulate processing
            kotlinx.coroutines.delay(1000)
            _isProcessing.value = false
            _duration.value = 0
        }
    }

    fun toggleRecordingsList() {
        _showRecordingsList.value = !_showRecordingsList.value
    }

    fun toggleSettings() {
        _showSettings.value = !_showSettings.value
    }
}

