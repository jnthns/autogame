import UIKit
import MapKit

class HomeViewController: UIViewController {
    
    // MARK: - Properties
    private var drafts: [Itinerary] = []
    
    // MARK: - UI Elements
    private let scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.translatesAutoresizingMaskIntoConstraints = false
        sv.showsVerticalScrollIndicator = false
        sv.backgroundColor = .systemGroupedBackground
        return sv
    }()
    
    private let contentView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemGroupedBackground
        return view
    }()
    
    private let headerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemBackground
        view.layer.cornerRadius = 24
        view.layer.maskedCorners = [.layerMaxXMaxYCorner, .layerMinXMaxYCorner]
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.1
        view.layer.shadowOffset = CGSize(width: 0, height: 2)
        view.layer.shadowRadius = 8
        return view
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Where to?"
        if let font = UIFont(name: "Marion", size: 42) {
            label.font = font
        } else {
            label.font = .systemFont(ofSize: 42, weight: .bold)
        }
        label.textAlignment = .left
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Plan your next adventure"
        label.font = .systemFont(ofSize: 16, weight: .regular)
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private lazy var searchBar: UISearchBar = {
        let sb = UISearchBar()
        sb.placeholder = "Search destinations..."
        sb.searchBarStyle = .minimal
        sb.delegate = self
        sb.translatesAutoresizingMaskIntoConstraints = false
        return sb
    }()
    
    private let tripsHeaderView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemGroupedBackground
        return view
    }()
    
    private let tripsLabel: UILabel = {
        let label = UILabel()
        label.text = "Your Trips"
        label.font = .systemFont(ofSize: 24, weight: .bold)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let emptyStateView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.isHidden = true
        view.backgroundColor = .systemGroupedBackground
        
        let imageView = UIImageView(image: UIImage(systemName: "airplane.circle.fill"))
        imageView.tintColor = .systemGray4
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        
        let label = UILabel()
        label.text = "No trips planned yet.\nSearch above to start planning!"
        label.numberOfLines = 0
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 16)
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(imageView)
        view.addSubview(label)
        
        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            imageView.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
            imageView.widthAnchor.constraint(equalToConstant: 60),
            imageView.heightAnchor.constraint(equalToConstant: 60),
            
            label.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 16),
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            label.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -20)
        ])
        
        return view
    }()
    
    private let tripsCollectionView: UICollectionView = {
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .vertical
        layout.minimumLineSpacing = 16
        layout.minimumInteritemSpacing = 16
        
        let cv = UICollectionView(frame: .zero, collectionViewLayout: layout)
        cv.translatesAutoresizingMaskIntoConstraints = false
        cv.backgroundColor = .clear
        cv.showsVerticalScrollIndicator = false
        cv.contentInset = UIEdgeInsets(top: 0, left: 20, bottom: 20, right: 20)
        return cv
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        configureCollectionView()
        loadDrafts()
        
        // Dismiss keyboard when tapping outside
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        view.addGestureRecognizer(tapGesture)
    }
    
    @objc private func dismissKeyboard() {
        searchBar.resignFirstResponder()
    }
    
    private func setupUI() {
        view.backgroundColor = .systemGroupedBackground
        
        // Build view hierarchy
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        contentView.addSubview(headerView)
        headerView.addSubview(titleLabel)
        headerView.addSubview(subtitleLabel)
        headerView.addSubview(searchBar)
        
        contentView.addSubview(tripsHeaderView)
        tripsHeaderView.addSubview(tripsLabel)
        
        contentView.addSubview(emptyStateView)
        contentView.addSubview(tripsCollectionView)
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            
            headerView.topAnchor.constraint(equalTo: contentView.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            
            titleLabel.topAnchor.constraint(equalTo: headerView.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -20),
            
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            
            searchBar.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 24),
            searchBar.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 8),
            searchBar.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -8),
            searchBar.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -20),
            
            tripsHeaderView.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 24),
            tripsHeaderView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            tripsHeaderView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            tripsHeaderView.heightAnchor.constraint(equalToConstant: 44),
            
            tripsLabel.leadingAnchor.constraint(equalTo: tripsHeaderView.leadingAnchor, constant: 20),
            tripsLabel.centerYAnchor.constraint(equalTo: tripsHeaderView.centerYAnchor),
            
            emptyStateView.topAnchor.constraint(equalTo: tripsHeaderView.bottomAnchor, constant: 20),
            emptyStateView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            emptyStateView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            
            tripsCollectionView.topAnchor.constraint(equalTo: tripsHeaderView.bottomAnchor),
            tripsCollectionView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            tripsCollectionView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            tripsCollectionView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            tripsCollectionView.heightAnchor.constraint(equalToConstant: 600)
        ])
    }
    
    private func configureCollectionView() {
        tripsCollectionView.delegate = self
        tripsCollectionView.dataSource = self
        tripsCollectionView.register(TripCell.self, forCellWithReuseIdentifier: TripCell.identifier)
    }
    
    private func loadDrafts() {
        drafts = DraftsService.shared.fetchDrafts()
        emptyStateView.isHidden = !drafts.isEmpty
        tripsCollectionView.reloadData()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadDrafts()
    }
}

