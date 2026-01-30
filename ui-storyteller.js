import { 
    db, auth, collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, onSnapshot, deleteDoc 
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { BESTIARY } from "./bestiary-data.js";
import { 
    initCombatTracker, combatState, startCombat, endCombat, nextTurn, 
    addCombatant, removeCombatant, updateInitiative, rollNPCInitiative 
} from "./combat-tracker.js";

// IMPORT NEW JOURNAL LOGIC (Delegation)
import { renderStorytellerJournal } from "./ui-journal.js";

// --- STATE ---
export const stState = {
    activeChronicleId: null,
    isStoryteller: false,
    playerRef: null,
    listeners: [], 
    players: {},   
    bestiary: {},  
    journal: {},   
    currentView: 'roster', 
    syncInterval: null,
    seenHandouts: new Set() 
};

// --- INITIALIZATION ---
export function initStorytellerSystem() {
    console.log("Storyteller System Initialized");
    
    // Window bindings
    window.openChronicleModal = openChronicleModal;
    window.closeChronicleModal = closeChronicleModal;
    window.renderJoinChronicleUI = renderJoinChronicleUI;
    window.renderCreateChronicleUI = renderCreateChronicleUI;
    window.handleCreateChronicle = handleCreateChronicle;
    window.handleJoinChronicle = handleJoinChronicle;
    window.handleResumeChronicle = handleResumeChronicle;
    window.disconnectChronicle = disconnectChronicle;
    window.switchStorytellerView = switchStorytellerView;
    
    // Bestiary Actions
    window.copyStaticNpc = copyStaticNpc;
    window.deleteCloudNpc = deleteCloudNpc;
    window.editCloudNpc = editCloudNpc;
    window.previewStaticNpc = previewStaticNpc;
    
    // Combat Bindings
    window.stStartCombat = startCombat;
    window.stEndCombat = endCombat;
    window.stNextTurn = nextTurn;
    window.stUpdateInit = (id, val) => updateInitiative(id, val);
    window.stRemoveCombatant = removeCombatant;
    window.stRollInit = rollNPCInitiative;
    window.stAddToCombat = handleAddToCombat;
    window.renderCombatView = renderCombatView;

    // Journal Bindings (Delegated Wrappers for UI Journal)
    window.stPushHandout = pushHandoutToPlayers;
    window.stDeleteJournalEntry = stDeleteJournalEntry;
    
    // Player Bindings
    window.togglePlayerCombatView = togglePlayerCombatView;
}

// --- MODAL HANDLERS ---
export function openChronicleModal() {
    let modal = document.getElementById('chronicle-modal');
    if (!modal) {
        console.warn("Chronicle Modal container missing.");
        return;
    }
    
    modal.classList.add('active');
    
    if (stState.activeChronicleId) {
        renderConnectedStatus();
    } else {
        renderChronicleMenu();
    }
}

export function closeChronicleModal() {
    const modal = document.getElementById('chronicle-modal');
    if(modal) modal.classList.remove('active');
}

// --- UI RENDERING (MENU) ---
function renderChronicleMenu() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    const user = auth.currentUser;
    const authWarning = !user ? `<div class="bg-red-900/20 border border-red-500/50 p-2 mb-4 text-xs text-red-300 text-center">You must be logged in to use Chronicle features.</div>` : '';

    // Check for Recent Chronicle
    const recentId = localStorage.getItem('v20_last_chronicle_id');
    const recentName = localStorage.getItem('v20_last_chronicle_name') || recentId;
    const recentRole = localStorage.getItem('v20_last_chronicle_role'); 

    let resumeHtml = '';
    if (recentId && user) {
        const btnColor = recentRole === 'ST' ? 'text-red-500 border-red-900 hover:bg-red-900/20' : 'text-blue-400 border-blue-900 hover:bg-blue-900/20';
        const roleLabel = recentRole === 'ST' ? 'Storyteller' : 'Player';
        resumeHtml = `
            <div class="mb-6 p-4 bg-[#111] border border-[#333] flex justify-between items-center animate-in fade-in">
                <div>
                    <div class="text-[10px] text-gray-500 uppercase font-bold">Resume Last Session</div>
                    <div class="text-white font-bold font-cinzel text-lg">${recentName}</div>
                    <div class="text-[9px] text-gray-400">${roleLabel}</div>
                </div>
                <button onclick="window.handleResumeChronicle('${recentId}', '${recentRole}')" class="px-4 py-2 border rounded uppercase font-bold text-xs ${btnColor}">
                    Resume <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;
    }

    container.innerHTML = `
        <h2 class="heading text-xl text-[#d4af37] mb-6 border-b border-[#333] pb-2">Chronicles</h2>
        ${authWarning}
        ${resumeHtml}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- JOIN CARD -->
            <div class="bg-[#111] p-6 border border-[#333] hover:border-[#d4af37] transition-all cursor-pointer group relative overflow-hidden" 
                 onclick="${user ? 'window.renderJoinChronicleUI()' : ''}"
                 style="${!user ? 'opacity:0.5; pointer-events:none;' : ''}">
                <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fas fa-users text-6xl text-[#d4af37]"></i>
                </div>
                <h3 class="text-white font-cinzel font-bold uppercase mb-2 text-lg group-hover:text-[#d4af37] transition-colors">
                    Join Chronicle
                </h3>
                <p class="text-xs text-gray-400 leading-relaxed">
                    Connect to an existing story as a <strong>Player</strong>. Your health and status will be synced to the Storyteller.
                </p>
            </div>

            <!-- CREATE CARD -->
            <div class="bg-[#1a0505] p-6 border border-[#333] hover:border-red-600 transition-all cursor-pointer group relative overflow-hidden" 
                 onclick="${user ? 'window.renderCreateChronicleUI()' : ''}"
                 style="${!user ? 'opacity:0.5; pointer-events:none;' : ''}">
                <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fas fa-book-dead text-6xl text-red-600"></i>
                </div>
                <h3 class="text-white font-cinzel font-bold uppercase mb-2 text-lg group-hover:text-red-500 transition-colors">
                    Storyteller Mode
                </h3>
                <p class="text-xs text-gray-400 leading-relaxed">
                    Create or manage a Chronicle. You will control NPCs, combat, and distribute handouts.
                </p>
            </div>
        </div>
        <div class="mt-8 border-t border-[#333] pt-4 text-center">
            <button class="text-gray-500 hover:text-white text-xs uppercase font-bold tracking-widest" onclick="window.closeChronicleModal()">Close</button>
        </div>
    `;
}

function renderJoinChronicleUI() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    container.innerHTML = `
        <h2 class="heading text-xl text-[#d4af37] mb-4 border-b border-[#333] pb-2">Join Chronicle</h2>
        <div class="space-y-4 max-w-md mx-auto">
            <div>
                <label class="label-text text-gray-400">Chronicle ID (Ask your ST)</label>
                <input type="text" id="join-id" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none font-mono text-center tracking-widest uppercase" placeholder="XXXX-XXXX">
            </div>
            <div>
                <label class="label-text text-gray-400">Passcode (Optional)</label>
                <input type="password" id="join-pass" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none text-center" placeholder="******">
            </div>
            
            <div id="join-error" class="text-red-500 text-xs font-bold text-center hidden"></div>

            <div class="flex gap-4 mt-6">
                <button class="flex-1 border border-[#333] text-gray-400 py-2 text-xs font-bold uppercase hover:bg-[#222]" onclick="window.openChronicleModal()">Back</button>
                <button class="flex-1 bg-[#d4af37] text-black py-2 text-xs font-bold uppercase hover:bg-[#fcd34d] shadow-lg" onclick="window.handleJoinChronicle()">Connect</button>
            </div>
        </div>
    `;
}

function renderCreateChronicleUI() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    container.innerHTML = `
        <h2 class="heading text-xl text-red-500 mb-4 border-b border-[#333] pb-2">Create Chronicle</h2>
        <div class="space-y-4 max-w-md mx-auto">
            <div>
                <label class="label-text text-gray-400">Chronicle Name</label>
                <input type="text" id="create-name" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-red-500 outline-none" placeholder="e.g. Los Angeles by Night">
            </div>
            <div>
                <label class="label-text text-gray-400">Passcode (Optional)</label>
                <input type="text" id="create-pass" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-red-500 outline-none" placeholder="Leave blank for open game">
            </div>
            
            <div id="create-error" class="text-red-500 text-xs font-bold text-center hidden"></div>

            <div class="flex gap-4 mt-6">
                <button class="flex-1 border border-[#333] text-gray-400 py-2 text-xs font-bold uppercase hover:bg-[#222]" onclick="window.openChronicleModal()">Back</button>
                <button class="flex-1 bg-red-900 text-white py-2 text-xs font-bold uppercase hover:bg-red-700 shadow-lg" onclick="window.handleCreateChronicle()">Initialize</button>
            </div>
        </div>
    `;
}

function renderConnectedStatus() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    container.innerHTML = `
        <div class="text-center py-8">
            <h2 class="heading text-2xl text-green-500 mb-2">Connected</h2>
            <p class="text-gray-400 text-xs mb-6 font-mono">${stState.activeChronicleId}</p>
            
            <div class="bg-[#111] p-4 border border-[#333] rounded mb-6 max-w-sm mx-auto">
                <div class="text-xs text-gray-500 uppercase font-bold mb-2">Status</div>
                <div class="flex justify-center items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span class="text-white font-bold">Live Sync Active</span>
                </div>
            </div>

            <button class="border border-red-900/50 text-red-500 hover:bg-red-900/20 px-6 py-2 text-xs font-bold uppercase transition-colors" onclick="window.disconnectChronicle()">
                Disconnect
            </button>
        </div>
    `;
}

// --- FIREBASE LOGIC ---

async function handleCreateChronicle() {
    const user = auth.currentUser;
    if(!user) return;

    const name = document.getElementById('create-name').value.trim();
    const pass = document.getElementById('create-pass').value.trim();
    const err = document.getElementById('create-error');

    if (!name) {
        err.innerText = "Chronicle Name is required.";
        err.classList.remove('hidden');
        return;
    }

    try {
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const chronicleId = `${safeName}-${suffix}`;

        const chronicleData = {
            name: name,
            storyteller_uid: user.uid,
            passcode: pass,
            created_at: new Date().toISOString(),
            active_scene: "Prologue"
        };

        await setDoc(doc(db, 'chronicles', chronicleId), chronicleData);
        
        localStorage.setItem('v20_last_chronicle_id', chronicleId);
        localStorage.setItem('v20_last_chronicle_name', name);
        localStorage.setItem('v20_last_chronicle_role', 'ST');

        showNotification("Chronicle Initialized!");
        stState.activeChronicleId = chronicleId;
        stState.isStoryteller = true;
        
        window.closeChronicleModal();
        activateStorytellerMode(); 
        
    } catch (e) {
        console.error("Create Error:", e);
        err.innerText = "Error creating chronicle: " + e.message;
        err.classList.remove('hidden');
    }
}

async function handleJoinChronicle() {
    const user = auth.currentUser;
    if(!user) return;

    const idInput = document.getElementById('join-id').value.trim();
    const passInput = document.getElementById('join-pass').value.trim();
    const err = document.getElementById('join-error');

    if (!idInput) {
        err.innerText = "Chronicle ID is required.";
        err.classList.remove('hidden');
        return;
    }

    try {
        const docRef = doc(db, 'chronicles', idInput);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            err.innerText = "Chronicle not found.";
            err.classList.remove('hidden');
            return;
        }

        const data = docSnap.data();
        if (data.passcode && data.passcode !== passInput) {
            err.innerText = "Incorrect Passcode.";
            err.classList.remove('hidden');
            return;
        }

        const playerRef = doc(db, 'chronicles', idInput, 'players', user.uid);
        const charName = document.getElementById('c-name')?.value || "Unknown Kindred";
        
        await setDoc(playerRef, {
            character_name: charName,
            status: "Connected",
            last_active: new Date().toISOString(),
            live_stats: {
                health: window.state.status.health_states || [],
                willpower: window.state.status.tempWillpower || 0,
                blood: window.state.status.blood || 0
            }
        }, { merge: true });

        localStorage.setItem('v20_last_chronicle_id', idInput);
        localStorage.setItem('v20_last_chronicle_name', data.name);
        localStorage.setItem('v20_last_chronicle_role', 'Player');

        stState.activeChronicleId = idInput;
        stState.isStoryteller = false;
        stState.playerRef = playerRef;

        startPlayerSync();
        activatePlayerMode();

        showNotification(`Joined ${data.name}`);
        window.closeChronicleModal();

    } catch (e) {
        console.error("Join Error:", e);
        err.innerText = "Connection failed: " + e.message;
        err.classList.remove('hidden');
    }
}

async function handleResumeChronicle(id, role) {
    if (!auth.currentUser) return;
    
    try {
        const docRef = doc(db, 'chronicles', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            showNotification("Chronicle no longer exists.", "error");
            localStorage.removeItem('v20_last_chronicle_id');
            renderChronicleMenu();
            return;
        }
        
        const data = docSnap.data();
        
        if (role === 'ST') {
            if (data.storyteller_uid !== auth.currentUser.uid) {
                showNotification("Permission Denied: You are not the Storyteller.", "error");
                return;
            }
            stState.activeChronicleId = id;
            stState.isStoryteller = true;
            window.closeChronicleModal();
            activateStorytellerMode();
            showNotification(`Resumed ${data.name}`);
        } else {
            const playerRef = doc(db, 'chronicles', id, 'players', auth.currentUser.uid);
            await setDoc(playerRef, { status: "Connected", last_active: new Date().toISOString() }, { merge: true });
            
            stState.activeChronicleId = id;
            stState.isStoryteller = false;
            stState.playerRef = playerRef;
            startPlayerSync();
            activatePlayerMode();
            window.closeChronicleModal();
            showNotification(`Reconnected to ${data.name}`);
        }
        
    } catch (e) {
        console.error("Resume Error:", e);
        showNotification("Failed to resume.", "error");
    }
}

function disconnectChronicle() {
    if (!stState.isStoryteller && stState.playerRef) {
        try {
            setDoc(stState.playerRef, { status: "Offline" }, { merge: true });
        } catch(e) { console.warn(e); }
    }

    stState.listeners.forEach(unsub => unsub());
    stState.listeners = [];
    if (stState.syncInterval) clearInterval(stState.syncInterval);
    
    stState.activeChronicleId = null;
    stState.playerRef = null;
    stState.isStoryteller = false;
    stState.players = {};
    stState.bestiary = {};
    stState.journal = {};
    stState.seenHandouts = new Set();

    showNotification("Disconnected from Chronicle.");
    
    const floatBtn = document.getElementById('player-combat-float');
    if(floatBtn) floatBtn.remove();
    
    const mainContent = document.getElementById('sheet-content');
    if (mainContent) {
        mainContent.innerHTML = ''; 
        window.location.reload(); 
    } else {
        window.openChronicleModal();
    }
}

function startPlayerSync() {
    if (stState.isStoryteller) return;

    const interval = setInterval(async () => {
        if (!stState.activeChronicleId || !stState.playerRef) {
            clearInterval(interval);
            return;
        }
        
        try {
            await setDoc(stState.playerRef, {
                character_name: document.getElementById('c-name')?.value || "Unknown",
                live_stats: {
                    health: window.state.status.health_states || [],
                    willpower: window.state.status.tempWillpower || 0,
                    blood: window.state.status.blood || 0
                },
                last_active: new Date().toISOString()
            }, { merge: true });
        } catch(e) {
            console.warn("Sync error:", e);
        }
    }, 10000);
    
    stState.syncInterval = interval;
}

// ==========================================================================
// PLAYER REACTIVITY (NEW)
// ==========================================================================

function activatePlayerMode() {
    if (stState.isStoryteller || !stState.activeChronicleId) return;

    // 1. LISTEN FOR COMBAT
    const combatRef = doc(db, 'chronicles', stState.activeChronicleId, 'combat', 'active');
    stState.listeners.push(onSnapshot(combatRef, (snapshot) => {
        const data = snapshot.data();
        const floatBtn = document.getElementById('player-combat-float');
        
        if (data && snapshot.exists() && data.turn > 0) {
            // Combat is Active
            if (!floatBtn) {
                const btn = document.createElement('button');
                btn.id = 'player-combat-float';
                btn.className = "fixed top-20 right-4 z-50 bg-[#8b0000] text-white px-4 py-2 rounded-full border-2 border-[#d4af37] shadow-lg animate-pulse hover:animate-none font-cinzel font-bold uppercase flex items-center gap-2";
                btn.innerHTML = `<i class="fas fa-swords"></i> Combat Active`;
                btn.onclick = () => window.togglePlayerCombatView();
                document.body.appendChild(btn);
            }
            
            // Sync Combat State locally for the view
            combatState.combatants = data.combatants || [];
            combatState.turn = data.turn || 1;
            combatState.isActive = true;
            
            // If the modal is open, refresh it
            const modal = document.getElementById('player-combat-modal');
            if (modal && !modal.classList.contains('hidden')) {
                renderPlayerCombatModal();
            }
            
        } else {
            // Combat Ended
            if (floatBtn) floatBtn.remove();
            combatState.isActive = false;
            const modal = document.getElementById('player-combat-modal');
            if(modal) modal.classList.add('hidden');
        }
    }));

    // 2. LISTEN FOR HANDOUTS
    const journalRef = collection(db, 'chronicles', stState.activeChronicleId, 'journal');
    stState.listeners.push(onSnapshot(journalRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                const data = change.doc.data();
                if (data.pushed && !stState.seenHandouts.has(change.doc.id)) {
                    stState.seenHandouts.add(change.doc.id);
                    renderPlayerHandoutModal(data);
                }
            }
        });
    }));
}

function renderPlayerHandoutModal(data) {
    let modal = document.getElementById('player-handout-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'player-handout-modal';
        modal.className = "fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="bg-[#111] border-2 border-[#d4af37] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative p-6 shadow-[0_0_50px_rgba(212,175,55,0.3)]">
            <button onclick="document.getElementById('player-handout-modal').remove()" class="absolute top-2 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
            
            <h2 class="text-3xl text-[#d4af37] font-cinzel font-bold text-center mb-6 uppercase tracking-widest border-b border-[#333] pb-4">${data.name}</h2>
            
            ${data.image ? `<div class="mb-6 flex justify-center"><img src="${data.image}" class="max-h-[60vh] object-contain border border-[#333]"></div>` : ''}
            
            ${data.desc ? `<div class="text-gray-300 font-serif text-lg leading-relaxed whitespace-pre-wrap px-4">${data.desc}</div>` : ''}
            
            <div class="mt-8 text-center">
                <button onclick="document.getElementById('player-handout-modal').remove()" class="bg-[#222] border border-[#444] text-white px-6 py-2 uppercase font-bold text-sm hover:bg-[#333]">Close</button>
            </div>
        </div>
    `;
}

function togglePlayerCombatView() {
    let modal = document.getElementById('player-combat-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'player-combat-modal';
        modal.className = "fixed inset-0 bg-black/80 z-[900] flex items-center justify-center p-4 hidden backdrop-blur-sm";
        document.body.appendChild(modal);
    }
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        renderPlayerCombatModal();
    } else {
        modal.classList.add('hidden');
    }
}

function renderPlayerCombatModal() {
    const modal = document.getElementById('player-combat-modal');
    if (!modal) return;
    
    const list = combatState.combatants || [];
    
    let html = `
        <div class="bg-[#111] border border-[#8b0000] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl relative">
            <div class="bg-[#1a0505] p-4 border-b border-[#8b0000] flex justify-between items-center">
                <h2 class="text-xl font-cinzel font-bold text-white uppercase tracking-widest"><i class="fas fa-swords mr-2"></i> Combat Tracker <span class="text-gray-500 text-sm ml-2">Turn ${combatState.turn}</span></h2>
                <button onclick="document.getElementById('player-combat-modal').classList.add('hidden')" class="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
    `;
    
    if (list.length === 0) {
        html += `<div class="text-center text-gray-500 italic">Waiting for combatants...</div>`;
    } else {
        list.forEach(c => {
            const isMe = c.id === auth.currentUser?.uid;
            const highlight = isMe ? "border-[#d4af37] bg-[#d4af37]/10" : "border-[#333] bg-[#1a1a1a]";
            const status = c.status === 'done' ? "opacity-50 grayscale" : "";
            
            let hpBar = '';
            if (c.health) {
                let dmg = 0;
                if (c.health.track) dmg = c.health.track.filter(x => x>0).length;
                else dmg = c.health.damage || 0;
                const pct = Math.max(0, (7 - dmg) / 7) * 100;
                let color = 'bg-green-600';
                if (dmg > 3) color = 'bg-yellow-600';
                if (dmg > 5) color = 'bg-red-600';
                hpBar = `<div class="w-16 h-1.5 bg-gray-800 rounded overflow-hidden ml-2"><div class="${color} h-full" style="width: ${pct}%"></div></div>`;
            }

            html += `
                <div class="flex items-center justify-between p-3 rounded border ${highlight} ${status}">
                    <div class="flex items-center gap-3">
                        <div class="bg-black border border-[#444] w-8 h-8 flex items-center justify-center rounded font-bold text-[#d4af37]">${c.init}</div>
                        <div>
                            <div class="font-bold text-white text-sm ${isMe ? 'text-[#d4af37]' : ''}">${c.name}</div>
                            <div class="text-[9px] text-gray-500 uppercase">${c.type}</div>
                        </div>
                    </div>
                    ${hpBar}
                </div>
            `;
        });
    }
    
    html += `</div></div>`;
    modal.innerHTML = html;
}

// ==========================================================================
// STORYTELLER DASHBOARD
// ==========================================================================

function activateStorytellerMode() {
    const mainContent = document.getElementById('sheet-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="h-screen flex flex-col bg-[#050505] text-white">
            <!-- ST Header -->
            <div class="bg-[#1a0505] border-b border-[#500] p-4 flex justify-between items-center shadow-lg z-10">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-cinzel text-red-500 font-bold tracking-widest uppercase">
                        <i class="fas fa-crown mr-2"></i> Storyteller Mode
                    </h2>
                    <span class="text-xs font-mono text-gray-500 border border-[#333] px-2 py-1 rounded bg-black">
                        ID: <span class="text-gold select-all cursor-pointer" onclick="navigator.clipboard.writeText('${stState.activeChronicleId}')">${stState.activeChronicleId}</span>
                    </span>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.openNpcCreator('mortal')" class="bg-purple-900/40 border border-purple-500/50 text-purple-200 hover:text-white px-3 py-1 text-xs font-bold uppercase rounded transition-colors">
                        <i class="fas fa-plus mr-1"></i> Quick NPC
                    </button>
                    <button class="bg-[#222] border border-[#444] text-gray-300 hover:text-white px-3 py-1 text-xs font-bold uppercase rounded transition-colors" onclick="window.disconnectChronicle()">
                        <i class="fas fa-sign-out-alt mr-1"></i> Exit Chronicle
                    </button>
                </div>
            </div>

            <!-- ST Tabs -->
            <div class="flex bg-[#111] border-b border-[#333] px-4">
                <button class="st-tab active px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#d4af37] border-b-2 border-[#d4af37] hover:bg-[#222] transition-colors" onclick="window.switchStorytellerView('roster')">
                    <i class="fas fa-users mr-2"></i> Roster
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors" onclick="window.switchStorytellerView('combat')">
                    <i class="fas fa-swords mr-2"></i> Combat
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors" onclick="window.switchStorytellerView('bestiary')">
                    <i class="fas fa-dragon mr-2"></i> Bestiary
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors" onclick="window.switchStorytellerView('journal')">
                    <i class="fas fa-book-open mr-2"></i> Journal
                </button>
            </div>

            <!-- ST Viewport -->
            <div id="st-viewport" class="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                <!-- Views injected here -->
            </div>
        </div>
    `;

    // Listeners
    const qRoster = query(collection(db, 'chronicles', stState.activeChronicleId, 'players'));
    stState.listeners.push(onSnapshot(qRoster, (snapshot) => {
        stState.players = {};
        snapshot.forEach(doc => { stState.players[doc.id] = doc.data(); });
        if (stState.currentView === 'roster') renderRosterView();
    }));

    const qBestiary = query(collection(db, 'chronicles', stState.activeChronicleId, 'bestiary'));
    stState.listeners.push(onSnapshot(qBestiary, (snapshot) => {
        stState.bestiary = {};
        snapshot.forEach(doc => { stState.bestiary[doc.id] = doc.data(); });
        if (stState.currentView === 'bestiary') renderBestiaryView();
    }));

    const qJournal = query(collection(db, 'chronicles', stState.activeChronicleId, 'journal'));
    stState.listeners.push(onSnapshot(qJournal, (snapshot) => {
        stState.journal = {};
        snapshot.forEach(doc => { stState.journal[doc.id] = doc.data(); });
        if (stState.currentView === 'journal') renderStorytellerJournal(document.getElementById('st-viewport'));
    }));

    initCombatTracker(stState.activeChronicleId);
    switchStorytellerView('roster');
}

function switchStorytellerView(view) {
    stState.currentView = view;
    document.querySelectorAll('.st-tab').forEach(btn => {
        const isActive = btn.onclick.toString().includes(`'${view}'`);
        btn.className = isActive 
            ? "st-tab active px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#d4af37] border-b-2 border-[#d4af37] bg-[#222] transition-colors"
            : "st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors";
    });

    const viewport = document.getElementById('st-viewport');
    if (view === 'roster') renderRosterView();
    else if (view === 'combat') renderCombatView();
    else if (view === 'bestiary') renderBestiaryView();
    else if (view === 'journal') renderStorytellerJournal(viewport);
}

// --- VIEW 1: ROSTER ---
function renderRosterView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || stState.currentView !== 'roster') return;

    const players = Object.values(stState.players);
    
    if (players.length === 0) {
        viewport.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500"><i class="fas fa-users-slash text-4xl mb-4 opacity-50"></i><p>No players connected.</p><p class="text-xs mt-2">Share ID: <span class="text-gold font-mono font-bold">${stState.activeChronicleId}</span></p></div>`;
        return;
    }

    let html = `<div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full">`;

    players.forEach(p => {
        const health = p.live_stats?.health || [];
        const dmgCount = health.filter(x => x > 0).length;
        const statusDot = p.status === 'Offline' ? 'bg-red-500' : 'bg-green-500';
        const pid = Object.keys(stState.players).find(k => stState.players[k] === p);

        html += `
            <div class="bg-[#111] border border-[#333] rounded p-4 shadow-md relative group hover:border-[#555] transition-colors">
                <div class="absolute top-2 right-2 flex items-center gap-2">
                    <span class="text-[10px] uppercase text-gray-600 font-bold">${p.status || 'Unknown'}</span>
                    <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                </div>
                <h3 class="text-lg text-[#d4af37] font-bold font-cinzel truncate pr-16">${p.character_name || "Unknown"}</h3>
                
                <div class="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div class="bg-black/30 p-2 rounded border border-[#222]">
                        <div class="text-[9px] uppercase text-gray-500 font-bold mb-1">Health</div>
                        <div class="text-lg font-bold ${dmgCount > 3 ? 'text-red-500' : 'text-green-500'}">${7 - dmgCount}/7</div>
                    </div>
                    <div class="bg-black/30 p-2 rounded border border-[#222]">
                        <div class="text-[9px] uppercase text-gray-500 font-bold mb-1">WP</div>
                        <div class="text-lg font-bold text-blue-400">${p.live_stats?.willpower || 0}</div>
                    </div>
                    <div class="bg-black/30 p-2 rounded border border-[#222]">
                        <div class="text-[9px] uppercase text-gray-500 font-bold mb-1">Blood</div>
                        <div class="text-lg font-bold text-red-500">${p.live_stats?.blood || 0}</div>
                    </div>
                </div>

                <div class="mt-4 pt-2 border-t border-[#222] flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button class="text-[10px] uppercase font-bold text-gray-400 hover:text-white px-2 py-1 border border-[#333] rounded hover:bg-[#222]" onclick="window.stAddToCombat({id:'${pid}', name:'${p.character_name}'}, 'Player')">
                        <i class="fas fa-swords mr-1"></i> Combat
                    </button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    viewport.innerHTML = html;
}

// --- VIEW 2: COMBAT ---
function renderCombatView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || stState.currentView !== 'combat') return;

    const { isActive, turn, combatants } = combatState;

    if (!isActive) {
        viewport.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-peace text-6xl mb-6 opacity-30"></i>
                <h3 class="text-xl font-bold text-gray-400 mb-2">No Active Combat</h3>
                <button onclick="window.stStartCombat()" class="bg-[#8b0000] hover:bg-red-700 text-white font-bold py-3 px-8 uppercase tracking-widest shadow-lg rounded transition-transform hover:scale-105">Start Encounter</button>
            </div>
        `;
        return;
    }

    let html = `
        <div class="flex flex-col h-full">
            <div class="bg-[#111] border-b border-[#333] p-4 flex justify-between items-center shadow-md z-20">
                <div class="flex items-center gap-6">
                    <div class="text-center">
                        <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Turn</div>
                        <div class="text-3xl font-black text-[#d4af37] leading-none">${turn}</div>
                    </div>
                    <button onclick="window.stNextTurn()" class="bg-[#222] hover:bg-[#333] border border-[#444] text-white px-4 py-2 text-xs font-bold uppercase rounded flex items-center gap-2 transition-colors">
                        Next Turn <i class="fas fa-step-forward"></i>
                    </button>
                </div>
                <button onclick="window.stEndCombat()" class="text-red-500 hover:text-red-300 text-xs font-bold uppercase border border-red-900/30 px-4 py-2 rounded hover:bg-red-900/10">End Combat</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-black/50">
    `;

    if (combatants.length === 0) {
        html += `<div class="text-center text-gray-500 italic mt-10">Waiting for combatants...</div>`;
    } else {
        combatants.forEach(c => {
            const isNPC = c.type === 'NPC';
            html += `
                <div class="bg-[#1a1a1a] border border-[#333] p-2 rounded flex items-center justify-between group hover:border-[#555] transition-colors relative overflow-hidden">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="flex flex-col items-center w-12">
                            <input type="number" value="${c.init}" onchange="window.stUpdateInit('${c.id}', this.value)" class="w-10 bg-black border border-[#444] text-center text-lg font-bold text-[#d4af37] focus:outline-none focus:border-[#d4af37] rounded">
                            <span class="text-[8px] text-gray-600 uppercase font-bold mt-0.5">Init</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-white font-bold text-sm ${c.status === 'done' ? 'line-through opacity-50' : ''}">${c.name}</span>
                            <span class="text-[9px] text-gray-500 uppercase">${c.type}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${isNPC ? `<button onclick="window.stRollInit('${c.id}')" class="text-gray-500 hover:text-white" title="Roll Initiative"><i class="fas fa-dice-d10"></i></button>` : ''}
                        <button onclick="window.stRemoveCombatant('${c.id}')" class="text-red-900 hover:text-red-500 px-2 transition-colors"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        });
    }
    html += `</div></div>`;
    viewport.innerHTML = html;
}

// --- VIEW 3: BESTIARY ---
function renderBestiaryView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || stState.currentView !== 'bestiary') return;

    let html = `
        <div class="flex h-full">
            <div class="w-64 bg-[#080808] border-r border-[#333] flex flex-col">
                <div class="p-3 border-b border-[#333]">
                    <input type="text" id="bestiary-search" placeholder="Search..." class="w-full bg-[#111] border border-[#333] text-xs p-2 text-white outline-none focus:border-[#d4af37]">
                </div>
                <div class="flex-1 overflow-y-auto p-2" id="bestiary-categories">
                    <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Custom</div>
                    <div id="cat-custom" class="space-y-1 mb-4"></div>
                    
                    <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Core Rulebook</div>
                    ${Object.keys(BESTIARY).map(cat => `
                        <div class="cursor-pointer hover:bg-[#222] px-2 py-1 text-xs text-gray-300 flex justify-between group" onclick="document.getElementById('cat-group-${cat}').classList.toggle('hidden')">
                            <span>${cat}</span><i class="fas fa-chevron-down text-[8px] text-gray-600"></i>
                        </div>
                        <div id="cat-group-${cat}" class="hidden pl-2 border-l border-[#222] ml-1">
                            ${Object.keys(BESTIARY[cat]).map(key => `<div class="cursor-pointer hover:text-[#d4af37] px-2 py-1 text-[10px] text-gray-500" onclick="window.previewStaticNpc('${cat}', '${key}')">${key}</div>`).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                <div id="bestiary-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
            </div>
        </div>
    `;
    viewport.innerHTML = html;
    renderCustomBestiaryList();
}

function renderCustomBestiaryList() {
    const container = document.getElementById('cat-custom');
    const grid = document.getElementById('bestiary-grid');
    if (!container || !grid) return;

    container.innerHTML = '';
    grid.innerHTML = ''; 

    const customNPCs = Object.values(stState.bestiary);
    
    if(customNPCs.length === 0) {
        container.innerHTML = `<div class="px-2 py-1 text-[10px] italic text-gray-600">Empty</div>`;
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 italic mt-10">Bestiary is empty. Use "Quick NPC" -> "Save to Bestiary".</div>`;
    }

    customNPCs.forEach(entry => {
        const id = Object.keys(stState.bestiary).find(key => stState.bestiary[key] === entry);
        
        const item = document.createElement('div');
        item.className = "cursor-pointer hover:text-blue-300 px-2 py-1 text-[11px] text-blue-500 truncate";
        item.innerText = entry.name;
        item.onclick = () => renderNpcCard(entry, id, true, grid, true);
        container.appendChild(item);

        renderNpcCard(entry, id, true, grid);
    });
}

function renderNpcCard(entry, id, isCustom, container, clearFirst = false) {
    if (clearFirst) container.innerHTML = '';
    
    const npc = entry.data || entry;
    const name = entry.name || npc.name;
    const type = entry.type || npc.template || "Mortal";
    const phys = (npc.attributes?.Strength||1) + (npc.attributes?.Dexterity||1) + (npc.attributes?.Stamina||1);
    
    const card = document.createElement('div');
    card.className = "bg-[#111] border border-[#333] p-3 rounded shadow-lg hover:border-[#555] transition-all group relative flex flex-col";
    
    let actionsHtml = '';
    if (isCustom) {
        actionsHtml = `
            <button onclick="event.stopPropagation(); window.deleteCloudNpc('${id}')" class="text-red-900 hover:text-red-500 p-1" title="Delete"><i class="fas fa-trash"></i></button>
            <button class="bg-[#222] hover:bg-[#333] text-gray-300 px-2 py-1 text-[9px] font-bold uppercase rounded border border-[#444]" onclick='event.stopPropagation(); window.editCloudNpc("${id}")'>Edit</button>
        `;
    } else {
        actionsHtml = `<button class="bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 px-2 py-1 text-[9px] font-bold uppercase rounded border border-blue-800" onclick='event.stopPropagation(); window.copyStaticNpc("${name}")'>Copy</button>`;
    }

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div class="overflow-hidden">
                <div class="text-[#d4af37] font-bold text-sm truncate" title="${name}">${name}</div>
                <div class="text-[9px] text-gray-500 uppercase tracking-wider">${type}</div>
            </div>
            ${isCustom ? `<i class="fas fa-cloud text-[10px] text-blue-500"></i>` : `<i class="fas fa-book text-[10px] text-gray-600"></i>`}
        </div>
        <div class="grid grid-cols-3 gap-1 text-[8px] text-gray-400 mb-3 bg-black/30 p-1 rounded">
            <div class="text-center"><div class="font-bold text-gray-300">${phys}</div><div>Phys</div></div>
            <div class="text-center"><div class="font-bold text-gray-300">${Object.keys(npc.disciplines||{}).length}</div><div>Disc</div></div>
            <div class="text-center"><div class="font-bold text-gray-300">${npc.willpower||1}</div><div>Will</div></div>
        </div>
        <div class="flex justify-between items-center border-t border-[#222] pt-2 mt-auto">
            <div class="flex gap-1">${actionsHtml}</div>
            <button class="bg-[#8b0000] hover:bg-red-700 text-white px-3 py-1 text-[9px] font-bold uppercase rounded shadow-md" onclick="event.stopPropagation(); window.stAddToCombat({id:'${id||name}', name:'${name}', health:${isCustom?'null':'{damage:0}'}, sourceId:'${id}'}, 'NPC')">Spawn</button>
        </div>
    `;
    card.onclick = () => { if(window.openNpcSheet) window.openNpcSheet(npc); };
    container.appendChild(card);
}

// --- DELEGATED JOURNAL HELPERS ---
async function pushHandoutToPlayers(id) {
    const entry = stState.journal[id];
    if(!entry) return;
    try {
        await setDoc(doc(db, 'chronicles', stState.activeChronicleId, 'journal', id), { pushed: true, pushTime: Date.now() }, { merge: true });
        showNotification("Pushed to Players!");
    } catch(e) { console.error(e); }
}

async function stDeleteJournalEntry(id) {
    if(!confirm("Delete this handout?")) return;
    try {
        await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'journal', id));
    } catch(e) { console.error(e); }
}

// --- WRAPPERS ---
function handleAddToCombat(entity, type) {
    if (!stState.activeChronicleId) { showNotification("No active chronicle.", "error"); return; }
    if (!entity.health) entity.health = { damage: 0, track: [0,0,0,0,0,0,0] };
    addCombatant(entity, type);
}

window.copyStaticNpc = function(name) {
    let found = null;
    for(const cat in BESTIARY) { if(BESTIARY[cat][name]) found = BESTIARY[cat][name]; }
    if(found && window.openNpcCreator) { window.openNpcCreator(found.template||'mortal', found); showNotification("Template Loaded."); }
};

window.deleteCloudNpc = async function(id) {
    if(!confirm("Delete?")) return;
    try { await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'bestiary', id)); showNotification("Deleted."); } catch(e) {}
};

window.editCloudNpc = function(id) {
    const entry = stState.bestiary[id];
    if(entry && entry.data && window.openNpcCreator) window.openNpcCreator(entry.type, entry.data);
}

window.previewStaticNpc = function(category, key) {
    const npc = BESTIARY[category][key];
    const grid = document.getElementById('bestiary-grid');
    if (grid && npc) {
        grid.innerHTML = '';
        renderNpcCard({ data: npc, name: key, type: npc.template }, null, false, grid);
    }
};
