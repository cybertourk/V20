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
import { 
    renderDots, 
    renderSocialProfile, 
    setupInventoryListeners,
    renderRow, 
    refreshTraitRow,
    hydrateInputs, 
    renderDynamicAdvantageRow, 
    renderDynamicTraitRow, 
    renderDerangementsList, 
    renderBloodBondRow, 
    renderDynamicHavenRow, 
    renderInventoryList, 
    updateWalkthrough,
    setDots 
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
    isPlayMode: false, 
    freebieMode: false, 
    xpMode: false, // New Experience Mode
    xpLog: [],     // New Experience Log
    activePool: [], 
    currentPhase: 1, 
    furthestPhase: 1,
    dots: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    prios: { attr: {}, abil: {} },
    status: { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 },
    specialties: {}, 
    socialExtras: {}, 
    // FIXED: Initialize c-gen to 13 so Step 1 validation passes by default without interaction
    textFields: { "c-gen": "13", "c-xp-total": "0" }, 
    havens: [], bloodBonds: [], vehicles: [], customAbilityCategories: {},
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
window.fullRefresh = function() {
    try {
        console.log("Starting Full UI Refresh...");
        
        // 1. Text Fields
        hydrateInputs();
        
        // 2. Dynamic Rows
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
        
        // 3. Priority Buttons
        if (window.state.prios) {
            document.querySelectorAll('.prio-btn').forEach(btn => {
                const { cat, group, v } = btn.dataset;
                const savedVal = window.state.prios[cat]?.[group];
                if (savedVal == v) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        // 4. Standard Rows
        Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { refreshTraitRow(a, 'attr'); }));
        Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { refreshTraitRow(a, 'abil'); }));

        // 5. Other Traits
        for(let i=0; i<8; i++) {
            const nameInput = document.getElementById(`ot-n-${i}`);
            if(nameInput) {
                const name = nameInput.value || `Other_${i}`;
                const val = window.state.dots.other[name] || 0;
                const dr = document.getElementById(`ot-dr-${i}`);
                if(dr) dr.innerHTML = renderDots(val, 5);
            }
        }
        
        // 6. Virtues
        VIRTUES.forEach(v => {
            const row = document.querySelector(`#list-virt .dot-row[data-n="${v}"]`);
            if(row) row.innerHTML = renderDots(window.state.dots.virt[v] || 1, 5);
        });

        // 7. Update Weakness if Clan is Selected
        const currentClan = window.state.textFields['c-clan'];
        if (currentClan && CLAN_WEAKNESSES[currentClan]) {
            const weaknessArea = document.getElementById('c-clan-weakness');
            if (weaknessArea) weaknessArea.value = CLAN_WEAKNESSES[currentClan];
        }

        renderSocialProfile();
        updateWalkthrough();
        window.updatePools();
        
        console.log("UI Refresh Complete.");
        
        // Restore Phase
        if(window.state.furthestPhase) window.changeStep(window.state.furthestPhase);

    } catch(e) {
        console.error("Refresh Error:", e);
        window.showNotification("Error Refreshing UI");
    }
};

// --- INITIALIZATION LOGIC ---

