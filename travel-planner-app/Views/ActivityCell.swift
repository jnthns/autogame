import UIKit

class ActivityCell: UITableViewCell {
    static let identifier = "ActivityCell"

    private let colorView: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.layer.cornerRadius = 6
        v.clipsToBounds = true
        return v
    }()

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        label.numberOfLines = 1
        return label
    }()

    private let notesLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 12)
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        label.numberOfLines = 0
        return label
    }()

    private let durationLabel: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = .right
        return label
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        selectionStyle = .none
        contentView.addSubview(colorView)
        contentView.addSubview(titleLabel)
        contentView.addSubview(notesLabel)
        contentView.addSubview(durationLabel)

        NSLayoutConstraint.activate([
            colorView.widthAnchor.constraint(equalToConstant: 12),
            colorView.heightAnchor.constraint(equalTo: colorView.widthAnchor),
            colorView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            colorView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),

            titleLabel.leadingAnchor.constraint(equalTo: colorView.trailingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: durationLabel.leadingAnchor, constant: -8),
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),

            notesLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            notesLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            notesLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            notesLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12),

            durationLabel.centerYAnchor.constraint(equalTo: titleLabel.centerYAnchor),
            durationLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            durationLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 40)
        ])
    }

    func configure(with activity: Activity) {
        colorView.backgroundColor = activity.uiColor
        titleLabel.text = activity.title
        notesLabel.text = activity.notes
        if let minutes = activity.durationMinutes {
            durationLabel.text = "\(minutes) m"
        } else {
            durationLabel.text = nil
        }
        notesLabel.isHidden = activity.notes?.isEmpty ?? true
    }
} 

extension ActivityCell: DateRangePickerDelegate {
    func dateRangePicker(_ vc: DateRangePickerViewController,
                         didPick startDate: Date, endDate: Date) {

        guard
           let (title, activity) = vc.userInfo as? (String,Activity)
        else { return }

        var itinerary = Itinerary(
            destination: Destination(city: title, country: ""),
            startDate: startDate,
            endDate: endDate)

        // create days and insert the activity on the first day
        if !itinerary.days.isEmpty {
            var firstDay = itinerary.days[0]                 // 1. make a mutable copy
            var list = firstDay.activities[activity.section] ?? []
            list.append(activity)                            // 2. modify the copy
            firstDay.activities[activity.section] = list
            itinerary.days[0] = firstDay                     // 3. write it back
        }

        DraftsService.shared.saveDraft(itinerary)
        vc.dismiss(animated: true)
    }
} 
