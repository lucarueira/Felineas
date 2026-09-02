import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

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
            // Ensure tempPop matches saved pop on load
            state.tempPop = JSON.parse(JSON.stringify(state.pop));
            state.missions = { ...DEFAULT_STATE.missions, ...(savedState.missions || {}) };
            console.log("Vila carregada da nuvem!");
            loadedFromCloud = true;
        }
    } catch(e) {
        console.log("Erro ao acessar nuvem (permissão?). Tentando local...", e);
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
                state.missions = { ...DEFAULT_STATE.missions, ...(savedState.missions || {}) };
                console.log("Vila carregada do LocalStorage!");
            } catch(e) {
                console.log("Erro ao fazer parse do backup local.");
                resetState();
            }
        } else {
            console.log("Nenhum save encontrado. Iniciando vila do zero.");
            resetState();
        }
    }
    return state;
}

export async function saveState() {
    if (!currentUserUid) return;
    try {
        await setDoc(doc(db, "villages", currentUserUid), state);
    } catch(e) {
        console.log("Erro ao salvar na nuvem: ", e);
    }
    
    // Fallback: Always save to localStorage as backup
    try {
        localStorage.setItem(`felineas_backup_${currentUserUid}`, JSON.stringify(state));
    } catch(e) {
        console.log("Erro ao salvar localmente:", e);
    }
}
