//  SingleDayViewController.swift
//  TravelPlanner
//
//  UITableView‑based implementation with further optimisation
//  • Static‑width UIDatePicker so its size doesn't jump when month strings vary.
//  • Safe cell dequeues, cached section order, single Calendar instance.
//  • Clean constraint graph (header ➝ table ➝ bottomBar).
//
//  Updated: 30 Jun 2025

import UIKit

final class SingleDayViewController: UIViewController {

    // MARK: – Types
    private typealias Section = Activity.Section

    // MARK: – Model
    private var activities: [Section: [Activity]] = [:]
    private var currentItinerary: Itinerary?
    private var currentDayIndex: Int?

    // Temp vars for new-trip flow
    private var pendingActivityForNewTrip: Activity?
    private var pendingCityForNewTrip: String?

    // Use a fixed‑time‑zone Calendar to avoid DST surprises
    private var calendar: Calendar {
        return Itinerary.calendar
    }

    // Cache section order once
    private lazy var orderedSections: [Section] = Section.allCases.sorted { $0.order < $1.order }

    // MARK: – UI
    private let datePicker: UIDatePicker = {
        let picker = UIDatePicker()
        picker.datePickerMode = .date
        picker.locale = Locale(identifier: "en_US")
        picker.preferredDatePickerStyle = .compact
        picker.translatesAutoresizingMaskIntoConstraints = false
        return picker
    }()

