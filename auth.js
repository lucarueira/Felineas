import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { resetState, setGMState, loadState } from './state.js';
import { initGame, stopGame, updateResourceUI } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const authError = document.getElementById('auth-error');
    
    const catNameInput = document.getElementById('cat-name');
    const catEmailInput = document.getElementById('cat-email');
    const catSecretInput = document.getElementById('cat-secret');

    // UI elements to toggle
    const topNav = document.querySelector('.top-nav');
    const leftPanel = document.querySelector('.left-panel');
    const loginScreen = document.getElementById('login-screen');
    const gameDashboard = document.getElementById('game-dashboard');
    const gmNewsBtn = document.getElementById('btn-gm-news');

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
            // Load state from Firestore
            await loadState(user.uid);
            
            let name = user.displayName || 'Guerreiro(a)';
            
            if (user.email === 'gm@felineas.com') {
                name = '👑 DEUS GM';
                setGMState();
                if(gmNewsBtn) gmNewsBtn.style.display = 'inline-block';
            } else {
                if(gmNewsBtn) gmNewsBtn.style.display = 'none';
            }
            
            document.getElementById('welcome-message').textContent = `Comandante ${name}`;
            
            // Switch UI
            loginScreen.style.display = 'none';
            if(topNav) topNav.style.display = 'none';
            if(leftPanel) leftPanel.style.display = 'none';
            
            // Set game background
            document.body.classList.add('in-game');

            gameDashboard.style.display = 'grid';
            
            // Start the game loop and render initial UI
            initGame();

        } else {
            // Clear memory
            stopGame();
            resetState();

            // Switch UI back to login
            gameDashboard.style.display = 'none';
            document.body.classList.remove('in-game');
            loginScreen.style.display = 'block';
            if(topNav) topNav.style.display = 'flex';
            if(leftPanel) leftPanel.style.display = 'block';
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            hideError();
            
            const email = catEmailInput.value;
            const password = catSecretInput.value;
            
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
                    if(error.code === 'auth/invalid-credential') {
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

            const name = catNameInput.value;
            const email = catEmailInput.value;
            const password = catSecretInput.value;

            if(!name || !email || !password) {
                showError("Preencha todos os campos para se cadastrar.");
                return;
            }

            const originalText = btnRegister.textContent;
            btnRegister.textContent = 'Criando conta...';
            btnRegister.disabled = true;

            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    return updateProfile(userCredential.user, {
                        displayName: name
                    });
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
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch((error) => {
                console.error("Erro ao sair:", error);
            });
        });
    }

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
                alert("Erro ao publicar notícia: " + e.message);
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
