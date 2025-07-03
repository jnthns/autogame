import UIKit

class ExpensesViewController: UIViewController {
    
    // MARK: - Properties
    private var expenseGroup: ExpenseGroup
    private var filteredExpenses: [Expense] = []
    private var activeFilters: Set<ExpenseFilter> = []
    private var tripId: String = ""
    private var selectedExpenses: Set<UUID> = []
    // Holds the trip chosen in the New-Expense alert
    private var selectedTripForNewExpense: Itinerary?
    
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
        filteredExpenses = expenseGroup.expenses
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
        ExpensesService.shared.updateExpenseGroup(expenseGroup, forTrip: tripId)
    }
    
    // Update addExpense to save after adding
    private func saveAndAddExpense(_ expense: Expense) {
        expenseGroup.expenses.append(expense)
        applyFilters()
        updateSummaryView()
        tableView.reloadData()
        
        // Save changes
        saveExpenseGroup()
    }
    
    // Update deleteExpense to save after deleting
    private func deleteExpense(at indexPath: IndexPath) {
        let expense = filteredExpenses[indexPath.row]
        expenseGroup.expenses.removeAll { $0.id == expense.id }
        applyFilters()
        updateSummaryView()
        tableView.reloadData()
        
        // Save changes
        saveExpenseGroup()
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
        tableView.dataSource = self
        tableView.register(ExpenseCell.self, forCellReuseIdentifier: ExpenseCell.identifier)
        tableView.register(HeaderCell.self, forHeaderFooterViewReuseIdentifier: HeaderCell.identifier)
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
        
        let filteredTotal = filteredExpenses.reduce(Decimal(0)) { $0 + $1.amount }
        totalLabel.text = formatter.string(from: NSDecimalNumber(decimal: filteredTotal))
        
        categoryStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        let categoryTotals = Dictionary(grouping: filteredExpenses, by: { $0.category })
            .mapValues { expenses in expenses.reduce(Decimal(0)) { $0 + $1.amount } }
        
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
        if let data = UserDefaults.standard.data(forKey: "ExpenseColumnSettings"),
           let savedColumns = try? JSONDecoder().decode([Column].self, from: data) {
            // Update only visibility settings to preserve column order and other properties
            for savedColumn in savedColumns {
                if let index = columns.firstIndex(where: { $0.id == savedColumn.id }) {
                    columns[index].isVisible = savedColumn.isVisible
                }
            }
        }
    }
    
    private func saveColumnSettings() {
        if let data = try? JSONEncoder().encode(columns) {
            UserDefaults.standard.set(data, forKey: "ExpenseColumnSettings")
        }
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
            
            self.tableView.reloadData()
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        present(alert, animated: true)
    }
    
    private func exportToCSV() {
        var csvString = "Date,Title,Amount,Category,Payer,Payment Method,Currency,Notes\n"
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .short
        
        for expense in expenseGroup.expenses {
            let row = [
                dateFormatter.string(from: expense.date),
                expense.title,
                String(describing: expense.amount),
                expense.category.rawValue,
                expense.payer.name,
                expense.paymentMethod.rawValue,
                expense.currency.rawValue,
                expense.notes ?? ""
            ].map { "\"\($0)\"" }.joined(separator: ",")
            
            csvString.append(row + "\n")
        }
        
        guard let data = csvString.data(using: .utf8) else { return }
        
        let activityVC = UIActivityViewController(
            activityItems: [data],
            applicationActivities: nil
        )
        
        if let popoverController = activityVC.popoverPresentationController {
            popoverController.barButtonItem = navigationItem.rightBarButtonItems?.last
        }
        
        present(activityVC, animated: true)
    }
    
    // MARK: - Filtering
    private func toggleFilter(_ filter: ExpenseFilter) {
        if activeFilters.contains(filter) {
            activeFilters.remove(filter)
        } else {
            // Remove other filters of the same type
            activeFilters = activeFilters.filter { !$0.isSameType(as: filter) }
            activeFilters.insert(filter)
        }
        applyFilters()
    }
    
    private func clearFilters() {
        activeFilters.removeAll()
        applyFilters()
    }
    
    private func applyFilters() {
        if activeFilters.isEmpty {
            filteredExpenses = expenseGroup.expenses
        } else {
            filteredExpenses = expenseGroup.expenses.filter { expense in
                activeFilters.allSatisfy { filter in
                    switch filter {
                    case .category(let category): return expense.category == category
                    case .payer(let payer): return expense.payer == payer
                    case .paymentMethod(let method): return expense.paymentMethod == method
                    }
                }
            }
        }
        updateSummaryView()
        tableView.reloadData()
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
        
        let categoryPicker = UIPickerView()
        categoryPicker.delegate = self
        categoryPicker.dataSource = self
        categoryPicker.tag = 0
        
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
        payerPicker.delegate = self
        payerPicker.dataSource = self
        payerPicker.tag = 1
        
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
        paymentPicker.delegate = self
        paymentPicker.dataSource = self
        paymentPicker.tag = 2
        
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
        tripPicker.delegate = self
        tripPicker.dataSource = self
        tripPicker.tag = 3
        
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
                  let title = alert.textFields?[0].text,
                  let amountText = alert.textFields?[1].text,
                  let amount = Decimal(string: amountText),
                  let categoryText = alert.textFields?[2].text,
                  let category = Expense.Category.allCases.first(where: { $0.rawValue == categoryText }),
                  let payerText = alert.textFields?[3].text,
                  let payer = UserDefaults.standard.payers.first(where: { $0.name == payerText }),
                  let paymentText = alert.textFields?[4].text,
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
        
        let categoryPicker = UIPickerView()
        categoryPicker.delegate = self
        categoryPicker.dataSource = self
        categoryPicker.tag = 0
        
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
        payerPicker.delegate = self
        payerPicker.dataSource = self
        payerPicker.tag = 1
        
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
        paymentPicker.delegate = self
        paymentPicker.dataSource = self
        paymentPicker.tag = 2
        
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
        tripPicker.delegate = self
        tripPicker.dataSource = self
        tripPicker.tag = 3
        
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
                  let title = alert.textFields?[0].text,
                  let amountText = alert.textFields?[1].text,
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
            
            self.expenseGroup.expenses[index] = updatedExpense
            self.applyFilters()
            self.updateSummaryView()
            self.tableView.reloadData()
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
            
            // Remove selected expenses
            self.expenseGroup.expenses.removeAll { self.selectedExpenses.contains($0.id) }
            
            // Update UI
            self.applyFilters()
            self.updateSummaryView()
            self.tableView.reloadData()
            
            // Save changes
            self.saveExpenseGroup()
            
            // Exit selection mode
            self.toggleSelection()
        })
        
        present(alert, animated: true)
    }
    
    @objc private func editSelectedExpenses() {
        guard selectedExpenses.count > 0 else { return }
        
        let alert = UIAlertController(title: "Edit Expenses", message: nil, preferredStyle: .alert)
        
        // Only show fields that make sense to bulk edit
        let categoryPicker = UIPickerView()
        categoryPicker.delegate = self
        categoryPicker.dataSource = self
        categoryPicker.tag = 0
        
        alert.addTextField { textField in
            textField.placeholder = "Category (optional)"
            textField.inputView = categoryPicker
        }
        
        let payerPicker = UIPickerView()
        payerPicker.delegate = self
        payerPicker.dataSource = self
        payerPicker.tag = 1
        
        alert.addTextField { textField in
            textField.placeholder = "Payer (optional)"
            textField.inputView = payerPicker
        }
        
        let paymentPicker = UIPickerView()
        paymentPicker.delegate = self
        paymentPicker.dataSource = self
        paymentPicker.tag = 2
        
        alert.addTextField { textField in
            textField.placeholder = "Payment Method (optional)"
            textField.inputView = paymentPicker
        }
        
        // Add trip selection
        let tripPicker = UIPickerView()
        tripPicker.delegate = self
        tripPicker.dataSource = self
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
            
            // Update all selected expenses
            for id in selectedExpenses {
                if let index = self.expenseGroup.expenses.firstIndex(where: { $0.id == id }) {
                    // Only update fields that were filled in
                    if let categoryText = categoryText,
                       !categoryText.isEmpty,
                       let category = Expense.Category.allCases.first(where: { $0.rawValue == categoryText }) {
                        self.expenseGroup.expenses[index].category = category
                    }
                    
                    if let payerText = payerText,
                       !payerText.isEmpty,
                       let payer = DraftsService.shared.fetchPayers().first(where: { $0.name == payerText }) {
                        self.expenseGroup.expenses[index].payer = payer
                    }
                    
                    if let paymentText = paymentText,
                       !paymentText.isEmpty,
                       let paymentMethod = Expense.PaymentMethod.allCases.first(where: { $0.rawValue == paymentText }) {
                        self.expenseGroup.expenses[index].paymentMethod = paymentMethod
                    }
                    
                    if let tripText = tripText, !tripText.isEmpty {
                        let drafts = DraftsService.shared.fetchDrafts()
                        if let trip = drafts.first(where: { $0.destination.city == tripText }) {
                            self.expenseGroup.expenses[index].tripId = trip.id
                            self.expenseGroup.expenses[index].tripName = trip.destination.city
                        }
                    }
                }
            }
            
            // Update UI
            self.applyFilters()
            self.updateSummaryView()
            self.tableView.reloadData()
            
            // Save changes
            self.saveExpenseGroup()
            
            // Exit selection mode
            self.toggleSelection()
        })
        
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource & Delegate
extension ExpensesViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredExpenses.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ExpenseCell.identifier, for: indexPath) as! ExpenseCell
        let expense = filteredExpenses[indexPath.row]
        cell.configure(with: expense, columns: columns.filter { $0.isVisible }.map { $0.actualKeyPath })
        return cell
    }
    
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
        let expense = filteredExpenses[indexPath.row]
        
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
            let expense = filteredExpenses[indexPath.row]
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

