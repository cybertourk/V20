import { auth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "./firebase-config.js";
import { 
    APP_VERSION, CLANS, ARCHETYPES, PATHS, ATTRIBUTES, ABILITIES, 
    DISCIPLINES, BACKGROUNDS, VIRTUES, V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import * as FBManager from "./firebase-manager.js";
import { 
    renderDots, 
    renderSocialProfile, 
    setupInventoryListeners,
    renderRow, 
    refreshTraitRow, // Added this import
    hydrateInputs,   // Added this import
    renderDynamicAdvantageRow,
    renderDynamicTraitRow,
    renderDerangementsList,
    renderBloodBondRow,
    renderDynamicHavenRow,
    renderInventoryList,
    updateWalkthrough 
} from "./ui-renderer.js"; 

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

// --- STATE MANAGEMENT ---
window.state = {
    isPlayMode: false, freebieMode: false, activePool: [], currentPhase: 1, furthestPhase: 1,
    dots: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    prios: { attr: {}, abil: {} },
    status: { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 },
    specialties: {}, 
    socialExtras: {}, textFields: {}, havens: [], bloodBonds: [], vehicles: [], customAbilityCategories: {},
    derangements: [], merits: [], flaws: [], inventory: [],
    meta: { filename: "", folder: "" } 
};

let user = null;

// --- BINDING EXPORTS TO WINDOW ---
window.handleNew = FBManager.handleNew;
window.handleSaveClick = FBManager.handleSaveClick;
window.handleLoadClick = FBManager.handleLoadClick;
window.performSave = FBManager.performSave;
window.deleteCharacter = FBManager.deleteCharacter;

// --- CRITICAL FIX: FULL UI REFRESH FUNCTION ---
// This was missing, causing Loaded characters to not appear visually.
window.fullRefresh = function() {
    try {
        console.log("Starting Full UI Refresh...");
        
        // 1. Text Fields
        hydrateInputs();
        
        // 2. Dynamic Rows (Disciplines, Backgrounds)
        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
        renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
        
        // 3. Custom Abilities (Pass empty array, let it pull from state)
        renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
        renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
        renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
        
        // 4. Lists (Derangements, Bonds, Havens, Inventory)
        renderDerangementsList();
        renderBloodBondRow();
        renderDynamicHavenRow();
        renderInventoryList();
        
        // 5. Merits & Flaws
        renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
        renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
        
        // 6. Standard Rows (Attributes & Abilities) - Refresh Dots
        Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => {
            refreshTraitRow(a, 'attr');
        }));
        Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => {
            refreshTraitRow(a, 'abil');
        }));

        // 7. Other Traits
        for(let i=0; i<8; i++) {
            const nameInput = document.getElementById(`ot-n-${i}`);
            if(nameInput) {
                // Determine name from input or default
                const name = nameInput.value || `Other_${i}`;
                const val = window.state.dots.other[name] || 0;
                const dr = document.getElementById(`ot-dr-${i}`);
                if(dr) dr.innerHTML = renderDots(val, 5);
            }
        }
        
        // 8. Virtues (Reset dots)
        VIRTUES.forEach(v => {
            const row = document.querySelector(`#list-virt .dot-row[data-n="${v}"]`);
            if(row) row.innerHTML = renderDots(window.state.dots.virt[v] || 1, 5);
        });

        // 9. Final Updates
        renderSocialProfile();
        updateWalkthrough();
        window.updatePools();
        
        console.log("UI Refresh Complete.");
        
        // Restore Phase
        if(window.state.furthestPhase) {
            window.changeStep(window.state.furthestPhase);
        }

    } catch(e) {
        console.error("Refresh Error:", e);
        window.showNotification("Error Refreshing UI");
    }
};

// --- INITIALIZATION LOGIC ---

