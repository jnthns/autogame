import Foundation

final class ExpenseListViewModel {
    private(set) var expenseGroup: ExpenseGroup
    private var filterManager = ExpenseFilterManager()
    private(set) var filteredExpenses: [Expense] = []
    var onUpdate: (() -> Void)?
    init(group: ExpenseGroup) {
        self.expenseGroup = group
        applyFilters()
    }
    // MARK: - Modifications
    func add(_ expense: Expense) {
        expenseGroup.expenses.append(expense)
        save()
        applyFilters()
    }
    func delete(ids: Set<UUID>) {
        expenseGroup.expenses.removeAll { ids.contains($0.id) }
        save()
        applyFilters()
    }
    func replace(id: UUID, with expense: Expense) {
        if let idx = expenseGroup.expenses.firstIndex(where: { $0.id == id }) {
            expenseGroup.expenses[idx] = expense
            save()
            applyFilters()
        }
    }
    // MARK: - Filters
    func toggle(filter: ExpenseFilter) { filterManager.toggle(filter); applyFilters() }
    func clearFilters() { filterManager.clear(); applyFilters() }
    private func applyFilters() {
        filteredExpenses = filterManager.apply(to: expenseGroup.expenses)
        onUpdate?()
    }

    // MARK: - Summary helpers
    var total: Decimal {
        filteredExpenses.reduce(0) { $0 + $1.amount }
    }
    var categoryTotals: [Expense.Category: Decimal] {
        var dict: [Expense.Category: Decimal] = [:]
        for exp in filteredExpenses {
            dict[exp.category, default: 0] += exp.amount
        }
        return dict
    }
    // MARK: - Persistence
    private func save() {
        ExpensesService.shared.updateExpenseGroup(expenseGroup, forTrip: expenseGroup.id.uuidString)
    }
    // Helper
    func expense(for id: UUID) -> Expense? { expenseGroup.expenses.first { $0.id == id } }
} 