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

export default function Messages() {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            return;
        }

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => {
                const data = doc.data();
                const otherUserId = data.participants.find(uid => uid !== currentUser.uid);
                const otherUser = data.participantData?.[otherUserId] || { name: 'Unknown', avatar: null };
                return {
                    id: doc.id,
                    ...data,
                    otherUser
                };
            })
                .sort((a, b) => {
                    const timeA = a.updatedAt?.seconds || 0;
                    const timeB = b.updatedAt?.seconds || 0;
                    return timeB - timeA;
                });

            setChats(chatsData);
            setLoading(false);
        }, err => {
            console.error("Chat Query Error", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleDeleteChat = async (e, chatId) => {
        e.preventDefault(); // Prevent navigation
        if (!window.confirm(t('confirm_delete_chat') || "Delete this chat permanently?")) return;

        try {
            await deleteDoc(doc(db, 'chats', chatId));
            addToast("Chat deleted", "success");
        } catch (err) {
            console.error("Delete Chat Error", err);
            addToast("Failed to delete chat", "error");
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;

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
                        <div key={chat.id} className="relative group">
                            <Link
                                to={`/messages/${chat.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors pr-12"
                            >
                                <img
                                    src={chat.otherUser.avatar || 'https://ui-avatars.com/api/?name=' + chat.otherUser.name}
                                    alt={chat.otherUser.name}
                                    className="w-12 h-12 rounded-full object-cover border border-gray-100"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                            {chat.otherUser.name}
                                        </h3>
                                        {chat.updatedAt && (
                                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                {formatDistanceToNow(new Date(chat.updatedAt.seconds * 1000), { addSuffix: true })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {chat.lastMessage || 'Sent an image'}
                                    </p>
                                </div>
                            </Link>

                            {/* Delete Button */}
                            <button
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Chat"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