function initUI() {
    try {
        if (!document.getElementById('sheet-nav')) throw new Error("Navigation container 'sheet-nav' is missing from HTML.");

        // Version Label
        const vSpan = document.getElementById('app-version');
        if(vSpan) vSpan.innerText = APP_VERSION;

        // Render Attribute/Ability Rows
        const s1 = document.getElementById('list-attr-physical');
        if (s1) {
            Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { 
                window.state.dots.attr[a] = 1; 
                renderRow('list-attr-'+c.toLowerCase(), a, 'attr', 1); 
            }));
            Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { 
                window.state.dots.abil[a] = 0; 
                renderRow('list-abil-'+c.toLowerCase(), a, 'abil', 0); 
            }));
        }
        
        // Render Initial Lists
        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
        renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
        renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
        renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
        renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
        renderDerangementsList(); 
        
        // Render Virtues
        VIRTUES.forEach(v => { 
            window.state.dots.virt[v] = 1; 
            renderRow('list-virt', v, 'virt', 1); 
        });
        
        // Render Vitals inputs
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
        
        // Render Other Traits
        const otherT = document.getElementById('other-traits-rows-create');
        if(otherT) for(let i=0; i<8; i++) {
            const d2 = document.createElement('div'); d2.className = 'flex items-center gap-2 mb-2';
            d2.innerHTML = `<input type="text" id="ot-n-${i}" placeholder="Other..." class="w-40 text-[11px] font-bold"><div class="dot-row" id="ot-dr-${i}"></div>`;
            otherT.appendChild(d2);
            const dr = d2.querySelector('.dot-row'); dr.innerHTML = renderDots(0, 5); 
            
            dr.onclick = (e) => { 
                const n = document.getElementById(`ot-n-${i}`).value || `Other_${i}`; 
                if(e.target.classList.contains('dot')) { 
                    let v = parseInt(e.target.dataset.v); 
                    const currentVal = window.state.dots.other[n] || 0; 
                    if (v === currentVal) v = v - 1; 
                    window.state.dots.other[n] = v; 
                    dr.innerHTML = renderDots(window.state.dots.other[n], 5);
                } 
            };
        }
        
        // Priority Buttons Logic
        document.querySelectorAll('.prio-btn').forEach(b => b.onclick = (e) => {
            const {cat, group, v} = e.target.dataset;
            const catGroups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
            catGroups.forEach(g => {
                if (window.state.prios[cat][g] === parseInt(v)) {
                    window.state.prios[cat][g] = null;
                    if (cat === 'attr') { 
                        ATTRIBUTES[g].forEach(a => {
                            window.state.dots.attr[a] = 1; 
                            const row = document.querySelector(`.dot-row[data-n="${a}"][data-t="attr"]`); 
                            if(row) window.setDots(a, 'attr', 1, 1);
                        }); 
                    } else { 
                        ABILITIES[g].forEach(a => {
                            window.state.dots.abil[a] = 0; 
                            window.setDots(a, 'abil', 0, 0);
                        }); 
                        if (window.state.customAbilityCategories) { 
                            Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { 
                                if (c === g) window.state.dots.abil[name] = 0;
                            }); 
                        } 
                    }
                }
            });
            window.state.prios[cat][group] = parseInt(v);
            document.querySelectorAll(`.prio-btn[data-cat="${cat}"]`).forEach(el => { 
                const isActive = window.state.prios[cat][el.dataset.group] == el.dataset.v; 
                el.classList.toggle('active', isActive); 
            });
            window.updatePools();
        });

        renderBloodBondRow();
        renderDynamicHavenRow();
        
        // --- BIND LIVE UPDATES FOR VALIDATION (NEW) ---
        // This ensures typing in Step 1 immediately updates state so checkStepComplete passes
        const criticalFields = ['c-name', 'c-nature', 'c-demeanor', 'c-clan', 'c-player', 'c-concept', 'c-sire'];
        criticalFields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                // Update state on keyup/change
                const updateState = (e) => {
                    window.state.textFields[id] = e.target.value;
                    updateWalkthrough(); // Force "Next" button to light up
                };
                el.addEventListener('keyup', updateState);
                el.addEventListener('change', updateState);
            }
        });

        // Global fallback listener for all other inputs
        document.body.addEventListener('change', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                if(e.target.id && !e.target.id.startsWith('search')) {
                    window.state.textFields[e.target.id] = e.target.value;
                }
            }
        });

        // Button Bindings
        const cmdNew = document.getElementById('cmd-new');
        if(cmdNew) cmdNew.onclick = window.handleNew;
        
        const cmdSave = document.getElementById('cmd-save');
        if(cmdSave) cmdSave.onclick = window.handleSaveClick;
        
        const cmdLoad = document.getElementById('cmd-load');
        if(cmdLoad) cmdLoad.onclick = window.handleLoadClick;
        
        const confirmSave = document.getElementById('confirm-save-btn');
        if(confirmSave) confirmSave.onclick = window.performSave;
        
        const topPlayBtn = document.getElementById('play-mode-btn');
        if(topPlayBtn) topPlayBtn.onclick = window.togglePlayMode;
        
        const topFreebieBtn = document.getElementById('toggle-freebie-btn');
        if(topFreebieBtn) topFreebieBtn.onclick = window.toggleFreebieMode;

        // Play Mode Click Listener
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

        // Initialize Step 1
        window.changeStep(1); 

    } catch(e) {
        console.error("UI Init Error:", e);
        const notif = document.getElementById('notification');
        if(notif) { notif.innerText = "CRITICAL INIT ERROR: " + e.message; notif.style.display = 'block'; }
    }
}

// --- AUTH LISTENER ---

onAuthStateChanged(auth, async (u) => {
    if(u) {
        user = u;
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none';

        try {
            // Populate Dropdowns
            const ns = document.getElementById('c-nature');
            const ds = document.getElementById('c-demeanor');
            const cs = document.getElementById('c-clan');

            if(ns && ds && typeof ARCHETYPES !== 'undefined') {
                const sortedArch = [...ARCHETYPES].sort(); 
                ns.innerHTML = ''; ds.innerHTML = ''; 
                sortedArch.forEach(a => { 
                    ns.add(new Option(a,a)); 
                    if(ds) ds.add(new Option(a,a)); 
                });
            }

            if(cs && typeof CLANS !== 'undefined') {
                const sortedClans = [...CLANS].sort();
                cs.innerHTML = '';
                sortedClans.forEach(c => cs.add(new Option(c,c)));
            }

            const ps1 = document.getElementById('c-path-name');
            const ps2 = document.getElementById('c-path-name-create');
            
            if (typeof PATHS !== 'undefined') {
                if(ps1) { ps1.innerHTML = ''; PATHS.forEach(p => ps1.add(new Option(p,p))); }
                if(ps2) { ps2.innerHTML = ''; PATHS.forEach(p => ps2.add(new Option(p,p))); }
            }

            // Sync Listeners
            if(ps1) ps1.addEventListener('change', (e) => { 
                if(ps2) ps2.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });
            if(ps2) ps2.addEventListener('change', (e) => { 
                if(ps1) ps1.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });
            const freebieInp = document.getElementById('c-freebie-total');
            if(freebieInp) freebieInp.oninput = window.updatePools;

        } catch (dbErr) {
            console.error("DB Init Error:", dbErr);
            window.showNotification("DB Conn Error");
        }
    } else {
        // Fallback Auth
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
    }
});

// Run Init
initUI();
