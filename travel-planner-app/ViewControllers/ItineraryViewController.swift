import UIKit

class ItineraryViewController: UIViewController {
    // MARK: - Properties
    private let viewModel: ItineraryViewModel
    private var dataSource: UITableViewDiffableDataSource<ItinerarySection, ItineraryItem>!
    private lazy var activityCoordinator: ActivityFormCoordinator = {
        ActivityFormCoordinator(presentingViewController: self, viewModel: viewModel)
    }()
    
    // MARK: - UI Components
    private let tableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .plain)
        tv.translatesAutoresizingMaskIntoConstraints = false
        tv.register(ActivityCell.self, forCellReuseIdentifier: ActivityCell.identifier)
        tv.register(FlightCell.self, forCellReuseIdentifier: FlightCell.identifier)
        // Ensure headers are visible
        tv.sectionHeaderHeight = 44
        tv.estimatedSectionHeaderHeight = 44
        return tv
    }()
    
    private lazy var actionButton: UIButton = {
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
        button.addTarget(self, action: #selector(floatingButtonTapped), for: .touchUpInside)
        return button
    }()

    private let headerFlightCell = FlightCell(style: .default, reuseIdentifier: nil)
    
    // MARK: - Initialization
    init(itinerary: Itinerary? = nil) {
        self.viewModel = ItineraryViewModel(itinerary: itinerary)
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        self.viewModel = ItineraryViewModel()
        super.init(coder: coder)
    }

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        configureDataSource()
        bindViewModel()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let itinerary = viewModel.itinerary {
            SettingsService.shared.setLastViewedTripId(itinerary.id)
        }
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        setupTitleView()
        
        view.addSubview(tableView)
        view.addSubview(actionButton)
        
        if #available(iOS 15.0, *) {
            tableView.sectionHeaderTopPadding = 0
        }
        
        // Configure header view for departure flight
        let headerContainer = UIView()
        headerContainer.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.1)
        let headerLabel = UILabel()
        headerLabel.text = "Departure Flight"
        headerLabel.font = .systemFont(ofSize: 15, weight: .bold)
        headerLabel.textAlignment = .center
        headerLabel.textColor = .systemBlue
        headerLabel.translatesAutoresizingMaskIntoConstraints = false
        headerFlightCell.configure(with: viewModel.departureFlight)
        headerContainer.addSubview(headerLabel)
        headerContainer.addSubview(headerFlightCell)
        
        NSLayoutConstraint.activate([
            headerLabel.topAnchor.constraint(equalTo: headerContainer.topAnchor, constant: 2),
            headerLabel.leadingAnchor.constraint(equalTo: headerContainer.leadingAnchor, constant: 8),
            headerLabel.trailingAnchor.constraint(equalTo: headerContainer.trailingAnchor, constant: -8),
            headerLabel.heightAnchor.constraint(equalToConstant: 20)
        ])
        
        // Position the flight cell using frame-based layout to avoid constraint conflicts
        headerFlightCell.frame = CGRect(x: 0, y: 24, width: view.bounds.width, height: 60)

        // Add tap gesture back
        let tap = UITapGestureRecognizer(target: self, action: #selector(editDepartureFlight))
        headerContainer.addGestureRecognizer(tap)

        updateHeaderHeight(for: headerContainer)
        
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            actionButton.widthAnchor.constraint(equalToConstant: 56),
            actionButton.heightAnchor.constraint(equalToConstant: 56),
            actionButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            actionButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
        ])
        
        tableView.delegate = self
        tableView.dragInteractionEnabled = true
        tableView.dragDelegate = self
        tableView.dropDelegate = self
        
        print("✅ Table view delegate set to: \(String(describing: tableView.delegate))")
    }
    
    private func setupTitleView() {
        let cityLabel = UILabel()
        cityLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        cityLabel.textAlignment = .center
        cityLabel.text = viewModel.title
        
        let dateLabel = UILabel()
        dateLabel.font = .systemFont(ofSize: 13)
        dateLabel.textColor = .secondaryLabel
        dateLabel.textAlignment = .center
        dateLabel.text = viewModel.dateRangeText
        
        let stack = UIStackView(arrangedSubviews: [cityLabel, dateLabel])
        stack.axis = .vertical
        stack.alignment = .center
        navigationItem.titleView = stack
    }
    
    private func configureDataSource() {
        dataSource = UITableViewDiffableDataSource(tableView: tableView) { [weak self] tableView, indexPath, item in
            switch item {
            case .flight(let flight):
                let cell = tableView.dequeueReusableCell(withIdentifier: FlightCell.identifier, for: indexPath) as! FlightCell
                cell.configure(with: flight)
                return cell
                
            case .activityHeader(let section, _):
                let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
                var config = cell.defaultContentConfiguration()
                config.text = section.title
                config.textProperties.font = .boldSystemFont(ofSize: 16)
                cell.contentConfiguration = config
                cell.backgroundColor = .secondarySystemBackground
                cell.accessoryType = .disclosureIndicator
                return cell
                
            case .activity(let activity):
                let cell = tableView.dequeueReusableCell(withIdentifier: ActivityCell.identifier, for: indexPath) as! ActivityCell
                cell.configure(with: activity)
                self?.configureActivityCell(cell, with: activity)
                return cell
            }
        }
        
        // Note: UITableViewDiffableDataSource doesn't support supplementaryViewProvider
        // Section headers are handled by UITableViewDelegate methods
        
        updateDataSource()
    }
    
    private func updateHeaderHeight(for headerContainer: UIView) {
        headerContainer.layoutIfNeeded()
        
        // Calculate height: label (20) + flight cell (60) + padding (16) + margins (8)
        let finalHeight: CGFloat = 84
        
        // Update flight cell frame with correct width
        headerFlightCell.frame = CGRect(x: 0, y: 24, width: view.bounds.width, height: 60)
        
        headerContainer.frame = CGRect(x: 0, y: 0, width: view.bounds.width, height: finalHeight)
        tableView.tableHeaderView = headerContainer
        print("Header height set to: \(finalHeight)")
    }
    
    private func configureActivityCell(_ cell: ActivityCell, with activity: Activity) {
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
    
    // Update bindViewModel to refresh header
    private func bindViewModel() {
        viewModel.onUpdate = { [weak self] in
            guard let self = self else { return }
            DispatchQueue.main.async {
                if let stack = self.navigationItem.titleView as? UIStackView,
                   let city = stack.arrangedSubviews.first as? UILabel,
                   let dates = stack.arrangedSubviews.last as? UILabel {
                    city.text = self.viewModel.title
                    dates.text = self.viewModel.dateRangeText
                }
                self.headerFlightCell.configure(with: self.viewModel.departureFlight)
                if let header = self.tableView.tableHeaderView {
                    header.setNeedsLayout(); header.layoutIfNeeded()
                }
                self.updateDataSource()
            }
        }
    }
    
    private func updateDataSource() {
        var snapshot = NSDiffableDataSourceSnapshot<ItinerarySection, ItineraryItem>()
        let sections = viewModel.sections
        snapshot.appendSections(sections)
        
        print("=== DEBUG: Sections ===")
        for (index, section) in sections.enumerated() {
            let items = viewModel.items(for: section)
            print("Section \(index): \(section)")
            print("  Items count: \(items.count)")
            for (itemIndex, item) in items.enumerated() {
                print("    Item \(itemIndex): \(item)")
            }
            snapshot.appendItems(items, toSection: section)
        }
        print("=== END DEBUG ===")
        
        dataSource.apply(snapshot, animatingDifferences: false) // Disable animation to ensure headers appear
        
        // Force the table view to recognize sections and headers
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            print("🔄 Forcing table view reload to show headers")
            self.tableView.beginUpdates()
            self.tableView.endUpdates()
        }
    }
    
    // MARK: - Actions
    @objc private func floatingButtonTapped() {
        let sheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "Edit Dates", style: .default) { [weak self] _ in
            self?.pickDates()
        })
        sheet.addAction(UIAlertAction(title: "Duplicate Trip", style: .default) { [weak self] _ in
            self?.duplicateTrip()
        })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(sheet, animated: true)
    }
    
    private func duplicateTrip() {
        let duplicated = viewModel.duplicateTrip()
        // Save the duplicated trip
        DraftsService.shared.saveDraft(duplicated) { [weak self] in
            let alert = UIAlertController(title: "Copied", message: "Trip draft duplicated.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self?.present(alert, animated: true)
        }
    }
    
    private func pickDates() {
        let vc = DateRangePickerViewController()
        vc.delegate = self
        present(UINavigationController(rootViewController: vc), animated: true)
    }
    
    @objc private func editDepartureFlight() {
        let form = FlightFormViewController()
        form.title = "Departure Flight"
        form.flight = viewModel.departureFlight
        form.onSave = { [weak self] flight in
            self?.viewModel.updateFlight(flight, isReturn: false)
            self?.headerFlightCell.configure(with: flight)
        }
        present(UINavigationController(rootViewController: form), animated: true)
    }
}

