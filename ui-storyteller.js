import { 
    db, auth, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc, appId
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { 
    initCombatTracker, startCombat, endCombat, nextTurn, 
    removeCombatant, updateInitiative, rollNPCInitiative
} from "./combat-tracker.js";

import { initChatSystem, startChatListener, sendChronicleMessage } from "./chat-model.js";

// --- MISSING IMPORTS ---
import { renderCoterieMap } from "./coterie-map.js";
import { renderStorytellerJournal } from "./ui-journal.js";

// Import view implementations from the companion file
import {
    renderRosterView, renderCombatView, renderBestiaryView, renderChatView, renderSettingsView,
    stViewPlayerSheet, returnToStoryteller, stViewCombatantSheet, stToggleCombatVisibility,
    stOpenCombatVisibilityModal, handleAddToCombat, copyStaticNpc, deleteCloudNpc, editCloudNpc,
    previewStaticNpc, pushHandoutToPlayers, stDeleteJournalEntry, stSaveSettings, stSaveLocalPrefs,
    stAnnounceTime 
} from "./st-dashboard-views.js";

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
    window.handleLeaveChronicle = handleLeaveChronicle; 
    window.disconnectChronicle = disconnectChronicle;
    window.switchStorytellerView = switchStorytellerView;
    window.renderStorytellerDashboard = renderStorytellerDashboard;
    window.exitStorytellerDashboard = exitStorytellerDashboard;
    
    // Settings Actions (Implemented in views file)
    window.stSaveSettings = stSaveSettings;
    window.stSaveLocalPrefs = stSaveLocalPrefs; 
    window.stAnnounceTime = stAnnounceTime; 

    // Bestiary Actions (Implemented in views file)
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
    window.stViewCombatantSheet = stViewCombatantSheet; 
    window.stToggleCombatVisibility = stToggleCombatVisibility;
    window.stOpenCombatVisibilityModal = stOpenCombatVisibilityModal;

    // Journal Bindings
    window.stPushHandout = pushHandoutToPlayers;
    window.stDeleteJournalEntry = stDeleteJournalEntry;
    
    // Roster Management
    window.stRemovePlayer = (id, name) => {
        const uid = id || Object.keys(stState.players).find(k => stState.players[k].character_name === name);
        if (uid) stRemovePlayer(uid, name);
    };
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
        <div id="st-campaign-list" class="mb-4 hidden"></div>
        <div id="pl-joined-list" class="mb-6 hidden"></div>
        
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

    // 1. Resume Logic (Last used session)
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
                
                // UPDATED: Resume button for player now forces Join UI for password entry
                const resumeAction = recentRole === 'ST' 
                    ? `window.handleResumeChronicle('${recentId}', 'ST')` 
                    : `window.renderJoinChronicleUI('${recentId}')`;

                const resumeHtml = `
                    <div class="mb-6 p-4 bg-[#111] border border-[#333] flex justify-between items-center animate-in fade-in">
                        <div>
                            <div class="text-[10px] text-gray-500 uppercase font-bold">Resume Last Session</div>
                            <div class="text-white font-bold font-cinzel text-lg">${displayName}</div>
                            <div class="text-[9px] text-gray-400">${roleLabel}</div>
                        </div>
                        <button onclick="${resumeAction}" class="px-4 py-2 border rounded uppercase font-bold text-xs ${btnColor}">
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

    // 2. Storyteller Campaigns
    const listDiv = document.getElementById('st-campaign-list');
    if (listDiv) {
        try {
            const q = query(collection(db, 'chronicles'), where("storyteller_uid", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                let html = `<h4 class="text-[10px] text-gray-500 uppercase font-bold mb-2">My Campaigns (ST)</h4><div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">`;
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

    // 3. Player Joined Chronicles
    const plListDiv = document.getElementById('pl-joined-list');
    if (plListDiv) {
        try {
            const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'joined_chronicles'));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                let html = `<h4 class="text-[10px] text-gray-500 uppercase font-bold mb-2 mt-4">Joined Stories (Player)</h4><div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">`;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    html += `
                        <div class="flex justify-between items-center bg-[#1a1a1a] p-3 border-l-2 border-blue-900 hover:bg-[#222] cursor-pointer group transition-colors relative">
                            <!-- UPDATED: Rejoining from list now opens Join UI to require password -->
                            <div class="flex-1" onclick="window.renderJoinChronicleUI('${doc.id}')">
                                <div class="text-white font-bold text-sm font-cinzel group-hover:text-blue-400 transition-colors">${data.name}</div>
                                <div class="text-[9px] text-gray-600 font-mono group-hover:text-white">${doc.id}</div>
                            </div>
                            <button onclick="event.stopPropagation(); window.handleLeaveChronicle('${doc.id}')" class="text-gray-600 hover:text-red-500 p-2 z-10 transition-colors" title="Remove from list">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;
                });
                html += `</div>`;
                plListDiv.innerHTML = html;
                plListDiv.classList.remove('hidden');
            }
        } catch (e) {
            console.error("Error loading joined list:", e);
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

async function handleLeaveChronicle(id) {
    if (!confirm("Remove this story from your list? (Does not delete character)")) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'joined_chronicles', id));
        showNotification("Removed from list.");
        renderChronicleMenu();
    } catch (e) {
        console.error("Leave Error:", e);
    }
}

// UPDATED: Now accepts an optional chronicleId to pre-fill the form
function renderJoinChronicleUI(prefillId = "") {
    const container = document.getElementById('chronicle-modal-content');
    if(!container) return;

    container.innerHTML = `
        <h2 class="heading text-xl text-[#d4af37] mb-4 border-b border-[#333] pb-2">Join Chronicle</h2>
        <div class="space-y-4 max-w-md mx-auto">
            <div>
                <label class="label-text text-gray-400">Chronicle ID (Ask your ST)</label>
                <input type="text" id="join-id" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none font-mono text-center tracking-widest uppercase" placeholder="XXXX-XXXX" value="${prefillId}">
            </div>
            
            <div id="join-preview" class="hidden bg-[#111] p-4 border border-[#d4af37] text-center space-y-2">
                <div class="text-[#d4af37] font-cinzel font-bold text-lg" id="preview-name"></div>
                <div class="text-[10px] text-gray-400 uppercase tracking-widest" id="preview-time"></div>
                <div class="text-xs text-gray-300 italic font-serif" id="preview-synopsis"></div>
            </div>

            <div>
                <label class="label-text text-gray-400">Passcode (Enter to Connect)</label>
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
    const triggerPreview = async (val) => {
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
    };

    input.addEventListener('input', (e) => triggerPreview(e.target.value.trim()));
    if(prefillId) triggerPreview(prefillId);
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

        // PERSIST STORY TO PLAYER'S LIST
        const userJoinedRef = doc(db, 'artifacts', appId, 'users', user.uid, 'joined_chronicles', idInput);
        await setDoc(userJoinedRef, {
            name: data.name,
            joined_at: new Date().toISOString()
        });

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
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const docRef = doc(db, 'chronicles', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            showNotification("Chronicle no longer exists.", "error");
            localStorage.removeItem('v20_last_chronicle_id');
            deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'joined_chronicles', id)).catch(() => {});
            renderChronicleMenu();
            return;
        }
        
        const data = docSnap.data();
        stState.settings = data;

        localStorage.setItem('v20_last_chronicle_id', id);
        localStorage.setItem('v20_last_chronicle_name', data.name);
        localStorage.setItem('v20_last_chronicle_role', role);

        if (role === 'ST') {
            if (data.storyteller_uid !== user.uid) {
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
            // Note: For rejoining as a player, the UI now redirects to Password entry.
            // This fallback remains for auto-resume logic on startup.
            const playerRef = doc(db, 'chronicles', id, 'players', user.uid);
            
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

    const chronRef = doc(db, 'chronicles', chronicleId);
    stState.listeners.push(onSnapshot(chronRef, (snap) => {
        if (snap.exists()) {
            stState.settings = snap.data();
            if (stState.dashboardActive && stState.currentView === 'settings') {
                renderSettingsView(document.getElementById('st-viewport'));
            }
        }
    }));
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

    const chronRef = doc(db, 'chronicles', stState.activeChronicleId);
    stState.listeners.push(onSnapshot(chronRef, (snap) => {
        if (snap.exists()) {
            stState.settings = snap.data();
            if (stState.dashboardActive && stState.currentView === 'settings') {
                renderSettingsView(document.getElementById('st-viewport'));
            }
        }
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
            <div class="flex justify-between items-center bg-[#111] p-4 border-b border-[#333] shrink-0">
                <div>
                    <h2 class="text-xl font-cinzel text-red-500 font-bold tracking-widest uppercase">Storyteller Mode</h2>
                    <div class="text-gray-400 font-mono text-xs select-all cursor-pointer mt-1" title="Click to copy">Chronicle ID: <span class="text-white">${stState.activeChronicleId}</span></div>
                </div>
                <div class="flex gap-4">
                    <button onclick="window.exitStorytellerDashboard()" class="text-gray-400 hover:text-white text-xs uppercase font-bold px-3 py-1 border border-transparent hover:border-[#444] rounded transition-colors">Character Creator</button>
                    <button onclick="window.disconnectChronicle()" class="text-red-500 hover:text-red-300 text-xs uppercase font-bold px-3 py-1 border border-red-900/50 hover:bg-red-900/20 rounded transition-colors">Disconnect</button>
                </div>
            </div>

            <div class="flex bg-[#111] border-b border-[#333] px-4 shrink-0 overflow-x-auto no-scrollbar">
                <button class="st-tab active px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#d4af37] border-b-2 border-[#d4af37] hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('roster')">
                    <i class="fas fa-users mr-2"></i> Roster
                </button>
                <button class="st-tab px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-[#222] transition-colors whitespace-nowrap" onclick="window.switchStorytellerView('coterie')">
                    <i class="fas fa-project-diagram mr-2"></i> Relationship Map
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

            <div id="st-viewport" class="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
            </div>
            
            <div id="st-combat-vis-modal" class="fixed inset-0 bg-black/80 z-[1000] hidden flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-[#1a1a1a] border border-[#d4af37] p-6 max-w-sm w-full shadow-2xl relative">
                    <h3 class="text-lg text-gold font-cinzel font-bold mb-4 border-b border-[#333] pb-2 uppercase">Targeted Visibility</h3>
                    <input type="hidden" id="st-combat-vis-id">
                    
                    <div class="text-[10px] text-gray-500 font-bold uppercase mb-2">Hide from specific players:</div>
                    <div id="st-combat-vis-player-list" class="space-y-1 max-h-48 overflow-y-auto mb-4 custom-scrollbar border border-[#333] bg-[#050505] p-2 rounded">
                    </div>
                    
                    <div class="flex justify-between gap-2 border-t border-[#333] pt-4">
                        <button onclick="document.getElementById('st-combat-vis-modal').classList.add('hidden')" class="text-gray-500 hover:text-white text-xs uppercase font-bold px-4 py-2 border border-transparent hover:border-[#444]">Cancel</button>
                        <button id="st-combat-vis-save" class="bg-[#d4af37] text-black px-6 py-2 text-xs uppercase font-bold hover:bg-[#fcd34d] shadow-lg">Save Selection</button>
                    </div>
                </div>
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
    else if (view === 'coterie') renderCoterieMap(viewport);
    else if (view === 'combat') renderCombatView();
    else if (view === 'bestiary') renderBestiaryView();
    else if (view === 'journal') {
        if(renderStorytellerJournal) renderStorytellerJournal(viewport);
    }
    else if (view === 'chat') renderChatView(viewport);
    else if (view === 'settings') renderSettingsView(viewport);
}
