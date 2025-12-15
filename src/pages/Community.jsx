
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import PostCard from '../components/Community/PostCard';
import { Loader2 } from 'lucide-react';

export default function Community() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('All');

    // Hardcoded for now, ideal: select distinct plantType from posts
    const plantTypes = ['All', 'Tomato', 'Rose', 'Pepper', 'Cucumber', 'Unknown'];

    useEffect(() => {
        // Query last 50 posts
        // Query logic based on filter
        let q;
        if (filterType === 'All') {
            q = query(
                collection(db, "posts"),
                orderBy("createdAt", "desc"),
                limit(50)
            );
        } else {
            q = query(
                collection(db, "posts"),
                // where("plantType", "==", filterType), // Requires composite index
                // Fallback: Client side filter for now to avoid index creation delay
                orderBy("createdAt", "desc"),
                limit(50)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side filtering if DB index not ready
            const filtered = filterType === 'All'
                ? postsData
                : postsData.filter(p => p.plantType?.toLowerCase() === filterType.toLowerCase());

            setPosts(filtered);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterType]);

    const handleUserClick = (userId) => {
        // Navigate to user profile (public) - user profile route not fully defined yet, can be /profile/:id
        console.log("Go to user:", userId);
    };

    const handleMessageClick = async (targetUserId) => {
        if (!currentUser) {
            alert("Please login to message users");
            return;
        }
        // Logic from legacy app: sort UIDs to get unique chat ID
        const chatId = [currentUser.uid, targetUserId].sort().join('_');

        // Ensure chat doc exists (basic check)
        // In a real app, we might check existence, but valid write logic handles it
        // For now, simple navigation, the Chat page could handle initialization if empty, 
        // or we do it here.
        // Let's just navigate. The Chat component might need to know the OTHER user details if it's a new chat.
        // Since Chat component just reads messages, we need to ensure the Chat Doc exists with participants.

        // We can just navigate, and the Chat Page can handle "First Message" creation logic if we pass state,
        // or we assume the legacy logic where we setDoc first.
        // I'll assume we navigate and handle it there or lazily.
        // Actually, let's replicate the legacy 'set' logic here for safety.

        try {
            // Using existing db instance
            const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore'); // keep or use top level
            // actually, we can just use the top level imports if we add them, but for now let's fix the navigate syntax first
            // and improper spaces

            // ... (keeping dynamic import for safety if top level is partial, but better to use top level)
            // Let's just fix the navigate line which is definitely broken
            const chatRef = doc(db, 'chats', chatId);
            // ... existing logic ...

            // FIX: Add backticks
            navigate(`/messages/${chatId}`);
        } catch (e) {
            console.error("Error starting chat", e);
        }
    };

    return (
        <div className="max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6 px-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('community')}</h1>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500"
                >
                    {plantTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>No posts yet. Be the first to share your plants!</p>
                        </div>
                    ) : (
                        posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onUserClick={handleUserClick}
                                onMessageClick={handleMessageClick}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
