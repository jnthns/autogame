import Foundation

final class DraftsService {
    static let shared = DraftsService()
    private init() {}
    
    private let defaultsKey = "tripDrafts"
    private let payersKey = "expensePayers"
    private let queue = DispatchQueue(label: "DraftsServiceQueue")

    func fetchDrafts() -> [Itinerary] {
        guard let data = UserDefaults.standard.data(forKey: defaultsKey) else { return [] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([Itinerary].self, from: data)) ?? []
    }
    
    func saveDraft(_ itinerary: Itinerary, completion: (() -> Void)? = nil) {
        queue.async {
            var drafts = self.fetchDrafts()
            // Replace draft for same destination + start date if exists
            if let index = drafts.firstIndex(where: { $0.id == itinerary.id }) {
                drafts[index] = itinerary
            } else {
                drafts.append(itinerary)
            }
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            if let data = try? encoder.encode(drafts) {
                UserDefaults.standard.set(data, forKey: self.defaultsKey)
            }
            DispatchQueue.main.async { completion?() }
        }
    }
    
    func deleteDraft(at index: Int, completion: (() -> Void)? = nil) {
        queue.async {
            var drafts = self.fetchDrafts()
            guard drafts.indices.contains(index) else { return }
            drafts.remove(at: index)
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            if let data = try? encoder.encode(drafts) {
                UserDefaults.standard.set(data, forKey: self.defaultsKey)
            }
            DispatchQueue.main.async { completion?() }
        }
    }
    
    // MARK: - Payer Management
    func fetchPayers() -> [Expense.Payer] {
        guard let data = UserDefaults.standard.data(forKey: payersKey) else { return [Expense.Payer(name: "Me")] }
        return (try? JSONDecoder().decode([Expense.Payer].self, from: data)) ?? [Expense.Payer(name: "Me")]
    }
    
    func savePayers(_ payers: [Expense.Payer]) {
        if let data = try? JSONEncoder().encode(payers) {
            UserDefaults.standard.set(data, forKey: payersKey)
        }
    }
} 