import { 
    db, doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField, deleteDoc
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { BESTIARY } from "./bestiary-data.js";

// --- STATE ---
export const combatState = {
    isActive: false,
    turn: 1, // Represents the "Round" number (V20 'Turn')
    phase: 'declare', // 'declare' (Lowest to Highest) or 'action' (Highest to Lowest)
    activeCombatantId: null, // ID of the character currently declaring or acting
    rerollInitiative: true, // V20 Core: Reroll every round by default
    combatants: [], // Array of objects
    unsub: null
};

// --- INITIALIZATION ---
/**
 * Initializes the real-time listener for the active combat session.
 * @param {string} chronicleId - The ID of the current chronicle.
 */
export function initCombatTracker(chronicleId) {
    if (combatState.unsub) combatState.unsub();
    
    // SAFETY GUARD: Do not listen if ID is null/undefined
    if (!chronicleId) {
        console.warn("initCombatTracker called with null ID. Skipping listener.");
        return;
    }

    // Listen to the singleton combat document 'active'
    const docRef = doc(db, 'chronicles', chronicleId, 'combat', 'active');
    
    combatState.unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            combatState.isActive = true;
            combatState.turn = data.turn || 1; 
            combatState.phase = data.phase || 'declare';
            combatState.activeCombatantId = data.activeCombatantId || null;
            // Default to true if undefined
            combatState.rerollInitiative = data.rerollInitiative !== false; 
            combatState.combatants = data.combatants || [];
            
            // Sort: Highest Result First. (V20 Rules)
            combatState.combatants.sort((a, b) => b.init - a.init);
            
            // Mark the active combatant in the local array for UI helpers
            combatState.combatants.forEach(c => {
                c.active = (c.id === combatState.activeCombatantId);
            });

            // Trigger Storyteller Dashboard Refresh
            if (window.renderCombatView) {
                window.renderCombatView();
            }
            
            // Trigger Player Character Sheet Refresh (Sub-tab in Chronicle)
            if (window.updatePlayerCombatView) {
                window.updatePlayerCombatView();
            }
        } else {
            // Combat session is terminated
            combatState.isActive = false;
            combatState.combatants = [];
            combatState.activeCombatantId = null;
            combatState.phase = 'declare';
            combatState.rerollInitiative = true;
            
            if (window.renderCombatView) {
                window.renderCombatView();
            }
            
            if (window.updatePlayerCombatView) {
                window.updatePlayerCombatView();
            }
        }
    }, (error) => {
        if (error.code === 'permission-denied') {
            console.warn("Combat Tracker: Permission Denied. Access restricted until joined.");
        } else {
            console.error("Combat Tracker Error:", error);
        }
    });
}

// --- CORE ACTIONS ---

/**
 * Initializes a new combat session in Firestore.
 */
export async function startCombat() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await setDoc(docRef, {
            turn: 1,
            phase: 'declare', 
            activeCombatantId: null,
            rerollInitiative: true, 
            combatants: []
        });
        
        if (window.sendChronicleMessage) {
            window.sendChronicleMessage('system', "Combat Started! Stage One: Initiative & Declaration.");
        }
        showNotification("Combat Started!");
    } catch (e) {
        console.error("Failed to start combat:", e);
        showNotification("Error starting combat.", "error");
    }
}

/**
 * Deletes the active combat document to end the session.
 */
export async function endCombat() {
    const stState = window.stState;
    if (!confirm("End Combat? This clears the tracker for all players.")) return;
    if (!stState || !stState.activeChronicleId) return;

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await deleteDoc(docRef); 
        
        if (window.sendChronicleMessage) {
            window.sendChronicleMessage('system', "Combat Ended.");
        }
        showNotification("Combat Ended.");
    } catch (e) {
        console.error("Failed to end combat:", e);
    }
}

/**
 * Adds a new character or NPC to the combat list.
 */
