import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Send, ArrowLeft } from 'lucide-react';

export default function Chat() {
    const { chatId } = useParams();
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const bottomRef = useRef(null);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chatId) return;

        // Note: Applying orderBy in snapshot might require index.
        // Usually simple collection ordering works if fields are simple.
        // Ideally: query(collection(...), orderBy('createdAt', 'asc'))

        const unsubscribe = onSnapshot(collection(db, 'chats', chatId, 'messages'), (snapshot) => {
            const msgs = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)); // Client-side sort to avoid index issues for now
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsubscribe();
    }, [chatId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const text = newMessage;
        setNewMessage('');

        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text,
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, 'chats', chatId), {
                lastMessage: text,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] md:h-[calc(100vh-theme(spacing.16))] max-w-2xl mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            {loading && <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-white dark:bg-gray-800 z-10">
                <button onClick={() => navigate('/messages')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Chat</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                {messages.map(msg => {
                    const isMine = msg.senderId === currentUser.uid;
                    return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMine
                                ? 'bg-green-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('type_msg')}
                    className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors disabled:opacity-50"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
