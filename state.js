import { doc, getDoc, setDoc, getDocs, collection, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// Re-exportações e importações modulares
export { BASE_ITEM_DATABASE, setItemDatabase, getItemById, getEligibleDrops } from './items.js';
import { BASE_ITEM_DATABASE, setItemDatabase } from './items.js';
import { simulateTabletopBattle } from './battle.js';
import { computeHeroTalentBonuses } from './talents.js';

export let ITEM_DATABASE = [...BASE_ITEM_DATABASE];


// --- Configurações Globais do Servidor (Gerenciadas pelo GM) ---
export const DEFAULT_GLOBAL_SETTINGS = {
    farmMultiplier: 1.0,
    farmBonusActive: true,
    xpMultiplier: 1.0,
    resourceMultipliers: {
        fish: 1.0,
        wood: 1.0,
        wool: 1.0,
        stone: 1.0,
        coal: 1.0,
        iron: 1.0,
        mine: 1.0
    },
    // Controle individual por tipo de recurso (permite ativar/desativar cada um separadamente)
    resourceRates: {
        fish: { active: false, multiplier: 2.0, name: 'Peixes (Cais)' },
        wood: { active: false, multiplier: 2.0, name: 'Madeira (Cabana)' },
        wool: { active: false, multiplier: 2.0, name: 'Lã (Arranhador)' },
        stone: { active: false, multiplier: 2.0, name: 'Pedra (Mina)' },
        coal: { active: false, multiplier: 2.0, name: 'Carvão (Mina)' },
        iron: { active: false, multiplier: 2.0, name: 'Ferro (Mina)' }
    },
    // Controle de tempos separados para Construções, Tropas e Fadiga
    timeSettings: {
        constructionMultiplier: 1.0,
        instantConstruction: false,
        buildingTimes: {
            cabana: 15,
            cais: 20,
            arranhador: 25,
            mina: 35,
            quartel: 40,
            prefeitura: 60,
            mercado: 45
        },
        instantTraining: false,
        troopTimes: {
            scouts: 5,
            archers: 10,
            colossus: 20,
            mages: 25,
            rogues: 15
        },
        fatigueMultiplier: 1.0,
        noFatigue: false,
        victoryRestSeconds: 20,
        defeatRestSeconds: 15,
        fatigueTimes: {
            army: 20,
            hero_sword: 20,
            hero_bow: 20,
            hero_mage: 25
        }
    },
    broadcast: {
        active: false,
        text: ''
    }
};

function loadCachedGlobalSettings() {
    try {
        const raw = localStorage.getItem('felineas_global_settings');
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_GLOBAL_SETTINGS,
                ...parsed,
                resourceMultipliers: {
                    ...DEFAULT_GLOBAL_SETTINGS.resourceMultipliers,
                    ...(parsed.resourceMultipliers || {})
                },
                resourceRates: {
                    ...DEFAULT_GLOBAL_SETTINGS.resourceRates,
                    ...(parsed.resourceRates || {})
                },
                timeSettings: {
                    ...DEFAULT_GLOBAL_SETTINGS.timeSettings,
                    ...(parsed.timeSettings || {})
                },
                broadcast: {
                    ...DEFAULT_GLOBAL_SETTINGS.broadcast,
                    ...(parsed.broadcast || {})
                }
            };
        }
    } catch(e) {}
    return JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SETTINGS));
}

let globalSettings = loadCachedGlobalSettings();
let settingsListeners = [];

export function getGlobalSettings() {
    return globalSettings;
}

export function setGlobalSettings(newSettings, skipLocalPersist = false) {
    globalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        ...newSettings,
        resourceMultipliers: {
            ...DEFAULT_GLOBAL_SETTINGS.resourceMultipliers,
            ...(newSettings.resourceMultipliers || {})
        },
        resourceRates: {
            ...DEFAULT_GLOBAL_SETTINGS.resourceRates,
            ...(newSettings.resourceRates || {})
        },
        timeSettings: {
            ...DEFAULT_GLOBAL_SETTINGS.timeSettings,
            ...(newSettings.timeSettings || {})
        },
        broadcast: {
            ...DEFAULT_GLOBAL_SETTINGS.broadcast,
            ...(newSettings.broadcast || {})
        }
    };

    if (!skipLocalPersist) {
        try {
            localStorage.setItem('felineas_global_settings', JSON.stringify(globalSettings));
        } catch(e) {}
    }

    try {
        window.dispatchEvent(new CustomEvent('felineas_settings_changed', { detail: globalSettings }));
    } catch(e) {}

    notifySettingsListeners();
}

function notifySettingsListeners() {
    settingsListeners.forEach(fn => {
        try { fn(globalSettings); } catch(e) { console.error("Erro listener globalSettings:", e); }
    });
}

export function subscribeToGlobalSettings(callback) {
    if (typeof callback === 'function') {
        settingsListeners.push(callback);
        // Notifica imediatamente com os dados atuais
        try { callback(globalSettings); } catch(e) {}
    }

    // Registra listener em tempo real no Firestore
    try {
        const docRef = doc(db, "global", "settings");
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setGlobalSettings(data);
            }
        }, (err) => {
            console.warn("Aviso onSnapshot global/settings:", err.message);
        });
        return unsubscribe;
    } catch(e) {
        console.warn("Erro ao registrar onSnapshot:", e);
        return () => {};
    }
}

// Sincronização entre abas e janelas do navegador
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'felineas_global_settings') {
            try {
                if (e.newValue) {
                    const parsed = JSON.parse(e.newValue);
                    setGlobalSettings(parsed, true);
                }
            } catch(err) {}
        }
    });
}

export async function loadGlobalSettings() {
    // 1. Carrega imediatamente do cache do LocalStorage
    try {
        const local = localStorage.getItem('felineas_global_settings');
        if (local) {
            setGlobalSettings(JSON.parse(local), true);
        }
    } catch(e) {}

    // 2. Tenta sincronizar com o Firestore
    try {
        const docRef = doc(db, "global", "settings");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            setGlobalSettings(data);
        }
    } catch(e) {
        console.warn("Aviso ao carregar configurações globais do Firestore (usando cache local):", e.message);
    }
    return globalSettings;
}

export async function saveGlobalSettings(newSettings) {
    setGlobalSettings(newSettings);
    try {
        localStorage.setItem('felineas_global_settings', JSON.stringify(globalSettings));
    } catch(e) {}

    try {
        const docRef = doc(db, "global", "settings");
        await setDoc(docRef, globalSettings, { merge: true });
    } catch(e) {
        console.warn("Aviso: Configurações salvas em cache local (Firestore sem permissão ou offline):", e.message);
    }
    return globalSettings;
}

export async function loadCustomItems() {
    let customList = [];
    let overrides = {};

    // Tenta carregar do Firestore
    try {
        const docRef = doc(db, "global", "items");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.items)) customList = data.items;
            if (data.overrides) overrides = data.overrides;
        }
    } catch(e) {
        console.warn("Aviso ao carregar itens customizados do Firestore (usando cache local):", e);
    }

    // Fallback/merge com LocalStorage
    try {
        const localCustom = JSON.parse(localStorage.getItem('felineas_custom_items') || '[]');
        if (customList.length === 0 && localCustom.length > 0) {
            customList = localCustom;
        }
        const localOverrides = JSON.parse(localStorage.getItem('felineas_item_overrides') || '{}');
        overrides = { ...localOverrides, ...overrides };
    } catch(e) {}

    // Aplica overrides aos itens base
    const baseItemsWithOverrides = BASE_ITEM_DATABASE.map(baseItem => {
        if (overrides[baseItem.id]) {
            return { ...baseItem, ...overrides[baseItem.id] };
        }
        return { ...baseItem };
    });

    ITEM_DATABASE = [...baseItemsWithOverrides, ...customList];
    setItemDatabase(ITEM_DATABASE);
    return customList;
}

export async function registerCustomItem(itemData) {
    const customList = await loadCustomItems();
    if (!itemData.id) {
        itemData.id = 'item_' + Date.now().toString(36);
    }
    if (itemData.active === undefined) itemData.active = true;
    itemData.isCustom = true;

    const existingIndex = customList.findIndex(it => it.id === itemData.id);
    if (existingIndex >= 0) {
        customList[existingIndex] = { ...customList[existingIndex], ...itemData };
    } else {
        customList.push(itemData);
    }

    try {
        localStorage.setItem('felineas_custom_items', JSON.stringify(customList));
    } catch(e) {}

    try {
        const docRef = doc(db, "global", "items");
        await setDoc(docRef, { items: customList }, { merge: true });
    } catch(e) {
        console.warn("Item salvo apenas em cache local (sem Firestore):", e);
    }

    await loadCustomItems();
    await addGMLog('items', 'Novo Item Cadastrado', `Item "${itemData.name}" (${itemData.rarity}, slot ${itemData.slot}) adicionado ao reino.`);
    return ITEM_DATABASE;
}

export async function updateCustomItem(arg1, arg2) {
    let itemData;
    if (typeof arg1 === 'object' && arg1 !== null) {
        itemData = { ...arg1 };
        if (typeof arg2 === 'object' && arg2 !== null) {
            itemData = { ...itemData, ...arg2 };
        }
    } else if (typeof arg1 === 'string') {
        itemData = { ...(arg2 || {}), id: arg1 };
    } else {
        return { success: false, reason: "Parâmetros inválidos para atualização do item." };
    }

    if (!itemData.id) {
        return { success: false, reason: "ID do item ausente ou inválido." };
    }

    const customList = await loadCustomItems();
    const isBaseItem = BASE_ITEM_DATABASE.some(b => b.id === itemData.id);

    if (isBaseItem) {
        // Salva override do item base
        let overrides = {};
        try {
            overrides = JSON.parse(localStorage.getItem('felineas_item_overrides') || '{}');
        } catch(e) {}
        overrides[itemData.id] = { ...overrides[itemData.id], ...itemData };
        try {
            localStorage.setItem('felineas_item_overrides', JSON.stringify(overrides));
        } catch(e) {}

        try {
            const docRef = doc(db, "global", "items");
            await setDoc(docRef, { overrides }, { merge: true });
        } catch(e) {}
    } else {
        // Atualiza item customizado
        const idx = customList.findIndex(it => it.id === itemData.id);
        if (idx >= 0) {
            customList[idx] = { ...customList[idx], ...itemData };
        } else {
            customList.push(itemData);
        }
        try {
            localStorage.setItem('felineas_custom_items', JSON.stringify(customList));
        } catch(e) {}
        try {
            const docRef = doc(db, "global", "items");
            await setDoc(docRef, { items: customList }, { merge: true });
        } catch(e) {}
    }

    await loadCustomItems();
    await addGMLog('items', 'Item Atualizado', `Item "${itemData.name || itemData.id}" (${itemData.id}) foi editado pelo GM.`);
    const updated = ITEM_DATABASE.find(i => i.id === itemData.id) || itemData;
    return { success: true, item: updated, catalog: ITEM_DATABASE };
}