export async function addCombatant(entity, type = 'NPC') {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    // Deduplication check
    if (combatState.combatants.some(c => c.id === entity.id)) {
        showNotification(`${entity.name} is already in combat.`);
        return;
    }

    const newCombatant = {
        id: entity.id,
        name: entity.name,
        type: type, // 'Player' or 'NPC'
        init: 0,
        health: type === 'NPC' ? (entity.health || { damage: 0, track: [0,0,0,0,0,0,0] }) : null,
        status: 'pending', // 'pending', 'held', 'defending', 'multiple', 'done'
        sourceId: type === 'NPC' ? (entity.sourceId || null) : null,
        hidden: false // Default to visible to all
    };

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        // Ensure turn exists before updating array
        await setDoc(docRef, { turn: combatState.turn || 1 }, { merge: true }); 
        
        await updateDoc(docRef, {
            combatants: arrayUnion(newCombatant)
        });
        showNotification(`${entity.name} added.`);
    } catch (e) {
        console.error("Failed to add combatant:", e);
    }
}

/**
 * Removes a specific combatant from the list.
 */
export async function removeCombatant(id) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await updateDoc(docRef, {
            combatants: arrayRemove(c)
        });
    } catch (e) {
        console.error("Failed to remove combatant:", e);
    }
}

/**
 * Updates the initiative value for a specific combatant.
 */
export async function updateInitiative(id, newVal) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    const list = [...combatState.combatants];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    list[idx].init = parseInt(newVal) || 0;
    
    // Sort descending for general state view
    list.sort((a, b) => b.init - a.init);
    await pushUpdate(list);
}

/**
 * Updates the tactical status of a combatant (e.g. 'Defending').
 */
export async function setCombatantStatus(id, newStatus) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    const list = [...combatState.combatants];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    list[idx].status = newStatus;
    await pushUpdate(list);
}

/**
 * Toggles visibility of a combatant for players.
 * @param {string} id - Combatant ID.
 * @param {boolean|string[]} hiddenValue - true (all), false (none), or array of player UIDs to hide from.
 */
export async function setCombatantHidden(id, hiddenValue) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    const list = [...combatState.combatants];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    list[idx].hidden = hiddenValue;
    await pushUpdate(list);
    
    const label = hiddenValue === true ? "Hidden from all" : (Array.isArray(hiddenValue) ? `Hidden from ${hiddenValue.length} players` : "Visible to all");
    showNotification(`${list[idx].name}: ${label}`);
}

/**
 * Allows players to update their own initiative values manually if enabled by phase.
 */
export async function playerUpdateInitiative(id, newVal, chronicleId) {
    try {
        await updateInitiative(id, newVal);
    } catch(e) { 
        console.error("Player Init Update Failed:", e); 
    }
}

/**
 * Toggles whether initiative resets at the end of every turn.
 */
export async function toggleRerollInit() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    const newVal = !combatState.rerollInitiative;
    try {
        await updateDoc(doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active'), {
            rerollInitiative: newVal
        });
        showNotification(`Reroll Initiative: ${newVal ? 'ON' : 'OFF'}`);
    } catch (e) {
        console.error("Toggle Reroll Failed:", e);
    }
}

// --- V20 DYNAMIC TURN PROGRESSION ---

/**
 * Moves the combat encounter forward following V20 turn order.
 * Phase 1: Declare (Lowest to Highest)
 * Phase 2: Action (Highest to Lowest)
 */
