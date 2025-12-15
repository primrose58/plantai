import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

import {
    Home,
    Users,
    MessageCircle,
    User,
    LogOut,
    LogIn,
    Sprout,
    Info,
    Sun,
    Moon,
    Clock // Import Clock
} from 'lucide-react';

import { useState, useEffect } from 'react';

export default function Layout() {
    const { currentUser, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const toggleLang = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en');
    };

    // Dark Mode Logic
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const navItems = [
        { path: '/', icon: Home, label: t('app_name'), public: true },
        { path: '/community', icon: Users, label: t('community'), public: true },
        { path: '/analyses', icon: Clock, label: t('analyses'), public: false }, // New Tab
        { path: '/messages', icon: MessageCircle, label: t('messages'), public: false },
        { path: '/profile', icon: User, label: t('profile'), public: false },
        { path: '/about', icon: Info, label: t('about'), public: true },
    ];

    const visibleNavItems = navItems.filter(item => item.public || currentUser);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300">
                <div className="p-6 flex items-center gap-2">
                    <Sprout className="w-8 h-8 text-green-600" />
                    <h1 className="text-2xl font-bold tracking-tight text-green-700 dark:text-green-500">PlantAI</h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {/* Language Switcher */}
                    <button
                        onClick={toggleLang}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                    >
                        <span className="font-bold border border-gray-300 dark:border-gray-600 rounded px-1 text-xs">
                            {i18n.language.toUpperCase()}
                        </span>
                        <span>{t('language') || 'Language'}</span>
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        <span>{theme === 'dark' ? t('light_mode') : t('dark_mode')}</span>
                    </button>

                    {/* User Info / Auth */}
                    {currentUser ? (
                        <div className="flex flex-col gap-2">
                            <div className="px-2 py-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">{t('welcome_user')}</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {currentUser.displayName || currentUser.email}
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    await logout();
                                    navigate('/login');
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>{t('logout')}</span>
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="flex items-center gap-3 w-full px-4 py-3 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors font-semibold"
                        >
                            <LogIn className="w-5 h-5" />
                            <span>{t('login')}</span>
                        </Link>
                    )}
                </div>
            </aside >

            {/* Main Content */}
            < main className="flex-1 flex flex-col overflow-hidden relative" >
                {/* Mobile Header for Lang Switch & Logo */}
                < header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10" >
                    <div className="flex items-center gap-2">
                        <Sprout className="w-6 h-6 text-green-600" />
                        <span className="font-bold text-lg text-green-700 dark:text-green-500">PlantAI</span>
                    </div>
                    <button onClick={toggleLang} className="text-sm font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                        {i18n.language.toUpperCase()}
                    </button>
                </header >

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 scroll-smooth">
                    <div className="w-full h-full flex flex-col">
                        <Outlet />
                    </div>
                </div>

                {/* Bottom Nav (Mobile) */}
                <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around p-2 z-50 safe-area-bottom">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                                <span className="text-xs mt-1 font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    {/* Mobile Login/Logout if needed in nav, or rely on Profile page? 
                         If guest, Profile is hidden. So need login button here or in header. 
                         Let's keep it simple: Guests see limited tabs. Login is available via 'Community' actions or we can add a specific FAB. 
                         Actually, let's add Profile back for guests but make it a "Login" page? 
                         No, user specifically asked to hide things. 
                         I'll leave it as is. Access to login is via Sidebar (Desktop) or clicking 'Community' actions (future) or the new 'Blurred Result' overlay.
                         Wait, if I hide Profile, how do they Login on Mobile?
                         Added Header with Login link? No, space is tight.
                         Let's add a 'Settings' or 'Menu' tab for mobile? 
                         Or just keep Profile visible but different content? 
                         User said "giriş yapmadığım halde mesajlar kısmı falan görünmeyecekti". Implicitly, Profile might be okay if it serves as Login entry.
                         But let's stick to the request: Hide Messages. Profile I will hide too as per my code above.
                         I will add a mobile Login button to the Header.
                      */}
                    {!currentUser && (
                        <Link to="/login" className="flex flex-col items-center justify-center p-2 text-gray-500">
                            <LogIn className="w-6 h-6" />
                            <span className="text-xs mt-1 font-medium">{t('login')}</span>
                        </Link>
                    )}
                </nav>
            </main >
        </div >
    );
}
