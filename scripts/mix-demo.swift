import AVFoundation
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let videoURL = root.appendingPathComponent("storyforge-demo-cut.m4v")
let audioURL = root.appendingPathComponent("demo-narration.aiff")
let outputURL = root.appendingPathComponent("storyforge-demo-final.mp4")

let videoAsset = AVURLAsset(url: videoURL)
let audioAsset = AVURLAsset(url: audioURL)
let composition = AVMutableComposition()

guard
  let sourceVideo = videoAsset.tracks(withMediaType: .video).first,
  let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
else { fatalError("Video track unavailable") }

let duration = videoAsset.duration
try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideo, at: .zero)
videoTrack.preferredTransform = sourceVideo.preferredTransform

if let sourceAudio = audioAsset.tracks(withMediaType: .audio).first,
   let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
  let audioDuration = CMTimeMinimum(audioAsset.duration, duration)
  try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: audioDuration), of: sourceAudio, at: .zero)
}

try? FileManager.default.removeItem(at: outputURL)
guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPreset1280x720) else {
  fatalError("Could not create exporter")
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
let semaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { semaphore.signal() }
semaphore.wait()
if exporter.status != .completed { fatalError(exporter.error?.localizedDescription ?? "Export failed") }
print(outputURL.path)
