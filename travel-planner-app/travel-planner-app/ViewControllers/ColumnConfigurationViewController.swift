import UIKit

final class ColumnConfigurationViewController: UITableViewController {
    private var columns: [ExpensesViewController.Column]
    private let onUpdate: ([ExpensesViewController.Column]) -> Void
    
    // MARK: - Init
    init(columns: [ExpensesViewController.Column], onUpdate: @escaping ([ExpensesViewController.Column]) -> Void) {
        self.columns = columns
        self.onUpdate = onUpdate
        super.init(style: .grouped)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Configure Columns"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        navigationItem.rightBarButtonItems = [
            UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(done)),
            UIBarButtonItem(title: "Reorder", style: .plain, target: self, action: #selector(toggleReordering))
        ]
    }
    
    // MARK: - Actions
    @objc private func done() {
        onUpdate(columns)
        dismiss(animated: true)
    }
    
    @objc private func toggleReordering() {
        tableView.isEditing.toggle()
        navigationItem.rightBarButtonItems?[1].title = tableView.isEditing ? "Done" : "Reorder"
    }
    
    // MARK: - TableView
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        columns.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        let column = columns[indexPath.row]
        cell.textLabel?.text = column.title
        cell.accessoryType = column.isVisible ? .checkmark : .none
        return cell
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        columns[indexPath.row].isVisible.toggle()
        if let cell = tableView.cellForRow(at: indexPath) {
            cell.accessoryType = columns[indexPath.row].isVisible ? .checkmark : .none
        }
    }
    
    override func tableView(_ tableView: UITableView, canMoveRowAt indexPath: IndexPath) -> Bool {
        true
    }
    
    override func tableView(_ tableView: UITableView, moveRowAt sourceIndexPath: IndexPath, to destinationIndexPath: IndexPath) {
        let column = columns.remove(at: sourceIndexPath.row)
        columns.insert(column, at: destinationIndexPath.row)
    }
} 