export async function toggleItemActive(itemId, activeState) {
    const targetItem = ITEM_DATABASE.find(i => i.id === itemId);
    if (!targetItem) return { success: false, reason: "Item não encontrado." };

    return await updateCustomItem(itemId, { ...targetItem, active: !!activeState });
}

export async function deleteCustomItem(itemId) {
    const customList = await loadCustomItems();
    const filtered = customList.filter(it => it.id !== itemId);

    try {
        localStorage.setItem('felineas_custom_items', JSON.stringify(filtered));
    } catch(e) {}

    try {
        const docRef = doc(db, "global", "items");
        await setDoc(docRef, { items: filtered }, { merge: true });
    } catch(e) {}

    await loadCustomItems();
    await addGMLog('items', 'Item Excluído', `Item ID ${itemId} removido do catálogo pelo GM.`);
    return { success: true, catalog: ITEM_DATABASE };
}

export const TOWER_FLOORS = [
    {
        floor: 1,
        name: 'O Pátio dos Roedores',
        enemy: 'Bando de Ratos Vorazes',
        enemyPower: 35,
        durationSeconds: 15,
        tacticalRequirement: null,
        tacticalHint: 'Inimigos terrestres comuns. Qualquer pelotão bem treinado vence.',
        rewards: { gold: 8, xp: 45, fish: 25 },
        dropChance: 0.6,
        dropTier: [1]
    },
    {
        floor: 2,
        name: 'As Muralhas das Corujas Vigilantes',
        enemy: 'Corujas de Penugem Férrea (Aéreas)',
        enemyPower: 70,
        durationSeconds: 25,
        tacticalRequirement: 'ranged_or_magic', // Arqueiros ou Magos
        tacticalHint: '⚠️ Inimigos Voadores! Requer ao menos 1 Arqueiro ou 1 Mago da Lã, ou os ataques corpo a corpo falharão!',
        rewards: { gold: 15, xp: 80, wood: 30 },
        dropChance: 0.7,
        dropTier: [1, 2]
    },
    {
        floor: 3,
        name: 'A Cripta dos Caramujos de Rocha',
        enemy: 'Caramujos Blindados de Granito',
        enemyPower: 115,
        durationSeconds: 40,
        tacticalRequirement: 'tank_or_magic', // Colossos ou Magos
        tacticalHint: '⚠️ Carapaças Impenetráveis! Requer ao menos 1 Colosso ou 1 Mago da Lã para quebrar a carapaça!',
        rewards: { gold: 25, xp: 130, stone: 35 },
        dropChance: 0.75,
        dropTier: [1, 2]
    },
    {
        floor: 4,
        name: 'A Passagem das Serpentes das Sombras',
        enemy: 'Víboras Furtivas do Abismo',
        enemyPower: 175,
        durationSeconds: 60,
        tacticalRequirement: 'stealth_or_scout', // Ladinos ou Batedores
        tacticalHint: '⚠️ Emboscada Noturna! Requer ao menos 1 Ladino ou 2 Batedores para desarmar armadilhas e detectar venenos!',
        rewards: { gold: 40, xp: 190, wool: 25 },
        dropChance: 0.8,
        dropTier: [2]
    },
    {
        floor: 5,
        name: 'O Salão do Guardião Mastim',
        enemy: 'Grande Cão Blindado das Ruínas (Chefe de Ala)',
        enemyPower: 260,
        durationSeconds: 85,
        tacticalRequirement: 'balanced_squad', // Colosso + Arqueiro/Mago
        tacticalHint: '⚠️ Chefe Poderoso! Requer um batalhão balanceado com ao menos 1 Colosso e tropas de ataque à distância!',
        rewards: { gold: 65, xp: 320, iron: 25 },
        dropChance: 1.0, // Garantido!
        dropTier: [2, 3]
    },
    {
        floor: 6,
        name: 'Os Pináculos dos Corvos Necromantes',
        enemy: 'Corvos Espectrais Arcanos',
        enemyPower: 380,
        durationSeconds: 110,
        tacticalRequirement: 'ranged_or_magic',
        tacticalHint: '⚠️ Revoada Espectral! Requer Arqueiros e Magos para combater a magia sombria nas alturas!',
        rewards: { gold: 95, xp: 480, iron: 40 },
        dropChance: 0.85,
        dropTier: [2, 3]
    },
    {
        floor: 7,
        name: 'O Abismo do Basilisco Felineo',
        enemy: 'Basilisco Petrificador',
        enemyPower: 520,
        durationSeconds: 140,
        tacticalRequirement: 'tank_or_magic',
        tacticalHint: '⚠️ Olhar de Pedra! Colossos com escudos maciços e Ladinos rápidos são vitais para a sobrevivência!',
        rewards: { gold: 140, xp: 650, stone: 75 },
        dropChance: 0.9,
        dropTier: [3]
    },
    {
        floor: 8,
        name: 'A Câmara do Titã de Lava',
        enemy: 'Golem Vulcânico de Obsidiana',
        enemyPower: 720,
        durationSeconds: 180,
        tacticalRequirement: 'tank_or_magic',
        tacticalHint: '⚠️ Calor Escaldante! Requer o poder de absorção de dano dos Colossos e encantos dos Magos da Lã!',
        rewards: { gold: 200, xp: 950, coal: 100 },
        dropChance: 0.92,
        dropTier: [3]
    },
    {
        floor: 9,
        name: 'O Templo dos Espectros Ancestrais',
        enemy: 'Legião de Aparições do Vazio',
        enemyPower: 980,
        durationSeconds: 230,
        tacticalRequirement: 'balanced_squad',
        tacticalHint: '⚠️ Perigo Extremo! Requer pelotão completo e Herói de nível avançado com bons equipamentos!',
        rewards: { gold: 280, xp: 1400, iron: 125 },
        dropChance: 0.95,
        dropTier: [3]
    },
    {
        floor: 10,
        name: 'O Trono do Dragão de Ossos de Peixe',
        enemy: 'Wyrm Férreo Ancestral (Lorde Supremo da Torre)',
        enemyPower: 1350,
        durationSeconds: 300,
        tacticalRequirement: 'full_army',
        tacticalHint: '👑 Conflito Lendário! O exército deve marchar com força máxima e o Herói devidamente equipado!',
        rewards: { gold: 400, xp: 2800, iron: 200, diamonds: 5 },
        dropChance: 1.0, // Item Lendário garantido!
        dropTier: [3]
    }
];

export const HERO_TEMPLATES = {
    sword: {
        id: 'sword',
        name: 'Leonidas Garra-de-Aço',
        title: 'O Cavaleiro Guardião',
        class: 'Cavaleiro',
        icon: '⚔️',
        image: 'assets/hero_sword_knight.jpg',
        lore: 'Veterano destemido das Guerras dos Becos Sombrios. Empunha uma espada rúnica forjada com ferro estelar e escamas de peixe-dragão. Jurou fidelidade eterna à vila, defendendo a vanguarda com sua armadura pesada e rugidos que inspiram qualquer batalhão.',
        level: 1,
        xp: 0,
        xpNext: 100,
        statPoints: 0,
        stats: {
            hp: 120,
            maxHp: 120,
            stamina: 80,
            maxStamina: 80,
            strength: 15,
            dexterity: 8,
            intelligence: 6
        },
        equipped: {
            weapon: null,
            offhand: null,
            helmet: null,
            armor: null,
            accessory: null
        }
    },
    bow: {
        id: 'bow',
        name: 'Lyra Olho-de-Lince',
        title: 'A Sentinela das Sombras',
        class: 'Arqueira',
        icon: '🏹',
        image: 'assets/hero_bow_archer.jpg',
        lore: 'Nascida no topo das Árvores Sussurrantes. Consegue cravar uma flecha em movimento a trezentos passos na calada da noite. Seus passos não fazem o menor ruído e suas flechas com pontas de osso endurecido perfuram qualquer armadura inimiga.',
        level: 1,
        xp: 0,
        xpNext: 100,
        statPoints: 0,
        stats: {
            hp: 95,
            maxHp: 95,
            stamina: 115,
            maxStamina: 115,
            strength: 9,
            dexterity: 16,
            intelligence: 8
        },
        equipped: {
            weapon: null,
            offhand: null,
            helmet: null,
            armor: null,
            accessory: null
        }
    },
    mage: {
        id: 'mage',
        name: 'Morgan Ronrom-Arcano',
        title: 'O Mestre da Lã Cósmica',
        class: 'Mago',
        icon: '🔮',
        image: 'assets/hero_mage_sorcerer.jpg',
        lore: 'Estudioso dos antigos pergaminhos deixados pelos Deuses Felinos nas Criptas Lunares. Canaliza torrentes de eletricidade e feitiços arcanos através de orbes tecidos com fios de lã mística pura, conjurando campos de força e tempestades celestiais.',
        level: 1,
        xp: 0,
        xpNext: 100,
        statPoints: 0,
        stats: {
            hp: 85,
            maxHp: 85,
            stamina: 90,
            maxStamina: 90,
            strength: 6,
            dexterity: 9,
            intelligence: 17
        },
        equipped: {
            weapon: null,
            offhand: null,
            helmet: null,
            armor: null,
            accessory: null
        }
    }
};

export const TROOP_TEMPLATES = {
    scouts: {
        id: 'scouts',
        name: 'Gatos Batedores',
        icon: '🗡️',
        space: 1,
        cost: { fish: 15 },
        power: 10,
        desc: 'Infantaria leve armada com adagas afiadas. Rápidos para perseguir e cercar.'
    },
    archers: {
        id: 'archers',
        name: 'Gatos Arqueiros',
        icon: '🏹',
        space: 1,
        cost: { fish: 20, wood: 10 },
        power: 14,
        desc: 'Atiradores ágeis com arcos de bambu atacando à distância sem se expor.'
    },
    colossus: {
        id: 'colossus',
        name: 'Gatos Colossos',
        icon: '🛡️',
        space: 3,
        cost: { fish: 45, stone: 25 },
        power: 35,
        desc: 'Felinos gigantescos com escudos de carvalho. Absorvem o grosso do dano na vanguarda.'
    },
    mages: {
        id: 'mages',
        name: 'Gatos Magos da Lã',
        icon: '🧙‍♂️',
        space: 2,
        cost: { fish: 35, wool: 15 },
        power: 28,
        desc: 'Conjuradores arcanos que lançam feitiços de lã faiscante causando dano em área.'
    },
    rogues: {
        id: 'rogues',
        name: 'Gatos Ladinos',
        icon: '🐾',
        space: 1,
        cost: { fish: 25, iron: 15 },
        power: 20,
        desc: 'Assassinos das sombras que desferem golpes críticos e saqueiam recursos extras.'
    }
};