export async function nextTurn() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    if (combatState.combatants.length === 0) return;

    let { turn, phase, activeCombatantId, combatants } = combatState;
    
    // V20 Declaration Order: Lowest Initiative to Highest
    const sortedAsc = [...combatants].sort((a, b) => a.init - b.init);
    // V20 Action Order: Highest Initiative to Lowest
    const sortedDesc = [...combatants].sort((a, b) => b.init - a.init);

    const activeList = phase === 'declare' ? sortedAsc : sortedDesc;

    let currentIdx = -1;
    if (activeCombatantId) {
        currentIdx = activeList.findIndex(c => c.id === activeCombatantId);
    }

    let nextIdx = currentIdx + 1;
    let nextRound = turn;
    let nextPhase = phase;
    let updatedCombatants = [...combatants];

    if (nextIdx >= activeList.length) {
        if (phase === 'declare') {
            // TRANSITION TO ACTION PHASE
            nextPhase = 'action';
            activeCombatantId = sortedDesc[0].id; // Give it to the fastest
            showNotification("Action Phase! Resolving Highest to Lowest.");
            if (window.sendChronicleMessage) {
                window.sendChronicleMessage('system', `Round ${nextRound}: Action Phase Started`);
            }
        } else {
            // TRANSITION TO NEW ROUND
            nextRound++;
            nextPhase = 'declare';
            
            // Clean up statuses and reset initiatives if 'Reroll' is enabled
            updatedCombatants = updatedCombatants.map(c => {
                let newInit = c.init;
                if (combatState.rerollInitiative) {
                    newInit = 0; 
                }
                return { ...c, status: 'pending', init: newInit };
            });

            if (combatState.rerollInitiative) {
                activeCombatantId = null; // Wait for everyone to roll
                showNotification(`Round ${nextRound}: Roll Initiatives!`);
                if (window.sendChronicleMessage) {
                    window.sendChronicleMessage('system', `Round ${nextRound}: Roll Initiatives!`);
                }
            } else {
                updatedCombatants.sort((a, b) => a.init - b.init);
                activeCombatantId = updatedCombatants.length > 0 ? updatedCombatants[0].id : null;
                showNotification(`Round ${nextRound} Declaration Phase Started`);
            }
        }
    } else {
        // CONTINUE THROUGH LIST
        activeCombatantId = activeList[nextIdx].id;
        const actor = activeList[nextIdx];
        const phaseName = nextPhase === 'declare' ? 'Declaring' : 'Acting';
        showNotification(`${phaseName}: ${actor.name}`);
    }

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        const updates = { 
            turn: nextRound, 
            phase: nextPhase, 
            activeCombatantId: activeCombatantId 
        };
        // Only push combatants array if we actually modified it (round change)
        if (nextIdx >= activeList.length && phase === 'action') {
            updates.combatants = updatedCombatants;
        }
        await updateDoc(docRef, updates);
    } catch (e) { 
        console.error("Turn update failed:", e); 
    }
}

// --- NPC AUTO-ROLLER ---

/**
 * Batch rolls initiative for all NPCs currently at 0 initiative.
 */
export async function rollAllNPCInitiatives() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    let updatedList = [...combatState.combatants];
    let changed = false;
    let systemLog = [];

    updatedList.forEach(c => {
        if (c.type === 'NPC' && (!c.init || c.init === 0)) {
            let dex = 2, wits = 2, celerity = 0; 
            let data = null;
            
            if (c.sourceId && stState.bestiary && stState.bestiary[c.sourceId]) {
                data = stState.bestiary[c.sourceId].data;
            } else {
                for (const cat in BESTIARY) {
                    if (BESTIARY[cat][c.name]) { data = BESTIARY[cat][c.name]; break; }
                }
            }

            if (data) {
                dex = data.attributes?.Dexterity || 2;
                wits = data.attributes?.Wits || 2;
                celerity = data.disciplines?.Celerity || 0;
            }

            let woundPen = 0;
            if (c.health) {
                let dmgCount = (c.health.track && Array.isArray(c.health.track)) 
                    ? c.health.track.filter(x => x > 0).length 
                    : (c.health.damage || 0);
                
                if (dmgCount >= 7) woundPen = 99; 
                else if (dmgCount === 6) woundPen = 5;
                else if (dmgCount >= 4) woundPen = 2;
                else if (dmgCount >= 2) woundPen = 1;
            }

            if (woundPen < 99) {
                const rating = Math.max(0, dex + wits + celerity - woundPen);
                const roll = Math.floor(Math.random() * 10) + 1; 
                c.init = rating + roll;
                changed = true;
                
                let chatBreakdown = `Dex(${dex}) + Wits(${wits})`;
                if (celerity > 0) chatBreakdown += ` + Cel(${celerity})`;
                if (woundPen > 0) chatBreakdown += ` - Wounds(${woundPen})`;

                systemLog.push(`<div class="mb-1 pl-2 border-l border-[#333]"><span class="text-[#d4af37] font-bold">${c.name}</span>: <span class="text-[#4ade80]">${c.init}</span> <span class="text-[9px] text-gray-500">(1d10[${roll}] + ${chatBreakdown})</span></div>`);
            } else {
                systemLog.push(`<div class="mb-1 pl-2 border-l border-[#333]"><span class="text-red-500 font-bold">${c.name}</span>: Incapacitated</div>`);
            }
        }
    });

    if (changed) {
        updatedList.sort((a, b) => b.init - a.init);
        await pushUpdate(updatedList);
        showNotification("NPC Initiatives Rolled.");
        if (window.sendChronicleMessage && systemLog.length > 0) {
            window.sendChronicleMessage('system', `<div class="text-left font-sans mt-1"><div class="text-white text-[10px] font-bold mb-1 uppercase tracking-wider">Mass NPC Initiative</div>${systemLog.join('')}</div>`);
        }
    } else {
        showNotification("No eligible NPCs to roll.");
    }
}

