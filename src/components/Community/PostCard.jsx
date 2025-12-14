import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Heart, Share2, MoreHorizontal } from 'lucide-react';

export default function PostCard({ post, onUserClick, onMessageClick }) {
    const { i18n } = useTranslation();
    const dateLocale = i18n.language === 'tr' ? tr : enUS;

    // Safety checks
    if (!post) return null;

    const createdAt = post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000) : new Date();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onUserClick && onUserClick(post.userId)}
                >
                    <img
                        src={post.userAvatar || 'https://ui-avatars.com/api/?name=User&background=random'}
                        alt={post.userName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:underline">
                            {post.userName || 'Anonymous'}
                        </h4>
                        <span className="text-xs text-gray-500">
                            {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })}
                        </span>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
                <h3 className="font-bold text-lg text-green-700 dark:text-green-400 mb-1">{post.diseaseName}</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                    {post.description}
                </p>
            </div>

            {/* Image */}
            {post.imageUrl && (
                <div className="w-full h-64 sm:h-80 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                    <img src={post.imageUrl} alt={post.diseaseName} className="w-full h-full object-cover" loading="lazy" />
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-4">
                    {/* Like Button (Visual Only for now) */}
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors">
                        <Heart className="w-5 h-5" />
                        <span className="text-sm font-medium">Like</span>
                    </button>

                    {/* Message / Comment Button */}
                    <button
                        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                        onClick={() => onMessageClick && onMessageClick(post.userId)}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Message</span>
                    </button>
                </div>

                <button className="text-gray-500 hover:text-green-600 transition-colors">
                    <Share2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