export const BASE_STORAGE_CAP = 400;
export const CAT_FOOD_CONSUMPTION_RATE = 0.006; // Peixe/seg por gato ativo trabalhando

export function getVillageStorageCapacity(targetState = state) {
    // Sem limite artificial de capacidade de recursos
    return Infinity;
}

const DEFAULT_STATE = {
    resources: { fish: 40, wood: 35, wool: 10, stone: 0, coal: 0, iron: 0, gold: 0, diamonds: 5 },
    buildings: { cabana: 1, cais: 1, arranhador: 1, mina: 1, quartel: 0, prefeitura: 0, mercado: 0 },
    pop: { max: 6, idle: 4, fish: 1, wood: 1, wool: 0, mine: 0, scouts: 0 },
    tempPop: { max: 6, idle: 4, fish: 1, wood: 1, wool: 0, mine: 0, scouts: 0 },
    missions: {
        cabanaLvl2: { done: false, ready: false, desc: "Evolua a Cabana do Líder para o Nível 2", reward: 10 },
        caisLvl1: { done: true, ready: false, desc: "Construa o Cais de Pesca", reward: 15 },
        quartelLvl1: { done: false, ready: false, desc: "Construa o Quartel Felino", reward: 25 },
        towerFloor1: { done: false, ready: false, desc: "Conquiste o Andar 1 da Torre dos Desafios", reward: 15 },
        trainArmy5: { done: false, ready: false, desc: "Treine ao menos 5 guerreiros no Quartel", reward: 20 },
        equipItem1: { done: false, ready: false, desc: "Equipe um Item de Equipamento no seu Herói", reward: 25 }
    },
    account: {
        level: 1,
        xp: 0,
        xpToNextLevel: 100
    },
    levelMissions: {
        lvl2: { levelReq: 2, desc: "Alcance o Nível 2 de Conta", rewardDiamonds: 5, claimed: false },
        lvl3: { levelReq: 3, desc: "Alcance o Nível 3 de Conta", rewardDiamonds: 10, claimed: false },
        lvl4: { levelReq: 4, desc: "Alcance o Nível 4 de Conta", rewardDiamonds: 15, claimed: false },
        lvl5: { levelReq: 5, desc: "Alcance o Nível 5 de Conta", rewardDiamonds: 25, claimed: false },
        lvl10: { levelReq: 10, desc: "Alcance o Nível 10 de Conta", rewardDiamonds: 50, claimed: false }
    },
    profile: {
        avatar: '🦁',
        tribe: 'Pata-Dourada',
        title: 'Líder Felino'
    },
    army: {
        scouts: 0,
        archers: 0,
        colossus: 0,
        mages: 0,
        rogues: 0
    },
    unlockedHeroes: {
        sword: {
            id: 'sword',
            name: 'Guerreiro da Garra',
            title: 'Espadachim Felino',
            icon: '🗡️',
            avatar: '🐱',
            classType: 'Guerreiro',
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            stats: { strength: 12, dexterity: 8, intelligence: 5, hp: 120, stamina: 40 },
            equipped: { weapon: null, offhand: null, helmet: null, armor: null, accessory: null }
        }
    },
    activeHeroId: 'sword',
    inventory: [], // [ { uid, ...itemDef } ]
    tower: {
        highestFloor: 1,
        victories: 0,
        defeats: 0
    },
    activeExpedition: null, // { floor, name, startTime, durationMs, endTime, troopsSent, heroId }
    fatigue: {
        armyRestUntil: 0,
        heroRestUntil: {}
    }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
let currentUserUid = null;

export function getState() {
    return state;
}

export function updateProfileState(profileUpdates) {
    if (!state.profile) state.profile = { ...DEFAULT_STATE.profile };
    state.profile = { ...state.profile, ...profileUpdates };
    saveState();
}

export function addXP(amount) {
    if (!state.account) state.account = { ...DEFAULT_STATE.account };
    const mult = globalSettings.xpMultiplier || 1.0;
    const finalAmount = Math.max(1, Math.round(amount * mult));
    state.account.xp += finalAmount;
    let leveledUp = false;
    while (state.account.xp >= state.account.xpToNextLevel) {
        state.account.xp -= state.account.xpToNextLevel;
        state.account.level += 1;
        state.account.xpToNextLevel = Math.floor(state.account.level * 100 * 1.25);
        leveledUp = true;
    }
    return { leveledUp, level: state.account.level, xp: state.account.xp, xpToNextLevel: state.account.xpToNextLevel, gained: finalAmount };
}

// --- Multiple Heroes Management ---
export function selectStarterHero(heroId) {
    if (!HERO_TEMPLATES[heroId]) return false;
    if (state.activeHeroId && state.unlockedHeroes[state.activeHeroId]) return false; // Já escolheu o starter
    
    const newHero = JSON.parse(JSON.stringify(HERO_TEMPLATES[heroId]));
    if (!state.unlockedHeroes) state.unlockedHeroes = {};
    state.unlockedHeroes[heroId] = newHero;
    state.activeHeroId = heroId;
    saveState();
    return true;
}

export function getHeroUnlockCost(heroId) {
    if (!state.unlockedHeroes) state.unlockedHeroes = {};
    const unlockedCount = Object.keys(state.unlockedHeroes).length;
    if (state.unlockedHeroes[heroId]) return 0; // Já desbloqueado
    if (unlockedCount === 0) return 0; // Primeiro é grátis
    if (unlockedCount === 1) return 80; // Segundo herói (Arqueira)
    return 150; // Terceiro herói (Mago)
}

export function unlockHeroWithGold(heroId) {
    if (!HERO_TEMPLATES[heroId]) return { success: false, reason: "Herói inexistente." };
    if (!state.unlockedHeroes) state.unlockedHeroes = {};
    if (state.unlockedHeroes[heroId]) return { success: false, reason: "Herói já recrutado!" };

    const cost = getHeroUnlockCost(heroId);
    if ((state.resources.gold || 0) < cost) {
        return { success: false, reason: `Ouro insuficiente! Requer 🪙 ${cost} de Ouro para contratar este herói.` };
    }

    state.resources.gold -= cost;
    const newHero = JSON.parse(JSON.stringify(HERO_TEMPLATES[heroId]));
    state.unlockedHeroes[heroId] = newHero;
    if (!state.activeHeroId) state.activeHeroId = heroId;
    saveState();
    return { success: true };
}

export function setActiveHero(heroId) {
    if (!state.unlockedHeroes || !state.unlockedHeroes[heroId]) return false;
    state.activeHeroId = heroId;
    saveState();
    return true;
}

export function getActiveHero() {
    if (!state.activeHeroId || !state.unlockedHeroes) return null;
    return state.unlockedHeroes[state.activeHeroId] || null;
}

// --- Mercado: Casa da Moeda Felina & Rotas Comerciais de Ouro ---
export const GOLD_MINT_RECIPES = [
    {
        id: 'mint_basic',
        name: 'Cunhagem de Moedas Reais',
        icon: '🪙',
        desc: 'Fundição artesanal de ferro e carvão alimentada por rações de peixe para abastecer os forjadores.',
        cost: { iron: 40, coal: 60, fish: 80 },
        goldGain: 5,
        minMercadoLevel: 1
    },
    {
        id: 'mint_advanced',
        name: 'Barra de Ouro Refinado',
        icon: '👑',
        desc: 'Processo metalúrgico de alta temperatura para purificar minérios nobres em barras de grande valor.',
        cost: { iron: 100, coal: 140, fish: 160 },
        goldGain: 15,
        minMercadoLevel: 2
    },
    {
        id: 'trade_caravan',
        name: 'Caravana Comercial de Especiarias',
        icon: '🐪',
        desc: 'Exportação de excedentes de madeira nobre e lã mágica para mercadores errantes de terras distantes.',
        cost: { wood: 300, wool: 180 },
        goldGain: 10,
        minMercadoLevel: 1
    }
];

export function mintGold(recipeId) {
    if ((state.buildings.mercado || 0) < 1) {
        return { success: false, reason: "Construa o Mercado Felino para desbloquear a Casa da Moeda e Rotas Comerciais!" };
    }
    const recipe = GOLD_MINT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return { success: false, reason: "Receita comercial não encontrada." };
    if ((state.buildings.mercado || 0) < recipe.minMercadoLevel) {
        return { success: false, reason: `Requer Mercado Nível ${recipe.minMercadoLevel}!` };
    }
    for (const res in recipe.cost) {
        if ((state.resources[res] || 0) < recipe.cost[res]) {
            return { success: false, reason: `Recursos insuficientes! Requer ${recipe.cost[res]} de ${res}.` };
        }
    }
    for (const res in recipe.cost) {
        state.resources[res] -= recipe.cost[res];
    }
    state.resources.gold = (state.resources.gold || 0) + recipe.goldGain;
    saveState();
    return { success: true, goldGain: recipe.goldGain, recipeName: recipe.name };
}

// --- RPG Hero Stats & Elden Ring Attributes ---
export function getHeroTotalStats(heroId) {
    const hero = state.unlockedHeroes?.[heroId];
    if (!hero) return null;

    const base = hero.stats;
    const totals = {
        hp: base.hp,
        maxHp: base.maxHp,
        stamina: base.stamina,
        maxStamina: base.maxStamina,
        strength: base.strength,
        dexterity: base.dexterity,
        intelligence: base.intelligence,
        bonusHp: 0,
        bonusStamina: 0,
        bonusStrength: 0,
        bonusDexterity: 0,
        bonusIntelligence: 0
    };

    if (hero.equipped) {
        for (let slot in hero.equipped) {
            const item = hero.equipped[slot];
            if (item && item.stats) {
                if (item.stats.hp) { totals.maxHp += item.stats.hp; totals.hp += item.stats.hp; totals.bonusHp += item.stats.hp; }
                if (item.stats.stamina) { totals.maxStamina += item.stats.stamina; totals.stamina += item.stats.stamina; totals.bonusStamina += item.stats.stamina; }
                if (item.stats.strength) { totals.strength += item.stats.strength; totals.bonusStrength += item.stats.strength; }
                if (item.stats.dexterity) { totals.dexterity += item.stats.dexterity; totals.bonusDexterity += item.stats.dexterity; }
                if (item.stats.intelligence) { totals.intelligence += item.stats.intelligence; totals.bonusIntelligence += item.stats.intelligence; }
            }
        }
    }

    totals.totalPower = Math.floor(
        (totals.strength * 2.5) +
        (totals.dexterity * 2.5) +
        (totals.intelligence * 2.5) +
        (totals.maxHp / 5) +
        (totals.maxStamina / 5)
    );

    return totals;
}

export function addHeroXP(heroId, amount) {
    const hero = state.unlockedHeroes?.[heroId];
    if (!hero) return null;
    const mult = globalSettings.xpMultiplier || 1.0;
    const finalAmount = Math.max(1, Math.round(amount * mult));
    hero.xp += finalAmount;
    let leveledUp = false;
    while (hero.xp >= hero.xpNext) {
        hero.xp -= hero.xpNext;
        hero.level += 1;
        hero.xpNext = Math.floor(hero.level * 100 * 1.3);
        hero.statPoints = (hero.statPoints || 0) + 2; // +2 pontos de atributos
        hero.talentPoints = (hero.talentPoints || 0) + 1; // +1 Ponto de Talento D&D 5e
        leveledUp = true;
    }
    saveState();
    return { leveledUp, hero, gained: finalAmount };
}


export function upgradeHeroStat(heroId, statKey) {
    const hero = state.unlockedHeroes?.[heroId];
    if (!hero || (hero.statPoints || 0) <= 0) return false;
    hero.statPoints--;
    if (statKey === 'hp') {
        hero.stats.maxHp += 15;
        hero.stats.hp += 15;
    } else if (statKey === 'stamina') {
        hero.stats.maxStamina += 10;
        hero.stats.stamina += 10;
    } else if (statKey === 'strength') {
        hero.stats.strength += 2;
    } else if (statKey === 'dexterity') {
        hero.stats.dexterity += 2;
    } else if (statKey === 'intelligence') {
        hero.stats.intelligence += 2;
    }
    saveState();
    return true;
}

// --- TBH Equipment Management ---
export function equipItem(heroId, itemUid) {
    const hero = state.unlockedHeroes?.[heroId];
    if (!hero) return { success: false, reason: "Herói inválido." };
    if (!state.inventory) state.inventory = [];

    const itemIdx = state.inventory.findIndex(i => i.uid === itemUid);
    if (itemIdx === -1) return { success: false, reason: "Item não encontrado no inventário." };

    const item = state.inventory[itemIdx];
    if (!hero.equipped) hero.equipped = { weapon: null, offhand: null, helmet: null, armor: null, accessory: null };

    // Se já havia item no slot, devolve pra mochila
    const oldItem = hero.equipped[item.slot];
    if (oldItem) {
        state.inventory.push(oldItem);
    }

    hero.equipped[item.slot] = item;
    state.inventory.splice(itemIdx, 1);
    saveState();
    return { success: true };
}

export function unequipItem(heroId, slot) {
    const hero = state.unlockedHeroes?.[heroId];
    if (!hero || !hero.equipped || !hero.equipped[slot]) return { success: false, reason: "Slot vazio." };

    const item = hero.equipped[slot];
    hero.equipped[slot] = null;
    if (!state.inventory) state.inventory = [];
    state.inventory.push(item);
    saveState();
    return { success: true };
}

// --- Tower Expeditions & Real-time March ---
export function startExpedition(floorNum, troopsSent) {
    if (state.activeExpedition) {
        return { success: false, reason: "Uma expedição já está marchando pela Torre!" };
    }

    const floor = TOWER_FLOORS.find(f => f.floor === floorNum);
    if (!floor) return { success: false, reason: "Andar da Torre não encontrado." };

    const hero = getActiveHero();
    if (!hero) return { success: false, reason: "Nenhum Herói selecionado para comandar a expedição." };

    const now = Date.now();
    if (state.fatigue?.heroRestUntil?.[hero.id] > now) {
        const secs = Math.ceil((state.fatigue.heroRestUntil[hero.id] - now) / 1000);
        return { success: false, reason: `${hero.name} ainda está exausto e descansando! Aguarde ${secs}s.` };
    }

    if (state.fatigue?.armyRestUntil > now) {
        const secs = Math.ceil((state.fatigue.armyRestUntil - now) / 1000);
        return { success: false, reason: `Suas tropas ainda estão em repouso médico! Aguarde ${secs}s.` };
    }

    // Valida se possui as tropas enviadas
    let totalTroops = 0;
    for (let t in troopsSent) {
        const sent = troopsSent[t] || 0;
        if (sent > (state.army[t] || 0)) {
            return { success: false, reason: `Você não tem ${sent} guerreiros da classe ${t} disponíveis!` };
        }
        totalTroops += sent;
    }

    if (totalTroops === 0) {
        return { success: false, reason: "Envie ao menos 1 guerreiro para apoiar o Herói na expedição!" };
    }

    // Deduz temporariamente as tropas do exército ativo (elas estão na torre)
    for (let t in troopsSent) {
        state.army[t] -= troopsSent[t];
    }

    const durationMs = floor.durationSeconds * 1000;
    state.activeExpedition = {
        floor: floorNum,
        name: floor.name,
        startTime: now,
        durationMs,
        endTime: now + durationMs,
        troopsSent: { ...troopsSent },
        heroId: hero.id
    };

    saveState();
    return { success: true };
}

export function finishExpedition() {
    if (!state.activeExpedition) return null;
    const exp = state.activeExpedition;
    const now = Date.now();
    if (now < exp.endTime) return null; // Ainda não terminou

    const floor = TOWER_FLOORS.find(f => f.floor === exp.floor);
    const hero = state.unlockedHeroes?.[exp.heroId];
    if (!floor || !hero) {
        state.activeExpedition = null;
        saveState();
        return null;
    }

    // Devolve as tropas ao exército
    for (let t in exp.troopsSent) {
        state.army[t] = (state.army[t] || 0) + exp.troopsSent[t];
    }

    // Cálculo do Poder Total do Jogador
    const heroStats = getHeroTotalStats(hero.id);
    const heroPower = heroStats ? heroStats.totalPower : 30;

    let armyPower = 0;
    for (let t in exp.troopsSent) {
        const count = exp.troopsSent[t] || 0;
        const template = TROOP_TEMPLATES[t];
        if (template) armyPower += count * template.power;
    }

    const totalPlayerPower = heroPower + armyPower;

    // Simulação Autêntica do Combate de Mesa D&D 5e + Sinergias Clash of Clans
    const battleResult = simulateTabletopBattle({
        hero,
        heroStats,
        troopsSent: exp.troopsSent,
        floorNum: exp.floor
    });

    const isVictory = battleResult.isVictory;
    let droppedItem = null;

    if (!state.tower) state.tower = { highestFloor: 1, victories: 0, defeats: 0 };
    if (!state.fatigue) state.fatigue = { armyRestUntil: 0, heroRestUntil: {} };

    // Define descanso de tropas e herói com base nas configurações de tempo separadas do GM
    const timeCfg = globalSettings.timeSettings || {};
    const noFatigue = !!timeCfg.noFatigue;
    const fatigueMult = typeof timeCfg.fatigueMultiplier === 'number' ? timeCfg.fatigueMultiplier : 1.0;
    const baseVictorySecs = typeof timeCfg.victoryRestSeconds === 'number' ? timeCfg.victoryRestSeconds : 20;
    const baseDefeatSecs = typeof timeCfg.defeatRestSeconds === 'number' ? timeCfg.defeatRestSeconds : 15;
    
    // Tempos separados para Exército e para o Herói específico
    const baseArmySecs = (timeCfg.fatigueTimes && typeof timeCfg.fatigueTimes.army === 'number')
        ? timeCfg.fatigueTimes.army
        : (isVictory ? baseVictorySecs : baseDefeatSecs);
        
    const heroKey = `hero_${hero.id}`;
    const baseHeroSecs = (timeCfg.fatigueTimes && typeof timeCfg.fatigueTimes[heroKey] === 'number')
        ? timeCfg.fatigueTimes[heroKey]
        : (isVictory ? baseVictorySecs : baseDefeatSecs);

    const armyRestDuration = noFatigue ? 0 : Math.round(baseArmySecs * 1000 * fatigueMult);
    const heroRestDuration = noFatigue ? 0 : Math.round(baseHeroSecs * 1000 * fatigueMult);

    state.fatigue.armyRestUntil = armyRestDuration > 0 ? (now + armyRestDuration) : 0;
    if (!state.fatigue.heroRestUntil) state.fatigue.heroRestUntil = {};
    state.fatigue.heroRestUntil[hero.id] = heroRestDuration > 0 ? (now + heroRestDuration) : 0;

    let xpGain = 0;

    if (isVictory) {
        state.tower.victories++;
        if (state.tower.highestFloor <= floor.floor && floor.floor < 10) {
            state.tower.highestFloor = floor.floor + 1;
        }

        // Recursos e ouro
        state.resources.gold = (state.resources.gold || 0) + floor.rewards.gold;
        if (floor.rewards.fish) state.resources.fish = (state.resources.fish || 0) + floor.rewards.fish;
        if (floor.rewards.wood) state.resources.wood = (state.resources.wood || 0) + floor.rewards.wood;
        if (floor.rewards.stone) state.resources.stone = (state.resources.stone || 0) + floor.rewards.stone;
        if (floor.rewards.coal) state.resources.coal = (state.resources.coal || 0) + floor.rewards.coal;
        if (floor.rewards.iron) state.resources.iron = (state.resources.iron || 0) + floor.rewards.iron;
        if (floor.rewards.diamonds) state.resources.diamonds = (state.resources.diamonds || 0) + floor.rewards.diamonds;

        xpGain = floor.rewards.xp;
        addHeroXP(hero.id, xpGain);
        addXP(25); // XP da conta do jogador

        // Roll Drop de Item (apenas itens com active !== false podem dropar)
        if (Math.random() <= floor.dropChance) {
            const availableItems = ITEM_DATABASE.filter(item => {
                if (item.active === false) return false;
                if (floor.dropTier.includes(1) && item.minQuartel <= 3) return true;
                if (floor.dropTier.includes(2) && item.minQuartel <= 6) return true;
                if (floor.dropTier.includes(3)) return true;
                return false;
            });

            if (availableItems.length > 0) {
                const pick = availableItems[Math.floor(Math.random() * availableItems.length)];
                droppedItem = {
                    ...pick,
                    uid: `item_${Date.now()}_${Math.floor(Math.random() * 9999)}`
                };
                if (!state.inventory) state.inventory = [];
                state.inventory.push(droppedItem);
            }
        }
    } else {
        state.tower.defeats++;
        xpGain = Math.floor(floor.rewards.xp * 0.3); // 30% XP na derrota por aprendizado
        addHeroXP(hero.id, xpGain);
    }

    const resultSummary = {
        isVictory,
        floor,
        hero,
        totalPlayerPower,
        enemyPower: floor.enemyPower,
        tacticalReason: battleResult.tacticalReason || "",
        droppedItem,
        xpGain,
        goldGain: isVictory ? floor.rewards.gold : 0,
        battleDetails: battleResult,
        combatLog: battleResult.combatLog
    };


    state.activeExpedition = null;
    saveState();
    return resultSummary;
}

// --- Army Management ---
export function getArmyCapacity() {
    const quartelLevel = state.buildings.quartel || 0;
    const max = 15 + (quartelLevel * 5);
    let used = 0;
    if (!state.army) state.army = { ...DEFAULT_STATE.army };
    for (let t in state.army) {
        const template = TROOP_TEMPLATES[t];
        if (template) used += (state.army[t] || 0) * template.space;
    }
    // Inclui tropas em expedição ativa
    if (state.activeExpedition?.troopsSent) {
        for (let t in state.activeExpedition.troopsSent) {
            const template = TROOP_TEMPLATES[t];
            if (template) used += (state.activeExpedition.troopsSent[t] || 0) * template.space;
        }
    }
    return { used, max };
}

export function trainTroop(troopKey) {
    const template = TROOP_TEMPLATES[troopKey];
    if (!template) return { success: false, reason: "Tropa desconhecida." };
    
    const { used, max } = getArmyCapacity();
    if (used + template.space > max) {
        return { success: false, reason: "Capacidade máxima do exército atingida! Evolua o Quartel para abrigar mais tropas." };
    }

    for (let res in template.cost) {
        if ((state.resources[res] || 0) < template.cost[res]) {
            return { success: false, reason: `Recursos insuficientes! Requer ${template.cost[res]} de ${res}.` };
        }
    }

    for (let res in template.cost) {
        state.resources[res] -= template.cost[res];
    }

    if (!state.army) state.army = { ...DEFAULT_STATE.army };
    state.army[troopKey] = (state.army[troopKey] || 0) + 1;
    saveState();
    return { success: true };
}

export function dismissTroop(troopKey) {
    if (!state.army || !state.army[troopKey] || state.army[troopKey] <= 0) {
        return { success: false, reason: "Nenhuma tropa desta classe para dispensar." };
    }
    state.army[troopKey]--;
    saveState();
    return { success: true };
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
    state.account = { level: 10, xp: 0, xpToNextLevel: 1000 };
    if (!state.unlockedHeroes) state.unlockedHeroes = {};
    for (let h in HERO_TEMPLATES) {
        state.unlockedHeroes[h] = JSON.parse(JSON.stringify(HERO_TEMPLATES[h]));
    }
    state.activeHeroId = 'sword';
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
            delete state.pop.merchants;
            state.tempPop = JSON.parse(JSON.stringify(state.pop));
            delete state.tempPop.merchants;
            state.missions = { ...DEFAULT_STATE.missions, ...(savedState.missions || {}) };
            state.account = { ...DEFAULT_STATE.account, ...(savedState.account || {}) };
            state.levelMissions = { ...DEFAULT_STATE.levelMissions, ...(savedState.levelMissions || {}) };
            state.profile = { ...DEFAULT_STATE.profile, ...(savedState.profile || {}) };
            state.army = { ...DEFAULT_STATE.army, ...(savedState.army || {}) };
            
            // Ban & Account metadata
            state.isBanned = savedState.isBanned || false;
            state.banReason = savedState.banReason || '';
            state.bannedAt = savedState.bannedAt || null;
            state.userEmail = savedState.userEmail || '';
            state.displayName = savedState.displayName || '';

            // Migração de Hero antigo para unlockedHeroes
            if (savedState.hero && (!savedState.unlockedHeroes || Object.keys(savedState.unlockedHeroes).length === 0)) {
                const h = savedState.hero;
                if (!h.equipped) h.equipped = { weapon: null, offhand: null, helmet: null, armor: null, accessory: null };
                state.unlockedHeroes = { [h.id]: h };
                state.activeHeroId = h.id;
            } else {
                state.unlockedHeroes = savedState.unlockedHeroes || {};
                state.activeHeroId = savedState.activeHeroId || null;
            }

            state.inventory = savedState.inventory || [];
            state.tower = { ...DEFAULT_STATE.tower, ...(savedState.tower || {}) };
            state.activeExpedition = savedState.activeExpedition || null;
            state.fatigue = { ...DEFAULT_STATE.fatigue, ...(savedState.fatigue || {}) };

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
                delete state.pop.merchants;
                state.tempPop = JSON.parse(JSON.stringify(state.pop));
                delete state.tempPop.merchants;
                state.missions = { ...DEFAULT_STATE.missions, ...(savedState.missions || {}) };
                state.account = { ...DEFAULT_STATE.account, ...(savedState.account || {}) };
                state.levelMissions = { ...DEFAULT_STATE.levelMissions, ...(savedState.levelMissions || {}) };
                state.profile = { ...DEFAULT_STATE.profile, ...(savedState.profile || {}) };
                state.army = { ...DEFAULT_STATE.army, ...(savedState.army || {}) };

                state.isBanned = savedState.isBanned || false;
                state.banReason = savedState.banReason || '';
                state.bannedAt = savedState.bannedAt || null;
                state.userEmail = savedState.userEmail || '';
                state.displayName = savedState.displayName || '';

                if (savedState.hero && (!savedState.unlockedHeroes || Object.keys(savedState.unlockedHeroes).length === 0)) {
                    const h = savedState.hero;
                    if (!h.equipped) h.equipped = { weapon: null, offhand: null, helmet: null, armor: null, accessory: null };
                    state.unlockedHeroes = { [h.id]: h };
                    state.activeHeroId = h.id;
                } else {
                    state.unlockedHeroes = savedState.unlockedHeroes || {};
                    state.activeHeroId = savedState.activeHeroId || null;
                }

                state.inventory = savedState.inventory || [];
                state.tower = { ...DEFAULT_STATE.tower, ...(savedState.tower || {}) };
                state.activeExpedition = savedState.activeExpedition || null;
                state.fatigue = { ...DEFAULT_STATE.fatigue, ...(savedState.fatigue || {}) };

                console.log("Vila carregada do LocalStorage! Sincronizando com a nuvem...");
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
    if (!currentUserUid) return;

    const user = auth.currentUser;
    if (user) {
        state.userEmail = user.email || state.userEmail || '';
        state.displayName = user.displayName || state.displayName || 'Líder Felino';
    }
    state.lastUpdated = Date.now();

    // Backup local imediato
    try {
        localStorage.setItem(`felineas_backup_${currentUserUid}`, JSON.stringify(state));
    } catch(e) {}

    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.textContent = '☁️ Salvando...';
        statusEl.style.opacity = '1';
    }

    try {
        const docRef = doc(db, "villages", currentUserUid);
        await setDoc(docRef, state, { merge: true });

        // Tenta também sincronizar com o índice global de contas para leitura rápida do GM
        try {
            const accSummary = {
                uid: currentUserUid,
                email: state.userEmail || (user ? user.email : '') || 'Não informado',
                displayName: state.displayName || (user ? user.displayName : '') || 'Líder Felino',
                avatar: state.profile?.avatar || '🐱',
                tribe: state.profile?.tribe || 'Pata-Dourada',
                level: state.account?.level || 1,
                xp: state.account?.xp || 0,
                gold: state.resources?.gold || 0,
                diamonds: state.resources?.diamonds || 0,
                isBanned: !!state.isBanned,
                banReason: state.banReason || '',
                bannedAt: state.bannedAt || null,
                lastUpdated: state.lastUpdated
            };
            const indexRef = doc(db, "global", "accounts");
            const snapIndex = await getDoc(indexRef);
            let list = (snapIndex.exists() && Array.isArray(snapIndex.data().list)) ? snapIndex.data().list : [];
            const existingIdx = list.findIndex(a => a.uid === currentUserUid);
            if (existingIdx >= 0) {
                list[existingIdx] = accSummary;
            } else {
                list.push(accSummary);
            }
            await setDoc(indexRef, { list }, { merge: true });
        } catch(idxErr) {
            // Ignora silenciosamente se o índice global não tiver permissão
        }

        if (statusEl) {
            statusEl.textContent = '☁️ Salvo';
            setTimeout(() => {
                if (statusEl.textContent === '☁️ Salvo') {
                    statusEl.style.opacity = '0.5';
                }
            }, 1200);
        }
    } catch(e) {
        console.warn("Erro ao salvar no Firestore (backup local seguro):", e);
        if (statusEl) {
            statusEl.textContent = '💾 Salvo Local';
            statusEl.style.opacity = '0.7';
        }
    }
}

