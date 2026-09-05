// =============================================================================
// FELINEAS RPG - SISTEMA DE ÁRVORE DE TALENTOS & ATAQUES D&D 5E
// =============================================================================

export const HERO_TALENT_TREES = {
    sword: {
        heroId: 'sword',
        heroName: 'Leonidas Garra-de-Aço',
        class: 'Cavaleiro',
        branches: [
            {
                id: 'vanguard',
                name: 'Vanguarda Protetora',
                icon: '🛡️',
                desc: 'Técnicas defensivas e comando de linha de frente, absorvendo o impacto dos golpes mais brutais.',
                talents: [
                    {
                        id: 'sword_vanguard_1',
                        name: 'Postura Defensiva',
                        icon: '🛡️',
                        tier: 1,
                        type: 'passive',
                        desc: '+2 na Classe de Armadura (CA). O Cavaleiro posiciona seu escudo com precisão militar.',
                        bonus: { ac: 2 },
                        cost: 1
                    },
                    {
                        id: 'sword_vanguard_2',
                        name: 'Escudo Inabalável',
                        icon: '🧱',
                        tier: 2,
                        type: 'passive',
                        requires: 'sword_vanguard_1',
                        desc: 'Reduz o dano sofrido por todas as tropas do esquadrão em 20%.',
                        bonus: { squadDamageReductionPct: 20 },
                        cost: 1
                    },
                    {
                        id: 'sword_vanguard_3',
                        name: 'Golpe Rompe-Escudo',
                        icon: '💥',
                        tier: 3,
                        type: 'active_attack',
                        requires: 'sword_vanguard_2',
                        desc: 'Ataque Especial: Causa 1d10 + FOR e racha a defesa inimiga, reduzindo a CA do alvo em 3.',
                        activeEffect: {
                            name: 'Golpe Rompe-Escudo',
                            damageDice: '1d10',
                            statKey: 'strength',
                            debuffTargetAC: 3,
                            cooldownRounds: 3
                        },
                        cost: 1
                    },
                    {
                        id: 'sword_vanguard_4',
                        name: 'Muralha Viva',
                        icon: '🏰',
                        tier: 4,
                        type: 'passive',
                        requires: 'sword_vanguard_3',
                        desc: 'Quando o HP do Herói cai abaixo de 35%, ganha imediatamente +40 de HP temporário de bravura.',
                        bonus: { emergencyBarrierHp: 40 },
                        cost: 2
                    }
                ]
            },
            {
                id: 'fury',
                name: 'Fúria Rúnica',
                icon: '⚔️',
                desc: 'Ataques impiedosos fortalecidos por runas de batalha forjadas nas pedras sagradas dos becos.',
                talents: [
                    {
                        id: 'sword_fury_1',
                        name: 'Lâmina Afiada',
                        icon: '🗡️',
                        tier: 1,
                        type: 'passive',
                        desc: '+1d4 de dano de corte em todos os ataques físicos.',
                        bonus: { bonusDamageDice: '1d4' },
                        cost: 1
                    },
                    {
                        id: 'sword_fury_2',
                        name: 'Fúria de Batalha',
                        icon: '🔥',
                        tier: 2,
                        type: 'passive',
                        requires: 'sword_fury_1',
                        desc: 'Ganha Vantagem no primeiro ataque de cada combate (rola 2d20 e escolhe o maior).',
                        bonus: { firstRoundAdvantage: true },
                        cost: 1
                    },
                    {
                        id: 'sword_fury_3',
                        name: 'Corte em Turbilhão',
                        icon: '🌪️',
                        tier: 3,
                        type: 'active_attack',
                        requires: 'sword_fury_2',
                        desc: 'Ataque Especial: Giro devastador que atinge o inimigo com 2d8 + FOR de dano letal.',
                        activeEffect: {
                            name: 'Corte em Turbilhão',
                            damageDice: '2d8',
                            statKey: 'strength',
                            cooldownRounds: 3
                        },
                        cost: 1
                    },
                    {
                        id: 'sword_fury_4',
                        name: 'Mestre da Espada',
                        icon: '👑',
                        tier: 4,
                        type: 'passive',
                        requires: 'sword_fury_3',
                        desc: 'Acerto Crítico aprimorado: Obtém Acerto Crítico Natural no d20 com resultados 19 ou 20!',
                        bonus: { critThreshold: 19 },
                        cost: 2
                    }
                ]
            }
        ]
    },
    bow: {
        heroId: 'bow',
        heroName: 'Lyra Olho-de-Lince',
        class: 'Arqueira',
        branches: [
            {
                id: 'precision',
                name: 'Precisão Mortal',
                icon: '🎯',
                desc: 'Tiros cirúrgicos à longa distância capazes de encontrar frestas invisíveis nas defesas inimigas.',
                talents: [
                    {
                        id: 'bow_precision_1',
                        name: 'Olhos de Águia',
                        icon: '👁️',
                        tier: 1,
                        type: 'passive',
                        desc: '+2 de bônus fixo nas rolagens de ataque d20. Suas flechas quase nunca erram.',
                        bonus: { attackRollBonus: 2 },
                        cost: 1
                    },
                    {
                        id: 'bow_precision_2',
                        name: 'Disparo Penetrante',
                        icon: '🏹',
                        tier: 2,
                        type: 'passive',
                        requires: 'bow_precision_1',
                        desc: 'Ignora 2 pontos da Classe de Armadura (CA) dos alvos.',
                        bonus: { armorPenetration: 2 },
                        cost: 1
                    },
                    {
                        id: 'bow_precision_3',
                        name: 'Tiro no Coração',
                        icon: '💘',
                        tier: 3,
                        type: 'active_attack',
                        requires: 'bow_precision_2',
                        desc: 'Ataque Especial: Disparo mortal que perfura órgãos vitais causando 2d10 + DES.',
                        activeEffect: {
                            name: 'Tiro no Coração',
                            damageDice: '2d10',
                            statKey: 'dexterity',
                            cooldownRounds: 3
                        },
                        cost: 1
                    },
                    {
                        id: 'bow_precision_4',
                        name: 'Letalidade Suprema',
                        icon: '☠️',
                        tier: 4,
                        type: 'passive',
                        requires: 'bow_precision_3',
                        desc: 'Ao tirar Acerto Crítico, causa Dano Triplo de dados em vez de dobro!',
                        bonus: { critMultiplier: 3 },
                        cost: 2
                    }
                ]
            },
            {
                id: 'cunning',
                name: 'Furtividade & Astúcia',
                icon: '🥷',
                desc: 'Passos velados pelas sombras, toxinas e emboscadas antes do inimigo reagir.',
                talents: [
                    {
                        id: 'bow_cunning_1',
                        name: 'Passo Silencioso',
                        icon: '🐾',
                        tier: 1,
                        type: 'passive',
                        desc: '+4 de bônus na rolagem de Iniciativa d20. Garante quase sempre a primeira ação.',
                        bonus: { initiativeBonus: 4 },
                        cost: 1
                    },
                    {
                        id: 'bow_cunning_2',
                        name: 'Veneno de Salmão Negro',
                        icon: '🧪',
                        tier: 2,
                        type: 'passive',
                        requires: 'bow_cunning_1',
                        desc: 'Suas flechas gotejam veneno, causando 1d6 de dano contínuo ao inimigo a cada rodada.',
                        bonus: { poisonDpsDice: '1d6' },
                        cost: 1
                    },
                    {
                        id: 'bow_cunning_3',
                        name: 'Saraivada das Sombras',
                        icon: '🌧️',
                        tier: 3,
                        type: 'active_attack',
                        requires: 'bow_cunning_2',
                        desc: 'Ataque Especial: Três flechas em rápida sucessão causando 3d6 + DES de dano.',
                        activeEffect: {
                            name: 'Saraivada das Sombras',
                            damageDice: '3d6',
                            statKey: 'dexterity',
                            cooldownRounds: 3
                        },
                        cost: 1
                    },
                    {
                        id: 'bow_cunning_4',
                        name: 'Emboscada Mortal',
                        icon: '⚡',
                        tier: 4,
                        type: 'passive',
                        requires: 'bow_cunning_3',
                        desc: 'Se tiver maior Iniciativa no combate, desfere 2 ataques completos na primeira rodada!',
                        bonus: { doubleTurnFirstRound: true },
                        cost: 2
                    }
                ]
            }
        ]
    },
    mage: {
        heroId: 'mage',
        heroName: 'Morgan Ronrom-Arcano',
        class: 'Mago',
        branches: [
            {
                id: 'evocation',
                name: 'Evocação Cósmica',
                icon: '🔮',
                desc: 'Magia de destruição pura, invocando raios e cometas dos Deuses Felinos Primordiais.',
                talents: [
                    {
                        id: 'mage_evocation_1',
                        name: 'Orbe Crepitante',
                        icon: '⚡',
                        tier: 1,
                        type: 'passive',
                        desc: '+1d6 de dano de eletricidade arcana em todos os ataques mágicos.',
                        bonus: { bonusDamageDice: '1d6' },
                        cost: 1
                    },
                    {
                        id: 'mage_evocation_2',
                        name: 'Foco Arcano',
                        icon: '✨',
                        tier: 2,
                        type: 'passive',
                        requires: 'mage_evocation_1',
                        desc: '+2 de bônus fixo nas rolagens de acerto mágico d20.',
                        bonus: { attackRollBonus: 2 },
                        cost: 1
                    },
                    {
                        id: 'mage_evocation_3',
                        name: 'Bola de Fogo Arcana',
                        icon: '🔥',
                        tier: 3,
                        type: 'active_attack',
                        requires: 'mage_evocation_2',
                        desc: 'Magia Especial: Esfera incandescente de chamas celestes causando 3d8 + INT de dano.',
                        activeEffect: {
                            name: 'Bola de Fogo Arcana',
                            damageDice: '3d8',
                            statKey: 'intelligence',
                            cooldownRounds: 3
                        },
                        cost: 1
                    },
                    {
                        id: 'mage_evocation_4',
                        name: 'Supernova Primordial',
                        icon: '🌌',
                        tier: 4,
                        type: 'active_attack',
                        requires: 'mage_evocation_3',
                        desc: 'Magia Suprema: Colapso estelar cósmico causando massivos 4d10 de dano!',
                        activeEffect: {
                            name: 'Supernova Primordial',
                            damageDice: '4d10',
                            statKey: 'intelligence',
                            cooldownRounds: 5
                        },
                        cost: 2
                    }
                ]
            },
            {
                id: 'abjuration',
                name: 'Abjuração & Ilusão',
                icon: '🌀',
                desc: 'Feitiços de proteção e campos de força gravitacionais tecidos com lã mística.',
                talents: [
                    {
                        id: 'mage_abjuration_1',
                        name: 'Armadura Arcana',
                        icon: '🛡️',
                        tier: 1,
                        type: 'passive',
                        desc: '+3 na Classe de Armadura (CA). Uma película translúcida de éter envolve o Mago.',
                        bonus: { ac: 3 },
                        cost: 1
                    },
                    {
                        id: 'mage_abjuration_2',
                        name: 'Barreira de Lã Protetora',
                        icon: '🧶',
                        tier: 2,
                        type: 'passive',
                        requires: 'mage_abjuration_1',
                        desc: 'Absorve os primeiros 20 pontos de dano recebidos em cada combate.',
                        bonus: { combatShieldHp: 20 },
                        cost: 1
                    },
                    {
                        id: 'mage_abjuration_3',
                        name: 'Pulso Gravitacional',
                        icon: '🪐',
                        tier: 3,
                        type: 'active_attack',
                        requires: 'mage_abjuration_2',
                        desc: 'Magia Especial: Onda de choque que causa 2d6 + INT e atordoa o inimigo por 1 turno.',
                        activeEffect: {
                            name: 'Pulso Gravitacional',
                            damageDice: '2d6',
                            statKey: 'intelligence',
                            stunTarget: true,
                            cooldownRounds: 3
                        },
                        cost: 1
                    },
                    {
                        id: 'mage_abjuration_4',
                        name: 'Transcendência Feérica',
                        icon: '🌟',
                        tier: 4,
                        type: 'passive',
                        requires: 'mage_abjuration_3',
                        desc: 'Ao sofrer golpe fatal, o Mago se desfaz em fios de luz e renasce com 30% de Vida Máxima!',
                        bonus: { reviveOnceHpPct: 30 },
                        cost: 2
                    }
                ]
            }
        ]
    }
};

