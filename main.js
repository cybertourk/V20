import { 
    auth, 
    signInAnonymously, 
    onAuthStateChanged, 
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "./firebase-config.js";
import { 
    APP_VERSION, CLANS, ARCHETYPES, PATHS, ATTRIBUTES, ABILITIES, 
    DISCIPLINES, BACKGROUNDS, VIRTUES, V20_MERITS_LIST, V20_FLAWS_LIST, VIT, 
    CLAN_WEAKNESSES, CLAN_DISCIPLINES, GEN_LIMITS 
} from "./data.js";
import * as FBManager from "./firebase-manager.js";

// --- UI IMPORTS (REFACTORED) ---
// 1. Core Renderers (ui-renderer now owns updatePools)
import { 
    renderDots, 
    renderSocialProfile, 
    setupInventoryListeners,
    renderRow, 
    refreshTraitRow,
    hydrateInputs, 
    renderInventoryList, 
    updatePools // MOVED HERE
} from "./ui-renderer.js"; 

import { setDots } from "./ui-mechanics.js";

// 2. New Modules (Split from ui-nav.js)
import { 
    renderDynamicAdvantageRow, 
    renderDynamicTraitRow, 
    renderDerangementsList, 
    renderBloodBondRow, 
    renderDynamicHavenRow,
    renderRitualsEdit 
} from "./ui-advantages.js";

import { renderPrintSheet } from "./ui-print.js";
import { togglePlayMode } from "./ui-play.js";
import { changeStep, updateWalkthrough, startTutorial } from "./ui-nav.js";

// --- NEW DATA IMPORTS & MERGING ---
import { DISCIPLINES_DATA } from './disciplines-data.js';
import { THAUMATURGY_DATA } from './thaumaturgy-data.js';
import { NECROMANCY_DATA } from './necromancy-data.js';
import { THAUMATURGY_RITUALS } from './thaumaturgy-rituals.js';
import { NECROMANCY_RITUALS } from './necromancy-rituals.js';

// Merge Thaumaturgy and Necromancy Paths into the main Disciplines object
Object.assign(DISCIPLINES_DATA, THAUMATURGY_DATA, NECROMANCY_DATA);

// Create a global container for Rituals
window.RITUALS_DATA = {
    "Thaumaturgy": THAUMATURGY_RITUALS,
    "Necromancy": NECROMANCY_RITUALS
};

// --- ERROR HANDLER ---
window.onerror = function(msg, url, line) {
    const notif = document.getElementById('notification');
    if(notif) {
        notif.innerText = "ERROR: " + msg;
        notif.style.display = 'block';
        notif.style.backgroundColor = 'red';
    }
    console.error("Global Error:", msg, "Line:", line);
};

// --- AUTO-SAVE SYSTEM ---
const AUTOSAVE_KEY = 'v20_character_autosave_v1';
let autoSaveTimeout = null;

function triggerAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        try {
            // Don't autosave if state is empty/broken
            if (!window.state || !window.state.dots) return;
            
            // Serialize
            const data = JSON.stringify(window.state);
            localStorage.setItem(AUTOSAVE_KEY, data);
            // console.log("Auto-saved to local storage");
        } catch (e) {
            console.warn("Auto-save failed:", e);
        }
    }, 1000); // 1 second debounce
}

function loadAutoSave() {
    try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.dots) {
                console.log("Restoring Auto-Save...");
                window.state = parsed;
                // Note: We used to setTimeout refresh here, but now we handle it in initUI for better timing
                return true;
            }
        }
    } catch (e) {
        console.error("Failed to load auto-save:", e);
    }
    return false;
}

// --- STATE MANAGEMENT ---
window.state = {
    isPlayMode: false, 
    freebieMode: false, 
    xpMode: false, 
    xpLog: [],     
    activePool: [], 
    currentPhase: 1, 
    furthestPhase: 1,
    dots: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    prios: { attr: {}, abil: {} },
    status: { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 },
    specialties: {}, 
    socialExtras: {}, 
    textFields: { "c-gen": "13", "c-xp-total": "0" }, 
    havens: [], bloodBonds: [], vehicles: [], customAbilityCategories: {},
    derangements: [], merits: [], flaws: [], inventory: [],
    retainers: [], 
    rituals: [],
    primaryThaumPath: null,
    primaryNecroPath: null,
    meta: { filename: "", folder: "" },
    sessionLogs: [], 
    codex: [] 
};

