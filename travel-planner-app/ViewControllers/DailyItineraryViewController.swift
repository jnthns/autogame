import UIKit

class DailyItineraryViewController: UIViewController {
    private var day: ItineraryDay
    private let section: Activity.Section
    private var activities: [Activity]
    private var parentItinerary: Itinerary?

    private let tableView = UITableView()

    init(day: ItineraryDay, section: Activity.Section, parentItinerary: Itinerary? = nil) {
        self.day = day
        self.section = section
        self.activities = day.activities[section] ?? []
        self.parentItinerary = parentItinerary
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "\(section.rawValue)"
        view.backgroundColor = .systemBackground
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(addActivity))

        tableView.frame = view.bounds
        tableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        tableView.register(ActivityCell.self, forCellReuseIdentifier: ActivityCell.identifier)
        tableView.dataSource = self
        view.addSubview(tableView)
    }

    @objc private func addActivity() {
        let formVC = ActivityFormViewController(section: section)
        formVC.onSave = { [weak self] activity in
            self?.activities.append(activity)
            self?.tableView.reloadData()
            self?.saveActivityChanges()
        }
        let navController = UINavigationController(rootViewController: formVC)
        present(navController, animated: true)
    }
}

extension DailyItineraryViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        activities.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ActivityCell.identifier, for: indexPath) as! ActivityCell
        cell.configure(with: activities[indexPath.row])
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let activity = activities[indexPath.row]
        let formVC = ActivityFormViewController(activity: activity, section: section)
        formVC.onSave = { [weak self] updatedActivity in
            self?.activities[indexPath.row] = updatedActivity
            self?.tableView.reloadData()
            self?.saveActivityChanges()
        }
        let navController = UINavigationController(rootViewController: formVC)
        present(navController, animated: true)
    }

    // Allow deletion of activities
    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            activities.remove(at: indexPath.row)
            tableView.deleteRows(at: [indexPath], with: .automatic)
            saveActivityChanges()
        }
    }

    private func saveActivityChanges() {
        // Update the day's activities
        day.activities[section] = activities
        
        // If we have a parent itinerary, save it to drafts
        if let itinerary = parentItinerary {
            // Find the day in the itinerary and update it
            var updatedItinerary = itinerary
            if let dayIndex = updatedItinerary.days.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: day.date) }) {
                updatedItinerary.days[dayIndex].activities[section] = activities
                DraftsService.shared.saveDraft(updatedItinerary)
                parentItinerary = updatedItinerary
            }
        }
    }

    // Refresh when view appears to sync with changes from other views
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Reload activities from parent itinerary if available
        if let itinerary = parentItinerary {
            let drafts = DraftsService.shared.fetchDrafts()
            if let updatedItinerary = drafts.first(where: { 
                $0.destination.city == itinerary.destination.city && 
                Calendar.current.isDate($0.startDate, inSameDayAs: itinerary.startDate)
            }) {
                parentItinerary = updatedItinerary
                if let updatedDay = updatedItinerary.days.first(where: { Calendar.current.isDate($0.date, inSameDayAs: day.date) }) {
                    day = updatedDay
                    activities = day.activities[section] ?? []
                    tableView.reloadData()
                }
            }
        }
    }
} 