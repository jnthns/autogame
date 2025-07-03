import Foundation

struct Flight: Codable {
    var origin: String
    var destination: String
    var flightNumber: String?
    var departureDate: Date
    var arrivalDate: Date
    var durationMinutes: Int?
    var layovers: String?
    
    var durationText: String? {
        guard let minutes = durationMinutes else { return nil }
        return "\(minutes / 60)h \(minutes % 60)m"
    }
} 