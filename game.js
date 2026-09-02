import { getState, saveState } from './state.js';

let gameInterval = null;

export function initGame() {
    const state = getState();
    
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

    function switchTab(activeTab, activeView) {
        document.querySelectorAll('.left-panel ul li a').forEach(a => a.classList.remove('active'));
        activeTab.classList.add('active');
        viewVillage.style.display = 'none';
        viewMap.style.display = 'none';
        viewMissions.style.display = 'none';
        if(viewStats) viewStats.style.display = 'none';
        if(viewPrefeitura) viewPrefeitura.style.display = 'none';
        if(viewQuartel) viewQuartel.style.display = 'none';
        if(viewMercado) viewMercado.style.display = 'none';
        activeView.style.display = 'block';
    }

    if (tabVillage && tabMap && tabMissions) {
        tabVillage.onclick = (e) => { e.preventDefault(); switchTab(tabVillage, viewVillage); };
        tabMap.onclick = (e) => { e.preventDefault(); switchTab(tabMap, viewMap); };
        tabMissions.onclick = (e) => { e.preventDefault(); switchTab(tabMissions, viewMissions); };
        if(tabStats) tabStats.onclick = (e) => { e.preventDefault(); switchTab(tabStats, viewStats); };
        if(tabPrefeitura) tabPrefeitura.onclick = (e) => { e.preventDefault(); switchTab(tabPrefeitura, viewPrefeitura); };
        if(tabQuartel) tabQuartel.onclick = (e) => { e.preventDefault(); switchTab(tabQuartel, viewQuartel); };
        if(tabMercado) tabMercado.onclick = (e) => { e.preventDefault(); switchTab(tabMercado, viewMercado); };
    }

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

                newBtn.disabled = true;
                newBtn.style.backgroundColor = 'var(--parchment-border)';
                
                const currentLevel = state.buildings[buildingKey];
                let timeLeft = 5 + (currentLevel * 10); 

                newBtn.innerHTML = `Construindo... <br><small>🕒 ${timeLeft}s</small>`;

                const timerInterval = setInterval(() => {
                    timeLeft--;
                    if (timeLeft > 0) {
                        newBtn.innerHTML = `Construindo... <br><small>🕒 ${timeLeft}s</small>`;
                    } else {
                        clearInterval(timerInterval);
                        
                        state.buildings[buildingKey]++;
                        const newLevel = state.buildings[buildingKey];
                        
                        if(buildingKey === 'cabana') {
                            state.pop.max += 5;
                            state.pop.idle += 5;
                            state.tempPop.max += 5;
                            state.tempPop.idle += 5;
                        }

                        const cardInfo = newBtn.closest('.building-info');
                        cardInfo.querySelector('.level').textContent = `Nível ${newLevel}`;
                        
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
                        saveState(); // Save after building completes
                    }
                }, 1000);
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
        if (document.getElementById('game-dashboard').style.display === 'block' || document.getElementById('game-dashboard').style.display === 'grid') {
            // Use committed population for generation, with a minimum 0.1 multiplier if building is level 0
            const fishRate = state.pop.fish * Math.max(0.1, state.buildings.cais) * 0.5;
            const woodRate = state.pop.wood * Math.max(0.1, state.buildings.cabana) * 0.3;
            const woolRate = state.pop.wool * Math.max(0.1, state.buildings.arranhador) * 0.1;
            const mineRate = state.pop.mine * Math.max(0.1, state.buildings.mina) * 0.2;
            const goldRate = state.pop.merchants * Math.max(0.1, state.buildings.mercado) * 0.2;
            
            state.resources.fish += fishRate;
            state.resources.wood += woodRate;
            state.resources.wool += woolRate;
            state.resources.stone += mineRate;
            state.resources.coal += (mineRate * 0.5);
            state.resources.iron += (mineRate * 0.2);
            state.resources.gold += goldRate;
            
            updateResourceUI();
            updateStatsUI(fishRate, woodRate, woolRate, mineRate, goldRate);
            
            // Autosave a cada 10 segundos
            autosaveCounter++;
            if (autosaveCounter >= 10) {
                saveState();
                autosaveCounter = 0;
            }
        }
    }, 1000);

    // Save state every 10 seconds to Firestore
    setInterval(() => {
        saveState();
    }, 10000);

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
        saveState();
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
                let totalWorking = state.pop.fish + state.pop.wood + state.pop.wool + state.pop.mine + (state.pop.merchants || 0);
                
                const clearedPop = {
                    max: state.pop.max,
                    idle: state.pop.idle + totalWorking,
                    fish: 0, wood: 0, wool: 0, mine: 0, scouts: state.pop.scouts, merchants: 0
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
    updateResourceUI();
}

