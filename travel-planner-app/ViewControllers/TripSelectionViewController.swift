import UIKit

class TripSelectionViewController: UITableViewController {
    private let trips: [Itinerary]
    private let onSelect: (Itinerary) -> Void

    init(trips: [Itinerary], onSelect: @escaping (Itinerary) -> Void) {
        self.trips = trips
        self.onSelect = onSelect
        super.init(style: .plain)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Select Trip"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "TripCell")
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(dismissSelf))
    }

    @objc private func dismissSelf() {
        dismiss(animated: true)
    }

    // MARK: - Table view data source
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return trips.count
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "TripCell", for: indexPath)
        let trip = trips[indexPath.row]
        cell.textLabel?.text = trip.destination.city
        cell.accessoryType = .none
        return cell
    }

    // MARK: - Table view delegate
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let trip = trips[indexPath.row]
        dismiss(animated: true) {
            self.onSelect(trip)
        }
    }
} 