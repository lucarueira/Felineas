import { getState, saveState } from './state.js';

let gameInterval = null;

export function initGame() {
    const state = getState();
    
    // Setup tabs
    const tabVillage = document.getElementById('tab-village');
    const tabMap = document.getElementById('tab-map');
    const tabMissions = document.getElementById('tab-missions');
    const viewVillage = document.getElementById('village-view');
    const viewMap = document.getElementById('map-view');
    const viewMissions = document.getElementById('missions-view');

    function switchTab(activeTab, activeView) {
        document.querySelectorAll('.game-nav a').forEach(a => a.classList.remove('active'));
        activeTab.classList.add('active');
        viewVillage.style.display = 'none';
        viewMap.style.display = 'none';
        viewMissions.style.display = 'none';
        activeView.style.display = 'block';
    }

    if (tabVillage && tabMap && tabMissions) {
        tabVillage.onclick = (e) => { e.preventDefault(); switchTab(tabVillage, viewVillage); };
        tabMap.onclick = (e) => { e.preventDefault(); switchTab(tabMap, viewMap); };
        tabMissions.onclick = (e) => { e.preventDefault(); switchTab(tabMissions, viewMissions); };
    }

    // Set up allocators
    document.querySelectorAll('.btn-alloc').forEach(btn => {
        // Remove previous listeners to avoid duplicates on re-init
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            const role = newBtn.getAttribute('data-role');
            const action = newBtn.getAttribute('data-action');

            if (action === 'add' && state.pop.idle > 0) {
                state.pop.idle--;
                state.pop[role]++;
            } else if (action === 'sub' && state.pop[role] > 0) {
                state.pop[role]--;
                state.pop.idle++;
            }
            updateResourceUI();
            saveState(); // Save on worker allocation
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
    gameInterval = setInterval(() => {
        if (document.getElementById('game-dashboard').style.display === 'block' || document.getElementById('game-dashboard').style.display === 'grid') {
            const fishRate = state.pop.fish * Math.max(0.5, state.buildings.cais) * 0.5;
            const woodRate = state.pop.wood * Math.max(0.5, state.buildings.cabana) * 0.3;
            const woolRate = state.pop.wool * Math.max(0.5, state.buildings.arranhador) * 0.1;
            const mineRate = state.pop.mine * Math.max(0.5, state.buildings.mina) * 0.2;
            
            state.resources.fish += fishRate;
            state.resources.wood += woodRate;
            state.resources.wool += woolRate;
            state.resources.stone += mineRate;
            state.resources.coal += (mineRate * 0.5);
            state.resources.iron += (mineRate * 0.2);
            
            updateResourceUI();
        }
    }, 1000);

    // Save state every 10 seconds to Firestore
    setInterval(() => {
        saveState();
    }, 10000);

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
                state.pop.fish = 0;
                state.pop.wood = 0;
                state.pop.wool = 0;
                state.pop.mine = 0;
                state.pop.idle += totalWorking;
                
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
    
    document.getElementById('val-idle').textContent = state.pop.idle;
    document.getElementById('val-fish').textContent = state.pop.fish;
    document.getElementById('val-wood').textContent = state.pop.wood;
    document.getElementById('val-wool').textContent = state.pop.wool;
    document.getElementById('val-mine').textContent = state.pop.mine;
    document.getElementById('val-scouts').textContent = state.pop.scouts;
    
    const totalUsed = state.pop.max - state.pop.idle;
    document.getElementById('val-total-cats').textContent = totalUsed;
    document.getElementById('val-max-cats').textContent = state.pop.max;
    document.getElementById('pop-fill').style.width = `${(totalUsed / state.pop.max) * 100}%`;
}

function checkUnlocks() {
    const state = getState();
    if (state.buildings.cabana >= 2) document.getElementById('card-cais').classList.remove('hidden-card');
    if (state.buildings.cais >= 1) {
        document.getElementById('work-fish').style.display = 'flex';
        document.getElementById('work-wood').style.display = 'flex';
    }
    if (state.buildings.cais >= 2) document.getElementById('card-arranhador').classList.remove('hidden-card');
    if (state.buildings.arranhador >= 1) document.getElementById('work-wool').style.display = 'flex';
    if (state.buildings.cabana >= 3) document.getElementById('card-mina').classList.remove('hidden-card');
    if (state.buildings.mina >= 1) document.getElementById('work-mine').style.display = 'flex';
    if (state.buildings.cabana >= 4 && state.buildings.cais >= 3) document.getElementById('card-quartel').classList.remove('hidden-card');
    
    if (state.buildings.quartel >= 1 && state.pop.scouts === 0) {
        state.pop.scouts = 15;
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
