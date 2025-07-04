import UIKit

class HeaderCell: UITableViewHeaderFooterView {
    static let identifier = "HeaderCell"
    private var stackView: UIStackView!
    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    private func setupUI() {
        stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.spacing = 1
        stackView.translatesAutoresizingMaskIntoConstraints = false
        contentView.backgroundColor = .systemGray6
        contentView.addSubview(stackView)
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: contentView.topAnchor),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])
    }
    func configure(with titles: [String]) {
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for title in titles {
            let label = UILabel()
            label.font = .systemFont(ofSize: 14, weight: .medium)
            label.textAlignment = .left
            label.text = title
            let container = UIView()
            container.addSubview(label)
            label.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                label.topAnchor.constraint(equalTo: container.topAnchor, constant: 4),
                label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
                label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -8),
                label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -4)
            ])
            stackView.addArrangedSubview(container)
        }
    }
} 