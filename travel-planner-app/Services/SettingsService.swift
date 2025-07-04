import Foundation

final class SettingsService {
    static let shared = SettingsService()
    private init() {}
    
    // MARK: - Keys
    private enum Keys {
        static let lastViewedTripId = "lastViewedTripId"
        static let columnSettings = "columnSettings"
        static let expensePayers = "expensePayers"
    }
    
    // MARK: - Trip Management
    func setLastViewedTripId(_ tripId: String) {
        UserDefaults.standard.set(tripId, forKey: Keys.lastViewedTripId)
    }
    
    func getLastViewedTripId() -> String? {
        return UserDefaults.standard.string(forKey: Keys.lastViewedTripId)
    }
    
    // MARK: - Column Settings
    func saveColumnSettings(_ settings: [String: Bool]) {
        UserDefaults.standard.set(settings, forKey: Keys.columnSettings)
    }
    
    func getColumnSettings() -> [String: Bool] {
        return UserDefaults.standard.dictionary(forKey: Keys.columnSettings) as? [String: Bool] ?? [:]
    }
    
    // MARK: - Expense Columns
    func saveColumns(_ columns: [ExpensesViewController.Column]) {
        if let data = try? JSONEncoder().encode(columns) {
            UserDefaults.standard.set(data, forKey: Keys.columnSettings)
        }
    }
    
    func loadColumns() -> [ExpensesViewController.Column]? {
        guard let data = UserDefaults.standard.data(forKey: Keys.columnSettings) else { return nil }
        return try? JSONDecoder().decode([ExpensesViewController.Column].self, from: data)
    }
    
    // MARK: - Expense Payers
    func saveExpensePayers(_ payers: [String]) {
        UserDefaults.standard.set(payers, forKey: Keys.expensePayers)
    }
    
    func getExpensePayers() -> [String] {
        return UserDefaults.standard.stringArray(forKey: Keys.expensePayers) ?? []
    }
} 