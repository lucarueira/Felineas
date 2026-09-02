import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const DEFAULT_STATE = {
    resources: { fish: 200, wood: 200, wool: 0, gold: 0, stone: 0, coal: 0, iron: 0, diamonds: 5 },
    buildings: { cabana: 1, cais: 0, arranhador: 0, mina: 0, quartel: 0, prefeitura: 0 },
    pop: { max: 15, idle: 15, fish: 0, wood: 0, wool: 0, mine: 0, scouts: 0 },
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
}

export async function loadState(uid) {
    currentUserUid = uid;
    try {
        const docRef = doc(db, "villages", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const savedState = docSnap.data();
            state = { ...DEFAULT_STATE, ...savedState };
            state.resources = { ...DEFAULT_STATE.resources, ...(savedState.resources || {}) };
            state.buildings = { ...DEFAULT_STATE.buildings, ...(savedState.buildings || {}) };
            state.pop = { ...DEFAULT_STATE.pop, ...(savedState.pop || {}) };
            state.missions = { ...DEFAULT_STATE.missions, ...(savedState.missions || {}) };
            console.log("Vila carregada da nuvem!");
        } else {
            await saveState();
            console.log("Nova vila criada na nuvem!");
        }
    } catch (e) {
        console.warn("Aviso: O Banco de Dados (Firestore) ainda não está configurado corretamente no Firebase Console. Usando memória local temporariamente.", e);
        // Fallback to memory
    }
    return state;
}

export async function saveState() {
    if (!currentUserUid) return;
    try {
        const docRef = doc(db, "villages", currentUserUid);
        await setDoc(docRef, state);
    } catch (e) {
        console.warn("Aviso: Falha ao salvar no banco de dados. Progresso salvo apenas na memória.", e);
    }
}
