import Foundation

struct ExportService {
    static func csvData(for expenses: [Expense]) -> Data? {
        var csv = "Date,Title,Amount,Category,Payer,Payment Method,Currency,Notes\n"
        let dateFormatter = FormatterCache.dateShort
        for exp in expenses {
            let row = [
                dateFormatter.string(from: exp.date),
                exp.title,
                String(describing: exp.amount),
                exp.category.rawValue,
                exp.payer.name,
                exp.paymentMethod.rawValue,
                exp.currency.rawValue,
                exp.notes ?? ""
            ].map { "\"\($0)\"" }.joined(separator: ",")
            csv += row + "\n"
        }
        return csv.data(using: .utf8)
    }
} 