// MARK: - UISearchBarDelegate
extension HomeViewController: UISearchBarDelegate {
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        guard let text = searchBar.text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return }
        searchBar.resignFirstResponder()
        
        let datePickerVC = DateRangePickerViewController()
        datePickerVC.delegate = self
        datePickerVC.modalPresentationStyle = .fullScreen
        present(UINavigationController(rootViewController: datePickerVC), animated: true)
        
        let savedDestinations = drafts.map { $0.destination.city }
        let tripIds = drafts.map { $0.id }
        AnalyticsService.shared.logEvent("Destination Entered", properties: [
            "destination": text,
            "saved trips": savedDestinations,
            "trip ids": tripIds
        ])
    }
}

// MARK: - DateRangePickerDelegate
extension HomeViewController: DateRangePickerDelegate {
    func dateRangePicker(_ vc: DateRangePickerViewController, didPick startDate: Date, endDate: Date) {
        guard let city = searchBar.text?.trimmingCharacters(in: .whitespacesAndNewlines), !city.isEmpty else { return }
        
        // Create and save the new itinerary immediately
        let destination = Destination(city: city, country: "")
        let itinerary = Itinerary(destination: destination, startDate: startDate, endDate: endDate)
        DraftsService.shared.saveDraft(itinerary)
        
        // Update the drafts list immediately
        drafts.insert(itinerary, at: 0)
        emptyStateView.isHidden = true
        tripsCollectionView.performBatchUpdates {
            tripsCollectionView.insertItems(at: [IndexPath(item: 0, section: 0)])
        }
        
        // Dismiss date picker and push itinerary view
        vc.dismiss(animated: true) { [weak self] in
            let itinVC = ItineraryViewController(itinerary: itinerary)
            self?.navigationController?.pushViewController(itinVC, animated: true)
        }
        
        // Clear search bar
        searchBar.text = ""
    }
}

// MARK: - UICollectionViewDataSource & Delegate
extension HomeViewController: UICollectionViewDataSource, UICollectionViewDelegateFlowLayout {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return drafts.count
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: TripCell.identifier, for: indexPath) as! TripCell
        cell.configure(with: drafts[indexPath.row])
        return cell
    }
    
    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        let width = collectionView.bounds.width - 40 // Full width minus padding
        let draft = drafts[indexPath.row]
        
        // Calculate height based on content
        let baseHeight: CGFloat = 90 // Base height for city and date
        var additionalHeight: CGFloat = 0
        
        if draft.flight != nil {
            additionalHeight += 44 // Height for two lines of flight info
        }
        
        return CGSize(width: width, height: baseHeight + additionalHeight)
    }
    
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let itineraryVC = ItineraryViewController(itinerary: drafts[indexPath.row])
        navigationController?.pushViewController(itineraryVC, animated: true)
        
        let draft = drafts[indexPath.row]
        var props: [String: Any] = ["city": draft.destination.city]
        props["tripId"] = draft.id
        AnalyticsService.shared.logEvent("Trip Draft Opened", properties: props)
    }
}

// MARK: - UICollectionViewDelegate Swipe Actions
extension HomeViewController {
    func collectionView(_ collectionView: UICollectionView, contextMenuConfigurationForItemAt indexPath: IndexPath, point: CGPoint) -> UIContextMenuConfiguration? {
        return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { _ in
            let deleteAction = UIAction(
                title: "Delete Trip",
                image: UIImage(systemName: "trash"),
                attributes: .destructive
            ) { [weak self] _ in
                self?.deleteTrip(at: indexPath)
            }
            return UIMenu(title: "", children: [deleteAction])
        }
    }
    
    private func deleteTrip(at indexPath: IndexPath) {
        let draft = drafts[indexPath.row]
        
        // Remove from data source
        drafts.remove(at: indexPath.row)
        
        // Remove from persistent storage
        DraftsService.shared.deleteDraft(at: indexPath.row) {
            // Update UI
            self.tripsCollectionView.performBatchUpdates {
                self.tripsCollectionView.deleteItems(at: [indexPath])
            } completion: { _ in
                // Show empty state if needed
                self.emptyStateView.isHidden = !self.drafts.isEmpty
            }
            
            // Log deletion
            AnalyticsService.shared.logEvent("Trip Deleted", properties: [
                "city": draft.destination.city,
                "tripId": draft.id
            ])
        }
    }
}

