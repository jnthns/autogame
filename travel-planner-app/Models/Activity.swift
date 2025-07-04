import Foundation
import UIKit

// Models for expense tracking
struct Expense: Codable {
    var id: UUID = UUID()
    var title: String
    var amount: Decimal
    var category: Category
    var date: Date
    var notes: String?
    var paymentMethod: PaymentMethod
    var currency: Currency
    var payer: Payer
    var receiptImagePath: String?
    var tripId: String?
    var tripName: String?
    
    enum Category: String, Codable, CaseIterable {
        case food = "Food & Drinks"
        case transportation = "Transportation"
        case accommodation = "Accommodation"
        case activities = "Activities"
        case shopping = "Shopping"
        case other = "Other"
        
        var icon: String {
            switch self {
            case .food: return "fork.knife"
            case .transportation: return "car.fill"
            case .accommodation: return "house.fill"
            case .activities: return "ticket.fill"
            case .shopping: return "bag.fill"
            case .other: return "square.grid.2x2.fill"
            }
        }
        
        var color: UIColor {
            switch self {
            case .food: return .systemOrange
            case .transportation: return .systemBlue
            case .accommodation: return .systemGreen
            case .activities: return .systemPurple
            case .shopping: return .systemPink
            case .other: return .systemGray
            }
        }
    }
    
    enum PaymentMethod: String, Codable, CaseIterable {
        case cash = "Cash"
        case creditCard = "Credit Card"
        
        var icon: String {
            switch self {
            case .cash: return "banknote"
            case .creditCard: return "creditcard.fill"
            }
        }
    }
    
    enum Currency: String, Codable, CaseIterable {
        case usd = "USD"
        case eur = "EUR"
        case gbp = "GBP"
        case jpy = "JPY"
        case aud = "AUD"
        case cad = "CAD"
        // Add more currencies as needed
        
        var symbol: String {
            switch self {
            case .usd: return "$"
            case .eur: return "€"
            case .gbp: return "£"
            case .jpy: return "¥"
            case .aud: return "A$"
            case .cad: return "C$"
            }
        }
    }
    
    struct Payer: Codable, Hashable {
        let id: UUID
        var name: String
        var icon: String
        
        init(id: UUID = UUID(), name: String, icon: String = "person.fill") {
            self.id = id
            self.name = name
            self.icon = icon
        }
    }
}

struct ExpenseGroup: Codable {
    var id: UUID = UUID()
    var title: String
    var startDate: Date
    var endDate: Date
    var expenses: [Expense]
    var currency: Expense.Currency
    
    var total: Decimal {
        expenses.reduce(0) { $0 + $1.amount }
    }
    
    var categoryTotals: [Expense.Category: Decimal] {
        var totals: [Expense.Category: Decimal] = [:]
        for expense in expenses {
            totals[expense.category, default: 0] += expense.amount
        }
        return totals
    }
}

struct ExpenseColumn: Codable {
    var id: UUID = UUID()
    var title: String
    var type: ColumnType
    var order: Int
    
    enum ColumnType: String, Codable, CaseIterable {
        case text
        case number
        case currency
        case date
        
        var defaultValue: String {
            switch self {
            case .text: return ""
            case .number: return "0"
            case .currency: return "0.00"
            case .date: return Date().description
            }
        }
    }
}

struct ExpenseEntry: Codable {
    var id: UUID = UUID()
    var values: [UUID: String] // Maps column ID to value
    var date: Date
}

struct ExpenseTable: Codable {
    var id: UUID = UUID()
    var columns: [ExpenseColumn]
    var entries: [ExpenseEntry]
    var title: String
    
    init(title: String) {
        self.title = title
        self.columns = [
            ExpenseColumn(title: "Item", type: .text, order: 0),
            ExpenseColumn(title: "Amount", type: .currency, order: 1),
            ExpenseColumn(title: "Payment Method", type: .text, order: 2)
        ]
        self.entries = []
    }
}

struct Activity: Codable, Hashable {
    let id: String
    var title: String
    var notes: String?
    var section: Section
    var priority: Priority
    var duration: TimeInterval?
    var location: String?
    var url: URL?
    var colorHex: String?
    
    init(id: String = UUID().uuidString,
         title: String,
         notes: String? = nil,
         section: Section,
         priority: Priority = .medium,
         duration: TimeInterval? = nil,
         location: String? = nil,
         url: URL? = nil,
         colorHex: String? = nil) {
        self.id = id
        self.title = title
        self.notes = notes
        self.section = section
        self.priority = priority
        self.duration = duration
        self.location = location
        self.url = url
        self.colorHex = colorHex
    }
    
    // Compatibility initializer matching legacy parameter order
    init(id: String = UUID().uuidString,
         section: Section,
         title: String,
         notes: String? = nil,
         durationMinutes: Int? = nil,
         colorHex: String? = nil) {
        self.id = id
        self.section = section
        self.title = title
        self.notes = notes
        self.priority = .medium
        if let mins = durationMinutes {
            self.duration = TimeInterval(mins * 60)
        } else {
            self.duration = nil
        }
        self.location = nil
        self.url = nil
        self.colorHex = colorHex
    }
    
    enum Section: String, CaseIterable, Codable, Hashable {
        case morning = "Morning"
        case afternoon = "Afternoon"
        case evening = "Evening"
        
        var order: Int {
            switch self {
            case .morning: return 0
            case .afternoon: return 1
            case .evening: return 2
            }
        }
        
        var title: String { rawValue }
    }
    
    enum Priority: String, CaseIterable, Codable, Hashable {
        case low = "Low"
        case medium = "Medium"
        case high = "High"
    }
    
    // Update uiColor to fallback to colorHex if provided
    var uiColor: UIColor {
        if let hex = colorHex, let color = UIColor(hex: hex) { return color }
        switch priority {
        case .low: return .systemGreen
        case .medium: return .systemOrange
        case .high: return .systemRed
        }
    }
    
    // Backwards compatibility: allow access via durationMinutes in minutes
    var durationMinutes: Int? {
        get {
            guard let dur = duration else { return nil }
            return Int(dur / 60)
        }
        set {
            if let newVal = newValue {
                duration = TimeInterval(newVal * 60)
            } else {
                duration = nil
            }
        }
    }
    
    // MARK: - Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Activity, rhs: Activity) -> Bool {
        lhs.id == rhs.id
    }
}

extension UIColor {
    convenience init?(hex: String) {
        var hexString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if hexString.hasPrefix("#") { hexString.removeFirst() }
        guard hexString.count == 6,
              let rgb = UInt32(hexString, radix: 16) else { return nil }
        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b, alpha: 1.0)
    }
}

// MARK: - Payer Management
extension UserDefaults {
    private static let payersKey = "ExpensePayers"
    
    var payers: [Expense.Payer] {
        get {
            guard let data = data(forKey: UserDefaults.payersKey),
                  let payers = try? JSONDecoder().decode([Expense.Payer].self, from: data) else {
                // Default payers if none exist
                let defaults = [
                    Expense.Payer(name: "Me"),
                    Expense.Payer(name: "Partner"),
                    Expense.Payer(name: "Friend"),
                    Expense.Payer(name: "Group")
                ]
                self.payers = defaults
                return defaults
            }
            return payers
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                set(data, forKey: UserDefaults.payersKey)
            }
        }
    }
} 
