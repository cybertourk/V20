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

            // Trigger ST UI Refresh
            if (window.renderCombatView) window.renderCombatView();
            
            // Trigger Player UI Refresh (Decoupled from specific element ID)
            if (window.updatePlayerCombatView) {
                window.updatePlayerCombatView();
            }
        } else {
            combatState.isActive = false;
            combatState.combatants = [];
            combatState.activeCombatantId = null;
            combatState.phase = 'declare';
            combatState.rerollInitiative = true;
            
            if (window.renderCombatView) window.renderCombatView();
            
            if (window.updatePlayerCombatView) {
                window.updatePlayerCombatView();
            }
        }
    }, (error) => {
        if (error.code === 'permission-denied') {
            console.warn("Combat Tracker: Permission Denied (User likely not in chronicle yet).");
        } else {
            console.error("Combat Tracker Error:", error);
        }
    });
}

// --- ACTIONS ---

export async function startCombat() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await setDoc(docRef, {
            turn: 1,
            phase: 'declare', // Start in Declaration Phase
            activeCombatantId: null,
            rerollInitiative: true, 
            combatants: []
        });
        
        if(window.sendChronicleMessage) window.sendChronicleMessage('system', "Combat Started! Stage One: Initiative & Declaration.");
        showNotification("Combat Started!");
    } catch (e) {
        console.error(e);
        showNotification("Error starting combat.");
    }
}

export async function endCombat() {
    const stState = window.stState;
    if (!confirm("End Combat? This clears the tracker.")) return;
    if (!stState || !stState.activeChronicleId) return;

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        // We delete the doc to signal Inactive state
        await deleteDoc(docRef); 
        
        if(window.sendChronicleMessage) window.sendChronicleMessage('system', "Combat Ended.");
        showNotification("Combat Ended.");
    } catch (e) {
        console.error(e);
    }
}

export async function addCombatant(entity, type = 'NPC') {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    // Check if already exists
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
        sourceId: type === 'NPC' ? (entity.sourceId || null) : null
    };

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await setDoc(docRef, { turn: combatState.turn || 1 }, { merge: true }); 
        
        await updateDoc(docRef, {
            combatants: arrayUnion(newCombatant)
        });
        showNotification(`${entity.name} added.`);
    } catch (e) {
        console.error(e);
    }
}

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
        console.error(e);
    }
}

export async function updateInitiative(id, newVal) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    const list = [...combatState.combatants];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    list[idx].init = parseInt(newVal) || 0;
    
    list.sort((a, b) => b.init - a.init);
    await pushUpdate(list);
}

export async function setCombatantStatus(id, newStatus) {
    const stState = window.stState;
    // ALLOW PLAYERS TO UPDATE THEIR OWN STATUS:
    // If we are in player mode, we might not have stState fully populated or accessible
    // BUT we need the chronicle ID.
    // Let's assume stState.activeChronicleId is set for Players too (in ui-storyteller.js logic)
    
    // NOTE: For player-side updates, we might need a separate function or ensure this one works.
    // The current implementation relies on `stState` which is populated for players in `ui-storyteller.js` -> `checkStaleSession`.
    
    if (!stState || !stState.activeChronicleId) return;

    const list = [...combatState.combatants];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    list[idx].status = newStatus;
    await pushUpdate(list);
}

// Helper for Player Self-Updates (Init)
export async function playerUpdateInitiative(id, newVal, chronicleId) {
    // Direct Firestore update for players (since they might not be ST)
    // This requires fetching the array, modifying, and writing back.
    // Race conditions are possible but rare in this turn-based flow.
    try {
        const docRef = doc(db, 'chronicles', chronicleId, 'combat', 'active');
        
        // Transaction or optimistic update is better, but simple read-write for now
        // We can't use arrayUnion/Remove easily for field updates inside objects in arrays.
        // We have to read the doc.
        
        // This relies on the UI calling this function specifically for players.
        // Re-using pushUpdate logic but potentially bypassing ST check if needed.
        
        // However, the main `pushUpdate` checks stState.activeChronicleId.
        // As a Player, `stState.activeChronicleId` IS set.
        
        // So we can reuse `updateInitiative` if `stState` is valid.
        await updateInitiative(id, newVal);
        
    } catch(e) { console.error(e); }
}

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
        console.error(e);
    }
}

