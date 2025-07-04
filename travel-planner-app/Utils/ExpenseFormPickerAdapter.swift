import UIKit

final class ExpenseFormPickerAdapter: NSObject, UIPickerViewDelegate, UIPickerViewDataSource {
    enum Kind { case category, payer, payment, trip }
    private let kind: Kind
    private weak var alert: UIAlertController?
    private let fieldIndex: Int
    private weak var controller: ExpensesViewController?
    init(kind: Kind, fieldIndex: Int, alert: UIAlertController, controller: ExpensesViewController) {
        self.kind = kind
        self.alert = alert
        self.fieldIndex = fieldIndex
        self.controller = controller
    }
    // MARK: UIPickerViewDataSource
    func numberOfComponents(in pickerView: UIPickerView) -> Int { 1 }
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        switch kind {
        case .category: return Expense.Category.allCases.count
        case .payer: return DraftsService.shared.fetchPayers().count
        case .payment: return Expense.PaymentMethod.allCases.count
        case .trip: return DraftsService.shared.fetchDrafts().count + 1 // +1 for "No Trip"
        }
    }
    // MARK: UIPickerViewDelegate
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        switch kind {
        case .category: return Expense.Category.allCases[row].rawValue
        case .payer: return DraftsService.shared.fetchPayers()[row].name
        case .payment: return Expense.PaymentMethod.allCases[row].rawValue
        case .trip:
            if row == 0 { return "No Trip" }
            let drafts = DraftsService.shared.fetchDrafts()
            return drafts[row-1].destination.city
        }
    }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        guard let alert = alert else { return }
        switch kind {
        case .category:
            let value = Expense.Category.allCases[row].rawValue
            alert.textFields?[fieldIndex].text = value
        case .payer:
            let value = DraftsService.shared.fetchPayers()[row].name
            alert.textFields?[fieldIndex].text = value
        case .payment:
            let value = Expense.PaymentMethod.allCases[row].rawValue
            alert.textFields?[fieldIndex].text = value
        case .trip:
            if row == 0 {
                alert.textFields?[fieldIndex].text = ""
                controller?.selectedTripForNewExpense = nil
            } else {
                let trip = DraftsService.shared.fetchDrafts()[row-1]
                alert.textFields?[fieldIndex].text = trip.destination.city
                controller?.selectedTripForNewExpense = trip
            }
        }
    }
} 