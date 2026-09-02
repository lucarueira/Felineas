import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB9eBAsbQDMzmFdH1L8TvohWbPDyJB5-lk",
    authDomain: "felineas-app.firebaseapp.com",
    projectId: "felineas-app",
    storageBucket: "felineas-app.firebasestorage.app",
    messagingSenderId: "551111578011",
    appId: "1:551111578011:web:bc62cbaf0413f8aef1113e",
    measurementId: "G-3NSQ653B09"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
