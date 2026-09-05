// =============================================================================
// FELINEAS RPG - MOTOR DE COMBATE DE MESA (D&D 5E + CLASH OF CLANS)
// =============================================================================

import { computeHeroTalentBonuses } from './talents.js';

// --- Utilitários de Rolagem de Dados de RPG ---
export function rollD20() {
    return Math.floor(Math.random() * 20) + 1;
}

export function rollDice(sides, count = 1) {
    const rolls = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
        const val = Math.floor(Math.random() * sides) + 1;
        rolls.push(val);
        sum += val;
    }
    return { rolls, sum };
}

export function parseAndRollDice(diceStr, bonus = 0) {
    // Ex: "2d8", "1d10", "3d6"
    const match = (diceStr || '').match(/^(\d+)d(\d+)$/i);
    if (!match) {
        return { diceStr, rolls: [bonus], total: Math.max(1, bonus) };
    }
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const { rolls, sum } = rollDice(sides, count);
    return {
        diceStr,
        rolls,
        sum,
        bonus,
        total: Math.max(1, sum + bonus)
    };
}

// --- Definição dos Andares e Monstros da Torre (D&D Statblocks) ---
export const TOWER_ENEMIES = [
    {
        floor: 1,
        name: 'Rato Carniçal das Sombras',
        title: 'Besta dos Becos Sombrios',
        icon: '🐀',
        hp: 60,
        maxHp: 60,
        ac: 11, // Classe de Armadura
        attackBonus: 3,
        attackDice: '1d6',
        attackStatBonus: 1,
        attackName: 'Mordida Pútrida',
        specialAttack: null,
        tacticalRequirement: null,
        desc: 'Criatura rápida que rasteja pelo lixo dos becos com presas infectadas.'
    },
    {
        floor: 2,
        name: 'Cão Selvagem dos Bosques',
        title: 'Predador Canino Errante',
        icon: '🐺',
        hp: 95,
        maxHp: 95,
        ac: 12,
        attackBonus: 4,
        attackDice: '1d8',
        attackStatBonus: 2,
        attackName: 'Bote Furioso',
        specialAttack: 'Uivo Intimidador',
        tacticalRequirement: null,
        desc: 'Canino feroz que caça em bandos e possui mandíbulas esmagadoras.'
    },
    {
        floor: 3,
        name: 'Gavião dos Penhascos',
        title: 'Terror Alado dos Céus',
        icon: '🦅',
        hp: 125,
        maxHp: 125,
        ac: 13,
        attackBonus: 5,
        attackDice: '1d8',
        attackStatBonus: 2,
        attackName: 'Garras Cortantes',
        specialAttack: 'Mergulho Rasante',
        tacticalRequirement: 'ranged_or_magic',
        desc: 'Voa muito alto para espadas curtas! Tropas à distância (Arqueiros/Magos) são essenciais.'
    },
    {
        floor: 4,
        name: 'Serpente da Cripta Sombria',
        title: 'Veneno da Noite Eterna',
        icon: '🐍',
        hp: 160,
        maxHp: 160,
        ac: 13,
        attackBonus: 5,
        attackDice: '2d6',
        attackStatBonus: 2,
        attackName: 'Presas Tóxicas',
        specialAttack: 'Gargalhada Sinistra',
        tacticalRequirement: 'stealth_or_scout',
        desc: 'Emboscadora astuta. Requer Batedores ou Ladinos atentos para anular suas táticas furtivas.'
    },
    {
        floor: 5,
        name: 'Golem de Pedra Ancestral',
        title: 'Guardião dos Salões Rochosos',
        icon: '🗿',
        hp: 240,
        maxHp: 240,
        ac: 15,
        attackBonus: 6,
        attackDice: '2d8',
        attackStatBonus: 3,
        attackName: 'Esmagamento Sísmico',
        specialAttack: 'Pancada de Rocha',
        tacticalRequirement: 'tank_or_magic',
        desc: 'Carapaça impenetrável de rocha sólida! Somente Colossos ou Feitiços Mágicos podem rachar sua couraça.'
    },
    {
        floor: 6,
        name: 'Urso Pardo das Cavernas',
        title: 'Fera Titânica das Montanhas',
        icon: '🐻',
        hp: 310,
        maxHp: 310,
        ac: 14,
        attackBonus: 7,
        attackDice: '2d8',
        attackStatBonus: 4,
        attackName: 'Patada Devastadora',
        specialAttack: 'Abraço Mortal',
        tacticalRequirement: 'tank_or_magic',
        desc: 'Uma massa de músculos que desfere golpes capazes de romper qualquer vanguarda desprotegida.'
    },
    {
        floor: 7,
        name: 'Bruxa dos Fios Espectrais',
        title: 'Senhora das Ilusões Lunares',
        icon: '🧙‍♀️',
        hp: 380,
        maxHp: 380,
        ac: 15,
        attackBonus: 8,
        attackDice: '3d6',
        attackStatBonus: 4,
        attackName: 'Raio Astral Corrupto',
        specialAttack: 'Nuvem de Pesadelos',
        tacticalRequirement: 'ranged_or_magic',
        desc: 'Conjuradora sombria protegida por barreiras de ilusão que exigem ataques à distância de resposta rápida.'
    },
    {
        floor: 8,
        name: 'Gárgula de Ferro Flamejante',
        title: 'Sentinela dos Pináculos Vulcânicos',
        icon: '🦇',
        hp: 460,
        maxHp: 460,
        ac: 17,
        attackBonus: 9,
        attackDice: '2d10',
        attackStatBonus: 5,
        attackName: 'Sopro de Lava Rúnica',
        specialAttack: 'Investida Incandescente',
        tacticalRequirement: 'tank_or_magic',
        desc: 'Metal ardente temperado em magia negra. Exige Colossos resistentes e magos para resfriar sua blindagem.'
    },
    {
        floor: 9,
        name: 'Quimera Real das Tempestades',
        title: 'Monstruosidade Tricéfala',
        icon: '🦁',
        hp: 580,
        maxHp: 580,
        ac: 17,
        attackBonus: 10,
        attackDice: '3d8',
        attackStatBonus: 5,
        attackName: 'Mordida Tripla da Fúria',
        specialAttack: 'Rugido dos Trovões',
        tacticalRequirement: 'balanced_squad',
        desc: 'Besta colossal que ataca em todas as direções! Requer formação balanceada com vanguarda pesada e retaguarda.'
    },
    {
        floor: 10,
        name: 'Dragoa Ancestral dos Cristais Cósmicos',
        title: 'Soberana Eterna da Torre',
        icon: '🐉',
        hp: 750,
        maxHp: 750,
        ac: 18,
        attackBonus: 11,
        attackDice: '4d8',
        attackStatBonus: 6,
        attackName: 'Sopro de Plasma Estelar',
        specialAttack: 'Cataclismo Primordial',
        tacticalRequirement: 'balanced_squad',
        desc: 'A criatura suprema que corrompeu a torre. Uma divindade primordial com escamas impenetráveis e baforada cósmica!'
    }
];

