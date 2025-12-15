import { X, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { startChat } from '../../services/analysisService';
import { useState } from 'react';

export default function UserPreviewModal({ user, onClose }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    if (!user) return null;

    const handleSendMessage = async () => {
        if (!currentUser) {
            alert("Please login to message users.");
            return;
        }

        if (currentUser.uid === user.id) {
            alert("You cannot message yourself.");
            return;
        }

        setLoading(true);
        try {
            const chatId = await startChat(currentUser.uid, user.id, {
                name: user.name,
                avatar: user.avatar
            });
            onClose();
            navigate(`/messages/${chatId}`);
        } catch (error) {
            console.error("Failed to start chat:", error);
            alert("Failed to start chat. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors z-10">
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Banner/Header */}
                <div className="h-24 bg-gradient-to-r from-green-400 to-teal-500"></div>

                <div className="px-6 pb-6 -mt-12 flex flex-col items-center">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-white dark:bg-gray-700">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User className="w-10 h-10" />
                            </div>
                        )}
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
                    <p className="text-gray-500 text-sm">Community Member</p>

                    <button
                        onClick={handleSendMessage}
                        disabled={loading}
                        className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-70"
                    >
                        {loading ? 'Starting...' : <> <MessageCircle className="w-5 h-5" /> Send Message </>}
                    </button>
                </div>
            </div>
        </div>
    );
}
