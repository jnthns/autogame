import UIKit

class ItineraryViewController: UIViewController {
    var itinerary: Itinerary?

    // Designated initializer allowing dependency injection
    init(itinerary: Itinerary? = nil) {
        self.itinerary = itinerary
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    private let tableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .grouped)
        tv.translatesAutoresizingMaskIntoConstraints = false
        tv.register(ActivityCell.self, forCellReuseIdentifier: ActivityCell.identifier)
        tv.register(FlightCell.self, forCellReuseIdentifier: FlightCell.identifier)
        return tv
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        updateTitle()
        view.backgroundColor = .systemBackground

        tableView.dataSource = self
        tableView.delegate = self
        view.addSubview(tableView)
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        // Floating plus button bottom-right
        let actionButton = UIButton(type: .system)
        if let plusImage = UIImage(systemName: "plus") {
            actionButton.setImage(plusImage, for: .normal)
            actionButton.tintColor = .white
        } else {
            actionButton.setTitle("+", for: .normal)
            actionButton.setTitleColor(.white, for: .normal)
            actionButton.titleLabel?.font = UIFont.boldSystemFont(ofSize: 24)
        }
        actionButton.backgroundColor = .systemBlue
        actionButton.layer.cornerRadius = 28
        actionButton.translatesAutoresizingMaskIntoConstraints = false
        actionButton.addTarget(self, action: #selector(floatingButtonTapped), for: .touchUpInside)
        view.addSubview(actionButton)
        view.bringSubviewToFront(actionButton)

        NSLayoutConstraint.activate([
            actionButton.widthAnchor.constraint(equalToConstant: 56),
            actionButton.heightAnchor.constraint(equalToConstant: 56),
            actionButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            actionButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
        ])

        // Global appearance default
    }

    @objc private func saveDraft() {
        guard let itinerary = itinerary else { return }
        DraftsService.shared.saveDraft(itinerary) {
            let alert = UIAlertController(title: "Saved", message: "Trip draft saved.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.present(alert, animated: true)
        }
    }

    // MARK: - Floating button actions

    @objc private func floatingButtonTapped() {
        let sheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "Edit Dates", style: .default) { _ in
            self.pickDates()
        })
        sheet.addAction(UIAlertAction(title: "Duplicate Trip", style: .default) { _ in
            self.duplicateTrip()
        })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(sheet, animated: true)
    }

    private func duplicateTrip() {
        guard var itinerary = itinerary else { return }
        itinerary.startDate = itinerary.startDate.addingTimeInterval(1)
        itinerary.id = UUID().uuidString
        DraftsService.shared.saveDraft(itinerary) {
            let alert = UIAlertController(title: "Copied", message: "Trip draft duplicated.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.present(alert, animated: true)
        }
    }

    private func pickDates() {
        let vc = DateRangePickerViewController()
        vc.delegate = self
        present(UINavigationController(rootViewController: vc), animated: true)
    }

    // MARK: - Helpers
    private func updateTitle() {
        guard let itinerary = itinerary else {
            title = "Itinerary"
            return
        }
        let city = itinerary.destination.city.isEmpty ? "Trip" : itinerary.destination.city
        let df = DateFormatter()
        df.dateStyle = .short
        let dateText: String
        if Calendar.current.isDate(itinerary.startDate, inSameDayAs: itinerary.endDate) {
            dateText = df.string(from: itinerary.startDate)
        } else {
            dateText = "\(df.string(from: itinerary.startDate)) - \(df.string(from: itinerary.endDate))"
        }
        title = "\(city)"
    }

    // MARK: - Recently viewed trip tracking
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let itinerary = itinerary {
            UserDefaults.standard.set(itinerary.id, forKey: "lastViewedTripId")
        }
    }
}

// MARK: - Helper to map indexPath to content
private struct RowInfo {
    let segment: Activity.Section
    let isHeader: Bool
    let activity: Activity?
}

// MARK: - UITableViewDataSource / Delegate
extension ItineraryViewController: UITableViewDataSource, UITableViewDelegate {
    