    private let tableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .insetGrouped)
        tv.translatesAutoresizingMaskIntoConstraints = false
        return tv
    }()

    private let bottomBar: UIStackView = {
        let bar = UIStackView()
        bar.axis = .horizontal
        bar.alignment = .center
        bar.distribution = .equalCentering
        bar.spacing = 24
        bar.backgroundColor = .systemGray6
        bar.layer.cornerRadius = 12
        bar.translatesAutoresizingMaskIntoConstraints = false
        return bar
    }()

    // MARK: – Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        
        // Enable large titles
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.largeTitleDisplayMode = .always
        
        buildUI()
        configureTable()

        // Init activity dictionary
        Section.allCases.forEach { activities[$0] = [] }

        loadActivitiesForSelectedDate()
        updateTitle()
    }

    // MARK: - Recently viewed trip tracking
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let itinerary = currentItinerary {
            UserDefaults.standard.set(itinerary.id, forKey: "lastViewedTripId")
        }
    }

    // MARK: – UI Construction
    private func buildUI() {
        // Header label
        let heading = UILabel()
        heading.text = "Activities"
        heading.font = .boldSystemFont(ofSize: 18)
        heading.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(heading)

        // Nav buttons & datePicker
        let prevBtn = UIButton(type: .system)
        prevBtn.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        prevBtn.addTarget(self, action: #selector(prevDay), for: .touchUpInside)

        let nextBtn = UIButton(type: .system)
        nextBtn.setImage(UIImage(systemName: "chevron.right"), for: .normal)
        nextBtn.addTarget(self, action: #selector(nextDay), for: .touchUpInside)

        datePicker.addTarget(self, action: #selector(dateChanged), for: .valueChanged)
        // *** Static width so the control stays the same size regardless of text ***
        datePicker.widthAnchor.constraint(equalToConstant: 120).isActive = true

        bottomBar.addArrangedSubview(prevBtn)
        bottomBar.addArrangedSubview(datePicker)
        bottomBar.addArrangedSubview(nextBtn)

        view.addSubview(tableView)
        view.addSubview(bottomBar)

        // Layout
        NSLayoutConstraint.activate([
            heading.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            heading.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),

            tableView.topAnchor.constraint(equalTo: heading.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            bottomBar.heightAnchor.constraint(equalToConstant: 44),
            bottomBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            bottomBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),

            tableView.bottomAnchor.constraint(equalTo: bottomBar.topAnchor, constant: -8)
        ])

        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(addActivity))
    }

    private func configureTable() {
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(ActivityCell.self, forCellReuseIdentifier: ActivityCell.identifier)
        // Enable drag & drop re-ordering
        tableView.dragInteractionEnabled = true
        tableView.dragDelegate = self
        tableView.dropDelegate = self
    }

    // MARK: – Actions
    @objc private func addActivity() {
        let alert = UIAlertController(title: "Add Activity", message: "Choose a time of day", preferredStyle: .actionSheet)
        Section.allCases.forEach { section in
            alert.addAction(UIAlertAction(title: section.rawValue, style: .default) { _ in
                self.showActivityForm(for: section)
            })
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    private func showActivityForm(for section: Section, activity: Activity? = nil) {
        let formVC = ActivityFormViewController(activity: activity, section: section)
        formVC.onSave = { [weak self] saved in
            guard let self else { return }
            if let existing = activity,
               let idx = self.activities[section]?.firstIndex(where: { $0.id == existing.id }) {
                self.activities[section]?[idx] = saved
            } else {
                self.activities[section]?.append(saved)
            }
            self.tableView.reloadData()
            self.saveActivitiesToDraft()

            // If there is no itinerary for this date yet, prompt the user to save the activity into a draft
            if self.currentItinerary == nil {
                // Present after the form has dismissed to avoid presentation warnings
                DispatchQueue.main.async {
                    self.presentAddToTripFlow(for: saved)
                }
            }

            var props: [String: Any] = [
                "activity": saved.title,
                "section": section.rawValue,
                "trip": self.currentItinerary?.destination.city ?? "New trip"
            ]
            if let id = self.currentItinerary?.id {
                props["tripId"] = id
            }
            AnalyticsService.shared.logEvent("Activity Added", properties: props)
        }
        present(UINavigationController(rootViewController: formVC), animated: true)
    }

    @objc private func dateChanged() { loadActivitiesForSelectedDate() }
    @objc private func prevDay() { changeDay(by: -1) }
    @objc private func nextDay() { changeDay(by: 1) }

    private func changeDay(by offset: Int) {
        if let newDate = calendar.date(byAdding: .day, value: offset, to: datePicker.date) {
            datePicker.setDate(newDate, animated: true)
            loadActivitiesForSelectedDate()
        }
    }

    // MARK: – Data loading / persistence
    private func loadActivitiesForSelectedDate() {
        let drafts = DraftsService.shared.fetchDrafts()
        currentItinerary = nil
        currentDayIndex = nil

        for itinerary in drafts {
            for (idx, day) in itinerary.days.enumerated() {
                if calendar.isDate(day.date, inSameDayAs: datePicker.date) {
                    currentItinerary = itinerary
                    currentDayIndex = idx
                    activities = day.activities
                    tableView.reloadData()
                    updateTitle()
                    return
                }
            }
        }
        // No draft -> clear
        Section.allCases.forEach { activities[$0] = [] }
        tableView.reloadData()
        updateTitle()
    }

    private func saveActivitiesToDraft() {
        guard let itin = currentItinerary, let idx = currentDayIndex else { return }
        var updated = itin
        updated.days[idx].activities = activities
        DraftsService.shared.saveDraft(updated)
        currentItinerary = updated
    }

    private func updateTitle() {
        let city = currentItinerary?.destination.city ?? ""
        navigationItem.title = city.isEmpty ? "Today's Plan" : "Now in: \(city)"
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadActivitiesForSelectedDate()
        updateTitle()
    }

    // MARK: - Add to Trip Draft
    private func presentAddToTripFlow(for activity: Activity) {
        let drafts = DraftsService.shared.fetchDrafts()
        let sheet = UIAlertController(title: "Add to Trip", message: nil, preferredStyle: .actionSheet)

        // Existing drafts
        drafts.forEach { draft in
            sheet.addAction(UIAlertAction(title: draft.destination.city, style: .default) { _ in
                self.append(activity, to: draft)
            })
        }

        // New trip option
        sheet.addAction(UIAlertAction(title: "New Trip…", style: .default) { _ in
            self.askForNewTripTitle(copying: activity)
        })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(sheet, animated: true)
    }

    private func append(_ activity: Activity, to draft: Itinerary) {
        var draftCopy = draft
        // Find matching day by date else first day
        if let index = draftCopy.days.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: datePicker.date) }) {
            draftCopy.days[index].activities[activity.section, default: []].append(activity)
        } else if !draftCopy.days.isEmpty {
            draftCopy.days[0].activities[activity.section, default: []].append(activity)
        }
        DraftsService.shared.saveDraft(draftCopy)
    }

    private func askForNewTripTitle(copying activity: Activity) {
        let alert = UIAlertController(title: "New Trip", message: "Enter destination city", preferredStyle: .alert)
        alert.addTextField { tf in tf.placeholder = "City" }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Next", style: .default) { _ in
            guard let city = alert.textFields?.first?.text, !city.isEmpty else { return }
            self.pendingCityForNewTrip = city
            self.pendingActivityForNewTrip = activity
            let picker = DateRangePickerViewController()
            picker.userInfo = nil
            picker.delegate = self
            self.present(UINavigationController(rootViewController: picker), animated: true)
        })
        present(alert, animated: true)
    }
}