// --- Funções de Gestão de Contas para o GM com Suporte Multi-Fonte & Fallback ---
export async function getAllAccounts() {
    const accountsMap = new Map();
    const meta = {
        firestoreConnected: false,
        totalFound: 0,
        error: null,
        sources: []
    };

    // 1. Tenta buscar da coleção principal 'villages' no Firestore
    try {
        const colRef = collection(db, "villages");
        const snap = await getDocs(colRef);
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const r = data.resources || {};
            accountsMap.set(docSnap.id, {
                uid: docSnap.id,
                email: data.userEmail || (docSnap.id === 'gm' ? 'gm@felineas.com' : 'Não informado'),
                displayName: data.displayName || data.profile?.title || 'Líder Felino',
                avatar: data.profile?.avatar || '🐱',
                tribe: data.profile?.tribe || 'Pata-Dourada',
                level: data.account?.level || 1,
                xp: data.account?.xp || 0,
                fish: Math.floor(r.fish || 0),
                wood: Math.floor(r.wood || 0),
                wool: Math.floor(r.wool || 0),
                gold: Math.floor(r.gold || 0),
                diamonds: Math.floor(r.diamonds || 0),
                resources: {
                    fish: Math.floor(r.fish || 0),
                    wood: Math.floor(r.wood || 0),
                    wool: Math.floor(r.wool || 0),
                    gold: Math.floor(r.gold || 0),
                    diamonds: Math.floor(r.diamonds || 0)
                },
                buildings: data.buildings || {},
                army: data.army || {},
                inventory: Array.isArray(data.inventory) ? data.inventory : [],
                unlockedHeroes: data.unlockedHeroes || {},
                isBanned: !!data.isBanned,
                banReason: data.banReason || '',
                bannedAt: data.bannedAt || null,
                lastUpdated: data.lastUpdated || null,
                source: 'Firestore (villages)'
            });
        });
        meta.firestoreConnected = true;
        meta.sources.push('Firestore villages');
    } catch(e) {
        console.warn("Aviso ao buscar coleção 'villages' no Firestore:", e.message);
        meta.error = e.message;
    }

    // 2. Tenta buscar do índice global 'global/accounts' no Firestore (caso villages tenha regras restritas)
    try {
        const indexRef = doc(db, "global", "accounts");
        const indexSnap = await getDoc(indexRef);
        if (indexSnap.exists()) {
            const list = indexSnap.data().list;
            if (Array.isArray(list)) {
                list.forEach(item => {
                    if (item && item.uid && !accountsMap.has(item.uid)) {
                        const r = item.resources || {};
                        accountsMap.set(item.uid, {
                            ...item,
                            fish: Math.floor(r.fish || item.fish || 0),
                            wood: Math.floor(r.wood || item.wood || 0),
                            wool: Math.floor(r.wool || item.wool || 0),
                            gold: Math.floor(r.gold || item.gold || 0),
                            diamonds: Math.floor(r.diamonds || item.diamonds || 0),
                            army: item.army || {},
                            inventory: Array.isArray(item.inventory) ? item.inventory : [],
                            unlockedHeroes: item.unlockedHeroes || {},
                            source: 'Firestore (global/accounts)'
                        });
                    }
                });
                meta.firestoreConnected = true;
                meta.sources.push('Firestore global/accounts');
            }
        }
    } catch(e) {
        console.warn("Aviso ao buscar índice 'global/accounts':", e.message);
    }

    // 3. Varre backups locais no LocalStorage (garante que contas locais/testes sempre apareçam)
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('felineas_backup_')) {
                const uid = key.replace('felineas_backup_', '');
                if (!accountsMap.has(uid)) {
                    try {
                        const localData = JSON.parse(localStorage.getItem(key));
                        const r = localData.resources || {};
                        accountsMap.set(uid, {
                            uid: uid,
                            email: localData.userEmail || (uid === 'gm' ? 'gm@felineas.com' : 'Local / Offline'),
                            displayName: localData.displayName || localData.profile?.title || 'Líder Felino',
                            avatar: localData.profile?.avatar || '🐱',
                            tribe: localData.profile?.tribe || 'Pata-Dourada',
                            level: localData.account?.level || 1,
                            xp: localData.account?.xp || 0,
                            fish: Math.floor(r.fish || 0),
                            wood: Math.floor(r.wood || 0),
                            wool: Math.floor(r.wool || 0),
                            gold: Math.floor(r.gold || 0),
                            diamonds: Math.floor(r.diamonds || 0),
                            resources: {
                                fish: Math.floor(r.fish || 0),
                                wood: Math.floor(r.wood || 0),
                                wool: Math.floor(r.wool || 0),
                                gold: Math.floor(r.gold || 0),
                                diamonds: Math.floor(r.diamonds || 0)
                            },
                            buildings: localData.buildings || {},
                            army: localData.army || {},
                            inventory: Array.isArray(localData.inventory) ? localData.inventory : [],
                            unlockedHeroes: localData.unlockedHeroes || {},
                            isBanned: !!localData.isBanned,
                            banReason: localData.banReason || '',
                            bannedAt: localData.bannedAt || null,
                            lastUpdated: localData.lastUpdated || null,
                            source: 'Cache Local'
                        });
                        meta.sources.push('Cache Local');
                    } catch(jsonErr) {}
                }
            }
        }
    } catch(lsErr) {
        console.warn("Aviso ao ler localStorage:", lsErr);
    }

    // 4. Se houver um usuário ativo na memória, certifique-se de que ele está presente e atualizado
    if (currentUserUid) {
        const currentData = {
            uid: currentUserUid,
            email: state.userEmail || (auth.currentUser ? auth.currentUser.email : `${currentUserUid}@felineas.local`),
            displayName: state.displayName || state.profile?.title || 'Líder Felino',
            avatar: state.profile?.avatar || '🐱',
            tribe: state.profile?.tribe || 'Pata-Dourada',
            role: state.role || (state.isAdmin ? 'admin' : 'player'),
            isAdmin: !!state.isAdmin,
            level: state.account?.level || 1,
            xp: state.account?.xp || 0,
            fish: Math.floor(state.resources?.fish || 0),
            wood: Math.floor(state.resources?.wood || 0),
            wool: Math.floor(state.resources?.wool || 0),
            gold: Math.floor(state.resources?.gold || 0),
            diamonds: Math.floor(state.resources?.diamonds || 0),
            resources: { ...state.resources },
            buildings: state.buildings || {},
            army: state.army || {},
            inventory: Array.isArray(state.inventory) ? state.inventory : [],
            unlockedHeroes: state.unlockedHeroes || {},
            isBanned: !!state.isBanned,
            banReason: state.banReason || '',
            bannedAt: state.bannedAt || null,
            lastUpdated: state.lastUpdated || Date.now(),
            source: 'Sessão Ativa'
        };
        accountsMap.set(currentUserUid, currentData);
    }

    // 4b. Sincroniza com o registro de contas cadastradas localmente
    try {
        const creds = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
        Object.values(creds).forEach(c => {
            let regInv = [];
            let regHeroes = {};
            let regArmy = {};
            try {
                const bRaw = localStorage.getItem(`felineas_backup_${c.uid}`);
                if (bRaw) {
                    const bData = JSON.parse(bRaw);
                    if (Array.isArray(bData.inventory)) regInv = bData.inventory;
                    if (bData.unlockedHeroes) regHeroes = bData.unlockedHeroes;
                    if (bData.army) regArmy = bData.army;
                }
            } catch(bErr) {}

            if (c && c.uid && accountsMap.has(c.uid)) {
                const acc = accountsMap.get(c.uid);
                acc.role = c.role || (c.isAdmin ? 'admin' : 'player');
                acc.isAdmin = !!(c.isAdmin || c.role === 'admin');
                if (c.email && (!acc.email || acc.email.includes('Não informado'))) acc.email = c.email;
                if ((!acc.inventory || acc.inventory.length === 0) && regInv.length > 0) acc.inventory = regInv;
            } else if (c && c.uid && !accountsMap.has(c.uid)) {
                accountsMap.set(c.uid, {
                    uid: c.uid,
                    email: c.email || 'Não informado',
                    displayName: c.displayName || 'Líder Felino',
                    avatar: c.isAdmin ? '👑' : '🐱',
                    tribe: 'Os Pata-Dourada',
                    role: c.role || (c.isAdmin ? 'admin' : 'player'),
                    isAdmin: !!(c.isAdmin || c.role === 'admin'),
                    level: c.isAdmin ? 10 : 1,
                    xp: 0,
                    gold: c.isAdmin ? 500 : 0,
                    diamonds: c.isAdmin ? 100 : 5,
                    resources: { fish: 40, wood: 35, wool: 10, stone: 0, coal: 0, iron: 0, gold: c.isAdmin ? 500 : 0, diamonds: c.isAdmin ? 100 : 5 },
                    buildings: { cabana: 1, cais: 1, arranhador: 1, mina: 1, quartel: 0, prefeitura: 0, mercado: 0 },
                    army: regArmy,
                    inventory: regInv,
                    unlockedHeroes: regHeroes,
                    isBanned: false,
                    banReason: '',
                    bannedAt: null,
                    lastUpdated: Date.now(),
                    source: 'Cadastro Local'
                });
            }
        });
    } catch (e) {
        console.warn('Erro ao carregar felineas_registered_accounts:', e);
    }

    // Contas genuínas do reino
    const accountsArray = Array.from(accountsMap.values()).filter(acc => !acc.uid.startsWith('vila_'));
    accountsArray.meta = meta;
    return accountsArray;
}

