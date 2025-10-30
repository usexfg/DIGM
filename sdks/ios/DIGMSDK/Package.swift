// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DIGMSDK",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "DIGMSDK",
            targets: ["DIGMSDK"]
        )
    ],
    targets: [
        .target(
            name: "DIGMSDK",
            path: "Sources"
        ),
        .testTarget(
            name: "DIGMSDKTests",
            dependencies: ["DIGMSDK"],
            path: "Tests"
        )
    ]
)
