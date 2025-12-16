import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase'; // Removed storage
import { collection, doc, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Send, ArrowLeft, Trash2, Edit2, Mic, Paperclip, X, Image as ImageIcon, FileText, Play, Pause } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import imageCompression from 'browser-image-compression'; // Import compression

// Helper: Convert Blob/File to Base64
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export default function Chat() {
    const { chatId } = useParams();
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);
    const { addToast } = useToast();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [otherUser, setOtherUser] = useState(null);
    const [otherUserId, setOtherUserId] = useState(null);

    // Advanced Features State
    const [editingId, setEditingId] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [attachment, setAttachment] = useState(null); // { file, type: 'image' | 'file', previewUrl }
    const [uploading, setUploading] = useState(false);
    const [playingAudio, setPlayingAudio] = useState(null); // URL of currently playing audio

    // State for temporary/new chat
    const LOCATION = useLocation();
    const [targetUserForNewChat, setTargetUserForNewChat] = useState(LOCATION.state?.targetUser || null);
    const [realChatId, setRealChatId] = useState(chatId === 'new' ? null : chatId);

    // If we have a real ID, stay on it. If 'new', we are waiting.
    useEffect(() => {
        if (chatId !== 'new') setRealChatId(chatId);
    }, [chatId]);

    // Check for existing chat if 'new'
    useEffect(() => {
        if (chatId === 'new' && targetUserForNewChat && currentUser) {
            // Check if we already have a chat with this user to avoid dups
            const check = async () => {
                try {
                    // Optimized query: Look for chats with BOTH users.
                    // Note: 'participants' array-contains is simple, but to find exact match of 2 users is harder.
                    // We can rely on client-side check or just create.
                    // Ideally analysisService.startChat does the check.
                    // Let's just trust startChat to find or separate. 
                    // Actually, startChat creates if not exists. 
                    // But we don't want to create YET.
                    // So we just render empty.
                    setOtherUser(targetUserForNewChat);
                } catch (e) { console.warn(e); }
            };
            check();
        }
    }, [chatId, targetUserForNewChat, currentUser]);

    useEffect(() => {
        if (chatId === 'new') {
            setLoading(false);
            return;
        }
        if (!realChatId || !currentUser) return;
        setLoading(true);

        const unsubChat = onSnapshot(doc(db, 'chats', realChatId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const otherUid = data.participants.find(p => p !== currentUser.uid);
                if (otherUid) {
                    if (data.participantData?.[otherUid]) {
                        const cached = data.participantData[otherUid];
                        setOtherUser(prev => prev?.id === otherUid ? prev : { ...cached, id: otherUid });
                    }
                    setOtherUserId(otherUid);
                }
            } else {
                // handle deleted
                if (chatId !== 'new') navigate('/messages');
            }
        });

        const unsubscribe = onSnapshot(collection(db, 'chats', realChatId, 'messages'), (snapshot) => {
            const msgs = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setMessages(msgs);
            setLoading(false);
            if (!editingId) {
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        });

        return () => {
            unsubscribe();
            unsubChat();
        };
    }, [realChatId, currentUser, editingId, chatId, navigate]);

    // ... (other useEffects match otherUserId logic)

    // Modified Upload/Send for New Chat
    const uploadAndSend = async (text, fileBlob = null, fileName = null, type = 'text') => {
        setUploading(true);
        try {
            let activeChatId = realChatId;

            // 1. Create chat if it doesn't exist yet
            if (!activeChatId && chatId === 'new') {
                if (!targetUserForNewChat) throw new Error("Target user missing");

                // Import startChat dynamically or assume standard import
                const { startChat } = await import('../services/analysisService');

                activeChatId = await startChat(
                    currentUser.uid,
                    targetUserForNewChat.uid,
                    { name: targetUserForNewChat.name, avatar: targetUserForNewChat.photoURL },
                    { name: currentUser.displayName, avatar: currentUser.photoURL }
                );

                setRealChatId(activeChatId);
                // Update URL silently
                window.history.replaceState(null, '', `/messages/${activeChatId}`);
            }

            let fileUrl = null;
            let finalType = type;
            let finalFileName = fileName;

            // Handle File Conversions (Base64)
            if (fileBlob || attachment) {
                let fileToProcess = fileBlob || attachment.file;

                // If it's an image, compress it first! (Firestore 1MB limit)
                if (finalType === 'image' || attachment?.type === 'image') {
                    finalType = 'image';
                    finalFileName = finalFileName || attachment?.file.name;

                    const options = {
                        maxSizeMB: 0.5, // Aggressive compression for Base64 storage
                        maxWidthOrHeight: 1024,
                        useWebWorker: true
                    };

                    try {
                        fileToProcess = await imageCompression(fileToProcess, options);
                    } catch (e) {
                        console.warn("Compression failed, using original", e);
                    }
                } else if (attachment) {
                    finalType = attachment.type;
                    finalFileName = attachment.file.name;
                }

                // Convert to Base64
                fileUrl = await blobToBase64(fileToProcess);

                // Check size safety (approx < 900KB to be safe)
                if (fileUrl.length > 950000) {
                    throw new Error("File is too large for database storage even after compression.");
                }
            }

            if (editingId) {
                // ... editing logic remains same ...
                await updateDoc(doc(db, 'chats', activeChatId, 'messages', editingId), {
                    text: text,
                    editedAt: serverTimestamp()
                });
                setEditingId(null);
            } else {
                await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
                    text: text || '',
                    type: finalType,
                    fileUrl: fileUrl, // Now a Base64 string
                    fileName: finalFileName,
                    senderId: currentUser.uid,
                    createdAt: serverTimestamp()
                });

                await updateDoc(doc(db, 'chats', activeChatId), {
                    lastMessage: finalType === 'audio' ? '🎤 Voice Message' : (finalType === 'image' ? '📷 Photo' : (text || '📎 File')),
                    updatedAt: serverTimestamp()
                });
            }

            setNewMessage('');
            setAttachment(null);
        } catch (err) {
            console.error("Send failed", err);
            addToast(err.message || "Failed to send message", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !attachment) return;
        await uploadAndSend(newMessage);
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

    const getStatusText = (user) => {
        if (!user?.lastSeen) return 'Offline';
        const lastSeen = user.lastSeen.seconds * 1000;
        const diff = Date.now() - lastSeen;
        if (diff < 3 * 60 * 1000) return 'Online';
        return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    };

    const isOnline = (user) => {
        if (!user?.lastSeen) return false;
        return (Date.now() - user.lastSeen.seconds * 1000) < 3 * 60 * 1000;
    };

    // Helper for timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '...';
        return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            addToast("File too large (Max 10MB)", "error");
            return;
        }

        const type = file.type.startsWith('image/') ? 'image' : 'file';
        const previewUrl = type === 'image' ? URL.createObjectURL(file) : null;
        setAttachment({ file, type, previewUrl });
    };

    // --- Message Editing ---
    const startEdit = (msg) => {
        setNewMessage(msg.text || '');
        setEditingId(msg.id);
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewMessage('');
        setAttachment(null);
    };

    // --- Voice Recording (Click-to-Toggle) ---
    const toggleRecording = async () => {
        if (isRecording) {
            // Stop and Send
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            setIsRecording(false);
        } else {
            // Start
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                const chunks = [];

                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = async () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    // Immediately Send Audio
                    await uploadAndSend(null, audioBlob, 'voice_message.webm', 'audio');

                    stream.getTracks().forEach(track => track.stop()); // Clean up
                };

                recorder.start();
                setMediaRecorder(recorder);
                setIsRecording(true);
            } catch (err) {
                console.error("Mic error:", err);
                addToast("Could not access microphone", "error");
            }
        }
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
                            src={otherUser.photoURL || otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name || 'User'}`}
                            alt={otherUser.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-100"
                        />
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{otherUser.name || otherUser.displayName || 'User'}</h2>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isOnline(otherUser) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{getStatusText(otherUser)}</span>
                            </div>
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
                    const isAudio = msg.type === 'audio';
                    const isImage = msg.type === 'image';
                    const isFile = msg.type === 'file';

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}>
                            <div className={`flex items-end gap-2 max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Message Bubble */}
                                <div className={`px-4 py-2.5 shadow-sm text-sm md:text-base relative group-hover:shadow-md transition-all ${isMine
                                    ? 'bg-green-600 text-white rounded-2xl rounded-br-none'
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700'
                                    } ${isAudio ? 'min-w-[150px]' : ''}`}>

                                    {/* --- Content Types --- */}

                                    {/* Image */}
                                    {isImage && (
                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <img src={msg.fileUrl} alt="attachment" className="max-w-full h-48 object-cover rounded-lg mb-2" />
                                        </a>
                                    )}

                                    {/* Audio Player */}
                                    {isAudio && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const audio = new Audio(msg.fileUrl);
                                                    audio.play();
                                                }}
                                                className={`p-2 rounded-full ${isMine ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-800'}`}
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                            <div className="h-1 flex-1 bg-current opacity-20 rounded-full w-24"></div>
                                            <span className="text-xs opacity-70">Voice</span>
                                        </div>
                                    )}

                                    {/* File */}
                                    {isFile && (
                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline decoration-current">
                                            <Paperclip className="w-4 h-4" />
                                            <span className="truncate max-w-[150px]">{msg.fileName || 'File'}</span>
                                        </a>
                                    )}

                                    {/* Text */}
                                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                                    {/* Edited Tag */}
                                    {msg.editedAt && (
                                        <span className={`text-[10px] block text-right mt-1 opacity-60 ${isMine ? 'text-green-100' : 'text-gray-400'}`}>
                                            (Edited {formatTime(msg.editedAt)})
                                        </span>
                                    )}
                                </div>

                                {/* Actions Menu (Edit/Delete) - Only if mine */}
                                {isMine && (
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(msg)}
                                            className="p-1 text-gray-400 hover:text-blue-500"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
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

            {/* Editing Indicator */}
            {editingId && (
                <div className="px-4 py-2 bg-yellow-50 dark:bg-gray-700 flex items-center justify-between text-xs text-yellow-700 dark:text-yellow-300">
                    <span>Editing message...</span>
                    <button onClick={cancelEdit}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Attachment Preview */}
            {attachment && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {attachment.type === 'image' ? (
                            <img src={attachment.previewUrl} alt="preview" className="w-10 h-10 rounded object-cover" />
                        ) : (
                            <FileText className="w-8 h-8 text-gray-500" />
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                            {attachment.file.name}
                        </span>
                    </div>
                    <button onClick={() => setAttachment(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 items-end">
                {/* File Upload Hidden Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                />

                {/* Attachment Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all"
                    disabled={isRecording || editingId}
                >
                    <Paperclip className="w-5 h-5" />
                </button>

                {/* Text Input */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center min-h-[48px]">
                    {isRecording ? (
                        <div className="flex-1 px-4 flex items-center text-red-500 animate-pulse font-medium">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                            Recording... {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
                        </div>
                    ) : (
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={editingId ? "Edit your message..." : (t('type_message') || "Mesaj yazın...")}
                            className="w-full bg-transparent px-4 py-3 max-h-32 focus:outline-none text-gray-800 dark:text-white resize-none"
                            rows={1}
                            style={{ height: 'auto', minHeight: '48px' }}
                        />
                    )}
                </div>

                {/* Mic / Send Button */}
                {newMessage.trim() || attachment ? (
                    <button
                        onClick={handleSend}
                        disabled={uploading}
                        className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all disabled:opacity-50 transform active:scale-95"
                    >
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                ) : (
                    <button
                        onClick={toggleRecording}
                        className={`p-3 rounded-xl transition-all transform active:scale-95 shadow-lg ${isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        {isRecording ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                )}
            </div>
        </div>
    );
}
