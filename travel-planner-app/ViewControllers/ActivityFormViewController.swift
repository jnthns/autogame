import UIKit

class ActivityFormViewController: UIViewController {
    
    // MARK: - Properties
    var activity: Activity?
    var section: Activity.Section
    var onSave: ((Activity) -> Void)?
    
    // MARK: - UI Elements
    private let scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.translatesAutoresizingMaskIntoConstraints = false
        return sv
    }()
    
    private let contentView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let titleTextField: UITextField = {
        let tf = UITextField()
        tf.placeholder = "Activity title"
        tf.borderStyle = .roundedRect
        tf.font = UIFont.systemFont(ofSize: 16)
        tf.translatesAutoresizingMaskIntoConstraints = false
        return tf
    }()
    
    private let notesTextView: UITextView = {
        let tv = UITextView()
        tv.font = UIFont.systemFont(ofSize: 16)
        tv.layer.borderColor = UIColor.systemGray4.cgColor
        tv.layer.borderWidth = 1
        tv.layer.cornerRadius = 8
        tv.translatesAutoresizingMaskIntoConstraints = false
        return tv
    }()
    
    private let notesPlaceholderLabel: UILabel = {
        let label = UILabel()
        label.text = "Add notes (optional)"
        label.textColor = .placeholderText
        label.font = UIFont.systemFont(ofSize: 16)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let colorSelectionView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private var colorButtons: [UIButton] = []
    private var selectedColorHex: String?
    
    // Color options
    private let colorOptions: [(String, UIColor)] = [
        ("Priority", UIColor.systemRed),
        ("Normal", UIColor.systemGreen),
        ("Skippable", UIColor.systemYellow)
    ]
    
    // Duration Toggle and Picker
    private let durationToggleStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private let durationToggleLabel: UILabel = {
        let label = UILabel()
        label.text = "Set time duration"
        label.font = .systemFont(ofSize: 16)
        return label
    }()
    
    private let durationToggle: UISwitch = {
        let toggle = UISwitch()
        toggle.translatesAutoresizingMaskIntoConstraints = false
        return toggle
    }()
    
    // Duration Picker
    private let durationOptions: [Int] = Array(stride(from: 30, through: 480, by: 30))
    private let durationPicker: UIPickerView = {
        let pv = UIPickerView()
        pv.translatesAutoresizingMaskIntoConstraints = false
        return pv
    }()
    private var selectedDuration: Int?
    
    private let saveButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Done", for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = .systemBlue
        button.layer.cornerRadius = 8
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    // Flag to avoid double-saving when the explicit Save button is used
    private var hasSaved = false
    
    // MARK: - Initializer
    init(activity: Activity? = nil, section: Activity.Section) {
        self.activity = activity
        self.section = section
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupNavigationBar()
        setupColorSelection()
        setupDurationToggle()
        populateFields()
    }
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        contentView.addSubview(titleTextField)
        contentView.addSubview(notesTextView)
        contentView.addSubview(notesPlaceholderLabel)
        contentView.addSubview(colorSelectionView)
        contentView.addSubview(durationToggleStack)
        contentView.addSubview(durationPicker)
        contentView.addSubview(saveButton)
        
        notesTextView.delegate = self
        
        // Setup duration toggle stack
        durationToggleStack.addArrangedSubview(durationToggleLabel)
        durationToggleStack.addArrangedSubview(durationToggle)
        
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
            
            titleTextField.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 20),
            titleTextField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            titleTextField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            titleTextField.heightAnchor.constraint(equalToConstant: 44),
            
            notesTextView.topAnchor.constraint(equalTo: titleTextField.bottomAnchor, constant: 20),
            notesTextView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            notesTextView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            notesTextView.heightAnchor.constraint(equalToConstant: 120),
            
            notesPlaceholderLabel.topAnchor.constraint(equalTo: notesTextView.topAnchor, constant: 8),
            notesPlaceholderLabel.leadingAnchor.constraint(equalTo: notesTextView.leadingAnchor, constant: 5),
            
            colorSelectionView.topAnchor.constraint(equalTo: notesTextView.bottomAnchor, constant: 30),
            colorSelectionView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            colorSelectionView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            colorSelectionView.heightAnchor.constraint(equalToConstant: 80),
            
            durationToggleStack.topAnchor.constraint(equalTo: colorSelectionView.bottomAnchor, constant: 24),
            durationToggleStack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            durationToggleStack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            
            durationPicker.topAnchor.constraint(equalTo: durationToggleStack.bottomAnchor, constant: 16),
            durationPicker.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            durationPicker.heightAnchor.constraint(equalToConstant: 120),
            
            saveButton.topAnchor.constraint(equalTo: durationPicker.bottomAnchor, constant: 24),
            saveButton.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            saveButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            saveButton.heightAnchor.constraint(equalToConstant: 50),
            saveButton.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -20)
        ])
        
        durationPicker.dataSource = self
        durationPicker.delegate = self
        
        // Save button action
        saveButton.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        
        // Duration toggle action
        durationToggle.addTarget(self, action: #selector(durationToggleChanged), for: .valueChanged)
        
        // Initially hide duration picker
        durationPicker.isHidden = true
    }
    
    private func setupNavigationBar() {
        if activity != nil {
            title = "Edit Activity"
        } else {
            title = "New \(section.rawValue) Activity"
        }
        
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancelTapped))
    }
    
    private func setupDurationToggle() {
        // Set initial state
        durationToggle.isOn = activity?.durationMinutes != nil
        durationPicker.isHidden = !durationToggle.isOn
    }
    
    @objc private func durationToggleChanged() {
        UIView.animate(withDuration: 0.3) {
            self.durationPicker.isHidden = !self.durationToggle.isOn
        }
        if !durationToggle.isOn {
            selectedDuration = nil
        } else {
            selectedDuration = durationOptions[durationPicker.selectedRow(inComponent: 0)]
        }
    }
    
    private func setupColorSelection() {
        let titleLabel = UILabel()
        titleLabel.text = "Priority Level"
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        colorSelectionView.addSubview(titleLabel)
        
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.spacing = 12
        stackView.translatesAutoresizingMaskIntoConstraints = false
        colorSelectionView.addSubview(stackView)
        
        for (index, (name, color)) in colorOptions.enumerated() {
            let button = UIButton(type: .system)
            button.setTitle(name, for: .normal)
            button.setTitleColor(.white, for: .normal)
            button.backgroundColor = color
            button.layer.cornerRadius = 8
            button.titleLabel?.font = UIFont.systemFont(ofSize: 14, weight: .medium)
            button.tag = index
            button.addTarget(self, action: #selector(colorButtonTapped(_:)), for: .touchUpInside)
            
            colorButtons.append(button)
            stackView.addArrangedSubview(button)
        }
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: colorSelectionView.topAnchor),
            titleLabel.leadingAnchor.constraint(equalTo: colorSelectionView.leadingAnchor),
            
            stackView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            stackView.leadingAnchor.constraint(equalTo: colorSelectionView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: colorSelectionView.trailingAnchor),
            stackView.heightAnchor.constraint(equalToConstant: 44)
        ])
        
        // Select default color (Normal - green)
        selectColorButton(at: 1) // Index 1 is "Normal"
    }
    
    private func populateFields() {
        guard let activity = activity else {
            // For new activities, select Normal by default
            selectColorButton(at: 1)
            return
        }
        
        titleTextField.text = activity.title
        notesTextView.text = activity.notes
        updateNotesPlaceholder()
        
        // Select the appropriate color
        if let colorHex = activity.colorHex {
            selectedColorHex = colorHex
            let color = UIColor(named: colorHex) ?? colorOptions[1].1 // Default to Normal if color not found
            if let index = colorOptions.firstIndex(where: { $0.1.isEqual(color) }) {
                selectColorButton(at: index)
            } else {
                // Fallback to Normal if no match found
                selectColorButton(at: 1)
            }
        } else {
            // No color specified, use Normal
            selectColorButton(at: 1)
        }
        
        // Set duration toggle and picker
        durationToggle.isOn = activity.durationMinutes != nil
        durationPicker.isHidden = !durationToggle.isOn
        if let dur = activity.durationMinutes, let idx = durationOptions.firstIndex(of: dur) {
            durationPicker.selectRow(idx, inComponent: 0, animated: false)
            selectedDuration = dur
        }
    }
    
    @objc private func colorButtonTapped(_ sender: UIButton) {
        let index = sender.tag
        guard index >= 0 && index < colorButtons.count else {
            print("Invalid button tag: \(index)")
            return
        }
        selectColorButton(at: index)
    }
    
    private func selectColorButton(at index: Int) {
        // Bounds checking to prevent crash
        guard index >= 0 && index < colorButtons.count && index < colorOptions.count else {
            print("Invalid color button index: \(index)")
            return
        }
        
        // Reset all buttons
        colorButtons.forEach { button in
            button.layer.borderWidth = 0
            button.transform = .identity
        }
        
        // Highlight selected button
        let selectedButton = colorButtons[index]
        selectedButton.layer.borderWidth = 3
        selectedButton.layer.borderColor = UIColor.label.cgColor
        selectedButton.transform = CGAffineTransform(scaleX: 1.05, y: 1.05)
        
        // Store selected color
        selectedColorHex = colorOptions[index].1.toHexString()
    }
    
    @objc private func cancelTapped() {
        dismiss(animated: true)
    }
    
    private func buildActivity() -> Activity? {
        guard let title = titleTextField.text, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        
        let notes = notesTextView.text.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalNotes = notes.isEmpty ? nil : notes
        
        return Activity(
            id: activity?.id ?? UUID().uuidString,
            section: section,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            notes: finalNotes,
            durationMinutes: selectedDuration,
            colorHex: selectedColorHex
        )
    }
    
    // Auto-save when view is disappearing
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        guard !hasSaved && (self.isBeingDismissed || self.isMovingFromParent) else { return }
        if let newActivity = buildActivity() {
            onSave?(newActivity)
        }
    }
    
    @objc private func saveButtonTapped() {
        guard let newActivity = buildActivity() else {
            let alert = UIAlertController(title: "Missing Title", message: "Please enter an activity title before saving.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }
        onSave?(newActivity)
        hasSaved = true
        dismiss(animated: true)
    }
    
    private func updateNotesPlaceholder() {
        notesPlaceholderLabel.isHidden = !notesTextView.text.isEmpty
    }
}

// MARK: - UITextViewDelegate
extension ActivityFormViewController: UITextViewDelegate {
    func textViewDidChange(_ textView: UITextView) {
        updateNotesPlaceholder()
    }
}

// MARK: - UIPickerViewDataSource/Delegate
extension ActivityFormViewController: UIPickerViewDataSource, UIPickerViewDelegate {
    func numberOfComponents(in pickerView: UIPickerView) -> Int { 1 }
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        durationOptions.count
    }
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        "\(durationOptions[row]) min"
    }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        selectedDuration = durationOptions[row]
    }
} 

// MARK: - UIColor Extension
extension UIColor {
    func toHexString() -> String {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
    }
    
    func isEqual(_ color: UIColor) -> Bool {
        return self.toHexString() == color.toHexString()
    }
} 
