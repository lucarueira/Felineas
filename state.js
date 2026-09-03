import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export const ITEM_DATABASE = [
    // Tier 1 (Níveis 1-3)
    { id: 'item_sword_rusty', name: 'Espada de Ferro Velho', slot: 'weapon', rarity: 'common', icon: '🗡️', desc: 'Uma lâmina firme forjada para os primeiros combatentes felinos.', stats: { strength: 4, hp: 12 }, minQuartel: 1 },
    { id: 'item_bow_wood', name: 'Arco de Junco Selvagem', slot: 'weapon', rarity: 'common', icon: '🏹', desc: 'Arco leve esculpido com bambu resistente dos pântanos.', stats: { dexterity: 4, stamina: 12 }, minQuartel: 1 },
    { id: 'item_staff_wool', name: 'Cajado de Linho Rúnico', slot: 'weapon', rarity: 'common', icon: '🪄', desc: 'Graveto de carvalho com fios encantados de lã.', stats: { intelligence: 4, hp: 10 }, minQuartel: 1 },
    { id: 'item_shield_oak', name: 'Escudo de Casca de Carvalho', slot: 'offhand', rarity: 'rare', icon: '🛡️', desc: 'Madeira pesada tratada que absorve impactos com facilidade.', stats: { hp: 30, stamina: 15 }, minQuartel: 1 },
    { id: 'item_ring_claw', name: 'Anel da Garra de Prata', slot: 'accessory', rarity: 'rare', icon: '💍', desc: 'Joia forjada com prata pura que afia os sentidos de combate.', stats: { strength: 4, dexterity: 4, hp: 15 }, minQuartel: 1 },

    // Tier 2 (Níveis 4-6)
    { id: 'item_helm_lynx', name: 'Capuz da Sentinela Noturna', slot: 'helmet', rarity: 'rare', icon: '🪖', desc: 'Capuz de couro macio que agudiza a visão na escuridão.', stats: { dexterity: 8, stamina: 25 }, minQuartel: 4 },
    { id: 'item_armor_chain', name: 'Cota de Escamas Felinas', slot: 'armor', rarity: 'rare', icon: '🥋', desc: 'Malha de ferro entrelaçada com escamas de salmão dourado.', stats: { hp: 55, strength: 6 }, minQuartel: 4 },
    { id: 'item_sword_runic', name: 'Lâmina Férrea dos Becos', slot: 'weapon', rarity: 'epic', icon: '⚔️', desc: 'Espada pesada embebida em runas antigas de bravura.', stats: { strength: 14, hp: 35, stamina: 15 }, minQuartel: 4 },
    { id: 'item_tome_arcane', name: 'Grimório das Runas de Lã', slot: 'offhand', rarity: 'epic', icon: '📜', desc: 'Contém encantamentos de faíscas arcanas e barreiras místicas.', stats: { intelligence: 16, stamina: 15, hp: 30 }, minQuartel: 4 },
    { id: 'item_amulet_moon', name: 'Talismã da Lua Cheia', slot: 'accessory', rarity: 'epic', icon: '🔮', desc: 'Relíquia luminosa que pulsa com as marés celestes.', stats: { strength: 8, dexterity: 8, intelligence: 8, hp: 40 }, minQuartel: 4 },

    // Tier 3 (Níveis 7+)
    { id: 'item_crown_lion', name: 'Coroa de Platina do Rei Leão', slot: 'helmet', rarity: 'epic', icon: '👑', desc: 'Símbolo ancestral que concede imponência real.', stats: { strength: 12, intelligence: 12, hp: 65 }, minQuartel: 7 },
    { id: 'item_armor_celestial', name: 'Manto do Crepúsculo Cósmico', slot: 'armor', rarity: 'legendary', icon: '✨', desc: 'Tecido com poeira estelar nas alturas do Monte Ronrom.', stats: { hp: 120, stamina: 45, dexterity: 15, intelligence: 15 }, minQuartel: 7 },
    { id: 'item_bow_starlight', name: 'Arco Estelar do Vento Veloz', slot: 'weapon', rarity: 'legendary', icon: '🌌', desc: 'Suas flechas brilham como cometas cortando a noite.', stats: { dexterity: 30, stamina: 35, hp: 50 }, minQuartel: 7 },
    { id: 'item_staff_celestial', name: 'Cajado da Supernova Felina', slot: 'weapon', rarity: 'legendary', icon: '⚡', desc: 'Canaliza a energia cósmica primordial dos Deuses Felinos.', stats: { intelligence: 32, hp: 70, stamina: 30 }, minQuartel: 7 },
    { id: 'item_blade_ancestral', name: 'Espada da Fúria do Mamute', slot: 'weapon', rarity: 'legendary', icon: '🗡️🔥', desc: 'Forjada nas chamas ancestrais para o campeão supremo.', stats: { strength: 34, hp: 90, stamina: 30 }, minQuartel: 7 }
];

