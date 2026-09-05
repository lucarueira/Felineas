import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import {
    getGlobalSettings, loadGlobalSettings, saveGlobalSettings,
    loadCustomItems, registerCustomItem, updateCustomItem, toggleItemActive, deleteCustomItem,
    getAllAccounts, banAccount, unbanAccount, giftAccount, giftDiamonds, createTestAccount,
    createAccountByGM, createCustomVillage, switchActiveVillage, updateAccountResources,
    getAccountFullData, updateAccountFull, giftItemToAccount, resetAccountPassword, setAccountRole, deleteAccountPermanently,
    updatePlayerItem, removePlayerItem,
    addGMLog, getGMLogs, clearGMLogs,
    ITEM_DATABASE, BASE_ITEM_DATABASE
} from "./state.js";
import { initGame } from "./game.js";

let currentGMUser = null;
let currentAccountsList = [];
let activeBanTargetUid = null;
let activeGiftTargetUid = null;
let activeEditResUid = null;
let activeInspectUid = null;
let activeGiftItemUid = null;
let activeResetPassUid = null;
let activePlayerInvUid = null;

const RATE_RESOURCES = ['fish', 'wood', 'wool', 'stone', 'coal', 'iron'];

export async function initGM(user) {
    currentGMUser = user;

    // Set GM user email / display
    const gmNameEl = document.getElementById('gm-user-name');
    const gmEmailEl = document.getElementById('gm-user-email');
    if (gmNameEl) gmNameEl.textContent = user.displayName || 'GM Supremo';
    if (gmEmailEl) gmEmailEl.textContent = user.email || 'gm@felineas.com';

    // Load configurations from Firestore
    await loadGlobalSettings();
    await loadCustomItems();

    // Bind navigation tabs
    setupGMTabs();

    // Setup switch to village button
    const btnToVillage = document.getElementById('btn-gm-to-village');
    if (btnToVillage) {
        btnToVillage.onclick = () => {
            const gmDashboard = document.getElementById('gm-dashboard');
            const gameDashboard = document.getElementById('game-dashboard');
            if (gmDashboard) gmDashboard.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'grid';
            document.body.classList.remove('in-gm');
            document.body.classList.add('in-game');
            initGame();
        };
    }

    // Setup overview & quick actions
    await refreshGMOverview();

    // Setup farm & xp rate controls (individual and global with min 0.01x)
    setupGMRateControls();

    // Setup timing controls (construction, fatigue/rest)
    setupGMTimingControls();

    // Setup accounts & villages management
    await loadAndRenderAccounts();
    setupGMAccountModals();
    setupGMVillageCreationModal();

    // Setup item creator and catalog
    setupGMItemManagement();

    // Setup news & broadcast with real-time preview
    setupGMNewsAndBroadcast();

    // Setup logs & audit feed
    setupGMLogs();

    // Setup statistics dashboard
    setupGMStats();

    // Setup GM Banner Return button
    const bannerReturnBtn = document.getElementById('btn-gm-banner-return');
    if (bannerReturnBtn) {
        bannerReturnBtn.onclick = () => {
            const gmDashboard = document.getElementById('gm-dashboard');
            const gameDashboard = document.getElementById('game-dashboard');
            const banner = document.getElementById('gm-testing-banner');

            if (banner) banner.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'none';
            if (gmDashboard) gmDashboard.style.display = 'flex';
            document.body.classList.remove('in-game');
            document.body.classList.add('in-gm');
            loadAndRenderAccounts();
        };
    }

    // GM Logout (Robust return to login screen regardless of auth state)
    const gmLogoutBtn = document.getElementById('btn-gm-logout');
    if (gmLogoutBtn) {
        gmLogoutBtn.onclick = async () => {
            gmLogoutBtn.disabled = true;
            gmLogoutBtn.textContent = 'Saindo...';
            try {
                if (auth && auth.currentUser) {
                    await signOut(auth);
                }
            } catch(e) {
                console.warn("Aviso ao deslogar do Firebase Auth:", e);
            }
            // Explicitamente reseta interface e memória para a tela de login
            const gmDashboard = document.getElementById('gm-dashboard');
            const gameDashboard = document.getElementById('game-dashboard');
            const loginScreen = document.getElementById('login-screen');
            const topNav = document.querySelector('.top-nav');
            const leftPanel = document.querySelector('.left-panel');
            const testingBanner = document.getElementById('gm-testing-banner');

            if (gmDashboard) gmDashboard.style.display = 'none';
            if (gameDashboard) gameDashboard.style.display = 'none';
            if (testingBanner) testingBanner.style.display = 'none';
            document.body.classList.remove('in-game', 'in-gm');
            if (loginScreen) loginScreen.style.display = 'block';
            if (topNav) topNav.style.display = 'flex';
            if (leftPanel) leftPanel.style.display = 'block';

            gmLogoutBtn.disabled = false;
            gmLogoutBtn.textContent = '🚪 Sair do Painel';
        };
    }

    // Refresh Data button
    const gmRefreshBtn = document.getElementById('btn-gm-refresh');
    if (gmRefreshBtn) {
        gmRefreshBtn.onclick = async () => {
            const orig = gmRefreshBtn.innerHTML;
            gmRefreshBtn.innerHTML = '⏳ Atualizando...';
            await loadGlobalSettings();
            await loadCustomItems();
            await refreshGMOverview();
            await loadAndRenderAccounts();
            renderGMCatalog();
            renderGMLogsList();
            refreshGMStats();
            gmRefreshBtn.innerHTML = '✅ Atualizado!';
            setTimeout(() => { gmRefreshBtn.innerHTML = orig; }, 1200);
        };
    }
}

// --- Navigation Tabs ---
function setupGMTabs() {
    const tabButtons = document.querySelectorAll('.gm-nav-btn');
    const tabViews = document.querySelectorAll('.gm-tab-view');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-gm-tab');
            tabButtons.forEach(b => b.classList.remove('active'));
            tabViews.forEach(v => v.style.display = 'none');

            btn.classList.add('active');
            const targetView = document.getElementById(`gm-view-${targetTab}`);
            if (targetView) targetView.style.display = 'block';

            // Refresh tab-specific data if needed
            if (targetTab === 'overview') refreshGMOverview();
            if (targetTab === 'rates') syncRateInputs();
            if (targetTab === 'timings') syncTimingInputs();
            if (targetTab === 'accounts') loadAndRenderAccounts();
            if (targetTab === 'items') renderGMCatalog();
            if (targetTab === 'news') syncNewsPreview();
            if (targetTab === 'logs') renderGMLogsList();
            if (targetTab === 'stats') refreshGMStats();
        });
    });
}

// --- Overview Tab ---
async function refreshGMOverview() {
    const settings = getGlobalSettings();
    const accounts = await getAllAccounts();
    currentAccountsList = accounts;

    const totalAccounts = accounts.length;
    const bannedAccounts = accounts.filter(a => a.isBanned).length;
    const activeAccounts = totalAccounts - bannedAccounts;

    const elTotalAcc = document.getElementById('gm-metric-total-acc');
    const elActiveAcc = document.getElementById('gm-metric-active-acc');
    const elBannedAcc = document.getElementById('gm-metric-banned-acc');
    const elFarmMult = document.getElementById('gm-metric-farm-mult');
    const elXpMult = document.getElementById('gm-metric-xp-mult');
    const elTotalItems = document.getElementById('gm-metric-total-items');
    const elBroadcastStatus = document.getElementById('gm-metric-broadcast-status');

    if (elTotalAcc) elTotalAcc.textContent = totalAccounts;
    if (elActiveAcc) elActiveAcc.textContent = activeAccounts;
    if (elBannedAcc) elBannedAcc.textContent = bannedAccounts;
    
    // Contagem de bônus individuais ativos e status global do farm
    const rates = settings.resourceRates || {};
    const activeBoostsCount = RATE_RESOURCES.filter(r => rates[r]?.active).length;
    const isFarmActive = settings.farmBonusActive !== false;
    if (elFarmMult) {
        if (!isFarmActive) {
            elFarmMult.innerHTML = '<span style="color:#e74c3c; font-weight:bold; font-size: 0.92rem;">⚪ Desativado (1.0x)</span>';
        } else if (activeBoostsCount > 0) {
            elFarmMult.innerHTML = `<span style="color:#2ecc71;">${activeBoostsCount} Ativos (${settings.farmMultiplier || 1.0}x)</span>`;
        } else {
            elFarmMult.textContent = `${settings.farmMultiplier || 1.0}x`;
        }
    }
    if (elXpMult) elXpMult.textContent = `${settings.xpMultiplier || 1.0}x`;
    if (elTotalItems) elTotalItems.textContent = ITEM_DATABASE.length;
    if (elBroadcastStatus) {
        if (settings.broadcast && settings.broadcast.active) {
            elBroadcastStatus.innerHTML = '<span style="color:#2ecc71;">● Ativo</span>';
        } else {
            elBroadcastStatus.innerHTML = '<span style="color:#95a5a6;">○ Inativo</span>';
        }
    }

    // Quick Event Buttons on Overview
    const btnQuickXp2 = document.getElementById('btn-quick-xp-2x');
    const btnQuickFarm3 = document.getElementById('btn-quick-farm-3x');
    const btnQuickResetRates = document.getElementById('btn-quick-reset-rates');
    const btnQuickDeactivateFarm = document.getElementById('btn-quick-deactivate-farm');

    if (btnQuickDeactivateFarm) {
        btnQuickDeactivateFarm.textContent = isFarmActive ? '⏹️ Desativar Bônus de Farm' : '⚡ Ativar Bônus de Farm';
        btnQuickDeactivateFarm.onclick = async () => {
            const current = getGlobalSettings();
            const willDeactivate = current.farmBonusActive !== false;
            await saveGlobalSettings({
                farmBonusActive: !willDeactivate,
                farmMultiplier: willDeactivate ? 1.0 : (current.farmMultiplier || 1.0)
            });
            await addGMLog('rates', willDeactivate ? 'Bônus Farm Desativado' : 'Bônus Farm Reativado',
                willDeactivate ? 'GM desativou bônus de farm global no Overview' : 'GM ativou bônus de farm global no Overview'
            );
            syncRateInputs();
            refreshGMOverview();
            showGMToast(willDeactivate ? "⏹️ Bônus de farm DESATIVADO para todas as contas!" : "⚡ Bônus de farm ATIVADO!");
        };
    }

    if (btnQuickXp2) {
        btnQuickXp2.onclick = async () => {
            await saveGlobalSettings({ xpMultiplier: 2.0 });
            syncRateInputs();
            refreshGMOverview();
            showGMToast("🎉 Evento de XP 2x ativado para todo o reino!");
        };
    }

    if (btnQuickFarm3) {
        btnQuickFarm3.onclick = async () => {
            await saveGlobalSettings({ farmMultiplier: 3.0 });
            syncRateInputs();
            refreshGMOverview();
            showGMToast("🌾 Evento de Farm 3x ativado para todo o reino!");
        };
    }

    // Individual quick buttons on overview (Peixes 3x, Madeira 3x, Lã 3x, Ferro 5x)
    document.querySelectorAll('[data-quick-res]').forEach(btn => {
        btn.onclick = async () => {
            const res = btn.getAttribute('data-quick-res');
            const currentSettings = getGlobalSettings();
            const currentRates = { ...(currentSettings.resourceRates || {}) };
            const mult = res === 'iron' ? 5.0 : 3.0;
            currentRates[res] = {
                ...(currentRates[res] || {}),
                active: true,
                multiplier: mult
            };
            await saveGlobalSettings({ resourceRates: currentRates });
            syncRateInputs();
            refreshGMOverview();
            showGMToast(`⚡ Bônus de ${mult}x ativado para ${currentRates[res].name || res}!`);
        };
    });

    if (btnQuickResetRates) {
        btnQuickResetRates.onclick = async () => {
            const resetRates = {};
            RATE_RESOURCES.forEach(r => {
                resetRates[r] = { active: false, multiplier: 1.0 };
            });
            await saveGlobalSettings({
                farmMultiplier: 1.0,
                xpMultiplier: 1.0,
                resourceRates: resetRates,
                resourceMultipliers: { fish: 1.0, wood: 1.0, wool: 1.0, stone: 1.0, coal: 1.0, iron: 1.0, mine: 1.0 }
            });
            syncRateInputs();
            refreshGMOverview();
            showGMToast("⚖️ Todas as taxas foram normalizadas para 1.0x (Padrão).");
        };
    }
}

function formatMultiplierDisplay(num) {
    const n = Number(num);
    if (isNaN(n)) return '1.0x';
    if (n < 1) return `${n.toFixed(2)}x`;
    return `${n.toFixed(1)}x`;
}

