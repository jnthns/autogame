import UIKit

class BlankViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Blank"
        view.backgroundColor = .systemBackground
        
        let label = UILabel()
        label.text = "Blank View\n\nThis space is ready for future features!"
        label.textAlignment = .center
        label.numberOfLines = 0
        label.font = UIFont.systemFont(ofSize: 18)
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])

        if let id = AnalyticsService.shared.sessionId {
            print("Amplitude session ID: \(id)")
        }
    }
} 