// MARK: - UITableViewDelegate
extension ItineraryViewController: UITableViewDelegate {
    // MARK: - UITableViewDelegate Methods
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        print("🔍 titleForHeaderInSection called for section \(section) of \(tableView.numberOfSections)")
        
        guard let sectionEnum = dataSource.sectionIdentifier(for: section) else { 
            print("⚠️ No section identifier for section \(section)")
            return nil 
        }
        
        let title: String
        switch sectionEnum {
        case .returnFlight:
            title = "Return Flight"
        case .day(let date):
            let df = DateFormatter()
            df.dateFormat = "EEEE, MMMM d" // "Monday, July 8"
            title = df.string(from: date)
        }
        
        print("📋 Section \(section) header: \(title)")
        return title
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard let item = dataSource.itemIdentifier(for: indexPath),
              let section = dataSource.sectionIdentifier(for: indexPath.section) else { return }
        
        switch item {
        case .activity(let activity):
            handleActivitySelection(activity, in: section)
            
        case .activityHeader(let activitySection, _):
            handleActivityHeaderSelection(activitySection, in: section)
            
        case .flight:
            handleFlightSelection(at: indexPath)
        }
    }
    
    private func handleActivitySelection(_ activity: Activity, in section: ItinerarySection) {
        guard case .day(let date) = section else { return }
        activityCoordinator.presentActivityForm(for: activity, in: activity.section, on: date)
    }
    
    private func handleActivityHeaderSelection(_ activitySection: Activity.Section, in section: ItinerarySection) {
        guard case .day(let date) = section else { return }
        
        // Present custom activity section view with floating button
        let sectionVC = ActivitySectionViewController(
            date: date, 
            section: activitySection, 
            viewModel: viewModel
        )
        navigationController?.pushViewController(sectionVC, animated: true)
    }
    
    private func handleFlightSelection(at indexPath: IndexPath) {
        guard let section = dataSource.sectionIdentifier(for: indexPath.section) else { return }
        let isReturn: Bool
        switch section {
        case .returnFlight:
            isReturn = true
        case .day:
            return // no flight edit for day cells
        }
        let form = FlightFormViewController()
        form.title = "Return Flight"
        form.flight = viewModel.returnFlightObj
        form.onSave = { [weak self] flight in
            self?.viewModel.updateFlight(flight, isReturn: isReturn)
        }
        present(UINavigationController(rootViewController: form), animated: true)
    }
    
    // MARK: - UITableViewDelegate Additional Methods
    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        // Ensure headers have proper height
        guard let sectionEnum = dataSource.sectionIdentifier(for: section) else { return 0 }
        
        switch sectionEnum {
        case .returnFlight:
            return 44
        case .day:
            return 44
        }
    }
    
    func tableView(_ tableView: UITableView, willDisplayHeaderView view: UIView, forSection section: Int) {
        print("🎨 willDisplayHeaderView called for section \(section)")
        
        guard let header = view as? UITableViewHeaderFooterView,
              let sectionEnum = dataSource.sectionIdentifier(for: section) else { 
            print("⚠️ Failed to get header or section identifier for section \(section)")
            return 
        }
        
        print("🎨 Styling header for section: \(sectionEnum)")
        print("🔤 Header text before styling: '\(header.textLabel?.text ?? "nil")'")
        
        switch sectionEnum {
        case .returnFlight:
            header.textLabel?.text = "Return Flight"
            header.textLabel?.textAlignment = .center
            header.textLabel?.font = .systemFont(ofSize: 17, weight: .bold)
            header.textLabel?.textColor = .systemBlue
            header.contentView.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.1)
        case .day(let date):
            let df = DateFormatter()
            df.dateFormat = "EEEE, MMMM d" // "Monday, July 8"
            let title = df.string(from: date)
            header.textLabel?.text = title
            header.textLabel?.textAlignment = .left
            header.textLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
            header.textLabel?.textColor = .label
            header.contentView.backgroundColor = .systemBackground
        }
        
        print("🔤 Header text after styling: '\(header.textLabel?.text ?? "nil")'")
    }
    
    // MARK: - Cell Display Lifecycle
    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        guard let item = dataSource.itemIdentifier(for: indexPath),
              case .activity(let activity) = item,
              let activityCell = cell as? ActivityCell else { return }
        
        configureActivityCell(activityCell, with: activity)
    }
    
    func tableView(_ tableView: UITableView, didEndDisplaying cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        // Clean up border layers when cell is reused
        cell.contentView.layer.sublayers?.removeAll { $0.name == "colorBorder" }
    }
    
    // MARK: - Swipe to Delete
    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        guard editingStyle == .delete,
              let item = dataSource.itemIdentifier(for: indexPath),
              let section = dataSource.sectionIdentifier(for: indexPath.section) else { return }
        
        switch item {
        case .activity(let activity):
            guard case .day(let date) = section else { return }
            viewModel.removeActivity(activity, from: date)
            
        default:
            // Don't allow deletion of headers or flights
            break
        }
    }
    
    func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        guard let item = dataSource.itemIdentifier(for: indexPath) else { return false }
        // Only allow editing (deletion) of activities
        switch item {
        case .activity:
            return true
        default:
            return false
        }
    }
}

