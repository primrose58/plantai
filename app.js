/**
 * PlantAI - Bundled Logic
 * Merged for local file:// execution support.
 */

// --- 1. CONFIGURATION ---
const CONFIG = {
    GEMINI_API_KEY: "AIzaSyBZsgE07GnD6GGpOdeHCFbSQs8tT7Gnd20", // Provided by User
    FIREBASE: {
        apiKey: "AIzaSyAukVlaxbs_YneslsBqTydefDhepXbookU",
        authDomain: "plantai0.firebaseapp.com",
        projectId: "plantai0",
        storageBucket: "plantai0.firebasestorage.app",
        messagingSenderId: "265722530392",
        appId: "1:265722530392:web:5e2b3aed63d2597b07d82d",
        measurementId: "G-LSJ7Q09VS0"
    }
};

// --- IMPORTS (Compat) ---
// We will use global variables instead of imports since we are in a non-module environment.
// Scripts must be loaded in HTML header with correct CDN links.

// --- 2. SERVICES ---

// A. FIREBASE SERVICE
let auth, db, storage;
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded!");
        return false;
    }
    try {
        const app = firebase.initializeApp(CONFIG.FIREBASE);
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        console.log("Firebase Connected");
        return true;
    } catch (e) {
        console.error("Firebase Init Error", e);
        return false;
    }
}

// ... (Gemini Service remains same) ...

// ... (Inside DOMContentLoaded) ...

// --- AVATAR LOGIC ---
const modalAvatar = document.getElementById('modal-avatar-selector');
const btnEditAvatar = document.getElementById('btn-edit-avatar');
const btnCloseAvatar = document.getElementById('btn-close-avatar-modal');
const avatarInput = document.getElementById('avatar-input');
const btnUploadAvatar = document.getElementById('btn-upload-avatar');

// Open Modal
if (btnEditAvatar) btnEditAvatar.addEventListener('click', () => {
    modalAvatar.classList.remove('hidden');
});

// Close Modal
if (btnCloseAvatar) btnCloseAvatar.addEventListener('click', () => {
    modalAvatar.classList.add('hidden');
});

// Preset Selection
document.querySelectorAll('.avatar-preset').forEach(preset => {
    preset.addEventListener('click', () => {
        updateUserAvatar(preset.innerText); // Store emoji directly
        modalAvatar.classList.add('hidden');
    });
});

// Upload Click
if (btnUploadAvatar) btnUploadAvatar.addEventListener('click', () => avatarInput.click());

// File Upload Main Logic
if (avatarInput) avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Upload to Firebase Storage
    const ref = storage.ref(`avatars/${auth.currentUser.uid}`);
    try {
        btnUploadAvatar.innerText = "Yükleniyor...";
        await ref.put(file);
        const url = await ref.getDownloadURL();
        updateUserAvatar(url);
        modalAvatar.classList.add('hidden');
        btnUploadAvatar.innerText = "Fotoğraf Yükle";
    } catch (err) {
        console.error(err);
        alert("Yükleme başarısız: " + err.message);
        btnUploadAvatar.innerText = "Hata oluştu";
    }
});

function updateUserAvatar(avatarUrlOrEmoji) {
    if (!auth.currentUser) return;
    auth.currentUser.updateProfile({ photoURL: avatarUrlOrEmoji }).then(() => {
        updateProfileUI(auth.currentUser);
        // Optional: Batch update recent posts? Too expensive for client.
        // Future posts will have new avatar.
        alert("Profil fotoğrafı güncellendi!");
    });
}