// --- Rate Controls Tab (Controle Separado por Recurso com mínimo 0.01x) ---
function setupGMRateControls() {
    syncRateInputs();

    // Base Global Farm & XP Sliders
    const farmRange = document.getElementById('gm-farm-slider');
    const farmValText = document.getElementById('gm-farm-val');
    const xpRange = document.getElementById('gm-xp-slider');
    const xpValText = document.getElementById('gm-xp-val');

    if (farmRange && farmValText) {
        farmRange.oninput = () => { farmValText.textContent = formatMultiplierDisplay(farmRange.value); };
    }
    if (xpRange && xpValText) {
        xpRange.oninput = () => { xpValText.textContent = formatMultiplierDisplay(xpRange.value); };
    }

    // Presets for Base Farm & XP
    document.querySelectorAll('.gm-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-preset-type');
            const val = parseFloat(btn.getAttribute('data-preset-val'));
            if (type === 'farm' && farmRange && farmValText) {
                farmRange.value = val;
                farmValText.textContent = formatMultiplierDisplay(val);
            } else if (type === 'xp' && xpRange && xpValText) {
                xpRange.value = val;
                xpValText.textContent = formatMultiplierDisplay(val);
            }
        });
    });

    // Botões de Desativação e Ativação Rápida do Bônus de Farm
    const btnDeactivateFarm = document.getElementById('btn-deactivate-farm-bonus');
    const btnActivateFarm = document.getElementById('btn-activate-farm-bonus');
    const btnToggleGlobalFarm = document.getElementById('btn-toggle-global-farm');

    if (btnDeactivateFarm) {
        btnDeactivateFarm.onclick = async () => {
            await saveGlobalSettings({ farmBonusActive: false, farmMultiplier: 1.0 });
            await addGMLog('rates', 'Bônus Farm Desativado', 'GM desativou o bônus global de farm para todas as contas (fixado em 1.0x / 100%).');
            syncRateInputs();
            refreshGMOverview();
            showGMToast("⏹️ Bônus global de farm DESATIVADO com sucesso!");
        };
    }

    if (btnActivateFarm) {
        btnActivateFarm.onclick = async () => {
            const val = parseFloat(farmRange?.value || '1.0');
            await saveGlobalSettings({ farmBonusActive: true, farmMultiplier: val });
            await addGMLog('rates', 'Bônus Farm Ativado', `GM ativou o bônus de farm em ${val.toFixed(1)}x.`);
            syncRateInputs();
            refreshGMOverview();
            showGMToast(`⚡ Bônus global de farm ATIVADO em ${val.toFixed(1)}x!`);
        };
    }

    if (btnToggleGlobalFarm) {
        btnToggleGlobalFarm.onclick = async () => {
            const settings = getGlobalSettings();
            const willActivate = settings.farmBonusActive === false;
            const val = parseFloat(farmRange?.value || '1.0');
            await saveGlobalSettings({ farmBonusActive: willActivate, farmMultiplier: willActivate ? val : 1.0 });
            await addGMLog('rates', willActivate ? 'Bônus Farm Ativado' : 'Bônus Farm Desativado',
                willActivate ? `Bônus reativado em ${val.toFixed(1)}x` : 'Bônus de farm desligado para todas as contas'
            );
            syncRateInputs();
            refreshGMOverview();
            showGMToast(willActivate ? `⚡ Bônus global de farm ATIVADO em ${val.toFixed(1)}x!` : "⏹️ Bônus global de farm DESATIVADO.");
        };
    }

    // Configuração dos Controles Individuais por Recurso
    RATE_RESOURCES.forEach(res => {
        const slider = document.getElementById(`gm-slider-${res}`);
        const disp = document.getElementById(`gm-disp-${res}`);
        const toggleBtn = document.getElementById(`btn-toggle-${res}`);
        const saveBtn = document.getElementById(`btn-save-${res}`);

        // Slider input change
        if (slider && disp) {
            slider.oninput = () => {
                disp.textContent = formatMultiplierDisplay(slider.value);
            };
        }

        // Quick Preset Chips for this resource
        document.querySelectorAll(`.gm-chip-btn[data-res="${res}"]`).forEach(chip => {
            chip.onclick = () => {
                const val = parseFloat(chip.getAttribute('data-val'));
                if (slider && disp) {
                    slider.value = val;
                    disp.textContent = formatMultiplierDisplay(val);
                }
            };
        });

        // Individual Toggle Button (Ativar / Desativar Separadamente!)
        if (toggleBtn) {
            toggleBtn.onclick = async () => {
                const settings = getGlobalSettings();
                const currentRates = { ...(settings.resourceRates || {}) };
                const resObj = currentRates[res] || { active: false, multiplier: 2.0 };
                const willActivate = !resObj.active;
                const newMult = parseFloat(slider?.value || resObj.multiplier || 2.0);

                currentRates[res] = {
                    ...resObj,
                    active: willActivate,
                    multiplier: newMult
                };

                toggleBtn.disabled = true;
                toggleBtn.textContent = willActivate ? 'Ativando...' : 'Desativando...';

                try {
                    await saveGlobalSettings({ resourceRates: currentRates });
                    await addGMLog('rates', willActivate ? 'Bônus Ativado' : 'Bônus Desativado', 
                        `${resObj.name || res}: ${formatMultiplierDisplay(newMult)}`
                    );
                    syncRateInputs();
                    refreshGMOverview();
                    showGMToast(willActivate 
                        ? `🟢 Bônus de ${resObj.name || res} ATIVADO em ${formatMultiplierDisplay(newMult)}!` 
                        : `⚪ Bônus de ${resObj.name || res} desativado.`
                    );
                } catch(e) {
                    alert("Erro ao alternar bônus: " + e.message);
                } finally {
                    toggleBtn.disabled = false;
                }
            };
        }

        // Individual Save Button
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const settings = getGlobalSettings();
                const currentRates = { ...(settings.resourceRates || {}) };
                const resObj = currentRates[res] || { active: false, multiplier: 2.0 };
                const newMult = parseFloat(slider?.value || resObj.multiplier || 2.0);

                currentRates[res] = {
                    ...resObj,
                    multiplier: newMult
                };

                saveBtn.disabled = true;
                saveBtn.textContent = 'Salvando...';

                try {
                    await saveGlobalSettings({ resourceRates: currentRates });
                    await addGMLog('rates', 'Taxa Salva', `${resObj.name || res}: ${formatMultiplierDisplay(newMult)}`);
                    syncRateInputs();
                    showGMToast(`💾 Taxa de ${resObj.name || res} salva em ${formatMultiplierDisplay(newMult)}!`);
                } catch(e) {
                    alert("Erro ao salvar taxa: " + e.message);
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Salvar';
                }
            };
        }
    });

    // Batch Actions: Ativar Todos, Desativar Todos, Resetar
    const btnBatchActivateAll = document.getElementById('btn-batch-activate-all');
    const btnBatchDeactivateAll = document.getElementById('btn-batch-deactivate-all');
    const btnBatchResetAll = document.getElementById('btn-batch-reset-all');

    if (btnBatchActivateAll) {
        btnBatchActivateAll.onclick = async () => {
            const settings = getGlobalSettings();
            const currentRates = { ...(settings.resourceRates || {}) };
            RATE_RESOURCES.forEach(r => {
                const slider = document.getElementById(`gm-slider-${r}`);
                const mult = parseFloat(slider?.value || currentRates[r]?.multiplier || 2.0);
                currentRates[r] = {
                    ...(currentRates[r] || {}),
                    active: true,
                    multiplier: mult
                };
            });
            await saveGlobalSettings({ resourceRates: currentRates });
            syncRateInputs();
            refreshGMOverview();
            showGMToast("⚡ Todos os bônus de farm foram ATIVADOS!");
        };
    }

    if (btnBatchDeactivateAll) {
        btnBatchDeactivateAll.onclick = async () => {
            const settings = getGlobalSettings();
            const currentRates = { ...(settings.resourceRates || {}) };
            RATE_RESOURCES.forEach(r => {
                if (currentRates[r]) currentRates[r].active = false;
            });
            await saveGlobalSettings({ farmBonusActive: false, farmMultiplier: 1.0, resourceRates: currentRates });
            await addGMLog('rates', 'Desativação Total', 'GM desativou todos os bônus de farm (geral e individuais) para todas as contas.');
            syncRateInputs();
            refreshGMOverview();
            showGMToast("⏹️ Todos os bônus de farm foram desativados para todas as contas!");
        };
    }

    if (btnBatchResetAll) {
        btnBatchResetAll.onclick = async () => {
            const resetRates = {};
            RATE_RESOURCES.forEach(r => {
                resetRates[r] = { active: false, multiplier: 1.0 };
            });
            await saveGlobalSettings({
                farmMultiplier: 1.0,
                farmBonusActive: true,
                resourceRates: resetRates
            });
            syncRateInputs();
            refreshGMOverview();
            showGMToast("⚖️ Todos os recursos foram resetados para 1.0x (Padrão).");
        };
    }

    // Global Save Button (Salva Base Farm, XP e todas as taxas separadas)
    const btnSaveRates = document.getElementById('btn-save-rates');
    if (btnSaveRates) {
        btnSaveRates.onclick = async () => {
            btnSaveRates.disabled = true;
            btnSaveRates.textContent = 'Salvando Taxas...';
            try {
                const settings = getGlobalSettings();
                const currentRates = { ...(settings.resourceRates || {}) };
                RATE_RESOURCES.forEach(r => {
                    const slider = document.getElementById(`gm-slider-${r}`);
                    if (slider && currentRates[r]) {
                        currentRates[r].multiplier = parseFloat(slider.value);
                    }
                });

                const newSettings = {
                    farmMultiplier: parseFloat(farmRange?.value || 1.0),
                    xpMultiplier: parseFloat(xpRange?.value || 1.0),
                    resourceRates: currentRates
                };
                await saveGlobalSettings(newSettings);
                syncRateInputs();
                refreshGMOverview();
                showGMToast("✨ Todas as taxas e bônus foram salvos e aplicados em tempo real!");
            } catch(e) {
                alert("Erro ao salvar taxas: " + e.message);
            } finally {
                btnSaveRates.disabled = false;
                btnSaveRates.textContent = '💾 Salvar e Aplicar Todas as Taxas Globalmente';
            }
        };
    }
}

function syncRateInputs() {
    const settings = getGlobalSettings();
    const farmRange = document.getElementById('gm-farm-slider');
    const farmValText = document.getElementById('gm-farm-val');
    const xpRange = document.getElementById('gm-xp-slider');
    const xpValText = document.getElementById('gm-xp-val');

    const farmMult = settings.farmMultiplier || 1.0;
    const xpMult = settings.xpMultiplier || 1.0;
    const rates = settings.resourceRates || {};

    if (farmRange) farmRange.value = farmMult;
    if (farmValText) farmValText.textContent = formatMultiplierDisplay(farmMult);
    if (xpRange) xpRange.value = xpMult;
    if (xpValText) xpValText.textContent = formatMultiplierDisplay(xpMult);

    // Status do Bônus Geral de Farm
    const isFarmActive = settings.farmBonusActive !== false;
    const farmStatusBadge = document.getElementById('gm-farm-bonus-status-badge');
    const btnToggleGlobalFarmEl = document.getElementById('btn-toggle-global-farm');
    const btnDeactivateFarmEl = document.getElementById('btn-deactivate-farm-bonus');
    const btnActivateFarmEl = document.getElementById('btn-activate-farm-bonus');

    if (farmStatusBadge) {
        if (!isFarmActive) {
            farmStatusBadge.className = 'gm-res-badge inactive';
            farmStatusBadge.innerHTML = '⚪ Desativado (1.0x Padrão)';
            farmStatusBadge.style.color = '#c0392b';
            farmStatusBadge.style.borderColor = '#c0392b';
        } else {
            farmStatusBadge.className = 'gm-res-badge active';
            farmStatusBadge.innerHTML = `🟢 Bônus Ativo (${formatMultiplierDisplay(farmMult)})`;
            farmStatusBadge.style.color = '#27ae60';
            farmStatusBadge.style.borderColor = '#27ae60';
        }
    }

    if (btnToggleGlobalFarmEl) {
        if (isFarmActive) {
            btnToggleGlobalFarmEl.className = 'btn gm-res-toggle-btn btn-deactivate';
            btnToggleGlobalFarmEl.innerHTML = '⏹️ Desativar Bônus de Farm';
        } else {
            btnToggleGlobalFarmEl.className = 'btn gm-res-toggle-btn btn-activate';
            btnToggleGlobalFarmEl.innerHTML = '⚡ Ativar Bônus de Farm';
        }
    }

    if (btnDeactivateFarmEl) {
        btnDeactivateFarmEl.style.opacity = isFarmActive ? '1' : '0.5';
        btnDeactivateFarmEl.disabled = !isFarmActive;
    }
    if (btnActivateFarmEl) {
        btnActivateFarmEl.style.opacity = isFarmActive ? '0.6' : '1';
    }

    // Sincroniza cada card individual de recurso
    RATE_RESOURCES.forEach(res => {
        const slider = document.getElementById(`gm-slider-${res}`);
        const disp = document.getElementById(`gm-disp-${res}`);
        const badge = document.getElementById(`gm-badge-${res}`);
        const toggleBtn = document.getElementById(`btn-toggle-${res}`);
        const card = document.getElementById(`card-rate-${res}`);

        const resData = rates[res] || { active: false, multiplier: 2.0 };
        const mult = Number(resData.multiplier) || 1.0;
        const isActive = !!resData.active;

        if (slider) slider.value = mult;
        if (disp) disp.textContent = formatMultiplierDisplay(mult);

        if (badge) {
            if (isActive) {
                badge.className = 'gm-res-badge active';
                badge.innerHTML = `⚡ ${formatMultiplierDisplay(mult)} ATIVO`;
            } else {
                badge.className = 'gm-res-badge inactive';
                badge.innerHTML = `⚪ Inativo (${formatMultiplierDisplay(mult)})`;
            }
        }

        if (toggleBtn) {
            if (isActive) {
                toggleBtn.className = 'btn gm-res-toggle-btn btn-deactivate';
                toggleBtn.innerHTML = '🔴 Desativar Bônus';
            } else {
                toggleBtn.className = 'btn gm-res-toggle-btn btn-activate';
                toggleBtn.innerHTML = '🟢 Ativar Bônus';
            }
        }

        if (card) {
            card.classList.toggle('rate-card-active', isActive);
        }
    });
}

// --- Timing & Rules Controls Tab ---
function setupGMTimingControls() {
    syncTimingInputs();

    const buildSlider = document.getElementById('gm-timing-build-slider');
    const buildDisp = document.getElementById('gm-timing-build-val');
    const fatigueSlider = document.getElementById('gm-timing-fatigue-slider');
    const fatigueDisp = document.getElementById('gm-timing-fatigue-val');

    if (buildSlider && buildDisp) {
        buildSlider.oninput = () => {
            buildDisp.textContent = formatMultiplierDisplay(buildSlider.value);
        };
    }

    if (fatigueSlider && fatigueDisp) {
        fatigueSlider.oninput = () => {
            fatigueDisp.textContent = formatMultiplierDisplay(fatigueSlider.value);
        };
    }

    // Presets for build time multiplier
    document.querySelectorAll('.gm-preset-btn[data-preset-type="build-time"]').forEach(btn => {
        btn.onclick = () => {
            const val = parseFloat(btn.getAttribute('data-preset-val'));
            if (buildSlider && buildDisp) {
                buildSlider.value = val;
                buildDisp.textContent = formatMultiplierDisplay(val);
            }
        };
    });

    // Save Timings Button (Salva Edifícios, Tropas e Fadiga Separadamente)
    const btnSaveTimings = document.getElementById('btn-save-timings');
    if (btnSaveTimings) {
        btnSaveTimings.onclick = async () => {
            btnSaveTimings.disabled = true;
            btnSaveTimings.textContent = 'Salvando Regras...';
            try {
                const buildMult = parseFloat(buildSlider?.value || 1.0);
                const fatigueMult = parseFloat(fatigueSlider?.value || 1.0);
                const instantBuild = !!document.getElementById('gm-toggle-instant-build')?.checked;
                const instantTrain = !!document.getElementById('gm-toggle-instant-train')?.checked;
                const noFatigue = !!document.getElementById('gm-toggle-no-fatigue')?.checked;

                // 7 Edifícios
                const buildingTimes = {
                    cabana: Math.max(0, parseInt(document.getElementById('gm-time-bldg-cabana')?.value || '15', 10)),
                    cais: Math.max(0, parseInt(document.getElementById('gm-time-bldg-cais')?.value || '20', 10)),
                    arranhador: Math.max(0, parseInt(document.getElementById('gm-time-bldg-arranhador')?.value || '25', 10)),
                    mina: Math.max(0, parseInt(document.getElementById('gm-time-bldg-mina')?.value || '35', 10)),
                    quartel: Math.max(0, parseInt(document.getElementById('gm-time-bldg-quartel')?.value || '40', 10)),
                    prefeitura: Math.max(0, parseInt(document.getElementById('gm-time-bldg-prefeitura')?.value || '60', 10)),
                    mercado: Math.max(0, parseInt(document.getElementById('gm-time-bldg-mercado')?.value || '45', 10))
                };

                // 5 Tropas
                const troopTimes = {
                    scouts: Math.max(0, parseInt(document.getElementById('gm-time-troop-scouts')?.value || '5', 10)),
                    archers: Math.max(0, parseInt(document.getElementById('gm-time-troop-archers')?.value || '10', 10)),
                    colossus: Math.max(0, parseInt(document.getElementById('gm-time-troop-colossus')?.value || '20', 10)),
                    mages: Math.max(0, parseInt(document.getElementById('gm-time-troop-mages')?.value || '25', 10)),
                    rogues: Math.max(0, parseInt(document.getElementById('gm-time-troop-rogues')?.value || '15', 10))
                };

                // Fadiga Separada
                const victorySecs = Math.max(0, parseInt(document.getElementById('gm-input-victory-rest')?.value || '20', 10));
                const defeatSecs = Math.max(0, parseInt(document.getElementById('gm-input-defeat-rest')?.value || '15', 10));
                const fatigueTimes = {
                    army: Math.max(0, parseInt(document.getElementById('gm-time-fatigue-army')?.value || '20', 10)),
                    hero_sword: Math.max(0, parseInt(document.getElementById('gm-time-fatigue-hero-sword')?.value || '20', 10)),
                    hero_bow: Math.max(0, parseInt(document.getElementById('gm-time-fatigue-hero-bow')?.value || '20', 10)),
                    hero_mage: Math.max(0, parseInt(document.getElementById('gm-time-fatigue-hero-mage')?.value || '25', 10))
                };

                const timeSettings = {
                    constructionMultiplier: buildMult,
                    instantConstruction: instantBuild,
                    buildingTimes,
                    instantTraining: instantTrain,
                    troopTimes,
                    fatigueMultiplier: fatigueMult,
                    noFatigue: noFatigue,
                    victoryRestSeconds: victorySecs,
                    defeatRestSeconds: defeatSecs,
                    fatigueTimes
                };

                await saveGlobalSettings({ timeSettings });
                await addGMLog('timing', 'Regras de Tempo Atualizadas', 
                    `Configurados tempos individuais de 7 edifícios, 5 tropas e fadiga de heróis/exército.`
                );
                showGMToast("⏱️ Todos os tempos individuais e regras foram salvos globalmente!");
            } catch(e) {
                alert("Erro ao salvar regras de tempo: " + e.message);
            } finally {
                btnSaveTimings.disabled = false;
                btnSaveTimings.textContent = '💾 Salvar e Aplicar Regras de Tempo Globalmente';
            }
        };
    }

    // Heal all fatigue immediately
    const btnHealAll = document.getElementById('btn-gm-heal-all-fatigue');
    if (btnHealAll) {
        btnHealAll.onclick = async () => {
            btnHealAll.disabled = true;
            try {
                await addGMLog('timing', 'Cura de Fadiga Imediata', 'GM zerou o tempo de descanso de heróis e tropas no reino.');
                showGMToast("💖 Fadiga e descanso resetados para 0s!");
            } catch(e) {
                alert("Erro ao curar fadiga: " + e.message);
            } finally {
                btnHealAll.disabled = false;
            }
        };
    }
}