// --- Ranking Público e Seguro das Vilas Mais Ricas (Ouro) ---
export async function getRichestVillagesRanking(limit = 10) {
    try {
        const accs = await getAllAccounts();
        const list = accs
            .filter(a => !a.isBanned && !a.uid.startsWith('vila_'))
            .map(a => ({
                uid: a.uid,
                displayName: a.displayName || 'Líder Felino',
                avatar: a.avatar || '🐱',
                tribe: a.tribe || 'Pata-Dourada',
                level: a.level || 1,
                gold: Math.floor(a.gold || 0),
                source: a.source || 'Nuvem'
            }))
            .sort((a, b) => b.gold - a.gold)
            .slice(0, limit);
        return list;
    } catch(e) {
        console.warn("Aviso ao carregar ranking de vilas mais ricas:", e);
        return [];
    }
}


export async function banAccount(uid, reason = '') {
    try {
        const docRef = doc(db, "villages", uid);
        await updateDoc(docRef, {
            isBanned: true,
            banReason: reason || 'Violação das regras do reino imposta pelo GM.',
            bannedAt: Date.now()
        });
    } catch(e) {}

    try {
        let local = localStorage.getItem(`felineas_backup_${uid}`);
        if (local) {
            let parsed = JSON.parse(local);
            parsed.isBanned = true;
            parsed.banReason = reason || 'Violação das regras do reino imposta pelo GM.';
            parsed.bannedAt = Date.now();
            localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(parsed));
        }
    } catch(e) {}

    if (currentUserUid === uid) {
        state.isBanned = true;
        state.banReason = reason;
        state.bannedAt = Date.now();
    }

    await addGMLog('ban', 'Conta Banida', `Conta UID ${uid} foi banida. Motivo: ${reason}`);
    return { success: true };
}

