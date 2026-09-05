import {
    getState, saveState, addXP, getGlobalSettings, subscribeToGlobalSettings,
    HERO_TEMPLATES, TROOP_TEMPLATES, ITEM_DATABASE, TOWER_FLOORS,
    selectStarterHero, unlockHeroWithGold, setActiveHero, getActiveHero,
    getHeroTotalStats, addHeroXP, upgradeHeroStat,
    equipItem, unequipItem,
    startExpedition, finishExpedition,
    getArmyCapacity, trainTroop, dismissTroop, getHeroUnlockCost,
    GOLD_MINT_RECIPES, mintGold,
    BASE_STORAGE_CAP, CAT_FOOD_CONSUMPTION_RATE, getVillageStorageCapacity
} from './state.js';
import {
    getTalentTreeForHero, unlockHeroTalent, resetHeroTalents, computeHeroTalentBonuses
} from './talents.js';
import {
    renderPixelArtMarchAnimation
} from './battle.js';

let currentQuartelTab = 'tower';
let marchAnimationInstance = null;


let gameInterval = null;

export function gainXP(amount, reason = '') {
    const result = addXP(amount);
    updateXPUI();
    if (result.leveledUp) {
        showLevelUpNotification(result.level);
        renderLevelMissions();
        checkMissions();
    }
    saveState();
}

export function updateXPUI() {
    const state = getState();
    if (!state.account) return;
    const elLevel = document.getElementById('profile-level-badge');
    const elFill = document.getElementById('profile-xp-fill');
    const elText = document.getElementById('profile-xp-text');

    if (elLevel) elLevel.textContent = `Nv. ${state.account.level}`;
    if (elText) elText.textContent = `${state.account.xp} / ${state.account.xpToNextLevel}`;
    if (elFill) {
        const pct = Math.min(100, Math.max(0, (state.account.xp / state.account.xpToNextLevel) * 100));
        elFill.style.width = `${pct}%`;
    }
}

function showLevelUpNotification(newLevel) {
    const existing = document.getElementById('level-up-toast');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'level-up-toast';
    notif.style.cssText = `
        position: fixed;
        top: 25px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #f4c430, #b8860b);
        color: #180e03;
        font-family: var(--font-heading);
        font-size: 1.15rem;
        font-weight: 800;
        padding: 12px 26px;
        border-radius: 30px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        z-index: 99999;
        border: 2px solid #fff;
    `;
    notif.innerHTML = `🎉 Subiu para o <strong>Nível ${newLevel}</strong> de Conta! Resgate seus Diamantes nas Missões! 💎`;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => notif.remove(), 500);
    }, 4000);
}

export function updateGlobalBroadcastUI() {
    const settings = getGlobalSettings();
    const banner = document.getElementById('global-broadcast-banner');
    const textEl = document.getElementById('global-broadcast-text');
    if (!banner || !textEl) return;

    if (settings.broadcast && settings.broadcast.active && settings.broadcast.text) {
        textEl.textContent = settings.broadcast.text;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

export function initGame() {
    const state = getState();
    updateGlobalBroadcastUI();

    // Registra listener em tempo real para mudanças nas configurações globais do GM
    subscribeToGlobalSettings(() => {
        updateGlobalBroadcastUI();
        updateResourceUI();
    });
    
    // Setup tabs
    const tabVillage = document.getElementById('tab-village');
    const tabMap = document.getElementById('tab-map');
    const tabMissions = document.getElementById('tab-missions');
    const tabStats = document.getElementById('tab-stats');
    const tabPrefeitura = document.getElementById('tab-prefeitura');
    const tabQuartel = document.getElementById('tab-quartel');
    const tabMercado = document.getElementById('tab-mercado');

    const viewVillage = document.getElementById('village-view');
    const viewMap = document.getElementById('map-view');
    const viewMissions = document.getElementById('missions-view');
    const viewStats = document.getElementById('stats-view');
    const viewPrefeitura = document.getElementById('view-prefeitura');
    const viewQuartel = document.getElementById('view-quartel');
    const viewMercado = document.getElementById('view-mercado');

    function updateMobileNav(tabKey) {
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            if (btn.getAttribute('data-tab-id') === tabKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function switchTab(activeTab, activeView, tabKey = '') {
        document.querySelectorAll('.game-nav a, .left-panel ul li a').forEach(tab => tab.classList.remove('active'));
        if (activeTab) activeTab.classList.add('active');
        viewVillage.style.display = 'none';
        viewMap.style.display = 'none';
        viewMissions.style.display = 'none';
        if(viewStats) viewStats.style.display = 'none';
        if(viewPrefeitura) viewPrefeitura.style.display = 'none';
        if(viewQuartel) viewQuartel.style.display = 'none';
        if(viewMercado) viewMercado.style.display = 'none';
        
        const armyPanel = document.querySelector('.army-panel');
        if (armyPanel) armyPanel.classList.remove('mobile-open');

        activeView.style.display = 'block';
        if (tabKey) updateMobileNav(tabKey);
    }

        if (tabVillage && tabMap && tabMissions) {
            tabVillage.onclick = (e) => { e.preventDefault(); switchTab(tabVillage, viewVillage, 'tab-village'); };
            tabMap.onclick = (e) => { e.preventDefault(); switchTab(tabMap, viewMap, 'tab-map'); };
            tabMissions.onclick = (e) => { e.preventDefault(); switchTab(tabMissions, viewMissions, 'tab-missions'); };
            if(tabStats) tabStats.onclick = (e) => { e.preventDefault(); switchTab(tabStats, viewStats, 'tab-stats'); };
            if(tabPrefeitura) tabPrefeitura.onclick = (e) => { e.preventDefault(); switchTab(tabPrefeitura, viewPrefeitura); };
            if(tabQuartel) tabQuartel.onclick = (e) => { e.preventDefault(); switchTab(tabQuartel, viewQuartel, 'tab-quartel'); renderQuartel(); };
            if(tabMercado) tabMercado.onclick = (e) => { e.preventDefault(); switchTab(tabMercado, viewMercado); renderMercado(); };

            const btnGotoQuartel = document.getElementById('btn-goto-quartel');
            if (btnGotoQuartel) {
                btnGotoQuartel.onclick = () => {
                    if (tabQuartel && viewQuartel) {
                        switchTab(tabQuartel, viewQuartel, 'tab-quartel');
                        currentQuartelTab = 'tower';
                        renderQuartel();
                    }
                };
            }
        }

        // Mobile Bottom Nav Handlers
        const mTabVillage = document.getElementById('m-tab-village');
        const mTabQuartel = document.getElementById('m-tab-quartel');
        const mTabPop = document.getElementById('m-tab-pop');
        const mTabMissions = document.getElementById('m-tab-missions');
        const mTabStats = document.getElementById('m-tab-stats');
        const mTabMore = document.getElementById('m-tab-more');
        const mobileMoreMenu = document.getElementById('mobile-more-menu');
        const btnCloseMore = document.getElementById('btn-close-more');

        if (mTabVillage) mTabVillage.onclick = () => switchTab(tabVillage, viewVillage, 'tab-village');
        if (mTabQuartel) mTabQuartel.onclick = () => { switchTab(tabQuartel, viewQuartel, 'tab-quartel'); renderQuartel(); };
        if (mTabMissions) mTabMissions.onclick = () => switchTab(tabMissions, viewMissions, 'tab-missions');
        if (mTabStats) mTabStats.onclick = () => switchTab(tabStats, viewStats, 'tab-stats');
        
        if (mTabPop) {
            mTabPop.onclick = () => {
                const armyPanel = document.querySelector('.army-panel');
                if (armyPanel) {
                    armyPanel.classList.toggle('mobile-open');
                    if (armyPanel.classList.contains('mobile-open')) {
                        updateMobileNav('tab-pop');
                    }
                }
            };
        }

        const btnClosePopMobile = document.getElementById('btn-close-pop-mobile');
        if (btnClosePopMobile) {
            btnClosePopMobile.onclick = () => {
                const armyPanel = document.querySelector('.army-panel');
                if (armyPanel) armyPanel.classList.remove('mobile-open');
            };
        }

        if (mTabMore && mobileMoreMenu) {
            mTabMore.onclick = () => {
                mobileMoreMenu.style.display = mobileMoreMenu.style.display === 'none' ? 'block' : 'none';
            };
        }

        if (btnCloseMore && mobileMoreMenu) {
            btnCloseMore.onclick = () => { mobileMoreMenu.style.display = 'none'; };
        }

        document.querySelectorAll('.mobile-more-item').forEach(item => {
            item.onclick = () => {
                const tabId = item.getAttribute('data-tab-id');
                if (mobileMoreMenu) mobileMoreMenu.style.display = 'none';
                if (tabId === 'tab-map') switchTab(tabMap, viewMap, 'tab-map');
                else if (tabId === 'tab-prefeitura') switchTab(tabPrefeitura, viewPrefeitura);
                else if (tabId === 'tab-mercado') { switchTab(tabMercado, viewMercado); renderMercado(); }
                else if (item.id === 'm-btn-profile') {
                    const modal = document.getElementById('modal-profile');
                    if (modal) modal.style.display = 'flex';
                }
            };
        });

    // Set up allocators
    document.querySelectorAll('.btn-alloc').forEach(btn => {
        // Remove previous listeners to avoid duplicates on re-init
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            const role = newBtn.getAttribute('data-role');
            const action = newBtn.getAttribute('data-action');

            if (action === 'add' && state.tempPop.idle > 0) {
                state.tempPop.idle--;
                state.tempPop[role]++;
            } else if (action === 'sub') {
                // Can only subtract if the draft role has more cats than the committed role
                if (state.tempPop[role] > state.pop[role]) {
                    state.tempPop[role]--;
                    state.tempPop.idle++;
                } else if (state.tempPop[role] === state.pop[role]) {
                    // Show small warning maybe, or just do nothing
                    console.log("Estes gatos já assinaram contrato e não podem ser removidos!");
                }
            }
            updateResourceUI();
        });
    });

    // Setup upgrades
    document.querySelectorAll('.btn-upgrade').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            const costAttr = newBtn.getAttribute('data-cost');
            const goldCostAttr = newBtn.getAttribute('data-cost-gold');
            const buildingKey = newBtn.getAttribute('data-building').toLowerCase().split(' ')[0]; 
            
            if((!costAttr && !goldCostAttr) || newBtn.disabled) return;
            
            let canAfford = false;
            let fishCost = 0, woodCost = 0, goldCost = 0;

            if (costAttr) {
                [fishCost, woodCost] = costAttr.split(',').map(Number);
                canAfford = state.resources.fish >= fishCost && state.resources.wood >= woodCost;
            } else if (goldCostAttr) {
                goldCost = Number(goldCostAttr);
                canAfford = state.resources.gold >= goldCost;
            }

            if (canAfford) {
                if (costAttr) {
                    state.resources.fish -= fishCost;
                    state.resources.wood -= woodCost;
                } else if (goldCostAttr) {
                    state.resources.gold -= goldCost;
                }
                
                updateResourceUI();
                saveState(); // Salva os recursos gastos imediatamente

                newBtn.disabled = true;
                newBtn.style.backgroundColor = 'var(--parchment-border)';
                
                const currentLevel = state.buildings[buildingKey];
                const globalSettings = getGlobalSettings();
                const timeSettings = globalSettings?.timeSettings || {};
                const isInstant = !!timeSettings.instantConstruction;
                const timeMult = (typeof timeSettings.constructionMultiplier === 'number' && timeSettings.constructionMultiplier > 0)
                    ? timeSettings.constructionMultiplier
                    : 1.0;
                
                // Usa o tempo individual configurado pelo GM para cada edifício, ou fallback
                const baseBuildingTime = (timeSettings.buildingTimes && typeof timeSettings.buildingTimes[buildingKey] === 'number')
                    ? timeSettings.buildingTimes[buildingKey]
                    : (5 + (currentLevel * 10));
                let timeLeft = isInstant ? 0 : Math.max(0, Math.round(baseBuildingTime / timeMult));

                const completeBuildingUpgrade = () => {
                    state.buildings[buildingKey]++;
                    const newLevel = state.buildings[buildingKey];
                    
                    if(buildingKey === 'cabana') {
                        state.pop.max += 5;
                        state.pop.idle += 5;
                        state.tempPop.max += 5;
                        state.tempPop.idle += 5;
                    }

                    const cardInfo = newBtn.closest('.building-info');
                    if (cardInfo) {
                        const lvlEl = cardInfo.querySelector('.level');
                        if (lvlEl) lvlEl.textContent = `Nível ${newLevel}`;
                    }
                    
                    if (costAttr) {
                        const newFishCost = Math.floor(fishCost * 1.5);
                        const newWoodCost = Math.floor(woodCost * 1.5);
                        newBtn.setAttribute('data-cost', `${newFishCost},${newWoodCost}`);
                        newBtn.innerHTML = `Evoluir <br><small>🐟 ${newFishCost} | 🪵 ${newWoodCost}</small>`;
                    } else if (goldCostAttr) {
                        const newGoldCost = Math.floor(goldCost * 1.5);
                        newBtn.setAttribute('data-cost-gold', `${newGoldCost}`);
                        newBtn.innerHTML = `Evoluir <br><small>🪙 ${newGoldCost} Ouro</small>`;
                    }
                    
                    newBtn.disabled = false;
                    newBtn.style.backgroundColor = '';
                    
                    checkUnlocks();
                    gainXP(35, 'Construção Concluída');
                    saveState(); // Salva após concluir a construção
                };

                if (timeLeft <= 0) {
                    completeBuildingUpgrade();
                } else {
                    newBtn.innerHTML = `Construindo... <br><small>🕒 ${timeLeft}s</small>`;
                    const timerInterval = setInterval(() => {
                        timeLeft--;
                        if (timeLeft > 0) {
                            newBtn.innerHTML = `Construindo... <br><small>🕒 ${timeLeft}s</small>`;
                        } else {
                            clearInterval(timerInterval);
                            completeBuildingUpgrade();
                        }
                    }, 1000);
                }
            } else {
                newBtn.style.backgroundColor = '#d9534f'; 
                newBtn.style.color = 'white';
                setTimeout(() => {
                    newBtn.style.backgroundColor = '';
                    newBtn.style.color = '';
                }, 500);
            }
        });
    });

    // Start Loop
    if(gameInterval) clearInterval(gameInterval);
    let autosaveCounter = 0;

    gameInterval = setInterval(() => {
        if (document.body.classList.contains('in-game')) {
            const globalSettings = getGlobalSettings();
            const isFarmBonusActive = globalSettings.farmBonusActive !== false;
            const baseFarmMult = (isFarmBonusActive && typeof globalSettings.farmMultiplier === 'number' && globalSettings.farmMultiplier > 0)
                ? globalSettings.farmMultiplier
                : 1.0;
            const rates = globalSettings.resourceRates || {};
            const legacyMults = globalSettings.resourceMultipliers || {};

            // Se o bônus de farm estiver desativado pelo GM, fixa estritamente em 1.0x
            const getMult = (key) => {
                if (!isFarmBonusActive) return 1.0;
                let m = 1.0;
                if (rates[key] && rates[key].active) {
                    m = Number(rates[key].multiplier) || 1.0;
                } else if (legacyMults[key] && Number(legacyMults[key]) > 0) {
                    m = Number(legacyMults[key]);
                }
                return m * baseFarmMult;
            };

            const fishMult = getMult('fish');
            const woodMult = getMult('wood');
            const woolMult = getMult('wool');
            const stoneMult = getMult('stone');
            const coalMult = getMult('coal');
            const ironMult = getMult('iron');

            // 1. Gatos trabalhando consomem alimento ativamente
            const totalWorkingCats = (state.pop.fish || 0) + (state.pop.wood || 0) + (state.pop.wool || 0) + (state.pop.mine || 0) + (state.pop.scouts || 0);
            const foodConsumption = totalWorkingCats * CAT_FOOD_CONSUMPTION_RATE;

            // 2. Penalidade de fome: se a vila estiver sem peixe, a produtividade cai pela metade
            const isHungry = (state.resources.fish || 0) <= 0;
            const hungerPenalty = isHungry ? 0.5 : 1.0;

            // 3. Taxa base desafiadora com progressão estratégica por nível de edifício
            const grossFishRate = state.pop.fish * (0.020 + ((state.buildings.cais || 0) * 0.006)) * hungerPenalty * fishMult;
            const netFishRate = grossFishRate - foodConsumption;
            const woodRate = state.pop.wood * (0.010 + ((state.buildings.cabana || 0) * 0.003)) * hungerPenalty * woodMult;
            const woolRate = state.pop.wool * (0.008 + ((state.buildings.arranhador || 0) * 0.0025)) * hungerPenalty * woolMult;
            const baseMineRate = state.pop.mine * (0.007 + ((state.buildings.mina || 0) * 0.002)) * hungerPenalty;
            
            const stoneRate = baseMineRate * 0.7 * stoneMult;
            const coalRate = (baseMineRate * 0.25) * coalMult;
            const ironRate = (baseMineRate * 0.08) * ironMult;

            // 4. Acúmulo livre de recursos (sem limite de capacidade)
            state.resources.fish = Math.max(0, (state.resources.fish || 0) + netFishRate);
            state.resources.wood = (state.resources.wood || 0) + woodRate;
            state.resources.wool = (state.resources.wool || 0) + woolRate;
            state.resources.stone = (state.resources.stone || 0) + stoneRate;
            state.resources.coal = (state.resources.coal || 0) + coalRate;
            state.resources.iron = (state.resources.iron || 0) + ironRate;
            
            updateResourceUI(Infinity, isHungry);
            updateStatsUI(netFishRate, woodRate, woolRate, (stoneRate + coalRate + ironRate), {
                grossFishRate,
                foodConsumption,
                isHungry,
                storageCap: Infinity,
                totalWorkingCats
            });
            updateGlobalBroadcastUI();

            
            // Check active expedition timer
            if (state.activeExpedition) {
                const now = Date.now();
                const banner = document.getElementById('village-expedition-banner');
                const exp = state.activeExpedition;
                
                if (now >= exp.endTime) {
                    const res = finishExpedition();
                    if (res) {
                        handleExpeditionResult(res);
                    }
                    if (banner) banner.style.display = 'none';
                } else {
                    if (banner) {
                        banner.style.display = 'block';
                        const elName = document.getElementById('village-exp-name');
                        const elTimer = document.getElementById('village-exp-timer');
                        const elFill = document.getElementById('village-exp-fill');
                        const remainingSecs = Math.max(0, Math.ceil((exp.endTime - now) / 1000));
                        const pct = Math.min(100, Math.round(((now - exp.startTime) / exp.durationMs) * 100));
                        if (elName) elName.textContent = `Andar ${exp.floor} - ${exp.name}`;
                        if (elTimer) elTimer.textContent = `⏳ ${remainingSecs}s`;
                        if (elFill) elFill.style.width = `${pct}%`;
                    }
                }
                
                // If on tower tab, update live progress
                if (currentQuartelTab === 'tower' && document.getElementById('view-quartel')?.style.display !== 'none') {
                    updateTowerLiveUI();
                }
            } else {
                const banner = document.getElementById('village-expedition-banner');
                if (banner) banner.style.display = 'none';
            }

            // Autosave a cada 10 segundos sincronizado com o loop do jogo e concede XP
            autosaveCounter++;
            if (autosaveCounter >= 10) {
                gainXP(2, 'Tempo de Jogo');
                autosaveCounter = 0;
            }
        }
    }, 1000);

    // Worker draft save logic
    const btnSaveContracts = document.getElementById('btn-save-contracts');
    const modalConfirm = document.getElementById('modal-confirm-contracts');
    
    if (btnSaveContracts) {
        btnSaveContracts.onclick = () => {
            // Check if there are uncommitted changes
            if (JSON.stringify(state.pop) === JSON.stringify(state.tempPop)) {
                alert("Nenhuma nova alocação para salvar.");
                return;
            }
            modalConfirm.style.display = 'flex';
        };
    }
    
    document.getElementById('btn-confirm-contracts').onclick = () => {
        state.pop = JSON.parse(JSON.stringify(state.tempPop));
        modalConfirm.style.display = 'none';
        gainXP(15, 'Contratos Assinados');
        updateResourceUI();
    };
    
    document.getElementById('btn-cancel-contracts').onclick = () => {
        modalConfirm.style.display = 'none';
    };

    // Worker reset logic
    const btnResetWorkers = document.getElementById('btn-reset-workers');
    if (btnResetWorkers) {
        const resetClone = btnResetWorkers.cloneNode(true);
        btnResetWorkers.parentNode.replaceChild(resetClone, btnResetWorkers);
        resetClone.addEventListener('click', () => {
            if (state.resources.diamonds >= 10) {
                state.resources.diamonds -= 10;
                
                // Return all to idle
                let totalWorking = state.pop.fish + state.pop.wood + state.pop.wool + state.pop.mine;
                
                const clearedPop = {
                    max: state.pop.max,
                    idle: state.pop.idle + totalWorking,
                    fish: 0, wood: 0, wool: 0, mine: 0, scouts: state.pop.scouts || 0
                };
                
                state.pop = JSON.parse(JSON.stringify(clearedPop));
                state.tempPop = JSON.parse(JSON.stringify(clearedPop));
                
                updateResourceUI();
                saveState();
                alert("Trabalhadores resetados com sucesso!");
            } else {
                alert("Você precisa de pelo menos 10 diamantes para resetar os trabalhadores!");
            }
        });
    }

    checkUnlocks();
    renderMissions();
    renderLevelMissions();
    renderQuartel();
    updateResourceUI();
    updateXPUI();
}