// --- V20 DYNAMIC TURN PROGRESSION ---
export async function nextTurn() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    if (combatState.combatants.length === 0) return;

    let { turn, phase, activeCombatantId, combatants } = combatState;
    
    // Sort descending (Highest to Lowest) - Standard Action Phase Order
    const sortedDesc = [...combatants].sort((a, b) => b.init - a.init);
    // Sort ascending (Lowest to Highest) - V20 Declaration Phase Order
    const sortedAsc = [...combatants].sort((a, b) => a.init - b.init);

    // Determine which list we are iterating through
    const activeList = phase === 'declare' ? sortedAsc : sortedDesc;

    // Find current index
    let currentIdx = -1;
    if (activeCombatantId) {
        currentIdx = activeList.findIndex(c => c.id === activeCombatantId);
    }

    let nextIdx = currentIdx + 1;
    let nextRound = turn;
    let nextPhase = phase;
    let updatedCombatants = [...combatants];

    // Check if we hit the end of the list for the current phase
    if (nextIdx >= activeList.length) {
        if (phase === 'declare') {
            // End of declarations -> Move to Actions
            nextPhase = 'action';
            activeCombatantId = sortedDesc[0].id; // Give it to fastest character
            showNotification("Action Phase! Resolving Highest to Lowest.");
            if(window.sendChronicleMessage) window.sendChronicleMessage('system', `Round ${nextRound}: Action Phase Started`);
        } else {
            // End of actions -> Move to Next Round Declarations
            nextRound++;
            nextPhase = 'declare';
            
            // Clean up statuses and potentially reset initiatives
            updatedCombatants = updatedCombatants.map(c => {
                let newInit = c.init;
                if (combatState.rerollInitiative) {
                    newInit = 0; // Wipe initiative if reroll is required
                }
                return { ...c, status: 'pending', init: newInit };
            });

            if (combatState.rerollInitiative) {
                // If rerolling, drop active target so everyone can roll before we proceed
                activeCombatantId = null;
                showNotification(`Round ${nextRound}: Roll Initiatives!`);
                if(window.sendChronicleMessage) window.sendChronicleMessage('system', `Round ${nextRound}: Roll Initiatives!`);
            } else {
                // If static init, keep sorting and highlight slowest person
                updatedCombatants.sort((a, b) => a.init - b.init);
                activeCombatantId = updatedCombatants.length > 0 ? updatedCombatants[0].id : null;
                showNotification(`Round ${nextRound} Declaration Phase Started`);
                if(window.sendChronicleMessage) window.sendChronicleMessage('system', `Round ${nextRound}: Declaration Phase Started`);
            }
        }
    } else {
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
        // If we cleaned up statuses or initiatives due to round change, push the updated list
        if (nextIdx >= activeList.length && phase === 'action') {
            updates.combatants = updatedCombatants;
        }
        await updateDoc(docRef, updates);
    } catch (e) { console.error(e); }
}

// --- NPC AUTO-ROLLER ---
export async function rollAllNPCInitiatives() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    let updatedList = [...combatState.combatants];
    let changed = false;
    let systemLog = [];

    updatedList.forEach(c => {
        // Only roll if they are an NPC and haven't rolled yet (init is 0)
        if (c.type === 'NPC' && (!c.init || c.init === 0)) {
            // 1. DETERMINE STATS
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

            // 2. WOUND PENALTY
            let woundPen = 0;
            if (c.health) {
                let dmgCount = 0;
                if (c.health.track && Array.isArray(c.health.track)) {
                    dmgCount = c.health.track.filter(x => x > 0).length;
                } else if (c.health.damage) {
                    dmgCount = c.health.damage;
                }
                
                if (dmgCount >= 7) woundPen = 99; // Incapacitated
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
        if(window.sendChronicleMessage && systemLog.length > 0) {
            // Consolidate mass roll into one clean system message
            window.sendChronicleMessage('system', `<div class="text-left font-sans mt-1"><div class="text-white text-[10px] font-bold mb-1 uppercase tracking-wider">Mass NPC Initiative</div>${systemLog.join('')}</div>`);
        }
    } else {
        showNotification("No eligible NPCs to roll.");
    }
}

export async function rollNPCInitiative(id) {
    const stState = window.stState;
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    
    // 1. DETERMINE STATS
    let dex = 2, wits = 2, celerity = 0; 

    // Lookup Logic
    let data = null;
    if (c.sourceId && stState.bestiary && stState.bestiary[c.sourceId]) {
        data = stState.bestiary[c.sourceId].data;
    } else {
        for (const cat in BESTIARY) {
            if (BESTIARY[cat][c.name]) {
                data = BESTIARY[cat][c.name];
                break;
            }
        }
    }

    if (data) {
        dex = data.attributes?.Dexterity || 2;
        wits = data.attributes?.Wits || 2;
        celerity = data.disciplines?.Celerity || 0;
    }

    // 2. WOUND PENALTY
    let woundPen = 0;
    if (c.health) {
        let dmgCount = 0;
        if (c.health.track && Array.isArray(c.health.track)) {
            dmgCount = c.health.track.filter(x => x > 0).length;
        } else if (c.health.damage) {
            dmgCount = c.health.damage;
        }
        
        if (dmgCount >= 7) woundPen = 99; // Incapacitated
        else if (dmgCount === 6) woundPen = 5;
        else if (dmgCount >= 4) woundPen = 2;
        else if (dmgCount >= 2) woundPen = 1;
    }

    if (woundPen >= 99) {
        showNotification(`${c.name} is Incapacitated.`);
        return;
    }

    // 3. ROLL LOGIC
    const rating = Math.max(0, dex + wits + celerity - woundPen);
    const roll = Math.floor(Math.random() * 10) + 1; 
    const total = rating + roll;
    
    let chatBreakdown = `Dex(${dex}) + Wits(${wits})`;
    if (celerity > 0) chatBreakdown += ` + Cel(${celerity})`;
    if (woundPen > 0) chatBreakdown += ` - Wounds(${woundPen})`;

    let msgContent = `${c.name} rolled Initiative: <span class="text-[#4ade80] font-bold">${total}</span> <span class="opacity-50 text-[10px]">(1d10[${roll}] + ${chatBreakdown})</span>`;

    await updateInitiative(id, total);
    showNotification(`${c.name} rolled ${total}`);
    
    if(window.sendChronicleMessage) {
        window.sendChronicleMessage('roll', msgContent, { pool: "Initiative", diff: 0, successes: total, dice: 1, results: [roll] });
    }
}

// --- HELPER ---
async function pushUpdate(newList) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await updateDoc(docRef, { combatants: newList });
    } catch (e) { console.error(e); }
}

// Window bindings
window.combatTracker = {
    start: startCombat,
    end: endCombat,
    add: addCombatant,
    remove: removeCombatant,
    updateInit: updateInitiative,
    nextTurn: nextTurn,
    setStatus: setCombatantStatus,
    rollAllNPCs: rollAllNPCInitiatives,
    toggleReroll: toggleRerollInit,
    playerUpdateInit: playerUpdateInitiative // Added for Player Manual Entry
};