/**
 * Rolls initiative for a single NPC by ID.
 */
export async function rollNPCInitiative(id) {
    const stState = window.stState;
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    
    let dex = 2, wits = 2, celerity = 0; 
    let data = null;
    
    if (c.sourceId && stState.bestiary && stState.bestiary[c.sourceId]) {
        data = stState.bestiary[c.sourceId].data;
    } else {
        for (const cat in BESTIARY) {
            if (BESTIARY[cat][c.name]) { data = BESTIARY[cat][c.name]; break; }
        }
    }

    if (data) {
        dex = data.attributes?.Dexterity || 2;
        wits = data.attributes?.Wits || 2;
        celerity = data.disciplines?.Celerity || 0;
    }

    let woundPen = 0;
    if (c.health) {
        let dmgCount = (c.health.track && Array.isArray(c.health.track)) 
            ? c.health.track.filter(x => x > 0).length 
            : (c.health.damage || 0);
        
        if (dmgCount >= 7) woundPen = 99;
        else if (dmgCount === 6) woundPen = 5;
        else if (dmgCount >= 4) woundPen = 2;
        else if (dmgCount >= 2) woundPen = 1;
    }

    if (woundPen >= 99) {
        showNotification(`${c.name} is Incapacitated.`);
        return;
    }

    const rating = Math.max(0, dex + wits + celerity - woundPen);
    const roll = Math.floor(Math.random() * 10) + 1; 
    const total = rating + roll;
    
    let chatBreakdown = `Dex(${dex}) + Wits(${wits})`;
    if (celerity > 0) chatBreakdown += ` + Cel(${celerity})`;
    if (woundPen > 0) chatBreakdown += ` - Wounds(${woundPen})`;

    let msgContent = `${c.name} rolled Initiative: <span class="text-[#4ade80] font-bold">${total}</span> <span class="opacity-50 text-[10px]">(1d10[${roll}] + ${chatBreakdown})</span>`;

    await updateInitiative(id, total);
    showNotification(`${c.name} rolled ${total}`);
    
    if (window.sendChronicleMessage) {
        window.sendChronicleMessage('roll', msgContent, { pool: "Initiative", diff: 0, successes: total, dice: 1, results: [roll] });
    }
}

// --- PERSISTENCE HELPER ---

/**
 * Pushes local combat list modifications to Firestore.
 */
async function pushUpdate(newList) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await updateDoc(docRef, { combatants: newList });
    } catch (e) { 
        console.error("Firestore update failed:", e); 
    }
}

// Global API Bindings
window.combatTracker = {
    start: startCombat,
    end: endCombat,
    add: addCombatant,
    remove: removeCombatant,
    updateInit: updateInitiative,
    nextTurn: nextTurn,
    setStatus: setCombatantStatus,
    setHidden: setCombatantHidden,
    rollAllNPCs: rollAllNPCInitiatives,
    toggleReroll: toggleRerollInit,
    playerUpdateInit: playerUpdateInitiative
};
