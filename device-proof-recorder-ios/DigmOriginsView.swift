import SwiftUI
import AVFoundation

// US Dime dimensions in points
// Real dime: 17.91mm diameter
// At 72 DPI: 17.91mm = 50.8 points
// Round to 51 points for exact dime size
let DIME_DIAMETER: CGFloat = 51

struct DigmOriginsView: View {
    @StateObject private var recorder = DigmOriginsRecorder()
    
    var body: some View {
        NavigationView {
            ZStack {
                // Ivory marble background with Greek temple aesthetic
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.96, green: 0.96, blue: 0.95), // Ivory
                        Color(red: 0.98, green: 0.98, blue: 0.97)  // Light marble
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    Spacer()
                    
                    VStack(spacing: 20) {
                        // Elegant Greek-style duration display
                        if recorder.isRecording, let duration = recorder.duration {
                            VStack(spacing: 8) {
                                // Top decorative line
                                Rectangle()
                                    .fill(Color(red: 0.4, green: 0.4, blue: 0.4))
                                    .frame(width: 120, height: 2)
                                
                                Text(formatTime(duration))
                                    .font(.system(size: 32, weight: .light))
                                    .monospacedDigit()
                                    .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.3))
                                
                                // Bottom decorative line
                                Rectangle()
                                    .fill(Color(red: 0.4, green: 0.4, blue: 0.4))
                                    .frame(width: 120, height: 2)
                            }
                        }
                        
                        // US Dime-sized record button with marble aesthetic
                        Button(action: recorder.toggleRecording) {
                            ZStack {
                                // Ornate Greek-style outer ring
                                Circle()
                                    .strokeBorder(
                                        Color(red: 0.3, green: 0.3, blue: 0.3),
                                        lineWidth: 2
                                    )
                                    .frame(width: DIME_DIAMETER + 8, height: DIME_DIAMETER + 8)
                                
                                // Marble texture base
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            gradient: Gradient(colors: recorder.isRecording ? [
                                                Color(red: 0.7, green: 0.1, blue: 0.1),
                                                Color(red: 0.8, green: 0.2, blue: 0.2)
                                            ] : [
                                                Color(white: 0.85),
                                                Color(white: 0.95)
                                            ]),
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: DIME_DIAMETER + 4, height: DIME_DIAMETER + 4)
                                    .overlay(
                                        Circle()
                                            .stroke(Color(red: 0.2, green: 0.2, blue: 0.2).opacity(0.3), lineWidth: 1)
                                    )
                                
                                // Main button - exact dime size
                                Circle()
                                    .fill(recorder.isRecording ? Color.red : Color.white)
                                    .frame(width: DIME_DIAMETER, height: DIME_DIAMETER)
                                    .shadow(color: .black.opacity(0.2), radius: 6, x: 0, y: 3)
                                
                                // Inner icon/indicator
                                Image(systemName: recorder.isRecording ? "square.fill" : "circle.fill")
                                    .font(.system(size: recorder.isRecording ? 10 : 14))
                                    .foregroundColor(recorder.isRecording ? .white : Color(red: 0.9, green: 0.1, blue: 0.1))
                            }
                        }
                        .disabled(recorder.isProcessing)
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in
                                    let impact = UIImpactFeedbackGenerator(style: .medium)
                                    impact.impactOccurred()
                                }
                        )
                        .scaleEffect(recorder.isProcessing ? 0.95 : 1.0)
                        .animation(.easeInOut(duration: 0.2), value: recorder.isProcessing)
                        
                        // Elegant file size display
                        if recorder.isRecording, let size = recorder.fileSize {
                            Text("Size: \(size)")
                                .font(.caption2)
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.5))
                                .italic()
                        }
                    }
                    .padding(.bottom, 50)
                }
                
                // Top-right indicator
                VStack {
                    HStack {
                        Spacer()
                        
                        Circle()
                            .fill(recorder.isRecording ? Color.red : Color.gray)
                            .frame(width: 10, height: 10)
                            .padding(.trailing, 20)
                            .padding(.top, 10)
                            .opacity(recorder.isRecording ? 1.0 : 0.3)
                            .scaleEffect(recorder.isRecording ? 1.2 : 1.0)
                            .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: recorder.isRecording)
                    }
                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { recorder.showRecordingsList.toggle() }) {
                        Image(systemName: "list.bullet")
                            .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.3))
                            .font(.system(size: 20))
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { recorder.showSettings.toggle() }) {
                        Image(systemName: "gear")
                            .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.3))
                            .font(.system(size: 20))
                    }
                }
            }
            .sheet(isPresented: $recorder.showRecordingsList) {
                RecordingsListView(recorder: recorder)
            }
            .sheet(isPresented: $recorder.showSettings) {
                SettingsView()
            }
            .alert("Error", isPresented: $recorder.showError) {
                Button("OK") {}
            } message: {
                Text(recorder.errorMessage)
            }
        }
    }
    
    func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }
}

// Recordings List View
struct RecordingsListView: View {
    @ObservedObject var recorder: DigmOriginsRecorder
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.96, green: 0.96, blue: 0.95),
                        Color(red: 0.98, green: 0.98, blue: 0.97)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                if recorder.recordings.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "waveform")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("No Recordings Yet")
                            .font(.title2)
                            .foregroundColor(.gray)
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(recorder.recordings) { recording in
                                RecordingCard(recording: recording, recorder: recorder)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Recordings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// Recording Card
struct RecordingCard: View {
    let recording: Recording
    let recorder: DigmOriginsRecorder
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "waveform")
                .font(.title3)
                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.3))
                .frame(width: 40)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(recording.name)
                    .font(.headline)
                    .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.2))
                
                Text(recording.date.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            HStack(spacing: 16) {
                Text(formatDuration(recording.duration))
                    .font(.caption)
                    .foregroundColor(.gray)
                
                Button(action: { recorder.share(recording) }) {
                    Image(systemName: "square.and.arrow.up")
                        .foregroundColor(.blue)
                }
                
                Button(action: { recorder.play(recording) }) {
                    Image(systemName: recording.isPlaying ? "stop.circle" : "play.circle")
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color(white: 0.85))
        .cornerRadius(12)
    }
    
    func formatDuration(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}

// Settings View
struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.96, green: 0.96, blue: 0.95),
                        Color(red: 0.98, green: 0.98, blue: 0.97)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                Form {
                    Section("About") {
                        HStack {
                            Text("Version")
                            Spacer()
                            Text("1.0.0")
                                .foregroundColor(.gray)
                        }
                        
                        HStack {
                            Text("Format")
                            Spacer()
                            Text(".digm")
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Section("Recording") {
                        HStack {
                            Text("Sample Rate")
                            Spacer()
                            Text("48 kHz")
                                .foregroundColor(.gray)
                        }
                        
                        HStack {
                            Text("Bit Depth")
                            Spacer()
                            Text("16-bit")
                                .foregroundColor(.gray)
                        }
                        
                        HStack {
                            Text("Channels")
                            Spacer()
                            Text("Mono")
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Section("Security") {
                        HStack {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(.green)
                            Text("Secure Enclave Signing")
                        }
                        
                        HStack {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(.green)
                            Text("Built-in Mic Only")
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    DigmOriginsView()
}