/**
 * Retorna a árvore de talentos correspondente ao herói
 */
export function getTalentTreeForHero(heroId) {
    return HERO_TALENT_TREES[heroId] || null;
}

/**
 * Calcula o total de bônus acumulados pelos talentos desbloqueados de um herói
 */
export function computeHeroTalentBonuses(hero) {
    const summary = {
        acBonus: 0,
        attackRollBonus: 0,
        armorPenetration: 0,
        critThreshold: 20,
        critMultiplier: 2,
        initiativeBonus: 0,
        firstRoundAdvantage: false,
        doubleTurnFirstRound: false,
        emergencyBarrierHp: 0,
        combatShieldHp: 0,
        reviveOnceHpPct: 0,
        poisonDpsDice: null,
        bonusDamageDice: null,
        squadDamageReductionPct: 0,
        activeAttacks: []
    };

    if (!hero || !hero.talents) return summary;

    const tree = HERO_TALENT_TREES[hero.id];
    if (!tree) return summary;

    tree.branches.forEach(branch => {
        branch.talents.forEach(talent => {
            if (hero.talents[talent.id]) {
                // Passivas
                if (talent.bonus) {
                    if (talent.bonus.ac) summary.acBonus += talent.bonus.ac;
                    if (talent.bonus.attackRollBonus) summary.attackRollBonus += talent.bonus.attackRollBonus;
                    if (talent.bonus.armorPenetration) summary.armorPenetration += talent.bonus.armorPenetration;
                    if (talent.bonus.critThreshold) summary.critThreshold = Math.min(summary.critThreshold, talent.bonus.critThreshold);
                    if (talent.bonus.critMultiplier) summary.critMultiplier = Math.max(summary.critMultiplier, talent.bonus.critMultiplier);
                    if (talent.bonus.initiativeBonus) summary.initiativeBonus += talent.bonus.initiativeBonus;
                    if (talent.bonus.firstRoundAdvantage) summary.firstRoundAdvantage = true;
                    if (talent.bonus.doubleTurnFirstRound) summary.doubleTurnFirstRound = true;
                    if (talent.bonus.emergencyBarrierHp) summary.emergencyBarrierHp += talent.bonus.emergencyBarrierHp;
                    if (talent.bonus.combatShieldHp) summary.combatShieldHp += talent.bonus.combatShieldHp;
                    if (talent.bonus.reviveOnceHpPct) summary.reviveOnceHpPct = talent.bonus.reviveOnceHpPct;
                    if (talent.bonus.poisonDpsDice) summary.poisonDpsDice = talent.bonus.poisonDpsDice;
                    if (talent.bonus.bonusDamageDice) summary.bonusDamageDice = talent.bonus.bonusDamageDice;
                    if (talent.bonus.squadDamageReductionPct) summary.squadDamageReductionPct += talent.bonus.squadDamageReductionPct;
                }

                // Ataques ativos
                if (talent.type === 'active_attack' && talent.activeEffect) {
                    summary.activeAttacks.push({
                        ...talent.activeEffect,
                        talentId: talent.id,
                        icon: talent.icon
                    });
                }
            }
        });
    });

    return summary;
}

