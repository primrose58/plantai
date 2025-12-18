import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, Check, X as XIcon, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getFollowRequests, acceptFollowRequest, rejectFollowRequest } from '../../services/userService';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function NotificationsModal({ onClose }) {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        // Real-time listener for requests
        const q = query(
            collection(db, 'users', currentUser.uid, 'followRequests'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(reqs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleAccept = async (request) => {
        if (processingId) return;
        setProcessingId(request.id);

        // Optimistic Update
        setRequests(prev => prev.filter(r => r.id !== request.id));

        try {
            await acceptFollowRequest(
                request.id, // requestId (which is requesterId)
                request.id, // requesterId
                { displayName: request.followerName, photoURL: request.followerPhoto },
                currentUser.uid,
                { displayName: currentUser.displayName, photoURL: currentUser.photoURL }
            );
            addToast(t('request_accepted') || 'Request Accepted', 'success');
        } catch (error) {
            console.error(error);
            addToast(t('error_occurred') || 'Error', 'error');
            // Revert on error (optional, but simplified here)
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId) => {
        if (processingId) return;
        setProcessingId(requestId);

        // Optimistic Update
        setRequests(prev => prev.filter(r => r.id !== requestId));

        try {
            await rejectFollowRequest(currentUser.uid, requestId);
            addToast(t('request_rejected') || 'Request Rejected', 'info');
        } catch (error) {
            console.error(error);
            addToast('Error', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-green-600" />
                        {t('notifications') || 'Bildirimler'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{t('no_notifications') || 'No new notifications'}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">{t('follow_requests') || 'Follow Requests'}</h4>
                            {requests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl">
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => {
                                            onClose();
                                            navigate(`/profile/${request.id}`);
                                        }}
                                    >
                                        <img
                                            src={request.followerPhoto || `https://ui-avatars.com/api/?name=${request.followerName || 'User'}&background=random`}
                                            alt={request.followerName}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{request.followerName || 'User'}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('wants_to_follow') || 'Wants to follow you'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={processingId === request.id}
                                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleAccept(request)}
                                            disabled={processingId === request.id}
                                            className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
