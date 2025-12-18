import React from 'react';
import { X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const UserListModal = ({ isOpen, onClose, title, users, loading }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUserClick = (userId) => {
        onClose();
        navigate(`/profile/${userId}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto p-4 space-y-3 flex-1">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{t('no_results')}</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => handleUserClick(user.id)}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-colors"
                            >
                                <img
                                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`}
                                    alt={user.displayName}
                                    className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-gray-700"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">
                                        {user.displayName || 'Unknown User'}
                                    </h4>
                                    {/* Optional: Add bio or username if available */}
                                </div>
                                <button className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                                    {t('view_profile')}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