    private func segmentsInOrder() -> [Activity.Section] {
        return Activity.Section.allCases.sorted { $0.order < $1.order }
    }

    private func rows(for day: ItineraryDay) -> [RowInfo] {
        var rows: [RowInfo] = []
        for seg in segmentsInOrder() {
            // Header row
            rows.append(RowInfo(segment: seg, isHeader: true, activity: nil))
            // Activity rows
            let acts = day.activities[seg] ?? []
            for act in acts {
                rows.append(RowInfo(segment: seg, isHeader: false, activity: act))
            }
        }
        return rows
    }

    func numberOfSections(in tableView: UITableView) -> Int {
        // +2 for departure and return flight sections
        return 2 + (itinerary?.days.count ?? 0)
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if section == 0 || section == numberOfSections(in: tableView) - 1 {
            return 1 // flight cells
        }
        guard let day = itinerary?.days[section - 1] else { return 0 }
        return rows(for: day).count
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        if section == 0 { return "Departure Flight" }
        if section == numberOfSections(in: tableView) - 1 { return "Return Flight" }
        guard let day = itinerary?.days[section - 1] else { return nil }
        let df = DateFormatter()
        df.dateStyle = .full
        return df.string(from: day.date)
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if indexPath.section == 0 {
            let cell = tableView.dequeueReusableCell(withIdentifier: FlightCell.identifier, for: indexPath) as! FlightCell
            cell.configure(with: itinerary?.flight)
            return cell
        } else if indexPath.section == numberOfSections(in: tableView) - 1 {
            let cell = tableView.dequeueReusableCell(withIdentifier: FlightCell.identifier, for: indexPath) as! FlightCell
            cell.configure(with: itinerary?.returnFlight)
            return cell
        }

        guard let day = itinerary?.days[indexPath.section - 1] else {
            return UITableViewCell()
        }
        let dayRows = rows(for: day)
        let rowInfo = dayRows[indexPath.row]

        if rowInfo.isHeader {
            let cell = UITableViewCell(style: .default, reuseIdentifier: "HeaderCell")
            cell.textLabel?.text = rowInfo.segment.rawValue
            cell.textLabel?.font = UIFont.systemFont(ofSize: 15, weight: .semibold)
            cell.selectionStyle = .default
            return cell
        } else {
            let cell = tableView.dequeueReusableCell(withIdentifier: ActivityCell.identifier, for: indexPath) as! ActivityCell
            if let activity = rowInfo.activity {
                cell.configure(with: activity)
            }
            return cell
        }
    }
    
    func tableView(_ tableView: UITableView, willDisplayCell cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        if indexPath.section == 0 || indexPath.section == numberOfSections(in: tableView) - 1 { return }
        
        guard let day = itinerary?.days[indexPath.section - 1] else { return }
        let rowInfo = rows(for: day)[indexPath.row]
        guard let activity = rowInfo.activity else { return }
        
        // Add color coding based on activity priority
        let color = activity.uiColor
        
        // Add subtle colored background based on priority
        let backgroundView = UIView()
        backgroundView.backgroundColor = color.withAlphaComponent(0.1)
        cell.selectedBackgroundView = backgroundView
        
        // Add colored left border
        cell.contentView.layer.sublayers?.removeAll { $0.name == "colorBorder" }
        let borderLayer = CALayer()
        borderLayer.name = "colorBorder"
        borderLayer.backgroundColor = color.cgColor
        borderLayer.frame = CGRect(x: 0, y: 0, width: 4, height: cell.frame.height)
        cell.contentView.layer.addSublayer(borderLayer)
    }
    