let user = null;

// --- BINDING EXPORTS TO WINDOW ---
window.handleNew = FBManager.handleNew;
window.handleSaveClick = FBManager.handleSaveClick;
window.handleLoadClick = FBManager.handleLoadClick;
window.performSave = FBManager.performSave;
window.deleteCharacter = FBManager.deleteCharacter;

// --- LOCAL IMPORT / EXPORT HANDLERS ---

function handleExport() {
    if (!window.state) return;

    if(window.state.textFields && window.state.textFields['c-name']) {
        if(!window.state.meta) window.state.meta = {};
        window.state.meta.filename = window.state.textFields['c-name'];
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    
    let rawName = window.state.textFields?.['c-name'] || "v20-character";
    rawName = rawName.replace(/[^a-z0-9\s-_]/gi, '').trim() || "v20-character";
    
    downloadAnchorNode.setAttribute("download", rawName + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (!json || typeof json !== 'object') throw new Error("Invalid JSON");

            if(!confirm(`Import character from "${file.name}"? Unsaved changes will be lost.`)) {
                event.target.value = ''; 
                return;
            }

            window.state = json;

            // Legacy Data Patches
            if(!window.state.meta) window.state.meta = { filename: file.name.replace('.json',''), folder: "" };
            if(!window.state.specialties) window.state.specialties = {}; 
            if(!window.state.retainers) window.state.retainers = [];
            if(!window.state.rituals) window.state.rituals = []; 
            if(!window.state.sessionLogs) window.state.sessionLogs = []; 
            if(!window.state.codex) window.state.codex = []; 
            
            if (!window.state.furthestPhase) window.state.furthestPhase = 1;
            if (window.state.status && window.state.status.tempWillpower === undefined) {
                window.state.status.tempWillpower = window.state.status.willpower || 5;
            }
            if (window.state.status && (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states))) {
                const oldDamage = window.state.status.health || 0;
                window.state.status.health_states = [0,0,0,0,0,0,0];
                for(let i=0; i<oldDamage && i<7; i++) {
                    window.state.status.health_states[i] = 2; 
                }
            }

            window.fullRefresh();
            triggerAutoSave();
            window.showNotification("Character Imported");

        } catch (err) {
            console.error(err);
            window.showNotification("Error: Invalid Character File");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --- HELPER: SAFE INPUT LOCKING ---
function applySmartLock(input) {
    if (!input.value && document.activeElement !== input) {
        input.setAttribute('readonly', 'true');
        input.setAttribute('data-smartlock', 'true');
    }
    if (!input.dataset.hasLockListeners) {
        const unlock = () => { input.removeAttribute('readonly'); };
        input.addEventListener('focus', unlock);
        input.addEventListener('click', unlock);
        input.addEventListener('input', unlock);
        input.dataset.hasLockListeners = 'true';
    }
}

// --- FULL UI REFRESH ---
window.fullRefresh = function() {
    try {
        console.log("Starting Full UI Refresh...");
        
        hydrateInputs();
        
        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
        renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
        renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
        renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
        renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
        renderDerangementsList();
        renderBloodBondRow();
        renderDynamicHavenRow();
        renderInventoryList();
        renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
        renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
        if(renderRitualsEdit) renderRitualsEdit();
        
        if (window.state.prios) {
            document.querySelectorAll('.prio-btn').forEach(btn => {
                const { cat, group, v } = btn.dataset;
                const savedVal = window.state.prios[cat]?.[group];
                if (savedVal == v) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }
        
        Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { refreshTraitRow(a, 'attr'); }));
        Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { refreshTraitRow(a, 'abil'); }));

        for(let i=0; i<8; i++) {
            const nameInput = document.getElementById(`ot-n-${i}`);
            if(nameInput) {
                const name = nameInput.value || `Other_${i}`;
                const val = window.state.dots.other[name] || 0;
                const dr = document.getElementById(`ot-dr-${i}`);
                if(dr) dr.innerHTML = renderDots(val, 5);
            }
        }
        
        VIRTUES.forEach(v => {
            const row = document.querySelector(`#list-virt .dot-row[data-n="${v}"]`);
            if(row) row.innerHTML = renderDots(window.state.dots.virt[v] || 1, 5);
        });

        const currentClan = window.state.textFields['c-clan'];
        if (currentClan && CLAN_WEAKNESSES[currentClan]) {
            const weaknessArea = document.getElementById('c-clan-weakness');
            if (weaknessArea) weaknessArea.value = CLAN_WEAKNESSES[currentClan];
        }

        renderSocialProfile();
        updateWalkthrough();
        
        if (window.updatePools) window.updatePools();
        if (renderPrintSheet) renderPrintSheet();

        setTimeout(() => {
            const inputs = document.querySelectorAll('#sheet-content input[type="text"], #sheet-content textarea, #sheet-content input[type="number"]');
            inputs.forEach(input => { applySmartLock(input); });
        }, 200);
        
        const freebieBtn = document.getElementById('toggle-freebie-btn');
        if(freebieBtn) freebieBtn.removeAttribute('disabled');

        console.log("UI Refresh Complete.");
        
        // Prioritize current phase, fall back to furthest
        const targetStep = window.state.currentPhase || window.state.furthestPhase || 1;
        changeStep(targetStep);

    } catch(e) {
        console.error("Refresh Error:", e);
        window.showNotification("Error Refreshing UI");
    }
};

