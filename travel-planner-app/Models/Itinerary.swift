import Foundation

struct Itinerary: Codable {
    static let calendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone.current
        return cal
    }()

    var id: String
    var destination: Destination
    var startDate: Date
    var endDate: Date
    var days: [ItineraryDay]
    var flight: Flight?
    var returnFlight: Flight?

    init(destination: Destination, startDate: Date, endDate: Date, id: String = UUID().uuidString) {
        self.id = id
        self.destination = destination
        self.startDate = startDate
        self.endDate = endDate
        self.days = []
        self.flight = nil
        self.returnFlight = nil
        var current = Self.calendar.startOfDay(for: startDate)
        let end = Self.calendar.startOfDay(for: endDate)
        while current <= end {
            days.append(ItineraryDay(date: current))
            current = Self.calendar.date(byAdding: .day, value: 1, to: current) ?? current
        }
    }

    func day(for date: Date) -> ItineraryDay? {
        return days.first { Self.calendar.isDate($0.date, inSameDayAs: date) }
    }

    // Custom Codable to handle backwards compatibility where older saved drafts may not contain an id
    enum CodingKeys: String, CodingKey {
        case id, destination, startDate, endDate, days, flight, returnFlight
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        destination = try container.decode(Destination.self, forKey: .destination)
        startDate = try container.decode(Date.self, forKey: .startDate)
        endDate = try container.decode(Date.self, forKey: .endDate)
        days = try container.decode([ItineraryDay].self, forKey: .days)
        flight = try container.decodeIfPresent(Flight.self, forKey: .flight)
        returnFlight = try container.decodeIfPresent(Flight.self, forKey: .returnFlight)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(destination, forKey: .destination)
        try container.encode(startDate, forKey: .startDate)
        try container.encode(endDate, forKey: .endDate)
        try container.encode(days, forKey: .days)
        try container.encodeIfPresent(flight, forKey: .flight)
        try container.encodeIfPresent(returnFlight, forKey: .returnFlight)
    }
} 