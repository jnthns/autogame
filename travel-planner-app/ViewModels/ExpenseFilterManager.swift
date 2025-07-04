import Foundation

struct ExpenseFilterManager {
    private(set) var active: Set<ExpenseFilter> = []
    mutating func toggle(_ filter: ExpenseFilter) {
        if active.contains(filter) { active.remove(filter) }
        else {
            // Remove any existing filter of same type
            active = active.filter { !$0.isSameType(as: filter) }
            active.insert(filter)
        }
    }
    mutating func clear() { active.removeAll() }
    func apply(to expenses: [Expense]) -> [Expense] {
        guard !active.isEmpty else { return expenses }
        return expenses.filter { exp in
            active.allSatisfy { filter in
                switch filter {
                case .category(let c): return exp.category == c
                case .payer(let p): return exp.payer == p
                case .paymentMethod(let m): return exp.paymentMethod == m
                }
            }
        }
    }
} 