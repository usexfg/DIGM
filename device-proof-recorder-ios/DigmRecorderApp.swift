import SwiftUI

@main
struct DigmRecorderApp: App {
    var body: some Scene {
        WindowGroup {
            DigmOriginsView()
                .preferredColorScheme(.dark)
        }
    }
}

