import { GhoulTemplate } from "./npc-ghoul.js";
import { MortalTemplate } from "./npc-mortal.js";
import { AnimalTemplate } from "./npc-animal.js";
import { showNotification } from "./ui-common.js";
import { toggleStat, clearPool } from "./ui-mechanics.js";

// Import New Modules
import * as Logic from "./npc-logic.js";
import * as EditUI from "./npc-sheet-edit.js";
import * as PlayUI from "./npc-sheet-play.js";

// Registry of available templates
const TEMPLATES = {
    'mortal': MortalTemplate,
    'ghoul': GhoulTemplate,
    'animal': AnimalTemplate
};

// Global State
let activeNpc = null;
let currentTemplate = null;
let activeIndex = null; // Index in the global retainer list
let currentTab = 'step1';
let modes = { xp: false, freebie: false };
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

export function openNpcCreator(typeKey = 'mortal', dataOrEvent = null, index = null) {
    toggleDiceUI(false); // Hide dice in edit mode

    if (!TEMPLATES[typeKey]) typeKey = 'mortal';
    currentTemplate = TEMPLATES[typeKey];

    // Determine Input Data
    let incomingData = null;
    const isEvent = dataOrEvent && (typeof dataOrEvent.preventDefault === 'function' || dataOrEvent.target);
    if (dataOrEvent && !isEvent) incomingData = dataOrEvent;

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1';
    modes = { xp: false, freebie: false };
    
    // Reset Priorities
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };

    if (incomingData) {
        // Edit Mode
        activeNpc = JSON.parse(JSON.stringify(incomingData));
        if (activeNpc.template && TEMPLATES[activeNpc.template]) {
            currentTemplate = TEMPLATES[activeNpc.template];
        }
        activeNpc = Logic.sanitizeNpcData(activeNpc);
        
        if (activeNpc.priorities) localPriorities = JSON.parse(JSON.stringify(activeNpc.priorities));
        else Logic.autoDetectPriorities(activeNpc, currentTemplate, localPriorities);
    } else {
        // Create Mode
        activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
        activeNpc.template = typeKey;
        activeNpc = Logic.sanitizeNpcData(activeNpc);
        Logic.recalcStatus(activeNpc);
    }

    // Initialize Edit UI with Context and Callbacks
    EditUI.initEditSheet(
        { activeNpc, currentTemplate, modes, localPriorities, currentTab },
        getEditCallbacks()
    );

    EditUI.renderEditorModal();
}

export function openNpcSheet(npc, index) {
    if (!npc) return;
    
    toggleDiceUI(true, true); // Show dice on top

    activeNpc = npc; 
    activeIndex = index;
    const typeKey = npc.template || 'mortal';
    currentTemplate = TEMPLATES[typeKey] || MortalTemplate;
    
    activeNpc = Logic.sanitizeNpcData(activeNpc);

    // Initialize Play UI with Context and Callbacks
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
        saveNpc: handleSaveNpc,
        toggleMode: handleToggleMode,
        switchTemplate: handleSwitchTemplate,
        handleValueChange: handleValueChange,
        removeNpcItem: handleRemoveItem,
        removeNpcInv: (idx) => {
            if(activeNpc.inventory) activeNpc.inventory.splice(idx, 1);
            EditUI.renderInventoryList();
        },
        importData: importNpcData,
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
    if (!TEMPLATES[newType]) return;

    // Preserve Identity
    const preserved = {
        name: activeNpc.name,
        chronicle: activeNpc.chronicle,
        concept: activeNpc.concept,
        nature: activeNpc.nature,
        demeanor: activeNpc.demeanor,
        bio: JSON.parse(JSON.stringify(activeNpc.bio || {}))
    };

    currentTemplate = TEMPLATES[newType];
    activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
    activeNpc.template = newType;
    Object.assign(activeNpc, preserved);
    
    activeNpc = Logic.sanitizeNpcData(activeNpc);
    
    // Reset State
    modes.xp = false; 
    modes.freebie = false;
    localPriorities = { attr: { Physical: null, Social: null, Mental: null }, abil: { Talents: null, Skills: null, Knowledges: null } };
    Logic.recalcStatus(activeNpc);

    // Re-init UI with new context
    EditUI.initEditSheet(
        { activeNpc, currentTemplate, modes, localPriorities, currentTab },
        getEditCallbacks()
    );
    EditUI.renderEditorModal();
    showNotification(`Switched to ${currentTemplate.label} template.`);
}