// MARK: - Custom Views
class ExpenseCell: UITableViewCell {
    static let identifier = "ExpenseCell"
    
    private var stackView: UIStackView!
    private var labels: [UILabel] = []
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.spacing = 1
        stackView.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.addSubview(stackView)
        
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: contentView.topAnchor),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])
    }
    
    func configure(with expense: Expense, columns: [KeyPath<Expense, String>]) {
        // Remove existing labels
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        // Create new labels for each column
        for column in columns {
            let label = UILabel()
            label.font = .systemFont(ofSize: 14)
            label.textAlignment = .left
            label.text = expense[keyPath: column]
            label.adjustsFontSizeToFitWidth = true
            label.minimumScaleFactor = 0.8
            
            let container = UIView()
            container.addSubview(label)
            label.translatesAutoresizingMaskIntoConstraints = false
            
            NSLayoutConstraint.activate([
                label.topAnchor.constraint(equalTo: container.topAnchor, constant: 4),
                label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
                label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -8),
                label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -4)
            ])
            
            stackView.addArrangedSubview(container)
        }
    }
}

class HeaderCell: UITableViewHeaderFooterView {
    static let identifier = "HeaderCell"
    
    private var stackView: UIStackView!
    
    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.spacing = 1
        stackView.translatesAutoresizingMaskIntoConstraints = false
        
