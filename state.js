import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const DEFAULT_STATE = {
    resources: { fish: 200, wood: 200, wool: 0, gold: 0, stone: 0, coal: 0, iron: 0, diamonds: 5 },
    buildings: { cabana: 1, cais: 0, arranhador: 0, mina: 0, quartel: 0, prefeitura: 0, mercado: 0 },
    pop: { max: 15, idle: 15, fish: 0, wood: 0, wool: 0, mine: 0, scouts: 0, merchants: 0 },
    tempPop: { idle: 15, fish: 0, wood: 0, wool: 0, mine: 0, merchants: 0 },
    missions: {
        cabanaLvl2: { done: false, ready: false, desc: "Evolua a Cabana do Líder para o Nível 2", reward: 50, rewardDiamonds: 2 },
        caisLvl1: { done: false, ready: false, desc: "Construa o Cais de Pesca", reward: 100, rewardDiamonds: 3 },
        quartelLvl1: { done: false, ready: false, desc: "Construa o Quartel Felino", reward: 300, rewardDiamonds: 5 }
    }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
let currentUserUid = null;

export function getState() {
    return state;
}

export function resetState() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    currentUserUid = null;
}

export function setGMState() {
    for (let key in state.resources) state.resources[key] = 999999;
    for (let key in state.buildings) state.buildings[key] = 10;
    state.resources.diamonds = 999999;
    state.pop.max = 100;
    state.pop.idle = 100;
    state.tempPop.idle = 100;
}

export async function loadState(uid) {
    currentUserUid = uid;
    let loadedFromCloud = false;
    try {
        const docRef = doc(db, "villages", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const savedState = docSnap.data();
            state.resources = { ...DEFAULT_STATE.resources, ...(savedState.resources || {}) };
            state.buildings = { ...DEFAULT_STATE.buildings, ...(savedState.buildings || {}) };
            state.pop = { ...DEFAULT_STATE.pop, ...(savedState.pop || {}) };
            state.tempPop = JSON.parse(JSON.stringify(state.pop));
            state.missions = {
                cabanaLvl2: { ...DEFAULT_STATE.missions.cabanaLvl2, ...(savedState.missions?.cabanaLvl2 || {}) },
                caisLvl1: { ...DEFAULT_STATE.missions.caisLvl1, ...(savedState.missions?.caisLvl1 || {}) },
                quartelLvl1: { ...DEFAULT_STATE.missions.quartelLvl1, ...(savedState.missions?.quartelLvl1 || {}) }
            };
            console.log("Vila carregada da nuvem para:", uid);
            loadedFromCloud = true;
        }
    } catch(e) {
        console.warn("Erro ao acessar Firestore (tentando backup local):", e);
    }

    if (!loadedFromCloud) {
        const localData = localStorage.getItem(`felineas_backup_${uid}`);
        if (localData) {
            try {
                const savedState = JSON.parse(localData);
                state.resources = { ...DEFAULT_STATE.resources, ...(savedState.resources || {}) };
                state.buildings = { ...DEFAULT_STATE.buildings, ...(savedState.buildings || {}) };
                state.pop = { ...DEFAULT_STATE.pop, ...(savedState.pop || {}) };
                state.tempPop = JSON.parse(JSON.stringify(state.pop));
                state.missions = {
                    cabanaLvl2: { ...DEFAULT_STATE.missions.cabanaLvl2, ...(savedState.missions?.cabanaLvl2 || {}) },
                    caisLvl1: { ...DEFAULT_STATE.missions.caisLvl1, ...(savedState.missions?.caisLvl1 || {}) },
                    quartelLvl1: { ...DEFAULT_STATE.missions.quartelLvl1, ...(savedState.missions?.quartelLvl1 || {}) }
                };
                console.log("Vila carregada do LocalStorage! Sincronizando com a nuvem...");
                // Sincroniza o backup local para a nuvem
                await saveState();
            } catch(e) {
                console.error("Erro ao fazer parse do backup local:", e);
                state = JSON.parse(JSON.stringify(DEFAULT_STATE));
                currentUserUid = uid;
                await saveState();
            }
        } else {
            console.log("Nenhum save encontrado para", uid, "- Iniciando nova vila e gravando na nuvem...");
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            currentUserUid = uid;
            await saveState();
        }
    }
    return state;
}

export async function saveState() {
    const uid = currentUserUid || auth.currentUser?.uid;
    if (!uid) {
        console.warn("saveState cancelado: nenhum usuário autenticado.");
        return;
    }

    currentUserUid = uid;

    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
        saveStatus.textContent = '☁️ Salvando...';
        saveStatus.style.opacity = '1';
    }

    try {
        await setDoc(doc(db, "villages", uid), state);
        console.log("Vila salva na nuvem com sucesso!");
        if (saveStatus) {
            saveStatus.textContent = '☁️ Salvo';
            setTimeout(() => {
                if (saveStatus && saveStatus.textContent === '☁️ Salvo') {
                    saveStatus.style.opacity = '0.7';
                }
            }, 1500);
        }
    } catch(e) {
        console.error("Erro ao salvar no Firestore:", e);
        if (saveStatus) {
            saveStatus.textContent = '⚠️ Erro na nuvem';
        }
    }
    
    // Backup no LocalStorage
    try {
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(state));
    } catch(e) {
        console.warn("Erro ao salvar localmente:", e);
    }
}
