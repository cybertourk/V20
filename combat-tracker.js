import { 
    db, doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField, deleteDoc
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { BESTIARY } from "./bestiary-data.js";

// --- STATE ---
export const combatState = {
    isActive: false,
    turn: 1, // Represents the "Round" number (V20 'Turn')
    activeCombatantId: null, // ID of the character currently acting
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
            combatState.turn = data.turn || 1; // Round number
            combatState.activeCombatantId = data.activeCombatantId || null;
            combatState.combatants = data.combatants || [];
            
            // Sort: Highest Result First. (V20 Rules)
            combatState.combatants.sort((a, b) => b.init - a.init);
            
            // Mark the active combatant in the local array for UI helpers
            combatState.combatants.forEach(c => {
                c.active = (c.id === combatState.activeCombatantId);
            });

            // Trigger UI Refresh
            if (window.renderCombatView) window.renderCombatView();
            
            // Update Player Float if active (SAFE UPDATE instead of toggle)
            if (window.updatePlayerCombatView && document.getElementById('player-combat-float')) {
                window.updatePlayerCombatView();
            }
            // Auto-show logic (initial)
            else if (window.togglePlayerCombatView && !document.getElementById('player-combat-float')) {
                // If it's active but float doesn't exist, we can force show or just let user click it.
                // For now, let's keep it manual or triggered by specific events if needed.
                // Actually, existing logic in ui-play handles initial show.
            }
        } else {
            combatState.isActive = false;
            combatState.combatants = [];
            combatState.activeCombatantId = null;
            if (window.renderCombatView) window.renderCombatView();
            
            // If combat ends, remove float
            const float = document.getElementById('player-combat-float');
            if (float) float.remove();
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
            activeCombatantId: null, // Will be set when combatants are added/sorted or manually next-turned
            combatants: []
        });
        
        if(window.sendChronicleMessage) window.sendChronicleMessage('system', "Combat Started!");
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
        status: 'pending',
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
    
    // Sort logic handled on client receive, but good to keep data clean
    list.sort((a, b) => b.init - a.init);
    
    await pushUpdate(list);
}

export async function nextTurn() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    if (combatState.combatants.length === 0) return;

    // 1. Sort current list (ensure sync)
    const sorted = [...combatState.combatants].sort((a, b) => b.init - a.init);
    
    // 2. Find current active index
    let currentIdx = -1;
    if (combatState.activeCombatantId) {
        currentIdx = sorted.findIndex(c => c.id === combatState.activeCombatantId);
    }

    // 3. Determine next index
    let nextIdx = currentIdx + 1;
    let nextRound = combatState.turn;

    // 4. Check for Round Wrap
    if (nextIdx >= sorted.length) {
        nextIdx = 0;
        nextRound++;
        showNotification(`Round ${nextRound} Started`);
        if(window.sendChronicleMessage) window.sendChronicleMessage('system', `Round ${nextRound} Started`);
    } else {
        // Just next person
        showNotification(`Turn: ${sorted[nextIdx].name}`);
    }

    const nextId = sorted[nextIdx].id;

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await updateDoc(docRef, {
            turn: nextRound,
            activeCombatantId: nextId
        });
    } catch (e) { console.error(e); }
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
    
    await updateInitiative(id, total);
    showNotification(`${c.name} rolled ${total}`);
    if(window.sendChronicleMessage) window.sendChronicleMessage('roll', `${c.name} rolled Initiative: ${total}`, { pool: "Initiative", diff: 0, successes: total, dice: 1 });
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
    nextTurn: nextTurn
};
