import UIKit

class SettingsViewController: UIViewController {
    
    private let tableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .insetGrouped)
        tv.translatesAutoresizingMaskIntoConstraints = false
        return tv
    }()
    
    private let settingsOptions = [
        ["Theme", "Notifications", "Language"],
        ["About", "Privacy Policy", "Terms of Service"],
        ["Clear All Drafts"]
    ]
    
    private let sectionTitles = ["Preferences", "Information", "Data"]
    
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Settings"
        view.backgroundColor = .systemBackground
        
        setupTableView()
    }
    
    private func setupTableView() {
        view.addSubview(tableView)
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "SettingsCell")
        
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
}

extension SettingsViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        return settingsOptions.count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return settingsOptions[section].count
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return sectionTitles[section]
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SettingsCell", for: indexPath)
        let option = settingsOptions[indexPath.section][indexPath.row]
        cell.textLabel?.text = option
        cell.accessoryType = .disclosureIndicator
        
        // Special styling for destructive actions
        if option == "Clear All Drafts" {
            cell.textLabel?.textColor = .systemRed
        } else {
            cell.textLabel?.textColor = .label
        }
        
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let option = settingsOptions[indexPath.section][indexPath.row]
        
        switch option {
        case "Clear All Drafts":
            showClearDraftsAlert()
        default:
            // Show placeholder alert for other options
            let alert = UIAlertController(title: option, message: "This feature is coming soon!", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
        }
    }
    
    private func showClearDraftsAlert() {
        let alert = UIAlertController(title: "Clear All Drafts", 
                                    message: "This will permanently delete all saved trip drafts. This action cannot be undone.", 
                                    preferredStyle: .alert)
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Clear All", style: .destructive) { _ in
            // Clear all drafts
            UserDefaults.standard.removeObject(forKey: "tripDrafts")
            
            let confirmAlert = UIAlertController(title: "Cleared", message: "All trip drafts have been deleted.", preferredStyle: .alert)
            confirmAlert.addAction(UIAlertAction(title: "OK", style: .default))
            self.present(confirmAlert, animated: true)
        })
        
        present(alert, animated: true)
    }
} 