/**
 * Simula um combate completo no estilo D&D de mesa com rolagem de dados
 */
export function simulateTabletopBattle({
    hero,
    heroStats,
    troopsSent,
    floorNum
}) {
    const enemyTpl = TOWER_ENEMIES.find(e => e.floor === floorNum) || TOWER_ENEMIES[0];
    const enemy = {
        ...enemyTpl,
        currentHp: enemyTpl.hp
    };

    const talentBonuses = computeHeroTalentBonuses(hero);

    // Atributos de D&D do Herói
    let mainStatValue = 10;
    let statKey = 'strength';
    let defaultWeaponDice = '1d8';

    if (hero.class === 'Cavaleiro') {
        mainStatValue = heroStats.strength || 15;
        statKey = 'strength';
        defaultWeaponDice = '1d8';
    } else if (hero.class === 'Arqueira') {
        mainStatValue = heroStats.dexterity || 16;
        statKey = 'dexterity';
        defaultWeaponDice = '1d10';
    } else if (hero.class === 'Mago') {
        mainStatValue = heroStats.intelligence || 16;
        statKey = 'intelligence';
        defaultWeaponDice = '1d8';
    }

    // Modificador de atributo D&D: Math.floor((stat - 10) / 2)
    const statMod = Math.max(1, Math.floor((mainStatValue - 10) / 2));
    const heroProficiency = Math.min(6, 2 + Math.floor((hero.level || 1) / 3));
    const heroAttackBonus = statMod + heroProficiency + (talentBonuses.attackRollBonus || 0);

    // Classe de Armadura (CA) do Herói
    const dexMod = Math.max(0, Math.floor(((heroStats.dexterity || 10) - 10) / 2));
    let heroAC = 10 + dexMod + (talentBonuses.acBonus || 0);
    if (hero.class === 'Cavaleiro') heroAC += 4; // Cota pesada
    if (hero.class === 'Mago') heroAC += (talentBonuses.acBonus ? 0 : 2); // Vestes tecidas
    if (heroStats.bonusHp > 30) heroAC += 1;

    let heroCurrentHp = heroStats.maxHp;
    let barrierHp = (talentBonuses.combatShieldHp || 0);
    let emergencyBarrierUsed = false;
    let revivedUsed = false;

    // Tropas (Clash of Clans)
    const squad = {
        colossus: troopsSent.colossus || 0,
        archers: troopsSent.archers || 0,
        mages: troopsSent.mages || 0,
        rogues: troopsSent.rogues || 0,
        scouts: troopsSent.scouts || 0
    };

    // Vida total da vanguarda dos Colossos (tanques absorvedores de choque)
    let colossusHp = squad.colossus * 45;

    // Checagem prévia de falha tática (D&D Requirement Warning)
    let tacticalPenalty = false;
    let tacticalPenaltyMsg = "";
    if (enemy.tacticalRequirement === 'ranged_or_magic') {
        const hasRanged = squad.archers > 0 || squad.mages > 0 || hero.class === 'Arqueira' || hero.class === 'Mago';
        if (!hasRanged) {
            tacticalPenalty = true;
            tacticalPenaltyMsg = "⚠️ DESVANTAGEM TÁTICA: Inimigos voadores! Seus ataques corpo a corpo sofrem Desvantagem severa.";
        }
    } else if (enemy.tacticalRequirement === 'tank_or_magic') {
        const hasTank = squad.colossus > 0 || squad.mages > 0 || hero.class === 'Cavaleiro' || hero.class === 'Mago';
        if (!hasTank) {
            tacticalPenalty = true;
            tacticalPenaltyMsg = "⚠️ DESVANTAGEM TÁTICA: Carapaça rochosa! Sem Colossos ou Magia para quebrar a couraça inimiga.";
        }
    } else if (enemy.tacticalRequirement === 'stealth_or_scout') {
        const hasScout = squad.rogues > 0 || squad.scouts >= 2;
        if (!hasScout) {
            tacticalPenalty = true;
            tacticalPenaltyMsg = "⚠️ DESVANTAGEM TÁTICA: Emboscada das sombras! O inimigo ganha ataques de surpresa.";
        }
    }

    const combatLog = [];
    const maxRounds = 12;
    let round = 1;

    // Rolagem de Iniciativa (d20 + DES)
    const heroInitD20 = rollD20();
    const heroInitTotal = heroInitD20 + dexMod + (talentBonuses.initiativeBonus || 0);
    const enemyInitD20 = rollD20();
    const enemyInitTotal = enemyInitD20 + 2;

    const heroHasInitiative = heroInitTotal >= enemyInitTotal;

    combatLog.push({
        round: 0,
        phase: 'initiative',
        type: 'info',
        text: `🎲 **Rolagem de Iniciativa:** ${hero.name} tirou [${heroInitD20}] + ${dexMod + (talentBonuses.initiativeBonus || 0)} = **${heroInitTotal}** vs ${enemy.name} [${enemyInitD20}] + 2 = **${enemyInitTotal}**.`
    });

    if (tacticalPenaltyMsg) {
        combatLog.push({
            round: 0,
            phase: 'tactics',
            type: 'warning',
            text: tacticalPenaltyMsg
        });
    }

    let enemyEffectiveAC = enemy.ac;
    if (talentBonuses.armorPenetration) {
        enemyEffectiveAC = Math.max(8, enemyEffectiveAC - talentBonuses.armorPenetration);
    }

    let poisonRounds = 0;

    // Loop de Rodadas
    while (round <= maxRounds && heroCurrentHp > 0 && enemy.currentHp > 0) {
        combatLog.push({
            round,
            phase: 'round_start',
            type: 'round_header',
            text: `⚔️ --- Rodada ${round} ---`
        });

        const executeHeroTurn = () => {
            if (enemy.currentHp <= 0) return;

            // Decide se usa um ataque especial do talento ativo ou ataque normal
            const activeAttacks = talentBonuses.activeAttacks || [];
            let attackUsed = null;
            if (activeAttacks.length > 0 && (round === 1 || round % 3 === 0)) {
                attackUsed = activeAttacks[0]; // Primeiro ataque especial
            }

            const attackName = attackUsed ? attackUsed.name : `${hero.name} golpeia com ${hero.class === 'Cavaleiro' ? 'Lâmina Rúnica' : (hero.class === 'Arqueira' ? 'Arco de Guerra' : 'Feitiço de Lã')}`;
            const damageDiceToUse = attackUsed ? attackUsed.damageDice : defaultWeaponDice;

            // Rolagem do d20
            let d20_1 = rollD20();
            let d20_final = d20_1;
            let hadAdvantage = false;

            if (round === 1 && talentBonuses.firstRoundAdvantage) {
                const d20_2 = rollD20();
                d20_final = Math.max(d20_1, d20_2);
                hadAdvantage = true;
            } else if (tacticalPenalty) {
                const d20_2 = rollD20();
                d20_final = Math.min(d20_1, d20_2); // Desvantagem
            }

            const totalAttackRoll = d20_final + heroAttackBonus;
            const isNat20 = d20_final >= (talentBonuses.critThreshold || 20);
            const isNat1 = d20_final === 1;
            const isHit = isNat20 || (!isNat1 && totalAttackRoll >= enemyEffectiveAC);

            if (isHit) {
                // Rolagem de Dano
                const mult = isNat20 ? (talentBonuses.critMultiplier || 2) : 1;
                const rolledDmg = parseAndRollDice(damageDiceToUse, statMod);
                let totalDmg = (rolledDmg.sum * mult) + statMod;

                // Bônus passivo de dados (ex: Lâmina Afiada 1d4, Orbe Crepitante 1d6)
                if (talentBonuses.bonusDamageDice) {
                    const extra = parseAndRollDice(talentBonuses.bonusDamageDice, 0);
                    totalDmg += extra.sum;
                }

                if (attackUsed && attackUsed.debuffTargetAC) {
                    enemyEffectiveAC = Math.max(7, enemyEffectiveAC - attackUsed.debuffTargetAC);
                }

                enemy.currentHp = Math.max(0, enemy.currentHp - totalDmg);

                combatLog.push({
                    round,
                    phase: 'hero_attack',
                    actor: hero.name,
                    actorIcon: hero.icon || '🐾',
                    target: enemy.name,
                    d20Roll: d20_final,
                    attackBonus: heroAttackBonus,
                    totalRoll: totalAttackRoll,
                    targetAC: enemyEffectiveAC,
                    isNat20,
                    isNat1: false,
                    isHit: true,
                    damage: totalDmg,
                    damageDice: damageDiceToUse,
                    damageRolls: rolledDmg.rolls,
                    targetHpLeft: enemy.currentHp,
                    targetMaxHp: enemy.maxHp,
                    text: isNat20
                        ? `💥 **CRÍTICO NATURAL (d20 [${d20_final}])!** ${hero.name} desfere ${attackName}! Dano multiplicado: **${totalDmg}** (${damageDiceToUse} x${mult} + ${statMod}). Vida inimiga: ${enemy.currentHp}/${enemy.maxHp}.`
                        : `🎯 **ACERTO!** (d20 [${d20_final}] + ${heroAttackBonus} = **${totalAttackRoll}** vs CA ${enemyEffectiveAC}). ${hero.name} causa **${totalDmg}** de dano com ${attackName}. Vida inimiga: ${enemy.currentHp}/${enemy.maxHp}.`
                });
            } else {
                combatLog.push({
                    round,
                    phase: 'hero_attack',
                    actor: hero.name,
                    actorIcon: hero.icon || '🐾',
                    target: enemy.name,
                    d20Roll: d20_final,
                    attackBonus: heroAttackBonus,
                    totalRoll: totalAttackRoll,
                    targetAC: enemyEffectiveAC,
                    isNat20: false,
                    isNat1,
                    isHit: false,
                    damage: 0,
                    targetHpLeft: enemy.currentHp,
                    targetMaxHp: enemy.maxHp,
                    text: isNat1
                        ? `⚠️ **FALHA CRÍTICA (d20 [1])!** ${hero.name} tropeça no terreno da torre e erra o golpe completamente!`
                        : `🛡️ **ERROU!** (d20 [${d20_final}] + ${heroAttackBonus} = **${totalAttackRoll}** vs CA ${enemyEffectiveAC}). O golpe bate na armadura de ${enemy.name}.`
                });
            }

            // Sinergia do Esquadrão (Clash of Clans Support)
            if (enemy.currentHp > 0) {
                let squadDmg = 0;
                const squadParts = [];

                if (squad.archers > 0) {
                    const archerRoll = parseAndRollDice(`${Math.min(4, Math.ceil(squad.archers / 2))}d6`, 2);
                    squadDmg += archerRoll.total;
                    squadParts.push(`🏹 ${squad.archers} Arqueiros: +${archerRoll.total} perfuração`);
                }
                if (squad.mages > 0) {
                    const mageRoll = parseAndRollDice(`${Math.min(3, Math.ceil(squad.mages / 2))}d8`, 3);
                    squadDmg += mageRoll.total;
                    squadParts.push(`🔮 ${squad.mages} Magos: +${mageRoll.total} arcano`);
                }
                if (squad.rogues > 0) {
                    const rogueRoll = parseAndRollDice(`${Math.min(3, squad.rogues)}d6`, 2);
                    squadDmg += rogueRoll.total;
                    squadParts.push(`🗡️ ${squad.rogues} Ladinos (Ataque Furtivo): +${rogueRoll.total}`);
                }

                if (squadDmg > 0) {
                    enemy.currentHp = Math.max(0, enemy.currentHp - squadDmg);
                    combatLog.push({
                        round,
                        phase: 'squad_volley',
                        type: 'squad',
                        damage: squadDmg,
                        text: `🛡️ **Saraivada do Batalhão:** ${squadParts.join(' | ')}. Dano total: **${squadDmg}**! (Inimigo: ${enemy.currentHp}/${enemy.maxHp})`
                    });
                }
            }

            // Dano por veneno contínuo (talento da Arqueira)
            if (talentBonuses.poisonDpsDice && enemy.currentHp > 0) {
                const poison = parseAndRollDice(talentBonuses.poisonDpsDice, 0);
                enemy.currentHp = Math.max(0, enemy.currentHp - poison.sum);
                combatLog.push({
                    round,
                    phase: 'poison',
                    type: 'poison',
                    damage: poison.sum,
                    text: `🧪 **Veneno de Salmão Negro:** O veneno queima as veias de ${enemy.name}, causando **${poison.sum}** de dano! (${enemy.currentHp}/${enemy.maxHp})`
                });
            }
        };

        const executeEnemyTurn = () => {
            if (enemy.currentHp <= 0) return;

            const enemyD20 = rollD20();
            const enemyTotalRoll = enemyD20 + enemy.attackBonus;
            const isEnemyNat20 = enemyD20 === 20;
            const isEnemyNat1 = enemyD20 === 1;

            // Se ainda houver Colossos na frente, eles absorvem o golpe
            const targetIsColossus = colossusHp > 0;
            const targetAC = targetIsColossus ? 16 : heroAC;

            const isHit = isEnemyNat20 || (!isEnemyNat1 && enemyTotalRoll >= targetAC);

            if (isHit) {
                const mult = isEnemyNat20 ? 2 : 1;
                const rawDmg = parseAndRollDice(enemy.attackDice, enemy.attackStatBonus);
                let finalDmg = (rawDmg.sum * mult) + enemy.attackStatBonus;

                // Redução de dano por talentos do Cavaleiro (Escudo Inabalável)
                if (talentBonuses.squadDamageReductionPct) {
                    finalDmg = Math.max(1, Math.round(finalDmg * (1 - (talentBonuses.squadDamageReductionPct / 100))));
                }

                if (targetIsColossus) {
                    colossusHp = Math.max(0, colossusHp - finalDmg);
                    combatLog.push({
                        round,
                        phase: 'enemy_attack',
                        actor: enemy.name,
                        actorIcon: enemy.icon,
                        d20Roll: enemyD20,
                        attackBonus: enemy.attackBonus,
                        totalRoll: enemyTotalRoll,
                        targetAC,
                        isNat20: isEnemyNat20,
                        isHit: true,
                        damage: finalDmg,
                        text: isEnemyNat20
                            ? `🔥 **GOLPE CRÍTICO DO INIMIGO (d20 [20])!** ${enemy.name} atinge a vanguarda com ${enemy.attackName}! Os Colossos absorvem **${finalDmg}** de dano no escudo! (Escudo restante: ${colossusHp})`
                            : `👹 ${enemy.name} desfere ${enemy.attackName} (d20 [${enemyD20}] + ${enemy.attackBonus} = **${enemyTotalRoll}** vs CA ${targetAC}). Colossos absorvem **${finalDmg}** de dano! (Escudo restante: ${colossusHp})`
                    });
                } else {
                    // Dano vai para a barreira ou para o Herói
                    if (barrierHp > 0) {
                        const absorbed = Math.min(barrierHp, finalDmg);
                        barrierHp -= absorbed;
                        finalDmg -= absorbed;
                    }

                    if (finalDmg > 0) {
                        heroCurrentHp = Math.max(0, heroCurrentHp - finalDmg);
                    }

                    // Checa barreira de emergência (Muralha Viva do Cavaleiro)
                    if (talentBonuses.emergencyBarrierHp && !emergencyBarrierUsed && heroCurrentHp > 0 && heroCurrentHp <= (heroStats.maxHp * 0.35)) {
                        emergencyBarrierUsed = true;
                        heroCurrentHp += talentBonuses.emergencyBarrierHp;
                        combatLog.push({
                            round,
                            phase: 'hero_talent_proc',
                            type: 'buff',
                            text: `🏰 **TALENTO: Muralha Viva!** Vendo seu sangue verter, ${hero.name} firma a postura e ganha **+${talentBonuses.emergencyBarrierHp} HP de bravura**!`
                        });
                    }

                    // Checa renascimento feérico (Mago)
                    if (heroCurrentHp <= 0 && talentBonuses.reviveOnceHpPct && !revivedUsed) {
                        revivedUsed = true;
                        heroCurrentHp = Math.round(heroStats.maxHp * (talentBonuses.reviveOnceHpPct / 100));
                        combatLog.push({
                            round,
                            phase: 'hero_talent_proc',
                            type: 'revive',
                            text: `🌟 **TALENTO: Transcendência Feérica!** ${hero.name} se desfaz em poeira estelar cósmica e ressurge com **${heroCurrentHp} HP**!`
                        });
                    }

                    combatLog.push({
                        round,
                        phase: 'enemy_attack',
                        actor: enemy.name,
                        actorIcon: enemy.icon,
                        d20Roll: enemyD20,
                        attackBonus: enemy.attackBonus,
                        totalRoll: enemyTotalRoll,
                        targetAC,
                        isNat20: isEnemyNat20,
                        isHit: true,
                        damage: finalDmg,
                        text: `🩸 ${enemy.name} acerta ${hero.name} em cheio com ${enemy.attackName}! (d20 [${enemyD20}] + ${enemy.attackBonus} = **${enemyTotalRoll}** vs CA ${targetAC}). Dano recebido: **${finalDmg}**! (HP restante: ${heroCurrentHp}/${heroStats.maxHp})`
                    });
                }
            } else {
                combatLog.push({
                    round,
                    phase: 'enemy_attack',
                    actor: enemy.name,
                    actorIcon: enemy.icon,
                    d20Roll: enemyD20,
                    attackBonus: enemy.attackBonus,
                    totalRoll: enemyTotalRoll,
                    targetAC,
                    isNat20: false,
                    isNat1: isEnemyNat1,
                    isHit: false,
                    damage: 0,
                    text: isEnemyNat1
                        ? `💨 **FALHA DO MONSTRO (d20 [1])!** ${enemy.name} morde o vento e se desequilibra!`
                        : `🛡️ **DEFENDIDO!** O ataque de ${enemy.name} é bloqueado pelas defesas da vila (d20 [${enemyD20}] + ${enemy.attackBonus} = ${enemyTotalRoll} vs CA ${targetAC}).`
                });
            }
        };

        // Ordem baseada em Iniciativa
        if (heroHasInitiative) {
            executeHeroTurn();
            if (round === 1 && talentBonuses.doubleTurnFirstRound) {
                combatLog.push({
                    round,
                    phase: 'talent_bonus_action',
                    text: `⚡ **TALENTO: Emboscada Mortal!** Com iniciativa superior, ${hero.name} desfere um segundo ataque relâmpago imediato!`
                });
                executeHeroTurn();
            }
            executeEnemyTurn();
        } else {
            executeEnemyTurn();
            executeHeroTurn();
        }

        round++;
    }

    const isVictory = enemy.currentHp <= 0 && heroCurrentHp > 0;

    combatLog.push({
        round,
        phase: 'battle_end',
        type: isVictory ? 'victory' : 'defeat',
        text: isVictory
            ? `🏆 **VITÓRIA ÉPICA!** ${enemy.name} ruiu derrotado! Os dados rolaram a favor dos nobres felinos!`
            : `💀 **DERROTA NA TORRE!** O poder e a sorte de ${enemy.name} superaram o batalhão. Descanse suas tropas antes de tentar novamente!`
    });

    return {
        isVictory,
        enemy,
        totalRounds: round - 1,
        heroFinalHp: heroCurrentHp,
        enemyFinalHp: enemy.currentHp,
        combatLog
    };
}