// MARK: - Drag & Drop
extension ItineraryViewController: UITableViewDragDelegate, UITableViewDropDelegate {
    func tableView(_ tableView: UITableView, itemsForBeginning session: UIDragSession, at indexPath: IndexPath) -> [UIDragItem] {
        guard let item = dataSource.itemIdentifier(for: indexPath),
              let section = dataSource.sectionIdentifier(for: indexPath.section) else { return [] }
        
        switch item {
        case .activity(let activity):
            let provider = NSItemProvider(object: activity.title as NSString)
            let dragItem = UIDragItem(itemProvider: provider)
            dragItem.localObject = (indexPath, activity, section)
            return [dragItem]
        default:
            return []
        }
    }
    
    func tableView(_ tableView: UITableView, dropSessionDidUpdate session: UIDropSession, withDestinationIndexPath destinationIndexPath: IndexPath?) -> UITableViewDropProposal {
        guard let destinationIndexPath = destinationIndexPath,
              let item = dataSource.itemIdentifier(for: destinationIndexPath) else {
            return UITableViewDropProposal(operation: .cancel)
        }
        
        // Only allow dropping on activities or between activities (not on headers)
        switch item {
        case .activity:
            return UITableViewDropProposal(operation: .move, intent: .insertAtDestinationIndexPath)
        case .activityHeader:
            // Allow dropping after headers (to add to that section)
            return UITableViewDropProposal(operation: .move, intent: .insertAtDestinationIndexPath)
        default:
            return UITableViewDropProposal(operation: .cancel)
        }
    }
    