// --- HOOK INTO updatePools FOR AUTOSAVE ---
const _originalUpdatePools = window.updatePools;
window.updatePools = function() {
    if(typeof _originalUpdatePools === 'function') _originalUpdatePools();
    triggerAutoSave();
};

function initUI() {
    try {
        if (!document.getElementById('sheet-nav')) throw new Error("Navigation container 'sheet-nav' is missing.");

        // 1. ATTEMPT LOAD FIRST
        // This ensures window.state has the user's data (or stays default) before we generate HTML.
        const loaded = loadAutoSave(); 
        if(loaded) {
             console.log("Data loaded synchronously.");
        } else {
             console.log("No autosave. Using default state.");
        }

        const sensitiveInputs = ['c-name', 'c-player', 'c-sire', 'c-concept', 'c-chronicle'];
        sensitiveInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.setAttribute('readonly', 'true');
                el.setAttribute('autocomplete', 'off');
                el.style.backgroundColor = 'transparent'; 
                const enableInput = () => { el.removeAttribute('readonly'); };
                el.addEventListener('focus', enableInput);
                el.addEventListener('click', enableInput);
                el.addEventListener('mouseenter', () => { if(document.activeElement !== el) el.removeAttribute('readonly'); });
            }
        });

        const allInputs = document.querySelectorAll('input, textarea');
        allInputs.forEach(input => { if(!input.id.startsWith('auth-')) input.setAttribute('autocomplete', 'off'); });

        const vSpan = document.getElementById('app-version');
        if(vSpan) vSpan.innerText = APP_VERSION;

        const s1 = document.getElementById('list-attr-physical');
        if (s1) {
            // FIX: Render rows using the ACTUAL value in state, not a hardcoded 1 or 0.
            Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { 
                if (window.state.dots.attr[a] === undefined) window.state.dots.attr[a] = 1; 
                renderRow('list-attr-'+c.toLowerCase(), a, 'attr', window.state.dots.attr[a]); 
            }));
            Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { 
                if (window.state.dots.abil[a] === undefined) window.state.dots.abil[a] = 0; 
                renderRow('list-abil-'+c.toLowerCase(), a, 'abil', window.state.dots.abil[a]); 
            }));
        }
        
        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
        renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
        renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
        renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
        renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
        renderDerangementsList(); 
        VIRTUES.forEach(v => { 
            if (window.state.dots.virt[v] === undefined) window.state.dots.virt[v] = 1; 
            renderRow('list-virt', v, 'virt', window.state.dots.virt[v]); 
        });
        
        const vitalCont = document.getElementById('vitals-create-inputs');
        if(vitalCont) {
            vitalCont.innerHTML = ''; 
            VIT.forEach(v => { 
                const d = document.createElement('div'); 
                d.innerHTML = `<label class="label-text">${v}</label><input type="text" id="bio-${v}">`; 
                vitalCont.appendChild(d); 
            });
        }
        
        renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
        renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
        renderInventoryList();
        renderSocialProfile();
        setupInventoryListeners();
        
        const otherT = document.getElementById('other-traits-rows-create');
        if(otherT) for(let i=0; i<8; i++) {
            const d2 = document.createElement('div'); d2.className = 'flex items-center gap-2 mb-2';
            d2.innerHTML = `<input type="text" id="ot-n-${i}" placeholder="Other..." class="w-40 text-[11px] font-bold"><div class="dot-row" id="ot-dr-${i}"></div>`;
            otherT.appendChild(d2);
            const dr = d2.querySelector('.dot-row'); dr.innerHTML = renderDots(0, 5); 
            dr.onclick = (e) => { 
                const nameInp = document.getElementById(`ot-n-${i}`);
                const n = nameInp.value || `Other_${i}`; 
                if(e.target.classList.contains('dot')) { 
                    let v = parseInt(e.target.dataset.v); 
                    const currentVal = window.state.dots.other[n] || 0; 
                    if (v === currentVal) v = v - 1; 
                    window.state.dots.other[n] = v; 
                    dr.innerHTML = renderDots(window.state.dots.other[n], 5);
                    renderPrintSheet();
                    triggerAutoSave();
                } 
            };
        }
        
        document.querySelectorAll('.prio-btn').forEach(b => b.onclick = (e) => {
            const {cat, group, v} = e.target.dataset;
            const catGroups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
            catGroups.forEach(g => {
                if (window.state.prios[cat][g] === parseInt(v)) {
                    window.state.prios[cat][g] = null;
                    if (cat === 'attr') { 
                        ATTRIBUTES[g].forEach(a => { window.state.dots.attr[a] = 1; const row = document.querySelector(`.dot-row[data-n="${a}"][data-t="attr"]`); if(row) window.setDots(a, 'attr', 1, 1); }); 
                    } else { 
                        ABILITIES[g].forEach(a => { window.state.dots.abil[a] = 0; window.setDots(a, 'abil', 0, 0); }); 
                        if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === g) window.state.dots.abil[name] = 0; }); } 
                    }
                }
            });
            window.state.prios[cat][group] = parseInt(v);
            document.querySelectorAll(`.prio-btn[data-cat="${cat}"]`).forEach(el => { const isActive = window.state.prios[cat][el.dataset.group] == el.dataset.v; el.classList.toggle('active', isActive); });
            window.updatePools();
        });

        renderBloodBondRow();
        renderDynamicHavenRow();
        
        const criticalFields = ['c-name', 'c-nature', 'c-demeanor', 'c-clan', 'c-gen', 'c-player', 'c-concept', 'c-sire'];
        criticalFields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const updateState = (e) => { 
                    window.state.textFields[id] = e.target.value; 
                    updateWalkthrough(); 
                    triggerAutoSave();
                };
                el.addEventListener('keyup', updateState);
                el.addEventListener('change', updateState);
            }
        });

        document.body.addEventListener('change', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                if(e.target.id && !e.target.id.startsWith('search')) { 
                    window.state.textFields[e.target.id] = e.target.value; 
                    if (e.target.id === 'c-xp-total') window.updatePools();
                    renderPrintSheet();
                    triggerAutoSave();
                }
            }
        });

        setTimeout(() => {
            const allInputs = document.querySelectorAll('input, textarea');
            allInputs.forEach(input => {
                if(!input.id.startsWith('auth-')) { 
                    input.setAttribute('autocomplete', 'off');
                    applySmartLock(input);
                }
            });
        }, 100);

        const cmdNew = document.getElementById('cmd-new');
        if(cmdNew) cmdNew.onclick = window.handleNew;
        const cmdSave = document.getElementById('cmd-save');
        if(cmdSave) cmdSave.onclick = window.handleSaveClick;
        const cmdLoad = document.getElementById('cmd-load');
        if(cmdLoad) cmdLoad.onclick = window.handleLoadClick;
        const confirmSave = document.getElementById('confirm-save-btn');
        if(confirmSave) confirmSave.onclick = window.performSave;
        
        const topPlayBtn = document.getElementById('play-mode-btn');
        if(topPlayBtn) topPlayBtn.onclick = togglePlayMode; 
        
        const exportBtn = document.getElementById('export-btn');
        if(exportBtn) exportBtn.onclick = handleExport;

        const importTrigger = document.getElementById('import-trigger');
        const importInput = document.getElementById('import-input');
        if(importTrigger && importInput) {
            importTrigger.onclick = () => importInput.click();
            importInput.onchange = handleImport;
        }

        const printBtn = document.getElementById('print-btn');
        if(printBtn) printBtn.onclick = () => window.print();
        
        const topFreebieBtn = document.getElementById('toggle-freebie-btn');
        if(topFreebieBtn) topFreebieBtn.onclick = () => { if(window.toggleFreebieMode) window.toggleFreebieMode(); };
        
        const topXpBtn = document.getElementById('toggle-xp-btn'); 
        if(topXpBtn) topXpBtn.onclick = () => { if(window.toggleXpMode) window.toggleXpMode(); };

        const loginBtn = document.getElementById('login-btn');
        if(loginBtn) {
            loginBtn.onclick = () => {
                document.getElementById('auth-modal').classList.add('active');
                document.getElementById('auth-error-msg').classList.add('hidden');
                document.getElementById('auth-email').value = '';
                document.getElementById('auth-password').value = '';
            };
        }

        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) {
            logoutBtn.onclick = async () => {
                if(confirm("Logout?")) {
                    try {
                        await signOut(auth);
                        window.location.reload(); 
                    } catch(e) {
                        console.error(e);
                    }
                }
            };
        }

        const authLoginBtn = document.getElementById('confirm-login-btn');
        const authRegisterBtn = document.getElementById('confirm-register-btn');
        const authError = document.getElementById('auth-error-msg');

        if(authLoginBtn) {
            authLoginBtn.onclick = async () => {
                const email = document.getElementById('auth-email').value;
                const pass = document.getElementById('auth-password').value;
                if(!email || !pass) {
                    authError.innerText = "Email and Password required.";
                    authError.classList.remove('hidden');
                    return;
                }
                try {
                    await signInWithEmailAndPassword(auth, email, pass);
                    document.getElementById('auth-modal').classList.remove('active');
                    document.getElementById('guest-prompt-modal').classList.remove('active');
                } catch(e) {
                    console.error("Login Error:", e);
                    let msg = "Login Failed: " + e.message;
                    if(e.code === 'auth/invalid-credential') msg = "Invalid Email or Password.";
                    if(e.code === 'auth/invalid-email') msg = "Invalid Email Format.";
                    authError.innerText = msg;
                    authError.classList.remove('hidden');
                }
            };
        }

        if(authRegisterBtn) {
            authRegisterBtn.onclick = async () => {
                const email = document.getElementById('auth-email').value;
                const pass = document.getElementById('auth-password').value;
                if(!email || !pass) {
                    authError.innerText = "Email and Password required.";
                    authError.classList.remove('hidden');
                    return;
                }
                if(pass.length < 6) {
                    authError.innerText = "Password must be at least 6 characters.";
                    authError.classList.remove('hidden');
                    return;
                }
                try {
                    await createUserWithEmailAndPassword(auth, email, pass);
                    document.getElementById('auth-modal').classList.remove('active');
                    document.getElementById('guest-prompt-modal').classList.remove('active');
                    window.showNotification("Account Created!");
                } catch(e) {
                    console.error("Registration Error:", e);
                     let msg = "Registration Failed: " + e.message;
                    if(e.code === 'auth/email-already-in-use') msg = "Email already registered.";
                    if(e.code === 'auth/weak-password') msg = "Password too weak.";
                    authError.innerText = msg;
                    authError.classList.remove('hidden');
                }
            };
        }

        document.body.addEventListener('click', function(e) {
            if (e.target.classList.contains('dot')) {
                const row = e.target.closest('.dot-row');
                if (row) {
                    const traitName = row.dataset.n;
                    const traitType = row.dataset.t;

                    if (traitType === 'back' && traitName === 'Generation') {
                        setTimeout(() => {
                            const genDots = window.state.dots.back['Generation'] || 0;
                            const newGen = 13 - genDots;
                            window.state.textFields['c-gen'] = newGen.toString();
                            const genInput = document.getElementById('c-gen');
                            if (genInput) genInput.value = newGen;
                            updateWalkthrough();
                            triggerAutoSave(); 
                        }, 50);
                    }
                }
            }
        });

        document.addEventListener('click', function(e) {
            if (!window.state.isPlayMode) return;
            if (!e.target.classList.contains('box')) return;
            
            const type = e.target.dataset.type;
            const val = parseInt(e.target.dataset.v);
            if (!type || isNaN(val)) return;

            if (type === 'wp') {
                if (window.state.status.tempWillpower === val) window.state.status.tempWillpower = val - 1;
                else window.state.status.tempWillpower = val;
            } else if (type === 'blood') {
                if (window.state.status.blood === val) window.state.status.blood = val - 1;
                else window.state.status.blood = val;
            } else if (type === 'health') {
                const idx = val - 1; 
                if (window.state.status.health_states === undefined) window.state.status.health_states = [0,0,0,0,0,0,0];
                const current = window.state.status.health_states[idx] || 0;
                window.state.status.health_states[idx] = (current + 1) % 4;
            }
            window.updatePools();
        });

        // 2. FORCE SYNC AT END OF INIT
        // This ensures locks, pools, and navigation are consistent after rows are built
        window.fullRefresh();
        
    } catch(e) {
        console.error("UI Init Error:", e);
        const notif = document.getElementById('notification');
        if(notif) { notif.innerText = "CRITICAL INIT ERROR: " + e.message; notif.style.display = 'block'; }
    }
}

