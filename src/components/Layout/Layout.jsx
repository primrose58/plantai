import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // Import Toast
import { db } from '../../services/firebase'; // Import DB
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore

import {
    Home,
    Globe, // Changed from Users
    MessageCircle,
    User,
    LogOut,
    LogIn,
    Sprout,
    Info,
    Sun,
    Moon,
    Clock,
    Menu,
    X,
    Bell
} from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';
import NotificationsModal from '../Common/NotificationsModal';

import { useState, useEffect } from 'react';

export default function Layout() {
    const { currentUser, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Notifications State
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const toggleLang = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en');
    };

    // Theme Logic: Light | Dark | OLED
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        // Default to dark if prefers dark, else light
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        // Reset classes
        document.documentElement.classList.remove('dark', 'oled');

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'oled') {
            document.documentElement.classList.add('dark', 'oled');
        }
        // 'light' has no class

        localStorage.setItem('theme', theme);
    }, [theme]);

    // Shorter Notification Sound (Pop)
    const [sound] = useState(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'));

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
    };

    const cycleTheme = () => {
        if (theme === 'light') handleThemeChange('dark');
        else if (theme === 'dark') handleThemeChange('oled');
        else handleThemeChange('light');
    };

    // User Presence Heartbeat
    useEffect(() => {
        if (!currentUser) return;

        const updatePresence = async () => {
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    lastSeen: serverTimestamp()
                });
            } catch (err) {
                console.error("Presence update failed", err);
            }
        };

        // Update immediately on mount
        updatePresence();

        // Update every 60 seconds
        const interval = setInterval(updatePresence, 60 * 1000);

        return () => clearInterval(interval);
    }, [currentUser]);

    // Global Notification Listener
    useEffect(() => {
        if (!currentUser) return;

        // Listen to all chats for new messages
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const data = change.doc.data();
                    const updatedAt = data.updatedAt?.seconds * 1000;
                    if (Date.now() - updatedAt > 5000) return; // Ignore old updates (initial load)

                    // Get other user
                    const otherUid = data.participants.find(id => id !== currentUser.uid);
                    // Determine if currently viewing this chat
                    const isViewing = location.pathname === `/messages/${change.doc.id}`;

                    if (!isViewing && otherUid) {
                        const otherUser = data.participantData?.[otherUid] || { name: 'Someone' };

                        // PLAY SOUND
                        sound.play().catch(e => console.log("Audio play failed", e));

                        // SHOW TOAST
                        addToast(`New message from ${otherUser.name}: ${data.lastMessage?.substring(0, 30)}...`, 'info', 5000);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [currentUser, location.pathname, addToast, sound]);

    // Listen for unread notifications (requests)
    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'users', currentUser.uid, 'followRequests'));
        const unsub = onSnapshot(q, (snap) => {
            setUnreadCount(snap.size);
        });
        return () => unsub();
    }, [currentUser]);

    const navItems = [
        { name: 'home', path: '/', icon: Home, label: t('app_name'), public: true },
        { name: 'community', path: '/community', icon: Globe, label: t('community'), public: true },
        { name: 'my_analyses', path: '/analyses', icon: Clock, label: t('analyses'), public: false },
        { name: 'messages', path: '/messages', icon: MessageCircle, label: t('messages'), public: false },
        {
            name: 'notifications',
            action: () => setShowNotifications(true),
            icon: Bell,
            badge: unreadCount > 0 ? unreadCount : null,
            label: t('notifications'),
            public: false
        },
        { name: 'profile', path: '/profile', icon: User, label: t('profile'), public: false },
        { name: 'about', path: '/about', icon: Info, label: t('about'), public: true },
    ];

    const visibleNavItems = navItems.filter(item => item.public || currentUser);

    return (
        <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
            {/* Sidebar (Desktop) */}
            <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>

                {/* Header: Menu Toggle + Logo */}
                <div className={`p-4 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} h-20`}>
                    {isSidebarOpen && (
                        <Link to="/" onClick={() => window.scrollTo(0, 0)} state={{ refreshId: new Date().getTime() }} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <Sprout className="w-8 h-8 text-green-600" />
                            <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap">
                                <span className="text-green-700 dark:text-green-500">Plant</span>
                                <span className="text-blue-500 dark:text-blue-400">AI</span>
                            </h1>
                        </Link>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Toggle Menu"
                    >
                        <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    {!isSidebarOpen && (
                        <div className="hidden"></div> /* Spacer if needed */
                    )}
                </div>

                <nav className="flex-1 px-3 space-y-2 mt-2">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        // Content for Link/Button
                        const Content = (
                            <>
                                <Icon className={`w-6 h-6 ${isSidebarOpen ? '' : 'mx-auto'}`} />
                                {isSidebarOpen && <span className="truncate">{item.label}</span>}
                                {item.badge && (
                                    isSidebarOpen ? (
                                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {item.badge}
                                        </span>
                                    ) : (
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                                    )
                                )}
                            </>
                        );

                        const commonClasses = `w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all relative group ${isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                            }`;

                        if (item.action) {
                            return (
                                <button
                                    key={item.name}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        item.action();
                                    }}
                                    className={commonClasses}
                                    title={!isSidebarOpen ? item.label : ''}
                                >
                                    {Content}
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                state={{ refreshId: new Date().getTime() }}
                                className={commonClasses}
                                title={!isSidebarOpen ? item.label : ''}
                            >
                                {Content}
                            </Link>
                        );
                    })}
                </nav>

                <div className={`p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 ${isSidebarOpen ? '' : 'flex flex-col items-center'}`}>
                    {/* Language Switcher */}
                    <button
                        onClick={toggleLang}
                        className={`flex items-center gap-3 w-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors ${isSidebarOpen ? 'px-4 py-2' : 'p-2 justify-center'}`}
                        title={t('language')}
                    >
                        <span className="font-bold border border-gray-300 dark:border-gray-600 rounded px-1 text-xs">
                            {i18n.language.toUpperCase()}
                        </span>
                        {isSidebarOpen && <span>{t('language') || 'Language'}</span>}
                    </button>

                    {/* Theme Toggle */}
                    {isSidebarOpen ? (
                        // 3-Way Theme Toggle: OLED | Dark | Light (Expanded)
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-900 rounded-full p-1 relative w-full h-10 border border-gray-200 dark:border-gray-700">
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all duration-300 ease-out z-0`}
                                style={{
                                    left: theme === 'oled' ? '4px' : theme === 'dark' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 0px)'
                                }}
                            />
                            <button onClick={() => handleThemeChange('oled')} className={`flex-1 relative z-10 flex items-center justify-center transition-colors duration-200 ${theme === 'oled' ? 'text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`} title="OLED Mode"><span className="text-[10px] font-bold">OLED</span></button>
                            <button onClick={() => handleThemeChange('dark')} className={`flex-1 relative z-10 flex items-center justify-center transition-colors duration-200 ${theme === 'dark' ? 'text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`} title="Dark Mode"><Moon className="w-4 h-4" /></button>
                            <button onClick={() => handleThemeChange('light')} className={`flex-1 relative z-10 flex items-center justify-center transition-colors duration-200 ${theme === 'light' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`} title="Light Mode"><Sun className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        // Cycle Button (Collapsed)
                        <button
                            onClick={cycleTheme}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl text-gray-600 dark:text-gray-400 transition-colors bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                            title={`Theme: ${theme.toUpperCase()} (Click to cycle)`}
                        >
                            {theme === 'oled' ? <span className="text-[10px] font-bold">OLED</span> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>
                    )}

                    {/* User Info / Auth */}
                    {currentUser ? (
                        <div className={`flex ${isSidebarOpen ? 'flex-col gap-2' : 'flex-col gap-2 items-center'}`}>
                            {isSidebarOpen ? (
                                <div className="flex items-center gap-3 mb-2">
                                    <img
                                        src={currentUser.photoURL || currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}`}
                                        alt="Avatar"
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                    />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">{t('welcome_user')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={currentUser.displayName || currentUser.email}>
                                            {currentUser.displayName || currentUser.email}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={currentUser.photoURL || currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}`}
                                    alt="Avatar"
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600 mb-2 cursor-pointer"
                                    title={currentUser.displayName || currentUser.email}
                                />
                            )}

                            <button
                                onClick={async () => {
                                    await logout();
                                    navigate('/');
                                }}
                                className={`flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm ${isSidebarOpen ? '' : 'justify-center p-2'}`}
                                title={t('logout')}
                            >
                                <LogOut className="w-5 h-5" />
                                {isSidebarOpen && <span>{t('logout')}</span>}
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className={`flex items-center gap-3 w-full px-4 py-3 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors font-semibold ${isSidebarOpen ? '' : 'justify-center p-2'}`}
                            title={t('login')}
                        >
                            <LogIn className="w-5 h-5" />
                            {isSidebarOpen && <span>{t('login')}</span>}
                        </Link>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header for Lang Switch & Logo */}
                <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
                    <Link to="/" onClick={() => window.scrollTo(0, 0)} state={{ refreshId: new Date().getTime() }} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Sprout className="w-6 h-6 text-green-600" />
                        <span className="font-bold text-lg">
                            <span className="text-green-700 dark:text-green-500">Plant</span>
                            <span className="text-blue-500 dark:text-blue-400">AI</span>
                        </span>
                    </Link>
                    <button onClick={toggleLang} className="text-sm font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                        {i18n.language.toUpperCase()}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-32 md:pb-8 scroll-smooth relative" id="main-scroll">
                    <div className="w-full min-h-full flex flex-col">
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </div>
                </div>

                {/* Bottom Nav (Mobile) */}
                {/* Bottom Nav (Mobile) */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around p-2 z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                state={{ refreshId: new Date().getTime() }}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${isActive ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 dark:text-gray-500'
                                    }`}
                            >
                                <Icon className="w-7 h-7" />
                            </Link>
                        );
                    })}
                    {!currentUser && (
                        <Link to="/login" className="flex flex-col items-center justify-center p-3 text-gray-400">
                            <LogIn className="w-7 h-7" />
                        </Link>
                    )}
                </nav>
            </main>
            {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
        </div>
    );
}
