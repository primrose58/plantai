import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Send, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Chat() {
    const { chatId } = useParams();
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const { addToast } = useToast(); // Needs import from context

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [otherUser, setOtherUser] = useState(null);

    useEffect(() => {
        if (!chatId || !currentUser) return;

        // 1. Fetch Chat Metadata to get Other User
        const unsubChat = onSnapshot(doc(db, 'chats', chatId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const otherUid = data.participants.find(p => p !== currentUser.uid);
                if (otherUid && data.participantData) {
                    setOtherUser(data.participantData[otherUid]);
                }
            } else {
                // Chat might be deleted
                navigate('/messages');
            }
        });

        // 2. Fetch Messages
        const unsubscribe = onSnapshot(collection(db, 'chats', chatId, 'messages'), (snapshot) => {
            const msgs = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => {
            unsubscribe();
            unsubChat();
        };
    }, [chatId, currentUser]);

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
            addToast("Failed to send message", "error");
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            await deleteDoc(doc(db, 'chats', chatId, 'messages', msgId));
            addToast("Message deleted", "success");
        } catch (err) {
            console.error("Delete failed", err);
            addToast("Could not delete message", "error");
        }
    };

    // Helper for timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '...';
        return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] md:h-[calc(100vh-theme(spacing.16))] max-w-2xl mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
            {/* Header */}
            {loading && <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>}

            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4 bg-white dark:bg-gray-800 z-10 shadow-sm">
                <button onClick={() => navigate('/messages')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                {otherUser ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name}`}
                            alt={otherUser.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-100"
                        />
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{otherUser.name}</h2>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                        </div>
                    </div>
                ) : (
                    <h2 className="font-bold text-gray-900 dark:text-gray-100">Chat</h2>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                {messages.map(msg => {
                    const isMine = msg.senderId === currentUser.uid;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}>
                            <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Message Bubble */}
                                <div className={`px-4 py-2.5 shadow-sm text-sm md:text-base relative group-hover:shadow-md transition-all ${isMine
                                    ? 'bg-green-600 text-white rounded-2xl rounded-br-none'
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700'
                                    }`}>
                                    {msg.text}
                                </div>

                                {/* Trash Icon (Only if mine) */}
                                {isMine && (
                                    <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all transform translate-y-2 group-hover:translate-y-0"
                                        title="Delete message"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[10px] text-gray-400 mt-1 px-1 font-medium">
                                {formatTime(msg.createdAt)}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-3 items-center">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('type_msg')}
                    className="flex-1 px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-95"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