// --- AUTHENTICATION & STARTUP ---

function updateAuthUI(u) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');

    if (u && !u.isAnonymous) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(userInfo) {
            userInfo.classList.remove('hidden');
            userInfo.style.display = 'flex';
        }
        if(userName) userName.innerText = u.displayName || u.email || "User";
        document.getElementById('guest-prompt-modal').classList.remove('active');
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(userInfo) {
            userInfo.classList.add('hidden');
            userInfo.style.display = 'none';
        }
        if (u && u.isAnonymous) {
            const dismissed = sessionStorage.getItem('v20_guest_dismissed');
            if (!dismissed) {
                setTimeout(() => {
                    document.getElementById('guest-prompt-modal').classList.add('active');
                }, 1000);
            }
        }
    }
}

function checkTutorialStatus() {
    if (!localStorage.getItem('v20_tutorial_complete')) {
        setTimeout(() => {
            if(window.startTutorial) window.startTutorial();
        }, 1500); 
    }
}

onAuthStateChanged(auth, async (u) => {
    const loader = document.getElementById('loading-overlay');
    updateAuthUI(u);
    
    if(u && !u.isAnonymous) {
        user = u;
        console.log("User signed in:", user.uid);

        try {
            const ns = document.getElementById('c-nature');
            const ds = document.getElementById('c-demeanor');
            if(ns && ds && typeof ARCHETYPES !== 'undefined') {
                ns.innerHTML = '<option value="" disabled selected>Choose Nature...</option>'; 
                ds.innerHTML = '<option value="" disabled selected>Choose Demeanor...</option>'; 
                const sortedArch = [...ARCHETYPES].sort(); 
                sortedArch.forEach(a => { ns.add(new Option(a,a)); ds.add(new Option(a,a)); });
            }

            const cs = document.getElementById('c-clan');
            if(cs && typeof CLANS !== 'undefined') {
                cs.innerHTML = '<option value="" disabled selected>Choose Clan...</option>';
                const sortedClans = [...CLANS].sort();
                sortedClans.forEach(c => cs.add(new Option(c,c)));
                
                cs.addEventListener('change', (e) => {
                    const clan = e.target.value;
                    const weaknessArea = document.getElementById('c-clan-weakness');
                    if (weaknessArea && CLAN_WEAKNESSES[clan]) {
                        weaknessArea.value = CLAN_WEAKNESSES[clan];
                        if (!window.state.textFields) window.state.textFields = {};
                        window.state.textFields['c-clan-weakness'] = CLAN_WEAKNESSES[clan];
                    }
                    if (CLAN_DISCIPLINES && CLAN_DISCIPLINES[clan]) {
                        window.state.dots.disc = {};
                        CLAN_DISCIPLINES[clan].forEach(d => { window.state.dots.disc[d] = 0; });
                        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
                    }
                    updateWalkthrough();
                    triggerAutoSave();
                });
            }

            const ps1 = document.getElementById('c-path-name');
            const ps2 = document.getElementById('c-path-name-create');
            if (typeof PATHS !== 'undefined') {
                if(ps1) { ps1.innerHTML = ''; PATHS.forEach(p => ps1.add(new Option(p,p))); }
                if(ps2) { ps2.innerHTML = ''; PATHS.forEach(p => ps2.add(new Option(p,p))); }
            }

            if(ps1) ps1.addEventListener('change', (e) => { 
                if(ps2) ps2.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
                triggerAutoSave();
            });
            if(ps2) ps2.addEventListener('change', (e) => { 
                if(ps1) ps1.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
                triggerAutoSave();
            });

            hydrateInputs();
            updateWalkthrough();
            
            const currentClan = document.getElementById('c-clan')?.value;
            if (currentClan && CLAN_WEAKNESSES[currentClan]) {
                const weaknessArea = document.getElementById('c-clan-weakness');
                if (weaknessArea) weaknessArea.value = CLAN_WEAKNESSES[currentClan];
            }

            const freebieInp = document.getElementById('c-freebie-total');
            if(freebieInp) freebieInp.oninput = window.updatePools;

            if(loader) loader.style.display = 'none';
            checkTutorialStatus();
            
            // --- FIX: FORCE REFRESH AFTER LOGIN ---
            setTimeout(() => window.fullRefresh(), 500);

        } catch (dbErr) {
            console.error("DB Init Error:", dbErr);
            window.showNotification("DB Conn Error");
        }
    } else {
        try {
            if (!u) {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            }
            populateGuestUI();
            checkTutorialStatus();
        } catch (e) {
            console.error("Authentication Error:", e);
            if (e.code === 'auth/admin-restricted-operation') {
                console.warn("Anonymous Auth disabled. Proceeding as Guest.");
                populateGuestUI();
                window.showNotification("Guest Mode: Log in to save.");
                if(loader) loader.style.display = 'none';
            } else {
                if(loader) {
                    loader.innerHTML = `
                        <div class="text-center">
                            <h2 class="text-[#af0000] font-bold text-xl">CONNECTION FAILED</h2>
                            <p class="text-gray-400 text-xs mt-2">Could not access the archives.</p>
                            <button onclick="window.location.reload()" class="mt-4 border border-[#444] px-4 py-2 text-white hover:bg-[#222]">RETRY</button>
                        </div>
                    `;
                }
            }
        }
    }
});

