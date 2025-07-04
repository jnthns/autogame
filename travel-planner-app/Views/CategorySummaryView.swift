import UIKit

class CategorySummaryView: UIView {
    private let iconView: UIImageView = {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFit
        iv.tintColor = .white
        iv.translatesAutoresizingMaskIntoConstraints = false
        return iv
    }()
    private let amountLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 10, weight: .medium)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    init(category: Expense.Category, amount: Decimal, currency: Expense.Currency) {
        super.init(frame: .zero)
        addSubview(iconView)
        addSubview(amountLabel)
        NSLayoutConstraint.activate([
            iconView.topAnchor.constraint(equalTo: topAnchor),
            iconView.centerXAnchor.constraint(equalTo: centerXAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 20),
            iconView.heightAnchor.constraint(equalToConstant: 20),
            amountLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 2),
            amountLabel.leadingAnchor.constraint(equalTo: leadingAnchor),
            amountLabel.trailingAnchor.constraint(equalTo: trailingAnchor),
            amountLabel.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        iconView.image = UIImage(systemName: category.icon)
        iconView.backgroundColor = category.color
        iconView.layer.cornerRadius = 10
        iconView.clipsToBounds = true
        let formatter = FormatterCache.currency(for: currency)
        amountLabel.text = formatter.string(from: NSDecimalNumber(decimal: amount))
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
} 