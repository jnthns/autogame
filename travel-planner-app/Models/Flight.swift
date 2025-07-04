import Foundation

struct Flight: Codable, Hashable {
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
    
    // MARK: - Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(origin)
        hasher.combine(destination)
        hasher.combine(departureDate)
        hasher.combine(flightNumber)
    }
    
    static func == (lhs: Flight, rhs: Flight) -> Bool {
        lhs.origin == rhs.origin &&
        lhs.destination == rhs.destination &&
        lhs.departureDate == rhs.departureDate &&
        lhs.flightNumber == rhs.flightNumber
    }
} 