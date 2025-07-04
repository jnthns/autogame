import Foundation

enum FormatterCache {
    static let dateShort: DateFormatter = {
        let df = DateFormatter()
        df.dateStyle = .short
        return df
    }()
    
    static func currency(for currency: Expense.Currency) -> NumberFormatter {
        if let cached = currencyCache[currency.rawValue] { return cached }
        let nf = NumberFormatter()
        nf.numberStyle = .currency
        nf.currencySymbol = currency.symbol
        currencyCache[currency.rawValue] = nf
        return nf
    }
    private static var currencyCache: [String: NumberFormatter] = [:]
} 