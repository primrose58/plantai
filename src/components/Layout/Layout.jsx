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
    Clock
} from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

import { useState, useEffect } from 'react';

export default function Layout() {
    const { currentUser, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const toggleLang = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en');
    };

    // Dark Mode Logic
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Shorter Notification Sound (Pop)
    // Shorter Notification Sound (Pop)
    // Nature-like Notification Sound (Short Bird Chirp)
    const [sound] = useState(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'));

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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

                    // Simple check: logic relies on lastMessage update time vs now? 
                    // Or simplified: if modified and I am not the sender of last update (if senderId stored in top level or check diff)
                    // Firestore 'chats' doc update usually has lastMessage. 
                    // Let's assume ANY modification that is NOT from me is a new message.
                    // But 'chats' doc doesn't strictly store senderId of last message unless we added it (we didn't in previous step, only in messages subcollection).
                    // WAIT: I only updated lastMessage text in Chat.jsx.
                    // To do this properly, I should check if the modification time is recent.

                    // A better way for notifications typically involves listening to 'messages' subcollections (expensive) or storing 'lastSenderId' on chat doc.
                    // Let's rely on a smart client-side diff or just trigger for now.
                    // Actually, let's just assume if it's modified and path is not current chat, show it?
                    // But we need to know WHO sent it to show name.

                    // Let's check update time to avoid initial load trigger
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

    const navItems = [
        { path: '/', icon: Home, label: t('app_name'), public: true },
        { path: '/community', icon: Globe, label: t('community'), public: true },
        { path: '/analyses', icon: Clock, label: t('analyses'), public: false }, // New Tab
        { path: '/messages', icon: MessageCircle, label: t('messages'), public: false },
        { path: '/profile', icon: User, label: t('profile'), public: false },
        { path: '/about', icon: Info, label: t('about'), public: true },
    ];

    const visibleNavItems = navItems.filter(item => item.public || currentUser);

    return (
        <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300">
                <Link to="/" onClick={() => window.scrollTo(0, 0)} state={{ refreshId: new Date().getTime() }} className="p-6 flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Sprout className="w-8 h-8 text-green-600" />
                    <h1 className="text-2xl font-bold tracking-tight">
                        <span className="text-green-700 dark:text-green-500">Plant</span>
                        <span className="text-blue-500 dark:text-blue-400">AI</span>
                    </h1>
                </Link>

                <nav className="flex-1 px-4 space-y-2">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                state={{ refreshId: new Date().getTime() }}
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
                            <button
                                onClick={async () => {
                                    await logout();
                                    navigate('/');
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
                    <div className="w-full h-full flex flex-col">
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
                                <Icon className={`w-7 h-7 ${isActive ? 'fill-current' : ''}`} />
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
        </div>
    );
}
