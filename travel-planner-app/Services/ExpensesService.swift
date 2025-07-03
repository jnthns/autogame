import Foundation

class ExpensesService {
    static let shared = ExpensesService()
    
    private static let expenseGroupsKey = "expenseGroups"
    
    private init() {}
    
    func updateExpenseGroup(_ expenseGroup: ExpenseGroup, forTrip tripId: String) {
        var expenseGroups = UserDefaults.standard.dictionary(forKey: Self.expenseGroupsKey) as? [String: Data] ?? [:]
        
        do {
            let data = try JSONEncoder().encode(expenseGroup)
            expenseGroups[tripId] = data
            UserDefaults.standard.set(expenseGroups, forKey: Self.expenseGroupsKey)
        } catch {
            print("Error saving expense group: \(error)")
        }
    }
    
    func fetchExpenseGroup(forTrip tripId: String) -> ExpenseGroup? {
        guard let expenseGroups = UserDefaults.standard.dictionary(forKey: Self.expenseGroupsKey) as? [String: Data],
              let data = expenseGroups[tripId] else {
            return nil
        }
        
        do {
            return try JSONDecoder().decode(ExpenseGroup.self, from: data)
        } catch {
            print("Error loading expense group: \(error)")
            return nil
        }
    }
    
    func deleteExpenseGroup(forTrip tripId: String) {
        var expenseGroups = UserDefaults.standard.dictionary(forKey: Self.expenseGroupsKey) as? [String: Data] ?? [:]
        expenseGroups.removeValue(forKey: tripId)
        UserDefaults.standard.set(expenseGroups, forKey: Self.expenseGroupsKey)
    }
} 