import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { getState, resetState, setGMState, loadState, saveState, updateProfileState } from './state.js';
import { initGame, stopGame, updateResourceUI } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const authError = document.getElementById('auth-error');
    
    const catNameInput = document.getElementById('cat-name');
    const catEmailInput = document.getElementById('cat-email');
    const catSecretInput = document.getElementById('cat-secret');

    const topNav = document.querySelector('.top-nav');
    const leftPanel = document.querySelector('.left-panel');
    const loginScreen = document.getElementById('login-screen');
    const gameDashboard = document.getElementById('game-dashboard');
    const gmNewsBtn = document.getElementById('btn-gm-news');

    // Global UI Elements
    const musicToggle = document.getElementById('music-toggle');
    const gameMusicToggle = document.getElementById('game-music-toggle');
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
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.text) {
                    loginNewsBox.style.display = 'block';
                    loginNewsText.innerHTML = data.text.replace(/\n/g, '<br>');
                } else {
                    loginNewsBox.style.display = 'none';
                }
            } else {
                loginNewsBox.style.display = 'none';
            }
        } catch(e) {
            console.log("Erro ao carregar notícias (banco não configurado?).");
        }
    }

    loadNews();

    function showError(message) {
        authError.textContent = message;
        authError.style.display = 'block';
    }

    function hideError() {
        authError.style.display = 'none';
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
            // Load state from Firestore (or sync if local)
            await loadState(user.uid);
            
            updateProfileCardUI(user);

            // Stop music in game
            if (bgMusic) {
                bgMusic.pause();
                syncMusicUI();
            }

            // Update UI for Game Mode
            document.body.classList.add('in-game');
            loginScreen.style.display = 'none';
            if(topNav) topNav.style.display = 'none';
            if(leftPanel) leftPanel.style.display = 'none';
            gameDashboard.style.display = 'grid';

            // Check if GM
            if (user.email === 'gm@felineas.com') {
                setGMState();
                if(gmNewsBtn) gmNewsBtn.style.display = 'inline-block';
            } else {
                if(gmNewsBtn) gmNewsBtn.style.display = 'none';
            }

            // Start the game loop and render initial UI
            initGame();

        } else {
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
            gameDashboard.style.display = 'none';
            document.body.classList.remove('in-game');
            loginScreen.style.display = 'block';
            if(topNav) topNav.style.display = 'flex';
            if(leftPanel) leftPanel.style.display = 'block';
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
            const email = catEmailInput.value;
            if (!email) {
                showError("Digite seu e-mail no campo acima para redefinir o segredo.");
                return;
            }
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    alert("E-mail de redefinição de segredo enviado para " + email);
                })
                .catch((error) => {
                    showError("Erro ao redefinir segredo: " + error.message);
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

            const originalText = btnLogin.textContent;
            btnLogin.textContent = 'Afiando garras...';
            btnLogin.disabled = true;

            signInWithEmailAndPassword(auth, email, password)
                .then(() => {
                    btnLogin.textContent = originalText;
                    btnLogin.disabled = false;
                    loginForm.reset();
                })
                .catch((error) => {
                    btnLogin.textContent = originalText;
                    btnLogin.disabled = false;
                    if(error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                        showError("Credenciais inválidas. Verifique seu e-mail e senha.");
                    } else if(error.code === 'auth/invalid-email') {
                        showError("E-mail inválido.");
                    } else {
                        showError("Erro ao tentar entrar: " + error.message);
                    }
                });
        });
    }

    if (btnRegister) {
        btnRegister.addEventListener('click', (e) => {
            e.preventDefault();
            hideError();

            const name = catNameInput.value.trim();
            const email = catEmailInput.value.trim();
            const password = catSecretInput.value;

            if(!name || !email || !password) {
                showError("Preencha o Nome de Gato, e-mail e senha para se cadastrar.");
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
                    updateProfileCardUI(userCredential.user);
                })
                .then(() => {
                    btnRegister.textContent = originalText;
                    btnRegister.disabled = false;
                    loginForm.reset();
                })
                .catch((error) => {
                    btnRegister.textContent = originalText;
                    btnRegister.disabled = false;
                    if(error.code === 'auth/email-already-in-use') {
                        showError("Este e-mail já está em uso por outro gato.");
                    } else if(error.code === 'auth/weak-password') {
                        showError("A senha precisa ter pelo menos 6 caracteres.");
                    } else {
                        showError("Erro ao criar conta: " + error.message);
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
            signOut(auth).then(() => {
                logoutBtn.textContent = originalText;
                logoutBtn.disabled = false;
            }).catch((error) => {
                console.error("Erro ao sair:", error);
                logoutBtn.textContent = originalText;
                logoutBtn.disabled = false;
            });
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
                alert("Notícia publicada com sucesso!");
                modalGmNews.style.display = 'none';
            } catch (e) {
                alert("Erro ao publicar notícia: " + e.message + "\n\n(Aviso: Certifique-se de que as Regras de Segurança do Firestore estão configuradas para 'allow read, write: if true;' durante a fase de testes!)");
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
});