// MARK: - TripCell
class TripCell: UICollectionViewCell {
    static let identifier = "TripCell"
    
    private let containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        view.layer.cornerRadius = 12
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.1
        view.layer.shadowOffset = CGSize(width: 0, height: 2)
        view.layer.shadowRadius = 8
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let iconView: UIImageView = {
        let iv = UIImageView()
        iv.image = UIImage(systemName: "airplane.departure")
        iv.tintColor = .systemBlue
        iv.contentMode = .scaleAspectFit
        iv.translatesAutoresizingMaskIntoConstraints = false
        return iv
    }()
    
    private let cityLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 18, weight: .semibold)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let dateLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 14)
        label.textColor = .secondaryLabel
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let flightLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 14)
        label.textColor = .secondaryLabel
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        label.isHidden = true
        return label
    }()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        contentView.addSubview(containerView)
        containerView.addSubview(iconView)
        containerView.addSubview(cityLabel)
        containerView.addSubview(dateLabel)
        containerView.addSubview(flightLabel)
        
        NSLayoutConstraint.activate([
            containerView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            containerView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),
            
            iconView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
            iconView.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 16),
            iconView.widthAnchor.constraint(equalToConstant: 24),
            iconView.heightAnchor.constraint(equalToConstant: 24),
            
            cityLabel.leadingAnchor.constraint(equalTo: iconView.trailingAnchor, constant: 12),
            cityLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 16),
            cityLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
            
            dateLabel.leadingAnchor.constraint(equalTo: cityLabel.leadingAnchor),
            dateLabel.topAnchor.constraint(equalTo: cityLabel.bottomAnchor, constant: 4),
            dateLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
            
            flightLabel.leadingAnchor.constraint(equalTo: dateLabel.leadingAnchor),
            flightLabel.topAnchor.constraint(equalTo: dateLabel.bottomAnchor, constant: 4),
            flightLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
            flightLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -16)
        ])
    }
    
    func configure(with itinerary: Itinerary) {
        cityLabel.text = itinerary.destination.city
        
        let df = DateFormatter()
        df.dateStyle = .medium
        let dateText: String
        if Calendar.current.isDate(itinerary.startDate, inSameDayAs: itinerary.endDate) {
            dateText = df.string(from: itinerary.startDate)
        } else {
            dateText = "\(df.string(from: itinerary.startDate)) - \(df.string(from: itinerary.endDate))"
        }
        dateLabel.text = dateText
        
        // Configure flight information if available
        if let flight = itinerary.flight {
            let tf = DateFormatter()
            tf.dateFormat = "HH:mm"
            
            var flightText = ""
            if let flightNumber = flight.flightNumber {
                flightText += "\(flightNumber): "
            }
            flightText += "\(flight.origin) → \(flight.destination)"
            flightText += "\nDeparture: \(tf.string(from: flight.departureDate))"
            
            if let duration = flight.durationText {
                flightText += " (\(duration))"
            }
            
            flightLabel.text = flightText
            flightLabel.isHidden = false
        } else {
            flightLabel.isHidden = true
        }
        
        // Let the cell layout naturally based on content
        setNeedsLayout()
        layoutIfNeeded()
    }
    
    // Add interaction configuration for swipe actions
    override func didMoveToSuperview() {
        super.didMoveToSuperview()
        
        // Enable user interaction for context menu
        isUserInteractionEnabled = true
        
        // Add visual feedback for press
        let interaction = UIContextMenuInteraction(delegate: self)
        addInteraction(interaction)
    }
}

// MARK: - UIContextMenuInteractionDelegate
extension TripCell: UIContextMenuInteractionDelegate {
    func contextMenuInteraction(_ interaction: UIContextMenuInteraction, willDisplayMenuFor configuration: UIContextMenuConfiguration, animator: UIContextMenuInteractionAnimating?) {
        // Add haptic feedback when menu appears
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }
    
    func contextMenuInteraction(_ interaction: UIContextMenuInteraction, configurationForMenuAtLocation location: CGPoint) -> UIContextMenuConfiguration? {
        return nil // Let the collection view handle the menu configuration
    }
}

class Autosuggest: NSObject, MKLocalSearchCompleterDelegate {
    private let completer = MKLocalSearchCompleter()
    var didUpdate: ([String]) -> Void = { _ in }

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = .address
    }

    func update(query: String) { completer.queryFragment = query }

    func completer(_ c: MKLocalSearchCompleter, 
                   didUpdateResults results: [MKLocalSearchCompletion]) {
        let cities = results.map { $0.title }   // or $0.subtitle
        didUpdate(cities)
    }
}

struct CityStore {
    static var all: [String] = {
        guard
          let url = Bundle.main.url(forResource: "cities", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let list = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return list
    }()
} 