export function stopGame() {
    if(gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

export function updateResourceUI(storageCap, isHungry) {
    const state = getState();
    if (storageCap === undefined) {
        storageCap = getVillageStorageCapacity(state);
    }
    if (isHungry === undefined) {
        isHungry = (state.resources.fish || 0) <= 0;
    }

    document.getElementById('res-fish').textContent = Math.floor(state.resources.fish);
    document.getElementById('res-wood').textContent = Math.floor(state.resources.wood);
    document.getElementById('res-wool').textContent = Math.floor(state.resources.wool);
    document.getElementById('res-gold').textContent = Math.floor(state.resources.gold);
    document.getElementById('res-stone').textContent = Math.floor(state.resources.stone);
    document.getElementById('res-coal').textContent = Math.floor(state.resources.coal);
    document.getElementById('res-iron').textContent = Math.floor(state.resources.iron);
    
    const diamondEl = document.getElementById('res-diamonds');
    if(diamondEl) diamondEl.textContent = state.resources.diamonds || 0;
    
    document.getElementById('val-idle').textContent = state.tempPop.idle;
    document.getElementById('val-fish').textContent = state.tempPop.fish;
    document.getElementById('val-wood').textContent = state.tempPop.wood;
    document.getElementById('val-wool').textContent = state.tempPop.wool;
    document.getElementById('val-mine').textContent = state.tempPop.mine;
    document.getElementById('val-scouts').textContent = state.tempPop.scouts || 0;
    
    const totalUsed = state.tempPop.max - state.tempPop.idle;
    document.getElementById('val-total-cats').textContent = totalUsed;
    document.getElementById('val-max-cats').textContent = state.tempPop.max;
    document.getElementById('pop-fill').style.width = `${(totalUsed / state.tempPop.max) * 100}%`;

    // Recursos sem limite de armazenamento
    const farmKeys = ['fish', 'wood', 'wool', 'stone', 'coal', 'iron'];
    farmKeys.forEach(k => {
        const el = document.getElementById(`res-${k}`);
        const parent = el ? el.closest('.resource-item') : null;
        if (parent) {
            const val = state.resources[k] || 0;
            parent.title = `${Math.floor(val)} (Estoque da Vila - Sem Limite)`;
            const capTag = document.getElementById(`cap-tag-${k}`);
            if (capTag) capTag.style.display = 'none';
        }
    });

    // 2. Alerta de Fome na Vila (Produção reduzida em 50%)
    let hungerBadge = document.getElementById('village-hunger-alert');
    if (isHungry) {
        if (!hungerBadge) {
            const fishItem = document.getElementById('res-fish')?.closest('.resource-item');
            if (fishItem) {
                hungerBadge = document.createElement('span');
                hungerBadge.id = 'village-hunger-alert';
                hungerBadge.className = 'village-hunger-tag';
                hungerBadge.textContent = '⚠️ FOME (-50%)';
                hungerBadge.title = 'Estoque de peixe zerado! Os gatos trabalhadores estão famintos e a produção caiu em 50%.';
                fishItem.appendChild(hungerBadge);
            }
        }
        if (hungerBadge) hungerBadge.style.display = 'inline-block';
    } else if (hungerBadge) {
        hungerBadge.style.display = 'none';
    }

    // Sigilo do GM: As taxas e alterações do GM não são expostas aos recursos dos jogadores
    farmKeys.forEach(k => {
        const badge = document.getElementById(`boost-badge-${k}`);
        if (badge) badge.style.display = 'none';
    });

    updateXPUI();
}


function checkUnlocks() {
    const state = getState();
    
    // Helper function to manage card state
    const updateCardState = (cardId, unlockCondition, levelCondition) => {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        if (unlockCondition) {
            card.classList.remove('locked-card');
            if (levelCondition) {
                card.classList.remove('lvl0-card');
            } else {
                card.classList.add('lvl0-card');
            }
        } else {
            card.classList.add('locked-card');
        }
    };

    // Cabana is always available
    updateCardState('card-cabana', true, state.buildings.cabana >= 1);

    // Cais requires Cabana >= 1
    updateCardState('card-cais', state.buildings.cabana >= 1, state.buildings.cais >= 1);

    // Arranhador requires Cabana >= 2
    updateCardState('card-arranhador', state.buildings.cabana >= 2, state.buildings.arranhador >= 1);

    // Mina requires Cabana >= 3
    updateCardState('card-mina', state.buildings.cabana >= 3, state.buildings.mina >= 1);

    // Quartel requires Cabana >= 3
    updateCardState('card-quartel', state.buildings.cabana >= 3, state.buildings.quartel >= 1);
    
    // Mercado requires Cabana >= 2
    updateCardState('card-mercado', state.buildings.cabana >= 2, state.buildings.mercado >= 1);
    
    // Prefeitura is always unlocked, but grey if level 0
    updateCardState('card-prefeitura', true, state.buildings.prefeitura >= 1);
    
    // Manage Left Panel Nav items
    const navPrefeitura = document.getElementById('nav-prefeitura');
    const navQuartel = document.getElementById('nav-quartel');
    const navMercado = document.getElementById('nav-mercado');
    
    if (navPrefeitura) navPrefeitura.style.display = state.buildings.prefeitura >= 1 ? 'block' : 'none';
    if (navQuartel) navQuartel.style.display = state.buildings.quartel >= 1 ? 'block' : 'none';
    if (navMercado) navMercado.style.display = state.buildings.mercado >= 1 ? 'block' : 'none';
    
    if (state.buildings.quartel >= 1 && (state.pop.scouts === 0 || !state.pop.scouts)) {
        state.pop.scouts = 15;
        state.tempPop.scouts = 15;
    }
    checkMissions();
}

function renderMissions() {
    const state = getState();
    const container = document.getElementById('mission-container');
    if (!container) return;
    container.innerHTML = '';
    let hasNotification = false;

    for (let key in state.missions) {
        const m = state.missions[key];
        const card = document.createElement('div');
        card.className = `mission-card ${m.done ? 'completed' : ''}`;
        
        let btnHTML = '';
        if (m.done) {
            btnHTML = `<span style="color:var(--success); font-weight: bold;">✔ Concluída</span>`;
        } else if (m.ready) {
            hasNotification = true;
            btnHTML = `<button class="btn primary-btn btn-claim" data-mission="${key}">Resgatar Ouro</button>`;
        } else {
            btnHTML = `<span style="color:var(--text-secondary); font-size: 0.85rem;">Em andamento...</span>`;
        }

        card.innerHTML = `
            <div class="mission-info">
                <h4 style="color: var(--wood-dark); margin-bottom: 3px;">${m.desc}</h4>
                <span class="mission-reward">🪙 ${m.reward} Ouro</span>
            </div>
            <div class="mission-action">${btnHTML}</div>
        `;
        container.appendChild(card);
    }

    const badge = document.getElementById('mission-badge');
    if (badge) badge.style.display = hasNotification ? 'inline-block' : 'none';
    const mBadge = document.getElementById('m-mission-badge');
    if (mBadge) mBadge.style.display = hasNotification ? 'inline-block' : 'none';

    container.querySelectorAll('.btn-claim').forEach(btn => {
        btn.addEventListener('click', () => {
            const mKey = btn.getAttribute('data-mission');
            state.resources.gold += state.missions[mKey].reward;
            state.missions[mKey].done = true;
            state.missions[mKey].ready = false;
            gainXP(50, 'Missão Concluída');
            renderMissions();
            updateResourceUI();
            saveState();
        });
    });
}

export function renderLevelMissions() {
    const state = getState();
    const container = document.getElementById('level-mission-container');
    if (!container || !state.levelMissions) return;
    container.innerHTML = '';
    let hasDiamondNotification = false;

    for (let key in state.levelMissions) {
        const lm = state.levelMissions[key];
        const isUnlocked = (state.account?.level || 1) >= lm.levelReq;
        const card = document.createElement('div');
        card.className = `level-mission-card ${lm.claimed ? 'claimed' : ''}`;

        let actionHTML = '';
        if (lm.claimed) {
            actionHTML = `<span style="color:var(--success); font-weight: bold;">✔ Resgatado</span>`;
        } else if (isUnlocked) {
            hasDiamondNotification = true;
            actionHTML = `<button class="btn primary-btn btn-claim-level" data-lm="${key}">💎 Resgatar +${lm.rewardDiamonds}</button>`;
        } else {
            actionHTML = `<span style="color:var(--text-secondary); font-size: 0.85rem; font-weight: 600;">🔒 Requer Nível ${lm.levelReq}</span>`;
        }

        card.innerHTML = `
            <div class="mission-info">
                <h4 style="color: var(--wood-dark); margin-bottom: 3px;">🏆 ${lm.desc}</h4>
                <span style="color: var(--gold-hover); font-weight: bold; font-size: 0.9rem;">Recompensa: 💎 ${lm.rewardDiamonds} Diamantes</span>
            </div>
            <div class="mission-action">${actionHTML}</div>
        `;
        container.appendChild(card);
    }

    container.querySelectorAll('.btn-claim-level').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-lm');
            const lm = state.levelMissions[key];
            if (lm && !lm.claimed) {
                lm.claimed = true;
                state.resources.diamonds = (state.resources.diamonds || 0) + lm.rewardDiamonds;
                updateResourceUI();
                renderLevelMissions();
                saveState();
            }
        });
    });

    const badge = document.getElementById('mission-badge');
    const mBadge = document.getElementById('m-mission-badge');
    if (hasDiamondNotification) {
        if (badge) badge.style.display = 'inline-block';
        if (mBadge) mBadge.style.display = 'inline-block';
    }
}

