import UIKit

class FlightFormViewController: UIViewController {
    var flight: Flight?
    var onSave: ((Flight) -> Void)?
    
    private let originField = UITextField.placeholder("Origin (e.g., JFK)")
    private let destinationField = UITextField.placeholder("Destination (e.g., CDG)")
    private let flightNumberField = UITextField.placeholder("Flight Number (optional)")
    private let depPicker = UIDatePicker()
    private let arrPicker = UIDatePicker()
    private let durationField = UITextField.placeholder("Duration in minutes (optional)")
    private let layoversField: UITextView = {
        let tv = UITextView()
        tv.layer.borderColor = UIColor.systemGray4.cgColor
        tv.layer.borderWidth = 1
        tv.layer.cornerRadius = 6
        tv.font = UIFont.systemFont(ofSize: 14)
        tv.translatesAutoresizingMaskIntoConstraints = false
        return tv
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        title = flight == nil ? "New Flight" : "Edit Flight"
        view.backgroundColor = .systemBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancel))
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .save, target: self, action: #selector(save))
        
        depPicker.datePickerMode = .dateAndTime
        arrPicker.datePickerMode = .dateAndTime
        depPicker.preferredDatePickerStyle = .compact
        arrPicker.preferredDatePickerStyle = .compact
        depPicker.translatesAutoresizingMaskIntoConstraints = false
        arrPicker.translatesAutoresizingMaskIntoConstraints = false
        
        let stack = UIStackView(arrangedSubviews: [originField, destinationField, flightNumberField, UILabel(text:"Departure"), depPicker, UILabel(text:"Arrival"), arrPicker, durationField, UILabel(text:"Layovers (optional)"), layoversField])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16)
        ])
        layoversField.heightAnchor.constraint(equalToConstant: 80).isActive = true
        
        if let f = flight {
            originField.text = f.origin
            destinationField.text = f.destination
            flightNumberField.text = f.flightNumber
            depPicker.date = f.departureDate
            arrPicker.date = f.arrivalDate
            if let dur = f.durationMinutes { durationField.text = "\(dur)" }
            layoversField.text = f.layovers
        }
    }
    
    @objc private func cancel() { dismiss(animated: true) }
    
    @objc private func save() {
        guard let origin = originField.text, !origin.isEmpty,
              let dest = destinationField.text, !dest.isEmpty else {
            let alert = UIAlertController(title: "Missing info", message: "Origin and destination are required", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }
        let duration = Int(durationField.text ?? "")
        let newFlight = Flight(origin: origin.uppercased(), destination: dest.uppercased(), flightNumber: flightNumberField.text?.uppercased(), departureDate: depPicker.date, arrivalDate: arrPicker.date, durationMinutes: duration, layovers: layoversField.text.isEmpty ? nil : layoversField.text)
        onSave?(newFlight)
        dismiss(animated: true)
    }
}

private extension UILabel {
    convenience init(text: String) {
        self.init()
        self.text = text
        self.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        self.translatesAutoresizingMaskIntoConstraints = false
    }
}

private extension UITextField {
    static func placeholder(_ text: String) -> UITextField {
        let tf = UITextField()
        tf.placeholder = text
        tf.borderStyle = .roundedRect
        tf.translatesAutoresizingMaskIntoConstraints = false
        return tf
    }
} 