function initUI() {
    try {
        if (!document.getElementById('sheet-nav')) throw new Error("Navigation container 'sheet-nav' is missing from HTML.");

        const vSpan = document.getElementById('app-version');
        if(vSpan) vSpan.innerText = APP_VERSION;

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
        
        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
        renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
        renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
        renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
        renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
        renderDerangementsList(); 
        VIRTUES.forEach(v => { window.state.dots.virt[v] = 1; renderRow('list-virt', v, 'virt', 1); });
        
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
        
        // FIXED: c-gen is included here for critical validation updates
        const criticalFields = ['c-name', 'c-nature', 'c-demeanor', 'c-clan', 'c-gen', 'c-player', 'c-concept', 'c-sire'];
        criticalFields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const updateState = (e) => { window.state.textFields[id] = e.target.value; updateWalkthrough(); };
                el.addEventListener('keyup', updateState);
                el.addEventListener('change', updateState);
            }
        });

        document.body.addEventListener('change', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                if(e.target.id && !e.target.id.startsWith('search')) { 
                    window.state.textFields[e.target.id] = e.target.value; 
                    // Special case for XP Total input to update sidebar
                    if (e.target.id === 'c-xp-total') window.updatePools();
                }
            }
        });

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
        const topXpBtn = document.getElementById('toggle-xp-btn'); // NEW XP Button Listener
        if(topXpBtn) topXpBtn.onclick = window.toggleXpMode;

        // AUTH HANDLERS
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
                if(confirm("Logout? Unsaved changes to current character will be lost.")) {
                    try {
                        await signOut(auth);
                        window.location.reload(); // Reset state
                    } catch(e) {
                        console.error(e);
                    }
                }
            };
        }

        // NEW: Email/Password Modal Logic
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

        // --- GLOBAL LISTENER FOR GENERATION SYNC ---
        document.body.addEventListener('click', function(e) {
            if (e.target.classList.contains('dot')) {
                const row = e.target.closest('.dot-row');
                if (row) {
                    const traitName = row.dataset.n;
                    const traitType = row.dataset.t;

                    if (traitType === 'back' && traitName === 'Generation') {
                        setTimeout(() => {
                            const genDots = window.state.dots.back['Generation'] || 0;
                            // V20: 0 dots = 13th Gen, 1 dot = 12th, ..., 5 dots = 8th
                            const newGen = 13 - genDots;
                            
                            // Update Text Field
                            window.state.textFields['c-gen'] = newGen.toString();
                            const genInput = document.getElementById('c-gen');
                            if (genInput) genInput.value = newGen;

                            // Update Validation
                            updateWalkthrough();
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

        window.changeStep(1); 

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
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(userInfo) {
            userInfo.classList.add('hidden');
            userInfo.style.display = 'none';
        }
    }
}

onAuthStateChanged(auth, async (u) => {
    const loader = document.getElementById('loading-overlay');
    
    // Update Auth UI immediately based on state
    updateAuthUI(u);
    
    // Check if user is logged in AND not anonymous
    if(u && !u.isAnonymous) {
        user = u;
        console.log("User signed in:", user.uid);

        try {
            // 1. POPULATE DROPDOWNS FIRST
            // This fixes the race condition where data is loaded before options exist.
            
            // Nature / Demeanor
            const ns = document.getElementById('c-nature');
            const ds = document.getElementById('c-demeanor');
            if(ns && ds && typeof ARCHETYPES !== 'undefined') {
                ns.innerHTML = '<option value="" disabled selected>Choose Nature...</option>'; 
                ds.innerHTML = '<option value="" disabled selected>Choose Demeanor...</option>'; 
                
                const sortedArch = [...ARCHETYPES].sort(); 
                sortedArch.forEach(a => { 
                    ns.add(new Option(a,a)); 
                    ds.add(new Option(a,a)); 
                });
            }

            // Clans
            const cs = document.getElementById('c-clan');
            if(cs && typeof CLANS !== 'undefined') {
                cs.innerHTML = '<option value="" disabled selected>Choose Clan...</option>';
                const sortedClans = [...CLANS].sort();
                sortedClans.forEach(c => cs.add(new Option(c,c)));
                
                // Add listener to auto-populate weakness AND Disciplines
                cs.addEventListener('change', (e) => {
                    const clan = e.target.value;
                    
                    // A. Weakness
                    const weaknessArea = document.getElementById('c-clan-weakness');
                    if (weaknessArea && CLAN_WEAKNESSES[clan]) {
                        weaknessArea.value = CLAN_WEAKNESSES[clan];
                        // Also update state for persistence
                        if (!window.state.textFields) window.state.textFields = {};
                        window.state.textFields['c-clan-weakness'] = CLAN_WEAKNESSES[clan];
                    }

                    // B. Disciplines (Auto-fill 3 in-clan)
                    if (CLAN_DISCIPLINES && CLAN_DISCIPLINES[clan]) {
                        // Reset disc state
                        window.state.dots.disc = {};
                        // Add the 3 clan disciplines with 0 dots
                        CLAN_DISCIPLINES[clan].forEach(d => {
                            window.state.dots.disc[d] = 0;
                        });
                        // Update UI immediately
                        renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
                    }
                    
                    // Force update validation when Clan changes
                    updateWalkthrough();
                });
            }

            // Paths
            const ps1 = document.getElementById('c-path-name');
            const ps2 = document.getElementById('c-path-name-create');
            if (typeof PATHS !== 'undefined') {
                if(ps1) { ps1.innerHTML = ''; PATHS.forEach(p => ps1.add(new Option(p,p))); }
                if(ps2) { ps2.innerHTML = ''; PATHS.forEach(p => ps2.add(new Option(p,p))); }
            }

            if(ps1) ps1.addEventListener('change', (e) => { 
                if(ps2) ps2.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });
            if(ps2) ps2.addEventListener('change', (e) => { 
                if(ps1) ps1.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });

            // 2. HYDRATE INPUTS AFTER POPULATION
            // This ensures that if we have state loaded, the dropdowns select the correct value
            hydrateInputs();
            
            // FIXED: Force validation check immediately after loading
            updateWalkthrough();
            
            // Re-check Clan Weakness based on hydrated value
            const currentClan = document.getElementById('c-clan')?.value;
            if (currentClan && CLAN_WEAKNESSES[currentClan]) {
                const weaknessArea = document.getElementById('c-clan-weakness');
                if (weaknessArea) weaknessArea.value = CLAN_WEAKNESSES[currentClan];
            }

            const freebieInp = document.getElementById('c-freebie-total');
            if(freebieInp) freebieInp.oninput = window.updatePools;

            // Remove Loader
            if(loader) loader.style.display = 'none';

        } catch (dbErr) {
            console.error("DB Init Error:", dbErr);
            window.showNotification("DB Conn Error");
        }
    } else {
        // --- SAFE AUTHENTICATION (ANONYMOUS OR NOT LOGGED IN) ---
        // UI Update for Auth handled at top of function
        
        try {
            // Only try to sign in anonymously if we aren't already signed in as anon
            // This handles the initial load and explicit sign-out scenarios
            if (!u) {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            }
            
            // Populate dropdowns even for anonymous users so they can use the app
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
                });
            }
            
            if(loader) loader.style.display = 'none';

        } catch (e) {
            console.error("Authentication Error:", e);
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
});

initUI();
