import { 
    db, auth, collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, onSnapshot, deleteDoc, updateDoc, appId, arrayUnion, arrayRemove, orderBy, limit, writeBatch
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { BESTIARY } from "./bestiary-data.js";
import { GEN_LIMITS } from "./data.js";
import { 
    initCombatTracker, combatState, startCombat, endCombat, nextTurn, 
    addCombatant, removeCombatant, updateInitiative, rollNPCInitiative 
} from "./combat-tracker.js";

import { renderStorytellerJournal, updateJournalList } from "./ui-journal.js";

import { 
    initChatSystem, startChatListener, sendChronicleMessage, 
    stClearChat, stExportChat, stSetWhisperTarget, renderMessageList, refreshChatUI
} from "./chat-model.js";

// --- STATE ---
export const stState = {
    activeChronicleId: null,
    isStoryteller: false,
    playerRef: null,
    listeners: [], 
    players: {},   
    bestiary: {},  
    journal: {},
    settings: {}, 
    currentView: 'roster', 
    syncInterval: null,
    seenHandouts: new Set(),
    dashboardActive: false,
    chatUnsub: null,
    chatHistory: [], 
    whisperTarget: null 
};

// Expose state globally
window.stState = stState;

// --- INITIALIZATION ---
export function initStorytellerSystem() {
    console.log("Storyteller System Initializing...");
    
    // Initialize Chat System (Binds window functions)
    initChatSystem();

    // Window bindings for Storyteller UI
    window.openChronicleModal = openChronicleModal;
    window.closeChronicleModal = closeChronicleModal;
    window.renderJoinChronicleUI = renderJoinChronicleUI;
    window.renderCreateChronicleUI = renderCreateChronicleUI;
    window.handleCreateChronicle = handleCreateChronicle;
    window.handleJoinChronicle = handleJoinChronicle;
    window.handleResumeChronicle = handleResumeChronicle;
    window.handleDeleteChronicle = handleDeleteChronicle;
    window.disconnectChronicle = disconnectChronicle;
    window.switchStorytellerView = switchStorytellerView;
    window.renderStorytellerDashboard = renderStorytellerDashboard;
    window.exitStorytellerDashboard = exitStorytellerDashboard;
    
    // Settings Actions
    window.stSaveSettings = stSaveSettings;

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

    // Journal Bindings
    window.stPushHandout = pushHandoutToPlayers;
    window.stDeleteJournalEntry = stDeleteJournalEntry;
    
    // Roster Management
    window.stRemovePlayer = stRemovePlayer;
    window.stViewPlayerSheet = stViewPlayerSheet; 
    window.returnToStoryteller = returnToStoryteller; 

    // GLOBAL PUSH API
    window.stPushNpc = async (npcData) => {
        if (!stState.activeChronicleId || !stState.isStoryteller) return showNotification("Not in ST Mode", "error");
        try {
            const id = npcData.id || "npc_" + Date.now();
            await setDoc(doc(db, 'chronicles', stState.activeChronicleId, 'bestiary', id), {
                name: npcData.name || "Unknown",
                type: "Custom",
                data: npcData
            });
            showNotification(`${npcData.name} sent to Bestiary`);
        } catch(e) { console.error(e); showNotification("Failed to push NPC", "error"); }
    };

    bindDashboardButton();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindDashboardButton);
    }

    setTimeout(checkStaleSession, 1000);
}

function bindDashboardButton() {
    const btn = document.getElementById('st-dashboard-btn');
    if (btn) {
        btn.onclick = (e) => {
            e.preventDefault();
            window.renderStorytellerDashboard();
        };
    }
}

// --- SESSION HYGIENE ---
async function checkStaleSession() {
    const user = auth.currentUser;
    const storedId = localStorage.getItem('v20_last_chronicle_id');
    const storedRole = localStorage.getItem('v20_last_chronicle_role');

    if (!user && storedId) {
        disconnectChronicle(); 
        localStorage.removeItem('v20_last_chronicle_id');
        localStorage.removeItem('v20_last_chronicle_name');
        localStorage.removeItem('v20_last_chronicle_role');
        toggleStorytellerButton(false);
        return;
    }

    if (user && storedId && storedRole === 'ST') {
        try {
            const docRef = doc(db, 'chronicles', storedId);
            const snap = await getDoc(docRef);
            
            if (!snap.exists() || snap.data().storyteller_uid !== user.uid) {
                disconnectChronicle();
                localStorage.removeItem('v20_last_chronicle_id');
                localStorage.removeItem('v20_last_chronicle_name');
                localStorage.removeItem('v20_last_chronicle_role');
                toggleStorytellerButton(false);
            } else {
                stState.activeChronicleId = storedId;
                stState.isStoryteller = true;
                stState.settings = snap.data(); 
                startStorytellerSession(); 
                toggleStorytellerButton(true);
            }
        } catch(e) {
            console.error("Session Check Error:", e);
        }
    } 
    else if (user && storedId && storedRole === 'Player') {
        try {
            const playerRef = doc(db, 'chronicles', storedId, 'players', user.uid);
            const playerSnap = await getDoc(playerRef);

            if (!playerSnap.exists()) {
                console.log("Player removed from roster. Clearing stale session.");
                disconnectChronicle(true); 
                return;
            }

            const chronRef = doc(db, 'chronicles', storedId);
            const chronSnap = await getDoc(chronRef);
            if (chronSnap.exists()) {
                stState.settings = chronSnap.data();
            }

            stState.activeChronicleId = storedId;
            stState.isStoryteller = false;
            stState.playerRef = playerRef;
            
            initCombatTracker(storedId); 
            startPlayerSync();
            startPlayerListeners(storedId); 
            startChatListener(storedId); 
        } catch(e) {
            console.error("Player Session Check Error:", e);
        }
    }
}

function toggleStorytellerButton(show) {
    const btn = document.getElementById('st-dashboard-btn');
    if (btn) {
        if (show) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }
}

