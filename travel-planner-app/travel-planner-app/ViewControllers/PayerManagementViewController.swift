import UIKit

final class PayerManagementViewController: UITableViewController {
    private var payers: [Expense.Payer] {
        get { UserDefaults.standard.payers }
        set { UserDefaults.standard.payers = newValue }
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Manage Payers"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        navigationItem.rightBarButtonItems = [
            UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(addPayer)),
            UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(done))
        ]
    }
    
    // MARK: - Actions
    @objc private func done() { dismiss(animated: true) }
    
    @objc private func addPayer() {
        let alert = UIAlertController(title: "New Payer", message: nil, preferredStyle: .alert)
        alert.addTextField { $0.placeholder = "Name" }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Add", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?.first?.text,
                  !name.isEmpty else { return }
            self.payers.append(Expense.Payer(name: name))
            self.tableView.reloadData()
        })
        present(alert, animated: true)
    }
    
    // MARK: - TableView
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { payers.count }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        let payer = payers[indexPath.row]
        cell.textLabel?.text = payer.name
        cell.imageView?.image = UIImage(systemName: payer.icon)
        return cell
    }
    
    override func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool { true }
    
    override func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            payers.remove(at: indexPath.row)
            tableView.deleteRows(at: [indexPath], with: .fade)
        }
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let payer = payers[indexPath.row]
        let alert = UIAlertController(title: "Edit Payer", message: nil, preferredStyle: .alert)
        alert.addTextField { $0.text = payer.name }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?.first?.text,
                  !name.isEmpty else { return }
            self.payers[indexPath.row] = Expense.Payer(id: payer.id, name: name, icon: payer.icon)
            self.tableView.reloadRows(at: [indexPath], with: .automatic)
        })
        present(alert, animated: true)
    }
} 