        contentView.backgroundColor = .systemGray6
        
        contentView.addSubview(stackView)
        
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: contentView.topAnchor),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])
    }
    
    func configure(with titles: [String]) {
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        for title in titles {
            let label = UILabel()
            label.font = .systemFont(ofSize: 14, weight: .medium)
            label.textAlignment = .left
            label.text = title
            
            let container = UIView()
            container.addSubview(label)
            label.translatesAutoresizingMaskIntoConstraints = false
            
            NSLayoutConstraint.activate([
                label.topAnchor.constraint(equalTo: container.topAnchor, constant: 4),
                label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
                label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -8),
                label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -4)
            ])
            
            stackView.addArrangedSubview(container)
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

// MARK: - Category Summary View
class CategorySummaryView: UIView {
    private let iconView: UIImageView = {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFit
        iv.tintColor = .white
        iv.translatesAutoresizingMaskIntoConstraints = false
        return iv
    }()
    
    private let amountLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 10, weight: .medium)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    init(category: Expense.Category, amount: Decimal, currency: Expense.Currency) {
        super.init(frame: .zero)
        
        addSubview(iconView)
        addSubview(amountLabel)
        
        NSLayoutConstraint.activate([
            iconView.topAnchor.constraint(equalTo: topAnchor),
            iconView.centerXAnchor.constraint(equalTo: centerXAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 20),
            iconView.heightAnchor.constraint(equalToConstant: 20),
            
            amountLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 2),
            amountLabel.leadingAnchor.constraint(equalTo: leadingAnchor),
            amountLabel.trailingAnchor.constraint(equalTo: trailingAnchor),
            amountLabel.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        
        iconView.image = UIImage(systemName: category.icon)
        iconView.backgroundColor = category.color
        iconView.layer.cornerRadius = 10
        iconView.clipsToBounds = true
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = currency.symbol
        amountLabel.text = formatter.string(from: NSDecimalNumber(decimal: amount))
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

// MARK: - Column Configuration View Controller
class ColumnConfigurationViewController: UITableViewController {
    private var columns: [ExpensesViewController.Column]
    private let onUpdate: ([ExpensesViewController.Column]) -> Void
    
    init(columns: [ExpensesViewController.Column], onUpdate: @escaping ([ExpensesViewController.Column]) -> Void) {
        self.columns = columns
        self.onUpdate = onUpdate
        super.init(style: .grouped)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "Configure Columns"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        
        navigationItem.rightBarButtonItems = [
            UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(done)),
            UIBarButtonItem(title: "Reorder", style: .plain, target: self, action: #selector(toggleReordering))
        ]
    }
    
    @objc private func done() {
        onUpdate(columns)
        dismiss(animated: true)
    }
    
    @objc private func toggleReordering() {
        tableView.isEditing.toggle()
        navigationItem.rightBarButtonItems?[1].title = tableView.isEditing ? "Done" : "Reorder"
    }
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return columns.count
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
        return true
    }
    
    override func tableView(_ tableView: UITableView, moveRowAt sourceIndexPath: IndexPath, to destinationIndexPath: IndexPath) {
        let column = columns.remove(at: sourceIndexPath.row)
        columns.insert(column, at: destinationIndexPath.row)
    }
}

// MARK: - Trip Selection View Controller
class TripExpensesViewController: UITableViewController {
    private var drafts: [Itinerary] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "Select Trip"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            title: "Back",
            style: .plain,
            target: self,
            action: #selector(backTapped)
        )
        
        loadDrafts()
    }
    
    private func loadDrafts() {
        drafts = DraftsService.shared.fetchDrafts()
        tableView.reloadData()
    }
    
    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return drafts.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        let draft = drafts[indexPath.row]
        cell.textLabel?.text = draft.destination.city
        cell.accessoryType = .disclosureIndicator
        return cell
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let draft = drafts[indexPath.row]
        let expensesVC = ExpensesViewController(tripId: draft.id, tripTitle: draft.destination.city)
        navigationController?.pushViewController(expensesVC, animated: true)
    }
}