// --- Renderizador da Animação Pixel Art da Marcha ---
export function renderPixelArtMarchAnimation(canvasEl) {
    if (!canvasEl) return null;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return null;

    canvasEl.width = 380;
    canvasEl.height = 100;

    let frame = 0;
    let animationId = null;

    const draw = () => {
        frame++;
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        // Fundo retrô em degradê pixel art crepuscular
        const grad = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
        grad.addColorStop(0, '#1a102f');
        grad.addColorStop(0.5, '#422040');
        grad.addColorStop(1, '#1b1424');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

        // Silhueta das montanhas distantes e da Torre
        ctx.fillStyle = '#2d1b36';
        ctx.beginPath();
        ctx.moveTo(0, 70);
        ctx.lineTo(60, 45);
        ctx.lineTo(130, 68);
        ctx.lineTo(210, 40);
        ctx.lineTo(290, 72);
        ctx.lineTo(380, 50);
        ctx.lineTo(380, 100);
        ctx.lineTo(0, 100);
        ctx.fill();

        // Silhueta da Torre ao fundo
        ctx.fillStyle = '#140c1a';
        ctx.fillRect(310, 15, 34, 75);
        ctx.fillRect(305, 10, 44, 10);
        ctx.fillRect(315, 0, 24, 10);

        // Janelas iluminadas na torre
        ctx.fillStyle = '#f5c869';
        ctx.fillRect(322, 28, 4, 6);
        ctx.fillRect(322, 45, 4, 6);

        // Chão de paralelepípedo / terra
        ctx.fillStyle = '#231c26';
        ctx.fillRect(0, 78, canvasEl.width, 22);

        ctx.fillStyle = '#3c2b42';
        for (let x = (frame * 2) % 20; x < canvasEl.width; x += 20) {
            ctx.fillRect(canvasEl.width - x, 82, 10, 3);
        }

        // --- Gato Guerreiro Pixel Art Marchando ---
        const walkCycle = Math.floor(frame / 6) % 4;
        const bobbingY = walkCycle % 2 === 0 ? 0 : 2;
        const catX = 90;
        const catY = 48 + bobbingY;

        // Capa esvoaçante
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(catX - 10, catY + 8, 10 + (walkCycle * 2), 12);

        // Corpo do gato
        ctx.fillStyle = '#d4af37'; // Pelagem dourada
        ctx.fillRect(catX, catY + 4, 14, 16);

        // Cabeça
        ctx.fillRect(catX + 4, catY - 6, 12, 12);

        // Orelhas
        ctx.fillStyle = '#b78726';
        ctx.fillRect(catX + 5, catY - 10, 3, 4);
        ctx.fillRect(catX + 12, catY - 10, 3, 4);

        // Olhos brilhantes
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(catX + 13, catY - 3, 2, 2);

        // Focinho
        ctx.fillStyle = '#f5f2eb';
        ctx.fillRect(catX + 14, catY, 2, 2);

        // Espada / Lança na mão
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(catX + 14, catY - 12, 2, 24);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(catX + 12, catY + 2, 6, 2);

        // Patas dianteiras e traseiras com ciclo de passos
        ctx.fillStyle = '#b78726';
        if (walkCycle === 0) {
            ctx.fillRect(catX + 2, catY + 20, 3, 8);
            ctx.fillRect(catX + 9, catY + 20, 3, 6);
        } else if (walkCycle === 1) {
            ctx.fillRect(catX + 1, catY + 18, 3, 8);
            ctx.fillRect(catX + 10, catY + 18, 3, 8);
        } else if (walkCycle === 2) {
            ctx.fillRect(catX + 3, catY + 20, 3, 6);
            ctx.fillRect(catX + 8, catY + 20, 3, 8);
        } else {
            ctx.fillRect(catX + 4, catY + 19, 3, 7);
            ctx.fillRect(catX + 7, catY + 19, 3, 7);
        }

        // --- Tocha acesa na retaguarda do esquadrão ---
        const torchX = catX - 35;
        const torchY = 52 + (walkCycle % 2 === 0 ? 1 : 0);
        ctx.fillStyle = '#795548';
        ctx.fillRect(torchX, torchY, 3, 18);

        // Fogo da tocha tremulante
        ctx.fillStyle = (frame % 4 < 2) ? '#ff5722' : '#ff9800';
        ctx.fillRect(torchX - 2, torchY - 8, 7, 8);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(torchX - 1, torchY - 6, 5, 5);

        // Partículas de fumaça pixel art
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(torchX - (frame % 8), torchY - 12 - (frame % 6), 2, 2);

        // Bandeira com emblema felino
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(catX - 24, catY - 14, 14, 10);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(catX - 20, catY - 11, 6, 4);

        // Texto retrô de marcha
        ctx.fillStyle = '#f5c869';
        ctx.font = '10px monospace';
        ctx.fillText("MARCHANDO PELA TORRE...", 145, 26);

        animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return {
        stop: () => {
            if (animationId) cancelAnimationFrame(animationId);
        }
    };
}
