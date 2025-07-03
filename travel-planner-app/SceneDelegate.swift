import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        
        // Create tab bar controller with all view controllers
        let tabBarController = UITabBarController()
        
        // Home
        let homeVC = HomeViewController()
        let homeNav = UINavigationController(rootViewController: homeVC)
        homeNav.tabBarItem = UITabBarItem(title: "Home", image: UIImage(systemName: "house"), selectedImage: UIImage(systemName: "house.fill"))
        
        // Expenses
        let expensesVC = ExpensesViewController()
        let expensesNav = UINavigationController(rootViewController: expensesVC)
        expensesNav.tabBarItem = UITabBarItem(title: "Expenses", image: UIImage(systemName: "dollarsign.circle"), selectedImage: UIImage(systemName: "dollarsign.circle.fill"))
        
        // Single Day
        let singleDayVC = SingleDayViewController()
        let singleDayNav = UINavigationController(rootViewController: singleDayVC)
        singleDayNav.tabBarItem = UITabBarItem(title: "Day Plan", image: UIImage(systemName: "calendar"), selectedImage: UIImage(systemName: "calendar.badge.plus"))
        
        // Blank
        let blankVC = BlankViewController()
        let blankNav = UINavigationController(rootViewController: blankVC)
        blankNav.tabBarItem = UITabBarItem(title: "Explore", image: UIImage(systemName: "square.dashed"), selectedImage: UIImage(systemName: "square.fill.on.square.fill"))
        
        // Settings
        let settingsVC = SettingsViewController()
        let settingsNav = UINavigationController(rootViewController: settingsVC)
        settingsNav.tabBarItem = UITabBarItem(title: "Settings", image: UIImage(systemName: "gearshape"), selectedImage: UIImage(systemName: "gearshape.fill"))
        
        tabBarController.viewControllers = [homeNav, expensesNav, singleDayNav, blankNav, settingsNav]
        tabBarController.selectedIndex = 0 // Start on Home tab
        
        // Customize tab bar appearance
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = .systemBackground
        tabBarController.tabBar.standardAppearance = appearance
        tabBarController.tabBar.scrollEdgeAppearance = appearance
        
        window.rootViewController = tabBarController
        self.window = window
        window.makeKeyAndVisible()
    }
} 