function checkMissions() {
    const state = getState();
    let changed = false;
    if (state.missions?.cabanaLvl2 && !state.missions.cabanaLvl2.done && state.buildings.cabana >= 2 && !state.missions.cabanaLvl2.ready) {
        state.missions.cabanaLvl2.ready = true; changed = true;
    }
    if (state.missions?.caisLvl1 && !state.missions.caisLvl1.done && state.buildings.cais >= 1 && !state.missions.caisLvl1.ready) {
        state.missions.caisLvl1.ready = true; changed = true;
    }
    if (state.missions?.quartelLvl1 && !state.missions.quartelLvl1.done && state.buildings.quartel >= 1 && !state.missions.quartelLvl1.ready) {
        state.missions.quartelLvl1.ready = true; changed = true;
    }
    if (state.missions?.towerFloor1 && !state.missions.towerFloor1.done && (state.tower?.highestFloor || 1) >= 2 && !state.missions.towerFloor1.ready) {
        state.missions.towerFloor1.ready = true; changed = true;
    }
    const totalTroopsCount = Object.values(state.army || {}).reduce((a, b) => a + b, 0);
    if (state.missions?.trainArmy5 && !state.missions.trainArmy5.done && totalTroopsCount >= 5 && !state.missions.trainArmy5.ready) {
        state.missions.trainArmy5.ready = true; changed = true;
    }
    const hasAnyEquipped = Object.values(state.unlockedHeroes || {}).some(h => Object.values(h.equipped || {}).some(Boolean));
    if (state.missions?.equipItem1 && !state.missions.equipItem1.done && hasAnyEquipped && !state.missions.equipItem1.ready) {
        state.missions.equipItem1.ready = true; changed = true;
    }
    if (changed || !document.getElementById('mission-container')?.hasChildNodes()) {
        renderMissions();
    }
    if (!document.getElementById('level-mission-container')?.hasChildNodes()) {
        renderLevelMissions();
    }
}

