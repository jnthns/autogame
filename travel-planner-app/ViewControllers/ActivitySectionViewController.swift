import UIKit

class ActivitySectionViewController: UIViewController {
    // MARK: - Properties
    private let date: Date
    private let section: Activity.Section
    private let viewModel: ItineraryViewModel
    private var activities: [Activity] = []
    
    // MARK: - UI Components
    private let tableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .plain)
        tv.translatesAutoresizingMaskIntoConstraints = false
        tv.register(ActivityCell.self, forCellReuseIdentifier: ActivityCell.identifier)
        return tv
    }()
    
    private lazy var floatingButton: UIButton = {
        let button = UIButton(type: .system)
        if let plusImage = UIImage(systemName: "plus") {
            button.setImage(plusImage, for: .normal)
            button.tintColor = .white
        } else {
            button.setTitle("+", for: .normal)
            button.setTitleColor(.white, for: .normal)
            button.titleLabel?.font = UIFont.boldSystemFont(ofSize: 24)
        }
        button.backgroundColor = .systemBlue
        button.layer.cornerRadius = 28
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(addActivity), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Initialization
    init(date: Date, section: Activity.Section, viewModel: ItineraryViewModel) {
        self.date = date
        self.section = section
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadActivities()
        bindViewModel()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadActivities()
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        // Set title with date and section
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEEE, MMMM d" // "Monday, July 8"
        title = "\(dateFormatter.string(from: date)) - \(section.title)"
        
        view.addSubview(tableView)
        view.addSubview(floatingButton)
        
        tableView.dataSource = self
        tableView.delegate = self
        
        // Enable drag and drop for reordering
        tableView.dragInteractionEnabled = true
        tableView.dragDelegate = self
        tableView.dropDelegate = self
        
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            floatingButton.widthAnchor.constraint(equalToConstant: 56),
            floatingButton.heightAnchor.constraint(equalToConstant: 56),
            floatingButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            floatingButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
        ])
    }
    
    private func loadActivities() {
        guard let day = viewModel.day(for: .day(date)) else {
            activities = []
            tableView.reloadData()
            return
        }
        
        activities = day.activities[section] ?? []
        tableView.reloadData()
    }
    
    private func bindViewModel() {
        // Store the original onUpdate callback
        let originalOnUpdate = viewModel.onUpdate
        
        // Set our own callback that also calls the original
        viewModel.onUpdate = { [weak self] in
            DispatchQueue.main.async {
                self?.loadActivities()
                // Call the original callback to update other views
                originalOnUpdate?()
            }
        }
    }
    
    // MARK: - Actions
    @objc private func addActivity() {
        let form = ActivityFormViewController(activity: nil, section: section)
        form.onSave = { [weak self] activity in
            guard let self = self else { return }
            self.viewModel.addActivity(activity, to: self.date)
        }
        
        let nav = UINavigationController(rootViewController: form)
        present(nav, animated: true)
    }
}

// MARK: - UITableViewDataSource
extension ActivitySectionViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return activities.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ActivityCell.identifier, for: indexPath) as! ActivityCell
        cell.configure(with: activities[indexPath.row])
        return cell
    }
}

// MARK: - UITableViewDelegate
extension ActivitySectionViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let activity = activities[indexPath.row]
        let form = ActivityFormViewController(activity: activity, section: section)
        form.onSave = { [weak self] updatedActivity in
            guard let self = self else { return }
            self.viewModel.updateActivity(updatedActivity, at: self.date)
        }
        
        let nav = UINavigationController(rootViewController: form)
        present(nav, animated: true)
    }
    
    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            let activity = activities[indexPath.row]
            viewModel.removeActivity(activity, from: date)
        }
    }
}

// MARK: - Drag & Drop for Reordering
extension ActivitySectionViewController: UITableViewDragDelegate, UITableViewDropDelegate {
    func tableView(_ tableView: UITableView, itemsForBeginning session: UIDragSession, at indexPath: IndexPath) -> [UIDragItem] {
        let activity = activities[indexPath.row]
        let itemProvider = NSItemProvider(object: activity.title as NSString)
        let dragItem = UIDragItem(itemProvider: itemProvider)
        dragItem.localObject = activity
        return [dragItem]
    }
    
    func tableView(_ tableView: UITableView, canHandle session: UIDropSession) -> Bool {
        // Only handle local drags (within this table view)
        return session.localDragSession != nil
    }
    
    func tableView(_ tableView: UITableView, dropSessionDidUpdate session: UIDropSession, withDestinationIndexPath destinationIndexPath: IndexPath?) -> UITableViewDropProposal {
        return UITableViewDropProposal(operation: .move, intent: .insertAtDestinationIndexPath)
    }
    
    func tableView(_ tableView: UITableView, performDropWith coordinator: UITableViewDropCoordinator) {
        guard let destinationIndexPath = coordinator.destinationIndexPath else { return }
        
        for item in coordinator.items {
            guard let sourceIndexPath = item.sourceIndexPath,
                  let activity = item.dragItem.localObject as? Activity else { continue }
            
            // Perform the move in the data source
            let fromIndex = sourceIndexPath.row
            let toIndex = destinationIndexPath.row
            
            // Use the view model to move the activity
            viewModel.moveActivity(on: date, section: section, from: fromIndex, to: toIndex)
            
            // Update local activities array immediately for smooth UI
            activities.remove(at: fromIndex)
            activities.insert(activity, at: toIndex)
            
            // Animate the move
            tableView.performBatchUpdates {
                tableView.moveRow(at: sourceIndexPath, to: destinationIndexPath)
            }
            
            coordinator.drop(item.dragItem, toRowAt: destinationIndexPath)
        }
    }
} 