export async function unbanAccount(uid) {
    try {
        const docRef = doc(db, "villages", uid);
        await updateDoc(docRef, {
            isBanned: false,
            banReason: '',
            bannedAt: null
        });
    } catch(e) {}

    try {
        let local = localStorage.getItem(`felineas_backup_${uid}`);
        if (local) {
            let parsed = JSON.parse(local);
            parsed.isBanned = false;
            parsed.banReason = '';
            parsed.bannedAt = null;
            localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(parsed));
        }
    } catch(e) {}

    if (currentUserUid === uid) {
        state.isBanned = false;
        state.banReason = '';
        state.bannedAt = null;
    }

    await addGMLog('ban', 'Conta Desbanida', `Conta UID ${uid} teve o banimento revogado.`);
    return { success: true };
}

export async function giftAccount(uid, gifts = {}) {
    let gifted = false;
    try {
        const docRef = doc(db, "villages", uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            const curGold = data.resources?.gold || 0;
            const curDiamonds = data.resources?.diamonds || 0;
            const newGold = curGold + (gifts.gold || 0);
            const newDiamonds = curDiamonds + (gifts.diamonds || 0);

            await updateDoc(docRef, {
                "resources.gold": newGold,
                "resources.diamonds": newDiamonds,
                lastUpdated: Date.now()
            });
            gifted = true;
        }
    } catch(e) {}

    try {
        let local = localStorage.getItem(`felineas_backup_${uid}`);
        if (local) {
            let parsed = JSON.parse(local);
            if (!parsed.resources) parsed.resources = {};
            parsed.resources.gold = (parsed.resources.gold || 0) + (gifts.gold || 0);
            parsed.resources.diamonds = (parsed.resources.diamonds || 0) + (gifts.diamonds || 0);
            parsed.lastUpdated = Date.now();
            localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(parsed));
            gifted = true;
        }
    } catch(e) {}

    if (currentUserUid === uid) {
        if (!state.resources) state.resources = {};
        state.resources.gold = (state.resources.gold || 0) + (gifts.gold || 0);
        state.resources.diamonds = (state.resources.diamonds || 0) + (gifts.diamonds || 0);
        saveState();
        gifted = true;
    }

    await addGMLog('gift', 'Presente de Recursos', `UID ${uid} recebeu +${gifts.gold || 0} ouro e +${gifts.diamonds || 0} diamantes.`);
    return { success: gifted };
}

