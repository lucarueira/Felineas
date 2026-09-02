import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { resetState, setGMState, loadState, saveState } from './state.js';
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
    const bgMusic = document.getElementById('bg-music');

    // News Elements
    const loginNewsBox = document.getElementById('login-news-box');
    const loginNewsText = document.getElementById('login-news-text');
    const modalGmNews = document.getElementById('modal-gm-news');
    const gmNewsText = document.getElementById('gm-news-text');
    const btnSaveNews = document.getElementById('btn-save-news');
    const btnCloseNews = document.getElementById('btn-close-news');

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

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Load state from Firestore (or sync if local)
            await loadState(user.uid);
            
            let name = user.displayName || 'Guerreiro(a)';
            const welcomeMsg = document.getElementById('welcome-message');
            if (welcomeMsg) welcomeMsg.textContent = `🐾 Comandante ${name}`;
            
            // Stop music in game
            if (bgMusic) {
                bgMusic.pause();
                if(musicToggle) musicToggle.textContent = '🔈';
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
                // Autoplay may be blocked, so we catch the error
                bgMusic.play().then(() => {
                    if(musicToggle) musicToggle.textContent = '🔊';
                }).catch(e => {
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
                    const welcomeMsg = document.getElementById('welcome-message');
                    if (welcomeMsg) welcomeMsg.textContent = `🐾 Comandante ${name}`;
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

    // Global Dark Mode Toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
    }

    // Global Music Player Toggle
    if (musicToggle && bgMusic) {
        bgMusic.volume = 0.3;
        musicToggle.addEventListener('click', () => {
            if (bgMusic.paused) {
                bgMusic.play();
                musicToggle.textContent = '🔊';
            } else {
                bgMusic.pause();
                musicToggle.textContent = '🔈';
            }
        });
        
        // One-time click anywhere to start music if not playing on login
        document.body.addEventListener('click', function playMusicOnce() {
            if (!document.body.classList.contains('in-game') && bgMusic.paused) {
                bgMusic.play().then(() => {
                    if(musicToggle) musicToggle.textContent = '🔊';
                }).catch(e => {});
            }
            document.body.removeEventListener('click', playMusicOnce);
        }, { once: true });
    }
});
