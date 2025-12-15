import { X, MessageCircle, User } from 'lucide-react';
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

    if (!user) return null;

    const [liveUser, setLiveUser] = useState(user);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) setLiveUser({ uid: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [user]);

    const isOnline = (u) => {
        if (!u?.lastSeen) return false;
        return (Date.now() - u.lastSeen.seconds * 1000) < 3 * 60 * 1000;
    };

    const handleSendMessage = async () => {
        if (!currentUser) {
            addToast(t('login_to_message'), 'info');
            navigate('/login');
            return;
        }
        if (currentUser.uid === liveUser.uid) {
            addToast(t('cannot_message_self'), 'warning');
            return;
        }

        setLoading(true); // Set loading true when starting chat
        addToast(t('starting_chat'), 'info');
        try {
            // Ensure avatar values are explicitly null if undefined to prevent Firestore errors
            const chatId = await startChat(
                currentUser.uid,
                liveUser.uid,
                {
                    name: liveUser.name || liveUser.displayName || 'User',
                    avatar: liveUser.photoURL || liveUser.avatar || null
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

                        )}
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
            <p className="text-gray-500 text-sm">{t('community_member') || 'Community Member'}</p>

            <button
                onClick={handleSendMessage}
                disabled={loading}
                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-70"
            >
                {loading ? (t('starting_chat') || 'Starting...') : <> <MessageCircle className="w-5 h-5" /> {t('send_message') || 'Send Message'} </>}
            </button>
        </div>
            </div >
        </div >
    );
}
