import UIKit
import Foundation

class ExpensesViewController: UIViewController {
    
    // MARK: - Properties
    private var expenseGroup: ExpenseGroup
    private var selectedExpenses: Set<UUID> = []
    // Holds the trip chosen in the New-Expense alert
    var selectedTripForNewExpense: Itinerary?
    private var pickerAdapters: [ExpenseFormPickerAdapter] = []
    // Currently-selected trip context
    private var tripId: String = ""
    // Bridge remaining legacy table-view helpers to the new view-model
    private var filteredExpenses: [Expense] { viewModel.filteredExpenses }
    private enum Section { case main }
    private var viewModel: ExpenseListViewModel!
    private var dataSource: UITableViewDiffableDataSource<Section, UUID>!
    
    // Enum for text-field indices in expense forms
    private enum Field: Int { case title, amount, category, payer, payment, trip }

    struct Column: Codable {
        let id: String
        let title: String
        let keyPath: String // Store as string since KeyPath isn't Codable
        var isVisible: Bool
        
        var actualKeyPath: KeyPath<Expense, String> {
            switch id {
            case "date": return \Expense.formattedDate
            case "title": return \Expense.title
            case "amount": return \Expense.formattedAmount
            case "category": return \Expense.categoryIcon
            case "payer": return \Expense.payer.name
            case "payment": return \Expense.paymentMethod.rawValue
            case "trip": return \Expense.displayTripName
            default: return \Expense.title
            }
        }
    }
    
    private var columns: [Column] = [
        Column(id: "date", title: "Date", keyPath: "formattedDate", isVisible: true),
        Column(id: "title", title: "Title", keyPath: "title", isVisible: true),
        Column(id: "amount", title: "Amount", keyPath: "formattedAmount", isVisible: true),
        Column(id: "category", title: "Category", keyPath: "categoryIcon", isVisible: true),
        Column(id: "payer", title: "Payer", keyPath: "payer", isVisible: true),
        Column(id: "payment", title: "Payment", keyPath: "paymentMethod", isVisible: true),
        Column(id: "trip", title: "Trip", keyPath: "tripName", isVisible: true)
    ]
    
    private let summaryView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        view.layer.cornerRadius = 8
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.1
        view.layer.shadowOffset = CGSize(width: 0, height: 1)
        view.layer.shadowRadius = 2
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let totalLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 24, weight: .bold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let categoryStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private let tableView: UITableView = {
        let tv = UITableView()
        tv.backgroundColor = .systemBackground
        tv.separatorStyle = .singleLine
        tv.allowsSelection = false
        tv.translatesAutoresizingMaskIntoConstraints = false
        return tv
    }()
    
    private let addButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.backgroundColor = .systemBlue
        button.tintColor = .white
        button.layer.cornerRadius = 28
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOpacity = 0.25
        button.layer.shadowOffset = CGSize(width: 0, height: 2)
        button.layer.shadowRadius = 4
        
