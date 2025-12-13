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
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
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
            e.preventDefault(); // Prevent reload/jump
            const target = btn.dataset.target;
            showScreen(target);
        }
    });

    // --- LOCALIZATION ---
    let currentLang = 'tr';
    const TRANSLATIONS = {
        tr: {
            // Navigation
            home: "Ana Sayfa",
            community: "Topluluk",
            messages: "Mesajlar",
            profile: "Profilim",
            about: "Hakkında",

            // Buttons
            scan_now: "Hemen Tara",
            upload_title: "Fotoğraf Yükle",
            upload_drag: "Dokunun veya Fotoğrafı Buraya Sürükleyin",
            result: "Analiz Sonucu",
            login_prompt: "Giriş Yapmalısınız",
            login: "Giriş Yap",
            register: "Kayıt Ol",
            logout: "Çıkış Yap / Logout",
            send_msg: "Mesaj Gönder",
            type_msg: "Mesaj yazın...",
            premium_btn: "Premium'a Geç",

            // Rich Text Content (HTML)
            home_hero_title: "Bitkilerinizin <br> Sağlığını Koruyun",
            home_hero_desc: "Fotoğraf çekin, saniyeler içinde hastalık teşhisi ve tedavi önerileri alın.",
            about_header: "Proje Hakkında",
            about_content_html: `
                <div class="about-card quote-card">
                    <i class="ph-duotone ph-plant qt-icon"></i>
                    <p>Bu proje, tarım zararlılarının tespitini ve onlarla mücadeleyi kolaylaştırmak amacıyla yapay zeka tabanlı bir sistem geliştirilmesini kapsamaktadır.</p>
                </div>
                <div class="section-block">
                    <h3>🌱 Küresel Tarım Ağı</h3>
                    <p>PlantAI, tarımsal verimliliği artırmak ve ürün kayıplarını en aza indirmek için geliştirilmiş gelişmiş bir yapay zeka asistanıdır.</p>
                </div>
                <div class="section-block">
                    <h3>🌍 Kolektif Bilgi Gücü</h3>
                    <p>Sadece bir teşhis aracı değil, aynı zamanda dev bir çiftçi topluluğudur.</p>
                </div>
                <div class="section-block">
                    <h3>🎯 Misyonumuz</h3>
                    <p>Sürdürülebilir tarım için teknolojiyi herkesin cebine sokuyoruz.</p>
                </div>
            `,
            premium_content_html: `
                <h3>👑 Premium Özellikler</h3>
                <p>Sınırsız analiz, uzman ziraat mühendisi desteği ve detaylı raporlama.</p>
            `
        },
        en: {
            // Navigation
            home: "Home",
            community: "Community",
            messages: "Messages",
            profile: "My Profile",
            about: "About",

            // Buttons
            scan_now: "Scan Now",
            upload_title: "Upload Photo",
            upload_drag: "Tap or Drag Photo Here",
            result: "Analysis Result",
            login_prompt: "Login Required",
            login: "Login",
            register: "Register",
            logout: "Logout",
            send_msg: "Send Message",
            type_msg: "Type a message...",
            premium_btn: "Get Premium",

            // Rich Text Content (HTML)
            home_hero_title: "Protect Your <br> Plants' Health",
            home_hero_desc: "Snap a photo, get disease diagnosis and treatment suggestions in seconds.",
            about_header: "About Project",
            about_content_html: `
                <div class="about-card quote-card">
                    <i class="ph-duotone ph-plant qt-icon"></i>
                    <p>This project aims to facilitate the detection and control of agricultural pests using an AI-based system.</p>
                </div>
                <div class="section-block">
                    <h3>🌱 Global Agriculture Network</h3>
                    <p>PlantAI is an advanced AI assistant developed to increase agricultural productivity and minimize crop losses.</p>
                </div>
                <div class="section-block">
                    <h3>🌍 Collective Intelligence</h3>
                    <p>Not just a diagnostic tool, but a massive community of farmers.</p>
                </div>
                <div class="section-block">
                    <h3>🎯 Our Mission</h3>
                    <p>We are putting technology in everyone's pocket for sustainable agriculture.</p>
                </div>
            `,
            premium_content_html: `
                <h3>👑 Premium Features</h3>
                <p>Unlimited analysis, expert agronomist support, and detailed reporting.</p>
            `
        }
    };

    window.changeLanguage = function (lang) {
        currentLang = lang;
        const t = TRANSLATIONS[lang];

        // Simple Text Updates
        updateText('[data-i18n="home"]', t.home);
        updateText('[data-i18n="community"]', t.community);
        updateText('[data-i18n="messages"]', t.messages);
        updateText('[data-i18n="profile"]', t.profile);
        updateText('[data-i18n="about"]', t.about);

        updateText('[data-i18n="upload_title"]', t.upload_title);
        updateText('[data-i18n="upload_drag"]', t.upload_drag);
        updateText('[data-i18n="result"]', t.result);

        // Buttons
        updateText('#btn-start', '📷 ' + t.scan_now);
        updateText('#btn-logout-profile', t.logout);
        updateText('#btn-send-message', '💬 ' + t.send_msg);
        updateText('#btn-goto-support', '<i class="ph-bold ph-star"></i> ' + t.premium_btn);

        // Rich HTML Updates
        const homeTitle = document.querySelector('#screen-home h1');
        if (homeTitle) homeTitle.innerHTML = t.home_hero_title;

        const homeDesc = document.querySelector('#screen-home p');
        if (homeDesc) homeDesc.innerText = t.home_hero_desc;

        const aboutHeader = document.querySelector('#screen-about h2');
        if (aboutHeader) aboutHeader.innerText = t.about_header;

        // --- NEW: HTML INJECTION ---
        const aboutContainer = document.getElementById('about-text-container');
        if (aboutContainer && t.about_content_html) {
            aboutContainer.innerHTML = t.about_content_html;
        }

        console.log("Language switched to", lang);
    };

    function updateText(selector, text) {
        document.querySelectorAll(selector).forEach(el => {
            const icon = el.querySelector('i');
            el.innerHTML = '';
            if (icon) {
                el.appendChild(icon);
                el.appendChild(document.createTextNode(' ' + text));
            } else {
                el.innerText = text;
            }
        });
    }

    // --- 4. AUTH & EVENT BINDING (Consolidated) ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("🔧 Initializing Critical Events...");

        // Ensure Firebase is Ready (Retry if needed)
        if (!auth) {
            console.log("⚠️ Auth not ready, initializing...");
            initFirebase();
        }

        // --- GLOBAL SELECTORS ---
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const btnLoginResult = document.getElementById('btn-login-result');
        const loginLink = document.querySelector('a[data-target="screen-login"]');
        const gotoReg = document.getElementById('goto-register');
        const gotoLog = document.getElementById('goto-login');

        // --- NAVIGATION HELPERS ---
        if (gotoReg) gotoReg.addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-register'); });
        if (gotoLog) gotoLog.addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-login'); });

        // --- LOGIN FORM ---
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log("🚀 Login Submit Triggered");
                const email = document.getElementById('login-email').value;
                const pass = document.getElementById('login-password').value;

                auth.signInWithEmailAndPassword(email, pass)
                    .then((cred) => {
                        if (!cred.user.emailVerified) {
                            auth.signOut();
                            alert("Lütfen önce e-posta adresinizi onaylayın (Spam kutusunu kontrol edin).");
                            return;
                        }
                        console.log("✅ Login API Success");
                        // onAuthStateChanged will handle redirect
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Giriş Başarısız: " + err.message);
                    });
            });
        }

        // --- REGISTER FORM ---
        if (regForm) {
            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log("🚀 Register Submit Triggered");
                const email = document.getElementById('reg-email').value;
                const pass = document.getElementById('reg-password').value;
                const name = document.getElementById('reg-name').value;

                auth.createUserWithEmailAndPassword(email, pass)
                    .then(cred => {
                        return cred.user.updateProfile({ displayName: name }).then(() => cred.user);
                    })
                    .then((user) => {
                        user.sendEmailVerification();
                        document.getElementById('verify-email-text').innerText = email;
                        showScreen('screen-verify');
                    })
                    .catch(err => alert("Kayıt Başarısız: " + err.message));
            });
        }

        // --- RESULT OVERLAY LOGIN BTN ---
        if (btnLoginResult) {
            btnLoginResult.addEventListener('click', () => {
                console.log("Overlay Login Clicked");
                showScreen('screen-login');
            });
        }

        // --- SIDEBAR LOGIN LINK (Initial Bind) ---
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                // If logged out, prevent default and show login
                if (!auth.currentUser) {
                    e.preventDefault();
                    showScreen('screen-login');
                }
            });
        }

        // --- AUTH STATE LISTENER ---
        if (auth) {
            auth.onAuthStateChanged(user => {
                console.log("Auth State Logic -> User:", user ? user.email : "None");

                // 1. CSS VISIBILITY
                if (user) {
                    document.body.classList.add('is-logged-in');
                    document.body.classList.remove('is-logged-out');
                } else {
                    document.body.classList.remove('is-logged-in');
                    document.body.classList.add('is-logged-out');
                }

                // 2. SIDEBAR UPDATE
                if (loginLink) {
                    if (user) {
                        loginLink.innerHTML = '<i class="ph-bold ph-sign-out"></i> Çıkış Yap';
                        loginLink.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            auth.signOut().then(() => {
                                alert("Hoşçakalın! Çıkış yapıldı.");
                                showScreen('screen-login');
                            });
                        };
                    } else {
                        loginLink.innerHTML = '<i class="ph-bold ph-sign-in"></i> Giriş Yap / Kayıt Ol';
                        loginLink.onclick = (e) => {
                            e.preventDefault();
                            showScreen('screen-login');
                        };
                    }
                }

                // 3. REDIRECT / RESTORE LOGIC
                if (user) {
                    // Update Profile Header
                    if (typeof updateProfileUI === 'function') updateProfileUI(user);

                    // Unhide Community
                    const commContent = document.getElementById('community-content');
                    if (commContent) commContent.classList.remove('hidden');
                    const authWarn = document.getElementById('auth-warning');
                    if (authWarn) authWarn.classList.add('hidden');
                    const blur = document.getElementById('result-blur-overlay');
                    if (blur) blur.classList.add('hidden');

                    // Smart Redirect: Only redirect if stuck on Auth Screens
                    const activeScreen = document.querySelector('.screen.active');
                    if (activeScreen && ['screen-login', 'screen-register', 'screen-verify'].includes(activeScreen.id)) {
                        if (window.currentDiagnosis) {
                            console.log("Restoring pending diagnosis...");
                            showScreen('screen-result');
                        } else {
                            showScreen('screen-home');
                        }
                    }
                } else {
                    // Logged Out
                    const commContent = document.getElementById('community-content');
                    if (commContent) commContent.classList.add('hidden');
                    const authWarn = document.getElementById('auth-warning');
                    if (authWarn) authWarn.classList.remove('hidden');
                }
            });
        }

    });

    // --- HELPER FUNCTIONS (Hoisted) ---
    function updateProfileUI(user) {
        // Basic Profile UI Sync
        const nameEl = document.getElementById('profile-name');
        const emailEl = document.getElementById('profile-email');
        if (nameEl) nameEl.innerText = user.displayName || 'Çiftçi Dostu';
        if (emailEl) emailEl.innerText = user.email;

        // Avatar Sync
        const avatarEl = document.getElementById('current-user-avatar');
        if (avatarEl && user.photoURL) {
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
});
// --- RESTORED PROFILE LOGIC ---
function loadProfile() {
    // Priority: storedUser > auth.currentUser
    const user = (typeof storedUser !== 'undefined' ? storedUser : null) || auth.currentUser;

    console.log("Loading profile for:", user ? user.email : "No User");

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

    if (db) {
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
                    if (typeof renderPost === 'function') {
                        myFeed.innerHTML += renderPost(post);
                    }
                });
            })
            .catch(err => {
                console.error("Error loading my posts:", err);
                myFeed.innerHTML = '<p>Gönderiler yüklenirken hata oluştu.</p>';
            });
    }
}

// Logout Handler (Global Bind)
const btnLogoutProfile = document.getElementById('btn-logout-profile');
if (btnLogoutProfile) {
    btnLogoutProfile.addEventListener('click', () => {
        auth.signOut().then(() => {
            alert("Başarıyla çıkış yapıldı.");
            showScreen('screen-login');
        });
    });
}


