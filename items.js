// =============================================================================
// FELINEAS RPG - BANCO DE DADOS DE ITENS & EQUIPAMENTOS (MODULAR)
// =============================================================================

export const BASE_ITEM_DATABASE = [
    // Tier 1 (Níveis 1-3)
    { id: 'item_sword_rusty', name: 'Espada de Ferro Velho', slot: 'weapon', rarity: 'common', icon: '🗡️', desc: 'Uma lâmina firme forjada para os primeiros combatentes felinos.', stats: { strength: 4, hp: 12 }, minQuartel: 1, active: true },
    { id: 'item_bow_wood', name: 'Arco de Junco Selvagem', slot: 'weapon', rarity: 'common', icon: '🏹', desc: 'Arco leve esculpido com bambu resistente dos pântanos.', stats: { dexterity: 4, stamina: 12 }, minQuartel: 1, active: true },
    { id: 'item_staff_wool', name: 'Cajado de Linho Rúnico', slot: 'weapon', rarity: 'common', icon: '🪄', desc: 'Graveto de carvalho com fios encantados de lã.', stats: { intelligence: 4, hp: 10 }, minQuartel: 1, active: true },
    { id: 'item_dagger_thorn', name: 'Adaga de Espinho Rápida', slot: 'weapon', rarity: 'common', icon: '🗡️', desc: 'Lâmina curta afiada em osso de peixe ancestral, ideal para ataques furtivos.', stats: { dexterity: 5, strength: 2 }, minQuartel: 1, active: true },
    { id: 'item_shield_oak', name: 'Escudo de Casca de Carvalho', slot: 'offhand', rarity: 'rare', icon: '🛡️', desc: 'Madeira pesada tratada que absorve impactos com facilidade.', stats: { hp: 30, stamina: 15 }, minQuartel: 1, active: true },
    { id: 'item_shield_bamboo', name: 'Broquel de Bambu Trançado', slot: 'offhand', rarity: 'common', icon: '🛡️', desc: 'Escudo leve que permite esquivas ágeis sem cansar o combatente.', stats: { hp: 18, stamina: 8 }, minQuartel: 1, active: true },
    { id: 'item_boots_leather', name: 'Botas de Couro de Doninha', slot: 'accessory', rarity: 'common', icon: '🐾', desc: 'Passos silenciosos como o cair das folhas de outono.', stats: { dexterity: 3, stamina: 10 }, minQuartel: 1, active: true },
    { id: 'item_ring_claw', name: 'Anel da Garra de Prata', slot: 'accessory', rarity: 'rare', icon: '💍', desc: 'Joia forjada com prata pura que afia os sentidos de combate.', stats: { strength: 4, dexterity: 4, hp: 15 }, minQuartel: 1, active: true },

    // Tier 2 (Níveis 4-6)
    { id: 'item_helm_lynx', name: 'Capuz da Sentinela Noturna', slot: 'helmet', rarity: 'rare', icon: '🪖', desc: 'Capuz de couro macio que agudiza a visão na escuridão.', stats: { dexterity: 8, stamina: 25 }, minQuartel: 4, active: true },
    { id: 'item_circlet_sun', name: 'Tiara de Cristal Solar', slot: 'helmet', rarity: 'rare', icon: '👑', desc: 'Canaliza os raios dourados do sol para clarear os feitiços arcanos.', stats: { intelligence: 10, hp: 20 }, minQuartel: 4, active: true },
    { id: 'item_armor_chain', name: 'Cota de Escamas Felinas', slot: 'armor', rarity: 'rare', icon: '🥋', desc: 'Malha de ferro entrelaçada com escamas de salmão dourado.', stats: { hp: 55, strength: 6 }, minQuartel: 4, active: true },
    { id: 'item_bracers_iron', name: 'Braçadeiras de Ferro Forjado', slot: 'accessory', rarity: 'rare', icon: '⛓️', desc: 'Proteção pesada nos antebraços para rebater lâminas inimigas.', stats: { strength: 6, hp: 25 }, minQuartel: 4, active: true },
    { id: 'item_axe_double', name: 'Machado Duplo das Minas', slot: 'weapon', rarity: 'rare', icon: '🪓', desc: 'Lâmina pesada talhada em ferro negro para partir armaduras rochosas.', stats: { strength: 12, hp: 20 }, minQuartel: 4, active: true },
    { id: 'item_sword_runic', name: 'Lâmina Férrea dos Becos', slot: 'weapon', rarity: 'epic', icon: '⚔️', desc: 'Espada pesada embebida em runas antigas de bravura.', stats: { strength: 14, hp: 35, stamina: 15 }, minQuartel: 4, active: true },
    { id: 'item_tome_arcane', name: 'Grimório das Runas de Lã', slot: 'offhand', rarity: 'epic', icon: '📜', desc: 'Contém encantamentos de faíscas arcanas e barreiras místicas.', stats: { intelligence: 16, stamina: 15, hp: 30 }, minQuartel: 4, active: true },
    { id: 'item_shield_tower', name: 'Escudo Torre de Platina', slot: 'offhand', rarity: 'epic', icon: '🛡️', desc: 'Baluarte impenetrável capaz de conter o avanço de bestas colossais.', stats: { hp: 70, stamina: 25, strength: 6 }, minQuartel: 4, active: true },
    { id: 'item_cloak_shadow', name: 'Manto dos Becos Nebulosos', slot: 'armor', rarity: 'epic', icon: '🥋', desc: 'Tecido escuro que absorve a luz e concede camuflagem impecável.', stats: { hp: 60, dexterity: 12, stamina: 20 }, minQuartel: 4, active: true },
    { id: 'item_amulet_moon', name: 'Talismã da Lua Cheia', slot: 'accessory', rarity: 'epic', icon: '🔮', desc: 'Relíquia luminosa que pulsa com as marés celestes.', stats: { strength: 8, dexterity: 8, intelligence: 8, hp: 40 }, minQuartel: 4, active: true },

    // Tier 3 (Níveis 7-9)
    { id: 'item_crown_lion', name: 'Coroa de Platina do Rei Leão', slot: 'helmet', rarity: 'epic', icon: '👑', desc: 'Símbolo ancestral que concede imponência real.', stats: { strength: 12, intelligence: 12, hp: 65 }, minQuartel: 7, active: true },
    { id: 'item_spear_lightning', name: 'Lança Relampejante dos Cais', slot: 'weapon', rarity: 'epic', icon: '🔱', desc: 'Canaliza a fúria das tempestades marinhas em estocadas perfurantes.', stats: { strength: 18, dexterity: 10, stamina: 25 }, minQuartel: 7, active: true },
    { id: 'item_armor_celestial', name: 'Manto do Crepúsculo Cósmico', slot: 'armor', rarity: 'legendary', icon: '✨', desc: 'Tecido com poeira estelar nas alturas do Monte Ronrom.', stats: { hp: 120, stamina: 45, dexterity: 15, intelligence: 15 }, minQuartel: 7, active: true },
    { id: 'item_cuirass_mithril', name: 'Peitoral de Mithril Felino', slot: 'armor', rarity: 'legendary', icon: '🥋', desc: 'Armadura reluzente, tão leve quanto seda e tão impenetrável quanto diamante.', stats: { hp: 140, strength: 18, stamina: 30 }, minQuartel: 7, active: true },
    { id: 'item_bow_starlight', name: 'Arco Estelar do Vento Veloz', slot: 'weapon', rarity: 'legendary', icon: '🌌', desc: 'Suas flechas brilham como cometas cortando a noite.', stats: { dexterity: 30, stamina: 35, hp: 50 }, minQuartel: 7, active: true },
    { id: 'item_staff_celestial', name: 'Cajado da Supernova Felina', slot: 'weapon', rarity: 'legendary', icon: '⚡', desc: 'Canaliza a energia cósmica primordial dos Deuses Felinos.', stats: { intelligence: 32, hp: 70, stamina: 30 }, minQuartel: 7, active: true },
    { id: 'item_staff_eclipse', name: 'Cajado do Eclipse Eterno', slot: 'weapon', rarity: 'legendary', icon: '🔮', desc: 'Domina o limiar entre a luz e as sombras com devastação arcana.', stats: { intelligence: 36, hp: 60, dexterity: 12 }, minQuartel: 7, active: true },
    { id: 'item_blade_ancestral', name: 'Espada da Fúria do Mamute', slot: 'weapon', rarity: 'legendary', icon: '🗡️', desc: 'Forjada nas chamas ancestrais para o campeão supremo.', stats: { strength: 34, hp: 90, stamina: 30 }, minQuartel: 7, active: true },
    { id: 'item_amulet_phoenix', name: 'Amuleto da Fênix Renascida', slot: 'accessory', rarity: 'legendary', icon: '🔥', desc: 'Infunde o coração do portador com calor revigorante infinito.', stats: { hp: 110, strength: 14, stamina: 40 }, minQuartel: 7, active: true },

    // Tier 4 (Mítico / Nível 10+)
    { id: 'item_claws_bastet', name: 'Garras Primordiais de Bastet', slot: 'weapon', rarity: 'mythic', icon: '🐾', desc: 'Artefato supremo abençoado pela deusa dos felinos. Rasga o próprio tecido da realidade.', stats: { strength: 48, dexterity: 42, hp: 130, stamina: 50 }, minQuartel: 10, active: true },
    { id: 'item_crown_emperor', name: 'Coroa do Imperador Supremo', slot: 'helmet', rarity: 'mythic', icon: '👑', desc: 'Usada pelo soberano que unificou todas as tribos das Terras Felineas.', stats: { strength: 25, dexterity: 25, intelligence: 35, hp: 160 }, minQuartel: 10, active: true },
    { id: 'item_mantle_nine_worlds', name: 'Manto dos Nove Mundos', slot: 'armor', rarity: 'mythic', icon: '🌌', desc: 'Tecido com a matéria escura estelar, concede vigor e resistência divinos.', stats: { hp: 220, stamina: 70, strength: 20, intelligence: 20 }, minQuartel: 10, active: true },
    { id: 'item_eye_sekhmet', name: 'Olho Cósmico de Sekhmet', slot: 'accessory', rarity: 'mythic', icon: '👁️', desc: 'Joia sagrada ardente com a fúria das tempestades solares.', stats: { strength: 30, dexterity: 30, intelligence: 30, hp: 150 }, minQuartel: 10, active: true }
];

export let ITEM_DATABASE = [...BASE_ITEM_DATABASE];

export function setItemDatabase(items) {
    ITEM_DATABASE = Array.isArray(items) ? [...items] : [...BASE_ITEM_DATABASE];
}


export function getItemById(itemId) {
    return ITEM_DATABASE.find(item => item.id === itemId) || null;
}

export function getEligibleDrops(quartelLevel, tier = 1) {
    return ITEM_DATABASE.filter(item => {
        if (item.active === false) return false;
        if (tier === 1 && item.minQuartel <= 3) return true;
        if (tier === 2 && item.minQuartel <= 6) return true;
        if (tier >= 3) return true;
        return item.minQuartel <= quartelLevel;
    });
}