function syncTimingInputs() {
    const settings = getGlobalSettings();
    const time = settings.timeSettings || {};

    const buildSlider = document.getElementById('gm-timing-build-slider');
    const buildDisp = document.getElementById('gm-timing-build-val');
    const fatigueSlider = document.getElementById('gm-timing-fatigue-slider');
    const fatigueDisp = document.getElementById('gm-timing-fatigue-val');
    const instantBuildToggle = document.getElementById('gm-toggle-instant-build');
    const instantTrainToggle = document.getElementById('gm-toggle-instant-train');
    const noFatigueToggle = document.getElementById('gm-toggle-no-fatigue');

    const bMult = time.constructionMultiplier ?? 1.0;
    const fMult = time.fatigueMultiplier ?? 1.0;

    if (buildSlider) buildSlider.value = bMult;
    if (buildDisp) buildDisp.textContent = formatMultiplierDisplay(bMult);
    if (fatigueSlider) fatigueSlider.value = fMult;
    if (fatigueDisp) fatigueDisp.textContent = formatMultiplierDisplay(fMult);
    if (instantBuildToggle) instantBuildToggle.checked = !!time.instantConstruction;
    if (instantTrainToggle) instantTrainToggle.checked = !!time.instantTraining;
    if (noFatigueToggle) noFatigueToggle.checked = !!time.noFatigue;

    // 7 Edifícios
    const bTimes = time.buildingTimes || {};
    const bldgs = ['cabana', 'cais', 'arranhador', 'mina', 'quartel', 'prefeitura', 'mercado'];
    const bDefaults = { cabana: 15, cais: 20, arranhador: 25, mina: 35, quartel: 40, prefeitura: 60, mercado: 45 };
    bldgs.forEach(b => {
        const el = document.getElementById(`gm-time-bldg-${b}`);
        if (el) el.value = bTimes[b] ?? bDefaults[b];
    });

    // 5 Tropas
    const tTimes = time.troopTimes || {};
    const troops = ['scouts', 'archers', 'colossus', 'mages', 'rogues'];
    const tDefaults = { scouts: 5, archers: 10, colossus: 20, mages: 25, rogues: 15 };
    troops.forEach(t => {
        const el = document.getElementById(`gm-time-troop-${t}`);
        if (el) el.value = tTimes[t] ?? tDefaults[t];
    });

    // Fadiga Separada
    const fTimes = time.fatigueTimes || {};
    const elFatigueArmy = document.getElementById('gm-time-fatigue-army');
    const elFatigueSword = document.getElementById('gm-time-fatigue-hero-sword');
    const elFatigueBow = document.getElementById('gm-time-fatigue-hero-bow');
    const elFatigueMage = document.getElementById('gm-time-fatigue-hero-mage');
    const victoryInput = document.getElementById('gm-input-victory-rest');
    const defeatInput = document.getElementById('gm-input-defeat-rest');

    if (elFatigueArmy) elFatigueArmy.value = fTimes.army ?? 20;
    if (elFatigueSword) elFatigueSword.value = fTimes.hero_sword ?? 20;
    if (elFatigueBow) elFatigueBow.value = fTimes.hero_bow ?? 20;
    if (elFatigueMage) elFatigueMage.value = fTimes.hero_mage ?? 25;
    if (victoryInput) victoryInput.value = time.victoryRestSeconds ?? 20;
    if (defeatInput) defeatInput.value = time.defeatRestSeconds ?? 15;
}

// --- Accounts Management Tab ---
async function loadAndRenderAccounts() {
    const tableBody = document.getElementById('gm-accounts-table-body');
    const statusText = document.getElementById('gm-db-status-text');
    const dot = document.getElementById('gm-db-indicator-dot');

    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 25px; color: var(--text-secondary);">⏳ Carregando contas do reino do banco de dados...</td></tr>';
    }
    
    const accounts = await getAllAccounts();
    currentAccountsList = accounts;

    // Atualiza barra de status de conexão com o banco de dados
    if (statusText) {
        if (accounts.meta?.firestoreConnected) {
            if (dot) dot.className = 'status-indicator-dot online';
            statusText.innerHTML = `<strong>🟢 Banco de Dados Conectado:</strong> ${accounts.length} contas coletadas com sucesso!`;
        } else if (accounts.meta?.error) {
            if (dot) dot.className = 'status-indicator-dot warning';
            statusText.innerHTML = `<strong>⚠️ Aviso Firestore:</strong> ${escapeHtml(accounts.meta.error)}. Exibindo ${accounts.length} contas do cache local.`;
        } else {
            if (dot) dot.className = 'status-indicator-dot online';
            statusText.innerHTML = `<strong>🟢 Banco de Dados:</strong> ${accounts.length} contas ativas encontradas.`;
        }
    }

    renderAccountsTable(accounts);
    setupAccountToolbarButtons();
}

function setupAccountToolbarButtons() {
    const btnReloadDb = document.getElementById('btn-gm-force-reload-db');
    if (btnReloadDb && !btnReloadDb.dataset.bound) {
        btnReloadDb.dataset.bound = 'true';
        btnReloadDb.onclick = async () => {
            btnReloadDb.textContent = '⏳ Sincronizando...';
            await loadAndRenderAccounts();
            await refreshGMOverview();
            btnReloadDb.textContent = '✅ Sincronizado!';
            setTimeout(() => { btnReloadDb.textContent = '🔄 Sincronizar Banco'; }, 1200);
        };
    }

    const btnCreateTest = document.getElementById('btn-gm-create-test-acc');
    if (btnCreateTest && !btnCreateTest.dataset.bound) {
        btnCreateTest.dataset.bound = 'true';
        btnCreateTest.onclick = async () => {
            const name = prompt("Nome do Líder para a nova conta de teste:", "Gato Guerreiro " + Math.floor(Math.random()*100));
            if (!name) return;
            btnCreateTest.textContent = 'Criando...';
            btnCreateTest.disabled = true;
            try {
                await createTestAccount(name);
                showGMToast(`Conta de teste "${name}" criada com sucesso no banco de dados!`);
                await loadAndRenderAccounts();
                await refreshGMOverview();
            } catch(e) {
                alert("Erro ao criar conta de teste: " + e.message);
            } finally {
                btnCreateTest.textContent = '➕ Criar Conta Teste';
                btnCreateTest.disabled = false;
            }
        };
    }
}

let activeEditResTargetUid = null;