// MARK: – UITableViewDataSource & Delegate
extension SingleDayViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int { orderedSections.count }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? { orderedSections[section].rawValue }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        activities[orderedSections[section]]?.count ?? 0
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: ActivityCell.identifier, for: indexPath) as? ActivityCell else {
            return UITableViewCell()
        }
        if let act = activities[orderedSections[indexPath.section]]?[indexPath.row] {
            cell.configure(with: act)
        }
        return cell
    }

    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        guard editingStyle == .delete else { return }
        activities[orderedSections[indexPath.section]]?.remove(at: indexPath.row)
        tableView.deleteRows(at: [indexPath], with: .automatic)
        saveActivitiesToDraft()
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        if let act = activities[orderedSections[indexPath.section]]?[indexPath.row] {
            showActivityForm(for: orderedSections[indexPath.section], activity: act)
        }
    }

    // Allow deletion of activities
    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let sectionEnum = Activity.Section.allCases.sorted { $0.order < $1.order }[indexPath.section]
        guard let activity = activities[sectionEnum]?[indexPath.row] else { return nil }
        
        let delete = UIContextualAction(style: .destructive, title: "Delete") { [weak self] _, _, completion in
            guard let self = self else { completion(false); return }
            
            // Remove from data source
            self.activities[sectionEnum]?.remove(at: indexPath.row)
            
            // Update UI with animation
            tableView.deleteRows(at: [indexPath], with: .automatic)
            
            // Save changes
            self.saveActivitiesToDraft()
            
            // Log deletion
            var props: [String: Any] = ["activity": activity.title]
            if let id = self.currentItinerary?.id {
                props["tripId"] = id
            }
            AnalyticsService.shared.logEvent("Activity Deleted", properties: props)
            
            completion(true)
        }
        
        return UISwipeActionsConfiguration(actions: [delete])
    }
}

// Handle range picker for new trip
extension SingleDayViewController: DateRangePickerDelegate {
    func dateRangePicker(_ vc: DateRangePickerViewController, didPick startDate: Date, endDate: Date) {
        guard let city = pendingCityForNewTrip, let activity = pendingActivityForNewTrip else { vc.dismiss(animated: true); return }
        var itinerary = Itinerary(destination: Destination(city: city, country: ""), startDate: startDate, endDate: endDate)
        if !itinerary.days.isEmpty {
            itinerary.days[0].activities[activity.section, default: []].append(activity)
        }
        DraftsService.shared.saveDraft(itinerary)
        pendingCityForNewTrip = nil
        pendingActivityForNewTrip = nil
        vc.dismiss(animated: true)
    }
}

// MARK: – Drag & Drop
extension SingleDayViewController: UITableViewDragDelegate, UITableViewDropDelegate {
    // Accept only local drags originating from this table view
    func tableView(_ tableView: UITableView, canHandle session: UIDropSession) -> Bool {
        session.localDragSession != nil
    }

    // Provide drag item
    func tableView(_ tableView: UITableView, itemsForBeginning session: UIDragSession, at indexPath: IndexPath) -> [UIDragItem] {
        let sectionEnum = orderedSections[indexPath.section]
        guard let activity = activities[sectionEnum]?[indexPath.row] else { return [] }
        let itemProvider = NSItemProvider(object: activity.title as NSString)
        let dragItem = UIDragItem(itemProvider: itemProvider)
        dragItem.localObject = activity
        return [dragItem]
    }

    func tableView(_ tableView: UITableView, dropSessionDidUpdate session: UIDropSession, withDestinationIndexPath destinationIndexPath: IndexPath?) -> UITableViewDropProposal {
        // Only support re-ordering within the same table view
        return UITableViewDropProposal(operation: .move, intent: .insertAtDestinationIndexPath)
    }

    func tableView(_ tableView: UITableView, performDropWith coordinator: UITableViewDropCoordinator) {
        guard let destIndexPath = coordinator.destinationIndexPath else { return }
        for item in coordinator.items {
            guard let sourceIndexPath = item.sourceIndexPath,
                  let activity = item.dragItem.localObject as? Activity else { continue }

            let sourceSection = orderedSections[sourceIndexPath.section]
            let destSection = orderedSections[destIndexPath.section]

            tableView.performBatchUpdates({
                // 1. Remove from source list (safe-guard if list absent)
                var srcList = activities[sourceSection] ?? []
                srcList.remove(at: sourceIndexPath.row)
                activities[sourceSection] = srcList

                // 2. Insert into dest list (create if needed)
                var dstList = activities[destSection] ?? []
                var insertRow = destIndexPath.row
                if sourceSection == destSection && sourceIndexPath.row < destIndexPath.row { insertRow -= 1 }
                dstList.insert(activity, at: min(insertRow, dstList.count))
                activities[destSection] = dstList

                // 3. Update table rows
                if sourceSection == destSection {
                    tableView.moveRow(at: sourceIndexPath, to: IndexPath(row: insertRow, section: destIndexPath.section))
                } else {
                    tableView.deleteRows(at: [sourceIndexPath], with: .automatic)
                    tableView.insertRows(at: [IndexPath(row: insertRow, section: destIndexPath.section)], with: .automatic)
                }
            })

            coordinator.drop(item.dragItem, toRowAt: IndexPath(row: destIndexPath.row, section: destIndexPath.section))
        }

        saveActivitiesToDraft()
    }
}
 