export function updateStatsUI(fish, wood, wool, mine, extraDetails = {}) {
    const state = getState();
    const globalSettings = getGlobalSettings();
    const isFarmBonusActive = globalSettings.farmBonusActive !== false;
    const baseFarmMult = (isFarmBonusActive && typeof globalSettings.farmMultiplier === 'number' && globalSettings.farmMultiplier > 0)
        ? globalSettings.farmMultiplier
        : 1.0;
    const xpMult = (typeof globalSettings.xpMultiplier === 'number' && globalSettings.xpMultiplier > 0) ? globalSettings.xpMultiplier : 1.0;
    const timeCfg = globalSettings.timeSettings || {};
    const rates = globalSettings.resourceRates || {};
    const legacyMults = globalSettings.resourceMultipliers || {};

    const getSectorMult = (key) => {
        if (!isFarmBonusActive) return 1.0;
        let m = 1.0;
        if (rates[key] && rates[key].active) {
            m = Number(rates[key].multiplier) || 1.0;
        } else if (legacyMults[key] && Number(legacyMults[key]) > 0) {
            m = Number(legacyMults[key]);
        }
        return m * baseFarmMult;
    };

    const multFish = getSectorMult('fish');
    const multWood = getSectorMult('wood');
    const multWool = getSectorMult('wool');
    const multStone = getSectorMult('stone');
    const multCoal = getSectorMult('coal');
    const multIron = getSectorMult('iron');

    const caisLevel = state.buildings.cais || 0;
    const cabanaLevel = state.buildings.cabana || 0;
    const arranhadorLevel = state.buildings.arranhador || 0;
    const minaLevel = state.buildings.mina || 0;

    const totalWorkingCats = (state.pop.fish || 0) + (state.pop.wood || 0) + (state.pop.wool || 0) + (state.pop.mine || 0) + (state.pop.scouts || 0);
    const foodConsumption = extraDetails.foodConsumption !== undefined 
        ? extraDetails.foodConsumption 
        : totalWorkingCats * CAT_FOOD_CONSUMPTION_RATE;
    const isHungry = extraDetails.isHungry !== undefined 
        ? extraDetails.isHungry 
        : (state.resources.fish || 0) <= 0;
    const hungerPenalty = isHungry ? 0.5 : 1.0;

    // Se as taxas não foram fornecidas diretamente, calcula-as com base no novo modelo desafiador
    if (fish === undefined) {
        const grossFish = state.pop.fish * (0.020 + (caisLevel * 0.006)) * hungerPenalty * multFish;
        fish = grossFish - foodConsumption;
        wood = state.pop.wood * (0.010 + (cabanaLevel * 0.003)) * hungerPenalty * multWood;
        wool = state.pop.wool * (0.008 + (arranhadorLevel * 0.0025)) * hungerPenalty * multWool;
        const baseM = state.pop.mine * (0.007 + (minaLevel * 0.002)) * hungerPenalty;
        mine = (baseM * 0.7 * multStone) + (baseM * 0.25 * multCoal) + (baseM * 0.08 * multIron);
    }

    // 1. Banner de Bônus & Eventos Oficiais do Reino (Alterações do GM são sigilosas a menos que haja evento público)
    const elGmFarm = document.getElementById('stat-gm-farm-rate');
    const elGmBuild = document.getElementById('stat-gm-build-rate');
    const elGmXp = document.getElementById('stat-gm-xp-rate');
    const elGmFatigue = document.getElementById('stat-gm-fatigue-rate');
    const elGmChips = document.getElementById('stat-gm-rates-chips');
    const elGmBanner = document.getElementById('stats-gm-boosts-banner');

    if (elGmBanner) {
        if (state.activeEvent) {
            elGmBanner.style.display = 'block';
            const eventTitle = elGmBanner.querySelector('h3');
            if (eventTitle) eventTitle.innerHTML = `🎉 Evento Real em Andamento: ${state.activeEvent.name || 'Celebração da Vila'}`;
        } else {
            // GM alterações permanecem estritamente sigilosas
            elGmBanner.style.display = 'none';
        }
    }

    if (elGmFarm) {
        if (!isFarmBonusActive) {
            elGmFarm.textContent = '100% Padrão';
            elGmFarm.style.color = 'var(--text-secondary)';
        } else {
            const bonusPct = Math.round((baseFarmMult - 1) * 100);
            elGmFarm.textContent = `${bonusPct >= 0 ? '+' : ''}${bonusPct}% Produção`;
            elGmFarm.style.color = 'var(--gold-hover)';
        }
    }

    if (elGmBuild) {
        if (timeCfg.instantConstruction) {
            elGmBuild.textContent = 'Obras Imediatas';
            elGmBuild.style.color = '#27ae60';
        } else {
            const bMult = (typeof timeCfg.constructionMultiplier === 'number' && timeCfg.constructionMultiplier > 0) ? timeCfg.constructionMultiplier : 1.0;
            elGmBuild.textContent = `${Math.round(bMult * 100)}% Eficiência`;
            elGmBuild.style.color = '#2980b9';
        }
    }

    if (elGmXp) {
        elGmXp.textContent = `${Math.round(xpMult * 100)}% XP`;
    }

    if (elGmFatigue) {
        if (timeCfg.noFatigue) {
            elGmFatigue.textContent = 'Vigor Contínuo';
            elGmFatigue.style.color = '#27ae60';
        } else {
            elGmFatigue.textContent = 'Normal';
            elGmFatigue.style.color = 'var(--text-primary)';
        }
    }

    if (elGmChips) {
        if (state.activeEvent) {
            elGmChips.innerHTML = `<span class="gm-stat-badge" style="background: rgba(39, 174, 96, 0.15); border-color: #27ae60; color: #27ae60; font-weight: bold;">🎉 Bônus de Celebração Ativo em Todo o Reino</span>`;
        } else {
            elGmChips.innerHTML = '';
        }
    }

    // 2. Colunas de Eficiência na Tabela de Setores
    const elMultFish = document.getElementById('stat-mult-fish');
    const elMultWood = document.getElementById('stat-mult-wood');
    const elMultWool = document.getElementById('stat-mult-wool');
    const elMultMine = document.getElementById('stat-mult-mine');

    if (elMultFish) elMultFish.textContent = `${Math.round(multFish * 100)}%`;
    if (elMultWood) elMultWood.textContent = `${Math.round(multWood * 100)}%`;
    if (elMultWool) elMultWool.textContent = `${Math.round(multWool * 100)}%`;
    if (elMultMine) elMultMine.textContent = `${Math.round(multStone * 100)}%`;

    // 3. Taxa teórica de produção por gato alocado
    const perCatFish = (0.020 + (caisLevel * 0.006)) * hungerPenalty * multFish;
    const perCatWood = (0.010 + (cabanaLevel * 0.003)) * hungerPenalty * multWood;
    const perCatWool = (0.008 + (arranhadorLevel * 0.0025)) * hungerPenalty * multWool;
    const baseCatMina = (0.007 + (minaLevel * 0.002)) * hungerPenalty;
    const perCatMine = (baseCatMina * 0.7 * multStone) + (baseCatMina * 0.25 * multCoal) + (baseCatMina * 0.08 * multIron);

    const elPerCatFish = document.getElementById('stat-percat-fish');
    const elPerCatWood = document.getElementById('stat-percat-wood');
    const elPerCatWool = document.getElementById('stat-percat-wool');
    const elPerCatMine = document.getElementById('stat-percat-mine');

    if (elPerCatFish) elPerCatFish.textContent = `(+${perCatFish.toFixed(3)}/s | +${Math.round(perCatFish * 3600)}/h)`;
    if (elPerCatWood) elPerCatWood.textContent = `(+${perCatWood.toFixed(3)}/s | +${Math.round(perCatWood * 3600)}/h)`;
    if (elPerCatWool) elPerCatWool.textContent = `(+${perCatWool.toFixed(3)}/s | +${Math.round(perCatWool * 3600)}/h)`;
    if (elPerCatMine) elPerCatMine.textContent = `(+${perCatMine.toFixed(3)}/s | +${Math.round(perCatMine * 3600)}/h)`;

    // Summary counts
    const totalWorking = state.pop.fish + state.pop.wood + state.pop.wool + state.pop.mine;
    const elSummaryTotal = document.getElementById('stat-summary-total');
    const elSummaryWorking = document.getElementById('stat-summary-working');
    const elSummaryIdle = document.getElementById('stat-summary-idle');

    if (elSummaryTotal) elSummaryTotal.textContent = `${state.pop.max} Máx`;
    if (elSummaryWorking) elSummaryWorking.textContent = `${totalWorking} Ativos`;
    if (elSummaryIdle) elSummaryIdle.textContent = `${state.pop.idle} Livres`;

    // Rates per second
    const elFish = document.getElementById('stat-fish');
    const elWood = document.getElementById('stat-wood');
    const elWool = document.getElementById('stat-wool');
    const elMine = document.getElementById('stat-mine');
    
    const signFish = fish >= 0 ? '+' : '';
    if (elFish) elFish.innerHTML = `${signFish}${fish.toFixed(2)} /s <small id="stat-percat-fish" style="opacity: 0.75; font-weight: normal; font-size: 0.75rem; display: block;">(+${perCatFish.toFixed(3)}/gato | -${foodConsumption.toFixed(3)} consumo)</small>`;
    if (elWood) elWood.innerHTML = `+${wood.toFixed(2)} /s <small id="stat-percat-wood" style="opacity: 0.75; font-weight: normal; font-size: 0.75rem; display: block;">(+${perCatWood.toFixed(3)}/gato)</small>`;
    if (elWool) elWool.innerHTML = `+${wool.toFixed(2)} /s <small id="stat-percat-wool" style="opacity: 0.75; font-weight: normal; font-size: 0.75rem; display: block;">(+${perCatWool.toFixed(3)}/gato)</small>`;
    if (elMine) elMine.innerHTML = `+${mine.toFixed(2)} /s <small id="stat-percat-mine" style="opacity: 0.75; font-weight: normal; font-size: 0.75rem; display: block;">(+${perCatMine.toFixed(3)}/gato)</small>`;

    // Rates per hour
    const elFishH = document.getElementById('stat-fish-hour');
    const elWoodH = document.getElementById('stat-wood-hour');
    const elWoolH = document.getElementById('stat-wool-hour');
    const elMineH = document.getElementById('stat-mine-hour');

    const fishHourly = Math.floor(fish * 3600);
    const signFishH = fishHourly >= 0 ? '+' : '';
    if (elFishH) elFishH.textContent = `${signFishH}${fishHourly} /h`;
    if (elWoodH) elWoodH.textContent = `+${Math.floor(wood * 3600)} /h`;
    if (elWoolH) elWoolH.textContent = `+${Math.floor(wool * 3600)} /h`;
    if (elMineH) elMineH.textContent = `+${Math.floor(mine * 3600)} /h`;

    // Workers per sector
    const elWorkFish = document.getElementById('stat-workers-fish');
    const elWorkWood = document.getElementById('stat-workers-wood');
    const elWorkWool = document.getElementById('stat-workers-wool');
    const elWorkMine = document.getElementById('stat-workers-mine');
    const elWorkScouts = document.getElementById('stat-workers-scouts');

    if (elWorkFish) elWorkFish.textContent = `🐾 ${state.pop.fish} Pescadores`;
    if (elWorkWood) elWorkWood.textContent = `🐾 ${state.pop.wood} Lenhadores`;
    if (elWorkWool) elWorkWool.textContent = `🐾 ${state.pop.wool} Tecelões`;
    if (elWorkMine) elWorkMine.textContent = `🐾 ${state.pop.mine} Mineiros`;
    if (elWorkScouts) elWorkScouts.textContent = `🗡️ ${state.pop.scouts || 0} Batedores`;

    // Building levels
    const elBldgCais = document.getElementById('stat-bldg-cais');
    const elBldgCabana = document.getElementById('stat-bldg-cabana');
    const elBldgArranhador = document.getElementById('stat-bldg-arranhador');
    const elBldgMina = document.getElementById('stat-bldg-mina');
    const elBldgQuartel = document.getElementById('stat-bldg-quartel');

    if (elBldgCais) elBldgCais.textContent = `Cais Nível ${state.buildings.cais}`;
    if (elBldgCabana) elBldgCabana.textContent = `Cabana Nível ${state.buildings.cabana}`;
    if (elBldgArranhador) elBldgArranhador.textContent = `Arranhador Nível ${state.buildings.arranhador}`;
    if (elBldgMina) elBldgMina.textContent = `Mina Nível ${state.buildings.mina}`;
    if (elBldgQuartel) elBldgQuartel.textContent = `Quartel Nível ${state.buildings.quartel}`;

    // Military and Tower Stats Table
    const activeHero = getActiveHero();
    const heroStats = activeHero ? getHeroTotalStats(activeHero.id) : null;
    const { used, max } = getArmyCapacity();

    const elHeroName = document.getElementById('stat-hero-name');
    const elHeroPower = document.getElementById('stat-hero-power');
    const elHeroLevel = document.getElementById('stat-hero-level');
    const elTowerFloor = document.getElementById('stat-tower-floor');
    const elTowerVictories = document.getElementById('stat-tower-victories');
    const elTowerDefeats = document.getElementById('stat-tower-defeats');
    const elArmyCount = document.getElementById('stat-army-count');
    const elArmyPower = document.getElementById('stat-army-power');
    const elArmyStatus = document.getElementById('stat-army-status');
    const elEquippedCount = document.getElementById('stat-equipped-count');
    const elGearPower = document.getElementById('stat-gear-power');
    const elInventoryCount = document.getElementById('stat-inventory-count');

    if (elHeroName) elHeroName.textContent = activeHero ? `${activeHero.icon} ${activeHero.name} (${activeHero.class})` : 'Nenhum';
    if (elHeroPower) elHeroPower.textContent = `⚔️ ${heroStats ? heroStats.totalPower : 0} Poder`;
    if (elHeroLevel) elHeroLevel.textContent = activeHero ? `Nível ${activeHero.level}` : '-';

    if (elTowerFloor) elTowerFloor.textContent = `Andar ${state.tower?.highestFloor || 1} Desbloqueado`;
    if (elTowerVictories) elTowerVictories.textContent = `${state.tower?.victories || 0} Vitórias`;
    if (elTowerDefeats) elTowerDefeats.textContent = `${state.tower?.defeats || 0} Derrotas`;

    let totalArmyPower = 0;
    if (state.army) {
        for (let t in state.army) {
            const template = TROOP_TEMPLATES[t];
            if (template) totalArmyPower += (state.army[t] || 0) * template.power;
        }
    }
    if (elArmyCount) elArmyCount.textContent = `${used} / ${max} Guerreiros`;
    if (elArmyPower) elArmyPower.textContent = `⚔️ ${totalArmyPower} Poder`;

    const now = Date.now();
    const isArmyResting = (state.fatigue?.armyRestUntil || 0) > now;
    if (elArmyStatus) {
        if (state.activeExpedition) {
            elArmyStatus.textContent = '⚔️ Em Expedição';
            elArmyStatus.style.color = 'var(--gold-hover)';
        } else if (isArmyResting) {
            const restSecs = Math.ceil((state.fatigue.armyRestUntil - now) / 1000);
            elArmyStatus.textContent = `😴 Descansando (${restSecs}s)`;
            elArmyStatus.style.color = '#f57c00';
        } else {
            elArmyStatus.textContent = '✅ Pronto para Marcha';
            elArmyStatus.style.color = '#2e7d32';
        }
    }

    let equippedItemsCount = 0;
    let totalGearBonus = 0;
    if (activeHero && activeHero.equipped) {
        for (let slot in activeHero.equipped) {
            const item = activeHero.equipped[slot];
            if (item) {
                equippedItemsCount++;
                if (item.stats) {
                    for (let s in item.stats) totalGearBonus += item.stats[s];
                }
            }
        }
    }
    if (elEquippedCount) elEquippedCount.textContent = `${equippedItemsCount} Itens Equipados`;
    if (elGearPower) elGearPower.textContent = `✨ +${totalGearBonus} Atributos`;
    if (elInventoryCount) elInventoryCount.textContent = `${state.inventory?.length || 0} na Mochila`;
}

export function showTabletopCombatModal(res) {
    let modal = document.getElementById('modal-tabletop-combat');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-tabletop-combat';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const enemy = res.battleDetails?.enemy || res.floor;
    const isVictory = res.isVictory;
    const combatLog = res.combatLog || [];

    modal.innerHTML = `
        <div class="modal-content tabletop-modal-content parchment-panel slide-in-down" style="max-width: 720px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; border: 2px solid var(--gold); box-shadow: 0 16px 40px rgba(0,0,0,0.5);">
            <!-- Header -->
            <div style="background: ${isVictory ? 'linear-gradient(135deg, #1b4332, #2d6a4f)' : 'linear-gradient(135deg, #4a0e17, #780000)'}; color: #fff; padding: 18px 24px; border-bottom: 2px solid var(--gold); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 2.4rem;">${isVictory ? '🏆' : '💀'}</span>
                    <div>
                        <h3 style="font-family: var(--font-heading); margin: 0; font-size: 1.4rem; color: #ffd700;">
                            ${isVictory ? 'Vitória Épica na Torre dos Desafios!' : 'Retirada Tática na Torre!'}
                        </h3>
                        <span style="font-size: 0.88rem; opacity: 0.95;">
                            Andar ${res.floor.floor} &bull; ${enemy.name} ${enemy.title ? `(${enemy.title})` : ''}
                        </span>
                    </div>
                </div>
                <button type="button" class="btn-close-modal" id="btn-close-combat-top" style="background:none; border:none; color:#fff; font-size:1.8rem; cursor:pointer; line-height: 1;">&times;</button>
            </div>

            <!-- Summary Bar -->
            <div style="padding: 12px 20px; background: rgba(0,0,0,0.04); border-bottom: 1px solid var(--parchment-border); display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; font-size: 0.9rem;">
                <span>🪙 Ouro: <strong style="color:var(--gold-hover);">+${res.goldGain}</strong></span>
                <span>🌟 XP Herói: <strong style="color:#8e44ad;">+${res.xpGain}</strong></span>
                <span>⚔️ Rodadas: <strong>${res.battleDetails?.totalRounds || 1}</strong></span>
                ${res.droppedItem ? `<span style="color:#27ae60; font-weight:bold;">💎 Item: ${res.droppedItem.icon} ${res.droppedItem.name}</span>` : ''}
            </div>

            <!-- Tabletop RPG Dice Combat Log Header -->
            <div style="padding: 14px 20px 6px 20px; font-weight: 800; font-size: 0.92rem; color: var(--wood-dark); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--parchment-border);">
                <span>🎲 Registro de Mesa (Rolagem de Dados D&D 5e):</span>
                <span style="font-size: 0.78rem; color: var(--text-secondary); font-weight: normal;">d20 de Ataque vs Classe de Armadura (CA)</span>
            </div>

            <!-- Scrollable Dice Log -->
            <div class="combat-dice-log-scroll" style="flex: 1; overflow-y: auto; padding: 14px 20px; display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.02);">
                ${combatLog.length === 0 ? '<p style="text-align:center; color:var(--text-secondary);">Sem registros de combate.</p>' : combatLog.map(entry => {
                    if (entry.type === 'round_header') {
                        return `<div class="combat-log-round-header" style="font-weight: 800; font-size: 0.88rem; color: var(--gold-hover); text-align: center; margin: 8px 0 4px 0; border-bottom: 1px dashed var(--parchment-border); padding-bottom: 4px;">${entry.text}</div>`;
                    }
                    const isCrit = entry.isNat20;
                    const isFumble = entry.isNat1;
                    const isVictoryEntry = entry.type === 'victory';
                    const isDefeatEntry = entry.type === 'defeat';

                    let bg = 'rgba(255,255,255,0.7)';
                    let border = '1px solid rgba(0,0,0,0.08)';

                    if (isCrit) {
                        bg = 'rgba(212,175,55,0.18)';
                        border = '1px solid var(--gold)';
                    } else if (isFumble) {
                        bg = 'rgba(192,57,43,0.12)';
                        border = '1px solid #c0392b';
                    } else if (isVictoryEntry) {
                        bg = 'rgba(39,174,96,0.15)';
                        border = '1px solid #27ae60';
                    } else if (isDefeatEntry) {
                        bg = 'rgba(192,57,43,0.15)';
                        border = '1px solid #c0392b';
                    } else if (entry.phase === 'enemy_attack') {
                        bg = 'rgba(0,0,0,0.04)';
                    } else if (entry.phase === 'squad_volley') {
                        bg = 'rgba(41,128,185,0.08)';
                        border = '1px solid rgba(41,128,185,0.2)';
                    }

                    return `
                        <div class="combat-log-row ${isCrit ? 'crit-roll' : ''} ${isFumble ? 'fumble-roll' : ''}" style="background: ${bg}; border: ${border}; border-radius: 8px; padding: 9px 14px; font-size: 0.86rem; line-height: 1.45; color: var(--text-primary);">
                            ${entry.text}
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Footer Action -->
            <div style="padding: 14px 20px; border-top: 1px solid var(--parchment-border); text-align: center; background: rgba(0,0,0,0.03);">
                <button type="button" class="btn primary-btn" id="btn-close-combat-modal" style="padding: 10px 36px; font-size: 1rem; font-weight: bold;">
                    ⚔️ Concluir Relatório de Combate
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const closeModal = () => {
        modal.style.display = 'none';
    };

    const btnClose = modal.querySelector('#btn-close-combat-modal');
    const btnTopClose = modal.querySelector('#btn-close-combat-top');
    if (btnClose) btnClose.onclick = closeModal;
    if (btnTopClose) btnTopClose.onclick = closeModal;
}