export function stopGame() {
    if(gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

export function updateResourceUI() {
    const state = getState();
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
    document.getElementById('val-merchants').textContent = state.tempPop.merchants;
    document.getElementById('val-scouts').textContent = state.tempPop.scouts;
    
    const totalUsed = state.tempPop.max - state.tempPop.idle;
    document.getElementById('val-total-cats').textContent = totalUsed;
    document.getElementById('val-max-cats').textContent = state.tempPop.max;
    document.getElementById('pop-fill').style.width = `${(totalUsed / state.tempPop.max) * 100}%`;
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

    updateCardState('card-cais', state.buildings.cabana >= 2, state.buildings.cais >= 1);
    updateCardState('card-arranhador', state.buildings.cais >= 2, state.buildings.arranhador >= 1);
    updateCardState('card-mina', state.buildings.cabana >= 3, state.buildings.mina >= 1);
    updateCardState('card-mercado', state.buildings.cabana >= 4, state.buildings.mercado >= 1);
    updateCardState('card-quartel', state.buildings.cabana >= 4 && state.buildings.cais >= 3, state.buildings.quartel >= 1);
    
    // Prefeitura is always unlocked, but grey if level 0
    updateCardState('card-prefeitura', true, state.buildings.prefeitura >= 1);
    
    // Manage Left Panel Nav items
    const navPrefeitura = document.getElementById('nav-prefeitura');
    const navQuartel = document.getElementById('nav-quartel');
    const navMercado = document.getElementById('nav-mercado');
    
    if (navPrefeitura) navPrefeitura.style.display = state.buildings.prefeitura >= 1 ? 'block' : 'none';
    if (navQuartel) navQuartel.style.display = state.buildings.quartel >= 1 ? 'block' : 'none';
    if (navMercado) navMercado.style.display = state.buildings.mercado >= 1 ? 'block' : 'none';
    
    if (state.buildings.quartel >= 1 && state.pop.scouts === 0) {
        state.pop.scouts = 15;
        state.tempPop.scouts = 15;
    }
    checkMissions();
}

function renderMissions() {
    const state = getState();
    const container = document.getElementById('mission-container');
    container.innerHTML = '';
    let hasNotification = false;

    for (let key in state.missions) {
        const m = state.missions[key];
        const card = document.createElement('div');
        card.className = `mission-card ${m.done ? 'completed' : ''}`;
        
        let btnHTML = '';
        if (m.done) {
            btnHTML = `<span style="color:var(--success);">✔ Concluída</span>`;
        } else if (m.ready) {
            hasNotification = true;
            btnHTML = `<button class="btn primary-btn btn-claim" data-mission="${key}">Resgatar Ouro</button>`;
        } else {
            btnHTML = `<span style="color:var(--text-secondary);">Em andamento...</span>`;
        }

        card.innerHTML = `
            <div class="mission-info">
                <h4>${m.desc}</h4>
                <span class="mission-reward">🪙 ${m.reward} Ouro ${m.rewardDiamonds ? '| 💎 ' + m.rewardDiamonds : ''}</span>
            </div>
            <div class="mission-action">${btnHTML}</div>
        `;
        container.appendChild(card);
    }

    document.getElementById('mission-badge').style.display = hasNotification ? 'inline-block' : 'none';

    document.querySelectorAll('.btn-claim').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mKey = btn.getAttribute('data-mission');
            state.resources.gold += state.missions[mKey].reward;
            if (state.missions[mKey].rewardDiamonds) {
                state.resources.diamonds += state.missions[mKey].rewardDiamonds;
            }
            state.missions[mKey].done = true;
            state.missions[mKey].ready = false;
            renderMissions();
            updateResourceUI();
            saveState(); // Save after claiming
        });
    });
}

function checkMissions() {
    const state = getState();
    let changed = false;
    if (!state.missions.cabanaLvl2.done && state.buildings.cabana >= 2 && !state.missions.cabanaLvl2.ready) {
        state.missions.cabanaLvl2.ready = true; changed = true;
    }
    if (!state.missions.caisLvl1.done && state.buildings.cais >= 1 && !state.missions.caisLvl1.ready) {
        state.missions.caisLvl1.ready = true; changed = true;
    }
    if (!state.missions.quartelLvl1.done && state.buildings.quartel >= 1 && !state.missions.quartelLvl1.ready) {
        state.missions.quartelLvl1.ready = true; changed = true;
    }
    if(changed) renderMissions();
}

export function updateStatsUI(fish, wood, wool, mine, gold) {
    const elFish = document.getElementById('stat-fish');
    const elWood = document.getElementById('stat-wood');
    const elWool = document.getElementById('stat-wool');
    const elMine = document.getElementById('stat-mine');
    const elGold = document.getElementById('stat-gold');
    
    if (elFish) elFish.textContent = `+${fish.toFixed(1)}`;
    if (elWood) elWood.textContent = `+${wood.toFixed(1)}`;
    if (elWool) elWool.textContent = `+${wool.toFixed(1)}`;
    if (elMine) elMine.textContent = `+${mine.toFixed(1)}`;
    if (elGold) elGold.textContent = `+${gold.toFixed(1)}`;
}