        let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)
        let image = UIImage(systemName: "plus", withConfiguration: config)
        button.setImage(image, for: .normal)
        
        return button
    }()
    
    // MARK: - UI Elements
    private let selectButton: UIBarButtonItem = {
        let button = UIBarButtonItem(title: "Select", style: .plain, target: nil, action: nil)
        return button
    }()
    
    private let deleteButton: UIBarButtonItem = {
        let button = UIBarButtonItem(title: "Delete", style: .plain, target: nil, action: nil)
        button.tintColor = .systemRed
        return button
    }()
    
    private let editButton: UIBarButtonItem = {
        let button = UIBarButtonItem(title: "Edit", style: .plain, target: nil, action: nil)
        return button
    }()
    
    // MARK: - Initialization
    init() {
        // Load expense group from ExpensesService or create a new one
        if let savedExpenseGroup = ExpensesService.shared.fetchExpenseGroup(forTrip: tripId) {
            self.expenseGroup = savedExpenseGroup
        } else {
            self.expenseGroup = ExpenseGroup(
                title: "Travel Expenses",
                startDate: Date(),
                endDate: Date(),
                expenses: [],
                currency: .usd
            )
        }
        
        super.init(nibName: nil, bundle: nil)
        tabBarItem = UITabBarItem(title: "Expenses", image: UIImage(systemName: "dollarsign.circle"), tag: 2)
        viewModel = ExpenseListViewModel(group: expenseGroup)
        viewModel.onUpdate = { [weak self] in
            guard let self = self else { return }
            // Keep local copy in sync so currency & other callers stay correct
            self.expenseGroup = self.viewModel.expenseGroup
            self.applySnapshot()
            self.updateSummaryView()
        }
        loadColumnSettings()
        
        // Add targets for buttons
        selectButton.target = self
        selectButton.action = #selector(toggleSelection)
        deleteButton.target = self
        deleteButton.action = #selector(deleteSelectedExpenses)
        editButton.target = self
        editButton.action = #selector(editSelectedExpenses)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - View Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupTableView()
        setupNavigationBar()
        setupAddButton()
        updateSummaryView()
        
        // Add notification observer for app termination
        NotificationCenter.default.addObserver(self,
                                             selector: #selector(saveExpenseGroup),
                                             name: UIApplication.willTerminateNotification,
                                             object: nil)
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func saveExpenseGroup() {
        ExpensesService.shared.updateExpenseGroup(viewModel.expenseGroup, forTrip: tripId)
    }
    
    // Update addExpense to save after adding
    private func saveAndAddExpense(_ expense: Expense) {
        viewModel.add(expense)
        // Notify if expense date is outside trip range
        if expense.date < expenseGroup.startDate || expense.date > expenseGroup.endDate {
            let alert = UIAlertController(
                title: "Date Outside Trip Range",
                message: "This expense's date doesn't fall within your trip dates (\(FormatterCache.dateShort.string(from: expenseGroup.startDate)) - \(FormatterCache.dateShort.string(from: expenseGroup.endDate))). It has still been saved.",
                preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
        }
    }
    
    // Update deleteExpense to save after deleting
    private func deleteExpense(at indexPath: IndexPath) {
        let expense = viewModel.filteredExpenses[indexPath.row]
        viewModel.delete(ids: [expense.id])
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        view.addSubview(summaryView)
        summaryView.addSubview(totalLabel)
        summaryView.addSubview(categoryStackView)
        view.addSubview(tableView)
        
        NSLayoutConstraint.activate([
            summaryView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            summaryView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            summaryView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            summaryView.heightAnchor.constraint(equalToConstant: 80),
            
            totalLabel.topAnchor.constraint(equalTo: summaryView.topAnchor, constant: 8),
            totalLabel.leadingAnchor.constraint(equalTo: summaryView.leadingAnchor, constant: 8),
            totalLabel.trailingAnchor.constraint(equalTo: summaryView.trailingAnchor, constant: -8),
            
            categoryStackView.topAnchor.constraint(equalTo: totalLabel.bottomAnchor, constant: 8),
            categoryStackView.leadingAnchor.constraint(equalTo: summaryView.leadingAnchor, constant: 8),
            categoryStackView.trailingAnchor.constraint(equalTo: summaryView.trailingAnchor, constant: -8),
            categoryStackView.bottomAnchor.constraint(equalTo: summaryView.bottomAnchor, constant: -8),
            
            tableView.topAnchor.constraint(equalTo: summaryView.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func setupTableView() {
        tableView.delegate = self
        dataSource = UITableViewDiffableDataSource<Section, UUID>(tableView: tableView) { [weak self] table, indexPath, expenseId in
            guard let self = self,
                  let expense = self.viewModel.expense(for: expenseId) else { return UITableViewCell() }
            let cell = table.dequeueReusableCell(withIdentifier: ExpenseCell.identifier, for: indexPath) as! ExpenseCell
            cell.configure(with: expense, columns: self.columns.filter{$0.isVisible}.map{$0.actualKeyPath})
            return cell
        }
        tableView.register(ExpenseCell.self, forCellReuseIdentifier: ExpenseCell.identifier)
        tableView.register(HeaderCell.self, forHeaderFooterViewReuseIdentifier: HeaderCell.identifier)
        applySnapshot()
    }
    
    private func applySnapshot() {
        var snap = NSDiffableDataSourceSnapshot<Section, UUID>()
        snap.appendSections([.main])
        snap.appendItems(viewModel.filteredExpenses.map{ $0.id })
        dataSource.apply(snap, animatingDifferences: true)
    }
    
    private func setupNavigationBar() {
        title = "Expenses"
        navigationController?.navigationBar.prefersLargeTitles = true
        
        let filterButton = UIBarButtonItem(image: UIImage(systemName: "line.3.horizontal.decrease.circle"), style: .plain, target: self, action: #selector(showFilters))
        let settingsButton = UIBarButtonItem(image: UIImage(systemName: "gear"), style: .plain, target: self, action: #selector(showSettings))
        navigationItem.rightBarButtonItems = [settingsButton, filterButton, selectButton]
    }
    
    private func setupAddButton() {
        view.addSubview(addButton)
        
        NSLayoutConstraint.activate([
            addButton.widthAnchor.constraint(equalToConstant: 56),
            addButton.heightAnchor.constraint(equalToConstant: 56),
            addButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            addButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16)
        ])
        
        addButton.addTarget(self, action: #selector(addExpenseTapped), for: .touchUpInside)
    }
    
    private func updateSummaryView() {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = expenseGroup.currency.symbol
        
        let filteredTotal = viewModel.total
        totalLabel.text = formatter.string(from: NSDecimalNumber(decimal: filteredTotal))
        
        categoryStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        let categoryTotals = viewModel.categoryTotals
        
        for category in Expense.Category.allCases {
            let total = categoryTotals[category] ?? 0
            let categoryView = CategorySummaryView(
                category: category,
                amount: total,
                currency: expenseGroup.currency
            )
            categoryStackView.addArrangedSubview(categoryView)
        }
    }
    
    // MARK: - Settings
    private func loadColumnSettings() {
        if let savedColumns = SettingsService.shared.loadColumns() {
            for savedColumn in savedColumns {
                if let index = columns.firstIndex(where: { $0.id == savedColumn.id }) {
                    columns[index].isVisible = savedColumn.isVisible
                }
            }
        }
    }
    
    private func saveColumnSettings() {
        SettingsService.shared.saveColumns(columns)
    }
    
    @objc private func showSettings() {
        let alert = UIAlertController(title: "Settings", message: nil, preferredStyle: .actionSheet)
        
        alert.addAction(UIAlertAction(title: "Configure Columns", style: .default) { [weak self] _ in
            self?.showColumnConfiguration()
        })
        
        alert.addAction(UIAlertAction(title: "Manage Payers", style: .default) { [weak self] _ in
            self?.showPayerManagement()
        })
        
        alert.addAction(UIAlertAction(title: "Export as CSV", style: .default) { [weak self] _ in
            self?.exportToCSV()
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        if let popoverController = alert.popoverPresentationController {
            popoverController.barButtonItem = navigationItem.rightBarButtonItems?.first
        }
        
        present(alert, animated: true)
    }
    
    private func showColumnConfiguration() {
        let vc = ColumnConfigurationViewController(columns: columns) { [weak self] updatedColumns in
            guard let self = self else { return }
            self.columns = updatedColumns
            self.saveColumnSettings()
            // Refresh both data and header
            self.applySnapshot()
            self.tableView.reloadData()
        }
        let nav = UINavigationController(rootViewController: vc)
        present(nav, animated: true)
    }
    
    private func showPayerManagement() {
        let alert = UIAlertController(title: "Manage Payers", message: nil, preferredStyle: .alert)
        
        let payers = DraftsService.shared.fetchPayers()
        let payersList = payers.map { payer in
            "\(payer.name)"
        }.joined(separator: "\n")
        
        alert.message = "Current payers:\n\(payersList)"
        
        alert.addTextField { textField in
            textField.placeholder = "New payer name"
        }
        
        alert.addAction(UIAlertAction(title: "Add", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?.first?.text,
                  !name.isEmpty else { return }
            
            var currentPayers = DraftsService.shared.fetchPayers()
            currentPayers.append(Expense.Payer(name: name))
            DraftsService.shared.savePayers(currentPayers)
            self.applySnapshot()
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        present(alert, animated: true)
    }
    
    private func exportToCSV() {
        guard let data = ExportService.csvData(for: expenseGroup.expenses) else { return }
        let activityVC = UIActivityViewController(activityItems: [data], applicationActivities: nil)
        if let popoverController = activityVC.popoverPresentationController {
            popoverController.barButtonItem = navigationItem.rightBarButtonItems?.last
        }
        present(activityVC, animated: true)
    }
    
    // MARK: - Filtering
    private func toggleFilter(_ filter: ExpenseFilter) {
        viewModel.toggle(filter: filter)
    }
    
    private func clearFilters() {
        viewModel.clearFilters()
    }
    
    @objc private func addExpenseTapped() {
        selectedTripForNewExpense = nil
        let alert = UIAlertController(title: "New Expense", message: nil, preferredStyle: .alert)
        
        alert.addTextField { textField in
            textField.placeholder = "Title"
        }
        
        alert.addTextField { textField in
            textField.placeholder = "Amount"
            textField.keyboardType = .decimalPad
        }
        
        pickerAdapters.removeAll()

        let categoryPicker = UIPickerView()
        let catAdapter = ExpenseFormPickerAdapter(kind: .category, fieldIndex: Field.category.rawValue, alert: alert, controller: self)
        categoryPicker.delegate = catAdapter
        categoryPicker.dataSource = catAdapter
        pickerAdapters.append(catAdapter)
        
        alert.addTextField { textField in
            textField.placeholder = "Category"
            textField.inputView = categoryPicker
            // Set default category to Food & Drinks
            textField.text = Expense.Category.food.rawValue
            if let index = Expense.Category.allCases.firstIndex(of: .food) {
                categoryPicker.selectRow(index, inComponent: 0, animated: false)
            }
        }
        
        let payerPicker = UIPickerView()
        let payAdapter = ExpenseFormPickerAdapter(kind: .payer, fieldIndex: Field.payer.rawValue, alert: alert, controller: self)
        payerPicker.delegate = payAdapter
        payerPicker.dataSource = payAdapter
        pickerAdapters.append(payAdapter)
        
        alert.addTextField { textField in
            textField.placeholder = "Payer"
            textField.inputView = payerPicker
            // Set default payer to "Me"
            let payers = UserDefaults.standard.payers
            if let defaultPayer = payers.first(where: { $0.name == "Me" }) {
                textField.text = defaultPayer.name
                if let index = payers.firstIndex(where: { $0.id == defaultPayer.id }) {
                    payerPicker.selectRow(index, inComponent: 0, animated: false)
                }
            }
        }
        
        let paymentPicker = UIPickerView()
        let payMAdapter = ExpenseFormPickerAdapter(kind: .payment, fieldIndex: Field.payment.rawValue, alert: alert, controller: self)
        paymentPicker.delegate = payMAdapter
        paymentPicker.dataSource = payMAdapter
        pickerAdapters.append(payMAdapter)
        
        alert.addTextField { textField in
            textField.placeholder = "Payment Method"
            textField.inputView = paymentPicker
            // Set default payment method to Credit Card
            textField.text = Expense.PaymentMethod.creditCard.rawValue
            if let index = Expense.PaymentMethod.allCases.firstIndex(of: .creditCard) {
                paymentPicker.selectRow(index, inComponent: 0, animated: false)
            }
        }
        
        // Trip selection via picker
        let tripPicker = UIPickerView()
        let tripAdapter = ExpenseFormPickerAdapter(kind: .trip, fieldIndex: Field.trip.rawValue, alert: alert, controller: self)
        tripPicker.delegate = tripAdapter
        tripPicker.dataSource = tripAdapter
        pickerAdapters.append(tripAdapter)
        
        alert.addTextField { [weak self] textField in
            guard let self = self else { return }
            textField.placeholder = "Trip"
            textField.inputView = tripPicker
            if !self.tripId.isEmpty,
               let matching = DraftsService.shared.fetchDrafts().first(where: { $0.id == self.tripId }) {
                self.selectedTripForNewExpense = matching
                textField.text = matching.destination.city
            } else if let lastId = UserDefaults.standard.string(forKey: "lastViewedTripId"),
                      let lastTrip = DraftsService.shared.fetchDrafts().first(where: { $0.id == lastId }) {
                self.selectedTripForNewExpense = lastTrip
                textField.text = lastTrip.destination.city
            }
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Add", style: .default) { [weak self] _ in
            guard let self = self,
                  let title = alert.textFields?[Field.title.rawValue].text,
                  let amountText = alert.textFields?[Field.amount.rawValue].text,
                  let amount = Decimal(string: amountText),
                  let categoryText = alert.textFields?[Field.category.rawValue].text,
                  let category = Expense.Category.allCases.first(where: { $0.rawValue == categoryText }),
                  let payerText = alert.textFields?[Field.payer.rawValue].text,
                  let payer = UserDefaults.standard.payers.first(where: { $0.name == payerText }),
                  let paymentText = alert.textFields?[Field.payment.rawValue].text,
                  let paymentMethod = Expense.PaymentMethod.allCases.first(where: { $0.rawValue == paymentText }) else { return }
            
            guard let trip = self.selectedTripForNewExpense else {
                let tripAlert = UIAlertController(title: "Trip Required", message: "Please select a trip.", preferredStyle: .alert)
                tripAlert.addAction(UIAlertAction(title: "OK", style: .default))
                self.present(tripAlert, animated: true)
                return
            }
            
            let expense = Expense(
                title: title,
                amount: amount,
                category: category,
                date: Date(),
                paymentMethod: paymentMethod,
                currency: self.expenseGroup.currency,
                payer: payer,
                tripId: trip.id,
                tripName: trip.destination.city
            )
            
            self.saveAndAddExpense(expense)
        })
        
        present(alert, animated: true)
    }
    
    @objc private func showFilters() {
        let alert = UIAlertController(title: "Filter Expenses", message: nil, preferredStyle: .actionSheet)
        
        let categories = Expense.Category.allCases.map { category in
            UIAlertAction(title: "Category: \(category.rawValue)", style: .default) { [weak self] _ in
                self?.toggleFilter(.category(category))
            }
        }
        
        let payers = UserDefaults.standard.payers.map { payer in
            UIAlertAction(title: "Payer: \(payer.name)", style: .default) { [weak self] _ in
                self?.toggleFilter(.payer(payer))
            }
        }
        
        let paymentMethods = Expense.PaymentMethod.allCases.map { method in
            UIAlertAction(title: "Payment: \(method.rawValue)", style: .default) { [weak self] _ in
                self?.toggleFilter(.paymentMethod(method))
            }
        }
        
        let clearFilters = UIAlertAction(title: "Clear All Filters", style: .destructive) { [weak self] _ in
            self?.clearFilters()
        }
        
        [categories, payers, paymentMethods].forEach { actions in
            actions.forEach { alert.addAction($0) }
        }
        
        alert.addAction(clearFilters)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        if let popoverController = alert.popoverPresentationController {
            popoverController.barButtonItem = navigationItem.rightBarButtonItems?[1]
        }
        
        present(alert, animated: true)
    }
    
    private func editExpense(_ expense: Expense) {
        let alert = UIAlertController(title: "Edit Expense", message: nil, preferredStyle: .alert)
        
        alert.addTextField { textField in
            textField.text = expense.title
            textField.placeholder = "Title"
        }
        
        alert.addTextField { textField in
            textField.text = String(describing: expense.amount)
            textField.placeholder = "Amount"
            textField.keyboardType = .decimalPad
        }
        
        pickerAdapters.removeAll()

        let categoryPicker = UIPickerView()
        let catAdapter = ExpenseFormPickerAdapter(kind: .category, fieldIndex: Field.category.rawValue, alert: alert, controller: self)
        categoryPicker.delegate = catAdapter
        categoryPicker.dataSource = catAdapter
        pickerAdapters.append(catAdapter)
        
        alert.addTextField { textField in
            textField.text = expense.category.rawValue
            textField.placeholder = "Category"
            textField.inputView = categoryPicker
            
            // Select current category
            if let index = Expense.Category.allCases.firstIndex(of: expense.category) {
                categoryPicker.selectRow(index, inComponent: 0, animated: false)
            }
        }
        
        let payerPicker = UIPickerView()
        let payAdapter = ExpenseFormPickerAdapter(kind: .payer, fieldIndex: Field.payer.rawValue, alert: alert, controller: self)
        payerPicker.delegate = payAdapter
        payerPicker.dataSource = payAdapter
        pickerAdapters.append(payAdapter)
        
        alert.addTextField { textField in
            textField.text = expense.payer.name
            textField.placeholder = "Payer"
            textField.inputView = payerPicker
            
            // Select current payer
            if let index = UserDefaults.standard.payers.firstIndex(where: { $0.id == expense.payer.id }) {
                payerPicker.selectRow(index, inComponent: 0, animated: false)
            }
        }
        
        let paymentPicker = UIPickerView()
        let payMAdapter = ExpenseFormPickerAdapter(kind: .payment, fieldIndex: Field.payment.rawValue, alert: alert, controller: self)
        paymentPicker.delegate = payMAdapter
        paymentPicker.dataSource = payMAdapter
        pickerAdapters.append(payMAdapter)
        
        alert.addTextField { textField in
            textField.text = expense.paymentMethod.rawValue
            textField.placeholder = "Payment Method"
            textField.inputView = paymentPicker
            
            // Select current payment method
            if let index = Expense.PaymentMethod.allCases.firstIndex(of: expense.paymentMethod) {
                paymentPicker.selectRow(index, inComponent: 0, animated: false)
            }
        }
        
        // Trip picker
        let tripPicker = UIPickerView()
        let tripAdapter = ExpenseFormPickerAdapter(kind: .trip, fieldIndex: Field.trip.rawValue, alert: alert, controller: self)
        tripPicker.delegate = tripAdapter
        tripPicker.dataSource = tripAdapter
        pickerAdapters.append(tripAdapter)
        
        alert.addTextField { [weak self] textField in
            guard let self = self else { return }
            textField.placeholder = "Trip"
            textField.inputView = tripPicker
            if let tripName = expense.tripName,
               let index = DraftsService.shared.fetchDrafts().firstIndex(where: { $0.destination.city == tripName }) {
                tripPicker.selectRow(index + 1, inComponent: 0, animated: false)
                textField.text = tripName
                self.selectedTripForNewExpense = DraftsService.shared.fetchDrafts()[index]
            }
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self,
                  let title = alert.textFields?[Field.title.rawValue].text,
                  let amountText = alert.textFields?[Field.amount.rawValue].text,
                  let amount = Decimal(string: amountText),
                  let categoryText = alert.textFields?[2].text,
                  let category = Expense.Category.allCases.first(where: { $0.rawValue == categoryText }),
                  let payerText = alert.textFields?[3].text,
                  let payer = UserDefaults.standard.payers.first(where: { $0.name == payerText }),
                  let paymentText = alert.textFields?[4].text,
                  let paymentMethod = Expense.PaymentMethod.allCases.first(where: { $0.rawValue == paymentText }),
                  let index = self.expenseGroup.expenses.firstIndex(where: { $0.id == expense.id }) else { return }
            
            var updatedExpense = expense
            updatedExpense.title = title
            updatedExpense.amount = amount
            updatedExpense.category = category
            updatedExpense.payer = payer
            updatedExpense.paymentMethod = paymentMethod
            
            // Trip
            let trip = self.selectedTripForNewExpense
            if let trip = trip {
                updatedExpense.tripId = trip.id
                updatedExpense.tripName = trip.destination.city
            } else {
                updatedExpense.tripId = nil
                updatedExpense.tripName = nil
            }
            
            self.viewModel.replace(id: expense.id, with: updatedExpense)
            self.applySnapshot()
            self.updateSummaryView()
        })
        
        present(alert, animated: true)
    }
    
    // MARK: - Selection Actions
    @objc private func toggleSelection() {
        let selecting = !tableView.isEditing
        tableView.setEditing(selecting, animated: true)
        selectButton.title = selecting ? "Cancel" : "Select"
        
        if selecting {
            navigationItem.rightBarButtonItems = [deleteButton, editButton, selectButton]
        } else {
            let filterButton = UIBarButtonItem(image: UIImage(systemName: "line.3.horizontal.decrease.circle"), style: .plain, target: self, action: #selector(showFilters))
            let settingsButton = UIBarButtonItem(image: UIImage(systemName: "gear"), style: .plain, target: self, action: #selector(showSettings))
            navigationItem.rightBarButtonItems = [settingsButton, filterButton, selectButton]
            selectedExpenses.removeAll()
        }
    }
    
    @objc private func deleteSelectedExpenses() {
        guard !selectedExpenses.isEmpty else { return }
        
        let alert = UIAlertController(title: "Delete Expenses", 
                                    message: "Are you sure you want to delete \(selectedExpenses.count) expenses?", 
                                    preferredStyle: .alert)
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            
            self.viewModel.delete(ids: self.selectedExpenses)
            self.selectedExpenses.removeAll()
            self.toggleSelection()
        })
        
        present(alert, animated: true)
    }
    
    @objc private func editSelectedExpenses() {
        guard selectedExpenses.count > 0 else { return }
        
        let alert = UIAlertController(title: "Edit Expenses", message: nil, preferredStyle: .alert)
        
        // Reset adapters for this alert
        pickerAdapters.removeAll()

        // Only show fields that make sense to bulk edit
        let categoryPicker = UIPickerView()
        let bulkCatAdapter = ExpenseFormPickerAdapter(kind: .category, fieldIndex: 0, alert: alert, controller: self)
        categoryPicker.delegate = bulkCatAdapter
        categoryPicker.dataSource = bulkCatAdapter
        pickerAdapters.append(bulkCatAdapter)
        
        alert.addTextField { textField in
            textField.placeholder = "Category (optional)"
            textField.inputView = categoryPicker
        }
        
        let payerPicker = UIPickerView()
        let bulkPayerAdapter = ExpenseFormPickerAdapter(kind: .payer, fieldIndex: 1, alert: alert, controller: self)
        payerPicker.delegate = bulkPayerAdapter
        payerPicker.dataSource = bulkPayerAdapter
        pickerAdapters.append(bulkPayerAdapter)
        
        alert.addTextField { textField in
            textField.placeholder = "Payer (optional)"
            textField.inputView = payerPicker
        }
        
        let paymentPicker = UIPickerView()
        let bulkPayAdapter = ExpenseFormPickerAdapter(kind: .payment, fieldIndex: 2, alert: alert, controller: self)
        paymentPicker.delegate = bulkPayAdapter
        paymentPicker.dataSource = bulkPayAdapter
        pickerAdapters.append(bulkPayAdapter)
        
        alert.addTextField { textField in
            textField.placeholder = "Payment Method (optional)"
            textField.inputView = paymentPicker
        }
        
        // Add trip selection
        let tripPicker = UIPickerView()
        let bulkTripAdapter = ExpenseFormPickerAdapter(kind: .trip, fieldIndex: 3, alert: alert, controller: self)
        tripPicker.delegate = bulkTripAdapter
        tripPicker.dataSource = bulkTripAdapter
        tripPicker.tag = 3
        
        alert.addTextField { textField in
            textField.placeholder = "Trip (optional)"
            textField.inputView = tripPicker
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Update", style: .default) { [weak self] _ in
            guard let self = self else { return }
            
            let categoryText = alert.textFields?[0].text
            let payerText = alert.textFields?[1].text
            let paymentText = alert.textFields?[2].text
            let tripText = alert.textFields?[3].text
            
            for id in self.selectedExpenses {
                guard var updated = self.viewModel.expense(for: id) else { continue }
                if let categoryText = categoryText,
                   !categoryText.isEmpty,
                   let category = Expense.Category.allCases.first(where: { $0.rawValue == categoryText }) {
                    updated.category = category
                }
                if let payerText = payerText,
                   !payerText.isEmpty,
                   let payer = DraftsService.shared.fetchPayers().first(where: { $0.name == payerText }) {
                    updated.payer = payer
                }
                if let paymentText = paymentText,
                   !paymentText.isEmpty,
                   let paymentMethod = Expense.PaymentMethod.allCases.first(where: { $0.rawValue == paymentText }) {
                    updated.paymentMethod = paymentMethod
                }
                if let tripText = tripText, !tripText.isEmpty {
                    let drafts = DraftsService.shared.fetchDrafts()
                    if let trip = drafts.first(where: { $0.destination.city == tripText }) {
                        updated.tripId = trip.id
                        updated.tripName = trip.destination.city
                    }
                }
                self.viewModel.replace(id: id, with: updated)
            }
            self.selectedExpenses.removeAll()
            self.toggleSelection()
        })
        
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource & Delegate
extension ExpensesViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let header = tableView.dequeueReusableHeaderFooterView(withIdentifier: HeaderCell.identifier) as! HeaderCell
        header.configure(with: columns.filter { $0.isVisible }.map { $0.title })
        return header
    }
    
    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        return 44
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return 44
    }
    
    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let expense = viewModel.filteredExpenses[indexPath.row]
        
        let deleteAction = UIContextualAction(style: .destructive, title: "Delete") { [weak self] _, _, completion in
            self?.deleteExpense(at: indexPath)
            completion(true)
        }
        deleteAction.image = UIImage(systemName: "trash")
        
        let editAction = UIContextualAction(style: .normal, title: "Edit") { [weak self] _, _, completion in
            self?.editExpense(expense)
            completion(true)
        }
        editAction.backgroundColor = .systemBlue
        editAction.image = UIImage(systemName: "pencil")
        
        return UISwipeActionsConfiguration(actions: [deleteAction, editAction])
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        if tableView.isEditing {
            let expense = viewModel.filteredExpenses[indexPath.row]
            if selectedExpenses.contains(expense.id) {
                selectedExpenses.remove(expense.id)
            } else {
                selectedExpenses.insert(expense.id)
            }
            updateSelectionButtons()
        } else {
            tableView.deselectRow(at: indexPath, animated: true)
        }
    }
    
    private func updateSelectionButtons() {
        deleteButton.isEnabled = !selectedExpenses.isEmpty
        editButton.isEnabled = !selectedExpenses.isEmpty
    }
}

// MARK: - UIPickerViewDelegate & DataSource
extension ExpensesViewController: UIPickerViewDelegate, UIPickerViewDataSource {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        switch pickerView.tag {
        case 0: return Expense.Category.allCases.count
        case 1: return DraftsService.shared.fetchPayers().count
        case 2: return Expense.PaymentMethod.allCases.count
        case 3: return DraftsService.shared.fetchDrafts().count + 1 // +1 for "No Trip" option
        default: return 0
        }
    }
    
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        switch pickerView.tag {
        case 0: return Expense.Category.allCases[row].rawValue
        case 1: return DraftsService.shared.fetchPayers()[row].name
        case 2: return Expense.PaymentMethod.allCases[row].rawValue
        case 3:
            if row == 0 { return "No Trip" }
            let drafts = DraftsService.shared.fetchDrafts()
            return drafts[row - 1].destination.city
        default: return nil
        }
    }
    
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        guard let alert = presentedViewController as? UIAlertController else { return }
        switch pickerView.tag {
        case 0:
            let category = Expense.Category.allCases[row]
            alert.textFields?[2].text = category.rawValue
        case 1:
            let payer = DraftsService.shared.fetchPayers()[row]
            alert.textFields?[3].text = payer.name
        case 2:
            let method = Expense.PaymentMethod.allCases[row]
            alert.textFields?[4].text = method.rawValue
        case 3:
            if row == 0 {
                alert.textFields?[5].text = ""
                self.selectedTripForNewExpense = nil
            } else {
                let drafts = DraftsService.shared.fetchDrafts()
                let trip = drafts[row - 1]
                alert.textFields?[5].text = trip.destination.city
                self.selectedTripForNewExpense = trip
            }
        default: break
        }
    }
}

// MARK: - Expense Extensions
extension Expense {
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
    
    var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = currency.symbol
        return formatter.string(from: NSDecimalNumber(decimal: amount)) ?? ""
    }
    
    var categoryIcon: String {
        let icon = category.icon
        return "  \(icon)  " // Add padding for better appearance
    }
    
    var displayTripName: String {
        tripName ?? "No Trip"
    }
}

// MARK: - Supporting Types
enum ExpenseFilter: Hashable {
    case category(Expense.Category)
    case payer(Expense.Payer)
    case paymentMethod(Expense.PaymentMethod)
    
    func isSameType(as other: ExpenseFilter) -> Bool {
        switch (self, other) {
        case (.category, .category): return true
        case (.payer, .payer): return true
        case (.paymentMethod, .paymentMethod): return true
        default: return false
        }
    }
}

extension ExpensesViewController {
    /// Alternate initializer used by TripExpensesViewController
    convenience init(tripId: String, tripTitle: String) {
        self.init()
        // Store context
        self.tripId = tripId
        self.title = tripTitle
        // Load or create an ExpenseGroup for this trip
        let loadedGroup = ExpensesService.shared.fetchExpenseGroup(forTrip: tripId) ?? ExpenseGroup(
            title: tripTitle,
            startDate: Date(),
            endDate: Date(),
            expenses: [],
            currency: .usd
        )
        // Replace backing model objects
        self.expenseGroup = loadedGroup
        self.viewModel = ExpenseListViewModel(group: loadedGroup)
        self.viewModel.onUpdate = { [weak self] in
            guard let self = self else { return }
            self.expenseGroup = self.viewModel.expenseGroup
            self.applySnapshot()
            self.updateSummaryView()
        }
    }
}