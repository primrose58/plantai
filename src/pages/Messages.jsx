import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { deleteDoc, doc } from 'firebase/firestore'; // Add deleteDoc
import { Trash2 } from 'lucide-react'; // Add Trash2
import { useToast } from '../contexts/ToastContext';
import PageLoader from '../components/Common/PageLoader';

import { getDoc } from 'firebase/firestore'; // Add getDoc

// Sub-component for individual chat item with live user data
function ChatListItem({ chat, currentUser }) {
    const [userData, setUserData] = useState(null);
    const { t } = useTranslation();
    const { addToast } = useToast();

    // Identify the other participant ID
    const otherUserId = chat.participants.find(uid => uid !== currentUser.uid);

    useEffect(() => {
        const fetchUser = async () => {
            if (!otherUserId) return;
            try {
                const userSnap = await getDoc(doc(db, 'users', otherUserId));
                if (userSnap.exists()) {
                    setUserData(userSnap.data());
                } else {
                    // Fallback to cached data if user doc missing (rare)
                    const cached = chat.participantData?.[otherUserId];
                    if (cached) setUserData(cached);
                }
            } catch (error) {
                console.error("Error fetching user", error);
            }
        };
        fetchUser();
    }, [otherUserId, chat.participantData]);

    const displayUser = userData || { name: 'Unknown User', photoURL: null };

    // Handle Delete
    const handleDelete = async (e) => {
        e.preventDefault();
        if (!window.confirm(t('confirm_delete_chat') || "Delete this chat permanently?")) return;
        try {
            await deleteDoc(doc(db, 'chats', chat.id));
            addToast("Chat deleted", "success");
        } catch (err) {
            console.error("Delete Chat Error", err);
            addToast("Failed to delete chat", "error");
        }
    };

    // Date Localization Logic
    const { i18n } = useTranslation();
    const dateLocale = i18n.language === 'tr' ? require('date-fns/locale').tr : require('date-fns/locale').enUS;

    // Helper for message preview translation
    const getMessagePreview = (msg) => {
        if (!msg) return t('new_conversation') || 'Yeni Sohbet';
        if (msg === '📷 Photo' || msg.includes('📷 Photo')) return `📷 ${t('photo') || "Photo"}`;
        if (msg === '🎤 Voice Message' || msg.includes('🎤 Voice Message')) return `🎤 ${t('voice_message') || "Voice Message"}`;
        return msg;
    };

    return (
        <div className="relative group">
            <Link
                to={`/messages/${chat.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors pr-12"
            >
                <img
                    src={displayUser.photoURL || displayUser.avatar || `https://ui-avatars.com/api/?name=${displayUser.name || 'User'}`}
                    alt={displayUser.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-100 bg-white"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {displayUser.name || displayUser.displayName || 'Loading...'}
                        </h3>
                        {chat.updatedAt && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatDistanceToNow(new Date(chat.updatedAt.seconds * 1000), {
                                    addSuffix: true,
                                    locale: dateLocale
                                })}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {getMessagePreview(chat.lastMessage)}
                    </p>
                </div>
            </Link>

            <button
                onClick={handleDelete}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Delete Chat"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );
}

export default function Messages() {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const timeA = a.updatedAt?.seconds || 0;
                const timeB = b.updatedAt?.seconds || 0;
                return timeB - timeA;
            });

            setChats(chatsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-2xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6 px-4">{t('messages')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {chats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {t('no_messages') || "No messages yet. Start a conversation!"}
                    </div>
                ) : (
                    chats.map(chat => (
                        <ChatListItem key={chat.id} chat={chat} currentUser={currentUser} />
                    ))
                )}
            </div>
        </div>
    );
}