/**
 * Tenta desbloquear um talento para o herói
 */
export function unlockHeroTalent(hero, talentId) {
    if (!hero) return { success: false, reason: "Herói inválido." };
    if (!hero.talents) hero.talents = {};

    if (hero.talents[talentId]) {
        return { success: false, reason: "Este talento já foi aprendido!" };
    }

    const tree = HERO_TALENT_TREES[hero.id];
    if (!tree) return { success: false, reason: "Árvore de talentos não encontrada para esta classe." };

    let targetTalent = null;
    tree.branches.forEach(b => {
        const found = b.talents.find(t => t.id === talentId);
        if (found) targetTalent = found;
    });

    if (!targetTalent) return { success: false, reason: "Talento inexistente." };

    // Checa pré-requisito
    if (targetTalent.requires && !hero.talents[targetTalent.requires]) {
        return { success: false, reason: "Você precisa desbloquear o talento anterior neste ramo primeiro!" };
    }

    // Checa pontos disponíveis
    const cost = targetTalent.cost || 1;
    if ((hero.talentPoints || 0) < cost) {
        return { success: false, reason: `Pontos de talento insuficientes! Requer ${cost} ponto(s). Suba o herói de nível na Torre para ganhar mais pontos!` };
    }

    hero.talentPoints -= cost;
    hero.talents[talentId] = true;

    return { success: true, talent: targetTalent };
}

/**
 * Reseta todos os talentos do herói e devolve os pontos investidos
 */
export function resetHeroTalents(hero) {
    if (!hero || !hero.talents) return 0;
    const tree = HERO_TALENT_TREES[hero.id];
    if (!tree) return 0;

    let refunded = 0;
    tree.branches.forEach(b => {
        b.talents.forEach(t => {
            if (hero.talents[t.id]) {
                refunded += (t.cost || 1);
            }
        });
    });

    hero.talents = {};
    hero.talentPoints = (hero.talentPoints || 0) + refunded;
    return refunded;
}
