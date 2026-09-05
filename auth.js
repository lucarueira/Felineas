import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, updatePassword, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { getState, resetState, setGMState, loadState, saveState, updateProfileState, loadGlobalSettings, loadCustomItems, addGMLog, getRichestVillagesRanking } from './state.js';
import { initGame, stopGame, updateResourceUI } from './game.js';
import { initGM } from './gm.js';

function initAuth() {
    const loginForm = document.getElementById('login-form');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const authError = document.getElementById('auth-error');
    
    const catNameInput = document.getElementById('cat-name');
    const catEmailInput = document.getElementById('cat-email');
    const catSecretInput = document.getElementById('cat-secret');

    const topNav = document.querySelector('.top-nav');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.getElementById('login-gold-ranking');
    const loginScreen = document.getElementById('login-screen');
    const gameDashboard = document.getElementById('game-dashboard');
    const gmDashboard = document.getElementById('gm-dashboard');
    const gmNewsBtn = document.getElementById('btn-gm-news');

    // Ban modal elements
    const modalBanned = document.getElementById('modal-banned-account');
    const bannedReasonText = document.getElementById('banned-reason-text');
    const btnCloseBanned = document.getElementById('btn-close-banned');

    if (btnCloseBanned && modalBanned) {
        btnCloseBanned.addEventListener('click', () => {
            modalBanned.style.display = 'none';
        });
    }

    // --- Purga Automática de Contas Temporárias do Modo Rápido ---
    try {
        const rawCreds = localStorage.getItem('felineas_registered_accounts');
        if (rawCreds) {
            const parsed = JSON.parse(rawCreds);
            let modified = false;
            for (const k of Object.keys(parsed)) {
                if (k.endsWith('@felineas.local') || k === 'convidado_teste' || k === 'jogador_teste' || (parsed[k] && parsed[k].uid && (parsed[k].uid === 'convidado_teste' || parsed[k].uid.startsWith('jogador_teste')))) {
                    delete parsed[k];
                    modified = true;
                }
            }
            if (modified) {
                localStorage.setItem('felineas_registered_accounts', JSON.stringify(parsed));
            }
        }
    } catch(e) {}

    // --- Verificador de Link de Redefinição de Senha do Firebase (Action URL) ---
    const urlParams = new URLSearchParams(window.location.search);
    const authMode = urlParams.get('mode');
    const authActionCode = urlParams.get('oobCode');

    const modalResetPwd = document.getElementById('modal-reset-password');
    const formResetPwd = document.getElementById('form-reset-password');
    const inputResetNew = document.getElementById('reset-new-password');
    const inputResetConfirm = document.getElementById('reset-confirm-password');
    const resetFeedback = document.getElementById('reset-pwd-feedback');
    const btnCloseResetPwd = document.getElementById('btn-close-reset-pwd');
    const btnCancelResetPwd = document.getElementById('btn-cancel-reset-pwd');

    function closeResetModal() {
        if (modalResetPwd) modalResetPwd.style.display = 'none';
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    if (btnCloseResetPwd) btnCloseResetPwd.addEventListener('click', closeResetModal);
    if (btnCancelResetPwd) btnCancelResetPwd.addEventListener('click', closeResetModal);

    if (authMode === 'resetPassword' && authActionCode && modalResetPwd) {
        verifyPasswordResetCode(auth, authActionCode)
            .then(email => {
                modalResetPwd.style.display = 'flex';
                if (catEmailInput) catEmailInput.value = email;
            })
            .catch(err => {
                console.warn("Código de redefinição de senha inválido:", err);
                showError("O link de redefinição de senha expirou ou já foi utilizado. Solicite um novo link se precisar alterar a senha.");
            });

        if (formResetPwd) {
            formResetPwd.addEventListener('submit', (e) => {
                e.preventDefault();
                const newP = inputResetNew ? inputResetNew.value : '';
                const confP = inputResetConfirm ? inputResetConfirm.value : '';

                if (newP.length < 6) {
                    if (resetFeedback) {
                        resetFeedback.textContent = "A senha deve ter pelo menos 6 caracteres.";
                        resetFeedback.style.color = '#d9534f';
                        resetFeedback.style.display = 'block';
                    }
                    return;
                }
                if (newP !== confP) {
                    if (resetFeedback) {
                        resetFeedback.textContent = "As senhas não coincidem. Digite a mesma senha em ambos os campos.";
                        resetFeedback.style.color = '#d9534f';
                        resetFeedback.style.display = 'block';
                    }
                    return;
                }

                const btnConfirm = document.getElementById('btn-confirm-reset-pwd');
                if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.textContent = 'Salvando...'; }

                confirmPasswordReset(auth, authActionCode, newP)
                    .then(() => {
                        if (resetFeedback) {
                            resetFeedback.textContent = "✅ Senha alterada com sucesso! Você já pode entrar com seu e-mail e nova senha.";
                            resetFeedback.style.color = 'var(--success)';
                            resetFeedback.style.display = 'block';
                        }
                        if (catSecretInput) catSecretInput.value = newP;
                        setTimeout(() => {
                            closeResetModal();
                            if (btnLogin) btnLogin.focus();
                        }, 1800);
                    })
                    .catch(err => {
                        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.textContent = 'Salvar Nova Senha'; }
                        if (resetFeedback) {
                            resetFeedback.textContent = "Erro ao salvar nova senha: " + (err.message || err.code);
                            resetFeedback.style.color = '#d9534f';
                            resetFeedback.style.display = 'block';
                        }
                    });
            });
        }
    }

    // --- GM Panel Direct Switch Function ---
    let isTestSession = false;

    function openGMPanelDirectly(userObj) {
        isTestSession = true;
        document.body.classList.remove('in-game');
        document.body.classList.add('in-gm');
        if (loginScreen) loginScreen.style.display = 'none';
        if (topNav) topNav.style.display = 'none';
        if (leftPanel) leftPanel.style.display = 'none';
        if (rightPanel) rightPanel.style.display = 'none';
        if (gameDashboard) gameDashboard.style.display = 'none';
        if (gmDashboard) gmDashboard.style.display = 'flex';

        stopGame();
        initGM(userObj || auth.currentUser || { email: 'gm@felineas.com', displayName: 'GM Supremo' });
    }

    // --- Fast Direct Test / Guest Player Launcher ---
    async function enterAsTestPlayer(uid = 'convidado_teste', name = 'Líder Felino') {
        try {
            isTestSession = true;
            document.body.classList.remove('in-gm');
            document.body.classList.add('in-game');
            if (loginScreen) loginScreen.style.display = 'none';
            if (topNav) topNav.style.display = 'none';
            if (leftPanel) leftPanel.style.display = 'none';
            if (rightPanel) rightPanel.style.display = 'none';
            if (gmDashboard) gmDashboard.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'grid';

            // Stop background music
            if (bgMusic) {
                bgMusic.pause();
                syncMusicUI();
            }

            stopGame();
            const playerState = await loadState(uid);
            if (name) {
                if (!playerState.profile) playerState.profile = {};
                playerState.displayName = name;
            }

            try {
                await loadGlobalSettings();
                await loadCustomItems();
            } catch(e) {}

            updateProfileCardUI({ uid, displayName: name || 'Líder Felino', email: `${uid}@felineas.local` });
            initGame();
        } catch(e) {
            console.error("Erro ao entrar como jogador teste:", e);
            alert("Erro ao iniciar modo de teste: " + e.message);
        }
    }



    // Global UI Elements
    const musicToggle = document.getElementById('music-toggle');
    const gameMusicToggle = document.getElementById('game-music-toggle');
    const gmDarkModeToggle = document.getElementById('gm-dark-mode-toggle');
    const bgMusic = document.getElementById('bg-music');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const gameDarkModeToggle = document.getElementById('game-dark-mode-toggle');

    // News Elements
    const loginNewsBox = document.getElementById('login-news-box');
    const loginNewsText = document.getElementById('login-news-text');
    const modalGmNews = document.getElementById('modal-gm-news');
    const gmNewsText = document.getElementById('gm-news-text');
    const btnSaveNews = document.getElementById('btn-save-news');
    const btnCloseNews = document.getElementById('btn-close-news');

    // Profile Elements
    const profileCard = document.getElementById('profile-card');
    const modalProfile = document.getElementById('modal-profile');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const btnCloseProfile = document.getElementById('btn-close-profile');
    const profileFeedback = document.getElementById('profile-feedback');
    const profileNameInput = document.getElementById('profile-name-input');
    const profileTribeSelect = document.getElementById('profile-tribe-select');
    const profileNewPassword = document.getElementById('profile-new-password');
    const profileConfirmPassword = document.getElementById('profile-confirm-password');

    let currentSelectedAvatar = '🦁';

    // --- Dark Mode Synchronization ---
    function syncDarkModeUI() {
        const isDark = document.body.classList.contains('dark-mode');
        const icon = isDark ? '☀️' : '🌙';
        if (darkModeToggle) darkModeToggle.textContent = icon;
        if (gameDarkModeToggle) gameDarkModeToggle.textContent = icon;
        if (gmDarkModeToggle) gmDarkModeToggle.textContent = icon;
    }

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        syncDarkModeUI();
        try {
            localStorage.setItem('felineas_dark_mode', document.body.classList.contains('dark-mode') ? '1' : '0');
        } catch(e) {}
    }

    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
    if (gameDarkModeToggle) gameDarkModeToggle.addEventListener('click', toggleDarkMode);
    if (gmDarkModeToggle) gmDarkModeToggle.addEventListener('click', toggleDarkMode);

    if (localStorage.getItem('felineas_dark_mode') === '1') {
        document.body.classList.add('dark-mode');
        syncDarkModeUI();
    }

    // --- Music Synchronization ---
    function syncMusicUI() {
        if (!bgMusic) return;
        const icon = bgMusic.paused ? '🔈' : '🔊';
        if (musicToggle) musicToggle.textContent = icon;
        if (gameMusicToggle) gameMusicToggle.textContent = icon;
    }

    function toggleMusic() {
        if (!bgMusic) return;
        if (bgMusic.paused) {
            bgMusic.play().then(() => syncMusicUI()).catch(() => {});
        } else {
            bgMusic.pause();
            syncMusicUI();
        }
    }

    if (bgMusic) bgMusic.volume = 0.3;
    if (musicToggle) musicToggle.addEventListener('click', toggleMusic);
    if (gameMusicToggle) gameMusicToggle.addEventListener('click', toggleMusic);

    // One-time click anywhere to start music if not playing on login
    document.body.addEventListener('click', function playMusicOnce() {
        if (!document.body.classList.contains('in-game') && bgMusic && bgMusic.paused) {
            bgMusic.play().then(() => syncMusicUI()).catch(e => {});
        }
        document.body.removeEventListener('click', playMusicOnce);
    }, { once: true });

    // --- News Loading ---
    async function loadNews() {
        try {
            const docRef = doc(db, "global", "news");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().text) {
                loginNewsBox.style.display = 'block';
                loginNewsText.innerHTML = docSnap.data().text.replace(/\n/g, '<br>');
                return;
            }
        } catch(e) {
            console.log("Aviso ao carregar notícias do Firestore, tentando local:", e);
        }

        const localNews = localStorage.getItem('felineas_global_news');
        if (localNews && loginNewsBox && loginNewsText) {
            loginNewsBox.style.display = 'block';
            loginNewsText.innerHTML = localNews.replace(/\n/g, '<br>');
        } else if (loginNewsBox) {
            loginNewsBox.style.display = 'none';
        }
    }

    loadNews();

    // --- Public Gold Ranking on Login Screen ---
    async function renderHomeGoldRanking() {
        const listContainer = document.getElementById('login-gold-ranking-list');
        if (!listContainer) return;

        try {
            listContainer.innerHTML = '<div style="text-align: center; padding: 25px; color: var(--text-secondary); font-size: 0.9rem;"><span>Buscando os nobres mais ricos... 🐾</span></div>';
            const list = await getRichestVillagesRanking(10);
            if (!list || list.length === 0) {
                listContainer.innerHTML = '<div style="text-align: center; padding: 25px; color: var(--text-secondary); font-size: 0.9rem;">Nenhuma vila registrada ainda.<br><span style="font-size: 0.8rem; color: var(--wood-dark);">Seja o primeiro a forjar ouro e liderar o ranking!</span></div>';
                return;
            }

            listContainer.innerHTML = list.map((v, idx) => {
                const rankNum = idx + 1;
                const medal = rankNum === 1 ? '🥇' : (rankNum === 2 ? '🥈' : (rankNum === 3 ? '🥉' : `${rankNum}º`));
                const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
                const safeName = (v.displayName || 'Líder Felino').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const safeTribe = (v.tribe || 'Pata-Dourada').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const goldDisplay = (v.gold || 0).toLocaleString('pt-BR');

                return `
                    <div class="gold-ranking-item ${rankClass}">
                        <div class="gold-rank-pos">${medal}</div>
                        <div class="gold-rank-info">
                            <span class="gold-rank-avatar">${v.avatar || '🐱'}</span>
                            <div class="gold-rank-name-box">
                                <div class="gold-rank-leader-line" style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 0.75rem; color: var(--gold); font-weight: 800;">👑 Líder:</span>
                                    <strong class="gold-rank-name" title="${safeName}">${safeName}</strong>
                                </div>
                                <span class="gold-rank-tribe">${safeTribe} • Nv. ${v.level || 1}</span>
                            </div>
                        </div>
                        <div class="gold-rank-val" title="${goldDisplay} moedas de ouro">
                            🪙 ${goldDisplay}
                        </div>
                    </div>
                `;
            }).join('');

        } catch(e) {
            console.warn("Erro ao renderizar ranking de ouro:", e);
            listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 0.85rem;">Não foi possível carregar o ranking no momento.</div>';
        }
    }

    const btnRefreshRanking = document.getElementById('btn-refresh-gold-ranking');
    if (btnRefreshRanking) {
        btnRefreshRanking.addEventListener('click', () => {
            btnRefreshRanking.classList.add('rotating');
            renderHomeGoldRanking().finally(() => {
                setTimeout(() => btnRefreshRanking.classList.remove('rotating'), 500);
            });
        });
    }

    // Carregar ranking inicial no carregamento da tela
    renderHomeGoldRanking();

    function showError(message, isHtml = false) {
        if (!authError) return;
        if (isHtml) {
            authError.innerHTML = message;
        } else {
            authError.textContent = message;
        }
        authError.style.display = 'block';
    }

    function hideError() {
        if (authError) authError.style.display = 'none';
    }

    // --- Profile Card UI Update ---
    function updateProfileCardUI(user) {
        const state = getState();
        const avatar = state.profile?.avatar || '🦁';
        const name = user?.displayName || 'Comandante';
        const tribe = state.profile?.tribe || 'Pata-Dourada';
        const role = state.profile?.title || 'Líder da Vila';

        const elAvatar = document.getElementById('profile-avatar-display');
        const elName = document.getElementById('profile-name-display');
        const elTribe = document.getElementById('profile-tribe-display');
        const elRole = document.getElementById('profile-role-display');

        if (elAvatar) elAvatar.textContent = avatar;
        if (elName) elName.textContent = name;
        if (elTribe) elTribe.textContent = `🐾 ${tribe}`;
        if (elRole) elRole.textContent = role;

        const elLevel = document.getElementById('profile-level-badge');
        const elFill = document.getElementById('profile-xp-fill');
        const elText = document.getElementById('profile-xp-text');
        if (elLevel && state.account) elLevel.textContent = `Nv. ${state.account.level}`;
        if (elText && state.account) elText.textContent = `${state.account.xp} / ${state.account.xpToNextLevel}`;
        if (elFill && state.account) {
            const pct = Math.min(100, Math.max(0, (state.account.xp / state.account.xpToNextLevel) * 100));
            elFill.style.width = `${pct}%`;
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            isTestSession = false;
            // Stop background music
            if (bgMusic) {
                bgMusic.pause();
                syncMusicUI();
            }

            // Check if GM Account
            if (user.email === 'gm@felineas.com') {
                openGMPanelDirectly(user);
                return;
            }

            // --- Regular Player Flow ---
            if (gmDashboard) gmDashboard.style.display = 'none';
            document.body.classList.remove('in-gm');

            try {
                // Load player state
                const playerState = await loadState(user.uid);

                // Ban check
                if (playerState && playerState.isBanned) {
                    if (bannedReasonText) {
                        bannedReasonText.textContent = playerState.banReason || 'Violação das regras do reino imposta pelo GM.';
                    }
                    if (modalBanned) {
                        modalBanned.style.display = 'flex';
                    }
                    // Desconectar o jogador banido imediatamente
                    await signOut(auth);
                    return;
                }

                // Load global settings (farm rates, xp rates, broadcast) and custom items
                await loadGlobalSettings().catch(e => console.warn("Aviso ao carregar configs globais:", e));
                await loadCustomItems().catch(e => console.warn("Aviso ao carregar itens custom:", e));
            } catch (err) {
                console.warn("Aviso ao carregar estado do jogador:", err);
            }

            updateProfileCardUI(user);

            // Update UI for Game Mode
            document.body.classList.add('in-game');
            if (loginScreen) loginScreen.style.display = 'none';
            if (topNav) topNav.style.display = 'none';
            if (leftPanel) leftPanel.style.display = 'none';
            if (rightPanel) rightPanel.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'grid';

            if (gmNewsBtn) gmNewsBtn.style.display = 'none';

            // Start the game loop and render initial UI
            initGame();

        } else {
            // Se já estamos em sessão de teste (convidado ou GM offline), não derruba a sessão
            if (isTestSession || document.body.classList.contains('in-game') || document.body.classList.contains('in-gm')) {
                return;
            }

            // Clear memory
            stopGame();
            resetState();

            // Try to play music on login screen
            if (bgMusic) {
                bgMusic.play().then(() => syncMusicUI()).catch(e => {
                    console.log("Autoplay bloqueado pelo navegador. Usuário precisa clicar.");
                });
            }

            // Switch UI back to login
            if (gmDashboard) gmDashboard.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'none';
            document.body.classList.remove('in-game', 'in-gm');
            if (loginScreen) loginScreen.style.display = 'block';
            if (topNav) topNav.style.display = 'flex';
            if (leftPanel) leftPanel.style.display = 'block';
            if (rightPanel) rightPanel.style.display = 'flex';
            renderHomeGoldRanking();
        }
    });

    // --- Profile Modal Handling ---
    document.querySelectorAll('.avatar-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentSelectedAvatar = btn.getAttribute('data-avatar');
        });
    });

    if (profileCard && modalProfile) {
        profileCard.addEventListener('click', () => {
            const user = auth.currentUser;
            const state = getState();
            if (profileNameInput) profileNameInput.value = user?.displayName || '';
            if (profileTribeSelect && state.profile?.tribe) {
                profileTribeSelect.value = state.profile.tribe;
            }
            currentSelectedAvatar = state.profile?.avatar || '🦁';
            document.querySelectorAll('.avatar-option-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.getAttribute('data-avatar') === currentSelectedAvatar);
            });
            if (profileNewPassword) profileNewPassword.value = '';
            if (profileConfirmPassword) profileConfirmPassword.value = '';
            if (profileFeedback) profileFeedback.style.display = 'none';

            modalProfile.style.display = 'flex';
        });
    }

    if (btnCloseProfile && modalProfile) {
        btnCloseProfile.addEventListener('click', () => {
            modalProfile.style.display = 'none';
        });
    }

    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;

            const newName = profileNameInput ? profileNameInput.value.trim() : '';
            const newTribe = profileTribeSelect ? profileTribeSelect.value : 'Pata-Dourada';
            const newPass = profileNewPassword ? profileNewPassword.value : '';
            const confirmPass = profileConfirmPassword ? profileConfirmPassword.value : '';

            btnSaveProfile.disabled = true;
            btnSaveProfile.textContent = 'Salvando...';

            function showProfileFeedback(msg, isSuccess = false) {
                if (!profileFeedback) return;
                profileFeedback.textContent = msg;
                profileFeedback.style.color = isSuccess ? 'var(--success)' : '#d9534f';
                profileFeedback.style.display = 'block';
            }

            try {
                // 1. Update Display Name if changed
                if (newName && newName !== user.displayName) {
                    await updateProfile(user, { displayName: newName });
                }

                // 2. Update Password if provided
                if (newPass) {
                    if (newPass.length < 6) {
                        showProfileFeedback("A nova senha deve ter pelo menos 6 caracteres.");
                        btnSaveProfile.disabled = false;
                        btnSaveProfile.textContent = 'Salvar Alterações';
                        return;
                    }
                    if (newPass !== confirmPass) {
                        showProfileFeedback("As senhas não coincidem. Digite a mesma senha em ambos os campos.");
                        btnSaveProfile.disabled = false;
                        btnSaveProfile.textContent = 'Salvar Alterações';
                        return;
                    }
                    try {
                        await updatePassword(user, newPass);
                    } catch(passErr) {
                        if (passErr.code === 'auth/requires-recent-login') {
                            showProfileFeedback("Por segurança, saia e faça login novamente para alterar a senha.");
                            btnSaveProfile.disabled = false;
                            btnSaveProfile.textContent = 'Salvar Alterações';
                            return;
                        } else {
                            throw passErr;
                        }
                    }
                }

                // 3. Update Profile state in Firestore
                updateProfileState({
                    avatar: currentSelectedAvatar,
                    tribe: newTribe
                });

                updateProfileCardUI(user);
                showProfileFeedback("Perfil atualizado com sucesso! 🐾", true);

                setTimeout(() => {
                    if (modalProfile) modalProfile.style.display = 'none';
                    btnSaveProfile.disabled = false;
                    btnSaveProfile.textContent = 'Salvar Alterações';
                }, 1000);

            } catch(err) {
                console.error("Erro ao salvar perfil:", err);
                showProfileFeedback("Erro ao atualizar perfil: " + err.message);
                btnSaveProfile.disabled = false;
                btnSaveProfile.textContent = 'Salvar Alterações';
            }
        });
    }

    // Handle Forgot Password
    const forgotPwdBtn = document.querySelector('.forgot-password');
    if (forgotPwdBtn) {
        forgotPwdBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = catEmailInput.value ? catEmailInput.value.trim() : '';
            if (!email) {
                showError("Digite seu e-mail no campo acima para enviarmos o link de redefinição de senha.");
                return;
            }
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    alert("📧 E-mail de redefinição de segredo enviado para:\n" + email + "\n\nAbra sua caixa de entrada e clique no link para definir sua nova senha. Em seguida, volte aqui e entre com ela!");
                })
                .catch((error) => {
                    if (error.code === 'auth/unauthorized-domain') {
                        showError("⚠️ O domínio do Netlify precisa ser adicionado no Console do Firebase (Authentication > Settings > Authorized Domains) para permitir envio de e-mails.", true);
                    } else if (error.code === 'auth/user-not-found') {
                        showError("Nenhuma conta felina encontrada com este e-mail.");
                    } else {
                        showError("Erro ao enviar e-mail de redefinição: " + error.message);
                    }
                });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            hideError();
            
            const email = catEmailInput.value.trim();
            const password = catSecretInput.value;
            
            if(!email || !password) {
                showError("Preencha o e-mail e a senha para entrar.");
                return;
            }

            const emailLower = email.toLowerCase();
            let registeredAccounts = {};
            try {
                registeredAccounts = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
            } catch(e) {}
            const localAcc = registeredAccounts[emailLower];

            // 1. Verificação Estrita de Game Master ou Administrador (ADM)
            if (emailLower === 'gm@felineas.com' || emailLower === 'admin@felineas.com' || emailLower === 'gm' || emailLower === 'admin' || (localAcc && localAcc.isAdmin)) {
                const validPass = (localAcc && localAcc.password) ? localAcc.password : 'gm123';
                if (password === validPass || password === 'gm123' || password === 'admin123') {
                    addGMLog('auth', 'Login Realizado', `👑 Administrador "${emailLower}" conectou-se ao Painel de GM com sucesso.`, emailLower);
                    openGMPanelDirectly(localAcc || { uid: 'gm_master', email: 'gm@felineas.com', displayName: 'GM Supremo' });
                    loginForm.reset();
                    return;
                } else {
                    showError("Senha de Game Master incorreta. Verifique o segredo mestre.");
                    return;
                }
            }

            const originalText = btnLogin.textContent;
            btnLogin.textContent = 'Afiando garras...';
            btnLogin.disabled = true;

            // 2. Autenticação Primária Oficial no Firebase Auth
            signInWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    btnLogin.textContent = originalText;
                    btnLogin.disabled = false;
                    hideError();
                    loginForm.reset();

                    // Sincroniza senha nova no cache local para nunca divergir
                    try {
                        let regAccs = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
                        regAccs[emailLower] = {
                            uid: userCredential.user.uid,
                            email: emailLower,
                            password: password,
                            displayName: userCredential.user.displayName || emailLower,
                            role: 'player',
                            isAdmin: false
                        };
                        localStorage.setItem('felineas_registered_accounts', JSON.stringify(regAccs));
                    } catch(e) {}

                    const uName = userCredential.user.displayName || emailLower;
                    await addGMLog('auth', 'Login Realizado', `Jogador "${uName}" entrou no reino online.`, uName);
                })
                .catch((error) => {
                    btnLogin.textContent = originalText;
                    btnLogin.disabled = false;
                    console.warn("Aviso Firebase no login:", error);

                    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        showError("Senha incorreta. Se você alterou sua senha recentemente pelo e-mail, digite a nova senha.");
                    } else if (error.code === 'auth/user-not-found') {
                        showError("Nenhuma conta encontrada com este e-mail. Clique no botão 'Cadastrar-se' para criar sua conta oficial.");
                    } else if (error.code === 'auth/unauthorized-domain') {
                        showError(`
                            ⚠️ <strong>Domínio não autorizado no Firebase Auth!</strong><br>
                            <span style="font-size: 0.85rem; font-weight: normal;">Acesse o <strong>Firebase Console</strong> &gt; Authentication &gt; Configurações (Settings) &gt; <strong>Domínios Autorizados</strong> e adicione o endereço deste site (ex: seu-site.netlify.app).</span>
                        `, true);
                    } else if (error.code === 'auth/invalid-email') {
                        showError("Formato de e-mail inválido. Digite um e-mail válido (ex: seu_nome@email.com).");
                    } else if (error.code === 'auth/too-many-requests') {
                        showError("Muitas tentativas sem sucesso. Por segurança, aguarde alguns instantes antes de tentar novamente.");
                    } else if (error.code === 'auth/network-request-failed') {
                        // Fallback somente se não houver conexão de rede E houver credencial registrada que bata com a senha
                        if (localAcc && localAcc.password === password) {
                            showError("Rede indisponível: Conectando com a conta local offline...");
                            setTimeout(() => {
                                enterAsTestPlayer(localAcc.uid, localAcc.displayName);
                                loginForm.reset();
                            }, 800);
                        } else {
                            showError("Falha na conexão com os servidores do reino. Verifique sua conexão com a internet.");
                        }
                    } else {
                        showError(`Erro ao entrar: ${error.message || error.code}`);
                    }
                });
        });
    }

    if (btnRegister) {
        btnRegister.addEventListener('click', (e) => {
            e.preventDefault();
            hideError();

            const name = (catNameInput ? catNameInput.value.trim() : '') || 'Líder Felino';
            const email = catEmailInput.value.trim();
            const password = catSecretInput.value;

            if(!email || !password) {
                showError("Preencha o e-mail e a senha para se cadastrar.");
                return;
            }

            if(password.length < 6) {
                showError("O segredo (senha) deve conter no mínimo 6 caracteres.");
                return;
            }

            const originalText = btnRegister.textContent;
            btnRegister.textContent = 'Criando conta...';
            btnRegister.disabled = true;

            createUserWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    await updateProfile(userCredential.user, {
                        displayName: name
                    });

                    // Registra a conta nos dados locais para sincronização
                    try {
                        let regAccs = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
                        regAccs[email.toLowerCase()] = {
                            uid: userCredential.user.uid,
                            email: email.toLowerCase(),
                            password: password,
                            displayName: name,
                            role: 'player',
                            isAdmin: false
                        };
                        localStorage.setItem('felineas_registered_accounts', JSON.stringify(regAccs));
                    } catch(e) {}

                    // Salva a vila no Firestore imediatamente com o nome correto
                    await saveState();
                    updateProfileCardUI(userCredential.user);
                    await addGMLog('auth', 'Cadastro Realizado', `Nova conta "${name}" (${email}) registrada no reino.`, name);
                })
                .then(() => {
                    btnRegister.textContent = originalText;
                    btnRegister.disabled = false;
                    loginForm.reset();
                })
                .catch((error) => {
                    btnRegister.textContent = originalText;
                    btnRegister.disabled = false;
                    console.warn("Aviso Firebase no cadastro:", error);

                    if (error.code === 'auth/email-already-in-use') {
                        showError("Este e-mail já está cadastrado no reino! Entre com sua senha ou clique em 'Esqueceu o Segredo?' para recuperá-la.");
                    } else if (error.code === 'auth/weak-password') {
                        showError("O segredo escolhido é fraco. Digite uma senha com pelo menos 6 caracteres.");
                    } else if (error.code === 'auth/invalid-email') {
                        showError("Formato de e-mail inválido. Verifique o endereço digitado.");
                    } else if (error.code === 'auth/unauthorized-domain') {
                        showError(`
                            ⚠️ <strong>Domínio não autorizado no Firebase!</strong><br>
                            <span style="font-size: 0.85rem; font-weight: normal;">Acesse o <strong>Firebase Console</strong> &gt; Authentication &gt; Configurações (Settings) &gt; <strong>Domínios Autorizados</strong> e adicione o endereço deste site (ex: seu-site.netlify.app).</span>
                        `, true);
                    } else {
                        showError(`Erro ao registrar conta: ${error.message || error.code}`);
                    }
                });
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const originalText = logoutBtn.textContent;
            logoutBtn.textContent = 'Salvando...';
            logoutBtn.disabled = true;
            try {
                await saveState();
            } catch(e) {
                console.warn("Erro ao salvar antes de deslogar:", e);
            }
            isTestSession = false;
            try {
                if (auth && auth.currentUser) {
                    await signOut(auth);
                }
            } catch(e) {
                console.warn("Aviso ao sair do auth:", e);
            }
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;

            stopGame();
            resetState();
            if (gmDashboard) gmDashboard.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'none';
            document.body.classList.remove('in-game', 'in-gm');
            if (loginScreen) loginScreen.style.display = 'block';
            if (topNav) topNav.style.display = 'flex';
            if (leftPanel) leftPanel.style.display = 'block';
            if (rightPanel) rightPanel.style.display = 'flex';
            renderHomeGoldRanking();
            if (bgMusic) {
                bgMusic.play().then(() => syncMusicUI()).catch(() => {});
            }
        });
    }

    // Salvar estado ao fechar aba ou mudar de visibilidade
    window.addEventListener('beforeunload', () => {
        saveState();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveState();
        }
    });

    // GM News Modal Logic
    if (gmNewsBtn) {
        gmNewsBtn.addEventListener('click', () => {
            modalGmNews.style.display = 'flex';
        });
    }

    if (btnCloseNews) {
        btnCloseNews.addEventListener('click', () => {
            modalGmNews.style.display = 'none';
        });
    }

    if (btnSaveNews) {
        btnSaveNews.addEventListener('click', async () => {
            const text = gmNewsText.value;
            const originalBtn = btnSaveNews.textContent;
            btnSaveNews.textContent = 'Salvando...';
            btnSaveNews.disabled = true;

            try {
                await setDoc(doc(db, "global", "news"), { text: text });
                alert("Notícia publicada com sucesso no banco de dados!");
                modalGmNews.style.display = 'none';
            } catch (e) {
                console.warn("Aviso Firestore na notícia:", e);
                try {
                    localStorage.setItem('felineas_global_news', text);
                } catch(err) {}
                alert("📢 Notícia salva com sucesso localmente!\n\n(Para sincronizar online com todos os jogadores na nuvem, lembre-se de clicar em 'Publicar' na aba Regras do Console do Firebase).");
                modalGmNews.style.display = 'none';
            }
            
            btnSaveNews.textContent = originalBtn;
            btnSaveNews.disabled = false;
        });
    }

    // Ear interaction
    const leftEar = document.querySelector('.ear.left');
    const rightEar = document.querySelector('.ear.right');
    document.addEventListener('mousemove', (e) => {
        if(!leftEar || !rightEar) return;
        const x = e.clientX / window.innerWidth - 0.5;
        leftEar.style.transform = `rotate(${-15 + (x * 10)}deg) skewX(20deg)`;
        rightEar.style.transform = `rotate(${15 + (x * 10)}deg) skewX(-20deg)`;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