function handleExpeditionResult(res) {
    const state = getState();
    updateResourceUI();
    checkMissions();

    if (res.isVictory) {
        showLevelUpNotification(`Vitória no Andar ${res.floor.floor}! (+${res.goldGain} Ouro) 🏆`);
    }

    showTabletopCombatModal(res);
    renderQuartel();
}


function updateTowerLiveUI() {
    const state = getState();
    const liveCard = document.getElementById('tower-live-expedition-card');
    if (!liveCard || !state.activeExpedition) return;

    const exp = state.activeExpedition;
    const now = Date.now();
    const remainingSecs = Math.max(0, Math.ceil((exp.endTime - now) / 1000));
    const pct = Math.min(100, Math.round(((now - exp.startTime) / exp.durationMs) * 100));

    const timerEl = document.getElementById('tower-live-timer');
    const fillEl = document.getElementById('tower-live-fill');
    if (timerEl) timerEl.textContent = `⏳ ${remainingSecs}s restantes`;
    if (fillEl) fillEl.style.width = `${pct}%`;
}

export function renderQuartel() {
    const state = getState();
    const container = document.getElementById('quartel-content');
    if (!container) return;

    // Se nenhum herói foi ativado nem desbloqueado, apresenta a seleção do Starter
    const unlockedCount = Object.keys(state.unlockedHeroes || {}).length;
    if (unlockedCount === 0 || !state.activeHeroId) {
        container.innerHTML = `
            <div class="hero-selection-banner">
                <h3 style="font-family: var(--font-heading); color: var(--gold-hover); font-size: 1.35rem; margin-bottom: 6px;">
                    ⚔️ Despertar do Primeiro Campeão Felino
                </h3>
                <p style="font-size: 0.9rem; color: var(--text-secondary); max-width: 650px; margin: 0 auto;">
                    Sua vila precisa de um líder lendário para comandar as tropas na Torre de Desafios.
                    <strong>Seu primeiro herói é gratuito!</strong> Os demais heróis poderão ser recrutados no Quartel acumulando Ouro.
                </p>
            </div>
            
            <div class="hero-selection-grid">
                <!-- Sword Knight -->
                <div class="hero-card-select">
                    <img src="${HERO_TEMPLATES.sword.image}" alt="Cavaleiro Leonidas" class="hero-portrait-img">
                    <div>
                        <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--wood-dark); margin: 0;">
                            ${HERO_TEMPLATES.sword.icon} ${HERO_TEMPLATES.sword.name}
                        </h4>
                        <span class="hero-class-badge">⚔️ Cavaleiro Felino (${HERO_TEMPLATES.sword.title})</span>
                    </div>
                    <p class="hero-lore-text">${HERO_TEMPLATES.sword.lore}</p>
                    <div class="hero-stat-preview-grid">
                        <div>❤️ Vida: <strong>${HERO_TEMPLATES.sword.stats.hp}</strong></div>
                        <div>⚡ Estamina: <strong>${HERO_TEMPLATES.sword.stats.stamina}</strong></div>
                        <div>⚔️ Força: <strong>${HERO_TEMPLATES.sword.stats.strength}</strong></div>
                        <div>🎯 Destreza: <strong>${HERO_TEMPLATES.sword.stats.dexterity}</strong></div>
                        <div>🧠 Inteligência: <strong>${HERO_TEMPLATES.sword.stats.intelligence}</strong></div>
                        <div>🛡️ Papel: <strong>Tanque / Vanguarda</strong></div>
                    </div>
                    <button type="button" class="btn primary-btn btn-choose-starter" data-hero="sword" style="margin-top: auto; width: 100%;">
                        ⚔️ Escolher Cavaleiro
                    </button>
                </div>

                <!-- Bow Archer -->
                <div class="hero-card-select">
                    <img src="${HERO_TEMPLATES.bow.image}" alt="Arqueira Lyra" class="hero-portrait-img">
                    <div>
                        <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--wood-dark); margin: 0;">
                            ${HERO_TEMPLATES.bow.icon} ${HERO_TEMPLATES.bow.name}
                        </h4>
                        <span class="hero-class-badge">🏹 Arqueira Felina (${HERO_TEMPLATES.bow.title})</span>
                    </div>
                    <p class="hero-lore-text">${HERO_TEMPLATES.bow.lore}</p>
                    <div class="hero-stat-preview-grid">
                        <div>❤️ Vida: <strong>${HERO_TEMPLATES.bow.stats.hp}</strong></div>
                        <div>⚡ Estamina: <strong>${HERO_TEMPLATES.bow.stats.stamina}</strong></div>
                        <div>⚔️ Força: <strong>${HERO_TEMPLATES.bow.stats.strength}</strong></div>
                        <div>🎯 Destreza: <strong>${HERO_TEMPLATES.bow.stats.dexterity}</strong></div>
                        <div>🧠 Inteligência: <strong>${HERO_TEMPLATES.bow.stats.intelligence}</strong></div>
                        <div>🏹 Papel: <strong>Crítico / Agilidade</strong></div>
                    </div>
                    <button type="button" class="btn primary-btn btn-choose-starter" data-hero="bow" style="margin-top: auto; width: 100%;">
                        🏹 Escolher Arqueiro
                    </button>
                </div>

                <!-- Mage Sorcerer -->
                <div class="hero-card-select">
                    <img src="${HERO_TEMPLATES.mage.image}" alt="Mago Morgan" class="hero-portrait-img">
                    <div>
                        <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--wood-dark); margin: 0;">
                            ${HERO_TEMPLATES.mage.icon} ${HERO_TEMPLATES.mage.name}
                        </h4>
                        <span class="hero-class-badge">🔮 Mago Felino (${HERO_TEMPLATES.mage.title})</span>
                    </div>
                    <p class="hero-lore-text">${HERO_TEMPLATES.mage.lore}</p>
                    <div class="hero-stat-preview-grid">
                        <div>❤️ Vida: <strong>${HERO_TEMPLATES.mage.stats.hp}</strong></div>
                        <div>⚡ Estamina: <strong>${HERO_TEMPLATES.mage.stats.stamina}</strong></div>
                        <div>⚔️ Força: <strong>${HERO_TEMPLATES.mage.stats.strength}</strong></div>
                        <div>🎯 Destreza: <strong>${HERO_TEMPLATES.mage.stats.dexterity}</strong></div>
                        <div>🧠 Inteligência: <strong>${HERO_TEMPLATES.mage.stats.intelligence}</strong></div>
                        <div>🔮 Papel: <strong>Magia / Dano em Área</strong></div>
                    </div>
                    <button type="button" class="btn primary-btn btn-choose-starter" data-hero="mage" style="margin-top: auto; width: 100%;">
                        🔮 Escolher Mago
                    </button>
                </div>
            </div>
        `;

        container.querySelectorAll('.btn-choose-starter').forEach(btn => {
            btn.onclick = () => {
                const heroId = btn.getAttribute('data-hero');
                const tpl = HERO_TEMPLATES[heroId];
                selectStarterHero(heroId);
                gainXP(50, 'Campeão Inicial');
                showLevelUpNotification(`Herói: ${tpl.name} assumiu o comando da vila!`);
                currentQuartelTab = 'heroes';
                renderQuartel();
            };
        });
        return;
    }

    // Hero(es) already unlocked! Render the 4 Sub-Tabs Navigation
    const activeHero = getActiveHero();
    const heroStats = activeHero ? getHeroTotalStats(activeHero.id) : null;
    const now = Date.now();
    const isHeroResting = (state.fatigue?.heroRestUntil?.[activeHero?.id] || 0) > now;
    const isArmyResting = (state.fatigue?.armyRestUntil || 0) > now;

    let subnavHTML = `
        <div class="quartel-subnav">
            <button type="button" class="quartel-tab-btn ${currentQuartelTab === 'tower' ? 'active' : ''}" data-tab="tower">
                🏰 Torre de Desafios
            </button>
            <button type="button" class="quartel-tab-btn ${currentQuartelTab === 'talents' ? 'active' : ''}" data-tab="talents">
                🌳 Talentos & Ataques D&D ${(activeHero?.talentPoints || 0) > 0 ? `<span style="background:#27ae60; color:#fff; border-radius:10px; padding:1px 6px; font-size:0.75rem;">+${activeHero.talentPoints}</span>` : ''}
            </button>
            <button type="button" class="quartel-tab-btn ${currentQuartelTab === 'heroes' ? 'active' : ''}" data-tab="heroes">
                🐾 Campeões & Atributos ${(activeHero?.statPoints || 0) > 0 ? `<span style="background:#ff9800; color:#fff; border-radius:10px; padding:1px 6px; font-size:0.75rem;">+${activeHero.statPoints}</span>` : ''}
            </button>
            <button type="button" class="quartel-tab-btn ${currentQuartelTab === 'gear' ? 'active' : ''}" data-tab="gear">
                🎒 Inventário & Equipamentos ${(state.inventory?.length || 0) > 0 ? `<span style="background:var(--gold); color:#180e03; border-radius:10px; padding:1px 6px; font-size:0.75rem;">${state.inventory.length}</span>` : ''}
            </button>
            <button type="button" class="quartel-tab-btn ${currentQuartelTab === 'army' ? 'active' : ''}" data-tab="army">
                🛡️ Guarnição de Tropas
            </button>
        </div>
    `;

    let mainContentHTML = '';

    // ==========================================
    // TAB 1: TORRE DE DESAFIOS (EXPEDIÇÕES)
    // ==========================================
    if (currentQuartelTab === 'tower') {
        const highestFloor = state.tower?.highestFloor || 1;

        mainContentHTML = `
            <!-- Tower Header Banner -->
            <div class="tower-header-banner">
                <img src="assets/tower_of_expeditions.jpg" alt="Torre dos Desafios Felinos" class="tower-banner-img">
                <div class="tower-banner-overlay">
                    <span style="font-size: 0.82rem; font-weight: 800; color: #ffd700; text-transform: uppercase; letter-spacing: 1px;">Expedições Militares</span>
                    <h3 style="font-family: var(--font-heading); font-size: 1.6rem; margin: 4px 0;">🏰 Torre dos Desafios Felinos</h3>
                    <div style="font-size: 0.88rem; display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px;">
                        <span>Andar Mais Alto: <strong>Andar ${highestFloor}</strong></span> &bull; 
                        <span>Vitórias: <strong style="color: #4caf50;">${state.tower?.victories || 0}</strong></span> &bull; 
                        <span>Derrotas: <strong style="color: #f44336;">${state.tower?.defeats || 0}</strong></span> &bull; 
                        <span>Líder da Marcha: <strong>${activeHero.icon} ${activeHero.name} (Poder: ${heroStats.totalPower})</strong></span>
                    </div>
                </div>
            </div>

            <!-- Active Expedition Banner (with Pixel Art March Animation) -->
            ${state.activeExpedition ? `
                <div id="tower-live-expedition-card" class="village-expedition-banner" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 1.05rem; color: var(--wood-dark);">
                            <span class="expedition-live-dot"></span> Marchando no Andar ${state.activeExpedition.floor} - ${state.activeExpedition.name}
                        </span>
                        <span id="tower-live-timer" class="expedition-timer-pill">
                            ⏳ ${Math.max(0, Math.ceil((state.activeExpedition.endTime - now) / 1000))}s restantes
                        </span>
                    </div>
                    
                    <!-- Pixel Art March Animation Container -->
                    <div class="pixel-art-march-box" style="margin: 8px 0 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--parchment-border); background: #120d18; text-align: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                        <canvas id="tower-pixel-art-canvas" class="pixel-art-march-canvas" style="display: block; width: 100%; max-height: 100px; image-rendering: pixelated;"></canvas>
                    </div>

                    <div class="expedition-mini-progress" style="height: 12px;">
                        <div id="tower-live-fill" class="expedition-mini-fill" style="width: ${Math.min(100, Math.round(((now - state.activeExpedition.startTime) / state.activeExpedition.durationMs) * 100))}%;"></div>
                    </div>
                </div>
            ` : ''}


            <!-- Fatigue Notice (if resting) -->
            ${(isHeroResting || isArmyResting) ? `
                <div class="fatigue-notice">
                    <span>😴 <strong>Esquadrão em Descanso:</strong> Suas tropas e o herói estão se recuperando da última investida. Descanse o fôlego antes da próxima marcha!</span>
                </div>
            ` : ''}

            <!-- Tower Floors Grid -->
            <div class="tower-floor-grid">
                ${TOWER_FLOORS.map(f => {
                    const isUnlocked = f.floor <= highestFloor;
                    const isCurrent = f.floor === highestFloor;

                    return `
                        <div class="tower-floor-card ${isUnlocked ? 'unlocked' : 'locked'}">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <span style="font-size: 0.75rem; font-weight: 800; color: ${isUnlocked ? 'var(--gold-hover)' : 'var(--text-secondary)'}; text-transform: uppercase;">
                                        Andar ${f.floor}
                                    </span>
                                    <h4 style="margin: 2px 0 0 0; font-family: var(--font-heading); font-size: 1.05rem; color: var(--wood-dark);">
                                        ${f.name}
                                    </h4>
                                </div>
                                <span style="font-size: 0.8rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: ${isUnlocked ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.1)'}; color: ${isUnlocked ? 'var(--gold-hover)' : 'var(--text-secondary)'};">
                                    ⏱️ ${f.durationSeconds}s
                                </span>
                            </div>

                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                Inimigo: <strong>${f.enemy}</strong><br>
                                Poder Inimigo: <strong style="color: #c62828;">${f.enemyPower}</strong> &bull; Seu Poder: <strong style="color: #2e7d32;">${heroStats.totalPower}</strong>
                            </div>

                            ${f.tacticalHint ? `
                                <div class="tactical-badge">
                                    ${f.tacticalHint}
                                </div>
                            ` : ''}

                            <div style="font-size: 0.78rem; font-weight: 700; color: var(--gold-hover); margin-top: auto;">
                                Espólios: 🪙 +${f.rewards.gold} | 🌟 +${f.rewards.xp} XP | Chance de Item: ${Math.round(f.dropChance * 100)}%
                            </div>

                            ${isUnlocked ? `
                                <button type="button" class="btn primary-btn btn-march-tower" data-floor="${f.floor}" style="width: 100%;" ${state.activeExpedition || isHeroResting || isArmyResting ? 'disabled style="opacity:0.6;"' : ''}>
                                    ${state.activeExpedition ? '⏳ Em Marcha...' : (isHeroResting || isArmyResting ? '😴 Descansando...' : '⚔️ Marchar pela Torre')}
                                </button>
                            ` : `
                                <button type="button" class="btn secondary-btn" disabled style="width: 100%; opacity: 0.5;">
                                    🔒 Bloqueado (Vença o Andar ${f.floor - 1})
                                </button>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // ==========================================
    // TAB: ÁRVORE DE TALENTOS & ATAQUES D&D 5E
    // ==========================================
    else if (currentQuartelTab === 'talents') {
        const tree = getTalentTreeForHero(activeHero.id);
        const talentPoints = activeHero.talentPoints || 0;
        const heroTalents = activeHero.talents || {};
        const bonuses = computeHeroTalentBonuses(activeHero);

        mainContentHTML = `
            <!-- Talent Tree Header Banner -->
            <div class="parchment-panel" style="background: linear-gradient(135deg, rgba(39,174,96,0.12), rgba(212,175,55,0.12)); border: 1px solid var(--gold); border-radius: 12px; padding: 18px 22px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="${activeHero.image}" alt="${activeHero.name}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--gold); object-fit: cover;">
                        <div>
                            <h3 style="font-family: var(--font-heading); color: var(--wood-dark); margin: 0; font-size: 1.25rem;">
                                🌳 Árvore de Talentos D&D: ${activeHero.name}
                            </h3>
                            <span class="hero-class-badge">${activeHero.class} (Nv. ${activeHero.level})</span>
                            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                                Desbloqueie ataques de dados, magias lendárias e bônus de Classe de Armadura (CA).
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <div style="background: rgba(39, 174, 96, 0.15); border: 1px solid #27ae60; padding: 8px 16px; border-radius: 8px; text-align: center;">
                            <span style="font-size: 0.75rem; color: #27ae60; font-weight: bold; display: block;">PONTOS DE TALENTO D&D</span>
                            <strong style="font-size: 1.35rem; color: #27ae60;">✨ ${talentPoints} Livres</strong>
                        </div>
                        <button type="button" class="btn secondary-btn btn-reset-talents" style="padding: 8px 14px; font-size: 0.85rem;" title="Devolve todos os pontos investidos">
                            🔄 Redefinir Talentos
                        </button>
                    </div>
                </div>
            </div>

            <!-- Active Hero Active Attacks Showcase -->
            ${bonuses.activeAttacks.length > 0 ? `
                <div style="margin-bottom: 20px; background: rgba(0,0,0,0.03); border: 1px solid var(--parchment-border); border-radius: 10px; padding: 12px 16px;">
                    <span style="font-size: 0.78rem; font-weight: 800; color: var(--wood-dark); text-transform: uppercase;">⚔️ Ataques & Magias Especiais Ativas no Combate:</span>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px;">
                        ${bonuses.activeAttacks.map(atk => `
                            <span style="background: rgba(212,175,55,0.18); border: 1px solid var(--gold); color: var(--wood-dark); padding: 5px 12px; border-radius: 8px; font-weight: bold; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px;">
                                ${atk.icon} ${atk.name} (${atk.damageDice} + ${atk.statKey.toUpperCase()})
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Branches Grid -->
            <div class="talent-branches-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
                ${tree ? tree.branches.map(branch => `
                    <div class="talent-branch-card parchment-panel" style="padding: 20px; border-radius: 14px; border: 1px solid var(--parchment-border); background: rgba(255,255,255,0.7);">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 2px solid var(--parchment-border); padding-bottom: 8px;">
                            <span style="font-size: 1.8rem;">${branch.icon}</span>
                            <div>
                                <h4 style="font-family: var(--font-heading); color: var(--wood-dark); margin: 0; font-size: 1.15rem;">${branch.name}</h4>
                                <small style="color: var(--text-secondary); font-size: 0.8rem;">${branch.desc}</small>
                            </div>
                        </div>

                        <div class="talent-nodes-list" style="display: flex; flex-direction: column; gap: 14px; margin-top: 14px;">
                            ${branch.talents.map((t) => {
                                const isUnlocked = !!heroTalents[t.id];
                                const hasPrereq = !t.requires || !!heroTalents[t.requires];
                                const canAfford = talentPoints >= (t.cost || 1);
                                const isReady = !isUnlocked && hasPrereq && canAfford;

                                return `
                                    <div class="talent-node-card ${isUnlocked ? 'unlocked' : (hasPrereq ? 'available' : 'locked')}" style="padding: 12px 14px; border-radius: 10px; border: 1px solid ${isUnlocked ? '#27ae60' : (hasPrereq ? 'var(--gold)' : 'rgba(0,0,0,0.1)')}; background: ${isUnlocked ? 'rgba(39, 174, 96, 0.08)' : (hasPrereq ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.03)')};">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <span style="font-size: 1.3rem;">${t.icon}</span>
                                                <div>
                                                    <h5 style="margin: 0; font-family: var(--font-heading); font-size: 0.95rem; color: var(--wood-dark);">
                                                        ${t.name}
                                                    </h5>
                                                    <span style="font-size: 0.72rem; text-transform: uppercase; font-weight: bold; color: ${t.type === 'active_attack' ? '#e67e22' : '#2980b9'};">
                                                        ${t.type === 'active_attack' ? '⚔️ Ataque Especial Ativo' : '🛡️ Habilidade Passiva'} &bull; Tier ${t.tier}
                                                    </span>
                                                </div>
                                            </div>
                                            <span style="font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 6px; background: ${isUnlocked ? '#27ae60' : 'rgba(0,0,0,0.08)'}; color: ${isUnlocked ? '#fff' : 'var(--text-secondary)'};">
                                                ${isUnlocked ? '✔ Desbloqueado' : `Custo: ${t.cost || 1} TP`}
                                            </span>
                                        </div>

                                        <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 6px 0 10px 0; line-height: 1.35;">
                                            ${t.desc}
                                        </p>

                                        <div style="text-align: right;">
                                            ${isUnlocked ? `
                                                <button type="button" class="btn" disabled style="background: rgba(39,174,96,0.2); color: #27ae60; border: 1px solid #27ae60; font-size: 0.8rem; padding: 4px 10px;">
                                                    ✔ Ativo em Combate
                                                </button>
                                            ` : isReady ? `
                                                <button type="button" class="btn primary-btn btn-unlock-talent" data-talent="${t.id}" style="font-size: 0.82rem; padding: 5px 12px;">
                                                    ✨ Aprender (${t.cost || 1} Ponto)
                                                </button>
                                            ` : !hasPrereq ? `
                                                <button type="button" class="btn secondary-btn" disabled style="font-size: 0.78rem; opacity: 0.5; padding: 4px 8px;">
                                                    🔒 Requer Talento Anterior
                                                </button>
                                            ` : `
                                                <button type="button" class="btn secondary-btn" disabled style="font-size: 0.78rem; opacity: 0.5; padding: 4px 8px;">
                                                    ✨ Sem Pontos (Suba Nível na Torre)
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('') : '<p>Nenhuma árvore de talentos disponível.</p>'}
            </div>
        `;
    }

    // ==========================================
    // TAB 2: CAMPEÕES & ATRIBUTOS (ELDEN RING)
    // ==========================================
    else if (currentQuartelTab === 'heroes') {

        const heroesList = ['sword', 'bow', 'mage'];

        mainContentHTML = `
            <!-- Hero Switcher & Recruitment -->
            <div style="margin-bottom: 20px;">
                <h4 style="font-family: var(--font-heading); color: var(--wood-dark); margin: 0 0 10px 0;">
                    👥 Salão dos Campeões Felineos da Vila
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
                    ${heroesList.map(hId => {
                        const tpl = HERO_TEMPLATES[hId];
                        const unlockedHero = state.unlockedHeroes?.[hId];
                        const isUnlocked = !!unlockedHero;
                        const isActive = state.activeHeroId === hId;
                        const unlockCost = getHeroUnlockCost(hId);

                        return `
                            <div class="hero-card-select" style="${isActive ? 'border-color: var(--gold); box-shadow: 0 0 12px rgba(212,175,55,0.4);' : ''}">
                                <div style="display: flex; gap: 12px; align-items: center;">
                                    <img src="${tpl.image}" alt="${tpl.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold);">
                                    <div style="overflow: hidden;">
                                        <h5 style="margin: 0; font-family: var(--font-heading); font-size: 1rem; color: var(--wood-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${tpl.icon} ${tpl.name}
                                        </h5>
                                        <span class="hero-class-badge">${tpl.class}</span>
                                        ${isUnlocked ? `<span style="font-size: 0.75rem; font-weight: bold; margin-left: 6px;">Nv. ${unlockedHero.level}</span>` : ''}
                                    </div>
                                </div>

                                <div style="margin-top: auto; padding-top: 8px;">
                                    ${isActive ? `
                                        <button type="button" class="btn primary-btn" disabled style="width: 100%; font-size: 0.85rem;">
                                            ⭐ Campeão Ativo
                                        </button>
                                    ` : isUnlocked ? `
                                        <button type="button" class="btn secondary-btn btn-switch-hero" data-hero="${hId}" style="width: 100%; font-size: 0.85rem;">
                                            🐾 Ativar como Campeão
                                        </button>
                                    ` : `
                                        <button type="button" class="btn primary-btn btn-recruit-hero" data-hero="${hId}" style="width: 100%; font-size: 0.85rem;">
                                            🪙 Contratar (🪙 ${unlockCost} Ouro)
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Active Hero Elden Ring Sheet -->
            <div class="hero-rpg-container">
                <div class="hero-rpg-portrait-box">
                    <img src="${activeHero.image}" alt="${activeHero.name}" class="hero-rpg-portrait">
                    <span class="hero-class-badge">${activeHero.icon} ${activeHero.title} (${activeHero.class})</span>
                    <span style="font-weight: 800; font-size: 0.95rem; color: var(--wood-dark); margin-top: 4px;">
                        ⚔️ Poder Total: <strong>${heroStats.totalPower}</strong>
                    </span>
                </div>
                
                <div class="hero-rpg-sheet">
                    <div class="hero-header-row">
                        <div>
                            <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--wood-dark); margin: 0;">
                                ${activeHero.name}
                            </h3>
                            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
                                ${activeHero.lore}
                            </p>
                        </div>
                        <div style="text-align: right; flex-shrink: 0; margin-left: 15px;">
                            <span class="hero-level-display">Nível ${activeHero.level}</span>
                        </div>
                    </div>

                    <!-- XP Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 3px;">
                            <span>Progresso de Combate</span>
                            <span>${activeHero.xp} / ${activeHero.xpNext} XP</span>
                        </div>
                        <div class="profile-xp-bar-bg" style="height: 10px;">
                            <div class="profile-xp-fill" style="width: ${Math.min(100, Math.round((activeHero.xp / activeHero.xpNext) * 100))}%;"></div>
                        </div>
                    </div>

                    <!-- Elden Ring Stat Points Alert -->
                    ${(activeHero.statPoints && activeHero.statPoints > 0) ? `
                        <div class="stat-points-alert">
                            <span>✨ Você possui <strong>${activeHero.statPoints} Ponto(s) de Atributo</strong> livres!</span>
                            <small style="font-size: 0.75rem; opacity: 0.85;">Distribua nos botões (+) abaixo</small>
                        </div>
                    ` : ''}

                    <!-- Attributes Table -->
                    <div class="hero-attributes-table">
                        <div class="hero-stat-row">
                            <div>
                                <strong>❤️ Vida Máxima (HP)</strong>
                                <small style="display: block; font-size: 0.75rem; color: var(--text-secondary);">
                                    Sobrevivência e absorção de golpes ${heroStats.bonusHp ? `<span style="color:#2e7d32; font-weight:bold;">(+${heroStats.bonusHp} itens)</span>` : ''}
                                </small>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 800; font-size: 1rem; color: #d32f2f;">${heroStats.maxHp} HP</span>
                                ${(activeHero.statPoints && activeHero.statPoints > 0) ? `<button type="button" class="btn-stat-up" data-stat="hp" title="Gastar 1 ponto (+15 Vida Base)">+</button>` : ''}
                            </div>
                        </div>

                        <div class="hero-stat-row">
                            <div>
                                <strong>⚡ Estamina Máxima</strong>
                                <small style="display: block; font-size: 0.75rem; color: var(--text-secondary);">
                                    Fôlego para golpes repetidos e resistência ${heroStats.bonusStamina ? `<span style="color:#2e7d32; font-weight:bold;">(+${heroStats.bonusStamina} itens)</span>` : ''}
                                </small>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 800; font-size: 1rem; color: #f57c00;">${heroStats.maxStamina}</span>
                                ${(activeHero.statPoints && activeHero.statPoints > 0) ? `<button type="button" class="btn-stat-up" data-stat="stamina" title="Gastar 1 ponto (+10 Estamina Base)">+</button>` : ''}
                            </div>
                        </div>

                        <div class="hero-stat-row">
                            <div>
                                <strong>⚔️ Força (STR)</strong>
                                <small style="display: block; font-size: 0.75rem; color: var(--text-secondary);">
                                    Potência física corporal ${heroStats.bonusStrength ? `<span style="color:#2e7d32; font-weight:bold;">(+${heroStats.bonusStrength} itens)</span>` : ''}
                                </small>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 800; font-size: 1rem; color: var(--wood-dark);">${heroStats.strength}</span>
                                ${(activeHero.statPoints && activeHero.statPoints > 0) ? `<button type="button" class="btn-stat-up" data-stat="strength" title="Gastar 1 ponto (+2 Força Base)">+</button>` : ''}
                            </div>
                        </div>

                        <div class="hero-stat-row">
                            <div>
                                <strong>🎯 Destreza (DEX)</strong>
                                <small style="display: block; font-size: 0.75rem; color: var(--text-secondary);">
                                    Precisão, esquiva e acertos críticos ${heroStats.bonusDexterity ? `<span style="color:#2e7d32; font-weight:bold;">(+${heroStats.bonusDexterity} itens)</span>` : ''}
                                </small>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 800; font-size: 1rem; color: #388e3c;">${heroStats.dexterity}</span>
                                ${(activeHero.statPoints && activeHero.statPoints > 0) ? `<button type="button" class="btn-stat-up" data-stat="dexterity" title="Gastar 1 ponto (+2 Destreza Base)">+</button>` : ''}
                            </div>
                        </div>

                        <div class="hero-stat-row">
                            <div>
                                <strong>🧠 Inteligência (INT)</strong>
                                <small style="display: block; font-size: 0.75rem; color: var(--text-secondary);">
                                    Poder de feitiços arcanos e sabedoria tática ${heroStats.bonusIntelligence ? `<span style="color:#2e7d32; font-weight:bold;">(+${heroStats.bonusIntelligence} itens)</span>` : ''}
                                </small>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 800; font-size: 1rem; color: #1976d2;">${heroStats.intelligence}</span>
                                ${(activeHero.statPoints && activeHero.statPoints > 0) ? `<button type="button" class="btn-stat-up" data-stat="intelligence" title="Gastar 1 ponto (+2 Inteligência Base)">+</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // TAB 3: INVENTÁRIO & EQUIPAMENTOS (TBH)
    // ==========================================
    else if (currentQuartelTab === 'gear') {
        const slotsDef = [
            { key: 'weapon', label: 'Arma Principal', defaultIcon: '🗡️' },
            { key: 'offhand', label: 'Secundária / Escudo', defaultIcon: '🛡️' },
            { key: 'helmet', label: 'Elmo / Capuz', defaultIcon: '🪖' },
            { key: 'armor', label: 'Armadura / Traje', defaultIcon: '🥋' },
            { key: 'accessory', label: 'Amuleto / Joia', defaultIcon: '💍' }
        ];

        mainContentHTML = `
            <!-- TBH Equipped Character Gear -->
            <div class="tbh-equipment-section">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h4 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--wood-dark); margin: 0;">
                            🥋 Equipamentos de ${activeHero.icon} ${activeHero.name}
                        </h4>
                        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 3px;">
                            Equipe artefatos conquistados na Torre de Desafios para potencializar os atributos do seu herói.
                        </p>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: 800; color: var(--gold-hover); background: rgba(212,175,55,0.15); padding: 4px 12px; border-radius: 12px; border: 1px solid var(--gold);">
                        Bônus de Itens: +${heroStats.bonusHp} HP | +${heroStats.bonusStrength} FOR | +${heroStats.bonusDexterity} DES | +${heroStats.bonusIntelligence} INT
                    </span>
                </div>

                <div class="tbh-slots-grid">
                    ${slotsDef.map(s => {
                        const item = activeHero.equipped?.[s.key];
                        const isEquipped = !!item;

                        let statsString = '';
                        if (item && item.stats) {
                            statsString = Object.entries(item.stats).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');
                        }

                        return `
                            <div class="tbh-slot-card ${isEquipped ? `equipped rarity-${item.rarity}` : ''}">
                                <span class="tbh-slot-label">${s.label}</span>
                                <div class="tbh-item-icon">${isEquipped ? item.icon : s.defaultIcon}</div>
                                <div class="tbh-item-name">${isEquipped ? item.name : 'Vazio'}</div>
                                <div class="tbh-item-stats">${isEquipped ? statsString : '-'}</div>
                                ${isEquipped ? `
                                    <button type="button" class="btn secondary-btn btn-unequip-slot" data-slot="${s.key}" style="font-size: 0.72rem; padding: 3px 8px; margin-top: auto; width: 100%;">
                                        ❌ Desequipar
                                    </button>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Village Backpack / Inventory -->
            <div style="margin-top: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--wood-dark); margin: 0;">
                        🎒 Mochila de Itens da Vila (${state.inventory?.length || 0} Itens)
                    </h4>
                    <span style="font-size: 0.78rem; color: var(--text-secondary);">
                        Conquiste andares na Torre de Desafios para obter novos equipamentos!
                    </span>
                </div>

                ${(!state.inventory || state.inventory.length === 0) ? `
                    <div style="text-align: center; padding: 36px 15px; color: var(--text-secondary); background: rgba(0,0,0,0.02); border-radius: var(--border-radius-sm); margin-top: 10px; border: 1px dashed var(--parchment-border);">
                        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🎒</span>
                        <strong>Sua mochila está vazia!</strong><br>
                        Lidere seu esquadrão em expedições na Torre de Desafios para resgatar armas, armaduras e amuletos mágicos.
                    </div>
                ` : `
                    <div class="inventory-grid">
                        ${state.inventory.map(item => {
                            let statsString = '';
                            if (item.stats) {
                                statsString = Object.entries(item.stats).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' | ');
                            }

                            return `
                                <div class="inventory-item-card rarity-${item.rarity}">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 1.7rem;">${item.icon}</span>
                                        <div style="overflow: hidden;">
                                            <h5 style="margin: 0; font-family: var(--font-heading); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                ${item.name}
                                            </h5>
                                            <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">
                                                Slot: ${item.slot} &bull; ${item.rarity}
                                            </span>
                                        </div>
                                    </div>
                                    <p style="font-size: 0.76rem; color: var(--text-secondary); margin: 2px 0;">
                                        ${item.desc}
                                    </p>
                                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--gold-hover);">
                                        ${statsString}
                                    </div>
                                    <button type="button" class="btn primary-btn btn-equip-item" data-uid="${item.uid}" style="font-size: 0.8rem; padding: 5px 10px; margin-top: auto; width: 100%;">
                                        ⚔️ Equipar em ${activeHero.name.split(' ')[0]}
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;
    }

    // ==========================================
    // TAB 4: GUARNIÇÃO DE TROPAS (CLASH OF CLANS)
    // ==========================================
    else if (currentQuartelTab === 'army') {
        const { used: usedCapacity, max: maxCapacity } = getArmyCapacity();
        const capacityPct = Math.min(100, Math.round((usedCapacity / maxCapacity) * 100));

        mainContentHTML = `
            <div class="army-section">
                <div class="village-header" style="text-align: left; margin-bottom: 14px;">
                    <h3 style="font-family: var(--font-heading); font-size: 1.3rem; color: var(--wood-dark); margin: 0;">
                        🛡️ Guarnição de Tropas da Vila
                    </h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                        Treine combatentes para acompanhar seu Herói nas expedições da Torre de Desafios.
                    </p>
                </div>

                <!-- Capacity Bar -->
                <div class="army-capacity-bar-container">
                    <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 0.95rem; margin-bottom: 6px;">
                        <span>Capacidade do Exército:</span>
                        <span style="color: ${usedCapacity >= maxCapacity ? '#d32f2f' : 'var(--wood-dark)'};">${usedCapacity} / ${maxCapacity} Guerreiros</span>
                    </div>
                    <div class="profile-xp-bar-bg" style="height: 12px;">
                        <div class="profile-xp-fill" style="width: ${capacityPct}%; background: ${usedCapacity >= maxCapacity ? 'linear-gradient(90deg, #d32f2f, #f44336)' : 'linear-gradient(90deg, #3f51b5, #2196f3)'};"></div>
                    </div>
                </div>

                <!-- Troops Grid -->
                <div class="troop-grid">
                    ${Object.keys(TROOP_TEMPLATES).map(key => {
                        const t = TROOP_TEMPLATES[key];
                        const count = state.army[key] || 0;
                        const costString = Object.entries(t.cost).map(([res, amt]) => {
                            const icons = { fish: '🐟', wood: '🪵', stone: '🪨', wool: '🧶', iron: '⛓️' };
                            return `${icons[res] || ''} ${amt}`;
                        }).join(' | ');

                        return `
                            <div class="troop-training-card">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <h4 style="margin: 0; font-family: var(--font-heading); font-size: 1.05rem; color: var(--wood-dark);">
                                        ${t.icon} ${t.name}
                                    </h4>
                                    <span style="background: var(--gold); color: #180e03; font-weight: 900; font-size: 0.8rem; padding: 2px 8px; border-radius: 10px;">
                                        x${count}
                                    </span>
                                </div>
                                <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">${t.desc}</p>
                                <div style="font-size: 0.8rem; color: var(--wood-dark);">
                                    <span>⚔️ Poder: <strong>+${t.power}</strong></span> &bull; 
                                    <span>📦 Espaço: <strong>${t.space}</strong></span>
                                </div>
                                <div class="troop-cost-badges">
                                    Custo: ${costString}
                                </div>
                                <div style="display: flex; gap: 8px; margin-top: auto;">
                                    <button type="button" class="btn primary-btn btn-train-troop" data-troop="${key}" style="flex: 2; padding: 6px 10px; font-size: 0.85rem;">
                                        + Treinar
                                    </button>
                                    <button type="button" class="btn secondary-btn btn-dismiss-troop" data-troop="${key}" style="flex: 1; padding: 6px 10px; font-size: 0.85rem;" ${count === 0 ? 'disabled style="opacity:0.5"' : ''}>
                                        - Dispensar
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = subnavHTML + mainContentHTML;

    // --- Sub-Nav Tab Switching ---
    container.querySelectorAll('.quartel-tab-btn').forEach(btn => {
        btn.onclick = () => {
            currentQuartelTab = btn.getAttribute('data-tab');
            renderQuartel();
        };
    });

    // --- Tab 1: Tower March Execution ---
    container.querySelectorAll('.btn-march-tower').forEach(btn => {
        btn.onclick = () => {
            const floorNum = parseInt(btn.getAttribute('data-floor'));
            const floor = TOWER_FLOORS.find(f => f.floor === floorNum);
            if (!floor) return;

            // Coleta tropas disponíveis
            const deployment = {};
            let totalSent = 0;
            for (let t in state.army) {
                const count = state.army[t] || 0;
                if (count > 0) {
                    deployment[t] = count;
                    totalSent += count;
                }
            }

            if (totalSent === 0) {
                alert("Você não possui tropas disponíveis no quartel! Treine ao menos 1 guerreiro na aba 'Guarnição de Tropas' para apoiar o Herói.");
                return;
            }

            // Checagem de aviso tático amigável
            let warnMsg = "";
            if (floor.tacticalRequirement === 'ranged_or_magic') {
                const hasRanged = (deployment.archers || 0) > 0 || (deployment.mages || 0) > 0;
                if (!hasRanged && activeHero.class !== 'Arqueira' && activeHero.class !== 'Mago') {
                    warnMsg = "⚠️ ATENÇÃO: Os inimigos deste andar são VOADORES e você não está enviando Arqueiros ou Magos! Há 90% de chance de FALHA tática.\n\nDeseja marchar mesmo assim?";
                }
            } else if (floor.tacticalRequirement === 'tank_or_magic') {
                const hasTank = (deployment.colossus || 0) > 0 || (deployment.mages || 0) > 0;
                if (!hasTank && activeHero.class !== 'Cavaleiro' && activeHero.class !== 'Mago') {
                    warnMsg = "⚠️ ATENÇÃO: Os inimigos deste andar possuem CARAPAÇAS DE ROCHA e você não está enviando Colossos ou Magos! Há alta chance de ricochete e derrota.\n\nDeseja marchar mesmo assim?";
                }
            }

            if (warnMsg && !confirm(warnMsg)) {
                return;
            }

            const res = startExpedition(floorNum, deployment);
            if (res.success) {
                renderQuartel();
                updateResourceUI();
            } else {
                alert(res.reason);
            }
        };
    });

    // --- Tab 2: Hero Switching & Gold Recruitment ---
    container.querySelectorAll('.btn-switch-hero').forEach(btn => {
        btn.onclick = () => {
            const heroId = btn.getAttribute('data-hero');
            setActiveHero(heroId);
            renderQuartel();
            updateStatsUI(0, 0, 0, 0);
        };
    });

    container.querySelectorAll('.btn-recruit-hero').forEach(btn => {
        btn.onclick = () => {
            const heroId = btn.getAttribute('data-hero');
            const cost = getHeroUnlockCost(heroId);
            const tpl = HERO_TEMPLATES[heroId];
            if (confirm(`Deseja contratar ${tpl.name} (${tpl.class}) por 🪙 ${cost} de Ouro?`)) {
                const res = unlockHeroWithGold(heroId);
                if (res.success) {
                    gainXP(75, 'Campeão Contratado');
                    renderQuartel();
                    updateResourceUI();
                    showLevelUpNotification(`Novo Campeão Contratado: ${tpl.name}! 👑`);
                } else {
                    alert(res.reason);
                }
            }
        };
    });

    // Elden Ring Stat Upgrades (+)
    container.querySelectorAll('.btn-stat-up').forEach(btn => {
        btn.onclick = () => {
            const statKey = btn.getAttribute('data-stat');
            if (upgradeHeroStat(activeHero.id, statKey)) {
                renderQuartel();
            }
        };
    });

    // --- Tab 3: TBH Equipping & Unequipping ---
    container.querySelectorAll('.btn-equip-item').forEach(btn => {
        btn.onclick = () => {
            const uid = btn.getAttribute('data-uid');
            const res = equipItem(activeHero.id, uid);
            if (res.success) {
                renderQuartel();
                checkMissions();
            } else {
                alert(res.reason);
            }
        };
    });

    container.querySelectorAll('.btn-unequip-slot').forEach(btn => {
        btn.onclick = () => {
            const slot = btn.getAttribute('data-slot');
            const res = unequipItem(activeHero.id, slot);
            if (res.success) {
                renderQuartel();
            } else {
                alert(res.reason);
            }
        };
    });

    // --- Tab 4: Troop Training (+) and Dismissing (-) ---
    container.querySelectorAll('.btn-train-troop').forEach(btn => {
        btn.onclick = () => {
            const troopKey = btn.getAttribute('data-troop');
            const res = trainTroop(troopKey);
            if (res.success) {
                renderQuartel();
                updateResourceUI();
                checkMissions();
            } else {
                alert(res.reason);
            }
        };
    });

    container.querySelectorAll('.btn-dismiss-troop').forEach(btn => {
        btn.onclick = () => {
            const troopKey = btn.getAttribute('data-troop');
            const res = dismissTroop(troopKey);
            if (res.success) {
                renderQuartel();
                updateResourceUI();
            } else {
                alert(res.reason);
            }
        };
    });

    // --- Tab: D&D Talents Bindings ---
    container.querySelectorAll('.btn-unlock-talent').forEach(btn => {
        btn.onclick = () => {
            const talentId = btn.getAttribute('data-talent');
            const res = unlockHeroTalent(activeHero, talentId);
            if (res.success) {
                saveState();
                renderQuartel();
                const toast = document.createElement('div');
                toast.className = 'gm-toast';
                toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #27ae60; color: #fff; padding: 12px 24px; border-radius: 25px; font-weight: bold; z-index: 10000; box-shadow: 0 6px 20px rgba(0,0,0,0.25);';
                toast.textContent = `✨ Talento D&D Aprendido: ${res.talent.name}!`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            } else {
                alert(res.reason);
            }
        };
    });

    const btnResetTalents = container.querySelector('.btn-reset-talents');
    if (btnResetTalents) {
        btnResetTalents.onclick = () => {
            if (confirm(`Deseja redefinir todos os talentos de ${activeHero.name}? Os pontos investidos serão devolvidos.`)) {
                const refunded = resetHeroTalents(activeHero);
                saveState();
                renderQuartel();
                alert(`Talentos redefinidos com sucesso! ${refunded} ponto(s) devolvidos.`);
            }
        };
    }

    // --- Tab 1: Pixel Art March Animation Mount ---
    if (currentQuartelTab === 'tower' && state.activeExpedition) {
        setTimeout(() => {
            const canvas = document.getElementById('tower-pixel-art-canvas');
            if (canvas) {
                if (marchAnimationInstance) marchAnimationInstance.stop();
                marchAnimationInstance = renderPixelArtMarchAnimation(canvas);
            }
        }, 30);
    } else if (marchAnimationInstance) {
        marchAnimationInstance.stop();
        marchAnimationInstance = null;
    }
}


// --- Mercado: Casa da Moeda & Fundição Real de Ouro ---
export function renderMercado() {
    const container = document.getElementById('mercado-content-container');
    if (!container) return;
    const state = getState();
    const mercadoLevel = state.buildings.mercado || 0;

    if (mercadoLevel < 1) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: rgba(0,0,0,0.03); border: 2px dashed var(--parchment-border); border-radius: 12px; margin-top: 15px;">
                <span style="font-size: 3rem; display: block; margin-bottom: 12px;">🏪🔒</span>
                <h3 style="font-family: var(--font-heading); color: var(--wood-dark); margin-bottom: 8px;">Mercado Felino Ainda Não Construído</h3>
                <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 16px auto; font-size: 0.95rem; line-height: 1.5;">
                    Construa o <strong>Mercado (requer 🪵 400 Madeira e 🪨 100 Pedra)</strong> na Visão da Vila para liberar a <strong>Casa da Moeda Felina</strong> e as <strong>Rotas Comerciais de Ouro</strong>!
                </p>
                <div style="display: inline-block; background: rgba(212,175,55,0.15); border: 1px solid var(--gold); border-radius: 8px; padding: 8px 16px; font-size: 0.85rem; color: var(--wood-dark); font-weight: bold;">
                    🪙 Ouro é um tesouro nobre e raro: requer infraestrutura comercial para ser forjado!
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(212,175,55,0.14), rgba(39,174,96,0.08)); border: 1px solid var(--gold); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h3 style="font-family: var(--font-heading); color: var(--wood-dark); margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
                        🪙 Casa da Moeda Felina & Rotas Comerciais <span style="font-size: 0.8rem; background: var(--gold); color: #fff; padding: 2px 8px; border-radius: 10px;">Nível ${mercadoLevel}</span>
                    </h3>
                    <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary);">
                        Cunhe moedas fundindo ferro raro e carvão, ou envie caravanas com excedentes de madeira e lã para mercadores vizinhos.
                    </p>
                </div>
                <div style="text-align: right; background: rgba(255,255,255,0.6); padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06);">
                    <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; font-weight: bold;">TESOURO DA VILA</span>
                    <strong style="font-size: 1.25rem; color: var(--gold-hover);">🪙 ${Math.floor(state.resources.gold || 0)} Ouro</strong>
                </div>
            </div>
        </div>

        <div class="mercado-recipes-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${GOLD_MINT_RECIPES.map(rec => {
                const canLevel = mercadoLevel >= rec.minMercadoLevel;
                const canAfford = Object.keys(rec.cost).every(k => (state.resources[k] || 0) >= rec.cost[k]);
                
                const costBadges = Object.entries(rec.cost).map(([res, amt]) => {
                    const have = Math.floor(state.resources[res] || 0);
                    const ok = have >= amt;
                    const resIcons = { fish: '🐟 Peixe', wood: '🪵 Madeira', wool: '🧶 Lã', stone: '🪨 Pedra', coal: '⬛ Carvão', iron: '⛏️ Ferro' };
                    return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 0.82rem; font-weight: bold; background: ${ok ? 'rgba(39, 174, 96, 0.12)' : 'rgba(231, 76, 60, 0.12)'}; color: ${ok ? '#27ae60' : '#c0392b'}; border: 1px solid ${ok ? 'rgba(39,174,96,0.3)' : 'rgba(231,76,60,0.3)'};">
                        ${resIcons[res] || res}: ${amt} (${have})
                    </span>`;
                }).join(' ');

                return `
                    <div class="parchment-panel mercado-card" style="padding: 18px; border-radius: 12px; border: 1px solid var(--parchment-border); display: flex; flex-direction: column; justify-content: space-between; background: rgba(255,255,255,0.7); box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 2rem;">${rec.icon}</span>
                                    <div>
                                        <h4 style="font-family: var(--font-heading); color: var(--wood-dark); margin: 0; font-size: 1.05rem;">${rec.name}</h4>
                                        <small style="color: var(--text-secondary); font-size: 0.78rem;">Requer Mercado Nv. ${rec.minMercadoLevel}</small>
                                    </div>
                                </div>
                                <span style="background: rgba(212,175,55,0.25); color: var(--wood-dark); font-weight: bold; padding: 4px 10px; border-radius: 20px; font-size: 0.95rem; border: 1px solid var(--gold);">
                                    +${rec.goldGain} 🪙
                                </span>
                            </div>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 14px 0; line-height: 1.4;">${rec.desc}</p>
                            <div style="margin-bottom: 16px;">
                                <span style="font-size: 0.75rem; font-weight: bold; color: var(--wood-dark); display: block; margin-bottom: 6px; text-transform: uppercase;">Custos de Materiais:</span>
                                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                    ${costBadges}
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn primary-btn btn-mint-gold" data-recipe-id="${rec.id}" ${(!canLevel || !canAfford) ? 'disabled' : ''} style="width: 100%; padding: 10px; font-size: 0.95rem; font-weight: bold;">
                            ${!canLevel ? `🔒 Requer Mercado Nv. ${rec.minMercadoLevel}` : (canAfford ? `⚒️ Executar (+${rec.goldGain} 🪙)` : '⚠️ Recursos Insuficientes')}
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Bind mint buttons
    container.querySelectorAll('.btn-mint-gold').forEach(btn => {
        btn.onclick = () => {
            const rId = btn.getAttribute('data-recipe-id');
            const res = mintGold(rId);
            if (res.success) {
                updateResourceUI();
                renderMercado();
                const toast = document.createElement('div');
                toast.className = 'gm-toast';
                toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #27ae60; color: #fff; padding: 12px 24px; border-radius: 25px; font-weight: bold; z-index: 10000; box-shadow: 0 6px 20px rgba(0,0,0,0.25);';
                toast.textContent = `🪙 +${res.goldGain} Moedas de Ouro cunhadas com sucesso!`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            } else {
                alert(res.reason || "Não foi possível realizar esta operação.");
            }
        };
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('felineas_settings_changed', () => {
        if (document.body.classList.contains('in-game')) {
            try {
                updateUI();
                updateStatsUI();
            } catch(e) {}
        }
    });
}

