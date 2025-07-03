import UIKit

protocol DestinationDetailsDelegate: AnyObject {
    func destinationDetailsViewController(_ vc: DestinationDetailsViewController, didSave destination: Destination)
}

class DestinationDetailsViewController: UIViewController {

    weak var delegate: DestinationDetailsDelegate?

    private var initialDestination: Destination?

    private let cityField = UITextField.placeholder("City")
    private let countryField = UITextField.placeholder("Country")

    // MARK: - Initializers
    /// Designated initializer allowing optional pre-filled destination data.
    init(destination: Destination? = nil) {
        self.initialDestination = destination
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Destination"
        view.backgroundColor = .systemBackground
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .save, target: self, action: #selector(save))

        let stack = UIStackView(arrangedSubviews: [cityField, countryField])
        stack.axis = .vertical
        stack.spacing = 20
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 40)
        ])

        // Pre-fill fields if we have an initial destination
        if let dest = initialDestination {
            cityField.text = dest.city
            countryField.text = dest.country
        }
    }

    @objc private func save() {
        guard let city = cityField.text, !city.isEmpty,
              let country = countryField.text, !country.isEmpty else {
            let alert = UIAlertController(title: "Missing Info", message: "Please fill all fields", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }

        let destination = Destination(city: city, country: country)
        delegate?.destinationDetailsViewController(self, didSave: destination)
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