// Update ExpensesViewController initialization
extension ExpensesViewController {
    convenience init(tripId: String, tripTitle: String) {
        self.init()
        self.tripId = tripId
        self.title = tripTitle
        
        // Load expenses for this trip
        self.expenseGroup = ExpensesService.shared.fetchExpenseGroup(forTrip: tripId) ?? ExpenseGroup(
            title: tripTitle,
            startDate: Date(),
            endDate: Date(),
            expenses: [],
            currency: .usd
        )
        
        // Add back button
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            title: "Back",
            style: .plain,
            target: self,
            action: #selector(backTapped)
        )
    }
    
    @objc private func backTapped() {
        // Save current state before going back
        ExpensesService.shared.updateExpenseGroup(expenseGroup, forTrip: tripId)
        navigationController?.popViewController(animated: true)
    }
}

// MARK: - Payer Management View Controller
class PayerManagementViewController: UITableViewController {
    private var payers: [Expense.Payer] {
        get { UserDefaults.standard.payers }
        set { UserDefaults.standard.payers = newValue }
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "Manage Payers"
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        
        navigationItem.rightBarButtonItems = [
            UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(addPayer)),
            UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(done))
        ]
    }
    
    @objc private func done() {
        dismiss(animated: true)
    }
    
    @objc private func addPayer() {
        let alert = UIAlertController(title: "New Payer", message: nil, preferredStyle: .alert)
        
        alert.addTextField { textField in
            textField.placeholder = "Name"
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Add", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?.first?.text,
                  !name.isEmpty else { return }
            
            let payer = Expense.Payer(name: name)
            self.payers.append(payer)
            self.tableView.reloadData()
        })
        
        present(alert, animated: true)
    }
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return payers.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        let payer = payers[indexPath.row]
        
        cell.textLabel?.text = payer.name
        cell.imageView?.image = UIImage(systemName: payer.icon)
        
        return cell
    }
    
    override func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        return true
    }
    
    override func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            payers.remove(at: indexPath.row)
            tableView.deleteRows(at: [indexPath], with: .fade)
        }
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let payer = payers[indexPath.row]
        let alert = UIAlertController(title: "Edit Payer", message: nil, preferredStyle: .alert)
        
        alert.addTextField { textField in
            textField.text = payer.name
            textField.placeholder = "Name"
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let self = self,
                  let name = alert.textFields?.first?.text,
                  !name.isEmpty else { return }
            
            let updatedPayer = Expense.Payer(id: payer.id, name: name, icon: payer.icon)
            self.payers[indexPath.row] = updatedPayer
            self.tableView.reloadRows(at: [indexPath], with: .automatic)
        })
        
        present(alert, animated: true)
    }
}

// Remove the UserDefaults extension for expense management
extension UserDefaults {
    private static let columnSettingsKey = "expenseColumnSettings"
    
    func saveColumnSettings(_ columns: [ExpensesViewController.Column]) {
        set(try? JSONEncoder().encode(columns), forKey: Self.columnSettingsKey)
    }
    
    func loadColumnSettings() -> [ExpensesViewController.Column]? {
        guard let data = data(forKey: Self.columnSettingsKey) else { return nil }
        return try? JSONDecoder().decode([ExpensesViewController.Column].self, from: data)
    }
} 
