package org.usexfg.digmorigins.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.usexfg.digmorigins.ui.theme.*
import org.usexfg.digmorigins.viewmodel.RecorderViewModel

@Composable
fun DigmOriginsScreen(
    viewModel: RecorderViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val isRecording by viewModel.isRecording.collectAsState()
    val duration by viewModel.duration.collectAsState()
    val fileSize by viewModel.fileSize.collectAsState()
    val showRecordingsList by viewModel.showRecordingsList.collectAsState()
    val showSettings by viewModel.showSettings.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = { viewModel.toggleRecordingsList() }) {
                        Icon(Icons.Default.List, contentDescription = "Recordings")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleSettings() }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = LightMarble
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Ivory, LightMarble)
                    )
                )
                .padding(paddingValues)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom
            ) {
                Spacer(modifier = Modifier.weight(1f))

                // Duration display (Greek temple aesthetic)
                if (isRecording && duration > 0) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(bottom = 40.dp)
                    ) {
                        HorizontalDivider(
                            modifier = Modifier.width(120.dp),
                            thickness = 2.dp,
                            color = MediumGray
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = formatTime(duration),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Light,
                            color = DarkGray,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(
                            modifier = Modifier.width(120.dp),
                            thickness = 2.dp,
                            color = MediumGray
                        )
                    }
                }

                // Record button - US Dime size (17.91mm = ~51dp)
                val dimeSize = 51.dp
                RecordButton(
                    isRecording = isRecording,
                    isProcessing = viewModel.isProcessing.collectAsState().value,
                    size = dimeSize,
                    onToggle = { viewModel.toggleRecording() },
                    modifier = Modifier.padding(bottom = 50.dp)
                )

                // File size display
                if (isRecording && fileSize.isNotEmpty()) {
                    Text(
                        text = "Size: $fileSize",
                        fontSize = 12.sp,
                        color = MediumGray,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
            }

            // Top-right recording indicator
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(20.dp)
            ) {
                IndicatorDot(isRecording = isRecording)
            }
        }
    }

    // Recordings list sheet
    if (showRecordingsList) {
        RecordingsListSheet(
            viewModel = viewModel,
            onDismiss = { viewModel.toggleRecordingsList() }
        )
    }

    // Settings sheet
    if (showSettings) {
        SettingsSheet(
            onDismiss = { viewModel.toggleSettings() }
        )
    }
}

@Composable
fun RecordButton(
    isRecording: Boolean,
    isProcessing: Boolean,
    size: androidx.compose.ui.unit.Dp,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        // Outer ring (Greek temple style)
        Box(
            modifier = Modifier
                .size(size + 8.dp)
                .background(
                    color = MediumGray.copy(alpha = 0.3f),
                    shape = androidx.compose.foundation.shape.CircleShape
                )
        )

        // Main button
        FloatingActionButton(
            onClick = onToggle,
            modifier = Modifier.size(size),
            containerColor = if (isRecording) Red else White,
            disabled = isProcessing
        ) {
            Icon(
                imageVector = if (isRecording)
                    androidx.compose.material.icons.Icons.Default.Stop
                else
                    androidx.compose.material.icons.Icons.Default.Mic,
                contentDescription = if (isRecording) "Stop" else "Record",
                tint = if (isRecording) White else Red,
                modifier = Modifier.size(if (isRecording) 20.dp else 28.dp)
            )
        }
    }
}

@Composable
fun IndicatorDot(isRecording: Boolean) {
    Box(
        modifier = Modifier
            .size(10.dp)
            .background(
                color = if (isRecording) Red else MediumGray.copy(alpha = 0.3f),
                shape = androidx.compose.foundation.shape.CircleShape
            )
    )
}

fun formatTime(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%02d:%02d", mins, secs)
}

// Placeholder composables - implement fully later
@Composable
fun RecordingsListSheet(
    viewModel: RecorderViewModel,
    onDismiss: () -> Unit
) {
    // TODO: Implement recordings list
}

@Composable
fun SettingsSheet(onDismiss: () -> Unit) {
    // TODO: Implement settings
}

