import UIKit

final class TripExpensesViewController: UITableViewController {
    private var drafts: [Itinerary] = []
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Select Trip"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Back", style: .plain, target: self, action: #selector(backTapped))
        loadDrafts()
    }
    
    private func loadDrafts() {
        drafts = DraftsService.shared.fetchDrafts()
        tableView.reloadData()
    }
    
    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }
    
    // MARK: - TableView
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        drafts.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        cell.textLabel?.text = drafts[indexPath.row].destination.city
        cell.accessoryType = .disclosureIndicator
        return cell
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let draft = drafts[indexPath.row]
        let expensesVC = ExpensesViewController(tripId: draft.id, tripTitle: draft.destination.city)
        navigationController?.pushViewController(expensesVC, animated: true)
    }
} 