// --- PUBLIC PROFILE LOGIC ---
window.openPublicProfile = function (userId, name, avatar) {
    document.getElementById('public-profile-name').innerText = name;
    document.getElementById('public-profile-avatar').innerText = avatar.startsWith('http') ? '' : avatar;
    if (avatar.startsWith('http')) {
        document.getElementById('public-profile-avatar').style.backgroundImage = `url(${avatar})`;
        document.getElementById('public-profile-avatar').style.backgroundSize = 'cover';
        document.getElementById('public-profile-avatar').innerText = '';
    } else {
        document.getElementById('public-profile-avatar').style.background = '#eee';
    }

    // Load Posts
    const feed = document.getElementById('public-posts-feed');
    feed.innerHTML = '<div class="spinner"></div>';
    db.collection('posts').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(10).get()
        .then(snap => {
            feed.innerHTML = '';
            snap.forEach(doc => {
                feed.innerHTML += renderPost(doc.data());
            });
        });

    // Bind Message Button
    document.getElementById('btn-send-message').onclick = () => startChat(userId, name, avatar);

    showScreen('screen-public-profile');
};

// --- MESSAGING LOGIC ---
async function startChat(targetId, targetName, targetAvatar) {
    if (!auth.currentUser) return alert("Giriş yapmalısınız!");

    const myId = auth.currentUser.uid;
    // Check if chat exists (naive check: query chats where participants array-contains myId, then filter in memory for targetId)
    // Better: Construct a unique ID if 1-on-1, e.g., sorted UIDs.
    const combinedId = [myId, targetId].sort().join('_');

    // Show Chat Screen immediately with temp data
    document.getElementById('chat-header-name').innerText = targetName;
    document.getElementById('screen-chat').dataset.chatId = combinedId;
    showScreen('screen-chat');
    loadMessages(combinedId);

    // Ensure Chat Doc Exists
    const chatRef = db.collection('chats').doc(combinedId);
    const doc = await chatRef.get();
    if (!doc.exists) {
        await chatRef.set({
            participants: [myId, targetId],
            participantData: {
                [myId]: { name: auth.currentUser.displayName, avatar: auth.currentUser.photoURL || '👨‍🌾' },
                [targetId]: { name: targetName, avatar: targetAvatar }
            },
            lastMessage: '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

let unsubscribeChat = null;
function loadMessages(chatId) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '<div class="spinner"></div>';
    if (unsubscribeChat) unsubscribeChat();

    unsubscribeChat = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(50)
        .onSnapshot(snap => {
            container.innerHTML = '';
            snap.forEach(doc => {
                const msg = doc.data();
                const isMine = msg.senderId === auth.currentUser.uid;
                container.innerHTML += `
                        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
                            ${msg.text}
                        </div>
                    `;
            });
            container.scrollTop = container.scrollHeight;
        });
}

// Send Message
document.getElementById('btn-send-chat').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const chatId = document.getElementById('screen-chat').dataset.chatId;
    if (!chatId) return;

    input.value = '';

    await db.collection('chats').doc(chatId).collection('messages').add({
        text,
        senderId: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('chats').doc(chatId).update({
        lastMessage: text,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
});

// Load Inbox
if (document.querySelector('[data-target="screen-inbox"]')) {
    document.querySelector('[data-target="screen-inbox"]').addEventListener('click', loadInbox);
}

function loadInbox() {
    if (!auth.currentUser) return showScreen('screen-login');
    const list = document.getElementById('inbox-list');
    list.innerHTML = '<div class="spinner"></div>';

    db.collection('chats').where('participants', 'array-contains', auth.currentUser.uid)
        .orderBy('updatedAt', 'desc')
        .onSnapshot(snap => {
            list.innerHTML = '';
            if (snap.empty) {
                list.innerHTML = '<div class="empty-state"><p>Henüz mesaj yok.</p></div>';
                return;
            }
            snap.forEach(doc => {
                const chat = doc.data();
                const otherId = chat.participants.find(p => p !== auth.currentUser.uid);
                const otherUser = chat.participantData[otherId] || { name: 'Kullanıcı', avatar: '👤' };

                const div = document.createElement('div');
                div.className = 'inbox-item';
                div.innerHTML = `
                        <div class="avatar-small">${otherUser.avatar.startsWith('http') ? '<img src="' + otherUser.avatar + '" style="width:100%;height:100%;border-radius:50%;">' : otherUser.avatar}</div>
                        <div class="inbox-info">
                            <h4>${otherUser.name}</h4>
                            <p>${chat.lastMessage || 'Fotoğraf'}</p>
                        </div>
                    `;
                div.onclick = () => startChat(otherId, otherUser.name, otherUser.avatar);
                list.appendChild(div);
            });
        });
}

// Render Post Helper (to reuse in Profile and Community)
function renderPost(post) {
    // Add click handler to user info
    const avatarDisplay = post.userAvatar && post.userAvatar.startsWith('http') ?
        `<img src="${post.userAvatar}" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` :
        (post.userAvatar || '👤');

    return `
            <div class="post-card">
                <div class="post-header" onclick="window.openPublicProfile('${post.userId}', '${post.userName}', '${post.userAvatar || '👤'}')">
                    <div class="avatar" style="overflow:hidden; cursor:pointer">${avatarDisplay}</div>
                    <div class="user-info" style="cursor:pointer">
                        <h4>${post.userName}</h4>
                        <span class="time">${new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="post-content">
                    <h3>${post.diseaseName}</h3>
                    <p>${post.description}</p>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
                </div>
            </div>`;
}

// --- REPLACED EXISTING FUNCTIONS TO USE NEW RENDER ---

function loadCommunity() {
    if (!db) return;
    const feedContainer = document.getElementById('community-feed');
    feedContainer.innerHTML = '<div class="spinner"></div>';
    db.collection('posts').orderBy('createdAt', 'desc').limit(20)
        .onSnapshot(snapshot => {
            feedContainer.innerHTML = '';
            snapshot.forEach(doc => {
                feedContainer.innerHTML += renderPost(doc.data());
            });
        });
}

function updateProfileUI(user) {
    console.log("Logged in as: ", user.email);
    const avatarEl = document.getElementById('current-user-avatar');
    if (user.photoURL) {
        if (user.photoURL.startsWith('http')) {
            avatarEl.innerHTML = '';
            avatarEl.style.backgroundImage = `url(${user.photoURL})`;
            avatarEl.style.backgroundSize = 'cover';
        } else {
            avatarEl.innerText = user.photoURL;
            avatarEl.style.backgroundImage = 'none';
        }
    }
}

// B. GEMINI SERVICE
class GeminiService {
    constructor() {
        // We will call the API directly via fetch to avoid import issues with the SDK in non-module mode
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";
        this.apiKey = CONFIG.GEMINI_API_KEY;
        console.log("Gemini Endpoint:", this.baseUrl);
    }

    async analyzePlant(base64Image, lang = 'tr') {
        const promptText = `
            You are an expert Phytopathologist. Analyze this plant image.
            OUTPUT MUST BE IN TURKISH.
            Return ONLY a valid raw JSON object:
            {
                "disease_name": "Disease Name",
                "latin_name": "Latin Name",
                "confidence": 90,
                "urgency": 50,
                "spread_risk": 40,
                "description": "Short description.",
                "treatment_steps": ["Step 1", "Step 2"]
            }
            If NOT a plant, return {"error": "NOT_PLANT"}
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }
                ]
            }]
        };

        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            throw new Error(data.error.message || "API Connection Error");
        }

        if (!data.candidates || !data.candidates[0].content) {
            if (data.promptFeedback) {
                console.warn("Safety Block:", data.promptFeedback);
                throw new Error("Görsel güvenlik filtresine takıldı. Lütfen daha net bir bitki fotoğrafı çekin.");
            }
            throw new Error("Yapay zeka yanıt veremedi. Lütfen tekrar deneyin.");
        }

        const text = data.candidates[0].content.parts[0].text;
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    }

    async checkSafety(text, base64Image) {
        // Simplified safety check (Simulated for speed in bundle, or real call)
        // For real prod, we would do another fetch call here.
        // Let's implement the real fetch for safety.
        const promptText = `
            Check safety. Text: ${text}. Is it SAFE (+18, violence)? 
            Return JSON: {"safe": true}
        `;
        const payload = {
            contents: [{
                parts: [
                    { text: promptText }
                ]
            }]
        };
        // Add image if exists
        if (base64Image) {
            payload.contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } });
        }

        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const res = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
            return res.safe;
        } catch (e) { console.warn(e); return true; } // Fail open if error
    }
}

// --- 3. MAIN LOGIC ---
document.addEventListener('DOMContentLoaded', async () => {

    // Init Services
    const isFirebaseReady = initFirebase();
    const gemini = new GeminiService();
    let currentDiagnosis = null;

    // UI Elements
    const screens = document.querySelectorAll('.screen');
    const bottomNavItems = document.querySelectorAll('.nav-item');
    const authWarning = document.getElementById('auth-warning');
    const communityContent = document.getElementById('community-content');

    // Navigation
    window.showScreen = function (screenId) {
        // Toggle Active Screen
        screens.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');

        // Update Bottom Nav
        bottomNavItems.forEach(item => {
            if (item.dataset.target === screenId) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Update Desktop Sidebar
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            if (link.dataset.target === screenId) link.classList.add('active');
            else link.classList.remove('active');
        });

        if (screenId === 'screen-community') loadCommunity();
        if (screenId === 'screen-profile') loadProfile();
    };

    // Global Click Listener for Navigation
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-target]');
        if (btn) {
            const target = btn.dataset.target;
            showScreen(target);
        }
    });

    // Auth Navigation Helpers (Global)
    const gotoReg = document.getElementById('goto-register');
    const gotoLog = document.getElementById('goto-login');

    if (gotoReg) gotoReg.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('screen-register');
    });

    if (gotoLog) gotoLog.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('screen-login');
    });

    // --- AUTH LOGIC ---
    if (isFirebaseReady) {
        auth.onAuthStateChanged(user => {
            // 1. Update Global UI
            const profileLinks = document.querySelectorAll('[data-target="screen-profile"]');
            profileLinks.forEach(link => {
                link.style.display = user ? 'flex' : 'none';
            });

            // 2. Handle Auth Warning & Community
            if (user) {
                if (authWarning) authWarning.classList.add('hidden');
                if (communityContent) communityContent.classList.remove('hidden');

                // Unblur result if present
                const resultOverlay = document.getElementById('result-blur-overlay');
                if (resultOverlay) resultOverlay.classList.add('hidden');

                updateProfileUI(user);

                // If we have a pending result and just logged in, go there
                if (currentDiagnosis) {
                    const activeScreen = document.querySelector('.screen.active');
                    if (activeScreen && (activeScreen.id === 'screen-login' || activeScreen.id === 'screen-verify')) {
                        showScreen('screen-result');
                    }
                }
            } else {
                if (authWarning) authWarning.classList.remove('hidden');
                if (communityContent) communityContent.classList.add('hidden');
            }
        });

        // Result Overlay Login Button
        const btnLoginResult = document.getElementById('btn-login-result');
        if (btnLoginResult) btnLoginResult.addEventListener('click', () => showScreen('screen-login'));

        // Forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            auth.signInWithEmailAndPassword(email, pass)
                .then((cred) => {
                    if (!cred.user.emailVerified) {
                        auth.signOut();
                        alert("Giriş yapmadan önce lütfen e-posta adresinizi doğrulayın! Size bir onay linki gönderdik.");
                        return;
                    }
                    alert("Hoşgeldiniz!");
                    showScreen('screen-home');
                })
                .catch(err => alert("Hata: " + err.message));
        });

        const regForm = document.getElementById('register-form');
        if (regForm) regForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-name').value;

            auth.createUserWithEmailAndPassword(email, pass)
                .then(cred => {
                    return cred.user.updateProfile({ displayName: name }).then(() => cred.user);
                })
                .then((user) => {
                    user.sendEmailVerification();
                    // Don't sign out yet, keep them in 'pending' state to show the screen with their email
                    document.getElementById('verify-email-text').innerText = email;
                    showScreen('screen-verify');
                })
                .catch(err => alert("Hata: " + err.message));
        });

        // Verification Check Button
        const btnVerifyCheck = document.getElementById('btn-check-verify');
        if (btnVerifyCheck) btnVerifyCheck.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                await user.reload(); // Poll server for update
                if (user.emailVerified) {
                    alert("Teşekkürler! Hesabınız onaylandı.");
                    showScreen('screen-home');
                } else {
                    alert("Henüz onaylanmamış görünüyor. Lütfen maildeki linke tıklayın.");
                }
            } else {
                showScreen('screen-login');
            }
        });
    }

    function updateProfileUI(user) {
        // Could update sidebar profile pic here
        console.log("Logged in as: ", user.email);
    }

    // --- COMMUNITY LOGIC ---
    function loadCommunity() {
        if (!db) return;
        const feedContainer = document.getElementById('community-feed');
        feedContainer.innerHTML = '<div class="spinner"></div>';

        db.collection('posts').orderBy('createdAt', 'desc').limit(20)
            .onSnapshot(snapshot => {
                feedContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    const post = doc.data();
                    const html = `
                    <div class="post-card">
                        <div class="post-header">
                            <div class="avatar">${post.userAvatar || '👤'}</div>
                            <div class="user-info">
                                <h4>${post.userName}</h4>
                                <span>${new Date(post.createdAt?.toDate()).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="post-content">
                            <h3>${post.diseaseName}</h3>
                            <p>${post.description}</p>
                            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
                        </div>
                    </div>`;
                    feedContainer.innerHTML += html;
                });
            });
    }

    // --- AI & CAMERA LOGIC ---
    const fileInput = document.getElementById('file-input');
    const scanPreview = document.getElementById('scan-preview-img');
    const scanText = document.getElementById('scan-text');

    // Handle File Selection
    window.handleFileUpload = function (input) {
        if (input.files && input.files[0]) {
            processImage(input.files[0]);
        }
    };

    // Bind Browse Button
    const btnBrowse = document.getElementById('btn-browse');
    if (btnBrowse) btnBrowse.addEventListener('click', () => fileInput.click());

    // --- FIX: MISSING LISTENERS ---
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.addEventListener('click', () => showScreen('screen-upload'));

    const btnNavScan = document.getElementById('btn-nav-scan');
    if (btnNavScan) btnNavScan.addEventListener('click', () => showScreen('screen-upload'));

    const btnFab = document.getElementById('btn-share-diagnosis');
    if (btnFab) btnFab.addEventListener('click', () => {
        alert("Lütfen önce bitkiyi taratın, sonucu oradan paylaşabilirsiniz.");
        showScreen('screen-upload');
    });

    const btnCam = document.getElementById('btn-camera');
    const camInput = document.getElementById('camera-input');
    if (btnCam) btnCam.addEventListener('click', () => camInput.click());

    if (fileInput) fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processImage(e.target.files[0]);
    });
    if (camInput) camInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processImage(e.target.files[0]);
    });

    function processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            scanPreview.src = base64;
            runAI(base64);
        };
        reader.readAsDataURL(file);
    }

    async function runAI(base64) {
        showScreen('screen-scanning');
        scanText.innerText = "Yapay Zeka Analiz Ediyor...";

        try {
            const result = await gemini.analyzePlant(base64);
            currentDiagnosis = { ...result, image: base64 };
            displayResult(result, base64);
        } catch (e) {
            alert("Analiz Hatası: " + e.message);
            showScreen('screen-upload');
        }
    }

    function displayResult(data, image) {
        // Blur Check
        const resultOverlay = document.getElementById('result-blur-overlay');
        if (resultOverlay) {
            if (!auth.currentUser) resultOverlay.classList.remove('hidden');
            else resultOverlay.classList.add('hidden');
        }

        document.querySelector('.disease-title').textContent = data.disease_name;
        document.querySelector('.disease-latin').textContent = data.latin_name;
        document.querySelector('.confidence-badge').innerText = `%${data.confidence} Güven`;
        document.getElementById('result-img-mini').src = image;

        const list = document.querySelector('.step-list');
        list.innerHTML = '';
        data.treatment_steps.forEach((step, i) => {
            list.innerHTML += `<div class="step"><div class="step-num">${i + 1}</div><div class="step-text">${step}</div></div>`;
        });

        renderShareBtn();
        showScreen('screen-result');
    }

    function renderShareBtn() {
        const container = document.querySelector('.action-section');
        const old = document.getElementById('btn-share-result');
        if (old) old.remove();

        const btn = document.createElement('button');
        btn.id = 'btn-share-result';
        btn.className = 'btn-secondary';
        btn.innerHTML = 'Toplulukla Paylaş';
        btn.onclick = async () => {
            if (!auth.currentUser) return alert("Giriş yapın!");

            btn.innerText = "Kontrol Ediliyor...";
            const safe = await gemini.checkSafety(currentDiagnosis.description, currentDiagnosis.image);
            if (!safe) return alert("İçerik Uygunsuz Bulundu!");

            btn.innerText = "Paylaşılıyor...";
            await db.collection('posts').add({
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || 'Anonim',
                diseaseName: currentDiagnosis.disease_name,
                description: currentDiagnosis.description,
                imageUrl: currentDiagnosis.image,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Paylaşıldı!");
            showScreen('screen-community');
        };
        container.appendChild(btn);
    }

});

// --- PROFILE LOGIC ---
function loadProfile() {
    const user = auth.currentUser;
    if (!user) {
        showScreen('screen-login');
        return;
    }

    // Fill Header
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    if (nameEl) nameEl.innerText = user.displayName || 'Çiftçi Dostu';
    if (emailEl) emailEl.innerText = user.email;

    // Load My Posts
    const myFeed = document.getElementById('my-posts-feed');
    if (!myFeed) return;

    myFeed.innerHTML = '<div class="spinner"></div>';

    db.collection('posts')
        .where("userId", "==", user.uid)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            myFeed.innerHTML = '';
            if (snapshot.empty) {
                myFeed.innerHTML = `
                <div class="empty-state-profile">
                    <i class="ph-duotone ph-image"></i>
                    <p>Henüz bir bitki analizi paylaşmadınız.</p>
                </div>`;
                return;
            }

            snapshot.forEach(doc => {
                const post = doc.data();
                const dateStr = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : 'Az önce';
                const html = `
                <div class="post-card">
                    <div class="post-header">
                        <div class="avatar">${post.userAvatar || '👤'}</div>
                        <div class="user-info">
                            <h4>${post.userName}</h4>
                            <span class="time">${dateStr}</span>
                        </div>
                    </div>
                    <img src="${post.imageUrl}" class="post-image" alt="Hastalık">
                    <div class="post-content">
                        <h3>${post.diseaseName}</h3>
                        <p>${post.description}</p>
                    </div>
                </div>`;
                myFeed.innerHTML += html;
            });
        })
        .catch(err => {
            console.error("Error loading my posts:", err);
            myFeed.innerHTML = '<p>Gönderiler yüklenirken hata oluştu.</p>';
        });
}

// Logout Handler
const btnLogoutProfile = document.getElementById('btn-logout-profile');
if (btnLogoutProfile) btnLogoutProfile.addEventListener('click', () => {
    auth.signOut().then(() => {
        alert("Başarıyla çıkış yapıldı.");
        showScreen('screen-login');
    });
});
