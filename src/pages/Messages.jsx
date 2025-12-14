import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            // Just return, loading state will handle UI or redirect logic elsewhere
            return;
        }

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Determine other user
                const otherUserId = data.participants.find(uid => uid !== currentUser.uid);
                const otherUser = data.participantData?.[otherUserId] || { name: 'Unknown', avatar: null };
                return {
                    id: doc.id,
                    ...data,
                    otherUser
                };
            });
            setChats(chatsData);
            setLoading(false);
        }, err => {
            // Fallback or ignore index errors initially?
            // Note: Compound queries might require index creation.
            console.error("Chat Query Error", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;

    return (
        <div className="max-w-2xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6 px-4">{t('messages')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {chats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No messages yet. Start a chat from the Community feed!
                    </div>
                ) : (
                    chats.map(chat => (
                        <Link
                            key={chat.id}
                            to={`/messages/${chat.id}`}
                            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <img
                                src={chat.otherUser.avatar || 'https://ui-avatars.com/api/?name=' + chat.otherUser.name}
                                alt={chat.otherUser.name}
                                className="w-12 h-12 rounded-full object-cover"
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
                    ))
                )}
            </div>
        </div>
    );
}