function renderAccountsTable(accounts) {
    const tableBody = document.getElementById('gm-accounts-table-body');
    if (!tableBody) return;

    // Atualiza mini estatísticas da barra superior
    const totalCount = accounts.length;
    const activeCount = accounts.filter(a => !a.isBanned).length;
    const adminCount = accounts.filter(a => a.role === 'admin' || a.isAdmin).length;
    const bannedCount = accounts.filter(a => a.isBanned).length;
    const goldTotal = accounts.reduce((sum, a) => sum + (a.gold ?? a.resources?.gold ?? 0), 0);
    const diamondsTotal = accounts.reduce((sum, a) => sum + (a.diamonds ?? a.resources?.diamonds ?? 0), 0);

    const statTotalEl = document.getElementById('gm-stat-acc-total');
    const statActiveEl = document.getElementById('gm-stat-acc-active');
    const statAdminsEl = document.getElementById('gm-stat-acc-admins');
    const statBannedEl = document.getElementById('gm-stat-acc-banned');
    const statGoldEl = document.getElementById('gm-stat-acc-gold');
    const statDiamondsEl = document.getElementById('gm-stat-acc-diamonds');

    if (statTotalEl) statTotalEl.textContent = totalCount;
    if (statActiveEl) statActiveEl.textContent = activeCount;
    if (statAdminsEl) statAdminsEl.textContent = adminCount;
    if (statBannedEl) statBannedEl.textContent = bannedCount;
    if (statGoldEl) statGoldEl.textContent = Math.floor(goldTotal).toLocaleString('pt-BR');
    if (statDiamondsEl) statDiamondsEl.textContent = Math.floor(diamondsTotal).toLocaleString('pt-BR');

    const searchTerm = (document.getElementById('gm-acc-search')?.value || '').toLowerCase().trim();
    const filterStatus = document.getElementById('gm-acc-filter-status')?.value || 'all';
    const filterRole = document.getElementById('gm-acc-filter-role')?.value || 'all';
    const sortOption = document.getElementById('gm-acc-sort')?.value || 'level_desc';

    let filtered = accounts.filter(acc => {
        const matchesSearch = 
            (acc.displayName || '').toLowerCase().includes(searchTerm) ||
            (acc.email || '').toLowerCase().includes(searchTerm) ||
            (acc.uid || '').toLowerCase().includes(searchTerm) ||
            (acc.tribe || '').toLowerCase().includes(searchTerm);

        const matchesStatus = 
            filterStatus === 'all' ||
            (filterStatus === 'active' && !acc.isBanned) ||
            (filterStatus === 'banned' && acc.isBanned);

        const isAdmin = acc.role === 'admin' || acc.isAdmin;
        const matchesRole = 
            filterRole === 'all' ||
            (filterRole === 'admin' && isAdmin) ||
            (filterRole === 'player' && !isAdmin);

        return matchesSearch && matchesStatus && matchesRole;
    });

    // Ordenação dinâmica
    filtered.sort((a, b) => {
        if (sortOption === 'level_desc') return (b.level || 1) - (a.level || 1);
        if (sortOption === 'gold_desc') return (b.gold ?? b.resources?.gold ?? 0) - (a.gold ?? a.resources?.gold ?? 0);
        if (sortOption === 'diamonds_desc') return (b.diamonds ?? b.resources?.diamonds ?? 0) - (a.diamonds ?? a.resources?.diamonds ?? 0);
        if (sortOption === 'name_asc') return (a.displayName || '').localeCompare(b.displayName || '');
        return 0;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 25px; color: var(--text-secondary);">Nenhuma conta encontrada com os filtros atuais.</td></tr>';
        return;
    }

    tableBody.innerHTML = filtered.map(acc => {
        const isBanned = acc.isBanned;
        const isAdmin = acc.role === 'admin' || acc.isAdmin;
        const statusBadge = isBanned 
            ? `<span class="badge-banned" title="${escapeHtml(acc.banReason || 'Sem motivo')}">🚫 Banido</span>`
            : `<span class="badge-active">🟢 Ativo</span>`;
        const roleBadge = isAdmin 
            ? `<span class="badge-role admin">👑 ADM</span>`
            : `<span class="badge-role">👤 Jogador</span>`;

        const gold = Math.floor(acc.gold ?? acc.resources?.gold ?? 0).toLocaleString('pt-BR');
        const diamonds = Math.floor(acc.diamonds ?? acc.resources?.diamonds ?? 0).toLocaleString('pt-BR');
        const fish = Math.floor(acc.fish ?? acc.resources?.fish ?? 0).toLocaleString('pt-BR');
        const wood = Math.floor(acc.wood ?? acc.resources?.wood ?? 0).toLocaleString('pt-BR');

        return `
            <tr class="gm-acc-row ${isBanned ? 'row-banned' : ''}">
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.5rem;">${acc.avatar || '🦁'}</span>
                        <div>
                            <strong>${escapeHtml(acc.displayName || 'Sem Nome')}</strong>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.8;">${escapeHtml(acc.tribe || 'Os Pata-Dourada')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div>${escapeHtml(acc.email || '')}</div>
                    <small style="font-family: monospace; font-size: 0.7rem; color: var(--text-secondary);">${acc.uid.substring(0, 10)}...</small>
                </td>
                <td>
                    ${roleBadge}
                </td>
                <td>
                    <span class="badge-level">Nv. ${acc.level || 1}</span>
                </td>
                <td>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 0.82rem;">
                        <span title="Ouro">🪙 <strong>${gold}</strong></span>
                        <span title="Diamantes" style="color: #3498db;">💎 <strong>${diamonds}</strong></span>
                        <span title="Peixes" style="color: #2980b9;">🐟 ${fish}</span>
                        <span title="Madeira" style="color: #8e44ad;">🪵 ${wood}</span>
                    </div>
                </td>
                <td>
                    ${statusBadge}
                    ${isBanned && acc.banReason ? `<div style="font-size: 0.75rem; color: #e74c3c; margin-top: 3px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(acc.banReason)}">Motivo: ${escapeHtml(acc.banReason)}</div>` : ''}
                </td>
                <td>
                    <div class="gm-table-actions">
                        <button type="button" class="btn btn-sm btn-inspect-acc" style="background: #2980b9; color: #fff; font-weight: bold;" onclick="window.gmActionInspectAccount('${acc.uid}')" title="Ver e editar ficha completa (edifícios, tropas, recursos e mochila)">🔍 Ficha</button>
                        <button type="button" class="btn btn-sm btn-view-player-items" style="background: #16a085; color: #fff; font-weight: bold;" onclick="window.gmActionOpenPlayerInventory('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Ver, doar e editar itens da mochila do jogador">🎒 Itens (${Array.isArray(acc.inventory) ? acc.inventory.length : 0})</button>
                        <button type="button" class="btn btn-sm btn-play-village" style="background: #27ae60; color: #fff; font-weight: bold;" onclick="window.gmActionPlayVillage('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Carregar e jogar nesta vila com GM ativo">🎮 Jogar</button>
                        <button type="button" class="btn btn-sm btn-gift-item" style="background: #8e44ad; color: #fff;" onclick="window.gmActionOpenGiftItem('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Doar item do catálogo para a mochila">🎁 Item</button>
                        <button type="button" class="btn btn-sm btn-edit-res" onclick="window.gmActionEditResources('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Editar recursos desta vila">✏️ Recursos</button>
                        <button type="button" class="btn btn-sm btn-gift" onclick="window.gmActionGiftPrompt('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Presentear diamantes">💎 Diamantes</button>
                        ${isBanned 
                            ? `<button type="button" class="btn btn-sm btn-unban" onclick="window.gmActionUnban('${acc.uid}')" title="Desbanir conta">✅ Desbanir</button>`
                            : `<button type="button" class="btn btn-sm btn-ban" onclick="window.gmActionBanPrompt('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Banir conta">🚫 Banir</button>`
                        }
                        <button type="button" class="btn btn-sm btn-delete-acc" style="background: rgba(231,76,60,0.15); color: #c0392b; border: 1px solid #e74c3c;" onclick="window.gmActionDeleteAccount('${acc.uid}', '${escapeHtml(acc.displayName)}')" title="Excluir conta permanentemente">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAccountInventory(acc) {
    const listEl = document.getElementById('gm-det-inventory-list');
    if (!listEl) return;
    const inv = acc.inventory || [];
    if (inv.length === 0) {
        listEl.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Mochila vazia. Use o botão acima para doar itens do catálogo!</span>';
        return;
    }
    listEl.innerHTML = inv.map((item, idx) => {
        const rarity = item.rarity || 'common';
        const itemKey = item.uid || item.id || `idx_${idx}`;
        return `
            <div class="gm-inv-item-pill rarity-${rarity}" style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.82rem; background: rgba(0,0,0,0.06); border: 1px solid var(--parchment-border);" title="${escapeHtml(item.desc || '')}">
                <span>${item.icon || '⚔️'}</span>
                <strong>${escapeHtml(item.name || 'Item')}</strong>
                <span style="opacity: 0.7; font-size: 0.72rem;">(${item.slot || 'equip'})</span>
                <button type="button" onclick="window.gmActionOpenEditPlayerItem('${acc.uid}', '${itemKey}')" style="background: none; border: none; color: #2980b9; cursor: pointer; font-size: 0.82rem; margin-left: 2px;" title="Editar atributos deste item">✏️</button>
                <button type="button" onclick="window.gmActionRemoveItemFromAccount('${acc.uid}', '${itemKey}')" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-weight: bold; margin-left: 2px;" title="Remover item da mochila">✕</button>
            </div>
        `;
    }).join('');
}

function renderGMPlayerInventoryModal(acc) {
    const avatarEl = document.getElementById('gm-pinv-avatar');
    const nameEl = document.getElementById('gm-pinv-name');
    const badgeEl = document.getElementById('gm-pinv-badge');
    const emailEl = document.getElementById('gm-pinv-email');
    const countEl = document.getElementById('gm-pinv-item-count');
    const equippedSlotsEl = document.getElementById('gm-pinv-equipped-slots');
    const gridEl = document.getElementById('gm-player-inv-grid');
    const searchInput = document.getElementById('gm-pinv-search');

    const isAdmin = acc.role === 'admin' || acc.isAdmin;
    if (avatarEl) avatarEl.textContent = acc.avatar || '🦁';
    if (nameEl) nameEl.textContent = acc.displayName || 'Líder Felino';
    if (badgeEl) {
        badgeEl.textContent = isAdmin ? '👑 Administrador' : '👤 Jogador';
        badgeEl.className = `badge-role ${isAdmin ? 'admin' : ''}`;
    }
    if (emailEl) emailEl.textContent = acc.userEmail || acc.email || 'Offline';

    const inv = Array.isArray(acc.inventory) ? acc.inventory : [];
    if (countEl) countEl.textContent = `${inv.length} Itens na Mochila`;

    // Render Equipped Hero Gear
    if (equippedSlotsEl) {
        const slots = [
            { key: 'weapon', label: 'Arma', icon: '🗡️' },
            { key: 'offhand', label: 'Secundária', icon: '🛡️' },
            { key: 'helmet', label: 'Elmo', icon: '🪖' },
            { key: 'armor', label: 'Armadura', icon: '🥋' },
            { key: 'accessory', label: 'Acessório', icon: '💍' }
        ];

        let activeHero = null;
        if (acc.unlockedHeroes) {
            activeHero = Object.values(acc.unlockedHeroes).find(h => h && h.id === acc.activeHeroId) || Object.values(acc.unlockedHeroes)[0];
        }
        if (!activeHero && acc.hero) activeHero = acc.hero;

        equippedSlotsEl.innerHTML = slots.map(s => {
            const eq = activeHero?.equipped ? activeHero.equipped[s.key] : null;
            if (eq) {
                const rarity = eq.rarity || 'common';
                return `
                    <div style="background: rgba(255,255,255,0.7); border: 1px solid var(--parchment-border); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 1.2rem;">${eq.icon || s.icon}</span>
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <strong style="color: var(--wood-dark);">${escapeHtml(eq.name)}</strong>
                            <div style="font-size: 0.7rem; color: var(--text-secondary);">${s.label} (${rarity.toUpperCase()})</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div style="background: rgba(0,0,0,0.03); border: 1px dashed var(--parchment-border); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; opacity: 0.7;">
                        <span style="font-size: 1.2rem;">${s.icon}</span>
                        <div>
                            <strong>${s.label}</strong>
                            <div style="font-size: 0.7rem;">(Vazio)</div>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    // Render Backpack Items
    const renderGrid = (filterText = '') => {
        if (!gridEl) return;
        const q = filterText.toLowerCase().trim();
        const filtered = inv.filter(item => {
            if (!q) return true;
            return (item.name && item.name.toLowerCase().includes(q)) ||
                   (item.slot && item.slot.toLowerCase().includes(q)) ||
                   (item.rarity && item.rarity.toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            gridEl.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-secondary);">Nenhum item encontrado nesta mochila.</div>';
            return;
        }

        gridEl.innerHTML = filtered.map((item, idx) => {
            const rarity = item.rarity || 'common';
            const itemKey = item.uid || item.id || `idx_${idx}`;
            const stats = item.stats || {};
            const statsChips = Object.entries(stats).map(([k, v]) => {
                const statLabels = { strength: '⚔️ Força', dexterity: '🏹 Destreza', intelligence: '🔮 Intel', stamina: '⚡ Vigor', hp: '❤️ HP' };
                return `<span class="gm-stat-badge"><strong>+${v}</strong> ${statLabels[k] || k}</span>`;
            }).join('') || '<span style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.8;">Sem bônus</span>';

            const originStr = item.giftedByGM ? '🎁 Concedido por GM' : '🏰 Drop da Torre';

            return `
                <div class="gm-player-item-card rarity-${rarity}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="font-size: 2rem;">${item.icon || '⚔️'}</span>
                            <div>
                                <strong style="font-size: 0.95rem; color: var(--wood-dark);">${escapeHtml(item.name || 'Item')}</strong>
                                <div style="display: flex; gap: 5px; margin-top: 3px;">
                                    <span class="badge-rarity rarity-${rarity}" style="font-size: 0.68rem; padding: 1px 6px;">${rarity.toUpperCase()}</span>
                                    <span class="badge-slot" style="font-size: 0.68rem; padding: 1px 6px;">${item.slot || 'equip'}</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-sm" style="background: rgba(231,76,60,0.15); color: #c0392b; border: 1px solid #e74c3c; padding: 2px 8px;" onclick="window.gmActionRemovePlayerItem('${acc.uid}', '${itemKey}')" title="Remover item da mochila">🗑️</button>
                    </div>
                    ${item.desc ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 4px 0 2px 0;">${escapeHtml(item.desc)}</p>` : ''}
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                        ${statsChips}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.06);">
                        <small style="font-size: 0.72rem; color: var(--text-secondary);">${originStr}</small>
                        <button type="button" class="btn btn-sm btn-secondary" style="padding: 2px 8px; font-size: 0.75rem;" onclick="window.gmActionOpenEditPlayerItem('${acc.uid}', '${itemKey}')">✏️ Customizar Atributos</button>
                    </div>
                </div>
            `;
        }).join('');
    };

    renderGrid();
    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => renderGrid(e.target.value);
    }
}

function setupGMAccountModals() {
    // Expose actions to global window for inline onclick handlers
    window.gmActionBanPrompt = (uid, name) => {
        activeBanTargetUid = uid;
        const targetNameEl = document.getElementById('gm-ban-target-name');
        const reasonInput = document.getElementById('gm-ban-reason-input');
        if (targetNameEl) targetNameEl.textContent = name;
        if (reasonInput) reasonInput.value = '';
        const modal = document.getElementById('modal-gm-ban');
        if (modal) modal.style.display = 'flex';
    };

    window.gmActionUnban = async (uid) => {
        if (!confirm("Deseja realmente remover o banimento desta conta?")) return;
        const res = await unbanAccount(uid);
        if (res.success) {
            showGMToast("✅ Conta desbanida com sucesso!");
            await addGMLog('ban', 'Conta Desbanida', `UID ${uid} foi desbanido.`);
            await loadAndRenderAccounts();
            refreshGMOverview();
        } else {
            alert("Erro ao desbanir conta: " + res.reason);
        }
    };

    window.gmActionGiftPrompt = (uid, name) => {
        activeGiftTargetUid = uid;
        const targetNameEl = document.getElementById('gm-gift-target-name');
        const goldInput = document.getElementById('gm-gift-gold');
        const diamondsInput = document.getElementById('gm-gift-diamonds');
        if (targetNameEl) targetNameEl.textContent = name;
        if (goldInput) goldInput.value = 1000;
        if (diamondsInput) diamondsInput.value = 25;
        const modal = document.getElementById('modal-gm-gift');
        if (modal) modal.style.display = 'flex';
    };

    // Play as village action
    window.gmActionPlayVillage = async (uid, name) => {
        if (!confirm(`Deseja carregar e jogar na vila de "${name}" agora?`)) return;
        try {
            showGMToast(`🎮 Carregando vila de "${name}"...`);
            await switchActiveVillage(uid);

            // Configure and display testing banner in game
            const banner = document.getElementById('gm-testing-banner');
            const bannerName = document.getElementById('gm-testing-village-name');
            if (banner) banner.style.display = 'flex';
            if (bannerName) bannerName.textContent = name;

            // Hide GM panel and switch body classes
            const gmDash = document.getElementById('gm-dashboard');
            if (gmDash) gmDash.style.display = 'none';
            document.body.classList.remove('in-gm');
            document.body.classList.add('in-game');

            const gameDash = document.getElementById('game-dashboard');
            if (gameDash) gameDash.style.display = 'flex';

            // Initialize game dashboard view
            initGame();
            await addGMLog('village', 'Sessão de Teste Iniciada', `GM entrou no modo de teste jogando com a vila ${name} (${uid}).`);
            showGMToast(`✅ Vila "${name}" carregada! Use o banner superior para retornar ao GM a qualquer momento.`);
        } catch(e) {
            alert("Erro ao carregar vila: " + e.message);
        }
    };

    // Edit village resources prompt
    window.gmActionEditResources = (uid, name) => {
        activeEditResTargetUid = uid;
        const targetNameEl = document.getElementById('gm-edit-res-target-name');
        if (targetNameEl) targetNameEl.textContent = name;

        // Find current account data to populate fields
        const acc = currentAccountsList.find(a => a.uid === uid);
        const r = acc?.resources || acc || {};

        const fields = ['fish', 'wood', 'wool', 'stone', 'coal', 'iron', 'gold', 'diamonds'];
        fields.forEach(field => {
            const input = document.getElementById(`gm-er-${field}`);
            if (input) input.value = Math.floor(r[field] || 0);
        });

        const modal = document.getElementById('modal-gm-edit-resources');
        if (modal) modal.style.display = 'flex';
    };

    // Edit Resources Modal Handlers
    const modalEditRes = document.getElementById('modal-gm-edit-resources');
    const btnCancelEditRes = document.getElementById('btn-cancel-edit-resources');
    const btnCloseEditResX = document.getElementById('btn-close-edit-res-x');
    const btnConfirmEditRes = document.getElementById('btn-confirm-edit-resources');

    if (btnCancelEditRes && modalEditRes) {
        btnCancelEditRes.onclick = () => { modalEditRes.style.display = 'none'; };
    }
    if (btnCloseEditResX && modalEditRes) {
        btnCloseEditResX.onclick = () => { modalEditRes.style.display = 'none'; };
    }

    // Presets in Edit Resources Modal
    const btnPresetStarter = document.getElementById('btn-gm-res-preset-starter');
    if (btnPresetStarter) {
        btnPresetStarter.onclick = () => {
            const vals = { fish: 250, wood: 250, wool: 10, stone: 0, coal: 0, iron: 0, gold: 150, diamonds: 10 };
            Object.entries(vals).forEach(([k, v]) => {
                const el = document.getElementById(`gm-er-${k}`);
                if (el) el.value = v;
            });
        };
    }

    const btnPresetMid = document.getElementById('btn-gm-res-preset-mid');
    if (btnPresetMid) {
        btnPresetMid.onclick = () => {
            const vals = { fish: 2000, wood: 2000, wool: 300, stone: 200, coal: 100, iron: 100, gold: 1000, diamonds: 50 };
            Object.entries(vals).forEach(([k, v]) => {
                const el = document.getElementById(`gm-er-${k}`);
                if (el) el.value = v;
            });
        };
    }

    if (btnConfirmEditRes) {
        btnConfirmEditRes.onclick = async () => {
            if (!activeEditResTargetUid) return;
            const updates = {
                fish: Math.max(0, parseInt(document.getElementById('gm-er-fish')?.value || '0', 10)),
                wood: Math.max(0, parseInt(document.getElementById('gm-er-wood')?.value || '0', 10)),
                wool: Math.max(0, parseInt(document.getElementById('gm-er-wool')?.value || '0', 10)),
                stone: Math.max(0, parseInt(document.getElementById('gm-er-stone')?.value || '0', 10)),
                coal: Math.max(0, parseInt(document.getElementById('gm-er-coal')?.value || '0', 10)),
                iron: Math.max(0, parseInt(document.getElementById('gm-er-iron')?.value || '0', 10)),
                gold: Math.max(0, parseInt(document.getElementById('gm-er-gold')?.value || '0', 10)),
                diamonds: Math.max(0, parseInt(document.getElementById('gm-er-diamonds')?.value || '0', 10))
            };

            btnConfirmEditRes.disabled = true;
            btnConfirmEditRes.textContent = 'Salvando...';
            try {
                await updateAccountResources(activeEditResTargetUid, updates);
                showGMToast(`✅ Recursos da conta atualizados com sucesso!`);
                if (modalEditRes) modalEditRes.style.display = 'none';
                await loadAndRenderAccounts();
                await refreshGMOverview();
            } catch(e) {
                alert("Erro ao atualizar recursos: " + e.message);
            } finally {
                btnConfirmEditRes.disabled = false;
                btnConfirmEditRes.textContent = '💾 Salvar Recursos';
            }
        };
    }

    // --- Ficha Completa do Jogador (Inspect Modal) ---
    window.gmActionInspectAccount = async (uid) => {
        activeInspectUid = uid;
        const modal = document.getElementById('modal-gm-account-details');
        if (!modal) return;
        
        showGMToast("⏳ Carregando dados da conta...");
        const acc = await getAccountFullData(uid);
        if (!acc) {
            alert("Conta não encontrada!");
            return;
        }

        const avatarEl = document.getElementById('gm-det-avatar');
        const nameEl = document.getElementById('gm-det-name');
        const roleBadgeEl = document.getElementById('gm-det-role-badge');
        const statusBadgeEl = document.getElementById('gm-det-status-badge');
        const emailEl = document.getElementById('gm-det-email');
        const tribeEl = document.getElementById('gm-det-tribe');
        const uidEl = document.getElementById('gm-det-uid');

        const isAdmin = acc.role === 'admin' || acc.isAdmin;
        if (avatarEl) avatarEl.textContent = acc.avatar || '🦁';
        if (nameEl) nameEl.textContent = acc.displayName || 'Sem Nome';
        if (roleBadgeEl) {
            roleBadgeEl.textContent = isAdmin ? '👑 Administrador' : '👤 Jogador';
            roleBadgeEl.className = `badge-role ${isAdmin ? 'admin' : ''}`;
        }
        if (statusBadgeEl) {
            statusBadgeEl.textContent = acc.isBanned ? '🚫 Banido' : '🟢 Ativo';
            statusBadgeEl.className = acc.isBanned ? 'badge-banned' : 'badge-active';
        }
        if (emailEl) emailEl.textContent = acc.userEmail || acc.email || 'Sem e-mail';
        if (tribeEl) tribeEl.textContent = acc.tribe || 'Os Pata-Dourada';
        if (uidEl) uidEl.textContent = `UID: ${acc.uid || uid}`;

        // Nível, XP e Nome
        const inputLevel = document.getElementById('gm-det-input-level');
        const inputXp = document.getElementById('gm-det-input-xp');
        const inputName = document.getElementById('gm-det-input-name');
        if (inputLevel) inputLevel.value = acc.account?.level || acc.level || 1;
        if (inputXp) inputXp.value = acc.account?.xp || acc.xp || 0;
        if (inputName) inputName.value = acc.displayName || '';

        // Recursos
        const r = acc.resources || acc || {};
        const resFields = ['fish', 'wood', 'wool', 'stone', 'coal', 'iron', 'gold', 'diamonds'];
        resFields.forEach(k => {
            const el = document.getElementById(`gm-det-res-${k}`);
            if (el) el.value = Math.floor(r[k] || 0);
        });

        // 7 Edifícios
        const b = acc.buildings || {};
        const bldgs = ['cabana', 'cais', 'arranhador', 'mina', 'quartel', 'prefeitura', 'mercado'];
        bldgs.forEach(k => {
            const el = document.getElementById(`gm-det-bldg-${k}`);
            if (el) el.value = b[k]?.level ?? (['cabana', 'cais', 'arranhador', 'mina'].includes(k) ? 1 : 0);
        });

        // 5 Tropas
        const a = acc.army || {};
        const troops = ['scouts', 'archers', 'colossus', 'mages', 'rogues'];
        troops.forEach(k => {
            const el = document.getElementById(`gm-det-army-${k}`);
            if (el) el.value = a[k] || 0;
        });

        // Mochila de Itens
        renderAccountInventory(acc);

        modal.style.display = 'flex';
    };

    window.gmActionRemoveItemFromAccount = async (uid, itemIdentifier) => {
        if (!confirm("Deseja remover este item da mochila da conta?")) return;
        const res = await removePlayerItem(uid, itemIdentifier);
        if (res.success) {
            showGMToast(`🗑️ Item "${res.item?.name || 'Item'}" removido da mochila!`);
            window.gmActionInspectAccount(uid);
            if (activePlayerInvUid === uid) window.gmActionOpenPlayerInventory(uid);
            await loadAndRenderAccounts();
        } else {
            alert("Erro ao remover item: " + (res.reason || 'Desconhecido'));
        }
    };

    // --- Modal Mochila Completa do Jogador ---
    window.gmActionOpenPlayerInventory = async (uid, name) => {
        activePlayerInvUid = uid;
        const modal = document.getElementById('modal-gm-player-inventory');
        if (!modal) return;

        showGMToast("⏳ Carregando mochila do jogador...");
        const acc = await getAccountFullData(uid);
        if (!acc) {
            alert("Conta não encontrada!");
            return;
        }

        renderGMPlayerInventoryModal(acc);
        modal.style.display = 'flex';
    };

    const modalPlayerInv = document.getElementById('modal-gm-player-inventory');
    const btnClosePlayerInvX = document.getElementById('btn-close-player-inv-x');
    const btnClosePlayerInvBottom = document.getElementById('btn-close-player-inv-bottom');
    const btnPinvGiftNew = document.getElementById('btn-gm-pinv-gift-new');
    const btnPinvRefresh = document.getElementById('btn-gm-pinv-refresh');

    const closePlayerInvModal = () => { if (modalPlayerInv) modalPlayerInv.style.display = 'none'; };
    if (btnClosePlayerInvX) btnClosePlayerInvX.onclick = closePlayerInvModal;
    if (btnClosePlayerInvBottom) btnClosePlayerInvBottom.onclick = closePlayerInvModal;

    if (btnPinvGiftNew) {
        btnPinvGiftNew.onclick = () => {
            if (!activePlayerInvUid) return;
            const name = document.getElementById('gm-pinv-name')?.textContent || 'Jogador';
            window.gmActionOpenGiftItem(activePlayerInvUid, name);
        };
    }

    if (btnPinvRefresh) {
        btnPinvRefresh.onclick = async () => {
            if (!activePlayerInvUid) return;
            const acc = await getAccountFullData(activePlayerInvUid);
            if (acc) {
                renderGMPlayerInventoryModal(acc);
                showGMToast("🔄 Mochila atualizada!");
            }
        };
    }

    window.gmActionRemovePlayerItem = async (uid, itemIdentifier) => {
        if (!confirm("Deseja realmente remover este item da mochila do jogador?")) return;
        const res = await removePlayerItem(uid, itemIdentifier);
        if (res.success) {
            showGMToast(`🗑️ Item "${res.item?.name || 'Item'}" removido com sucesso!`);
            const acc = await getAccountFullData(uid);
            if (activePlayerInvUid === uid && acc) renderGMPlayerInventoryModal(acc);
            if (activeInspectUid === uid && acc) renderAccountInventory(acc);
            await loadAndRenderAccounts();
        } else {
            alert("Erro ao remover item: " + (res.reason || 'Desconhecido'));
        }
    };

    window.gmActionOpenEditPlayerItem = async (uid, itemIdentifier) => {
        const acc = await getAccountFullData(uid);
        if (!acc || !Array.isArray(acc.inventory)) return;
        const item = acc.inventory.find(it => (it.uid === itemIdentifier) || (it.id === itemIdentifier));
        if (!item) {
            alert("Item não encontrado na mochila!");
            return;
        }

        const modal = document.getElementById('modal-gm-edit-player-item');
        const inputItemUid = document.getElementById('gm-epi-item-uid');
        const inputPlayerUid = document.getElementById('gm-epi-player-uid');
        const targetPlayerEl = document.getElementById('gm-epi-target-player');
        const inputName = document.getElementById('gm-epi-name');
        const selectSlot = document.getElementById('gm-epi-slot');
        const selectRarity = document.getElementById('gm-epi-rarity');
        const inputIcon = document.getElementById('gm-epi-icon');
        const inputStr = document.getElementById('gm-epi-str');
        const inputDex = document.getElementById('gm-epi-dex');
        const inputInt = document.getElementById('gm-epi-int');
        const inputSta = document.getElementById('gm-epi-sta');
        const inputHp = document.getElementById('gm-epi-hp');

        if (inputItemUid) inputItemUid.value = item.uid || item.id;
        if (inputPlayerUid) inputPlayerUid.value = uid;
        if (targetPlayerEl) targetPlayerEl.textContent = acc.displayName || 'Jogador';
        if (inputName) inputName.value = item.name || '';
        if (selectSlot) selectSlot.value = item.slot || 'weapon';
        if (selectRarity) selectRarity.value = item.rarity || 'common';
        if (inputIcon) inputIcon.value = item.icon || '⚔️';

        const stats = item.stats || {};
        if (inputStr) inputStr.value = stats.strength || 0;
        if (inputDex) inputDex.value = stats.dexterity || 0;
        if (inputInt) inputInt.value = stats.intelligence || 0;
        if (inputSta) inputSta.value = stats.stamina || 0;
        if (inputHp) inputHp.value = stats.hp || 0;

        if (modal) modal.style.display = 'flex';
    };

    const modalEditPlayerItem = document.getElementById('modal-gm-edit-player-item');
    const btnCloseEditPlayerItemX = document.getElementById('btn-close-edit-player-item-x');
    const btnCancelEditPlayerItem = document.getElementById('btn-cancel-edit-player-item');
    const closeEditPlayerItemModal = () => { if (modalEditPlayerItem) modalEditPlayerItem.style.display = 'none'; };
    if (btnCloseEditPlayerItemX) btnCloseEditPlayerItemX.onclick = closeEditPlayerItemModal;
    if (btnCancelEditPlayerItem) btnCancelEditPlayerItem.onclick = closeEditPlayerItemModal;

    const formEditPlayerItem = document.getElementById('gm-form-edit-player-item');
    if (formEditPlayerItem) {
        formEditPlayerItem.onsubmit = async (e) => {
            e.preventDefault();
            const playerUid = document.getElementById('gm-epi-player-uid')?.value;
            const itemUid = document.getElementById('gm-epi-item-uid')?.value;
            if (!playerUid || !itemUid) return;

            const name = (document.getElementById('gm-epi-name')?.value || '').trim();
            const slot = document.getElementById('gm-epi-slot')?.value || 'weapon';
            const rarity = document.getElementById('gm-epi-rarity')?.value || 'common';
            const icon = (document.getElementById('gm-epi-icon')?.value || '⚔️').trim();

            const stats = {
                strength: Math.max(0, parseInt(document.getElementById('gm-epi-str')?.value || '0', 10)),
                dexterity: Math.max(0, parseInt(document.getElementById('gm-epi-dex')?.value || '0', 10)),
                intelligence: Math.max(0, parseInt(document.getElementById('gm-epi-int')?.value || '0', 10)),
                stamina: Math.max(0, parseInt(document.getElementById('gm-epi-sta')?.value || '0', 10)),
                hp: Math.max(0, parseInt(document.getElementById('gm-epi-hp')?.value || '0', 10))
            };

            const btnSubmit = document.getElementById('btn-submit-edit-player-item');
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Salvando...'; }

            try {
                const res = await updatePlayerItem(playerUid, itemUid, { name, slot, rarity, icon, stats });
                if (res.success) {
                    showGMToast(`✅ Atributos do item "${name}" salvos com sucesso!`);
                    closeEditPlayerItemModal();

                    const acc = await getAccountFullData(playerUid);
                    if (activePlayerInvUid === playerUid && acc) renderGMPlayerInventoryModal(acc);
                    if (activeInspectUid === playerUid && acc) renderAccountInventory(acc);
                    await loadAndRenderAccounts();
                } else {
                    alert("Erro ao salvar item: " + (res.reason || 'Desconhecido'));
                }
            } catch(err) {
                alert("Erro ao editar item: " + err.message);
            } finally {
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = '💾 Salvar Alterações no Item'; }
            }
        };
    }

    const modalAccDetails = document.getElementById('modal-gm-account-details');
    const btnCloseAccDetailsX = document.getElementById('btn-close-acc-details-x');
    const btnCancelAccDetails = document.getElementById('btn-cancel-acc-details');
    const closeAccDetailsModal = () => { if (modalAccDetails) modalAccDetails.style.display = 'none'; };
    if (btnCloseAccDetailsX) btnCloseAccDetailsX.onclick = closeAccDetailsModal;
    if (btnCancelAccDetails) btnCancelAccDetails.onclick = closeAccDetailsModal;

    // Botões da barra de ações na ficha
    const btnDetPlay = document.getElementById('btn-gm-det-play');
    if (btnDetPlay) {
        btnDetPlay.onclick = () => {
            if (!activeInspectUid) return;
            const name = document.getElementById('gm-det-name')?.textContent || 'Vila';
            closeAccDetailsModal();
            window.gmActionPlayVillage(activeInspectUid, name);
        };
    }

    const btnDetGiftItem = document.getElementById('btn-gm-det-open-gift-item');
    const btnDetQuickGift = document.getElementById('btn-gm-det-quick-gift');
    const openGiftForInspectUser = () => {
        if (!activeInspectUid) return;
        const name = document.getElementById('gm-det-name')?.textContent || 'Jogador';
        window.gmActionOpenGiftItem(activeInspectUid, name);
    };
    if (btnDetGiftItem) btnDetGiftItem.onclick = openGiftForInspectUser;
    if (btnDetQuickGift) btnDetQuickGift.onclick = openGiftForInspectUser;

    const btnDetToggleRole = document.getElementById('btn-gm-det-toggle-role');
    if (btnDetToggleRole) {
        btnDetToggleRole.onclick = async () => {
            if (!activeInspectUid) return;
            const acc = await getAccountFullData(activeInspectUid);
            if (!acc) return;
            const curAdmin = acc.role === 'admin' || acc.isAdmin;
            const newRole = curAdmin ? 'player' : 'admin';
            const msg = curAdmin 
                ? `Deseja rebaixar "${acc.displayName}" para Jogador comum?`
                : `Deseja promover "${acc.displayName}" para Administrador (ADM)? Terá permissão para usar comandos e painéis.`;
            if (confirm(msg)) {
                await setAccountRole(activeInspectUid, newRole);
                showGMToast(`✅ Cargo alterado para ${newRole.toUpperCase()}!`);
                await loadAndRenderAccounts();
                window.gmActionInspectAccount(activeInspectUid);
            }
        };
    }

    const btnDetResetPass = document.getElementById('btn-gm-det-reset-pass');
    if (btnDetResetPass) {
        btnDetResetPass.onclick = () => {
            if (!activeInspectUid) return;
            const name = document.getElementById('gm-det-name')?.textContent || 'Jogador';
            window.gmActionResetPasswordPrompt(activeInspectUid, name);
        };
    }

    const btnDetToggleBan = document.getElementById('btn-gm-det-toggle-ban');
    if (btnDetToggleBan) {
        btnDetToggleBan.onclick = async () => {
            if (!activeInspectUid) return;
            const acc = await getAccountFullData(activeInspectUid);
            if (!acc) return;
            if (acc.isBanned) {
                await window.gmActionUnban(activeInspectUid);
                window.gmActionInspectAccount(activeInspectUid);
            } else {
                window.gmActionBanPrompt(activeInspectUid, acc.displayName);
            }
        };
    }

    const btnDetDeleteAcc = document.getElementById('btn-gm-det-delete-acc');
    if (btnDetDeleteAcc) {
        btnDetDeleteAcc.onclick = () => {
            if (!activeInspectUid) return;
            const name = document.getElementById('gm-det-name')?.textContent || 'Jogador';
            window.gmActionDeleteAccount(activeInspectUid, name);
        };
    }

    // Formulário de Edição Completa da Ficha
    const formEditDetails = document.getElementById('gm-form-edit-account-details');
    if (formEditDetails) {
        formEditDetails.onsubmit = async (e) => {
            e.preventDefault();
            if (!activeInspectUid) return;

            const level = Math.max(1, parseInt(document.getElementById('gm-det-input-level')?.value || '1', 10));
            const xp = Math.max(0, parseInt(document.getElementById('gm-det-input-xp')?.value || '0', 10));
            const displayName = (document.getElementById('gm-det-input-name')?.value || '').trim();

            const resources = {
                fish: Math.max(0, parseInt(document.getElementById('gm-det-res-fish')?.value || '0', 10)),
                wood: Math.max(0, parseInt(document.getElementById('gm-det-res-wood')?.value || '0', 10)),
                wool: Math.max(0, parseInt(document.getElementById('gm-det-res-wool')?.value || '0', 10)),
                stone: Math.max(0, parseInt(document.getElementById('gm-det-res-stone')?.value || '0', 10)),
                coal: Math.max(0, parseInt(document.getElementById('gm-det-res-coal')?.value || '0', 10)),
                iron: Math.max(0, parseInt(document.getElementById('gm-det-res-iron')?.value || '0', 10)),
                gold: Math.max(0, parseInt(document.getElementById('gm-det-res-gold')?.value || '0', 10)),
                diamonds: Math.max(0, parseInt(document.getElementById('gm-det-res-diamonds')?.value || '0', 10))
            };

            const buildings = {
                cabana: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-cabana')?.value || '1', 10)) },
                cais: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-cais')?.value || '1', 10)) },
                arranhador: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-arranhador')?.value || '1', 10)) },
                mina: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-mina')?.value || '1', 10)) },
                quartel: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-quartel')?.value || '0', 10)) },
                prefeitura: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-prefeitura')?.value || '0', 10)) },
                mercado: { level: Math.max(0, parseInt(document.getElementById('gm-det-bldg-mercado')?.value || '0', 10)) }
            };

            const army = {
                scouts: Math.max(0, parseInt(document.getElementById('gm-det-army-scouts')?.value || '0', 10)),
                archers: Math.max(0, parseInt(document.getElementById('gm-det-army-archers')?.value || '0', 10)),
                colossus: Math.max(0, parseInt(document.getElementById('gm-det-army-colossus')?.value || '0', 10)),
                mages: Math.max(0, parseInt(document.getElementById('gm-det-army-mages')?.value || '0', 10)),
                rogues: Math.max(0, parseInt(document.getElementById('gm-det-army-rogues')?.value || '0', 10))
            };

            const btnSave = document.getElementById('btn-gm-save-account-details');
            if (btnSave) { btnSave.disabled = true; btnSave.textContent = 'Salvando...'; }

            try {
                await updateAccountFull(activeInspectUid, {
                    displayName,
                    account: { level, xp },
                    resources,
                    buildings,
                    army
                });
                showGMToast("✅ Ficha completa da conta salva com sucesso!");
                await loadAndRenderAccounts();
                await refreshGMOverview();
                window.gmActionInspectAccount(activeInspectUid);
            } catch(err) {
                alert("Erro ao salvar ficha: " + err.message);
            } finally {
                if (btnSave) { btnSave.disabled = false; btnSave.textContent = '💾 Salvar Todas as Alterações na Conta'; }
            }
        };
    }

    // --- Modal Doar Item do Catálogo ---
    window.gmActionOpenGiftItem = (uid, name) => {
        activeGiftItemUid = uid;
        const modal = document.getElementById('modal-gm-gift-item');
        const targetNameEl = document.getElementById('gm-gift-item-target-name');
        const selectEl = document.getElementById('gm-gift-item-select');
        const previewEl = document.getElementById('gm-gift-item-preview');

        if (targetNameEl) targetNameEl.textContent = name;

        if (selectEl) {
            selectEl.innerHTML = ITEM_DATABASE.map(item => {
                return `<option value="${item.id}">${item.icon} ${escapeHtml(item.name)} [${item.rarity.toUpperCase()} - ${item.slot}]</option>`;
            }).join('');

            const updatePreview = () => {
                const selectedId = selectEl.value;
                const item = ITEM_DATABASE.find(i => i.id === selectedId);
                if (!item || !previewEl) return;
                const statsStr = Object.entries(item.stats || {})
                    .map(([k, v]) => `<strong>+${v}</strong> ${k}`)
                    .join(', ') || 'Nenhum bônus';
                previewEl.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 2rem;">${item.icon}</div>
                        <div>
                            <strong style="font-size: 1.05rem;">${escapeHtml(item.name)}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Raridade: <span class="badge-rarity rarity-${item.rarity}">${item.rarity.toUpperCase()}</span> | Slot: ${item.slot}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; margin-top: 6px; color: var(--text-secondary);">${escapeHtml(item.desc || '')}</div>
                    <div style="font-size: 0.82rem; margin-top: 4px; color: var(--gold);">Atributos: ${statsStr}</div>
                `;
            };

            selectEl.onchange = updatePreview;
            updatePreview();
        }

        if (modal) modal.style.display = 'flex';
    };

    const modalGiftItem = document.getElementById('modal-gm-gift-item');
    const btnCloseGiftItemX = document.getElementById('btn-close-gift-item-x');
    const btnCancelGiftItem = document.getElementById('btn-cancel-gift-item');
    const btnConfirmGiftItem = document.getElementById('btn-confirm-gift-item');

    const closeGiftItemModal = () => { if (modalGiftItem) modalGiftItem.style.display = 'none'; };
    if (btnCloseGiftItemX) btnCloseGiftItemX.onclick = closeGiftItemModal;
    if (btnCancelGiftItem) btnCancelGiftItem.onclick = closeGiftItemModal;

    if (btnConfirmGiftItem) {
        btnConfirmGiftItem.onclick = async () => {
            if (!activeGiftItemUid) return;
            const selectEl = document.getElementById('gm-gift-item-select');
            const selectedId = selectEl?.value;
            if (!selectedId) return;

            btnConfirmGiftItem.disabled = true;
            btnConfirmGiftItem.textContent = 'Enviando Item...';
            try {
                const res = await giftItemToAccount(activeGiftItemUid, selectedId);
                if (res.success) {
                    showGMToast(`🎁 Item "${res.item.name}" concedido com sucesso para a mochila!`);
                    closeGiftItemModal();
                    if (activeInspectUid === activeGiftItemUid) {
                        window.gmActionInspectAccount(activeInspectUid);
                    }
                    await loadAndRenderAccounts();
                } else {
                    alert("Erro ao conceder item: " + (res.reason || 'Desconhecido'));
                }
            } catch(err) {
                alert("Erro ao enviar item: " + err.message);
            } finally {
                btnConfirmGiftItem.disabled = false;
                btnConfirmGiftItem.textContent = '🎁 Conceder Item para a Conta';
            }
        };
    }

    // --- Modal Redefinir Senha ---
    window.gmActionResetPasswordPrompt = (uid, name) => {
        activeResetPassUid = uid;
        const modal = document.getElementById('modal-gm-reset-password');
        const targetNameEl = document.getElementById('gm-reset-pass-target-name');
        const inputPass = document.getElementById('gm-reset-pass-new');

        if (targetNameEl) targetNameEl.textContent = name;
        if (inputPass) inputPass.value = 'felino' + Math.floor(Math.random() * 900 + 100);
        if (modal) modal.style.display = 'flex';
    };

    const modalResetPass = document.getElementById('modal-gm-reset-password');
    const btnCloseResetPassX = document.getElementById('btn-close-reset-pass-x');
    const btnCancelResetPass = document.getElementById('btn-cancel-reset-pass');
    const btnConfirmResetPass = document.getElementById('btn-confirm-reset-pass');
    const btnGenResetPass = document.getElementById('btn-gen-reset-pass');

    const closeResetPassModal = () => { if (modalResetPass) modalResetPass.style.display = 'none'; };
    if (btnCloseResetPassX) btnCloseResetPassX.onclick = closeResetPassModal;
    if (btnCancelResetPass) btnCancelResetPass.onclick = closeResetPassModal;

    if (btnGenResetPass) {
        btnGenResetPass.onclick = () => {
            const input = document.getElementById('gm-reset-pass-new');
            if (input) input.value = 'felino' + Math.floor(Math.random() * 900 + 100);
        };
    }

    if (btnConfirmResetPass) {
        btnConfirmResetPass.onclick = async () => {
            if (!activeResetPassUid) return;
            const newPass = (document.getElementById('gm-reset-pass-new')?.value || '').trim();
            if (newPass.length < 4) {
                alert("A nova senha deve ter no mínimo 4 caracteres!");
                return;
            }

            btnConfirmResetPass.disabled = true;
            btnConfirmResetPass.textContent = 'Salvando...';
            try {
                const res = await resetAccountPassword(activeResetPassUid, newPass);
                if (res.success) {
                    showGMToast(`🔑 Senha da conta atualizada com sucesso para "${newPass}"!`);
                    closeResetPassModal();
                } else {
                    alert("Erro ao redefinir senha: " + (res.reason || 'Desconhecido'));
                }
            } catch(err) {
                alert("Erro: " + err.message);
            } finally {
                btnConfirmResetPass.disabled = false;
                btnConfirmResetPass.textContent = '💾 Atualizar Senha';
            }
        };
    }

    // --- Excluir Conta Permanentemente ---
    window.gmActionDeleteAccount = async (uid, name) => {
        if (!confirm(`⚠️ ATENÇÃO: Deseja realmente EXCLUIR permanentemente a conta de "${name}" (${uid})?\n\nTodos os dados de vila, edifícios, tropas e itens serão apagados!`)) {
            return;
        }
        showGMToast(`🗑️ Excluindo conta de "${name}"...`);
        try {
            const res = await deleteAccountPermanently(uid);
            if (res.success) {
                showGMToast(`✅ Conta de "${name}" excluída com sucesso!`);
                const modalAccDetails = document.getElementById('modal-gm-account-details');
                if (modalAccDetails) modalAccDetails.style.display = 'none';
                await loadAndRenderAccounts();
                await refreshGMOverview();
            } else {
                alert("Não foi possível excluir a conta completamente.");
            }
        } catch(err) {
            alert("Erro ao excluir conta: " + err.message);
        }
    };

    // Create Account Modal Handlers (Presets & Form)
    const modalCreateAcc = document.getElementById('modal-gm-create-account');
    const btnOpenCreateAcc = document.getElementById('btn-gm-open-create-account');
    const btnCloseCreateAccX = document.getElementById('btn-close-create-acc-x');
    const btnCancelCreateAcc = document.getElementById('btn-cancel-create-account');
    const formCreateAcc = document.getElementById('gm-form-create-account');

    if (btnOpenCreateAcc && modalCreateAcc) {
        btnOpenCreateAcc.onclick = () => {
            modalCreateAcc.style.display = 'flex';
            const nameInput = document.getElementById('gm-ca-name') || document.getElementById('gm-new-name');
            if (nameInput) nameInput.focus();
        };
    }

    const closeCreateAccModal = () => {
        if (modalCreateAcc) modalCreateAcc.style.display = 'none';
    };

    if (btnCloseCreateAccX) btnCloseCreateAccX.onclick = closeCreateAccModal;
    if (btnCancelCreateAcc) btnCancelCreateAcc.onclick = closeCreateAccModal;

    // Presets in Create Account Modal
    const btnCaPresetPlayer = document.getElementById('btn-gm-ca-preset-player');
    if (btnCaPresetPlayer) {
        btnCaPresetPlayer.onclick = () => {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            setVal('gm-ca-role', 'player');
            setVal('gm-ca-level', 1);
            setVal('gm-ca-fish', 500);
            setVal('gm-ca-wood', 300);
            setVal('gm-ca-wool', 50);
            setVal('gm-ca-stone', 0);
            setVal('gm-ca-coal', 0);
            setVal('gm-ca-iron', 0);
            setVal('gm-ca-gold', 250);
            setVal('gm-ca-diamonds', 10);
        };
    }

    const btnCaPresetMid = document.getElementById('btn-gm-ca-preset-mid');
    if (btnCaPresetMid) {
        btnCaPresetMid.onclick = () => {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            setVal('gm-ca-role', 'player');
            setVal('gm-ca-level', 15);
            setVal('gm-ca-fish', 3000);
            setVal('gm-ca-wood', 3000);
            setVal('gm-ca-wool', 500);
            setVal('gm-ca-stone', 400);
            setVal('gm-ca-coal', 200);
            setVal('gm-ca-iron', 200);
            setVal('gm-ca-gold', 2000);
            setVal('gm-ca-diamonds', 50);
        };
    }

    const btnCaPresetAdmin = document.getElementById('btn-gm-ca-preset-admin');
    if (btnCaPresetAdmin) {
        btnCaPresetAdmin.onclick = () => {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            setVal('gm-ca-role', 'admin');
            setVal('gm-ca-level', 50);
            setVal('gm-ca-fish', 50000);
            setVal('gm-ca-wood', 50000);
            setVal('gm-ca-wool', 10000);
            setVal('gm-ca-stone', 10000);
            setVal('gm-ca-coal', 5000);
            setVal('gm-ca-iron', 5000);
            setVal('gm-ca-gold', 100000);
            setVal('gm-ca-diamonds', 5000);
        };
    }

    const btnCaGenPass = document.getElementById('btn-gm-ca-gen-pass');
    if (btnCaGenPass) {
        btnCaGenPass.onclick = () => {
            const input = document.getElementById('gm-ca-password') || document.getElementById('gm-new-password');
            if (input) input.value = 'felino' + Math.floor(Math.random() * 900 + 100);
        };
    }

    if (formCreateAcc) {
        formCreateAcc.onsubmit = async (e) => {
            e.preventDefault();
            const role = document.getElementById('gm-ca-role')?.value || document.getElementById('gm-new-role')?.value || 'player';
            const email = (document.getElementById('gm-ca-email')?.value || document.getElementById('gm-new-email')?.value || '').trim().toLowerCase();
            const password = (document.getElementById('gm-ca-password')?.value || document.getElementById('gm-new-password')?.value || '').trim();
            const name = (document.getElementById('gm-ca-name')?.value || document.getElementById('gm-new-name')?.value || '').trim();
            const tribe = document.getElementById('gm-ca-tribe')?.value || document.getElementById('gm-new-tribe')?.value || 'Os Pata-Dourada';
            const level = Math.max(1, parseInt(document.getElementById('gm-ca-level')?.value || '1', 10));

            if (!email || !password || !name) {
                alert("Por favor, preencha todos os campos obrigatórios (E-mail, Senha e Nome do Líder)!");
                return;
            }

            if (password.length < 4) {
                alert("A senha deve ter no mínimo 4 caracteres!");
                return;
            }

            const resources = {
                fish: Math.max(0, parseInt(document.getElementById('gm-ca-fish')?.value || document.getElementById('gm-new-fish')?.value || '500', 10)),
                wood: Math.max(0, parseInt(document.getElementById('gm-ca-wood')?.value || document.getElementById('gm-new-wood')?.value || '300', 10)),
                wool: Math.max(0, parseInt(document.getElementById('gm-ca-wool')?.value || '50', 10)),
                stone: Math.max(0, parseInt(document.getElementById('gm-ca-stone')?.value || '0', 10)),
                coal: Math.max(0, parseInt(document.getElementById('gm-ca-coal')?.value || '0', 10)),
                iron: Math.max(0, parseInt(document.getElementById('gm-ca-iron')?.value || '0', 10)),
                gold: Math.max(0, parseInt(document.getElementById('gm-ca-gold')?.value || document.getElementById('gm-new-gold')?.value || '250', 10)),
                diamonds: Math.max(0, parseInt(document.getElementById('gm-ca-diamonds')?.value || document.getElementById('gm-new-diamonds')?.value || '10', 10))
            };

            const btnSubmit = document.getElementById('btn-submit-create-account');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Criando Conta...';
            }

            try {
                const res = await createAccountByGM({
                    role,
                    email,
                    password,
                    name,
                    tribe,
                    level,
                    resources
                });

                if (res.success) {
                    showGMToast(`🎉 Conta ${role === 'admin' ? 'ADM' : 'de Jogador'} "${name}" (${email}) criada com sucesso!`);
                    await addGMLog('account', 'Conta Criada pelo GM', `Criada conta ${role === 'admin' ? 'ADM' : 'Jogador'} para ${email} (${name}) nível ${level}.`);
                    formCreateAcc.reset();
                    closeCreateAccModal();
                    await loadAndRenderAccounts();
                    await refreshGMOverview();
                } else {
                    alert("Erro ao criar conta: " + (res.reason || res.error || 'Erro desconhecido.'));
                }
            } catch(err) {
                alert("Erro ao criar conta: " + err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = '✨ Criar Conta no Reino';
                }
            }
        };
    }

    // Ban Confirm Button
    const btnConfirmBan = document.getElementById('btn-confirm-ban');
    const btnCancelBan = document.getElementById('btn-cancel-ban');
    const modalBan = document.getElementById('modal-gm-ban');

    if (btnConfirmBan) {
        btnConfirmBan.onclick = async () => {
            if (!activeBanTargetUid) return;
            const reason = document.getElementById('gm-ban-reason-input')?.value.trim() || 'Violação das regras do reino imposta pelo GM.';
            btnConfirmBan.disabled = true;
            btnConfirmBan.textContent = 'Banindo...';
            const res = await banAccount(activeBanTargetUid, reason);
            btnConfirmBan.disabled = false;
            btnConfirmBan.textContent = 'Confirmar Banimento';
            if (modalBan) modalBan.style.display = 'none';

            if (res.success) {
                showGMToast("🚫 Conta banida com sucesso!");
                await addGMLog('ban', 'Conta Banida', `UID ${activeBanTargetUid} foi banido. Motivo: ${reason}`);
                await loadAndRenderAccounts();
                refreshGMOverview();
            } else {
                alert("Erro ao banir conta: " + res.reason);
            }
        };
    }
    if (btnCancelBan && modalBan) {
        btnCancelBan.onclick = () => { modalBan.style.display = 'none'; };
    }

    // Gift Confirm Button
    const btnConfirmGift = document.getElementById('btn-confirm-gift');
    const btnCancelGift = document.getElementById('btn-cancel-gift');
    const modalGift = document.getElementById('modal-gm-gift');

    if (btnConfirmGift) {
        btnConfirmGift.onclick = async () => {
            if (!activeGiftTargetUid) return;
            const gold = parseInt(document.getElementById('gm-gift-gold')?.value || '0', 10);
            const diamonds = parseInt(document.getElementById('gm-gift-diamonds')?.value || '0', 10);

            btnConfirmGift.disabled = true;
            btnConfirmGift.textContent = 'Enviando...';
            const res = await giftAccount(activeGiftTargetUid, { gold, diamonds });
            btnConfirmGift.disabled = false;
            btnConfirmGift.textContent = 'Conceder Recursos';
            if (modalGift) modalGift.style.display = 'none';

            if (res.success) {
                showGMToast(`🎁 Recursos enviados com sucesso! (+${gold} Ouro, +${diamonds} Diamantes)`);
                await addGMLog('gift', 'Presente Enviado', `UID ${activeGiftTargetUid} recebeu +${gold} ouro e +${diamonds} diamantes.`);
                await loadAndRenderAccounts();
            } else {
                alert("Erro ao enviar recursos: " + res.reason);
            }
        };
    }
    if (btnCancelGift && modalGift) {
        btnCancelGift.onclick = () => { modalGift.style.display = 'none'; };
    }

    // Search and Filter Listeners
    const searchInput = document.getElementById('gm-acc-search');
    const statusSelect = document.getElementById('gm-acc-filter-status');
    const roleSelect = document.getElementById('gm-acc-filter-role');
    const sortSelect = document.getElementById('gm-acc-sort');
    if (searchInput) searchInput.oninput = () => renderAccountsTable(currentAccountsList);
    if (statusSelect) statusSelect.onchange = () => renderAccountsTable(currentAccountsList);
    if (roleSelect) roleSelect.onchange = () => renderAccountsTable(currentAccountsList);
    if (sortSelect) sortSelect.onchange = () => renderAccountsTable(currentAccountsList);
}

// --- Village Creation Modal (Custom Villages for Testing) ---
function setupGMVillageCreationModal() {
    const btnOpen = document.getElementById('btn-gm-open-create-village');
    const modal = document.getElementById('modal-gm-create-village');
    const btnCancel = document.getElementById('btn-cancel-create-village');
    const form = document.getElementById('gm-form-create-village');
    const btnCreateAndPlay = document.getElementById('btn-submit-create-and-play');

    if (btnOpen && modal) {
        btnOpen.onclick = () => {
            modal.style.display = 'flex';
            const nameInput = document.getElementById('gm-village-name');
            if (nameInput) {
                nameInput.value = 'Reino Felino ' + Math.floor(Math.random() * 900 + 100);
                nameInput.focus();
            }
        };
    }

    if (btnCancel && modal) {
        btnCancel.onclick = () => { modal.style.display = 'none'; };
    }

    async function handleCreateVillage(shouldPlayImmediately = false) {
        const name = document.getElementById('gm-village-name')?.value.trim();
        if (!name) {
            alert("Por favor, digite um nome para a vila.");
            return;
        }

        const tribe = document.getElementById('gm-village-tribe')?.value || 'Os Pata-Dourada';
        const level = parseInt(document.getElementById('gm-village-level')?.value || '1', 10);

        const initialResources = {
            fish: Math.max(0, parseInt(document.getElementById('gm-cv-fish')?.value || '300', 10)),
            wood: Math.max(0, parseInt(document.getElementById('gm-cv-wood')?.value || '300', 10)),
            wool: Math.max(0, parseInt(document.getElementById('gm-cv-wool')?.value || '50', 10)),
            stone: Math.max(0, parseInt(document.getElementById('gm-cv-stone')?.value || '50', 10)),
            coal: Math.max(0, parseInt(document.getElementById('gm-cv-coal')?.value || '20', 10)),
            iron: Math.max(0, parseInt(document.getElementById('gm-cv-iron')?.value || '20', 10)),
            gold: Math.max(0, parseInt(document.getElementById('gm-cv-gold')?.value || '250', 10)),
            diamonds: Math.max(0, parseInt(document.getElementById('gm-cv-diamonds')?.value || '15', 10))
        };

        const submitBtn = document.getElementById('btn-submit-create-village');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Criando...'; }
        if (btnCreateAndPlay) { btnCreateAndPlay.disabled = true; }

        try {
            const newAcc = await createCustomVillage({
                name,
                tribe,
                level,
                resources: initialResources
            });

            showGMToast(`🏰 Vila "${name}" criada com sucesso no banco de dados!`);
            await addGMLog('village', 'Vila Personalizada Criada', `Vila "${name}" (${tribe}, Nv. ${level}) criada com sucesso.`);

            if (modal) modal.style.display = 'none';
            await loadAndRenderAccounts();
            await refreshGMOverview();

            if (shouldPlayImmediately && newAcc && newAcc.uid) {
                await window.gmActionPlayVillage(newAcc.uid, name);
            }
        } catch(e) {
            alert("Erro ao criar vila: " + e.message);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✨ Criar Vila'; }
            if (btnCreateAndPlay) { btnCreateAndPlay.disabled = false; }
        }
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await handleCreateVillage(false);
        };
    }

    if (btnCreateAndPlay) {
        btnCreateAndPlay.onclick = async (e) => {
            e.preventDefault();
            await handleCreateVillage(true);
        };
    }
}

