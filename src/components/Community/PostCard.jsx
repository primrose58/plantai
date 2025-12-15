import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Heart, Share2, Trash2, Send, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toggleLike, addComment, deletePost, updatePost } from '../../services/analysisService';

export default function PostCard({ post, onUserClick }) {
    const { t, i18n } = useTranslation();
    const { currentUser } = useAuth();
    const dateLocale = i18n.language === 'tr' ? tr : enUS;

    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post?.content || '');

    const handleEditSubmit = async () => {
        try {
            await updatePost(post.id, { content: editContent });
            setIsEditing(false);
        } catch (error) {
            alert("Failed to update post");
        }
    };

    // Safety checks
    if (!post) return null;

    const isOwner = currentUser?.uid === post.userId;
    const isLiked = post.likes && currentUser && post.likes.includes(currentUser.uid);
    const likeCount = post.likes ? post.likes.length : 0;
    const commentCount = post.comments ? post.comments.length : 0;
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        const updateTime = () => {
            if (!post.createdAt?.seconds) {
                setTimeAgo(t('just_now') || 'Just now');
                return;
            }
            const date = new Date(post.createdAt.seconds * 1000);
            setTimeAgo(formatDistanceToNow(date, {
                addSuffix: true,
                locale: dateLocale,
                includeSeconds: true
            }));
        };

        updateTime(); // Initial run
        const interval = setInterval(updateTime, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, [post.createdAt, dateLocale, t]);

    const createdAt = post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000) : new Date();
    // derived variables...

    const handleLike = async () => {
        if (!currentUser || likeLoading) return;
        setLikeLoading(true);
        try {
            await toggleLike(post.id, currentUser.uid);
            // State update happens via parent real-time listener
        } catch (error) {
            console.error(error);
        } finally {
            setLikeLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('confirm_delete_post') || "Delete this post?")) return;
        try {
            await deletePost(post.id);
        } catch (error) {
            alert("Failed to delete post");
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !currentUser) return;

        try {
            await addComment(post.id, currentUser.uid, currentUser.displayName || 'User', commentText);
            setCommentText('');
        } catch (error) {
            console.error(error);
            alert("Failed to post comment");
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4 animate-fade-in relative group">
            {/* Delete Button (Owner Only) */}
            {isOwner && (
                <button
                    onClick={handleDelete}
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Post"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onUserClick && onUserClick(post.userId)}
                >
                    <img
                        src={post.userAvatar || `https://ui-avatars.com/api/?name=${post.authorName || 'User'}&background=random`}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:underline">
                            {post.authorName || 'Gardener'}
                        </h4>
                        <span className="text-xs text-gray-500">
                            {timeAgo}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
                {post.title && <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{post.title}</h3>}
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                    {post.content}
                </p>
                {post.plantType && post.plantType !== 'Unknown' && (
                    <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-md mb-2">
                        {post.plantType}
                    </span>
                )}
            </div>

            {/* Image */}
            {post.image && (
                <div className="w-full h-64 sm:h-80 bg-gray-100 dark:bg-gray-900 overflow-hidden cursor-pointer" onClick={() => window.open(post.image, '_blank')}>
                    <img src={post.image} alt="Post" className="w-full h-full object-cover" loading="lazy" />
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-4">
                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                            }`}
                    >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="text-sm font-medium">{likeCount || 'Like'}</span>
                    </button>

                    {/* Comment Button */}
                    <button
                        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{commentCount || 'Comment'}</span>
                    </button>

                    {/* Edit Button (Owner Only) */}
                    {isOwner && (
                        <button
                            className="flex items-center gap-1.5 text-gray-500 hover:text-green-500 transition-colors"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit2 className="w-5 h-5" />
                            <span className="text-sm font-medium hidden sm:inline">Edit</span>
                        </button>
                    )}
                </div>

                <button className="text-gray-500 hover:text-green-600 transition-colors">
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Edit Modal / Inline Edit */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Edit Post</h3>
                        <textarea
                            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comments Section */}
            {showComments && (
                <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="space-y-3 mt-4 max-h-60 overflow-y-auto mb-4 custom-scrollbar">
                        {post.comments && post.comments.map((comment, idx) => (
                            <div key={idx} className="flex gap-2 items-start text-sm">
                                <span className="font-bold text-gray-900 dark:text-white shrink-0">{comment.userName}:</span>
                                <span className="text-gray-700 dark:text-gray-300 break-words">{comment.text}</span>
                            </div>
                        ))}
                        {(!post.comments || post.comments.length === 0) && (
                            <p className="text-gray-400 text-center text-sm italic">No comments yet. Be the first!</p>
                        )}
                    </div>

                    {/* Comment Input */}
                    {currentUser ? (
                        <form onSubmit={handleCommentSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-sm outline-none focus:border-green-500"
                            />
                            <button
                                type="submit"
                                disabled={!commentText.trim()}
                                className="p-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    ) : (
                        <p className="text-center text-sm text-gray-500">Please login to comment.</p>
                    )}
                </div>
            )}
        </div>
    );
}
