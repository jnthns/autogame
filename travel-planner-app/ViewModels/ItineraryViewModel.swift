import Foundation

final class ItineraryViewModel {
    // MARK: - Properties
    private(set) var itinerary: Itinerary?
    var onUpdate: (() -> Void)?
    
    // MARK: - Initialization
    init(itinerary: Itinerary? = nil) {
        self.itinerary = itinerary
    }
    
    // MARK: - Public Interface
    var title: String {
        guard let itinerary = itinerary else { return "Itinerary" }
        return itinerary.destination.city.isEmpty ? "Trip" : itinerary.destination.city
    }
    
    var dateRangeText: String {
        guard let itinerary = itinerary else { return "" }
        let df = DateFormatter()
        df.dateStyle = .short
        if Calendar.current.isDate(itinerary.startDate, inSameDayAs: itinerary.endDate) {
            return df.string(from: itinerary.startDate)
        } else {
            return "\(df.string(from: itinerary.startDate)) - \(df.string(from: itinerary.endDate))"
        }
    }
    
    var departureFlight: Flight? { itinerary?.flight }
    var returnFlightObj: Flight? { itinerary?.returnFlight }
    
    var sections: [ItinerarySection] {
        guard let itinerary = itinerary else { return [] }
        var sections: [ItinerarySection] = []
        print("=== ITINERARY DEBUG ===")
        print("Trip: \(itinerary.destination.city)")
        print("Start: \(itinerary.startDate)")
        print("End: \(itinerary.endDate)")
        print("Days count: \(itinerary.days.count)")
        for (index, day) in itinerary.days.enumerated() {
            print("Day \(index): \(day.date)")
        }
        print("=== END ITINERARY DEBUG ===")
        
        sections.append(contentsOf: itinerary.days.map { .day($0.date) })
        sections.append(.returnFlight)
        return sections
    }
    
    func items(for section: ItinerarySection) -> [ItineraryItem] {
        guard let itinerary = itinerary else { return [] }
        
        switch section {
        case .returnFlight:
            return [.flight(itinerary.returnFlight)]
            
        case .day(let date):
            guard let day = itinerary.day(for: date) else { return [] }
            var items: [ItineraryItem] = []
            for section in orderedSections() {
                items.append(.activityHeader(section, date))  // Include date
                let activities = day.activities[section] ?? []
                items.append(contentsOf: activities.map { .activity($0) })
            }
            return items
        }
    }
    
    // Move activity within same day & section
    func moveActivity(on date: Date, section: Activity.Section, from fromIndex: Int, to toIndex: Int) {
        guard var itinerary = itinerary,
              let dayIdx = itinerary.days.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: date) }),
              var acts = itinerary.days[dayIdx].activities[section] else { return }
        guard acts.indices.contains(fromIndex), acts.indices.contains(toIndex) else { return }
        let moved = acts.remove(at: fromIndex)
        acts.insert(moved, at: toIndex)
        itinerary.days[dayIdx].activities[section] = acts
        self.itinerary = itinerary
        saveDraft()
        onUpdate?()
    }
    
    // MARK: - Data Management
    func updateItinerary(_ newItinerary: Itinerary) {
        itinerary = newItinerary
        onUpdate?()
    }
    
    func saveDraft(completion: (() -> Void)? = nil) {
        guard let itinerary = itinerary else { return }
        DraftsService.shared.saveDraft(itinerary) {
            completion?()
        }
    }
    
    func duplicateTrip() -> Itinerary {
        guard let itinerary = itinerary else { fatalError("Cannot duplicate nil itinerary") }
        var copy = itinerary
        copy.startDate = itinerary.startDate.addingTimeInterval(1)
        copy.id = UUID().uuidString
        return copy
    }
    
    // MARK: - Flight Management
    func updateFlight(_ flight: Flight?, isReturn: Bool) {
        guard var itinerary = itinerary else { return }
        if isReturn {
            itinerary.returnFlight = flight
        } else {
            itinerary.flight = flight
        }
        self.itinerary = itinerary
        saveDraft()
        onUpdate?()
    }
    
    func flight(for section: ItinerarySection) -> Flight? {
        guard let itinerary = itinerary else { return nil }
        switch section {
        case .returnFlight:
            return itinerary.returnFlight
        case .day:
            return nil
        }
    }
    
    // MARK: - Activity Management
    func addActivity(_ activity: Activity, to date: Date) {
        guard var itinerary = itinerary,
              let dayIndex = itinerary.days.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: date) }) else { return }
        
        itinerary.days[dayIndex].activities[activity.section, default: []].append(activity)
        self.itinerary = itinerary
        saveDraft()
        onUpdate?()
    }
    
    func updateActivity(_ activity: Activity, at date: Date) {
        guard var itinerary = itinerary,
              let dayIndex = itinerary.days.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: date) }) else { return }
        
        if var activities = itinerary.days[dayIndex].activities[activity.section] {
            if let index = activities.firstIndex(where: { $0.id == activity.id }) {
                activities[index] = activity
                itinerary.days[dayIndex].activities[activity.section] = activities
                self.itinerary = itinerary
                saveDraft()
                onUpdate?()
            }
        }
    }
    
    func removeActivity(_ activity: Activity, from date: Date) {
        guard var itinerary = itinerary,
              let dayIndex = itinerary.days.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: date) }) else { return }
        
        if var activities = itinerary.days[dayIndex].activities[activity.section] {
            activities.removeAll { $0.id == activity.id }
            itinerary.days[dayIndex].activities[activity.section] = activities
            self.itinerary = itinerary
            saveDraft()
            onUpdate?()
        }
    }
    
    func day(for section: ItinerarySection) -> ItineraryDay? {
        guard let itinerary = itinerary else { return nil }
        switch section {
        case .day(let date):
            return itinerary.day(for: date)
        case .returnFlight:
            return nil
        }
    }
    
    func orderedSections() -> [Activity.Section] {
        Activity.Section.allCases.sorted { $0.order < $1.order }
    }
}

// MARK: - Supporting Types
enum ItinerarySection: Hashable {
    case day(Date)
    case returnFlight
}

enum ItineraryItem: Hashable {
    case flight(Flight?)
    case activityHeader(Activity.Section, Date)  // Include date to make unique
    case activity(Activity)
} 