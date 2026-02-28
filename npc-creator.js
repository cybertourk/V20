import { GhoulTemplate } from "./npc-ghoul.js";
import { MortalTemplate } from "./npc-mortal.js";
import { AnimalTemplate } from "./npc-animal.js";
import { showNotification } from "./ui-common.js";
import { toggleStat, clearPool } from "./ui-mechanics.js";

// Import New Modules
import * as Logic from "./npc-logic.js";
import * as EditUI from "./npc-sheet-edit.js";
import * as PlayUI from "./npc-sheet-play.js";

// Import Storyteller State to check permissions
import { stState } from "./ui-storyteller.js";
import { db, doc, setDoc, getDoc, collection, auth, appId } from "./firebase-config.js";

// Registry of available templates
const TEMPLATES = {
    'mortal': MortalTemplate,
    'ghoul': GhoulTemplate,
    'animal': AnimalTemplate
};

// UNLIMITED TEMPLATE (Fallback for Bestiary)
const BestiaryTemplate = {
    type: "Bestiary",
    label: "Bestiary / Custom",
    features: {
        disciplines: true, bloodPool: true, virtues: true, backgrounds: true, humanity: true
    },
    defaults: {
        template: "bestiary",
        attributes: { Strength: 1, Dexterity: 1, Stamina: 1, Charisma: 1, Manipulation: 1, Appearance: 1, Perception: 1, Intelligence: 1, Wits: 1 },
        abilities: {},
        disciplines: {},
        backgrounds: {},
        merits: {},
        flaws: {},
        virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
        humanity: 1,
        willpower: 1,
        bloodPool: 10,
        bio: {}
    },
    validateChange: () => true,
    getCost: () => 0, 
    getPriorities: () => null, 
    getVirtueLimit: () => 10
};