// --- Item Management Tab ---
function setupGMItemManagement() {
    renderGMCatalog();

    // Emoji preset selection
    document.querySelectorAll('.gm-item-emoji-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gm-item-emoji-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const iconInput = document.getElementById('gm-item-icon');
            if (iconInput) iconInput.value = btn.getAttribute('data-emoji');
        });
    });

    // Auto-generate ID helper based on name
    const nameInput = document.getElementById('gm-item-name');
    const idInput = document.getElementById('gm-item-id');
    if (nameInput && idInput) {
        nameInput.addEventListener('input', () => {
            if (!idInput.dataset.manual) {
                const slug = nameInput.value.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .substring(0, 20);
                idInput.value = slug ? `item_${slug}` : '';
            }
        });
        idInput.addEventListener('input', () => {
            idInput.dataset.manual = 'true';
        });
    }

    // Create Item Form Submit
    const form = document.getElementById('gm-create-item-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = (document.getElementById('gm-item-id')?.value || '').trim();
            const name = (document.getElementById('gm-item-name')?.value || '').trim();
            const slot = document.getElementById('gm-item-slot')?.value || 'weapon';
            const rarity = document.getElementById('gm-item-rarity')?.value || 'common';
            const icon = (document.getElementById('gm-item-icon')?.value || '⚔️').trim();
            const desc = (document.getElementById('gm-item-desc')?.value || '').trim();
            const minQuartel = parseInt(document.getElementById('gm-item-quartel')?.value || '1', 10);

            const strength = parseInt(document.getElementById('gm-item-str')?.value || '0', 10);
            const dexterity = parseInt(document.getElementById('gm-item-dex')?.value || '0', 10);
            const intelligence = parseInt(document.getElementById('gm-item-int')?.value || '0', 10);
            const stamina = parseInt(document.getElementById('gm-item-sta')?.value || '0', 10);
            const hp = parseInt(document.getElementById('gm-item-hp')?.value || '0', 10);

            if (!id || !name) {
                alert("Preencha o ID e o Nome do item!");
                return;
            }

            const stats = {};
            if (strength > 0) stats.strength = strength;
            if (dexterity > 0) stats.dexterity = dexterity;
            if (intelligence > 0) stats.intelligence = intelligence;
            if (stamina > 0) stats.stamina = stamina;
            if (hp > 0) stats.hp = hp;

            const newItem = {
                id,
                name,
                slot,
                rarity,
                icon,
                desc: desc || 'Item lendário forjado pelos deuses felinos sob comando do GM.',
                minQuartel,
                stats,
                isCustom: true,
                createdAt: Date.now()
            };

            const btnSubmit = document.getElementById('btn-submit-item');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Salvando no Reino...';
            }

            try {
                await registerCustomItem(newItem);
                showGMToast(`✨ Item "${name}" cadastrado com sucesso e integrado ao jogo!`);
                form.reset();
                if (idInput) delete idInput.dataset.manual;
                renderGMCatalog();
                refreshGMOverview();
            } catch(err) {
                alert("Erro ao cadastrar item: " + err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = '✨ Cadastrar Item no Reino';
                }
            }
        });
    }

    // Toggle Item Active/Inactive
    window.gmActionToggleItemActive = async (itemId) => {
        try {
            const res = await toggleItemActive(itemId);
            if (res.success) {
                showGMToast(res.active ? `🟢 Item ATIVADO! Agora pode dropar na Torre de Desafios.` : `⚪ Item DESATIVADO. Não cairá mais na Torre.`);
                await addGMLog('item', res.active ? 'Item Ativado' : 'Item Desativado', `Item ${itemId} agora está ${res.active ? 'ATIVO' : 'INATIVO'}.`);
                renderGMCatalog();
            } else {
                alert("Erro ao alternar status do item: " + (res.reason || 'Desconhecido'));
            }
        } catch(e) {
            alert("Erro: " + e.message);
        }
    };

    // Edit Item Modal Handlers
    const modalEditItem = document.getElementById('modal-gm-edit-item');
    const formEditItem = document.getElementById('gm-form-edit-item');
    const btnCloseEditItemX = document.getElementById('btn-close-edit-item-x');
    const btnCancelEditItem = document.getElementById('btn-cancel-edit-item');

    const closeEditItemModal = () => {
        if (modalEditItem) modalEditItem.style.display = 'none';
    };

    if (btnCloseEditItemX) btnCloseEditItemX.onclick = closeEditItemModal;
    if (btnCancelEditItem) btnCancelEditItem.onclick = closeEditItemModal;

    window.gmActionOpenEditItem = (itemId) => {
        const item = ITEM_DATABASE.find(i => i.id === itemId);
        if (!item) {
            alert("Item não encontrado no catálogo!");
            return;
        }

        const idInput = document.getElementById('gm-ei-id') || document.getElementById('gm-edit-item-id');
        const nameInput = document.getElementById('gm-ei-name') || document.getElementById('gm-edit-item-name');
        const slotSelect = document.getElementById('gm-ei-slot') || document.getElementById('gm-edit-item-slot');
        const raritySelect = document.getElementById('gm-ei-rarity') || document.getElementById('gm-edit-item-rarity');
        const iconInput = document.getElementById('gm-ei-icon') || document.getElementById('gm-edit-item-icon');
        const quartelInput = document.getElementById('gm-ei-quartel') || document.getElementById('gm-edit-item-quartel');
        const descInput = document.getElementById('gm-ei-desc') || document.getElementById('gm-edit-item-desc');
        const activeCheck = document.getElementById('gm-ei-active') || document.getElementById('gm-edit-item-active');

        const strInput = document.getElementById('gm-ei-str') || document.getElementById('gm-edit-item-str');
        const dexInput = document.getElementById('gm-ei-dex') || document.getElementById('gm-edit-item-dex');
        const intInput = document.getElementById('gm-ei-int') || document.getElementById('gm-edit-item-int');
        const staInput = document.getElementById('gm-ei-sta') || document.getElementById('gm-edit-item-sta');
        const hpInput = document.getElementById('gm-ei-hp') || document.getElementById('gm-edit-item-hp');

        if (idInput) idInput.value = item.id;
        if (nameInput) nameInput.value = item.name || '';
        if (slotSelect) slotSelect.value = item.slot || 'weapon';
        if (raritySelect) raritySelect.value = item.rarity || 'common';
        if (iconInput) iconInput.value = item.icon || '⚔️';
        if (quartelInput) quartelInput.value = item.minQuartel || 1;
        if (descInput) descInput.value = item.desc || '';
        if (activeCheck) activeCheck.checked = item.active !== false;

        const stats = item.stats || {};
        if (strInput) strInput.value = stats.strength || 0;
        if (dexInput) dexInput.value = stats.dexterity || 0;
        if (intInput) intInput.value = stats.intelligence || 0;
        if (staInput) staInput.value = stats.stamina || 0;
        if (hpInput) hpInput.value = stats.hp || 0;

        if (modalEditItem) modalEditItem.style.display = 'flex';
    };

    if (formEditItem) {
        formEditItem.onsubmit = async (e) => {
            e.preventDefault();
            const itemId = (document.getElementById('gm-ei-id') || document.getElementById('gm-edit-item-id'))?.value;
            if (!itemId) return;

            const name = ((document.getElementById('gm-ei-name') || document.getElementById('gm-edit-item-name'))?.value || '').trim();
            const slot = (document.getElementById('gm-ei-slot') || document.getElementById('gm-edit-item-slot'))?.value || 'weapon';
            const rarity = (document.getElementById('gm-ei-rarity') || document.getElementById('gm-edit-item-rarity'))?.value || 'common';
            const icon = ((document.getElementById('gm-ei-icon') || document.getElementById('gm-edit-item-icon'))?.value || '⚔️').trim();
            const minQuartel = Math.max(1, parseInt((document.getElementById('gm-ei-quartel') || document.getElementById('gm-edit-item-quartel'))?.value || '1', 10));
            const desc = ((document.getElementById('gm-ei-desc') || document.getElementById('gm-edit-item-desc'))?.value || '').trim();
            const active = !!(document.getElementById('gm-ei-active') || document.getElementById('gm-edit-item-active'))?.checked;

            const stats = {};
            const str = parseInt((document.getElementById('gm-ei-str') || document.getElementById('gm-edit-item-str'))?.value || '0', 10);
            const dex = parseInt((document.getElementById('gm-ei-dex') || document.getElementById('gm-edit-item-dex'))?.value || '0', 10);
            const intVal = parseInt((document.getElementById('gm-ei-int') || document.getElementById('gm-edit-item-int'))?.value || '0', 10);
            const sta = parseInt((document.getElementById('gm-ei-sta') || document.getElementById('gm-edit-item-sta'))?.value || '0', 10);
            const hp = parseInt((document.getElementById('gm-ei-hp') || document.getElementById('gm-edit-item-hp'))?.value || '0', 10);

            if (str > 0) stats.strength = str;
            if (dex > 0) stats.dexterity = dex;
            if (intVal > 0) stats.intelligence = intVal;
            if (sta > 0) stats.stamina = sta;
            if (hp > 0) stats.hp = hp;

            const btnSubmit = document.getElementById('btn-submit-edit-item');
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Salvando...'; }

            try {
                const res = await updateCustomItem(itemId, {
                    name,
                    slot,
                    rarity,
                    icon,
                    minQuartel,
                    desc,
                    active,
                    stats
                });

                if (res.success) {
                    showGMToast(`✅ Item "${name}" atualizado com sucesso no catálogo!`);
                    await addGMLog('item', 'Item Editado', `Item ${itemId} (${name}) foi atualizado pelo GM.`);
                    closeEditItemModal();
                    renderGMCatalog();
                } else {
                    alert("Erro ao salvar item: " + (res.reason || 'Erro desconhecido.'));
                }
            } catch(err) {
                alert("Erro ao editar item: " + err.message);
            } finally {
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = '💾 Salvar Alterações no Item'; }
            }
        };
    }

    // Expose delete custom item
    window.gmActionDeleteItem = async (itemId, itemName) => {
        if (!confirm(`Deseja realmente remover o item "${itemName}" do catálogo?`)) return;
        try {
            await deleteCustomItem(itemId);
            showGMToast(`🗑️ Item "${itemName}" removido do catálogo!`);
            renderGMCatalog();
            refreshGMOverview();
        } catch(e) {
            alert("Erro ao deletar item: " + e.message);
        }
    };

    // Catalog Filter Listeners
    const filterSlot = document.getElementById('gm-catalog-filter-slot');
    const filterRarity = document.getElementById('gm-catalog-filter-rarity');
    if (filterSlot) filterSlot.onchange = () => renderGMCatalog();
    if (filterRarity) filterRarity.onchange = () => renderGMCatalog();
}

