import Foundation

struct ItineraryDay: Codable {
    var date: Date
    // Activities indexed by section
    var activities: [Activity.Section: [Activity]]

    init(date: Date) {
        self.date = date
        self.activities = [:]
        Activity.Section.allCases.forEach { self.activities[$0] = [] }
    }
} 