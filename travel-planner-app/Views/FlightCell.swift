import UIKit

class FlightCell: UITableViewCell {
    static let identifier = "FlightCell"
    
    private let titleLabel = UILabel()
    private let detailLabel = UILabel()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setup()
    }
    required init?(coder: NSCoder) { super.init(coder: coder); setup() }
    
    private func setup() {
        accessoryType = .disclosureIndicator
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        detailLabel.font = UIFont.systemFont(ofSize: 14)
        detailLabel.textColor = .secondaryLabel
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        detailLabel.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(titleLabel)
        contentView.addSubview(detailLabel)
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            detailLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            detailLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            detailLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            detailLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12)
        ])
    }
    
    func configure(with flight: Flight?) {
        if let flight = flight {
            titleLabel.text = "\(flight.origin) → \(flight.destination)"
            var details: [String] = []
            if let num = flight.flightNumber { details.append(num) }
            let df = DateFormatter(); df.dateStyle = .short; df.timeStyle = .short
            details.append("Dep: " + df.string(from: flight.departureDate))
            details.append("Arr: " + df.string(from: flight.arrivalDate))
            if let dur = flight.durationText { details.append("Duration: " + dur) }
            detailLabel.text = details.joined(separator: "  •  ")
        } else {
            titleLabel.text = "Add flight details"
            detailLabel.text = nil
        }
    }
} 