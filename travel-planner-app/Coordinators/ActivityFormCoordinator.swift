import UIKit

final class ActivityFormCoordinator {
    private weak var presentingViewController: UIViewController?
    private let viewModel: ItineraryViewModel
    
    init(presentingViewController: UIViewController, viewModel: ItineraryViewModel) {
        self.presentingViewController = presentingViewController
        self.viewModel = viewModel
    }
    
    func presentActivityForm(for activity: Activity?, in section: Activity.Section, on date: Date) {
        let form = ActivityFormViewController(activity: activity, section: section)
        form.onSave = { [weak self] savedActivity in
            guard let self = self else { return }
            if activity != nil {
                // Update existing activity
                self.viewModel.updateActivity(savedActivity, at: date)
            } else {
                // Add new activity
                self.viewModel.addActivity(savedActivity, to: date)
            }
        }
        
        let nav = UINavigationController(rootViewController: form)
        presentingViewController?.present(nav, animated: true)
    }
    
    func presentDailyItinerary(for day: ItineraryDay, section: Activity.Section) {
        guard let itinerary = viewModel.itinerary else { return }
        let vc = DailyItineraryViewController(day: day, section: section, parentItinerary: itinerary)
        presentingViewController?.navigationController?.pushViewController(vc, animated: true)
    }
} 