import Foundation
import AmplitudeUnified

final class AnalyticsService {
    static let shared = AnalyticsService()
    private let amplitude: Amplitude
    private init() {
        let analyticsConfig = AnalyticsConfig(
            flushQueueSize: 30,
            flushIntervalMillis: 30000,
            trackingOptions: TrackingOptions().disableTrackCity().disableTrackIpAddress(),
            minTimeBetweenSessionsMillis: 300000,
            // autocapture: [.appLifecycles, .screenViews]
        )
        
        let experimentConfig = ExperimentPlugin.Config(
            debug: true,
            serverUrl: "https://api.lab.amplitude.com",
            fetchTimeoutMillis: 10000
        )
            
        amplitude = Amplitude(apiKey: "32f165ed342a14cf9807e18f537cc602",
              analyticsConfig: analyticsConfig,
              experimentConfig: experimentConfig
        )
    }
    
    func logEvent(_ name: String, properties: [String: Any]? = nil) {
        amplitude.track(event: BaseEvent(eventType: name, eventProperties: properties))
    }
    
    var sessionId: Int64? { amplitude.getSessionId() }
} 
