import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PostCard from '../components/Community/PostCard';

export default function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { currentUser } = useAuth();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!postId) return;

        setLoading(true);
        const docRef = doc(db, 'posts', postId);

        // Real-time listener for the specific post
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setPost({ id: docSnap.id, ...docSnap.data() });
                setError(null);
            } else {
                setError(t('post_not_found') || "Post not found");
                setPost(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching post:", err);
            setError(t('error_fetching_post') || "Error loading post");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [postId, t]);

    const handleBack = () => {
        navigate('/community');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4">
                    {error}
                </div>
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mx-auto"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('back_to_community') || "Back to Community"}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 pb-20 flex flex-col gap-4">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <button
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('post_details') || "Post Details"}
                </h1>
            </div>

            {/* Post Content reuse via PostCard but we might want to ensure it shows comments by default or is expanded */}
            {/* 
                We can reuse PostCard but maybe we want specific Detail View behavior?
                The user asked for comments to not clutter the main feed.
                If we use PostCard, it has a toggle for comments. 
                For Detail page, we ideally want comments always visible or auto-expanded.
                Let's pass a prop `defaultExpanded={true}` to PostCard if we modify it, 
                OR proper separation of concerns would be to extract the visual part.
                For now, to save time and maintain consistency, reusing PostCard is smart, 
                but we need to tell it we are in "Detail Mode" so it hides 'View Post' button 
                and maybe Auto-shows comments.
            */}

            {post && (
                <div className="w-full">
                    <PostCard
                        post={post}
                        isDetailView={true} // New prop to handle specific detail view logic
                        onUserClick={(userId) => navigate(`/profile/${userId}`)}
                    />
                </div>
            )}
        </div>
    );
}