function handleToggleMode(mode) {
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
    
    // --- XP MODE ---
    if (modes.xp) {
        let finalVal = newVal;
        if (newVal === currentVal) finalVal = newVal - 1; // Toggle down

        if (finalVal > currentVal) {
            // BUY
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
            // REFUND (Undo last purchase of this trait)
            let logIdx = -1;
            const targetTrait = key || type;
            // Find most recent matching log entry
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
    // --- FREEBIE MODE ---
    else if (modes.freebie) {
        let finalVal = newVal;
        if (newVal === currentVal) finalVal = newVal - 1; 
        
        // Validation: Don't allow going below base generation stats
        if (finalVal < currentVal) {
            if (!Logic.validateFreebieRefund(type, key, finalVal, activeNpc, localPriorities, currentTemplate)) {
                showNotification("Cannot refund base dots (Creation points).");
                return;
            }
        }

        if (type === 'attributes' && finalVal < 1) return;
        if (finalVal < 0) return;

        if (finalVal > currentVal) {
            // SPEND
            const cost = Logic.calculateMarginalFreebieCost(type, key, currentVal, finalVal, activeNpc, localPriorities, currentTemplate);
            const avail = Logic.getFreebiesAvailable(activeNpc);
            
            if (cost > avail) {
                showNotification(`Not enough Freebie Points! Need ${cost}, have ${avail}.`);
                return;
            }

            if (cost > 0) {
                activeNpc.freebieLog.push({
                    type: type, trait: key || type, from: currentVal, to: finalVal, cost: cost
                });
            }
        } else {
            // REFUND (Consolidate log logic)
            let rangeBottom = finalVal;
            const traitName = key || type;

            for (let i = activeNpc.freebieLog.length - 1; i >= 0; i--) {
                const entry = activeNpc.freebieLog[i];
                if (entry.trait !== traitName) continue;

                if (entry.from >= rangeBottom) {
                    // Full refund of this step
                    activeNpc.freebieLog.splice(i, 1);
                }
                else if (entry.to > rangeBottom) {
                    // Partial refund (shouldn't happen often with single dot clicks, but safe to handle)
                    const retainedCost = Logic.calculateMarginalFreebieCost(type, key, entry.from, rangeBottom, activeNpc, localPriorities, currentTemplate, rangeBottom);
                    entry.to = rangeBottom;
                    entry.cost = retainedCost;
                }
            }
        }
        applyChange(type, key, finalVal);
    } 
    // --- CREATION MODE ---
    else {
        if (type === 'humanity' || type === 'willpower') {
            showNotification("Derived trait. Modify Virtues or use Freebie/XP mode.");
            return;
        }

        if (newVal === currentVal) newVal = newVal - 1;
        if ((type === 'attributes' || type === 'virtues') && newVal < 1) return;
        if (newVal < 0) return;

        const valid = currentTemplate.validateChange(type, key, newVal, currentVal, activeNpc, localPriorities);
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
    
    // UI Refresh
    if(type === 'disciplines') EditUI.renderDisciplines();
    if(type === 'backgrounds') EditUI.renderBackgrounds();
    if(type === 'merits' || type === 'flaws') EditUI.renderMeritsFlaws();
    EditUI.updateFreebieCalc();
}

function applyChange(type, key, val) {
    if (key) activeNpc[type][key] = val;
    else activeNpc[type] = val;

    if (type === 'virtues') Logic.recalcStatus(activeNpc);

    // Specific UI Refresh
    EditUI.renderAllDots();
    if (type === 'disciplines') EditUI.renderDisciplines();
    if (type === 'backgrounds') EditUI.renderBackgrounds();
    EditUI.updateXpLog();
    EditUI.updateFreebieCalc();
}

// ==========================================================================
// IMPORT / EXPORT / SAVE
// ==========================================================================

function handleSaveNpc() {
    // Scrape DOM inputs
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
    
    // Sync Pools
    activeNpc.currentBlood = activeNpc.bloodPool;
    activeNpc.tempWillpower = activeNpc.willpower;

    activeNpc.priorities = JSON.parse(JSON.stringify(localPriorities));

    // Dynamic Fields
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
    const setIf = (id, prop) => { const v = getVal(id); if(v !== null) activeNpc[prop] = v; };

    setIf('npc-extra-clan', 'domitorClan');
    setIf('npc-subtype', 'type');
    setIf('g-weakness', 'weakness'); // if exists in specific template
    setIf('npc-bond-level', 'bondLevel');
    setIf('inv-feeding-grounds', 'feedingGrounds');
    setIf('npc-nat-weapons', 'naturalWeapons');

    // Save to Global State
    const cleanNpc = JSON.parse(JSON.stringify(activeNpc));
    if (!window.state.retainers) window.state.retainers = [];
    
    if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = cleanNpc;
    else window.state.retainers.push(cleanNpc);

    if (window.renderNpcTab) window.renderNpcTab();
    
    showNotification(`${currentTemplate.label} Saved.`);
    document.getElementById('npc-modal').style.display = 'none';
    toggleDiceUI(true);
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
                } else {
                    activeNpc.template = 'mortal';
                    currentTemplate = TEMPLATES['mortal'];
                }
                
                if (activeNpc.priorities) localPriorities = activeNpc.priorities;
                else Logic.autoDetectPriorities(activeNpc, currentTemplate, localPriorities);
                
                // Re-init Edit Mode
                EditUI.initEditSheet(
                    { activeNpc, currentTemplate, modes, localPriorities, currentTab },
                    getEditCallbacks()
                );
                EditUI.renderEditorModal();
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

// Window Unload Protection (Checking for name input in Edit UI)
window.addEventListener('beforeunload', (e) => {
    const nameInput = document.getElementById('npc-name');
    if (nameInput && nameInput.value && document.getElementById('npc-modal').style.display !== 'none') {
        e.preventDefault();
        e.returnValue = ''; 
        return "Unsaved changes may be lost.";
    }
});