function populateGuestUI() {
    const ns = document.getElementById('c-nature');
    const ds = document.getElementById('c-demeanor');
    if(ns && ds && ns.options.length <= 1 && typeof ARCHETYPES !== 'undefined') {
        ns.innerHTML = '<option value="" disabled selected>Choose Nature...</option>'; 
        ds.innerHTML = '<option value="" disabled selected>Choose Demeanor...</option>'; 
        ARCHETYPES.sort().forEach(a => { ns.add(new Option(a,a)); ds.add(new Option(a,a)); });
    }
    
    const cs = document.getElementById('c-clan');
    if(cs && cs.options.length <= 1 && typeof CLANS !== 'undefined') {
        cs.innerHTML = '<option value="" disabled selected>Choose Clan...</option>';
        CLANS.sort().forEach(c => cs.add(new Option(c,c)));
        cs.addEventListener('change', (e) => {
            const clan = e.target.value;
            const weaknessArea = document.getElementById('c-clan-weakness');
            if (weaknessArea && CLAN_WEAKNESSES[clan]) {
                weaknessArea.value = CLAN_WEAKNESSES[clan];
                if (!window.state.textFields) window.state.textFields = {};
                window.state.textFields['c-clan-weakness'] = CLAN_WEAKNESSES[clan];
            }
            if (CLAN_DISCIPLINES && CLAN_DISCIPLINES[clan]) {
                window.state.dots.disc = {};
                CLAN_DISCIPLINES[clan].forEach(d => { window.state.dots.disc[d] = 0; });
                renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
            }
            updateWalkthrough();
            triggerAutoSave();
        });
    }

    const ps1 = document.getElementById('c-path-name');
    const ps2 = document.getElementById('c-path-name-create');
    if (typeof PATHS !== 'undefined') {
        if(ps1) { ps1.innerHTML = ''; PATHS.forEach(p => ps1.add(new Option(p,p))); }
        if(ps2) { ps2.innerHTML = ''; PATHS.forEach(p => ps2.add(new Option(p,p))); }
    }
    
    if(ps1) ps1.addEventListener('change', (e) => { 
        if(ps2) ps2.value = e.target.value; 
        if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
        triggerAutoSave();
    });
    if(ps2) ps2.addEventListener('change', (e) => { 
        if(ps1) ps1.value = e.target.value; 
        if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
        triggerAutoSave();
    });
    
    const loader = document.getElementById('loading-overlay');
    if(loader) loader.style.display = 'none';

    // --- FIX: FORCE REFRESH FOR GUESTS ---
    setTimeout(() => window.fullRefresh(), 500);
}

document.addEventListener('DOMContentLoaded', initUI);
