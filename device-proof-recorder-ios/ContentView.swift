import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = RecorderViewModel()
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Header
                Text("DIGM Proof Recorder")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Secure Audio Recording")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                
                Spacer()
                
                // Status indicator
                HStack {
                    Circle()
                        .fill(viewModel.statusColor)
                        .frame(width: 12, height: 12)
                    
                    Text(viewModel.status)
                        .font(.body)
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(10)
                
                // Record button
                Button(action: viewModel.toggleRecording) {
                    HStack {
                        Image(systemName: viewModel.isRecording ? "stop.circle.fill" : "record.circle")
                            .font(.system(size: 40))
                        Text(viewModel.isRecording ? "Stop Recording" : "Start Recording")
                            .font(.title3)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.isRecording ? Color.red : Color.green)
                    .cornerRadius(15)
                }
                .disabled(viewModel.isProcessing)
                
                // Recording info
                if viewModel.isRecording {
                    VStack(spacing: 10) {
                        Text("Recording...")
                            .font(.caption)
                            .foregroundColor(.red)
                        
                        if let duration = viewModel.duration {
                            Text(formatDuration(duration))
                                .font(.title2)
                                .monospacedDigit()
                        }
                        
                        if let fileSize = viewModel.fileSize {
                            Text("Size: \(fileSize)")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                // Export section
                if let exportURL = viewModel.exportURL {
                    VStack(spacing: 15) {
                        Text("Proof Bundle Ready")
                            .font(.headline)
                        
                        Button("Share Proof Bundle") {
                            viewModel.share(url: exportURL)
                        }
                        .foregroundColor(.blue)
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(10)
                        
                        Button("New Recording") {
                            viewModel.prepare()
                        }
                        .foregroundColor(.gray)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(15)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("DIGM Recorder")
        }
        .onAppear {
            viewModel.prepare()
        }
        .alert("External Microphone Detected", isPresented: $viewModel.showExternalMicAlert) {
            Button("OK") { viewModel.dismissAlert() }
        } message: {
            Text("Please unplug external microphones and use only the built-in microphone.")
        }
    }
    
    func formatDuration(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }
}

#Preview {
    ContentView()
}