function renderGMCatalog() {
    const catalogGrid = document.getElementById('gm-catalog-grid');
    if (!catalogGrid) return;

    const filterSlot = document.getElementById('gm-catalog-filter-slot')?.value || 'all';
    const filterRarity = document.getElementById('gm-catalog-filter-rarity')?.value || 'all';

    const items = ITEM_DATABASE.filter(item => {
        const matchesSlot = filterSlot === 'all' || item.slot === filterSlot;
        const matchesRarity = filterRarity === 'all' || item.rarity === filterRarity;
        return matchesSlot && matchesRarity;
    });

    if (items.length === 0) {
        catalogGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 30px; color: var(--text-secondary);">Nenhum item encontrado nesta categoria.</div>';
        return;
    }

    catalogGrid.innerHTML = items.map(item => {
        const isCustom = !!item.isCustom;
        const isActive = item.active !== false;
        const rarityBadgeClass = `rarity-${item.rarity}`;
        
        const statsStr = Object.entries(item.stats || {})
            .map(([stat, val]) => {
                const statIcons = { strength: '⚔️ Força', dexterity: '🏹 Destreza', intelligence: '🔮 Magia', stamina: '⚡ Vigor', hp: '❤️ Vida' };
                return `<span>${statIcons[stat] || stat}: +${val}</span>`;
            })
            .join(' | ') || 'Sem bônus diretos';

        return `
            <div class="gm-item-card ${rarityBadgeClass} ${isCustom ? 'custom-item-card' : ''} ${!isActive ? 'item-inactive-card' : ''}">
                <div class="gm-item-header">
                    <div class="gm-item-icon-box">${item.icon}</div>
                    <div class="gm-item-meta">
                        <h4>${escapeHtml(item.name)}</h4>
                        <div class="gm-item-badges">
                            <span class="badge-rarity ${rarityBadgeClass}">${item.rarity.toUpperCase()}</span>
                            <span class="badge-slot">${item.slot}</span>
                            <span class="badge-item-status ${isActive ? 'badge-active' : 'badge-inactive'}">${isActive ? '🟢 Ativo' : '⚪ Inativo'}</span>
                            ${isCustom ? '<span class="badge-custom">⚙️ GM Custom</span>' : ''}
                        </div>
                    </div>
                </div>
                <p class="gm-item-desc">${escapeHtml(item.desc)}</p>
                <div class="gm-item-stats">${statsStr}</div>
                <div class="gm-item-footer">
                    <small>ID: <code>${item.id}</code> | Quartel: Nv. ${item.minQuartel || 1}</small>
                    <div style="display: flex; gap: 6px; align-items: center; margin-left: auto;">
                        <button type="button" class="btn btn-sm ${isActive ? 'btn-deactivate-item' : 'btn-activate-item'}" style="${isActive ? 'background: rgba(189,195,199,0.3); color: var(--text-primary);' : 'background: #27ae60; color: #fff;'}" onclick="window.gmActionToggleItemActive('${item.id}')" title="Alternar se o item pode dropar na Torre">
                            ${isActive ? '⚪ Desativar' : '🟢 Ativar'}
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.gmActionOpenEditItem('${item.id}')" title="Editar atributos, quartel ou nome deste item">
                            ✏️ Editar
                        </button>
                        ${isCustom ? `<button class="btn btn-sm btn-delete-item" onclick="window.gmActionDeleteItem('${item.id}', '${escapeHtml(item.name)}')">🗑️ Excluir</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- News and Broadcast Tab (Redesigned with Live Mockups) ---
async function setupGMNewsAndBroadcast() {
    const newsTextarea = document.getElementById('gm-editor-news-text');
    const mockNewsContent = document.getElementById('mock-news-content');
    const newsCharCount = document.getElementById('gm-news-char-count');

    function updateNewsPreview() {
        const text = newsTextarea?.value || '';
        if (newsCharCount) newsCharCount.textContent = `${text.length} caracteres`;
        if (mockNewsContent) {
            mockNewsContent.innerHTML = text 
                ? escapeHtml(text).replace(/\n/g, '<br>') 
                : '<span style="color: var(--text-secondary); font-style: italic;">Nenhuma notícia publicada ainda.</span>';
        }
    }

    if (newsTextarea) {
        newsTextarea.oninput = updateNewsPreview;
    }

    // Quick Tag Chips Click Handlers
    document.querySelectorAll('.gm-tag-chip').forEach(chip => {
        chip.onclick = () => {
            const tag = chip.dataset.tag || chip.getAttribute('data-tag');
            if (tag && newsTextarea) {
                const cur = newsTextarea.value;
                const sep = cur && !cur.endsWith('\n') ? '\n' : '';
                newsTextarea.value = cur + sep + tag + ' ';
                updateNewsPreview();
                newsTextarea.focus();
            }
        };
    });

    // 1. Load current login screen news (com fallback offline/local)
    try {
        const docRef = doc(db, "global", "news");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && newsTextarea) {
            newsTextarea.value = docSnap.data().text || '';
            updateNewsPreview();
        } else {
            const localNews = localStorage.getItem('felineas_global_news');
            if (localNews && newsTextarea) {
                newsTextarea.value = localNews;
                updateNewsPreview();
            }
        }
    } catch(e) {
        console.warn("Aviso ao carregar notícia de login do Firestore, usando local:", e);
        const localNews = localStorage.getItem('felineas_global_news');
        if (localNews && newsTextarea) {
            newsTextarea.value = localNews;
            updateNewsPreview();
        }
    }

    // Save News Button (com fallback seguro a erros de permissão do Firestore)
    const btnSaveLoginNews = document.getElementById('btn-save-login-news');
    if (btnSaveLoginNews) {
        btnSaveLoginNews.onclick = async () => {
            const text = newsTextarea?.value || '';
            btnSaveLoginNews.disabled = true;
            btnSaveLoginNews.textContent = 'Publicando...';

            let savedOnline = false;
            try {
                await setDoc(doc(db, "global", "news"), {
                    text: text,
                    updatedAt: Date.now(),
                    updatedBy: 'GM'
                });
                savedOnline = true;
            } catch(e) {
                console.warn("Aviso de permissão Firestore na notícia:", e);
            }

            // Sempre salva no backup local para nunca falhar a experiência
            try {
                localStorage.setItem('felineas_global_news', text);
            } catch(e) {}

            await addGMLog('news', 'Notícia Publicada', 'Notícia da tela de entrada atualizada pelo GM.');

            if (savedOnline) {
                showGMToast("📢 Notícia da tela de login publicada com sucesso no banco de dados!");
            } else {
                showGMToast("⚠️ Notícia salva localmente! (No Firebase, libere regras de escrita para 'global/news' para sincronizar online)");
            }

            // Atualiza o preview na tela de login imediatamente
            const loginNewsText = document.getElementById('login-news-text');
            const loginNewsBox = document.getElementById('login-news-box');
            if (loginNewsText && loginNewsBox) {
                loginNewsBox.style.display = text ? 'block' : 'none';
                loginNewsText.innerHTML = text.replace(/\n/g, '<br>');
            }

            btnSaveLoginNews.disabled = false;
            btnSaveLoginNews.textContent = '📢 Publicar Notícia no Login';
        };
    }

    // 2. Broadcast Alert Setup & Live Preview
    const broadcastInput = document.getElementById('gm-broadcast-text');
    const broadcastToggle = document.getElementById('gm-broadcast-active');
    const btnSaveBroadcast = document.getElementById('btn-save-broadcast');
    const mockBroadcastBanner = document.getElementById('mock-broadcast-banner');
    const mockBroadcastText = document.getElementById('mock-broadcast-text');

    function updateBroadcastPreview() {
        const text = broadcastInput?.value.trim() || 'Exemplo de alerta global';
        const active = !!broadcastToggle?.checked;
        if (mockBroadcastText) mockBroadcastText.textContent = text;
        if (mockBroadcastBanner) {
            mockBroadcastBanner.style.opacity = active ? '1' : '0.35';
        }
    }

    if (broadcastInput) broadcastInput.oninput = updateBroadcastPreview;
    if (broadcastToggle) broadcastToggle.onchange = updateBroadcastPreview;

    const settings = getGlobalSettings();
    if (settings.broadcast) {
        if (broadcastInput) broadcastInput.value = settings.broadcast.text || '';
        if (broadcastToggle) broadcastToggle.checked = !!settings.broadcast.active;
        updateBroadcastPreview();
    }

    if (btnSaveBroadcast) {
        btnSaveBroadcast.onclick = async () => {
            const text = broadcastInput?.value.trim() || '';
            const active = !!broadcastToggle?.checked;

            btnSaveBroadcast.disabled = true;
            btnSaveBroadcast.textContent = 'Transmitindo...';
            try {
                await saveGlobalSettings({
                    broadcast: {
                        active: active,
                        text: text,
                        updatedAt: Date.now()
                    }
                });
                await addGMLog('news', 'Transmissão Global', active ? `Alerta transmitido: "${text}"` : 'Transmissão global desativada.');
                showGMToast(active ? "📡 Alerta global transmitido para todos os jogadores!" : "🔕 Transmissão global desativada.");
                refreshGMOverview();
            } catch(e) {
                alert("Erro ao transmitir alerta: " + e.message);
            } finally {
                btnSaveBroadcast.disabled = false;
                btnSaveBroadcast.textContent = '📡 Transmitir Mensagem Global';
            }
        };
    }
}

// --- Logs & Audit Tab ---
let currentLogsList = [];

async function setupGMLogs() {
    const filterCat = document.getElementById('gm-logs-filter-cat');
    const searchInput = document.getElementById('gm-logs-search');
    const btnRefresh = document.getElementById('btn-gm-refresh-logs');
    const btnExport = document.getElementById('btn-gm-export-logs');
    const btnClear = document.getElementById('btn-gm-clear-logs');

    if (filterCat) filterCat.onchange = () => renderGMLogsList();
    if (searchInput) searchInput.oninput = () => renderGMLogsList();

    if (btnRefresh) {
        btnRefresh.onclick = async () => {
            btnRefresh.textContent = 'Carregando...';
            await refreshGMLogs();
            btnRefresh.textContent = '🔄 Recarregar Logs';
        };
    }

    if (btnExport) {
        btnExport.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLogsList, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `felineas_gm_logs_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showGMToast("📥 Histórico de logs exportado com sucesso em JSON!");
        };
    }

    if (btnClear) {
        btnClear.onclick = async () => {
            if (!confirm("Tem certeza que deseja apagar todos os logs de auditoria do sistema? Esta ação não pode ser desfeita.")) return;
            await clearGMLogs();
            showGMToast("🗑️ Logs de auditoria limpos.");
            await refreshGMLogs();
        };
    }

    await refreshGMLogs();
}

async function refreshGMLogs() {
    currentLogsList = await getGMLogs();
    renderGMLogsList();
}

function renderGMLogsList() {
    const tbody = document.getElementById('gm-logs-table-body');
    if (!tbody) return;

    const filterCat = document.getElementById('gm-logs-filter-cat')?.value || 'all';
    const searchTerm = (document.getElementById('gm-logs-search')?.value || '').toLowerCase().trim();

    const filtered = currentLogsList.filter(log => {
        const matchesCat = filterCat === 'all' || log.category === filterCat;
        const matchesSearch = !searchTerm || 
            (log.action && log.action.toLowerCase().includes(searchTerm)) ||
            (log.details && log.details.toLowerCase().includes(searchTerm)) ||
            (log.author && log.author.toLowerCase().includes(searchTerm));
        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-secondary);">Nenhum log registrado com os filtros selecionados.</td></tr>';
        return;
    }

    const categoryLabels = {
        rates: { label: '🌾 Farm', class: 'cat-rates' },
        timing: { label: '⏱️ Tempos', class: 'cat-timing' },
        account: { label: '👥 Contas', class: 'cat-account' },
        village: { label: '🏰 Vilas', class: 'cat-village' },
        ban: { label: '🚫 Moderação', class: 'cat-ban' },
        gift: { label: '🎁 Presentes', class: 'cat-gift' },
        items: { label: '⚔️ Itens', class: 'cat-items' },
        news: { label: '📢 Notícias', class: 'cat-news' },
        system: { label: '⚙️ Sistema', class: 'cat-system' }
    };

    tbody.innerHTML = filtered.map(item => {
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : 'Data Indisponível';
        const catInfo = categoryLabels[item.category] || { label: item.category, class: 'cat-system' };

        return `
            <tr>
                <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</td>
                <td><span class="log-cat-badge ${catInfo.class}">${catInfo.label}</span></td>
                <td><strong>${escapeHtml(item.action)}</strong></td>
                <td style="font-size: 0.88rem; color: var(--wood-dark);">${escapeHtml(item.details)}</td>
                <td><span class="badge-level" style="font-size: 0.75rem;">${escapeHtml(item.author || 'GM')}</span></td>
            </tr>
        `;
    }).join('');
}

// --- Kingdom Global Statistics Tab ---
function setupGMStats() {
    const btnRefresh = document.getElementById('btn-gm-refresh-stats');
    if (btnRefresh) {
        btnRefresh.onclick = async () => {
            btnRefresh.textContent = 'Calculando...';
            await refreshGMStats();
            btnRefresh.textContent = '🔄 Atualizar Censo';
            showGMToast("📊 Censo e estatísticas globais atualizados!");
        };
    }

    const btnToggleFarm = document.getElementById('btn-gm-stats-toggle-farm');
    if (btnToggleFarm) {
        btnToggleFarm.onclick = async () => {
            const settings = getGlobalSettings();
            const willActivate = settings.farmBonusActive === false;
            const currentMult = (typeof settings.farmMultiplier === 'number' && settings.farmMultiplier > 0) ? settings.farmMultiplier : 1.0;
            await saveGlobalSettings({ farmBonusActive: willActivate, farmMultiplier: willActivate ? currentMult : 1.0 });
            await addGMLog('rates', willActivate ? 'Bônus Farm Reativado (Stats)' : 'Bônus Farm Desativado (Stats)',
                willActivate ? `Bônus de farm reativado em ${currentMult.toFixed(1)}x para todas as contas.` : 'Bônus de farm desativado para todas as contas (fixado em 1.0x / 100%).'
            );
            await refreshGMStats();
            refreshGMOverview();
            syncRateInputs();
            showGMToast(willActivate ? `⚡ Bônus global de farm ATIVADO em ${currentMult.toFixed(1)}x!` : "⏹️ Bônus global de farm DESATIVADO para todas as contas!");
        };
    }

    refreshGMStats();
}

async function refreshGMStats() {
    const accounts = currentAccountsList && currentAccountsList.length > 0 
        ? currentAccountsList 
        : await getAllAccounts();

    // 1. Consolidated Treasury
    let totalGold = 0, totalDiamonds = 0, totalFish = 0, totalWood = 0;
    let totalWool = 0, totalStone = 0, totalCoal = 0, totalIron = 0;
    let totalLevel = 0, maxLevel = 1, bannedCount = 0, totalBuildings = 0;

    const tribeCounts = {
        'Os Pata-Dourada': 0,
        'Os Viajantes Lunares': 0,
        'Os Rebeldes do Beco': 0
    };

    accounts.forEach(acc => {
        const r = acc.resources || acc;
        totalGold += Math.floor(r.gold || 0);
        totalDiamonds += Math.floor(r.diamonds || 0);
        totalFish += Math.floor(r.fish || 0);
        totalWood += Math.floor(r.wood || 0);
        totalWool += Math.floor(r.wool || 0);
        totalStone += Math.floor(r.stone || 0);
        totalCoal += Math.floor(r.coal || 0);
        totalIron += Math.floor(r.iron || 0);

        const lvl = parseInt(acc.level || 1, 10);
        totalLevel += lvl;
        if (lvl > maxLevel) maxLevel = lvl;

        if (acc.isBanned) bannedCount++;

        // Tribe count
        const tribe = acc.tribe || 'Os Pata-Dourada';
        tribeCounts[tribe] = (tribeCounts[tribe] || 0) + 1;

        // Buildings count
        if (acc.buildings && typeof acc.buildings === 'object') {
            totalBuildings += Object.keys(acc.buildings).length;
        } else {
            totalBuildings += 3; // base buildings default
        }
    });

    const totalAccounts = accounts.length || 1;
    const avgLevel = (totalLevel / totalAccounts).toFixed(1);
    const bannedPct = Math.round((bannedCount / totalAccounts) * 100);

    const fmt = n => Math.floor(n).toLocaleString('pt-BR');

    // Update treasury cards
    const elGold = document.getElementById('gm-stat-total-gold');
    const elDia = document.getElementById('gm-stat-total-diamonds');
    const elFish = document.getElementById('gm-stat-total-fish');
    const elWood = document.getElementById('gm-stat-total-wood');
    const elWool = document.getElementById('gm-stat-total-wool');
    const elStone = document.getElementById('gm-stat-total-stone');
    const elCoal = document.getElementById('gm-stat-total-coal');
    const elIron = document.getElementById('gm-stat-total-iron');

    if (elGold) elGold.textContent = fmt(totalGold);
    if (elDia) elDia.textContent = fmt(totalDiamonds);
    if (elFish) elFish.textContent = fmt(totalFish);
    if (elWood) elWood.textContent = fmt(totalWood);
    if (elWool) elWool.textContent = fmt(totalWool);
    if (elStone) elStone.textContent = fmt(totalStone);
    if (elCoal) elCoal.textContent = fmt(totalCoal);
    if (elIron) elIron.textContent = fmt(totalIron);

    // Update infrastructure metrics
    const elAvgLvl = document.getElementById('gm-stat-avg-level');
    const elMaxLvl = document.getElementById('gm-stat-max-level');
    const elBldgs = document.getElementById('gm-stat-total-buildings');
    const elBanned = document.getElementById('gm-stat-banned-pct');

    if (elAvgLvl) elAvgLvl.textContent = avgLevel;
    if (elMaxLvl) elMaxLvl.textContent = maxLevel;
    if (elBldgs) elBldgs.textContent = fmt(totalBuildings);
    if (elBanned) elBanned.textContent = `${bannedPct}% (${bannedCount} ban)`;

    // Update tribe distribution
    const tribeListEl = document.getElementById('gm-tribe-distribution-list');
    if (tribeListEl) {
        tribeListEl.innerHTML = Object.entries(tribeCounts).map(([tribe, count]) => {
            const pct = Math.round((count / totalAccounts) * 100);
            return `
                <div class="gm-tribe-stat-row">
                    <div class="tribe-info-row">
                        <strong>${escapeHtml(tribe)}</strong>
                        <span>${count} líderes (${pct}%)</span>
                    </div>
                    <div class="tribe-progress-bg">
                        <div class="tribe-progress-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Update Top 5 Leaderboards
    const rankRichestEl = document.getElementById('gm-rank-richest');
    if (rankRichestEl) {
        const sortedRichest = [...accounts].sort((a, b) => {
            const goldA = a.resources?.gold ?? a.gold ?? 0;
            const goldB = b.resources?.gold ?? b.gold ?? 0;
            return goldB - goldA;
        }).slice(0, 5);

        rankRichestEl.innerHTML = sortedRichest.map(acc => {
            const gold = Math.floor(acc.resources?.gold ?? acc.gold ?? 0).toLocaleString('pt-BR');
            return `
                <li class="gm-rank-item">
                    <span class="rank-name">${acc.avatar || '🐱'} <strong>${escapeHtml(acc.displayName)}</strong></span>
                    <span class="rank-badge gold">🪙 ${gold}</span>
                </li>
            `;
        }).join('');
    }

    const rankLevelsEl = document.getElementById('gm-rank-levels');
    if (rankLevelsEl) {
        const sortedLevels = [...accounts].sort((a, b) => (b.level || 1) - (a.level || 1)).slice(0, 5);

        rankLevelsEl.innerHTML = sortedLevels.map(acc => {
            return `
                <li class="gm-rank-item">
                    <span class="rank-name">${acc.avatar || '🐱'} <strong>${escapeHtml(acc.displayName)}</strong></span>
                    <span class="rank-badge level">Nv. ${acc.level || 1}</span>
                </li>
            `;
        }).join('');
    }

    // 🌾 Censo de Economia & Taxas de Farm em Vigor
    const settings = getGlobalSettings();
    const isFarmBonusActive = settings.farmBonusActive !== false;
    const baseFarmMult = (isFarmBonusActive && typeof settings.farmMultiplier === 'number' && settings.farmMultiplier > 0)
        ? settings.farmMultiplier
        : 1.0;
    const rates = settings.resourceRates || {};
    const legacyMults = settings.resourceMultipliers || {};

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

    // Badges and Toggle button in GM Stats
    const elStatusBadge = document.getElementById('gm-stat-farm-status-badge');
    const elToggleBtn = document.getElementById('btn-gm-stats-toggle-farm');
    const elMultDisplay = document.getElementById('gm-stat-farm-mult-display');
    const elFoodDisplay = document.getElementById('gm-stat-food-consumption-display');
    const elHungerDisplay = document.getElementById('gm-stat-hunger-penalty-display');
    const elStorageDisplay = document.getElementById('gm-stat-storage-formula-display');

    if (elStatusBadge) {
        if (!isFarmBonusActive) {
            elStatusBadge.textContent = '⏹️ Bônus Desativado (1.0x)';
            elStatusBadge.style.background = 'rgba(192,57,43,0.15)';
            elStatusBadge.style.color = '#c0392b';
            elStatusBadge.style.borderColor = '#c0392b';
        } else {
            const bonusPct = Math.round((baseFarmMult - 1) * 100);
            elStatusBadge.textContent = `⚡ Bônus Ativo: ${baseFarmMult.toFixed(1)}x (${bonusPct >= 0 ? '+' : ''}${bonusPct}%)`;
            elStatusBadge.style.background = 'rgba(39,174,96,0.15)';
            elStatusBadge.style.color = '#27ae60';
            elStatusBadge.style.borderColor = '#27ae60';
        }
    }

    if (elToggleBtn) {
        if (!isFarmBonusActive) {
            elToggleBtn.textContent = '⚡ Reativar Bônus de Farm';
            elToggleBtn.className = 'btn btn-sm btn-success';
        } else {
            elToggleBtn.textContent = '⏹️ Desativar Bônus de Farm';
            elToggleBtn.className = 'btn btn-sm btn-danger-soft';
        }
    }

    if (elMultDisplay) {
        if (!isFarmBonusActive) {
            elMultDisplay.textContent = '1.0x (100% Padrão)';
            elMultDisplay.style.color = '#7f8c8d';
        } else {
            const bonusPct = Math.round((baseFarmMult - 1) * 100);
            elMultDisplay.textContent = `${baseFarmMult.toFixed(1)}x (${bonusPct >= 0 ? '+' : ''}${bonusPct}%)`;
            elMultDisplay.style.color = 'var(--gold-hover)';
        }
    }

    if (elFoodDisplay) elFoodDisplay.textContent = '0.006 peixe/s';
    if (elHungerDisplay) elHungerDisplay.textContent = '-50% (Fome)';
    if (elStorageDisplay) elStorageDisplay.textContent = '400 + 200/Cab + 150/Merc';

    // Populate rates table
    const tbody = document.getElementById('gm-stat-farm-rates-tbody');
    if (tbody) {
        const rows = [
            {
                name: '🐟 Peixes (Cais)',
                base: '0.020 /s',
                bonusBldg: '+0.006 /s por nível de Cais',
                mult: multFish,
                effSec: (0.020 + 0.006) * multFish,
                note: '(Cais Nv 1, desconta -0.006/s consumo)'
            },
            {
                name: '🪵 Madeira (Cabana)',
                base: '0.010 /s',
                bonusBldg: '+0.003 /s por nível de Cabana',
                mult: multWood,
                effSec: (0.010 + 0.003) * multWood,
                note: '(Exemplo Cabana Nv 1)'
            },
            {
                name: '🧶 Lã Mágica (Arranhador)',
                base: '0.008 /s',
                bonusBldg: '+0.0025 /s por nível de Arranhador',
                mult: multWool,
                effSec: (0.008 + 0.0025) * multWool,
                note: '(Exemplo Arranhador Nv 1)'
            },
            {
                name: '🪨 Pedra (Mina)',
                base: '0.0049 /s (70%)',
                bonusBldg: '+0.0014 /s por nível de Mina',
                mult: multStone,
                effSec: (0.007 + 0.002) * 0.7 * multStone,
                note: '(Exemplo Mina Nv 1)'
            },
            {
                name: '⛏️ Carvão Mineral (Mina)',
                base: '0.00175 /s (25%)',
                bonusBldg: '+0.0005 /s por nível de Mina',
                mult: multCoal,
                effSec: (0.007 + 0.002) * 0.25 * multCoal,
                note: '(Exemplo Mina Nv 1)'
            },
            {
                name: '⚔️ Ferro Raro (Mina)',
                base: '0.00056 /s (8%)',
                bonusBldg: '+0.00016 /s por nível de Mina',
                mult: multIron,
                effSec: (0.007 + 0.002) * 0.08 * multIron,
                note: '(Exemplo Mina Nv 1)'
            }
        ];

        tbody.innerHTML = rows.map(r => {
            const perHour = Math.round(r.effSec * 3600);
            return `
                <tr>
                    <td><strong>${escapeHtml(r.name)}</strong></td>
                    <td style="font-family: monospace;">${r.base}</td>
                    <td style="font-size: 0.82rem; color: var(--text-secondary);">${r.bonusBldg}</td>
                    <td><span class="badge-level" style="background: ${r.mult > 1.05 ? 'rgba(39,174,96,0.15)' : 'rgba(0,0,0,0.05)'}; color: ${r.mult > 1.05 ? '#27ae60' : 'var(--wood-dark)'}; font-weight: bold;">⚡ ${r.mult.toFixed(1)}x</span></td>
                    <td style="font-weight: bold; color: var(--gold-hover); font-family: monospace;">+${r.effSec.toFixed(3)} /s</td>
                    <td style="font-weight: bold; color: var(--wood-dark); font-family: monospace;">+${perHour.toLocaleString('pt-BR')} /h <small style="display: block; font-size: 0.72rem; color: var(--text-secondary); font-weight: normal;">${r.note}</small></td>
                </tr>
            `;
        }).join('');
    }
}

// --- GM Feedback Notification / Toast ---
function showGMToast(msg) {
    const existing = document.getElementById('gm-toast-notif');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'gm-toast-notif';
    toast.className = 'gm-toast';
    toast.innerHTML = `<strong>👑 [GM]:</strong> ${msg}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