export async function createTestAccount(name = 'Gato de Teste') {
    const testUid = 'test_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const testState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    testState.displayName = name;
    testState.userEmail = `${testUid}@felineas.teste`;
    if (!testState.profile) testState.profile = {};
    testState.profile.title = name;
    testState.resources.fish = 250;
    testState.resources.wood = 250;
    testState.resources.wool = 10;
    testState.resources.stone = 0;
    testState.resources.coal = 0;
    testState.resources.iron = 0;
    testState.resources.gold = 150;
    testState.resources.diamonds = 10;
    testState.account.level = Math.floor(Math.random() * 3) + 1;
    testState.lastUpdated = Date.now();

    try {
        localStorage.setItem(`felineas_backup_${testUid}`, JSON.stringify(testState));
    } catch(e) {}

    try {
        await setDoc(doc(db, "villages", testUid), testState);
    } catch(e) {}

    await addGMLog('village', 'Conta de Teste Criada', `Conta rápida "${name}" gerada com UID ${testUid}`);
    return testState;
}

export async function createCustomVillage(options = {}) {
    const name = options.name || 'Vila Felina ' + Math.floor(Math.random() * 1000);
    const tribe = options.tribe || 'Os Pata-Dourada';
    const level = Math.max(1, Number(options.level) || 1);
    const testUid = 'cat_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000);

    const testState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    testState.displayName = name;
    testState.userEmail = `${testUid}@reino.felineas.com`;
    if (!testState.profile) testState.profile = {};
    testState.profile.title = name;
    testState.profile.tribe = tribe;
    testState.profile.avatar = options.avatar || '🐱';

    testState.account = {
        level: level,
        xp: 0,
        xpToNextLevel: level * 250
    };

    if (options.resources) {
        testState.resources = {
            ...testState.resources,
            ...options.resources
        };
    } else {
        testState.resources.fish = 250;
        testState.resources.wood = 250;
        testState.resources.wool = 10;
        testState.resources.gold = 150;
        testState.resources.diamonds = 10;
    }

    if (options.buildings) {
        testState.buildings = {
            ...testState.buildings,
            ...options.buildings
        };
    }

    testState.lastUpdated = Date.now();

    try {
        localStorage.setItem(`felineas_backup_${testUid}`, JSON.stringify(testState));
    } catch(e) {}

    try {
        await setDoc(doc(db, "villages", testUid), testState);
    } catch(e) {}

    await addGMLog('village', 'Vila Customizada Criada', `Vila "${name}" (${tribe}, Nível ${level}) criada para testes.`);
    return { uid: testUid, state: testState };
}

export async function switchActiveVillage(uid) {
    currentUserUid = uid;
    const loadedState = await loadState(uid);
    await addGMLog('village', 'Troca de Vila Ativa', `GM assumiu o controle da vila UID: ${uid}`);
    return loadedState;
}

export async function updateAccountResources(uid, resourceUpdates) {
    let updated = false;
    try {
        const docRef = doc(db, "villages", uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            const resources = { ...(data.resources || {}), ...resourceUpdates };
            await updateDoc(docRef, { resources, lastUpdated: Date.now() });
            updated = true;
        }
    } catch(e) {}

    try {
        let local = localStorage.getItem(`felineas_backup_${uid}`);
        let parsed = local ? JSON.parse(local) : JSON.parse(JSON.stringify(DEFAULT_STATE));
        parsed.resources = { ...(parsed.resources || {}), ...resourceUpdates };
        parsed.lastUpdated = Date.now();
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(parsed));
        updated = true;
    } catch(e) {}

    if (currentUserUid === uid) {
        state.resources = { ...(state.resources || {}), ...resourceUpdates };
    }

    await addGMLog('account', 'Recursos Editados', `Recursos da conta ${uid} atualizados pelo GM.`);
    return { success: updated };
}

export async function giftDiamonds(uid, amount) {
    const diamonds = Math.max(1, Number(amount) || 10);
    const res = await giftAccount(uid, { diamonds });
    if (res.success) {
        await addGMLog('account', 'Diamantes Concedidos', `${diamonds} 💎 diamantes enviados para a conta ${uid}.`);
    }
    return res;
}

export async function createAccountByGM(options = {}) {
    const name = options.name?.trim() || 'Líder Felino';
    const email = options.email?.trim() || `gato_${Date.now()}@reino.felineas.com`;
    const password = options.password || '123456';
    const tribe = options.tribe || 'Os Pata-Dourada';
    const role = options.role || 'player'; // 'player' | 'admin' | 'moderator'
    const isAdmin = role === 'admin';
    const uid = 'cat_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000);

    const newState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    newState.displayName = name;
    newState.userEmail = email;
    newState.userPassword = password;
    newState.isAdmin = isAdmin;
    newState.role = role;
    if (!newState.profile) newState.profile = {};
    newState.profile.title = isAdmin ? 'Administrador Real (ADM)' : name;
    newState.profile.tribe = tribe;
    newState.profile.avatar = isAdmin ? '👑' : (options.avatar || '🐱');
    newState.account = {
        level: options.level || (isAdmin ? 10 : 1),
        xp: 0,
        xpToNextLevel: (options.level || (isAdmin ? 10 : 1)) * 250
    };

    if (options.resources) {
        newState.resources = {
            ...newState.resources,
            ...options.resources
        };
    } else {
        newState.resources = {
            fish: 40,
            wood: 35,
            wool: 10,
            stone: 0,
            coal: 0,
            iron: 0,
            gold: isAdmin ? 500 : 0,
            diamonds: isAdmin ? 100 : 5
        };
    }

    if (options.buildings) {
        newState.buildings = {
            ...newState.buildings,
            ...options.buildings
        };
    }

    if (options.army) {
        newState.army = {
            ...newState.army,
            ...options.army
        };
    }

    newState.lastUpdated = Date.now();

    // Salva em localStorage
    try {
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(newState));
        const credentialsMap = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
        credentialsMap[email.toLowerCase()] = {
            uid,
            email,
            password,
            displayName: name,
            isAdmin,
            role
        };
        localStorage.setItem('felineas_registered_accounts', JSON.stringify(credentialsMap));
    } catch(e) {}

    // Salva no Firestore
    try {
        await setDoc(doc(db, "villages", uid), newState);
    } catch(e) {}

    await addGMLog('account', 'Conta Criada pelo GM', 
        `Conta "${name}" (${email}) criada com cargo ${isAdmin ? '👑 Administrador (ADM)' : '👤 Jogador'}.`
    );

    return { uid, state: newState };
}

// --- Funções Avançadas de Gestão de Contas (Ficha Completa, Doação de Itens, Senhas, Cargos) ---

export async function getAccountFullData(uid) {
    let accountData = null;

    try {
        const docRef = doc(db, "villages", uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            accountData = snap.data();
            accountData.uid = uid;
        }
    } catch(e) {}

    if (!accountData) {
        try {
            const raw = localStorage.getItem(`felineas_backup_${uid}`);
            if (raw) {
                accountData = JSON.parse(raw);
                accountData.uid = uid;
            }
        } catch(e) {}
    }

    if (!accountData && currentUserUid === uid) {
        accountData = JSON.parse(JSON.stringify(state));
        accountData.uid = uid;
    }

    if (!accountData) {
        const all = await getAllAccounts();
        const found = all.find(a => a.uid === uid);
        if (found) {
            accountData = JSON.parse(JSON.stringify(DEFAULT_STATE));
            accountData.uid = uid;
            accountData.displayName = found.displayName;
            accountData.userEmail = found.email;
            accountData.role = found.role || (found.isAdmin ? 'admin' : 'player');
            accountData.isAdmin = !!(found.isAdmin || found.role === 'admin');
            accountData.resources = { ...(found.resources || {}) };
            accountData.buildings = { ...(found.buildings || DEFAULT_STATE.buildings) };
            accountData.account = { level: found.level || 1, xp: found.xp || 0, xpToNextLevel: (found.level || 1) * 250 };
            accountData.inventory = Array.isArray(found.inventory) ? [...found.inventory] : [];
            accountData.unlockedHeroes = found.unlockedHeroes || {};
            accountData.army = found.army || {};
            try {
                localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(accountData));
            } catch(e) {}
        }
    }

    if (accountData) {
        if (!accountData.buildings) accountData.buildings = { cabana: 1, cais: 1, arranhador: 1, mina: 1, quartel: 0, prefeitura: 0, mercado: 0 };
        if (!accountData.resources) accountData.resources = { fish: 40, wood: 35, wool: 10, stone: 0, coal: 0, iron: 0, gold: 0, diamonds: 5 };
        if (!accountData.army) accountData.army = { scouts: 0, archers: 0, colossus: 0, mages: 0, rogues: 0 };
        if (!Array.isArray(accountData.inventory)) accountData.inventory = [];
        if (!accountData.unlockedHeroes) accountData.unlockedHeroes = {};
    }

    return accountData;
}