    func tableView(_ tableView: UITableView, didEndDisplaying cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        // Clean up border layers when cell is reused
        cell.contentView.layer.sublayers?.removeAll { $0.name == "colorBorder" }
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        if indexPath.section == 0 {
            // Edit flight
            let form = FlightFormViewController()
            form.flight = itinerary?.flight
            form.onSave = { [weak self] flight in
                guard let self else { return }
                self.itinerary?.flight = flight
                DraftsService.shared.saveDraft(self.itinerary!)
                self.tableView.reloadRows(at: [IndexPath(row:0, section:0)], with: .automatic)
            }
            present(UINavigationController(rootViewController: form), animated: true)
            return
        } else if indexPath.section == numberOfSections(in: tableView) - 1 {
            let form = FlightFormViewController()
            form.flight = itinerary?.returnFlight
            form.title = "Return Flight"
            form.onSave = { [weak self] flight in
                guard let self else { return }
                self.itinerary?.returnFlight = flight
                DraftsService.shared.saveDraft(self.itinerary!)
                self.tableView.reloadRows(at: [IndexPath(row:0, section:self.numberOfSections(in:self.tableView)-1)], with: .automatic)
            }
            present(UINavigationController(rootViewController: form), animated: true)
            return
        }

        guard let day = itinerary?.days[indexPath.section - 1] else { return }
        let rowInfo = rows(for: day)[indexPath.row]
        
        if rowInfo.isHeader {
            // Navigate to DailyItineraryVC for the selected segment
            let vc = DailyItineraryViewController(day: day, section: rowInfo.segment, parentItinerary: itinerary)
            navigationController?.pushViewController(vc, animated: true)
        } else if let activity = rowInfo.activity {
            // Edit the specific activity
            let form = ActivityFormViewController(activity: activity, section: activity.section)
            form.onSave = { [weak self] updatedActivity in
                guard let self = self, var itinerary = self.itinerary else { return }
                
                // Update the activity in the day's activities
                var day = itinerary.days[indexPath.section - 1]
                if var activities = day.activities[updatedActivity.section] {
                    if let index = activities.firstIndex(where: { $0.id == updatedActivity.id }) {
                        activities[index] = updatedActivity
                        day.activities[updatedActivity.section] = activities
                        itinerary.days[indexPath.section - 1] = day
                        self.itinerary = itinerary
                        DraftsService.shared.saveDraft(itinerary)
                        self.tableView.reloadRows(at: [indexPath], with: .automatic)
                    }
                }
            }
            present(UINavigationController(rootViewController: form), animated: true)
        }
    }

    // Refresh data when view appears (to sync changes from other tabs)
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Reload the latest version of this itinerary from drafts
        if let currentItinerary = itinerary {
            let drafts = DraftsService.shared.fetchDrafts()
            if let updatedItinerary = drafts.first(where: { 
                $0.destination.city == currentItinerary.destination.city && 
                Calendar.current.isDate($0.startDate, inSameDayAs: currentItinerary.startDate)
            }) {
                itinerary = updatedItinerary
                tableView.reloadData()
                updateTitle()
            }
        }
    }

    // Customise flight section headers for visual distinction
    func tableView(_ tableView: UITableView, willDisplayHeaderView view: UIView, forSection section: Int) {
        guard let header = view as? UITableViewHeaderFooterView else { return }
        if section == 0 || section == numberOfSections(in: tableView) - 1 {
            header.textLabel?.textAlignment = .center
            header.textLabel?.font = UIFont.systemFont(ofSize: 17, weight: .bold)
            header.textLabel?.textColor = .systemBlue
            header.contentView.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.1)
        } else {
            // Reset to defaults for day sections
            header.textLabel?.textAlignment = .left
            header.textLabel?.font = UIFont.systemFont(ofSize: 15, weight: .semibold)
            header.textLabel?.textColor = .label
            header.contentView.backgroundColor = .systemBackground
        }
    }
}

// MARK: - Delegates
#warning("DestinationDetailsDelegate removed in new workflow")
extension ItineraryViewController: DateRangePickerDelegate {
    func dateRangePicker(_ vc: DateRangePickerViewController, didPick startDate: Date, endDate: Date) {
        guard let destination = itinerary?.destination else {
            // Need destination first
            itinerary = Itinerary(destination: Destination(city: "", country: ""), startDate: startDate, endDate: endDate)
            return
        }
        itinerary = Itinerary(destination: destination, startDate: startDate, endDate: endDate)
        vc.dismiss(animated: true)
        tableView.reloadData()
        updateTitle()
    }
} 