// --- MODAL HANDLERS ---
export function openChronicleModal() {
    let modal = document.getElementById('chronicle-modal');
    if (!modal) return;
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
async function renderChronicleMenu() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    const user = auth.currentUser;
    const authWarning = !user ? `<div class="bg-red-900/20 border border-red-500/50 p-2 mb-4 text-xs text-red-300 text-center">You must be logged in to use Chronicle features.</div>` : '';

    container.innerHTML = `
        <h2 class="heading text-xl text-[#d4af37] mb-4 border-b border-[#333] pb-2">Chronicles</h2>
        ${authWarning}
        <div id="st-resume-block"></div>
        <div id="st-campaign-list" class="mb-6 hidden"></div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Connect to an existing story as a <strong>Player</strong>.
                </p>
            </div>

            <div class="bg-[#1a0505] p-6 border border-[#333] hover:border-red-600 transition-all cursor-pointer group relative overflow-hidden" 
                 onclick="${user ? 'window.renderCreateChronicleUI()' : ''}"
                 style="${!user ? 'opacity:0.5; pointer-events:none;' : ''}">
                <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fas fa-book-dead text-6xl text-red-600"></i>
                </div>
                <h3 class="text-white font-cinzel font-bold uppercase mb-2 text-lg group-hover:text-red-500 transition-colors">
                    New Chronicle
                </h3>
                <p class="text-xs text-gray-400 leading-relaxed">
                    Initialize a new story as <strong>Storyteller</strong>.
                </p>
            </div>
        </div>
        <div class="mt-8 border-t border-[#333] pt-4 text-center">
            <button class="text-gray-500 hover:text-white text-xs uppercase font-bold tracking-widest" onclick="window.closeChronicleModal()">Close</button>
        </div>
    `;

    if (!user) return;

    const recentId = localStorage.getItem('v20_last_chronicle_id');
    const recentRole = localStorage.getItem('v20_last_chronicle_role'); 
    
    if (recentId) {
        try {
            let isValid = false;
            let displayName = localStorage.getItem('v20_last_chronicle_name') || recentId;

            if (recentRole === 'ST') {
                const docRef = doc(db, 'chronicles', recentId);
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().storyteller_uid === user.uid) {
                    isValid = true;
                    displayName = snap.data().name;
                }
            } else {
                const playerRef = doc(db, 'chronicles', recentId, 'players', user.uid);
                const snap = await getDoc(playerRef);
                if (snap.exists()) {
                    isValid = true;
                    if (!localStorage.getItem('v20_last_chronicle_name')) {
                        const cSnap = await getDoc(doc(db, 'chronicles', recentId));
                        if(cSnap.exists()) displayName = cSnap.data().name;
                    }
                }
            }

            if (isValid) {
                const btnColor = recentRole === 'ST' ? 'text-red-500 border-red-900 hover:bg-red-900/20' : 'text-blue-400 border-blue-900 hover:bg-blue-900/20';
                const roleLabel = recentRole === 'ST' ? 'Storyteller' : 'Player';
                const resumeHtml = `
                    <div class="mb-6 p-4 bg-[#111] border border-[#333] flex justify-between items-center animate-in fade-in">
                        <div>
                            <div class="text-[10px] text-gray-500 uppercase font-bold">Resume Last Session</div>
                            <div class="text-white font-bold font-cinzel text-lg">${displayName}</div>
                            <div class="text-[9px] text-gray-400">${roleLabel}</div>
                        </div>
                        <button onclick="window.handleResumeChronicle('${recentId}', '${recentRole}')" class="px-4 py-2 border rounded uppercase font-bold text-xs ${btnColor}">
                            Resume <i class="fas fa-arrow-right ml-1"></i>
                        </button>
                    </div>
                `;
                const rBlock = document.getElementById('st-resume-block');
                if(rBlock) rBlock.innerHTML = resumeHtml;
            } else {
                localStorage.removeItem('v20_last_chronicle_id');
                localStorage.removeItem('v20_last_chronicle_name');
                localStorage.removeItem('v20_last_chronicle_role');
            }
        } catch (e) {
            console.error("Resume check failed:", e);
        }
    }

    const listDiv = document.getElementById('st-campaign-list');
    if (listDiv) {
        try {
            const q = query(collection(db, 'chronicles'), where("storyteller_uid", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                let html = `<h4 class="text-[10px] text-gray-500 uppercase font-bold mb-2">My Campaigns</h4><div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">`;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    html += `
                        <div class="flex justify-between items-center bg-[#1a1a1a] p-3 border-l-2 border-red-900 hover:bg-[#222] cursor-pointer group transition-colors relative">
                            <div class="flex-1" onclick="window.handleResumeChronicle('${doc.id}', 'ST')">
                                <div class="text-white font-bold text-sm font-cinzel group-hover:text-[#d4af37] transition-colors">${data.name}</div>
                                <div class="text-[9px] text-gray-500">${data.timePeriod || "Modern Nights"}</div>
                                <div class="text-[9px] text-gray-600 font-mono group-hover:text-white">${doc.id}</div>
                            </div>
                            <button onclick="event.stopPropagation(); window.handleDeleteChronicle('${doc.id}')" class="text-gray-600 hover:text-red-500 p-2 z-10 transition-colors" title="Delete Chronicle">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;
                });
                html += `</div>`;
                listDiv.innerHTML = html;
                listDiv.classList.remove('hidden');
            }
        } catch (e) {
            console.error("Error loading campaigns:", e);
        }
    }
}

async function handleDeleteChronicle(id) {
    if (!confirm("Are you sure you want to delete this Chronicle? This action CANNOT be undone and will delete all campaign data.")) return;
    try {
        if (stState.activeChronicleId === id) {
            disconnectChronicle();
        }
        await deleteDoc(doc(db, 'chronicles', id));
        showNotification("Chronicle Deleted.");
        renderChronicleMenu();
    } catch (e) {
        console.error("Delete Error:", e);
        showNotification("Failed to delete chronicle.", "error");
    }
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
            
            <div id="join-preview" class="hidden bg-[#111] p-4 border border-[#d4af37] text-center space-y-2">
                <div class="text-[#d4af37] font-cinzel font-bold text-lg" id="preview-name"></div>
                <div class="text-[10px] text-gray-400 uppercase tracking-widest" id="preview-time"></div>
                <div class="text-xs text-gray-300 italic font-serif" id="preview-synopsis"></div>
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

    const input = document.getElementById('join-id');
    input.addEventListener('input', async (e) => {
        const val = e.target.value.trim();
        if (val.length >= 8) { 
            try {
                const snap = await getDoc(doc(db, 'chronicles', val));
                if (snap.exists()) {
                    const data = snap.data();
                    document.getElementById('preview-name').innerText = data.name;
                    document.getElementById('preview-time').innerText = data.timePeriod || "Modern Nights";
                    document.getElementById('preview-synopsis').innerText = data.synopsis ? `"${data.synopsis.substring(0, 100)}..."` : "";
                    document.getElementById('join-preview').classList.remove('hidden');
                }
            } catch(e) {}
        }
    });
}

function renderCreateChronicleUI() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    container.innerHTML = `
        <h2 class="heading text-xl text-red-500 mb-4 border-b border-[#333] pb-2">Initialize Chronicle</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div class="space-y-4">
                <div>
                    <label class="label-text text-gray-400">Chronicle Name</label>
                    <input type="text" id="create-name" class="w-full bg-[#050505] border border-[#333] text-white p-2 text-sm focus:border-red-500 outline-none font-bold" placeholder="e.g. Los Angeles by Night">
                </div>
                <div>
                    <label class="label-text text-gray-400">Time Period / Setting</label>
                    <input type="text" id="create-time" class="w-full bg-[#050505] border border-[#333] text-white p-2 text-sm focus:border-red-500 outline-none" placeholder="e.g. 1990s, Dark Ages, Modern">
                </div>
                <div>
                    <label class="label-text text-gray-400">Passcode (Optional)</label>
                    <input type="text" id="create-pass" class="w-full bg-[#050505] border border-[#333] text-white p-2 text-sm focus:border-red-500 outline-none" placeholder="Leave blank for open game">
                </div>
                <div>
                    <label class="label-text text-gray-400">Synopsis / Briefing</label>
                    <textarea id="create-synopsis" class="w-full bg-[#050505] border border-[#333] text-gray-300 p-2 text-xs focus:border-red-500 outline-none resize-none h-32" placeholder="The elevator pitch for your players..."></textarea>
                </div>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="label-text text-gray-400">House Rules</label>
                    <textarea id="create-rules" class="w-full bg-[#050505] border border-[#333] text-gray-300 p-2 text-xs focus:border-red-500 outline-none resize-none h-48 leading-relaxed">${window.state?.settings?.houseRules || ''}</textarea>
                </div>
                <div>
                    <label class="label-text text-gray-400">Lore / Rumors</label>
                    <textarea id="create-lore" class="w-full bg-[#050505] border border-[#333] text-gray-300 p-2 text-xs focus:border-red-500 outline-none resize-none h-48 leading-relaxed">${window.state?.settings?.lore || ''}</textarea>
                </div>
            </div>
        </div>
        <div id="create-error" class="text-red-500 text-xs font-bold text-center hidden mt-2"></div>
        <div class="flex gap-4 mt-6 border-t border-[#333] pt-4">
            <button class="flex-1 border border-[#333] text-gray-400 py-2 text-xs font-bold uppercase hover:bg-[#222]" onclick="window.openChronicleModal()">Back</button>
            <button class="flex-1 bg-red-900 text-white py-2 text-xs font-bold uppercase hover:bg-red-700 shadow-lg" onclick="window.handleCreateChronicle()">Initialize System</button>
        </div>
    `;
}

function renderConnectedStatus() {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    container.innerHTML = `
        <button onclick="window.closeChronicleModal()" class="absolute top-2 right-3 text-gray-500 hover:text-white text-xl">&times;</button>
        <div class="text-center py-8">
            <h2 class="heading text-2xl text-green-500 mb-2">Connected</h2>
            <p class="text-gray-400 text-xs mb-6 font-mono select-all">${stState.activeChronicleId}</p>
            
            <div class="bg-[#111] p-4 border border-[#333] rounded mb-6 max-w-sm mx-auto">
                <div class="text-xs text-gray-500 uppercase font-bold mb-2">Status</div>
                <div class="flex justify-center items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span class="text-white font-bold">Live Sync Active</span>
                </div>
            </div>

            <div class="flex justify-center gap-4">
                <button class="border border-[#444] text-gray-400 hover:bg-[#222] px-6 py-2 text-xs font-bold uppercase transition-colors" onclick="window.closeChronicleModal()">
                    Close
                </button>
                <button class="border border-red-900/50 text-red-500 hover:bg-red-900/20 px-6 py-2 text-xs font-bold uppercase transition-colors" onclick="window.disconnectChronicle()">
                    Disconnect
                </button>
            </div>
        </div>
    `;
}

// --- FIREBASE LOGIC ---

async function handleCreateChronicle() {
    const user = auth.currentUser;
    if(!user) return;

    const name = document.getElementById('create-name').value.trim();
    const time = document.getElementById('create-time').value.trim();
    const pass = document.getElementById('create-pass').value.trim();
    const synopsis = document.getElementById('create-synopsis').value.trim();
    const rules = document.getElementById('create-rules').value.trim();
    const lore = document.getElementById('create-lore').value.trim();
    
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
            timePeriod: time,
            synopsis: synopsis,
            houseRules: rules,
            lore: lore,
            created_at: new Date().toISOString(),
            active_scene: "Prologue"
        };

        await setDoc(doc(db, 'chronicles', chronicleId), chronicleData);
        
        localStorage.setItem('v20_last_chronicle_id', chronicleId);
        localStorage.setItem('v20_last_chronicle_name', name);
        localStorage.setItem('v20_last_chronicle_role', 'ST');

        stState.activeChronicleId = chronicleId;
        stState.isStoryteller = true;
        stState.settings = chronicleData;
        
        window.closeChronicleModal();
        startStorytellerSession(); 
        toggleStorytellerButton(true);
        window.renderStorytellerDashboard(); 
        
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

        stState.settings = data;

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

        initCombatTracker(idInput);
        
        startPlayerSync();
        startPlayerListeners(idInput); 
        startChatListener(idInput); 

        sendChronicleMessage('system', `${charName} joined the chronicle.`);

        showNotification(`Joined ${data.name}. Check the Chronicle tab.`);
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
        stState.settings = data;

        localStorage.setItem('v20_last_chronicle_id', id);
        localStorage.setItem('v20_last_chronicle_name', data.name);
        localStorage.setItem('v20_last_chronicle_role', role);

        if (role === 'ST') {
            if (data.storyteller_uid !== auth.currentUser.uid) {
                showNotification("Permission Denied: You are not the Storyteller.", "error");
                localStorage.removeItem('v20_last_chronicle_id');
                return;
            }
            stState.activeChronicleId = id;
            stState.isStoryteller = true;
            
            window.closeChronicleModal();
            startStorytellerSession(); 
            showNotification(`Resumed ${data.name} (ST Mode)`);
            toggleStorytellerButton(true);
            window.renderStorytellerDashboard(); 
        } else {
            const playerRef = doc(db, 'chronicles', id, 'players', auth.currentUser.uid);
            
            const pSnap = await getDoc(playerRef);
            if (!pSnap.exists()) {
                showNotification("Your character was removed from this Chronicle. Please rejoin.", "error");
                localStorage.removeItem('v20_last_chronicle_id');
                localStorage.removeItem('v20_last_chronicle_name');
                localStorage.removeItem('v20_last_chronicle_role');
                renderChronicleMenu();
                return;
            }

            await setDoc(playerRef, { status: "Connected", last_active: new Date().toISOString() }, { merge: true });
            
            stState.activeChronicleId = id;
            stState.isStoryteller = false;
            stState.playerRef = playerRef;
            
            initCombatTracker(id);
            
            startPlayerSync();
            startPlayerListeners(id); 
            startChatListener(id); 
            
            const charName = document.getElementById('c-name')?.value || "Unknown";
            sendChronicleMessage('system', `${charName} reconnected.`);

            window.closeChronicleModal();
            showNotification(`Reconnected to ${data.name}`);
        }
        
    } catch (e) {
        console.error("Resume Error:", e);
        showNotification("Failed to resume.", "error");
    }
}

function disconnectChronicle(isKicked = false) {
    if (stState.activeChronicleId && !isKicked) {
        const charName = stState.isStoryteller ? "Storyteller" : (document.getElementById('c-name')?.value || "Unknown");
        sendChronicleMessage('system', `${charName} disconnected.`);
    }

    if (!isKicked && !stState.isStoryteller && stState.playerRef) {
        try {
            setDoc(stState.playerRef, { status: "Offline" }, { merge: true });
        } catch(e) { console.warn(e); }
    }

    stState.listeners.forEach(unsub => unsub());
    stState.listeners = [];
    if (stState.chatUnsub) stState.chatUnsub();
    if (stState.syncInterval) clearInterval(stState.syncInterval);
    
    stState.activeChronicleId = null;
    stState.playerRef = null;
    stState.isStoryteller = false;
    stState.dashboardActive = false;
    stState.players = {};
    stState.bestiary = {};
    stState.journal = {};
    stState.settings = {};
    stState.seenHandouts = new Set();
    stState.chatHistory = [];

    showNotification(isKicked ? "Removed from Chronicle." : "Disconnected from Chronicle.");
    
    localStorage.removeItem('v20_last_chronicle_id');
    localStorage.removeItem('v20_last_chronicle_name');
    localStorage.removeItem('v20_last_chronicle_role');

    const floatBtn = document.getElementById('player-combat-float');
    if(floatBtn) floatBtn.remove();
    
    const tab = document.getElementById('play-mode-chronicle');
    if(tab) tab.classList.add('hidden');
    
    const navBtn = document.getElementById('nav-chronicle');
    if(navBtn) navBtn.classList.remove('active');

    toggleStorytellerButton(false);
    exitStorytellerDashboard();
    
    if (window.state && window.state.currentPhase === 7) {
        if(window.changeStep) window.changeStep(1);
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
                // ADDED: Sync full sheet state so ST can view it
                full_sheet: window.state || {}, 
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

function startPlayerListeners(chronicleId) {
    const q = query(collection(db, 'chronicles', chronicleId, 'players'));
    const unsub = onSnapshot(q, (snapshot) => {
        let updated = false;
        
        stState.players = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!doc.id.startsWith('journal_')) {
                stState.players[doc.id] = data;
            }
        });

        refreshChatUI();

        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const docId = change.doc.id;
            
            if (change.type === 'removed' && auth.currentUser && docId === auth.currentUser.uid) {
                disconnectChronicle(true); 
                showNotification("Disconnected by Storyteller.", "error");
                return;
            }

            if (docId.startsWith('journal_') && data.pushed === true) {
                const myId = auth.currentUser?.uid;
                let isRecipient = false;
                
                if (!data.recipients) {
                    isRecipient = true; 
                } else if (Array.isArray(data.recipients)) {
                    if (data.recipients.length === 0) isRecipient = false; 
                    else if (myId && data.recipients.includes(myId)) isRecipient = true;
                }
                
                if (isRecipient) {
                    if (change.type === 'added' || change.type === 'modified') {
                        if (!window.state.codex) window.state.codex = [];
                        const entry = { ...data, id: docId }; 
                        const idx = window.state.codex.findIndex(c => c.id === docId);
                        if (idx > -1) window.state.codex[idx] = entry;
                        else window.state.codex.push(entry);
                        updated = true;
                    }
                    if (change.type === 'removed') {
                        if (window.state.codex) {
                            window.state.codex = window.state.codex.filter(c => c.id !== docId);
                            updated = true;
                        }
                    }
                }
            }
        });
        
        if (updated) {
            showNotification("Journal Updated from Chronicle");
            const journalTab = document.getElementById('play-mode-5');
            if (journalTab && journalTab.classList.contains('active')) {
                if(window.renderJournalTab) window.renderJournalTab();
            }
        }
    }, (error) => {
        if (error.code === 'permission-denied') {
            console.warn("Journal Listener: Access Denied.");
        } else {
            console.error("Journal Listener Error:", error);
        }
    });
    
    stState.listeners.push(unsub);
}

// ==========================================================================
// STORYTELLER DASHBOARD (Overlay)
// ==========================================================================

function startStorytellerSession() {
    const qRoster = query(collection(db, 'chronicles', stState.activeChronicleId, 'players'));
    
    stState.listeners.push(onSnapshot(qRoster, (snapshot) => {
        stState.players = {};
        stState.journal = {}; 
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            if (id.startsWith('journal_')) {
                stState.journal[id] = data;
            } else {
                stState.players[id] = data;
            }
        });

        refreshChatUI();

        if (stState.dashboardActive) {
            if (stState.currentView === 'roster') {
                renderRosterView();
            }
            else if (stState.currentView === 'journal') {
                if (updateJournalList) {
                    updateJournalList(Object.values(stState.journal));
                }
            }
        }
    }, (error) => {
        console.error("Roster Listener Error:", error);
        if (error.code === 'permission-denied') {
            showNotification("ST Access Revoked", "error");
            exitStorytellerDashboard();
        }
    }));

    const qBestiary = query(collection(db, 'chronicles', stState.activeChronicleId, 'bestiary'));
    stState.listeners.push(onSnapshot(qBestiary, (snapshot) => {
        stState.bestiary = {};
        snapshot.forEach(doc => { stState.bestiary[doc.id] = doc.data(); });
        if (stState.dashboardActive && stState.currentView === 'bestiary') renderBestiaryView();
    }, (error) => {
        console.error("Bestiary Listener Error:", error);
    }));

    initCombatTracker(stState.activeChronicleId);
    startChatListener(stState.activeChronicleId);
}

function renderStorytellerDashboard(container = null) {
    if (!container) container = document.getElementById('st-dashboard-view');
    if (!container) return;

    stState.dashboardActive = true;
    container.classList.remove('hidden');
    container.style.display = 'flex'; 

    container.innerHTML = `
        <div class="flex flex-col w-full h-full bg-[#050505] pt-16">
            <!-- ST Header -->
            <div class="bg-[#1a0505] border-b border-[#500] p-4 flex justify-between items-center shadow-lg z-10 shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-xl font-cinzel text-red-500 font-bold tracking-widest uppercase">
                        <i class="fas fa-crown mr-2"></i> Storyteller Mode
                    </h2>
                    <span class="text-xs font-mono text-gray-500 border border-[#333] px-2 py-1 rounded bg-black">
                        ID: <span class="text-gold select-all cursor-pointer" onclick="navigator.clipboard.writeText('${stState.activeChronicleId}')">${stState.activeChronicleId}</span>
                    </span>
                </div>
                <div class="flex gap-2">
                    <button class="bg-[#222] border border-[#444] text-gray-300 hover:text-white px-3 py-1 text-xs font-bold uppercase rounded transition-colors" onclick="window.exitStorytellerDashboard()">
                        <i class="fas fa-arrow-left mr-1"></i> Character Creator
                    </button>
                    <button class="bg-[#222] border border-red-900 text-red-500 hover:text-white hover:bg-red-900 px-3 py-1 text-xs font-bold uppercase rounded transition-colors" onclick="window.disconnectChronicle()">
                        <i class="fas fa-sign-out-alt mr-1"></i> Disconnect
                    </button>
                </div>
            </div>

            <!-- ST Tabs -->
            <div class="flex bg-[#111] border-b border-[#333] px-4 shrink-0 overflow-x-auto no-scrollbar">
                <button class="st-tab active px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#d4af37] border-b-2 border-[#d4af37] hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('roster')">
                    <i class="fas fa-users mr-2"></i> Roster
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('combat')">
                    <i class="fas fa-swords mr-2"></i> Combat
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('bestiary')">
                    <i class="fas fa-dragon mr-2"></i> Bestiary
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('journal')">
                    <i class="fas fa-book-open mr-2"></i> Journal
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('chat')">
                    <i class="fas fa-comments mr-2"></i> Chat / Log
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('settings')">
                    <i class="fas fa-cogs mr-2"></i> Settings
                </button>
            </div>

            <!-- ST Viewport -->
            <div id="st-viewport" class="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                <!-- Views injected here -->
            </div>
        </div>
    `;
    
    switchStorytellerView(stState.currentView || 'roster');
}

function exitStorytellerDashboard() {
    stState.dashboardActive = false;
    const dash = document.getElementById('st-dashboard-view');
    if(dash) {
        dash.style.display = 'none';
        dash.classList.add('hidden');
    }
}

function switchStorytellerView(view) {
    stState.currentView = view;
    document.querySelectorAll('.st-tab').forEach(btn => {
        const isActive = btn.onclick.toString().includes(`'${view}'`);
        btn.className = isActive 
            ? "st-tab active px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#d4af37] border-b-2 border-[#d4af37] bg-[#222] transition-colors whitespace-nowrap"
            : "st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap";
    });

    const viewport = document.getElementById('st-viewport');
    if (view === 'roster') renderRosterView();
    else if (view === 'combat') renderCombatView();
    else if (view === 'bestiary') renderBestiaryView();
    else if (view === 'journal') {
        if(renderStorytellerJournal) renderStorytellerJournal(viewport);
    }
    else if (view === 'chat') renderChatView(viewport);
    else if (view === 'settings') renderSettingsView(viewport);
}

// --- NEW SETTINGS VIEW ---
async function renderSettingsView(container) {
    if(!container) return;
    
    const docRef = doc(db, 'chronicles', stState.activeChronicleId);
    let data = stState.settings || {};
    
    try {
        const snap = await getDoc(docRef);
        if(snap.exists()) {
            data = snap.data();
            stState.settings = data;
        }
    } catch(e) { console.error(e); }

    container.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto pb-20 overflow-y-auto h-full custom-scrollbar">
            <h2 class="text-2xl text-[#d4af37] font-cinzel font-bold mb-6 border-b border-[#333] pb-2 uppercase tracking-wider">Chronicle Configuration</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label class="label-text text-gray-400">Chronicle Name</label>
                    <input type="text" id="st-set-name" class="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none" value="${data.name || ''}">
                </div>
                <div>
                    <label class="label-text text-gray-400">Time Period / Setting</label>
                    <input type="text" id="st-set-time" class="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none" value="${data.timePeriod || ''}">
                </div>
            </div>

            <div class="mb-6">
                <label class="label-text text-gray-400">Passcode (Leave empty for open access)</label>
                <input type="text" id="st-set-pass" class="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none" value="${data.passcode || ''}">
            </div>

            <div class="mb-6">
                <label class="label-text text-gray-400">Synopsis / Briefing (Public)</label>
                <textarea id="st-set-synopsis" class="w-full bg-[#111] border border-[#333] text-gray-300 p-3 text-xs focus:border-[#d4af37] outline-none resize-none h-32 leading-relaxed">${data.synopsis || ''}</textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label class="label-text text-gray-400">House Rules</label>
                    <textarea id="st-set-rules" class="w-full bg-[#1a0505] border border-red-900/30 text-gray-300 p-3 text-xs focus:border-red-500 outline-none resize-none h-48 leading-relaxed">${data.houseRules || ''}</textarea>
                </div>
                <div>
                    <label class="label-text text-gray-400">Lore / Setting Details</label>
                    <textarea id="st-set-lore" class="w-full bg-[#0a0a0a] border border-[#d4af37]/30 text-gray-300 p-3 text-xs focus:border-[#d4af37] outline-none resize-none h-48 leading-relaxed">${data.lore || ''}</textarea>
                </div>
            </div>

            <div class="text-right">
                <button onclick="window.stSaveSettings()" class="bg-[#d4af37] text-black font-bold px-8 py-3 rounded uppercase hover:bg-[#fcd34d] shadow-lg tracking-widest transition-transform hover:scale-105">
                    Save Changes
                </button>
            </div>
        </div>
    `;
}

async function stSaveSettings() {
    if(!stState.activeChronicleId) return;
    
    const updates = {
        name: document.getElementById('st-set-name').value,
        timePeriod: document.getElementById('st-set-time').value,
        passcode: document.getElementById('st-set-pass').value,
        synopsis: document.getElementById('st-set-synopsis').value,
        houseRules: document.getElementById('st-set-rules').value,
        lore: document.getElementById('st-set-lore').value
    };
    
    try {
        await updateDoc(doc(db, 'chronicles', stState.activeChronicleId), updates);
        stState.settings = { ...stState.settings, ...updates };
        showNotification("Settings Updated");
    } catch(e) {
        console.error(e);
        showNotification("Update Failed", "error");
    }
}

// --- REMOVE PLAYER (KICK) ---
async function stRemovePlayer(id, name) {
    if (!confirm(`Remove ${name} from the roster? This will disconnect them.`)) return;
    try {
        await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'players', id));
        showNotification(`${name} removed.`);
    } catch (e) {
        console.error("Remove Player Error:", e);
        showNotification("Failed to remove player.", "error");
    }
}

// --- NEW FUNCTION: VIEW PLAYER SHEET (Full App View) ---
function stViewPlayerSheet(playerId) {
    const player = stState.players[playerId];
    if (!player || !player.full_sheet) {
        showNotification("Sheet data not yet synced. Wait for player update.", "error");
        return;
    }

    // 1. Backup current ST state
    window.stSavedLocalState = JSON.parse(JSON.stringify(window.state));

    // 2. Load Player Data into State
    window.state = JSON.parse(JSON.stringify(player.full_sheet));
    
    // Force Play Mode
    window.state.isPlayMode = true;
    
    // 3. Hide Dashboard
    const dashboard = document.getElementById('st-dashboard-view');
    if (dashboard) dashboard.classList.add('hidden');

    // 4. Update UI
    if (window.fullRefresh) window.fullRefresh();
    if (window.applyPlayModeUI) window.applyPlayModeUI();

    // 5. Show Return Button
    let btn = document.getElementById('st-return-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'st-return-btn';
        // High Z-index to sit on top of everything
        btn.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] bg-[#8b0000] text-white px-6 py-3 rounded-full font-bold uppercase shadow-[0_0_20px_red] border-2 border-[#d4af37] animate-pulse hover:scale-105 transition-transform flex items-center gap-2';
        btn.innerHTML = '<i class="fas fa-crown"></i> Return to Dashboard';
        btn.onclick = window.returnToStoryteller;
        document.body.appendChild(btn);
    }
    btn.classList.remove('hidden');
    
    showNotification(`Viewing ${player.character_name}'s Sheet`);
}

function returnToStoryteller() {
    // 1. Restore State
    if (window.stSavedLocalState) {
        window.state = window.stSavedLocalState;
        window.stSavedLocalState = null;
    }

    // 2. Hide Button
    const btn = document.getElementById('st-return-btn');
    if (btn) btn.classList.add('hidden');

    // 3. Show Dashboard
    const dashboard = document.getElementById('st-dashboard-view');
    if (dashboard) dashboard.classList.remove('hidden');

    // 4. Refresh UI back to ST's character (background)
    if (window.fullRefresh) window.fullRefresh();
    
    // 5. Ensure ST view is correct
    if (window.renderStorytellerDashboard) window.renderStorytellerDashboard();
};


// --- VIEW 1: ROSTER ---
function renderRosterView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || stState.currentView !== 'roster') return;

    const players = Object.entries(stState.players)
        .filter(([id, p]) => !p.metadataType || p.metadataType !== 'journal')
        .map(([id, p]) => ({...p, id})); 
    
    if (players.length === 0) {
        viewport.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500"><i class="fas fa-users-slash text-4xl mb-4 opacity-50"></i><p>No players connected.</p><p class="text-xs mt-2">Share ID: <span class="text-gold font-mono font-bold">${stState.activeChronicleId}</span></p></div>`;
        return;
    }

    let html = `<div class="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-y-auto h-full pb-20 custom-scrollbar">`;

    players.forEach(p => {
        const health = p.live_stats?.health || [];
        const dmgCount = health.filter(x => x > 0).length;
        const healthText = dmgCount >= 7 ? "INC" : (7 - dmgCount);
        const healthColor = dmgCount >= 7 ? "text-red-600 font-black animate-pulse" : (dmgCount > 3 ? "text-red-400" : "text-green-400");
        const wp = p.live_stats?.willpower || 0;
        const bp = p.live_stats?.blood || 0;

        const now = new Date();
        const lastActive = p.last_active ? new Date(p.last_active) : new Date(0); 
        const diffSeconds = (now - lastActive) / 1000;
        const isOnline = diffSeconds < 90 && p.status !== 'Offline';

        const statusColor = isOnline ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500 opacity-50';
        const statusTitle = isOnline ? 'Online' : `Offline (Last seen: ${lastActive.toLocaleTimeString()})`;
        
        // Check if full sheet data is available
        const hasSheet = !!p.full_sheet;
        const sheetBtnClass = hasSheet 
            ? "text-blue-400 hover:text-white border-blue-900/30 hover:bg-blue-900" 
            : "text-gray-600 border-gray-800 cursor-not-allowed opacity-50";

        html += `
            <div class="bg-[#1a1a1a] border border-[#333] rounded p-3 shadow-lg relative group hover:border-[#d4af37] transition-all flex flex-col justify-between aspect-square">
                <div class="flex justify-between items-start mb-1">
                    <div class="overflow-hidden mr-1 cursor-pointer" onclick="window.stSetWhisperTarget('${p.id}', '${p.character_name}')" title="Click to Whisper">
                        <h3 class="font-bold text-sm text-white truncate w-full font-cinzel text-shadow hover:text-[#d4af37] transition-colors">${p.character_name || "Unknown"}</h3>
                        <div class="text-[10px] text-gray-500 truncate font-mono">${p.player_name || "Player"}</div>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full ${statusColor}" title="${statusTitle}"></div>
                        <button onclick="event.stopPropagation(); window.stRemovePlayer('${p.id}', '${p.character_name}')" class="text-gray-600 hover:text-red-500 text-[10px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Player">
                            <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                </div>

                <div class="flex flex-col justify-center gap-1 flex-1 my-2 text-[10px] font-bold">
                    <div class="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-[#222]">
                        <span class="text-gray-500 uppercase">Health</span>
                        <span class="${healthColor}">${healthText}</span>
                    </div>
                    <div class="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-[#222]">
                        <span class="text-gray-500 uppercase">Willpower</span>
                        <span class="text-blue-300">${wp}</span>
                    </div>
                    <div class="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-[#222]">
                        <span class="text-gray-500 uppercase">Blood</span>
                        <span class="text-red-400">${bp}</span>
                    </div>
                </div>

                <div class="mt-auto flex gap-1">
                    <button class="flex-1 border text-[9px] py-1 uppercase font-bold rounded transition-colors ${sheetBtnClass}" 
                            onclick="${hasSheet ? `window.stViewPlayerSheet('${p.id}')` : ''}" title="${hasSheet ? 'View Sheet' : 'Waiting for Sync...'}">
                        <i class="fas fa-eye"></i> Sheet
                    </button>
                    <button class="flex-1 bg-[#2a0a0a] border border-red-900/30 text-[9px] py-1 text-red-400 hover:text-white hover:bg-red-900 hover:border-red-500 uppercase font-bold rounded transition-colors" onclick="window.stAddToCombat({id:'${p.id}', name:'${p.character_name}'}, 'Player')">
                        <i class="fas fa-swords"></i> Fight
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
                        <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Round</div>
                        <div class="text-3xl font-black text-[#d4af37] leading-none">${turn}</div>
                    </div>
                    <button onclick="window.stNextTurn()" class="bg-[#222] hover:bg-[#333] border border-[#444] text-white px-4 py-2 text-xs font-bold uppercase rounded flex items-center gap-2 transition-colors shadow-sm hover:shadow-[#d4af37]/20">
                        Next Turn <i class="fas fa-step-forward"></i>
                    </button>
                </div>
                <button onclick="window.stEndCombat()" class="text-red-500 hover:text-red-300 text-xs font-bold uppercase border border-red-900/30 px-4 py-2 rounded hover:bg-red-900/10">End Combat</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-black/50 pb-20">
    `;

    if (combatants.length === 0) {
        html += `<div class="text-center text-gray-500 italic mt-10">Waiting for combatants...</div>`;
    } else {
        combatants.forEach(c => {
            const isNPC = c.type === 'NPC';
            const activeClass = c.active ? 'border-[#d4af37] bg-[#2a2a2a] shadow-[0_0_15px_rgba(212,175,55,0.2)] transform scale-[1.01]' : 'border-[#333] bg-[#1a1a1a] opacity-80';
            const activeIndicator = c.active ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-[#d4af37]"></div>` : '';

            html += `
                <div class="${activeClass} p-2 rounded flex items-center justify-between group hover:border-[#555] transition-all relative overflow-hidden">
                    ${activeIndicator}
                    <div class="flex items-center gap-4 flex-1 pl-3">
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
            <div class="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pb-20">
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
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 italic mt-10">Bestiary is empty. Use "Character Creator" -> "NPC" tab to build one, then "Push to Bestiary".</div>`;
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

    // Name is explicitly clickable with hover effect to indicate interaction
    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div class="overflow-hidden">
                <div class="text-[#d4af37] font-bold text-sm truncate cursor-pointer hover:text-white hover:underline transition-colors" title="Click to View Stats" id="card-name-${id||name}">${name}</div>
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
    
    // Attach click listener to the entire card, but ensure propagation is handled in inner buttons
    card.onclick = (e) => { 
        // If clicking buttons inside, don't trigger
        if (e.target.closest('button')) return;
        if(window.openNpcSheet) window.openNpcSheet(npc); 
    };
    
    container.appendChild(card);
}

// --- DELEGATED JOURNAL HELPERS ---
async function pushHandoutToPlayers(id, recipients = null) {
    if (!id) {
        showNotification("No ID to push. Save first.", "error");
        return;
    }
    try {
        const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
        
        const data = { 
            pushed: true, 
            pushTime: Date.now(),
            recipients: recipients 
        };

        await setDoc(doc(db, 'chronicles', stState.activeChronicleId, 'players', safeId), data, { merge: true });
        
        let msg = "Pushed to Players!";
        if (recipients) {
            msg = `Pushed to ${recipients.length} Player(s)`;
        }
        showNotification(msg);
        
    } catch(e) { console.error(e); showNotification("Push failed: " + e.message, "error"); }
}

async function stDeleteJournalEntry(id) {
    if(!confirm("Delete this handout?")) return;
    try {
        const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
        await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'players', safeId));
    } catch(e) { console.error(e); }
}

// --- WRAPPERS ---
function handleAddToCombat(entity, type) {
    if (!stState.activeChronicleId) { showNotification("No active chronicle.", "error"); return; }
    if (!entity.health) entity.health = { damage: 0, track: [0,0,0,0,0,0,0] };
    addCombatant(entity, type);
    showNotification(`${entity.name} added to Combat`);
}

window.copyStaticNpc = async function(name) {
    let found = null;
    for (const cat in BESTIARY) { 
        if (BESTIARY[cat][name]) {
            found = { ...BESTIARY[cat][name] }; 
            break;
        }
    }

    if (found && stState.activeChronicleId) { 
        const newId = "npc_" + Date.now();
        const customName = `${found.name} (Copy)`;

        try {
            await setDoc(doc(db, 'chronicles', stState.activeChronicleId, 'bestiary', newId), {
                name: customName,
                type: "Custom",
                data: { ...found, name: customName, template: 'bestiary' } // Force bestiary template
            });
            showNotification(`Created customizable copy: ${customName}`);
        } catch(e) {
            console.error("Copy Failed", e);
            showNotification("Failed to copy NPC.", "error");
        }
    }
};

window.deleteCloudNpc = async function(id) {
    if(!confirm("Delete?")) return;
    try { 
        await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'bestiary', id)); 
        showNotification("Deleted."); 
    } catch(e) {}
};

window.editCloudNpc = function(id) {
    const entry = stState.bestiary[id];
    if(entry && entry.data && window.openNpcCreator) {
        // Force Bestiary mode if template is bestiary
        const type = entry.data.template || 'mortal'; 
        // If it was a copy, it should be bestiary template.
        window.openNpcCreator(type, entry.data, null, id);
        showNotification("Editing NPC...");
        exitStorytellerDashboard(); 
    }
}

window.previewStaticNpc = function(category, key) {
    const npc = BESTIARY[category][key];
    const grid = document.getElementById('bestiary-grid');
    if (grid && npc) {
        grid.innerHTML = '';
        renderNpcCard({ data: npc, name: key, type: npc.template }, null, false, grid);
    }
};

// --- CHAT RENDERING: DELEGATED TO CHAT MODEL (VIEW) ---
function renderChatView(container) {
    let playerOptions = '';
    Object.entries(stState.players).forEach(([id, p]) => {
        if (p.character_name) {
            playerOptions += `
            <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer">
                <input type="checkbox" class="st-recipient-checkbox accent-[#d4af37]" value="${id}">
                <span class="text-xs text-gray-300">${p.character_name} (${p.player_name || 'Player'})</span>
            </label>`;
        }
    });

    // MOODS LIST
    const moodOptions = `
        <option value="">Mood (Optional)</option>
        <option value="Angrily">Angrily</option>
        <option value="Sadness">Sadness</option>
        <option value="Pained">Pained</option>
        <option value="Whispering">Whispering</option>
        <option value="Shouting">Shouting</option>
        <option value="Joyful">Joyful</option>
        <option value="Sarcastic">Sarcastic</option>
        <option value="Fearful">Fearful</option>
        <option value="Serious">Serious</option>
        <option value="Joking">Joking</option>
    `;

    container.innerHTML = `
        <div class="flex flex-col h-full relative">
            <!-- TOOLBAR -->
            <div class="bg-[#1a1a1a] border-b border-[#333] p-2 flex justify-between items-center">
                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                    <i class="fas fa-history"></i> History
                </div>
                <div class="flex gap-2">
                    <button onclick="window.stExportChat()" class="text-xs bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] px-3 py-1 rounded uppercase font-bold transition-colors" title="Download Log">
                        <i class="fas fa-download mr-1"></i> Export
                    </button>
                    <button onclick="window.stClearChat()" class="text-xs bg-red-900/20 hover:bg-red-900/50 text-red-500 border border-red-900/50 px-3 py-1 rounded uppercase font-bold transition-colors" title="Delete All Messages">
                        <i class="fas fa-trash-alt mr-1"></i> Clear
                    </button>
                </div>
            </div>

            <!-- Messages -->
            <div id="st-chat-history" class="flex-1 overflow-y-auto p-4 space-y-3 font-serif bg-[#080808]">
                <div class="text-center text-gray-600 text-xs italic mt-4">Loading history...</div>
            </div>
            
            <!-- Input Area -->
            <div class="p-4 bg-[#111] border-t border-[#333] space-y-2 relative">
                <!-- Multi-Select Recipient Dropdown -->
                <div class="flex gap-2 mb-2">
                    <div class="relative">
                        <button id="st-chat-recipient-btn" class="bg-[#050505] border border-[#333] text-gray-300 text-xs px-3 py-2 text-left flex items-center gap-2 hover:border-[#d4af37] transition-colors min-w-[140px]" onclick="document.getElementById('st-chat-recipients-dropdown').classList.toggle('hidden')">
                            <span id="st-chat-recipient-label">Everyone</span>
                            <i class="fas fa-chevron-down text-[10px] ml-auto"></i>
                        </button>
                        
                        <div id="st-chat-recipients-dropdown" class="hidden absolute bottom-full left-0 w-64 bg-[#1a1a1a] border border-[#333] shadow-xl p-2 max-h-48 overflow-y-auto custom-scrollbar z-50 mb-1">
                            <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer border-b border-[#333] mb-1 pb-1">
                                <input type="checkbox" id="st-chat-all-checkbox" class="accent-[#d4af37]" checked>
                                <span class="text-xs text-gold font-bold">Broadcast to Everyone</span>
                            </label>
                            <div id="st-chat-player-list" class="space-y-1">
                                ${playerOptions}
                            </div>
                        </div>
                    </div>

                    <!-- Mood Selector -->
                    <div class="relative flex-1">
                         <input list="st-mood-list" id="st-chat-mood" class="w-full bg-[#050505] border border-[#333] text-gray-300 text-xs px-3 py-2 outline-none focus:border-[#d4af37]" placeholder="Mood (Optional)">
                         <datalist id="st-mood-list">${moodOptions}</datalist>
                    </div>
                </div>

                <!-- Message Input -->
                <div class="flex gap-2">
                    <input type="text" id="st-chat-input" placeholder="Enter message..." class="flex-1 bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none">
                    <button id="st-chat-send" class="bg-[#d4af37] text-black font-bold uppercase px-6 py-2 hover:bg-[#fcd34d]">Send</button>
                    
                    <!-- Announce Button -->
                    <button onclick="window.stSendEvent()" class="bg-[#222] border border-[#d4af37] text-[#d4af37] font-bold px-3 py-2 text-xs uppercase hover:bg-[#333] hover:text-white transition-colors" title="Send as Major Event Announcement">
                        <i class="fas fa-bullhorn"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Bind ST Inputs
    const sendBtn = document.getElementById('st-chat-send');
    const input = document.getElementById('st-chat-input');
    const moodInput = document.getElementById('st-chat-mood');
    const allCheck = document.getElementById('st-chat-all-checkbox');
    const label = document.getElementById('st-chat-recipient-label');
    const dropdown = document.getElementById('st-chat-recipients-dropdown');
    
    // Auto-update label and checkboxes
    const updateSelection = () => {
        const checks = document.querySelectorAll('.st-recipient-checkbox');
        if (allCheck.checked) {
            checks.forEach(c => { c.checked = false; c.disabled = true; });
            label.innerText = "Everyone";
            label.className = "text-gray-300 text-xs";
        } else {
            checks.forEach(c => c.disabled = false);
            const selected = Array.from(checks).filter(c => c.checked);
            if (selected.length === 0) {
                label.innerText = "Select Recipients..."; 
                label.className = "text-red-500 font-bold text-xs";
            } else {
                label.innerText = `Whisper (${selected.length})`;
                label.className = "text-purple-400 font-bold text-xs";
            }
        }
    };

    allCheck.onchange = updateSelection;
    document.querySelectorAll('.st-recipient-checkbox').forEach(c => c.onchange = updateSelection);

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        const btn = document.getElementById('st-chat-recipient-btn');
        const menu = document.getElementById('st-chat-recipients-dropdown');
        if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
    
    const sendHandler = () => {
        const txt = input.value.trim();
        if (txt) {
            const isAll = allCheck.checked;
            const selected = Array.from(document.querySelectorAll('.st-recipient-checkbox:checked')).map(c => c.value);
            const moodVal = moodInput.value.trim();
            
            if (!isAll && selected.length === 0) {
                showNotification("Select at least one recipient.", "error");
                return;
            }

            const options = {};
            if (!isAll) {
                options.recipients = selected;
                options.isWhisper = true;
            }
            if (moodVal) {
                options.mood = moodVal;
            }
            
            sendChronicleMessage('chat', txt, null, options);
            input.value = '';
            moodInput.value = ''; // Clear mood after send? Usually better UX to keep context, but let's clear to avoid accidents.
            dropdown.classList.add('hidden');
        }
    };

    if(sendBtn) sendBtn.onclick = sendHandler;
    if(input) input.onkeydown = (e) => { if(e.key === 'Enter') sendHandler(); };

    // Force refresh list immediately if data exists
    startChatListener(stState.activeChronicleId);
}

// --- AUTO-CREATION HELPER ---
function ensureChronicleTabContainer() {
    let container = document.getElementById('play-mode-chronicle');
    
    if (!container) {
        const parent = document.getElementById('play-mode-sheet');
        if (parent) {
            container = document.createElement('div');
            container.id = 'play-mode-chronicle';
            parent.appendChild(container);
        }
    }
    
    if (container) {
        container.classList.remove('h-full', 'min-h-[75vh]', 'overflow-y-auto'); 
        container.classList.add('w-full', 'overflow-hidden');
        container.style.height = 'calc(100vh - 140px)'; 
    }
}