// VAMPIRE TEMPLATE (Placeholder for Imported PCs)
const VampireTemplate = {
    type: "Vampire",
    label: "Vampire (Imported)",
    features: { disciplines: true, bloodPool: true, virtues: true, backgrounds: true, humanity: true },
    defaults: { template: "vampire" }, // Identity will be overwritten by import
    validateChange: () => "Imported Vampires cannot be edited here. Use the main Creator to modify them.",
    getCost: () => 0,
    getPriorities: () => null,
    getVirtueLimit: () => 10,
    
    // Custom UI for Step 1 to allow importing
    renderIdentityExtras: (data) => {
        return `
            <div class="space-y-4 border-t border-[#333] pt-4 mt-2">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="label-text text-[#d4af37]">Clan</label>
                        <input type="text" id="npc-vamp-clan" value="${data.clan || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm focus:border-[#d4af37] outline-none">
                    </div>
                    <div>
                        <label class="label-text text-[#d4af37]">Generation</label>
                        <input type="text" id="npc-vamp-gen" value="${data.generation || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm focus:border-[#d4af37] outline-none">
                    </div>
                </div>
                <div class="p-4 bg-purple-900/10 border border-purple-900/40 rounded mt-4">
                    <div class="text-[10px] text-purple-400 mb-2 font-bold uppercase"><i class="fas fa-file-import mr-1"></i> Character Import</div>
                    <p class="text-[10px] text-gray-400 leading-relaxed mb-4">
                        Load a full Vampire character from your cloud saves or a local JSON file to add them as an NPC.
                    </p>
                    <div class="grid grid-cols-1 gap-2">
                        <button id="npc-load-archive" class="w-full bg-[#222] hover:bg-[#333] border border-[#444] text-white text-[10px] py-2 font-bold uppercase tracking-widest rounded transition-all">
                            <i class="fas fa-cloud-download-alt mr-2"></i> Load from Archives
                        </button>
                        <div class="text-center text-[9px] text-gray-600 uppercase font-bold">Or</div>
                        <button onclick="document.getElementById('file-import-npc').click()" class="w-full bg-black hover:bg-[#111] border border-[#333] text-gray-400 text-[10px] py-2 font-bold uppercase tracking-widest rounded transition-all">
                            <i class="fas fa-file-code mr-2"></i> Import JSON File
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    setupListeners: (parent, data, updateCallback) => {
        const clanEl = parent.querySelector('#npc-vamp-clan');
        if (clanEl) clanEl.onchange = (e) => data.clan = e.target.value;
        
        const genEl = parent.querySelector('#npc-vamp-gen');
        if (genEl) genEl.onchange = (e) => data.generation = e.target.value;

        const loadBtn = parent.querySelector('#npc-load-archive');
        if (loadBtn) {
            loadBtn.onclick = async () => {
                const modal = document.getElementById('load-modal');
                if (!modal) return;

                if (window.handleLoadClick) {
                    await window.handleLoadClick();
                } else {
                    modal.classList.add('active');
                }

                const originalLoad = window.loadSelectedCharFromId;
                
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class' && !modal.classList.contains('active')) {
                            window.loadSelectedCharFromId = originalLoad;
                            observer.disconnect(); 
                        }
                    });
                });
                observer.observe(modal, { attributes: true });

                window.loadSelectedCharFromId = async (id) => {
                    const user = auth.currentUser;
                    if (!user) return;
                    
                    modal.classList.remove('active');
                    
                    try {
                        const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'characters', id));
                        if (snap.exists()) {
                            const pcData = snap.data();
                            const converted = convertPcToNpc(pcData);
                            
                            Object.assign(data, converted);
                            showNotification(`Imported ${data.name} successfully.`);
                            
                            EditUI.renderEditorModal(); 
                            if (stState && stState.isStoryteller) injectBestiarySaveButton(); // Re-inject dual buttons
                        } else {
                            showNotification("Save file not found.", "error");
                        }
                    } catch (e) { 
                        console.error("Archive Import Error:", e); 
                        showNotification("Failed to import PC data.", "error");
                    } 
                };
            };
        }
    }
};

/**
 * Maps a full Vampire PC State object into the flatter NPC data structure.
 */
function convertPcToNpc(pc) {
    const tf = pc.textFields || {};
    const dots = pc.dots || {};
    
    // Calculate blood limit based on Generation
    const gen = parseInt(tf['c-gen']) || 13;
    const genLimits = { 15:10, 14:10, 13:10, 12:11, 11:12, 10:13, 9:14, 8:15, 7:20, 6:30, 5:40, 4:50 };
    const maxBlood = genLimits[gen] || 10;
    
    return {
        name: tf['c-name'] || "Unnamed Vampire",
        template: "vampire", 
        type: "Vampire", 
        clan: tf['c-clan'] || "",
        generation: tf['c-gen'] || "13",
        sire: tf['c-sire'] || "",
        concept: tf['c-concept'] || "",
        nature: tf['c-nature'] || "",
        demeanor: tf['c-demeanor'] || "",
        attributes: JSON.parse(JSON.stringify(dots.attr || {})),
        abilities: JSON.parse(JSON.stringify(dots.abil || {})),
        disciplines: JSON.parse(JSON.stringify(dots.disc || {})),
        backgrounds: JSON.parse(JSON.stringify(dots.back || {})),
        virtues: JSON.parse(JSON.stringify(dots.virt || { Conscience: 1, "Self-Control": 1, Courage: 1 })),
        specialties: JSON.parse(JSON.stringify(pc.specialties || {})),
        merits: pc.merits ? pc.merits.reduce((acc, m) => { 
            if (m && (m.name || m.n)) acc[m.name || m.n] = m.val ?? m.cost ?? 0; 
            return acc; 
        }, {}) : {},
        flaws: pc.flaws ? pc.flaws.reduce((acc, f) => { 
            if (f && (f.name || f.n)) acc[f.name || f.n] = f.val ?? f.cost ?? 0; 
            return acc; 
        }, {}) : {},
        humanity: pc.status?.humanity ?? 7,
        willpower: pc.status?.willpower ?? 5,
        tempWillpower: pc.status?.tempWillpower ?? 5,
        bloodPool: maxBlood,
        currentBlood: pc.status?.blood || 0,
        health: { 
            track: pc.status?.health_states || [0,0,0,0,0,0,0], 
            damage: (pc.status?.health_states || []).filter(x => x > 0).length 
        },
        inventory: JSON.parse(JSON.stringify(pc.inventory || [])),
        feedingGrounds: tf['inv-feeding-grounds'] || "",
        image: pc.characterImage || null,
        bio: {
            Description: tf['bio-desc'] || "",
            Notes: tf['char-history'] || pc.charHistory || "",
            "Age": tf['bio-Age'] || "",
            "Date of Birth": tf['bio-Date of Birth'] || "",
            "Hair": tf['bio-Hair'] || "",
            "Eyes": tf['bio-Eyes'] || "",
            "Race": tf['bio-Race'] || "",
            "Nationality": tf['bio-Nationality'] || "",
            "Height": tf['bio-Height'] || "",
            "Weight": tf['bio-Weight'] || "",
            "Sex": tf['bio-Sex'] || ""
        },
        weakness: tf['c-clan-weakness'] || ""
    };
}

// Global State
let activeNpc = null;
let currentTemplate = null;
let activeIndex = null; 
let activeCloudId = null; 
let currentTab = 'step1';
let modes = { xp: false, freebie: false, unlimited: false };
let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

// Helper to toggle main app dice container
function toggleDiceUI(show, bringToFront = false) {
    const diceEl = document.getElementById('dice-container');
    if (diceEl) {
        if (show) {
            diceEl.style.display = 'block'; 
            diceEl.style.visibility = 'visible';
            diceEl.style.zIndex = bringToFront ? '1000' : ''; 
        } else {
            diceEl.style.display = 'none';
        }
    }
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

export function openNpcCreator(typeKey = 'mortal', dataOrEvent = null, index = null, cloudId = null) {
    toggleDiceUI(false); 

    // Check if it's bestiary/custom
    if (typeKey === 'vampire') {
        currentTemplate = VampireTemplate;
    } else if (!TEMPLATES[typeKey] && (typeKey === 'bestiary' || typeKey === 'custom')) {
        currentTemplate = BestiaryTemplate;
    } else if (TEMPLATES[typeKey]) {
        currentTemplate = TEMPLATES[typeKey];
    } else {
        if (dataOrEvent && dataOrEvent.template === 'bestiary') {
             currentTemplate = BestiaryTemplate;
        } else if (dataOrEvent && dataOrEvent.template === 'vampire') {
             currentTemplate = VampireTemplate;
        } else {
             currentTemplate = BestiaryTemplate; 
        }
    }

    // Determine Input Data
    let incomingData = null;
    const isEvent = dataOrEvent && (typeof dataOrEvent.preventDefault === 'function' || dataOrEvent.target);
    if (dataOrEvent && !isEvent) incomingData = dataOrEvent;

    activeIndex = (typeof index === 'number') ? index : null;
    activeCloudId = cloudId || null; 

    currentTab = 'step1';
    modes = { xp: false, freebie: false, unlimited: false };
    
    // Reset Priorities
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };

    if (incomingData) {
        activeNpc = JSON.parse(JSON.stringify(incomingData));
        
        if (activeNpc.template === 'vampire') {
            currentTemplate = VampireTemplate;
        } else if (TEMPLATES[activeNpc.template]) {
            currentTemplate = TEMPLATES[activeNpc.template];
        } else {
            currentTemplate = BestiaryTemplate;
            activeNpc.template = 'bestiary';
        }

        activeNpc = Logic.sanitizeNpcData(activeNpc);
        
        if (activeNpc.priorities) {
            localPriorities = JSON.parse(JSON.stringify(activeNpc.priorities));
        } else if (currentTemplate.getPriorities && currentTemplate.getPriorities()) {
             Logic.autoDetectPriorities(activeNpc, currentTemplate, localPriorities);
        }

        if (activeCloudId || activeNpc.template === 'animal' || activeNpc.template === 'bestiary' || activeNpc.template === 'vampire') {
            modes.unlimited = true;
        }

    } else {
        activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
        activeNpc.template = typeKey === 'custom' ? 'bestiary' : typeKey;
        activeNpc = Logic.sanitizeNpcData(activeNpc);
        Logic.recalcStatus(activeNpc);
        
        if (typeKey === 'bestiary' || typeKey === 'custom' || typeKey === 'vampire') {
            modes.unlimited = true;
        }
    }

    EditUI.initEditSheet(
        { activeNpc, currentTemplate, modes, localPriorities, currentTab },
        getEditCallbacks()
    );

    EditUI.renderEditorModal();
    
    if (stState && stState.isStoryteller) {
        injectBestiarySaveButton();
    }
}

function injectBestiarySaveButton() {
    if (!stState || !stState.isStoryteller) return;

    // 1. Sidebar Button Replacement
    const sidebarBtn = document.getElementById('npc-save-btn');
    if (sidebarBtn && sidebarBtn.parentNode) {
        const parent = sidebarBtn.parentNode;
        parent.innerHTML = `
            <button id="npc-save-local-side" class="w-full bg-[#222] hover:bg-[#333] text-white font-bold py-3 text-xs uppercase tracking-[0.2em] shadow-lg transition-all border border-[#444] mb-2 flex justify-center items-center gap-2" title="Save to Personal Retainers List"><i class="fas fa-file-alt"></i> Save to Sheet</button>
            <button id="npc-save-bestiary-side" class="w-full bg-[#8b0000] hover:bg-red-700 text-white font-bold py-3 text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex justify-center items-center gap-2" title="Save to Chronicle Bestiary"><i class="fas fa-dragon"></i> Save to Bestiary</button>
        `;
        document.getElementById('npc-save-local-side').onclick = () => handleSaveNpc(false);
        document.getElementById('npc-save-bestiary-side').onclick = () => handleSaveNpc(true);
    }

    // 2. Footer Button Replacement
    const footerSaveBtn = document.getElementById('npc-save');
    if (footerSaveBtn && footerSaveBtn.parentNode) {
        const footerDiv = footerSaveBtn.parentNode;
        footerDiv.innerHTML = `
            <button id="npc-cancel" class="border border-[#444] text-gray-400 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] hover:text-white transition">Cancel</button>
            <button id="npc-save-local-foot" class="bg-[#222] text-white px-4 py-2 uppercase font-bold text-xs hover:bg-[#333] border border-[#444] shadow-lg tracking-widest transition flex items-center gap-2" title="Save to Personal Retainers List">
                <i class="fas fa-file-alt"></i> Save to Sheet
            </button>
            <button id="npc-save-bestiary-foot" class="bg-[#8b0000] text-white px-6 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2" title="Save to Chronicle Bestiary">
                <i class="fas fa-dragon"></i> Save to Bestiary
            </button>
        `;
        document.getElementById('npc-cancel').onclick = () => { 
            document.getElementById('npc-modal').style.display = 'none'; 
            toggleDiceUI(true); 
        };
        document.getElementById('npc-save-local-foot').onclick = () => handleSaveNpc(false);
        document.getElementById('npc-save-bestiary-foot').onclick = () => handleSaveNpc(true);
    }
}

export function openNpcSheet(npc, index) {
    if (!npc) return;
    
    toggleDiceUI(true, true); 

    activeNpc = npc; 
    activeIndex = index;
    const typeKey = npc.template || 'mortal';
    currentTemplate = (typeKey === 'vampire' ? VampireTemplate : (TEMPLATES[typeKey] || BestiaryTemplate));
    
    activeNpc = Logic.sanitizeNpcData(activeNpc);

    PlayUI.initPlaySheet(
        { activeNpc, activeIndex },
        getPlayCallbacks()
    );

    PlayUI.renderPlaySheetModal();
}

// ==========================================================================
// CALLBACK FACTORIES
// ==========================================================================

function getEditCallbacks() {
    return {
        closeModal: () => { 
            document.getElementById('npc-modal').style.display = 'none'; 
            toggleDiceUI(true); 
        },
        saveNpc: () => {
            // For Players, it defaults to their personal sheet
            handleSaveNpc(false); 
        },
        toggleMode: handleToggleMode,
        switchTemplate: handleSwitchTemplate,
        handleValueChange: handleValueChange,
        removeNpcItem: handleRemoveItem,
        removeNpcInv: (idx) => {
            if(activeNpc.inventory) activeNpc.inventory.splice(idx, 1);
            EditUI.renderInventoryList();
        },
        importData: (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.dots && data.textFields) {
                        const converted = convertPcToNpc(data);
                        Object.assign(activeNpc, converted);
                        activeNpc.template = 'vampire';
                        currentTemplate = VampireTemplate;
                        modes.unlimited = true;
                        
                        EditUI.initEditSheet(
                            { activeNpc, currentTemplate, modes, localPriorities, currentTab },
                            getEditCallbacks()
                        );
                        EditUI.renderEditorModal();
                        if (stState && stState.isStoryteller) injectBestiarySaveButton(); // Re-inject dual buttons
                        showNotification("Imported PC JSON as NPC.");
                    } else {
                        importNpcData(event); 
                    }
                } catch(err) { console.error(err); }
            };
            reader.readAsText(file);
        },
        exportData: exportNpcData
    };
}

function getPlayCallbacks() {
    return {
        closeModal: () => { toggleDiceUI(true); },
        saveNpc: (silent) => {
             if (activeIndex !== null && window.state.retainers) {
                window.state.retainers[activeIndex] = activeNpc;
                if (!silent && window.performSave) window.performSave(true);
            }
        },
        toggleDiceUI: toggleDiceUI
    };
}

// ==========================================================================
// CONTROLLER LOGIC (Edit Mode)
// ==========================================================================

function handleSwitchTemplate(newType) {
    if (newType === 'vampire') {
        currentTemplate = VampireTemplate;
        modes.unlimited = true;
    } else if (newType === 'bestiary') {
        currentTemplate = BestiaryTemplate;
        modes.unlimited = true;
    } else if (TEMPLATES[newType]) {
        currentTemplate = TEMPLATES[newType];
        modes.unlimited = false;
    } else {
        return; 
    }

    const preserved = {
        name: activeNpc.name,
        chronicle: activeNpc.chronicle,
        concept: activeNpc.concept,
        sire: activeNpc.sire,
        nature: activeNpc.nature,
        demeanor: activeNpc.demeanor,
        bio: JSON.parse(JSON.stringify(activeNpc.bio || {}))
    };

    activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
    activeNpc.template = newType;
    Object.assign(activeNpc, preserved);
    
    activeNpc = Logic.sanitizeNpcData(activeNpc);
    
    modes.xp = false; 
    modes.freebie = false;
    
    if (activeCloudId || newType === 'bestiary' || newType === 'vampire') modes.unlimited = true;

    localPriorities = { attr: { Physical: null, Social: null, Mental: null }, abil: { Talents: null, Skills: null, Knowledges: null } };
    Logic.recalcStatus(activeNpc);

    EditUI.initEditSheet(
        { activeNpc, currentTemplate, modes, localPriorities, currentTab },
        getEditCallbacks()
    );
    EditUI.renderEditorModal();
    if (stState && stState.isStoryteller) injectBestiarySaveButton();
    showNotification(`Switched to ${currentTemplate.label} template.`);
}

function handleToggleMode(mode) {
    if (modes.unlimited) {
        showNotification("Unlimited Mode Active (Bestiary/Vampire)", "info");
        return;
    }

    if (mode === 'xp') {
        modes.xp = !modes.xp;
        if(modes.xp) modes.freebie = false;
    } else {
        modes.freebie = !modes.freebie;
        if(modes.freebie) modes.xp = false;
    }
    EditUI.updateModeUI();
}

function handleValueChange(type, key, newVal) {
    let currentVal = (key) ? (activeNpc[type][key] || 0) : activeNpc[type];
    
    if (modes.unlimited) {
        let finalVal = newVal;
        if (newVal === currentVal) finalVal = newVal - 1; 
        if (finalVal < 0) finalVal = 0;
        applyChange(type, key, finalVal);
        return; 
    }

    if (modes.xp) {
        let finalVal = newVal;
        if (newVal === currentVal) finalVal = newVal - 1; 

        if (finalVal > currentVal) {
            const cost = currentTemplate.getCost('xp', type, key, currentVal, finalVal, activeNpc);
            if (cost <= 0) { showNotification("XP cost invalid/zero."); return; }
            
            const rem = activeNpc.experience.total - activeNpc.experience.spent;
            if (cost > rem) { showNotification(`Not enough XP. Need ${cost}, Have ${rem}`); return; }

            activeNpc.experience.spent += cost;
            activeNpc.experience.log.push({ 
                date: Date.now(), trait: key || type, type: type, 
                from: currentVal, to: finalVal, cost: cost 
            });
            applyChange(type, key, finalVal);
        } else if (finalVal < currentVal) {
            let logIdx = -1;
            const targetTrait = key || type;
            for (let i = activeNpc.experience.log.length - 1; i >= 0; i--) {
                const entry = activeNpc.experience.log[i];
                if (entry.trait === targetTrait && entry.to === currentVal && entry.from === finalVal) {
                    logIdx = i; break;
                }
            }
            if (logIdx !== -1) {
                const entry = activeNpc.experience.log[logIdx];
                activeNpc.experience.spent -= entry.cost;
                activeNpc.experience.log.splice(logIdx, 1);
                applyChange(type, key, finalVal);
            } else {
                showNotification("Cannot refund points not spent in this session.");
            }
        }
    } 
    else if (modes.freebie) {
        let finalVal = newVal;
        if (newVal === currentVal) finalVal = newVal - 1; 
        
        if (finalVal < currentVal) {
            if (!Logic.validateFreebieRefund(type, key, finalVal, activeNpc, localPriorities, currentTemplate)) {
                showNotification("Cannot refund base dots (Creation points).");
                return;
            }
        }

        if (type === 'attributes' && finalVal < 1) return;
        if (finalVal < 0) return;

        if (finalVal > currentVal) {
            const cost = Logic.calculateMarginalFreebieCost(type, key, currentVal, finalVal, activeNpc, localPriorities, currentTemplate);
            if (cost !== 0) { 
                activeNpc.freebieLog.push({
                    type: type === 'merits' ? 'merit' : type === 'flaws' ? 'flaw' : type, 
                    trait: key || type, from: currentVal, to: finalVal, cost: cost
                });
            }
        } else {
            let rangeBottom = finalVal;
            const traitName = key || type;

            for (let i = activeNpc.freebieLog.length - 1; i >= 0; i--) {
                const entry = activeNpc.freebieLog[i];
                if (entry.trait !== traitName) continue;

                if (entry.from >= rangeBottom) {
                    activeNpc.freebieLog.splice(i, 1);
                }
                else if (entry.to > rangeBottom) {
                    const retainedCost = Logic.calculateMarginalFreebieCost(type, key, entry.from, rangeBottom, activeNpc, localPriorities, currentTemplate, rangeBottom);
                    entry.to = rangeBottom;
                    entry.cost = retainedCost;
                }
            }
        }
        applyChange(type, key, finalVal);
    } 
    else {
        if (type === 'humanity' || type === 'willpower') {
            showNotification("Derived trait. Modify Virtues or use Freebie/XP mode.");
            return;
        }

        if (newVal === currentVal) newVal = newVal - 1;
        if ((type === 'attributes' || type === 'virtues') && newVal < 1) return;
        if (newVal < 0) return;

        const valid = (type === 'merits' || type === 'flaws') ? true : currentTemplate.validateChange(type, key, newVal, currentVal, activeNpc, localPriorities);
        
        if (valid === true) {
            applyChange(type, key, newVal);
        } else {
            showNotification(valid);
        }
    }
}

function handleRemoveItem(type, key) {
    if (modes.freebie) {
        const logIdx = activeNpc.freebieLog.findIndex(l => l.type === (type==='merits'?'merit':'flaw') && l.trait === key);
        if (logIdx !== -1) activeNpc.freebieLog.splice(logIdx, 1);
    }
    if(activeNpc[type]) delete activeNpc[type][key];
    
    if(type === 'disciplines') EditUI.renderDisciplines();
    if(type === 'backgrounds') EditUI.renderBackgrounds();
    if(type === 'merits' || type === 'flaws') EditUI.renderMeritsFlaws();
    EditUI.updateFreebieCalc();
}

function applyChange(type, key, val) {
    if (key) activeNpc[type][key] = val;
    else activeNpc[type] = val;

    if (type === 'virtues') Logic.recalcStatus(activeNpc);

    EditUI.renderAllDots();
    if (type === 'disciplines') EditUI.renderDisciplines();
    if (type === 'backgrounds') EditUI.renderBackgrounds();
    EditUI.updateXpLog();
    EditUI.updateFreebieCalc();
}

// ==========================================================================
// IMPORT / EXPORT / SAVE
// ==========================================================================

async function handleSaveNpc(toBestiary = false) {
    activeNpc.name = document.getElementById('npc-name').value;
    activeNpc.domitor = document.getElementById('npc-domitor') ? document.getElementById('npc-domitor').value : "";
    activeNpc.concept = document.getElementById('npc-concept').value;
    activeNpc.nature = document.getElementById('npc-nature').value;
    activeNpc.demeanor = document.getElementById('npc-demeanor').value;
    
    const bioInputs = document.querySelectorAll('.npc-bio');
    bioInputs.forEach(i => activeNpc.bio[i.dataset.field] = i.value);
    activeNpc.bio.Description = document.getElementById('npc-desc').value;
    activeNpc.bio.Notes = document.getElementById('npc-notes').value;
    
    const bloodInput = document.getElementById('npc-blood');
    activeNpc.bloodPool = bloodInput ? parseInt(bloodInput.value) || 10 : 10;
    
    activeNpc.currentBlood = activeNpc.bloodPool;
    activeNpc.tempWillpower = activeNpc.willpower;
    activeNpc.priorities = JSON.parse(JSON.stringify(localPriorities));

    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
    const setIf = (id, prop) => { const v = getVal(id); if(v !== null) activeNpc[prop] = v; };

    setIf('npc-extra-clan', 'domitorClan');
    setIf('npc-vamp-clan', 'clan');
    setIf('npc-vamp-gen', 'generation');
    setIf('npc-sire', 'sire');
    setIf('npc-subtype', 'type');
    setIf('g-weakness', 'weakness'); 
    setIf('npc-bond-level', 'bondLevel');
    setIf('inv-feeding-grounds', 'feedingGrounds');
    setIf('npc-nat-weapons', 'naturalWeapons');

    const cleanNpc = JSON.parse(JSON.stringify(activeNpc));

    if (toBestiary) {
        if (!stState.activeChronicleId) {
            showNotification("No Active Chronicle found.", "error");
            return;
        }
        
        try {
            let npcId;
            if (activeCloudId) {
                npcId = activeCloudId; 
            } else {
                npcId = cleanNpc.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + "_" + Date.now(); 
            }

            const npcRef = doc(db, 'chronicles', stState.activeChronicleId, 'bestiary', npcId);
            
            await setDoc(npcRef, {
                name: cleanNpc.name,
                type: cleanNpc.template || "mortal",
                data: cleanNpc,
                source: "Custom",
                created_at: new Date().toISOString()
            });
            
            const actionVerb = activeCloudId ? "Updated" : "Saved";
            showNotification(`"${cleanNpc.name}" ${actionVerb} in Bestiary!`);
            
            document.getElementById('npc-modal').style.display = 'none';
            toggleDiceUI(true);
            
        } catch (e) {
            console.error("Bestiary Save Error:", e);
            showNotification("Error saving to Bestiary: " + e.message, "error");
        }
        
    } else {
        if (!window.state.retainers) window.state.retainers = [];
        
        if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = cleanNpc;
        else window.state.retainers.push(cleanNpc);

        if (window.renderNpcTab) window.renderNpcTab();
        generateNpcCodexEntry(cleanNpc);
        
        if (window.performSave) {
            window.performSave(true); 
            showNotification(`${currentTemplate.label} Saved & Synced to Personal Sheet.`);
        } else {
            showNotification(`${currentTemplate.label} Saved locally.`);
        }

        document.getElementById('npc-modal').style.display = 'none';
        toggleDiceUI(true);
    }
}

function generateNpcCodexEntry(npc) {
    if (!window.state.codex) window.state.codex = [];
    
    const name = npc.name ? npc.name.trim() : "";
    if (!name || name === "Unnamed" || name === "Unnamed NPC") return;

    const exists = window.state.codex.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;

    const tags = ["NPC"];
    if (npc.template) tags.push(npc.template.charAt(0).toUpperCase() + npc.template.slice(1));
    if (npc.domitorClan) tags.push(npc.domitorClan);
    if (npc.clan) tags.push(npc.clan);
    if (npc.species) tags.push(npc.species);
    
    let descLines = [];
    if (npc.concept) descLines.push(`Concept: ${npc.concept}`);
    if (npc.domitor) descLines.push(`Domitor: ${npc.domitor}`);
    if (npc.bio && npc.bio.Description) descLines.push(npc.bio.Description);
    
    const entry = {
        id: "cx_" + Date.now().toString(36) + Math.random().toString(36).substr(2,5),
        name: name,
        type: "NPC",
        tags: tags.filter(t => t),
        desc: descLines.join('\n\n')
    };
    
    window.state.codex.push(entry);
    console.log("Auto-generated Codex Entry for:", name);
}

function exportNpcData() {
    const dataStr = JSON.stringify(activeNpc, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (activeNpc.name || "npc").replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importNpcData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && typeof data === 'object') {
                activeNpc = data;
                activeNpc = Logic.sanitizeNpcData(activeNpc);
                
                if (activeNpc.template && TEMPLATES[activeNpc.template]) {
                    currentTemplate = TEMPLATES[activeNpc.template];
                } else if (activeNpc.template === 'bestiary') {
                    currentTemplate = BestiaryTemplate;
                } else if (activeNpc.template === 'vampire') {
                    currentTemplate = VampireTemplate;
                } else {
                    activeNpc.template = 'mortal';
                    currentTemplate = TEMPLATES['mortal'];
                }
                
                if (activeNpc.priorities) localPriorities = activeNpc.priorities;
                else if (currentTemplate.getPriorities && currentTemplate.getPriorities()) {
                     Logic.autoDetectPriorities(activeNpc, currentTemplate, localPriorities);
                }
                
                EditUI.initEditSheet(
                    { activeNpc, currentTemplate, modes, localPriorities, currentTab },
                    getEditCallbacks()
                );
                EditUI.renderEditorModal();
                if (stState && stState.isStoryteller) injectBestiarySaveButton(); // Re-inject dual buttons
                showNotification("NPC Imported Successfully");
            } else {
                alert("Invalid JSON structure.");
            }
        } catch (err) {
            console.error(err);
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

window.addEventListener('beforeunload', (e) => {
    const nameInput = document.getElementById('npc-name');
    if (nameInput && nameInput.value && document.getElementById('npc-modal').style.display !== 'none') {
        e.preventDefault();
        e.returnValue = ''; 
        return "Unsaved changes may be lost.";
    }
});

// --- GLOBAL EXPORTS ---
window.openNpcCreator = openNpcCreator;
window.openNpcSheet = openNpcSheet;
