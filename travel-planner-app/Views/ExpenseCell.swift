import UIKit

class ExpenseCell: UITableViewCell {
    static let identifier = "ExpenseCell"
    
    private var stackView: UIStackView!
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.spacing = 1
        stackView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stackView)
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: contentView.topAnchor),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])
    }
    
    func configure(with expense: Expense, columns: [KeyPath<Expense, String>]) {
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for column in columns {
            let container = UIView()
            container.translatesAutoresizingMaskIntoConstraints = false
            if column == \Expense.categoryIcon {
                let imageView = UIImageView()
                imageView.contentMode = .scaleAspectFit
                imageView.tintColor = .label
                imageView.translatesAutoresizingMaskIntoConstraints = false
                imageView.image = UIImage(systemName: expense.category.icon)
                container.addSubview(imageView)
                NSLayoutConstraint.activate([
                    imageView.centerYAnchor.constraint(equalTo: container.centerYAnchor),
                    imageView.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
                    imageView.widthAnchor.constraint(equalToConstant: 20),
                    imageView.heightAnchor.constraint(equalToConstant: 20)
                ])
            } else {
                let label = UILabel()
                label.font = .systemFont(ofSize: 14)
                label.textAlignment = .left
                label.text = expense[keyPath: column]
                label.adjustsFontSizeToFitWidth = true
                label.minimumScaleFactor = 0.8
                label.translatesAutoresizingMaskIntoConstraints = false
                container.addSubview(label)
                NSLayoutConstraint.activate([
                    label.topAnchor.constraint(equalTo: container.topAnchor, constant: 4),
                    label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
                    label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -8),
                    label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -4)
                ])
            }
            stackView.addArrangedSubview(container)
        }
    }
} 