export async function updateAccountFull(uid, updates = {}) {
    let target = await getAccountFullData(uid);
    if (!target) return { success: false, reason: "Conta não encontrada." };

    if (updates.displayName) target.displayName = updates.displayName;
    if (updates.userEmail) target.userEmail = updates.userEmail;
    if (updates.tribe && target.profile) target.profile.tribe = updates.tribe;
    if (updates.role) {
        target.role = updates.role;
        target.isAdmin = updates.role === 'admin';
    }
    if (updates.account) target.account = { ...(target.account || {}), ...updates.account };
    if (updates.buildings) target.buildings = { ...(target.buildings || {}), ...updates.buildings };
    if (updates.resources) target.resources = { ...(target.resources || {}), ...updates.resources };
    if (updates.army) target.army = { ...(target.army || {}), ...updates.army };
    if (updates.inventory) target.inventory = updates.inventory;
    if (updates.unlockedHeroes) target.unlockedHeroes = updates.unlockedHeroes;
    target.lastUpdated = Date.now();

    try {
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(target));
        if (target.userEmail) {
            const creds = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
            if (creds[target.userEmail.toLowerCase()]) {
                creds[target.userEmail.toLowerCase()].displayName = target.displayName;
                creds[target.userEmail.toLowerCase()].role = target.role;
                creds[target.userEmail.toLowerCase()].isAdmin = target.isAdmin;
                localStorage.setItem('felineas_registered_accounts', JSON.stringify(creds));
            }
        }
    } catch(e) {}

    try {
        await setDoc(doc(db, "villages", uid), target, { merge: true });
    } catch(e) {}

    if (currentUserUid === uid) {
        if (updates.buildings) state.buildings = { ...state.buildings, ...updates.buildings };
        if (updates.resources) state.resources = { ...state.resources, ...updates.resources };
        if (updates.account) state.account = { ...state.account, ...updates.account };
        if (updates.army) state.army = { ...state.army, ...updates.army };
        if (updates.inventory) state.inventory = updates.inventory;
        if (updates.unlockedHeroes) state.unlockedHeroes = updates.unlockedHeroes;
    }

    await addGMLog('account', 'Ficha de Conta Atualizada', `Conta ${uid} (${target.displayName}) teve atributos e edifícios editados pelo GM.`);
    return { success: true, state: target };
}

export async function giftItemToAccount(uid, itemId) {
    const itemTemplate = ITEM_DATABASE.find(i => i.id === itemId) || BASE_ITEM_DATABASE.find(i => i.id === itemId);
    if (!itemTemplate) return { success: false, reason: "Item não encontrado no catálogo." };

    const target = await getAccountFullData(uid);
    if (!target) return { success: false, reason: "Conta não encontrada." };

    if (!Array.isArray(target.inventory)) target.inventory = [];

    const uniqueId = `item_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const newItemInstance = {
        ...JSON.parse(JSON.stringify(itemTemplate)),
        uid: uniqueId,
        instanceUid: uniqueId,
        giftedByGM: true,
        giftedAt: Date.now()
    };

    target.inventory.push(newItemInstance);
    target.lastUpdated = Date.now();

    try {
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(target));
    } catch(e) {}

    try {
        await setDoc(doc(db, "villages", uid), target, { merge: true });
    } catch(e) {}

    if (currentUserUid === uid) {
        if (!Array.isArray(state.inventory)) state.inventory = [];
        state.inventory.push(newItemInstance);
    }

    await addGMLog('item', 'Item Concedido por GM', `Item "${itemTemplate.name || itemTemplate.nome || 'Item'}" concedido diretamente para a conta ${uid} (${target.displayName}).`);
    return { success: true, item: newItemInstance };
}

export async function updatePlayerItem(uid, itemInstanceUid, newProperties = {}) {
    const target = await getAccountFullData(uid);
    if (!target) return { success: false, reason: "Conta não encontrada." };
    if (!Array.isArray(target.inventory)) target.inventory = [];

    const idx = target.inventory.findIndex(it => (it.uid === itemInstanceUid) || (it.instanceUid === itemInstanceUid) || (it.id === itemInstanceUid));
    if (idx === -1) return { success: false, reason: "Item não encontrado na mochila do jogador." };

    const currentItem = target.inventory[idx];
    target.inventory[idx] = {
        ...currentItem,
        ...newProperties,
        stats: {
            ...(currentItem.stats || {}),
            ...(newProperties.stats || {})
        },
        lastEditedByGM: Date.now()
    };

    await updateAccountFull(uid, { inventory: target.inventory });
    await addGMLog('item', 'Item do Jogador Editado', `Item "${target.inventory[idx].name || target.inventory[idx].nome}" da conta ${uid} (${target.displayName}) foi customizado pelo GM.`);
    return { success: true, item: target.inventory[idx] };
}

export async function removePlayerItem(uid, itemInstanceUid) {
    const target = await getAccountFullData(uid);
    if (!target) return { success: false, reason: "Conta não encontrada." };
    if (!Array.isArray(target.inventory) || target.inventory.length === 0) {
        return { success: false, reason: "Mochila vazia." };
    }

    const idx = target.inventory.findIndex(it => (it.uid === itemInstanceUid) || (it.instanceUid === itemInstanceUid) || (it.id === itemInstanceUid));
    if (idx === -1) return { success: false, reason: "Item não encontrado na mochila do jogador." };

    const removed = target.inventory.splice(idx, 1)[0];
    await updateAccountFull(uid, { inventory: target.inventory });
    await addGMLog('item', 'Item Removido da Mochila', `Item "${removed.name || removed.nome}" foi removido da conta ${uid} (${target.displayName}) pelo GM.`);
    return { success: true, item: removed };
}

export async function resetAccountPassword(uid, newPassword) {
    if (!newPassword || newPassword.length < 4) {
        return { success: false, reason: "A nova senha deve ter no mínimo 4 caracteres." };
    }

    const target = await getAccountFullData(uid);
    if (!target) return { success: false, reason: "Conta não encontrada." };

    target.userPassword = newPassword;
    target.lastUpdated = Date.now();

    try {
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(target));
        const email = (target.userEmail || '').toLowerCase();
        if (email) {
            const creds = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
            if (creds[email]) {
                creds[email].password = newPassword;
            } else {
                creds[email] = {
                    uid,
                    email,
                    password: newPassword,
                    displayName: target.displayName,
                    role: target.role || 'player',
                    isAdmin: !!target.isAdmin
                };
            }
            localStorage.setItem('felineas_registered_accounts', JSON.stringify(creds));
        }
    } catch(e) {}

    try {
        await updateDoc(doc(db, "villages", uid), { userPassword: newPassword, lastUpdated: Date.now() });
    } catch(e) {}

    await addGMLog('auth', 'Senha Redefinida por GM', `Senha da conta ${uid} (${target.displayName}) foi redefinida diretamente pelo GM.`);
    return { success: true };
}

export async function setAccountRole(uid, newRole) {
    const isAdmin = newRole === 'admin';
    const target = await getAccountFullData(uid);
    if (!target) return { success: false, reason: "Conta não encontrada." };

    target.role = newRole;
    target.isAdmin = isAdmin;
    target.lastUpdated = Date.now();

    try {
        localStorage.setItem(`felineas_backup_${uid}`, JSON.stringify(target));
        const email = (target.userEmail || '').toLowerCase();
        if (email) {
            const creds = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
            if (creds[email]) {
                creds[email].role = newRole;
                creds[email].isAdmin = isAdmin;
                localStorage.setItem('felineas_registered_accounts', JSON.stringify(creds));
            }
        }
    } catch(e) {}

    try {
        await updateDoc(doc(db, "villages", uid), { role: newRole, isAdmin, lastUpdated: Date.now() });
    } catch(e) {}

    await addGMLog('account', 'Cargo Alterado por GM', `Conta ${uid} (${target.displayName}) agora tem cargo "${newRole.toUpperCase()}".`);
    return { success: true, role: newRole, isAdmin };
}

export async function deleteAccountPermanently(uid) {
    let deleted = false;

    try {
        localStorage.removeItem(`felineas_backup_${uid}`);
        const creds = JSON.parse(localStorage.getItem('felineas_registered_accounts') || '{}');
        for (let email in creds) {
            if (creds[email].uid === uid) {
                delete creds[email];
            }
        }
        localStorage.setItem('felineas_registered_accounts', JSON.stringify(creds));
        deleted = true;
    } catch(e) {}

    try {
        const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js");
        await deleteDoc(doc(db, "villages", uid));
        deleted = true;
    } catch(e) {}

    await addGMLog('account', 'Conta Excluída', `Conta UID ${uid} foi removida permanentemente do reino pelo GM.`);
    return { success: deleted };
}

export async function addGMLog(category, action, details, author = 'GM Supremo') {
    const logItem = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
        category: category || 'system',
        action: action || 'Ação de GM',
        details: details || '',
        author: author || 'GM Supremo'
    };

    try {
        const localLogs = JSON.parse(localStorage.getItem('felineas_gm_logs') || '[]');
        localLogs.unshift(logItem);
        if (localLogs.length > 200) localLogs.pop();
        localStorage.setItem('felineas_gm_logs', JSON.stringify(localLogs));
    } catch(e) {}

    try {
        const docRef = doc(db, "global", "logs");
        const snap = await getDoc(docRef);
        let logsList = [];
        if (snap.exists() && Array.isArray(snap.data().list)) {
            logsList = snap.data().list;
        }
        logsList.unshift(logItem);
        if (logsList.length > 100) logsList = logsList.slice(0, 100);
        await setDoc(docRef, { list: logsList }, { merge: true });
    } catch(e) {}

    return logItem;
}

export async function getGMLogs() {
    let logs = [];
    try {
        const docRef = doc(db, "global", "logs");
        const snap = await getDoc(docRef);
        if (snap.exists() && Array.isArray(snap.data().list)) {
            logs = snap.data().list;
        }
    } catch(e) {}

    if (!logs || logs.length === 0) {
        try {
            logs = JSON.parse(localStorage.getItem('felineas_gm_logs') || '[]');
        } catch(e) {
            logs = [];
        }
    }
    return logs;
}

export async function clearGMLogs() {
    try {
        localStorage.removeItem('felineas_gm_logs');
    } catch(e) {}
    try {
        const docRef = doc(db, "global", "logs");
        await setDoc(docRef, { list: [] });
    } catch(e) {}
    return true;
}
