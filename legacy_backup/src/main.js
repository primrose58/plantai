import { GeminiService } from './services/ai.js';
import { initFirebase } from './services/firebase.js';
import { AuthService } from './services/auth.js';
import { CommunityService } from './services/community.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Services
    const isFirebaseReady = initFirebase();
    const gemini = new GeminiService();
    let authService, communityService;
    let currentDiagnosis = null; // Store last diagnosis to share

    // 2. Register Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // 3. UI References
    const screens = document.querySelectorAll('.screen');
    const bottomNavItems = document.querySelectorAll('.nav-item');
    const authWarning = document.getElementById('auth-warning');
    const communityContent = document.getElementById('community-content');
    const btnShareDiagnosis = document.getElementById('btn-share-diagnosis');

    // 4. Navigation
    function showScreen(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');

        // Update Bottom Nav
        bottomNavItems.forEach(item => {
            if (item.dataset.target === screenId) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Special Case: Community Feed Refresh
        if (screenId === 'screen-community' && isFirebaseReady) {
            checkAuthAndLoadCommunity();
        }
    }

    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if (target) showScreen(target);
        });
    });

    // 5. Auth Logic
    if (isFirebaseReady) {
        authService = new AuthService((user) => {
            updateAuthUI(user);
        });
        communityService = new CommunityService();

        // Login Form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            try {
                await authService.login(email, pass);
                alert("Giriş Başarılı!");
                showScreen('screen-home');
            } catch (err) {
                alert("Hata: " + err.message);
            }
        });

        // Register Form
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            try {
                await authService.register(email, pass, name);
                alert("Kayıt Başarılı!");
                showScreen('screen-home');
            } catch (err) {
                alert("Hata: " + err.message);
            }
        });
    }

    function updateAuthUI(user) {
        if (user) {
            authWarning.classList.add('hidden');
            communityContent.classList.remove('hidden');
            if (communityService) renderCommunityFeed();
        } else {
            authWarning.classList.remove('hidden');
            communityContent.classList.add('hidden');
        }
    }

    function checkAuthAndLoadCommunity() {
        if (authService && authService.isAuthenticated()) {
            renderCommunityFeed();
        }
    }

    // 6. Community Feed
    function renderCommunityFeed() {
        const feedContainer = document.getElementById('community-feed');
        communityService.subscribeToFeed((posts) => {
            feedContainer.innerHTML = '';
            posts.forEach(post => {
                const date = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Az önce';
                const html = `
                    <div class="post-card">
                        <div class="post-header">
                            <div class="avatar">${post.userAvatar || '👤'}</div>
                            <div class="user-info">
                                <h4>${post.userName}</h4>
                                <span>${date}</span>
                            </div>
                        </div>
                        <div class="post-content">
                            <h3>${post.diseaseName}</h3>
                            <p>${post.description}</p>
                            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" loading="lazy">` : ''}
                        </div>
                        <div class="post-actions">
                            <div class="action-btn"><i class="ph-bold ph-heart"></i> ${post.likes}</div>
                            <div class="action-btn"><i class="ph-bold ph-chat-circle"></i> ${post.comments}</div>
                        </div>
                    </div>
                `;
                feedContainer.innerHTML += html;
            });
        });
    }

    // 7. Image Handling & AI
    const fileInput = document.getElementById('file-input');
    const cameraInput = document.getElementById('camera-input');
    const scanPreview = document.getElementById('scan-preview-img');
    const scanText = document.getElementById('scan-text');

    const handleFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            scanPreview.src = base64;
            startDiagnosis(base64);
        };
        reader.readAsDataURL(file);
    };

    if (document.getElementById('btn-browse')) document.getElementById('btn-browse').addEventListener('click', () => fileInput.click());
    if (document.getElementById('btn-camera')) document.getElementById('btn-camera').addEventListener('click', () => cameraInput.click());

    if (fileInput) fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    if (cameraInput) cameraInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    async function startDiagnosis(base64Image) {
        showScreen('screen-scanning');
        scanText.textContent = "Yapay Zeka Fotoğrafı İnceliyor...";

        try {
            const result = await gemini.analyzePlant(base64Image, 'tr');

            if (result.error === 'NOT_PLANT') {
                alert("Bu görselde bir bitki tespit edilemedi.");
                showScreen('screen-upload');
                return;
            }

            currentDiagnosis = { ...result, image: base64Image };
            displayResult(result, base64Image);
        } catch (error) {
            console.error(error);
            alert("Analiz hatası: " + error.message);
            showScreen('screen-upload');
        }
    }

    function displayResult(data, imageSrc) {
        document.querySelector('.disease-title').textContent = data.disease_name;
        document.querySelector('.disease-latin').textContent = data.latin_name;
        document.querySelector('.confidence-badge').innerHTML = `<i class="ph-fill ph-check-circle"></i> %${data.confidence} Güven`;
        document.getElementById('result-img-mini').src = imageSrc;

        const indicators = document.querySelectorAll('.indicator .fill');
        if (indicators.length >= 2) {
            indicators[0].style.width = `${data.urgency}%`;
            indicators[1].style.width = `${data.spread_risk}%`;
        }

        const stepList = document.querySelector('.step-list');
        stepList.innerHTML = '';
        data.treatment_steps.forEach((step, index) => {
            const div = document.createElement('div');
            div.className = 'step';
            div.innerHTML = `<div class="step-num">${index + 1}</div><div class="step-text">${step}</div>`;
            stepList.appendChild(div);
        });

        showScreen('screen-result');

        // Enable Sharing if logged in
        renderShareButton();
    }

    function renderShareButton() {
        const actionSection = document.querySelector('.action-section');
        // Remove old button if exists
        const oldBtn = document.getElementById('btn-share-result');
        if (oldBtn) oldBtn.remove();

        const btnShare = document.createElement('button');
        btnShare.id = 'btn-share-result';
        btnShare.className = 'btn-secondary';
        btnShare.style.marginTop = '1rem';
        btnShare.innerHTML = `<i class="ph-bold ph-share-network"></i> Toplulukla Paylaş`;

        btnShare.addEventListener('click', async () => {
            if (!authService || !authService.isAuthenticated()) {
                alert("Paylaşmak için önce giriş yapmalısınız.");
                showScreen('screen-login');
                return;
            }
            try {
                btnShare.disabled = true;
                btnShare.textContent = "Güvenlik Kontrolü...";

                // 1. Moderate Content
                const description = currentDiagnosis.description || "";
                const isSafe = await gemini.checkSafety(description, currentDiagnosis.image);

                if (!isSafe) {
                    alert("⚠️ İçerik Paylaşılamadı: Yapay zeka bu içeriğin topluluk kurallarına aykırı olabileceğini tespit etti (+18, şiddet veya uygunsuz içerik).");
                    btnShare.disabled = false;
                    btnShare.textContent = "Tekrar Dene";
                    return;
                }

                btnShare.textContent = "Paylaşılıyor...";
                await communityService.sharePost(currentDiagnosis, currentDiagnosis.image);
                alert("Başarıyla Paylaşıldı!");
                showScreen('screen-community');
            } catch (e) {
                alert("Hata: " + e.message);
                btnShare.disabled = false;
            }
        });

        actionSection.appendChild(btnShare);
    }
});
