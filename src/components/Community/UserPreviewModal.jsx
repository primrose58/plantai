import { X, MessageCircle, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { startChat } from '../../services/analysisService';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function UserPreviewModal({ user, onClose }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    const { addToast } = useToast();

    const [liveUser, setLiveUser] = useState(user);

    useEffect(() => {
        // Safe guard inside effect
        if (!user) return;
        const targetId = user.uid || user.id; // Handle both ID formats
        if (!targetId) return;

        const unsub = onSnapshot(doc(db, 'users', targetId), (doc) => {
            if (doc.exists()) {
                setLiveUser({ uid: doc.id, ...doc.data() });
            }
        }, (err) => {
            console.error("User listener error", err);
        });

        return () => unsub();
    }, [user]);

    // Derived state or helpers
    const effectiveUser = user ? { ...user, ...liveUser, uid: liveUser?.uid || user.uid || user.id } : null;

    const isOnline = (u) => {
        if (!u?.lastSeen || !u.lastSeen.seconds) return false;
        return (Date.now() - u.lastSeen.seconds * 1000) < 3 * 60 * 1000;
    };

    // NOW checking for null user
    if (!user || !effectiveUser) return null;

    const handleSendMessage = async () => {
        if (!currentUser) {
            addToast(t('login_to_message'), 'info');
            navigate('/login');
            return;
        }
        if (currentUser.uid === effectiveUser.uid) {
            addToast(t('cannot_message_self'), 'warning');
            return;
        }

        setLoading(true); // Set loading true when starting chat
        addToast(t('starting_chat'), 'info');
        try {
            // Ensure avatar values are explicitly null if undefined to prevent Firestore errors
            const chatId = await startChat(
                currentUser.uid,
                effectiveUser.uid, // Use effectiveUser to guarantee an ID exists
                {
                    name: effectiveUser.name || effectiveUser.displayName || 'User',
                    avatar: effectiveUser.photoURL || effectiveUser.avatar || null
                },
                {
                    name: currentUser.displayName || 'User',
                    avatar: currentUser.photoURL || null
                }
            );
            onClose();
            navigate(`/messages/${chatId}`);
        } catch (error) {
            console.error(error);
            addToast(t('error_starting_chat') || "Failed to start chat", 'error');
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors z-10">
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                <div className="flex flex-col items-center relative">
                    <img
                        src={effectiveUser.photoURL || effectiveUser.avatar || `https://ui-avatars.com/api/?name=${effectiveUser.name}`}
                        alt={effectiveUser.name}
                        className="w-24 h-24 rounded-full object-cover mb-4 shadow-lg border-4 border-green-50 dark:border-green-900"
                    />

                    {/* Status Indicator */}
                    <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold border-2 border-white dark:border-gray-800 flex items-center gap-1 ${isOnline(effectiveUser) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline(effectiveUser) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {isOnline(effectiveUser) ? 'Online' : 'Offline'}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{effectiveUser.name || 'User'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> {t('community_member') || 'Community Member'}
                    </p>

                    <button
                        onClick={handleSendMessage}
                        disabled={loading}
                        className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-70"
                    >
                        {loading ? (t('starting_chat') || 'Starting...') : <> <MessageCircle className="w-5 h-5" /> {t('send_message') || 'Send Message'} </>}
                    </button>
                </div>
            </div>
        </div>
    );
}
