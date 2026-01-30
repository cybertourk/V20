import { 
    db, auth, collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, onSnapshot, deleteDoc 
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { BESTIARY } from "./bestiary-data.js";

// --- STATE ---
export const stState = {
    activeChronicleId: null,
    isStoryteller: false,
    playerRef: null,
    listeners: [], // Store unsubscribe functions
    players: {},   // Store connected player data
    bestiary: {},  // Store custom cloud NPCs
    currentView: 'roster' // roster, combat, bestiary, journal
};

// --- INITIALIZATION ---
export function initStorytellerSystem() {
    console.log("Storyteller System Initialized");
    
    // Window bindings for HTML interaction
    window.openChronicleModal = openChronicleModal;
    window.closeChronicleModal = closeChronicleModal;
    window.renderJoinChronicleUI = renderJoinChronicleUI;
    window.renderCreateChronicleUI = renderCreateChronicleUI;
    window.handleCreateChronicle = handleCreateChronicle;
    window.handleJoinChronicle = handleJoinChronicle;
    window.disconnectChronicle = disconnectChronicle;
    window.switchStorytellerView = switchStorytellerView;
    window.copyStaticNpc = copyStaticNpc;
    window.deleteCloudNpc = deleteCloudNpc;
}

// --- MODAL HANDLERS ---
export function openChronicleModal() {
    let modal = document.getElementById('chronicle-modal');
    if (!modal) {
        console.warn("Chronicle Modal container missing.");
        return;
    }
    
    modal.classList.add('active');
    
    // If already connected, show status/dashboard entry instead of menu
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

    container.innerHTML = `
        <h2 class="heading text-xl text-[#d4af37] mb-6 border-b border-[#333] pb-2">Chronicles</h2>
        ${authWarning}
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
        // Generate a human-readable ID + random suffix
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
        
        showNotification("Chronicle Initialized!");
        stState.activeChronicleId = chronicleId;
        stState.isStoryteller = true;
        
        window.closeChronicleModal();
        activateStorytellerMode(); // Switch UI to ST Dashboard
        
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

        // Add player to 'players' sub-collection
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

        stState.activeChronicleId = idInput;
        stState.isStoryteller = false;
        stState.playerRef = playerRef;

        // Start Live Sync
        startPlayerSync();

        showNotification(`Joined ${data.name}`);
        window.closeChronicleModal();

    } catch (e) {
        console.error("Join Error:", e);
        err.innerText = "Connection failed: " + e.message;
        err.classList.remove('hidden');
    }
}

function disconnectChronicle() {
    // If player, remove from active list (optional, or just set status to offline)
    if (!stState.isStoryteller && stState.playerRef) {
        try {
            setDoc(stState.playerRef, { status: "Offline" }, { merge: true });
        } catch(e) { console.warn(e); }
    }

    // Stop listeners
    stState.listeners.forEach(unsub => unsub());
    stState.listeners = [];
    if (stState.syncInterval) clearInterval(stState.syncInterval);
    
    stState.activeChronicleId = null;
    stState.playerRef = null;
    stState.isStoryteller = false;
    stState.players = {};
    stState.bestiary = {};

    showNotification("Disconnected from Chronicle.");
    
    // Reset UI to standard player view
    const mainContent = document.getElementById('sheet-content');
    if (mainContent) {
        mainContent.innerHTML = ''; 
        window.location.reload(); 
    } else {
        window.openChronicleModal();
    }
}

// --- SYNC ENGINE ---
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
// STORYTELLER DASHBOARD LOGIC
// ==========================================================================

function activateStorytellerMode() {
    const mainContent = document.getElementById('sheet-content');
    if (!mainContent) return;

    // Replace Main Content with Dashboard
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
            </div>

            <!-- ST Viewport -->
            <div id="st-viewport" class="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                <!-- Views injected here -->
            </div>
        </div>
    `;

    // 1. Initialize Roster Listener
    const qRoster = query(collection(db, 'chronicles', stState.activeChronicleId, 'players'));
    const unsubRoster = onSnapshot(qRoster, (snapshot) => {
        stState.players = {};
        snapshot.forEach(doc => { stState.players[doc.id] = doc.data(); });
        if (stState.currentView === 'roster') renderRosterView();
    });
    stState.listeners.push(unsubRoster);

    // 2. Initialize Bestiary Listener
    const qBestiary = query(collection(db, 'chronicles', stState.activeChronicleId, 'bestiary'));
    const unsubBestiary = onSnapshot(qBestiary, (snapshot) => {
        stState.bestiary = {};
        snapshot.forEach(doc => { stState.bestiary[doc.id] = doc.data(); });
        if (stState.currentView === 'bestiary') renderBestiaryView();
    });
    stState.listeners.push(unsubBestiary);

    // Initial Render
    switchStorytellerView('roster');
}

function switchStorytellerView(view) {
    stState.currentView = view;
    
    // Update Tabs
    document.querySelectorAll('.st-tab').forEach(btn => {
        const isActive = btn.onclick.toString().includes(`'${view}'`);
        btn.className = isActive 
            ? "st-tab active px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#d4af37] border-b-2 border-[#d4af37] bg-[#222] transition-colors"
            : "st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors";
    });

    const viewport = document.getElementById('st-viewport');
    if (!viewport) return;

    if (view === 'roster') {
        renderRosterView();
    } else if (view === 'combat') {
        viewport.innerHTML = `<div class="p-8 text-center text-gray-500 italic">Combat Tracker - Coming Soon in Phase 4</div>`;
    } else if (view === 'bestiary') {
        renderBestiaryView();
    }
}

function renderRosterView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || stState.currentView !== 'roster') return;

    const players = Object.values(stState.players);
    
    if (players.length === 0) {
        viewport.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-users-slash text-4xl mb-4 opacity-50"></i>
                <p>No players connected.</p>
                <p class="text-xs mt-2">Share Chronicle ID: <span class="text-gold font-mono font-bold">${stState.activeChronicleId}</span></p>
            </div>`;
        return;
    }

    let html = `<div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full">`;

    players.forEach(p => {
        const health = p.live_stats?.health || [];
        const dmgCount = health.filter(x => x > 0).length;
        
        let healthColor = "text-green-500";
        if (dmgCount > 3) healthColor = "text-yellow-500";
        if (dmgCount > 5) healthColor = "text-red-500";
        if (dmgCount >= 7) healthColor = "text-red-700 font-black animate-pulse";

        const statusDot = p.status === 'Offline' ? 'bg-red-500' : 'bg-green-500';

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
                        <div class="text-lg font-bold ${healthColor}">${7 - dmgCount}/7</div>
                    </div>
                    <div class="bg-black/30 p-2 rounded border border-[#222]">
                        <div class="text-[9px] uppercase text-gray-500 font-bold mb-1">Willpower</div>
                        <div class="text-lg font-bold text-blue-400">${p.live_stats?.willpower || 0}</div>
                    </div>
                    <div class="bg-black/30 p-2 rounded border border-[#222]">
                        <div class="text-[9px] uppercase text-gray-500 font-bold mb-1">Blood</div>
                        <div class="text-lg font-bold text-red-500">${p.live_stats?.blood || 0}</div>
                    </div>
                </div>

                <div class="mt-4 pt-2 border-t border-[#222] flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button class="text-[10px] uppercase font-bold text-gray-400 hover:text-white px-2 py-1 border border-[#333] rounded hover:bg-[#222]">
                        View Sheet
                    </button>
                    <button class="text-[10px] uppercase font-bold text-red-500 hover:text-red-300 px-2 py-1 border border-red-900/30 rounded hover:bg-red-900/20">
                        Kick
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    viewport.innerHTML = html;
}

// ==========================================================================
// BESTIARY VIEW LOGIC
// ==========================================================================

function renderBestiaryView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || stState.currentView !== 'bestiary') return;

    let html = `
        <div class="flex h-full">
            <!-- Sidebar: Categories -->
            <div class="w-64 bg-[#080808] border-r border-[#333] flex flex-col">
                <div class="p-3 border-b border-[#333]">
                    <input type="text" id="bestiary-search" placeholder="Search NPCs..." class="w-full bg-[#111] border border-[#333] text-xs p-2 text-white outline-none focus:border-[#d4af37]">
                </div>
                <div class="flex-1 overflow-y-auto" id="bestiary-categories">
                    <div class="p-2 text-[10px] font-bold text-gray-500 uppercase">Chronicle Custom</div>
                    <div id="cat-custom" class="space-y-1 p-2 border-b border-[#222]"></div>
                    
                    <div class="p-2 text-[10px] font-bold text-gray-500 uppercase mt-2">Core Rulebook</div>
                    ${Object.keys(BESTIARY).map(cat => `
                        <div class="cursor-pointer hover:bg-[#222] px-3 py-1 text-xs text-gray-300 flex justify-between items-center group" onclick="document.getElementById('cat-group-${cat}').classList.toggle('hidden')">
                            <span>${cat}</span>
                            <i class="fas fa-chevron-down text-[8px] text-gray-600 group-hover:text-white"></i>
                        </div>
                        <div id="cat-group-${cat}" class="hidden pl-2 space-y-1 mb-2">
                            ${Object.keys(BESTIARY[cat]).map(key => `
                                <div class="cursor-pointer hover:text-[#d4af37] px-3 py-1 text-[11px] text-gray-500" onclick="window.previewStaticNpc('${cat}', '${key}')">
                                    ${key}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Main Content: Cards Grid -->
            <div class="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                <div id="bestiary-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <!-- Cards injected here -->
                </div>
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

    if (customNPCs.length === 0) {
        container.innerHTML = `<div class="px-3 py-1 text-[10px] italic text-gray-600">Empty</div>`;
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 italic mt-10">Select a category or Create Custom NPCs via Quick NPC.</div>`;
    }

    customNPCs.forEach(entry => {
        const id = Object.keys(stState.bestiary).find(key => stState.bestiary[key] === entry);
        
        // Sidebar Item
        const item = document.createElement('div');
        item.className = "cursor-pointer hover:text-[#d4af37] px-3 py-1 text-[11px] text-blue-300 truncate";
        item.innerText = entry.name;
        item.onclick = () => renderNpcCard(entry, id, true); // true = isCustom
        container.appendChild(item);

        // Grid Card (Render all custom by default)
        renderNpcCard(entry, id, true, grid);
    });
}

// Global helper to find static data
window.previewStaticNpc = function(category, key) {
    const npc = BESTIARY[category][key];
    const grid = document.getElementById('bestiary-grid');
    if (grid && npc) {
        grid.innerHTML = ''; // Clear grid to show focused selection
        renderNpcCard({ data: npc, name: key, type: npc.template }, null, false, grid);
    }
};

function renderNpcCard(entry, id, isCustom, container) {
    if (!container) return; // Should pass grid container

    const npc = entry.data || entry; // Handle wrapper vs raw data
    const name = entry.name || npc.name;
    const type = entry.type || npc.template || "Mortal";
    
    // Stats Summary
    const phys = (npc.attributes?.Strength || 1) + (npc.attributes?.Dexterity || 1) + (npc.attributes?.Stamina || 1);
    const discCount = Object.values(npc.disciplines || {}).reduce((a,b)=>a+b,0);
    
    const card = document.createElement('div');
    card.className = "bg-[#111] border border-[#333] p-3 rounded shadow-lg hover:border-[#555] transition-colors relative group animate-in fade-in";
    
    let actionsHtml = '';
    
    if (isCustom) {
        // Cloud Actions
        actionsHtml = `
            <button onclick="window.deleteCloudNpc('${id}')" class="text-red-900 hover:text-red-500 p-1" title="Delete Permanent"><i class="fas fa-trash"></i></button>
            <button class="bg-[#222] hover:bg-[#333] text-gray-300 px-2 py-1 text-[10px] font-bold uppercase rounded border border-[#444]" onclick='window.editCloudNpc("${id}")'>Edit</button>
        `;
    } else {
        // Static Actions
        actionsHtml = `
            <button class="bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 px-2 py-1 text-[10px] font-bold uppercase rounded border border-blue-800" onclick='window.copyStaticNpc("${name}")'>Copy</button>
        `;
    }

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div>
                <div class="text-[#d4af37] font-bold text-sm truncate pr-2">${name}</div>
                <div class="text-[10px] text-gray-500 uppercase tracking-wider">${type}</div>
            </div>
            ${isCustom ? `<i class="fas fa-cloud text-[10px] text-blue-500" title="Cloud Saved"></i>` : `<i class="fas fa-book text-[10px] text-gray-600" title="Core Rulebook"></i>`}
        </div>
        
        <div class="grid grid-cols-3 gap-1 text-[9px] text-gray-400 mb-3 bg-black/30 p-1 rounded">
            <div class="text-center"><div class="font-bold text-gray-300">${phys}</div><div>Phys</div></div>
            <div class="text-center"><div class="font-bold text-gray-300">${discCount}</div><div>Disc</div></div>
            <div class="text-center"><div class="font-bold text-gray-300">${npc.willpower||1}</div><div>Will</div></div>
        </div>

        <div class="flex justify-between items-center border-t border-[#222] pt-2 mt-auto">
            <div class="flex gap-2">
                ${actionsHtml}
            </div>
            <button class="bg-[#8b0000] hover:bg-red-700 text-white px-3 py-1 text-[10px] font-bold uppercase rounded shadow-md" title="Add to Combat (Coming Soon)">Spawn</button>
        </div>
    `;
    
    // Add View Click to Body
    card.addEventListener('click', (e) => {
        if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
            if(window.openNpcSheet) window.openNpcSheet(npc);
        }
    });

    container.appendChild(card);
}

// --- BESTIARY ACTIONS ---

window.copyStaticNpc = function(name) {
    // Find in Static Data
    let found = null;
    for (const cat in BESTIARY) {
        if (BESTIARY[cat][name]) found = BESTIARY[cat][name];
    }
    
    if (found) {
        // Open Creator with this data (which triggers Save to Bestiary flow)
        if(window.openNpcCreator) {
            window.openNpcCreator(found.template || 'mortal', found);
            showNotification("Template Loaded. Click 'Save to Bestiary' to customize.");
        }
    }
};

window.deleteCloudNpc = async function(id) {
    if(!confirm("Delete this NPC from the Cloud Bestiary?")) return;
    try {
        await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'bestiary', id));
        showNotification("NPC Deleted.");
    } catch(e) {
        console.error(e);
        showNotification("Error deleting NPC.");
    }
};

window.editCloudNpc = function(id) {
    const entry = stState.bestiary[id];
    if (entry && entry.data) {
        // We open the creator, but we need to handle the "Update" vs "New Save" logic
        // For simplicity in Phase 3, we open it, and saving will create a NEW entry or overwrite based on name logic in npc-creator
        // Ideally we pass the ID to update properly.
        if (window.openNpcCreator) {
            window.openNpcCreator(entry.type, entry.data);
            // Hint to user
            showNotification("Editing Cloud NPC.");
        }
    }
}
