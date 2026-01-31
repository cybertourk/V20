import { 
    db, doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField, deleteDoc
} from "./firebase-config.js";
import { stState } from "./ui-storyteller.js";
import { showNotification } from "./ui-common.js";

// --- STATE ---
export const combatState = {
    isActive: false,
    turn: 1,
    currentInit: 99,
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
            combatState.currentInit = data.currentInit || 99;
            combatState.combatants = data.combatants || [];
            
            // Sort client-side for display consistency (High to Low, Dex tie-break handled manually by ST usually)
            combatState.combatants.sort((a, b) => b.init - a.init);
            
            // Trigger UI Refresh
            if (window.renderCombatView) window.renderCombatView();
            
            // Update Player Float if active
            if (window.togglePlayerCombatView && document.getElementById('player-combat-float')) {
                // Refresh content if visible
                const float = document.getElementById('player-combat-float');
                if (float.classList.contains('expanded')) window.togglePlayerCombatView(); // Toggle off/on to refresh or separate render function
            }
        } else {
            combatState.isActive = false;
            combatState.combatants = [];
            if (window.renderCombatView) window.renderCombatView();
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
    if (!stState.activeChronicleId) return;
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await setDoc(docRef, {
            turn: 1,
            currentInit: 100, // Start high
            combatants: []
        });
        showNotification("Combat Started!");
    } catch (e) {
        console.error(e);
        showNotification("Error starting combat.");
    }
}

export async function endCombat() {
    if (!confirm("End Combat? This clears the tracker.")) return;
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        // We delete the doc to signal Inactive state
        await deleteDoc(docRef); 
        showNotification("Combat Ended.");
    } catch (e) {
        console.error(e);
    }
}

export async function addCombatant(entity, type = 'NPC') {
    if (!stState.activeChronicleId) return;
    
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
        health: type === 'NPC' ? (entity.health || { damage: 0 }) : null, // Players sync health separately
        status: 'pending', // pending, acting, done
        sourceId: type === 'NPC' ? (entity.sourceId || null) : null // Link back to bestiary doc
    };

    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        // Ensure doc exists first (in case startCombat wasn't called manually)
        // merge: true ensures we don't wipe existing
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
    const list = [...combatState.combatants];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    list[idx].init = parseInt(newVal) || 0;
    
    // Sort
    list.sort((a, b) => b.init - a.init);
    
    await pushUpdate(list);
}

export async function nextTurn() {
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
        await updateDoc(docRef, {
            turn: combatState.turn + 1
        });
        showNotification(`Turn ${combatState.turn + 1} Started`);
    } catch (e) { console.error(e); }
}

export async function rollNPCInitiative(id) {
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    
    // Simple d10 roll for now (Phase 4 scope)
    const roll = Math.floor(Math.random() * 10) + 1;
    let mod = 0;
    
    await updateInitiative(id, roll + mod);
}

// --- HELPER ---
async function pushUpdate(newList) {
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