export const TOWER_FLOORS = [
    {
        floor: 1,
        name: 'O Pátio dos Roedores',
        enemy: 'Bando de Ratos Vorazes',
        enemyPower: 35,
        durationSeconds: 15,
        tacticalRequirement: null,
        tacticalHint: 'Inimigos terrestres comuns. Qualquer pelotão bem treinado vence.',
        rewards: { gold: 50, xp: 45, fish: 50 },
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
        rewards: { gold: 90, xp: 80, wood: 60 },
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
        rewards: { gold: 140, xp: 130, stone: 70 },
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
        rewards: { gold: 200, xp: 190, wool: 50 },
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
        rewards: { gold: 350, xp: 320, iron: 50 },
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
        rewards: { gold: 500, xp: 480, iron: 80 },
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
        rewards: { gold: 700, xp: 650, stone: 150 },
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
        rewards: { gold: 1000, xp: 950, coal: 200 },
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
        rewards: { gold: 1500, xp: 1400, iron: 250 },
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
        rewards: { gold: 3000, xp: 2800, iron: 400, diamonds: 10 },
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

const DEFAULT_STATE = {
    resources: { fish: 200, wood: 200, wool: 0, gold: 0, stone: 0, coal: 0, iron: 0, diamonds: 5 },
    buildings: { cabana: 1, cais: 0, arranhador: 0, mina: 0, quartel: 0, prefeitura: 0, mercado: 0 },
    pop: { max: 15, idle: 15, fish: 0, wood: 0, wool: 0, mine: 0, scouts: 0 },
    tempPop: { idle: 15, fish: 0, wood: 0, wool: 0, mine: 0 },
    missions: {
        cabanaLvl2: { done: false, ready: false, desc: "Evolua a Cabana do Líder para o Nível 2", reward: 50 },
        caisLvl1: { done: false, ready: false, desc: "Construa o Cais de Pesca", reward: 100 },
        quartelLvl1: { done: false, ready: false, desc: "Construa o Quartel Felino", reward: 300 },
        towerFloor1: { done: false, ready: false, desc: "Conquiste o Andar 1 da Torre dos Desafios", reward: 150 },
        trainArmy5: { done: false, ready: false, desc: "Treine ao menos 5 guerreiros no Quartel", reward: 200 },
        equipItem1: { done: false, ready: false, desc: "Equipe um Item de Equipamento no seu Herói", reward: 250 }
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
    unlockedHeroes: {}, // { sword: heroObj, ... }
    activeHeroId: null,
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
    state.account.xp += amount;
    let leveledUp = false;
    while (state.account.xp >= state.account.xpToNextLevel) {
        state.account.xp -= state.account.xpToNextLevel;
        state.account.level += 1;
        state.account.xpToNextLevel = Math.floor(state.account.level * 100 * 1.25);
        leveledUp = true;
    }
    return { leveledUp, level: state.account.level, xp: state.account.xp, xpToNextLevel: state.account.xpToNextLevel };
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
    if (unlockedCount === 1) return 3500; // Segundo herói
    return 8000; // Terceiro herói
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
    hero.xp += amount;
    let leveledUp = false;
    while (hero.xp >= hero.xpNext) {
        hero.xp -= hero.xpNext;
        hero.level += 1;
        hero.xpNext = Math.floor(hero.level * 100 * 1.3);
        hero.statPoints = (hero.statPoints || 0) + 2; // +2 pontos estilo Elden Ring
        leveledUp = true;
    }
    saveState();
    return { leveledUp, hero };
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

    // Checagem de Fraquezas Táticas
    let tacticalFailed = false;
    let tacticalReason = "";

    if (floor.tacticalRequirement === 'ranged_or_magic') {
        const hasRanged = (exp.troopsSent.archers || 0) > 0 || (exp.troopsSent.mages || 0) > 0;
        if (!hasRanged && hero.class !== 'Arqueira' && hero.class !== 'Mago') {
            tacticalFailed = true;
            tacticalReason = "Os inimigos voadores voaram alto fora do alcance de espadas e adagas! Faltaram Arqueiros ou Magos da Lã!";
        }
    } else if (floor.tacticalRequirement === 'tank_or_magic') {
        const hasTank = (exp.troopsSent.colossus || 0) > 0 || (exp.troopsSent.mages || 0) > 0;
        if (!hasTank && hero.class !== 'Cavaleiro' && hero.class !== 'Mago') {
            tacticalFailed = true;
            tacticalReason = "As carapaças de rocha sólida ricochetearam os golpes leves! Faltou o impacto dos Colossos ou feitiços arcanos!";
        }
    } else if (floor.tacticalRequirement === 'stealth_or_scout') {
        const hasScout = (exp.troopsSent.rogues || 0) > 0 || (exp.troopsSent.scouts || 0) >= 2;
        if (!hasScout) {
            tacticalFailed = true;
            tacticalReason = "As serpentes das sombras emboscaram seu esquadrão no escuro! Faltaram Ladinos ou Batedores alertas!";
        }
    } else if (floor.tacticalRequirement === 'balanced_squad') {
        const hasMelee = (exp.troopsSent.colossus || 0) > 0 || (exp.troopsSent.scouts || 0) > 0;
        const hasRanged = (exp.troopsSent.archers || 0) > 0 || (exp.troopsSent.mages || 0) > 0;
        if (!hasMelee || !hasRanged) {
            tacticalFailed = true;
            tacticalReason = "O chefe inimigo dispersou as tropas desbalanceadas! Uma formação equilibrada na vanguarda e retaguarda era necessária!";
        }
    }

    const isVictory = !tacticalFailed && (totalPlayerPower >= floor.enemyPower);
    let droppedItem = null;

    if (!state.tower) state.tower = { highestFloor: 1, victories: 0, defeats: 0 };
    if (!state.fatigue) state.fatigue = { armyRestUntil: 0, heroRestUntil: {} };

    // Define descanso de tropas e herói
    const restDuration = isVictory ? 20000 : 15000; // 20s descanso na vitória, 15s na derrota
    state.fatigue.armyRestUntil = now + restDuration;
    if (!state.fatigue.heroRestUntil) state.fatigue.heroRestUntil = {};
    state.fatigue.heroRestUntil[hero.id] = now + restDuration;

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

        // Roll Drop de Item
        if (Math.random() <= floor.dropChance) {
            const availableItems = ITEM_DATABASE.filter(item => {
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
        tacticalReason,
        droppedItem,
        xpGain,
        goldGain: isVictory ? floor.rewards.gold : 0
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

    // Backup local imediato
    localStorage.setItem(`felineas_backup_${currentUserUid}`, JSON.stringify(state));

    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.textContent = '☁️ Salvando...';
        statusEl.style.opacity = '1';
    }

    try {
        const docRef = doc(db, "villages", currentUserUid);
        await setDoc(docRef, state, { merge: true });
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
