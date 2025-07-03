import UIKit

protocol DateRangePickerDelegate: AnyObject {
    func dateRangePicker(_ vc: DateRangePickerViewController, didPick startDate: Date, endDate: Date)
}

class DateRangePickerViewController: UIViewController {
    weak var delegate: DateRangePickerDelegate?

    // Optional context object for callers to pass extra info
    var userInfo: Any?

    private let startDatePicker: UIDatePicker = {
        let dp = UIDatePicker()
        dp.datePickerMode = .date
        dp.preferredDatePickerStyle = .wheels
        dp.translatesAutoresizingMaskIntoConstraints = false
        return dp
    }()

    private let endDatePicker: UIDatePicker = {
        let dp = UIDatePicker()
        dp.datePickerMode = .date
        dp.preferredDatePickerStyle = .wheels
        dp.translatesAutoresizingMaskIntoConstraints = false
        return dp
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Select Dates"
        view.backgroundColor = .systemBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancel))
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .save, target: self, action: #selector(save))

        let stack = UIStackView(arrangedSubviews: [UILabel(text: "Start Date"), startDatePicker, UILabel(text: "End Date"), endDatePicker])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    @objc private func cancel() {
        dismiss(animated: true)
    }

    @objc private func save() {
        delegate?.dateRangePicker(self, didPick: startDatePicker.date, endDate: endDatePicker.date)
    }
}

// Convenience UILabel init
private extension UILabel {
    convenience init(text: String) {
        self.init()
        self.text = text
        self.font = UIFont.boldSystemFont(ofSize: 16)
        self.translatesAutoresizingMaskIntoConstraints = false
    }
} 