import SwiftUI

@main
struct DigmRecorderApp: App {
    var body: some Scene {
        WindowGroup {
            VoiceMemoView()
                .preferredColorScheme(.dark)
        }
    }
}