    func tableView(_ tableView: UITableView, performDropWith coordinator: UITableViewDropCoordinator) {
        guard let dest = coordinator.destinationIndexPath,
              let destSection = dataSource.sectionIdentifier(for: dest.section) else { return }
        
        for item in coordinator.items {
            guard let (sourceIndexPath, activity, sourceSection) = item.dragItem.localObject as? (IndexPath, Activity, ItinerarySection) else { continue }
            
            guard case .day(let sourceDate) = sourceSection,
                  case .day(let destDate) = destSection else { return }
            
            // Only allow drag within same day for now
            guard sourceDate == destDate else { return }
            
            // Determine the destination section based on where we're dropping
            let destItem = dataSource.itemIdentifier(for: dest)
            var targetSection = activity.section // Default to same section
            
            switch destItem {
            case .activityHeader(let section, _):
                targetSection = section
            case .activity(let destActivity):
                targetSection = destActivity.section
            default:
                continue // Skip invalid drop targets
            }
            
            // If moving to a different section, remove from old and add to new
            if targetSection != activity.section {
                // Remove from old section
                viewModel.removeActivity(activity, from: sourceDate)
                
                // Create new activity with updated section
                let newActivity = Activity(
                    id: activity.id,
                    title: activity.title,
                    notes: activity.notes,
                    section: targetSection,
                    priority: activity.priority,
                    duration: activity.duration,
                    location: activity.location,
                    url: activity.url,
                    colorHex: activity.colorHex
                )
                
                // Add to new section
                viewModel.addActivity(newActivity, to: destDate)
            } else {
                // Moving within the same section - calculate indices
                let sourceItems = viewModel.items(for: sourceSection)
                
                var sourceActivityIndex = 0
                var destActivityIndex = 0
                
                // Count activities before the source position in the same section
                for i in 0..<sourceIndexPath.row {
                    if case .activity(let act) = sourceItems[i], act.section == activity.section {
                        sourceActivityIndex += 1
                    }
                }
                
                // Count activities before the destination position in the same section
                for i in 0..<dest.row {
                    if case .activity(let act) = sourceItems[i], act.section == activity.section {
                        destActivityIndex += 1
                    }
                }
                
                // Only move if we're actually changing position
                if sourceActivityIndex != destActivityIndex {
                    viewModel.moveActivity(on: sourceDate, section: activity.section, from: sourceActivityIndex, to: destActivityIndex)
                }
            }
        }
    }
}

// MARK: - DateRangePickerDelegate
extension ItineraryViewController: DateRangePickerDelegate {
    func dateRangePicker(_ vc: DateRangePickerViewController, didPick startDate: Date, endDate: Date) {
        guard var updatedItinerary = viewModel.itinerary else { return }
        updatedItinerary.startDate = startDate
        updatedItinerary.endDate = endDate
        viewModel.updateItinerary(updatedItinerary)
        viewModel.saveDraft()
        vc.dismiss(animated: true)
    }
} 
