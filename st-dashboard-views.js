import { 
    db, doc, deleteDoc, updateDoc, setDoc, arrayUnion, arrayRemove, addDoc, collection, writeBatch
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { combatState, startCombat, endCombat, nextTurn, addCombatant, removeCombatant, toggleRerollInit, rollAllNPCInitiatives } from "./combat-tracker.js";
import { BESTIARY } from "./bestiary-data.js";
import { refreshChatUI, sendChronicleMessage, stClearChat, stExportChat } from "./chat-model.js";
import { renderDots } from "./ui-common.js";

// We access stState via the global window object to avoid circular dependencies
// stState is initialized in ui-storyteller.js

// ==========================================================================
// 1. ROSTER VIEW
// ==========================================================================

export function renderRosterView() {
    const container = document.getElementById('st-viewport');
    if (!container) return;

    const players = window.stState.players || {};
    const playerIds = Object.keys(players);

    if (playerIds.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-users-slash text-6xl mb-4 opacity-30"></i>
                <p class="text-lg">The chronicle is empty.</p>
                <p class="text-xs">Share the Chronicle ID with your players to begin.</p>
            </div>`;
        return;
    }

    let html = `<div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full pb-20 custom-scrollbar">`;

    playerIds.forEach(uid => {
        const p = players[uid];
        if (!p) return;
        
        // Metadata
        const charName = p.character_name || "Unknown Kindred";
        const lastActive = p.last_active ? new Date(p.last_active) : null;
        const now = new Date();
        const isOnline = lastActive && (now - lastActive) < 300000; // 5 mins
        const statusColor = isOnline ? "bg-green-500 shadow-[0_0_8px_lime]" : "bg-red-900 border border-red-600";
        
        // Live Stats
        const stats = p.live_stats || {};
        const hpStates = stats.health || [0,0,0,0,0,0,0];
        const dmgCount = hpStates.filter(x => x > 0).length;
        const wp = stats.willpower || 0;
        const bp = stats.blood || 0;

        // Health Bar Visual
        let hpBar = `<div class="flex gap-0.5 mt-1">`;
        hpStates.forEach(s => {
            let color = "bg-gray-800";
            if (s === 1) color = "bg-green-600"; // Bashing
            if (s === 2) color = "bg-yellow-600"; // Lethal
            if (s === 3) color = "bg-red-600"; // Agg
            hpBar += `<div class="w-3 h-3 rounded-full ${color} border border-black"></div>`;
        });
        hpBar += `</div>`;

        html += `
            <div class="bg-[#111] border border-[#333] rounded-lg p-4 shadow-lg hover:border-[#d4af37] transition-all group relative">
                <div class="absolute top-3 right-3 flex gap-2">
                    <div class="w-2 h-2 rounded-full ${statusColor}" title="${isOnline ? 'Online' : 'Offline'}"></div>
                </div>
                
                <h3 class="text-lg font-cinzel font-bold text-white mb-1 truncate pr-6">${charName}</h3>
                <div class="text-[9px] text-gray-500 font-mono mb-4 uppercase tracking-widest">UID: ${uid.substring(0,6)}...</div>
                
                <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
                    <div>
                        <div class="text-gray-500 font-bold uppercase text-[9px]">Status</div>
                        <div class="flex flex-col gap-1 mt-1">
                            <div class="flex justify-between"><span class="text-blue-400 font-bold">WP</span> <span class="text-white">${wp}</span></div>
                            <div class="flex justify-between"><span class="text-red-500 font-bold">BP</span> <span class="text-white">${bp}</span></div>
                        </div>
                    </div>
                    <div>
                        <div class="text-gray-500 font-bold uppercase text-[9px]">Health</div>
                        ${hpBar}
                        <div class="text-[9px] text-gray-400 mt-1 text-right">${dmgCount >= 7 ? 'INCAPACITATED' : (dmgCount === 0 ? 'Healthy' : 'Injured')}</div>
                    </div>
                </div>

                <div class="flex gap-2 border-t border-[#333] pt-3">
                    <button onclick="window.stViewPlayerSheet('${uid}')" class="flex-1 bg-[#222] hover:bg-[#333] text-gray-300 text-[10px] font-bold py-2 rounded uppercase border border-[#444] hover:border-white transition-colors">
                        <i class="fas fa-eye mr-1"></i> View Sheet
                    </button>
                    <button onclick="window.initWhisper('${uid}', '${charName.replace(/'/g, "\\'")}')" class="bg-[#222] hover:bg-[#333] text-blue-400 border border-[#444] w-8 rounded flex items-center justify-center" title="Whisper">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button onclick="window.stRemovePlayer('${uid}')" class="bg-[#1a0505] hover:bg-red-900 text-red-500 border border-red-900/50 w-8 rounded flex items-center justify-center" title="Kick Player">
                        <i class="fas fa-ban"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

export async function stRemovePlayer(uid) {
    if (!confirm("Remove this player from the chronicle?")) return;
    try {
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'players', uid));
        showNotification("Player Removed.");
    } catch(e) {
        console.error(e);
        showNotification("Error removing player", "error");
    }
}

export function stViewPlayerSheet(uid) {
    const p = window.stState.players[uid];
    if (!p || !p.full_sheet) {
        showNotification("Sheet data unavailable.", "error");
        return;
    }

    // 1. Backup ST State (so we can restore dashboard)
    window.stState.tempStorytellerBackup = {
        scrollPos: window.scrollY,
        view: window.stState.currentView
    };

    // 2. Hide Dashboard
    document.getElementById('st-dashboard-view').classList.add('hidden');
    document.getElementById('st-dashboard-btn').classList.add('hidden'); // Hide ST button temporarily

    // 3. Inject "Return to ST Mode" Button
    let returnBtn = document.getElementById('st-return-btn');
    if (!returnBtn) {
        returnBtn = document.createElement('button');
        returnBtn.id = 'st-return-btn';
        returnBtn.className = "fixed bottom-6 right-6 z-[9999] bg-[#d4af37] text-black w-14 h-14 rounded-full shadow-2xl border-2 border-white hover:scale-110 transition-transform flex items-center justify-center font-bold animate-bounce";
        returnBtn.innerHTML = `<i class="fas fa-crown text-xl"></i>`;
        returnBtn.title = "Return to Storyteller Dashboard";
        returnBtn.onclick = returnToStoryteller;
        document.body.appendChild(returnBtn);
    }
    returnBtn.classList.remove('hidden');

    // 4. Load Player Data into Main UI
    // We override window.state temporarily
    window.stState.originalState = JSON.parse(JSON.stringify(window.state)); 
    
    // Load logic similar to firebase-manager.js loadSelectedChar
    window.state = JSON.parse(JSON.stringify(p.full_sheet));
    
    // Force View Mode
    window.state.isPlayMode = true; 
    
    if (window.fullRefresh) window.fullRefresh();
    showNotification(`Viewing ${p.character_name}`);
}

export function returnToStoryteller() {
    // 1. Restore Original State
    if (window.stState.originalState) {
        window.state = window.stState.originalState;
        window.stState.originalState = null;
    }

    // 2. Hide Return Button
    const returnBtn = document.getElementById('st-return-btn');
    if (returnBtn) returnBtn.classList.add('hidden');

    // 3. Show Dashboard
    document.getElementById('st-dashboard-view').classList.remove('hidden');
    document.getElementById('st-dashboard-btn').classList.remove('hidden');

    // 4. Refresh UI to ST's own sheet (in background)
    if (window.fullRefresh) window.fullRefresh();
    
    // 5. Restore View
    if (window.renderStorytellerDashboard) window.renderStorytellerDashboard();
}

// ==========================================================================
// 2. COMBAT VIEW
// ==========================================================================

export function renderCombatView() {
    const container = document.getElementById('st-viewport');
    if (!container) return;

    if (!combatState.isActive) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-peace text-6xl mb-4 opacity-30"></i>
                <p class="mb-4">No active combat encounter.</p>
                <button onclick="window.stStartCombat()" class="bg-[#8b0000] text-white px-6 py-3 rounded font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg">
                    Start Combat
                </button>
            </div>`;
        return;
    }

    let html = `
        <div class="flex flex-col h-full">
            <!-- Combat Toolbar -->
            <div class="bg-[#1a1a1a] p-3 border-b border-[#333] flex justify-between items-center shrink-0">
                <div class="flex gap-4 items-center">
                    <div class="text-center bg-[#050505] px-3 py-1 border border-[#333] rounded">
                        <div class="text-[9px] text-gray-500 uppercase font-bold">Round</div>
                        <div class="text-xl font-black text-[#d4af37] leading-none">${combatState.turn}</div>
                    </div>
                    <div>
                        <div class="text-sm text-white font-bold uppercase tracking-widest">${combatState.phase === 'declare' ? 'Declaration Phase' : 'Action Phase'}</div>
                        <div class="text-[10px] text-gray-400">Order: ${combatState.phase === 'declare' ? 'Lowest Init First' : 'Highest Init First'}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.combatTracker.toggleReroll()" class="text-[10px] px-3 py-2 border border-[#333] rounded uppercase font-bold hover:bg-[#333] ${combatState.rerollInitiative ? 'text-green-400' : 'text-gray-500'}">
                        <i class="fas fa-sync-alt mr-1"></i> Reroll: ${combatState.rerollInitiative ? 'ON' : 'OFF'}
                    </button>
                    <button onclick="window.combatTracker.rollAllNPCs()" class="bg-[#d97706] hover:bg-yellow-600 text-white text-[10px] font-bold px-3 py-2 rounded uppercase">
                        <i class="fas fa-dice-d10 mr-1"></i> Roll NPCs
                    </button>
                    <button onclick="window.stNextTurn()" class="bg-[#2563eb] hover:bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded uppercase shadow-lg">
                        Next Step <i class="fas fa-step-forward ml-1"></i>
                    </button>
                    <button onclick="window.stEndCombat()" class="bg-[#1a0505] hover:bg-red-900 text-red-500 border border-red-900/50 text-[10px] font-bold px-3 py-2 rounded uppercase ml-2">
                        End
                    </button>
                </div>
            </div>

            <!-- Combat List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#0a0a0a]">
                <div class="grid grid-cols-12 gap-2 text-[9px] uppercase font-bold text-gray-500 border-b border-[#333] pb-1 px-2">
                    <div class="col-span-1 text-center">Init</div>
                    <div class="col-span-4">Name / Type</div>
                    <div class="col-span-3 text-center">Status</div>
                    <div class="col-span-2 text-center">HP</div>
                    <div class="col-span-2 text-right">Actions</div>
                </div>
    `;

    // SORTING FOR DISPLAY
    // V20: Declaration = Lowest to Highest. Action = Highest to Lowest.
    // However, ST usually wants to see the list in Initiative Order (High to Low) always for clarity
    // So we stick to combatState.combatants order which is sorted Descending by default in tracker
    
    combatState.combatants.forEach(c => {
        const isActive = c.id === combatState.activeCombatantId;
        const rowClass = isActive ? "bg-[#2a2a2a] border-[#d4af37]" : "bg-[#111] border-[#333]";
        const nameColor = c.type === 'Player' ? "text-white" : "text-[#d4af37]";
        
        // Visibility Icon
        let visIcon = '<i class="fas fa-eye text-gray-500"></i>';
        if (c.hidden === true) visIcon = '<i class="fas fa-eye-slash text-red-500"></i>';
        else if (Array.isArray(c.hidden)) visIcon = '<i class="fas fa-low-vision text-yellow-500"></i>';

        // Health Display
        let hpDisplay = "N/A";
        if (c.health) {
            const track = c.health.track || [];
            const dmg = track.filter(x => x > 0).length || c.health.damage || 0;
            let hpColor = "text-green-500";
            if (dmg > 3) hpColor = "text-yellow-500";
            if (dmg > 6) hpColor = "text-red-500 font-bold";
            hpDisplay = `<span class="${hpColor}">${dmg}/7</span>`;
        }

        html += `
            <div class="${rowClass} border rounded p-2 grid grid-cols-12 gap-2 items-center transition-colors group">
                <div class="col-span-1 text-center relative">
                    <input type="number" value="${c.init}" 
                        onchange="window.stUpdateInit('${c.id}', this.value)" 
                        class="w-full bg-black/50 border border-[#444] text-center text-[#d4af37] font-bold text-sm rounded focus:border-[#d4af37] outline-none">
                    ${c.type === 'NPC' ? `<button onclick="window.stRollInit('${c.id}')" class="absolute -top-1 -right-1 text-[8px] text-gray-500 hover:text-white" title="Roll Init"><i class="fas fa-dice"></i></button>` : ''}
                </div>
                
                <div class="col-span-4 flex flex-col justify-center">
                    <div class="font-bold text-sm ${nameColor} truncate flex items-center gap-2">
                        ${c.name}
                        ${isActive ? '<span class="text-[8px] bg-[#d4af37] text-black px-1 rounded uppercase animate-pulse">Active</span>' : ''}
                    </div>
                    <div class="text-[9px] text-gray-500 uppercase flex gap-2">
                        <span>${c.type}</span>
                    </div>
                </div>

                <div class="col-span-3 text-center">
                    <select onchange="window.combatTracker.setStatus('${c.id}', this.value)" class="bg-black/30 border border-[#444] text-[10px] text-gray-300 rounded w-full text-center outline-none focus:border-[#d4af37]">
                        <option value="pending" ${c.status==='pending'?'selected':''}>Pending</option>
                        <option value="declaring" ${c.status==='declaring'?'selected':''}>Declaring</option>
                        <option value="acting" ${c.status==='acting'?'selected':''}>Acting</option>
                        <option value="defending" ${c.status==='defending'?'selected':''}>Defending</option>
                        <option value="held" ${c.status==='held'?'selected':''}>Held</option>
                        <option value="done" ${c.status==='done'?'selected':''}>Done</option>
                    </select>
                </div>

                <div class="col-span-2 text-center text-xs font-mono">
                    ${hpDisplay}
                </div>

                <div class="col-span-2 flex justify-end gap-1">
                    <button onclick="window.stToggleCombatVisibility('${c.id}')" class="p-1 text-gray-500 hover:text-white" title="Toggle Visibility">${visIcon}</button>
                    ${c.type === 'NPC' ? 
                        `<button onclick="window.stViewCombatantSheet('${c.id}')" class="p-1 text-blue-400 hover:text-white" title="View/Edit Stats"><i class="fas fa-file-alt"></i></button>` 
                        : ''}
                    <button onclick="window.stRemoveCombatant('${c.id}')" class="p-1 text-red-500 hover:text-red-300" title="Remove"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

// ST Actions
export function stToggleCombatVisibility(id) {
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    
    // Toggle logic: If fully visible -> Hidden. If hidden -> Visible. 
    // For specific (array), go to Hidden.
    let newVal = true; // Default to hide
    if (c.hidden === true) newVal = false; // Unhide
    
    window.combatTracker.setHidden(id, newVal);
}

export function stOpenCombatVisibilityModal(id) {
    // Populate modal with players to hide from
    const modal = document.getElementById('st-combat-vis-modal');
    const list = document.getElementById('st-combat-vis-player-list');
    const hiddenInput = document.getElementById('st-combat-vis-id');
    
    if(!modal || !list) return;
    
    hiddenInput.value = id;
    list.innerHTML = '';
    
    const players = window.stState.players || {};
    const c = combatState.combatants.find(x => x.id === id);
    const currentHidden = Array.isArray(c.hidden) ? c.hidden : [];

    Object.entries(players).forEach(([uid, p]) => {
        if (!p.metadataType) { // Filter out journal entries
            const isChecked = currentHidden.includes(uid);
            list.innerHTML += `
                <label class="flex items-center gap-2 p-2 hover:bg-[#222] rounded cursor-pointer">
                    <input type="checkbox" class="st-vis-check accent-[#d4af37]" value="${uid}" ${isChecked ? 'checked' : ''}>
                    <span class="text-xs text-gray-300">${p.character_name}</span>
                </label>
            `;
        }
    });
    
    document.getElementById('st-combat-vis-save').onclick = () => {
        const checked = Array.from(document.querySelectorAll('.st-vis-check:checked')).map(cb => cb.value);
        let finalVal = false;
        if (checked.length > 0) finalVal = checked;
        
        window.combatTracker.setHidden(id, finalVal);
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

export function stViewCombatantSheet(id) {
    const c = combatState.combatants.find(x => x.id === id);
    if (!c || c.type !== 'NPC') return;
    
    // Determine data source
    let data = null;
    
    // Check Cloud Bestiary
    if (c.sourceId && window.stState.bestiary && window.stState.bestiary[c.sourceId]) {
        data = window.stState.bestiary[c.sourceId].data;
    }
    // Check Static Bestiary
    else if (c.sourceId) {
        // Try to find by name match in static
        for (const cat in BESTIARY) {
            if (BESTIARY[cat][c.name]) { data = BESTIARY[cat][c.name]; break; }
        }
    }
    
    if (data) {
        // Use NPC Sheet logic
        if(window.openNpcSheet) window.openNpcSheet(data, null, true); // true = readonly mode
    } else {
        showNotification("NPC Data not found.", "error");
    }
}

// ==========================================================================
// 3. BESTIARY VIEW
// ==========================================================================

export function renderBestiaryView() {
    const container = document.getElementById('st-viewport');
    if (!container) return;

    // Merge Static and Custom
    const cloudNPCs = window.stState.bestiary || {};
    
    let html = `
        <div class="flex flex-col h-full">
            <div class="bg-[#111] p-3 border-b border-[#333] flex gap-2 shrink-0">
                <input type="text" id="st-bestiary-search" placeholder="Search Bestiary..." class="flex-1 bg-[#050505] border border-[#333] text-white p-2 text-xs focus:border-[#d4af37] outline-none">
                <button onclick="window.openNpcCreator('ghoul')" class="bg-[#d4af37] text-black font-bold uppercase text-[10px] px-3 py-2 hover:bg-[#fcd34d]">
                    <i class="fas fa-plus mr-1"></i> Create Custom
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar" id="st-bestiary-grid">
    `;

    const renderCard = (id, npc, source) => {
        const isCustom = source === 'cloud';
        return `
            <div class="bg-[#1a1a1a] border border-[#333] p-3 rounded hover:border-[#d4af37] group relative flex flex-col h-full bestiary-card">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-white font-bold text-sm truncate pr-6 npc-name">${npc.name}</h4>
                    <span class="text-[9px] uppercase font-bold ${isCustom ? 'text-blue-400' : 'text-gray-500'}">${isCustom ? 'Custom' : 'Static'}</span>
                </div>
                
                <div class="text-[10px] text-gray-400 mb-2 flex-1">
                    <div class="mb-1"><span class="text-gray-500">Clan/Splats:</span> ${npc.clan || npc.species || "Unknown"}</div>
                    <div class="mb-1"><span class="text-gray-500">Attributes:</span> ${npc.attributes ? 'Yes' : 'Simplied'}</div>
                    <div class="italic text-gray-500 line-clamp-2">${npc.bio?.Description || "No description."}</div>
                </div>

                <div class="flex gap-2 mt-auto pt-2 border-t border-[#333]">
                    <button onclick="window.stAddToCombat('${id}', '${source}')" class="flex-1 bg-[#8b0000] hover:bg-red-700 text-white text-[10px] font-bold py-1 rounded uppercase">
                        Fight
                    </button>
                    <button onclick="window.previewStaticNpc('${id}', '${source}')" class="bg-[#333] hover:bg-[#444] text-gray-300 w-8 rounded flex items-center justify-center" title="View Stats">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${isCustom ? `
                        <button onclick="window.editCloudNpc('${id}')" class="bg-[#333] hover:bg-[#444] text-blue-400 w-8 rounded flex items-center justify-center" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.deleteCloudNpc('${id}')" class="bg-[#1a0505] hover:bg-red-900 text-red-500 w-8 rounded flex items-center justify-center" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button onclick="window.copyStaticNpc('${id}')" class="bg-[#333] hover:bg-[#444] text-green-400 w-8 rounded flex items-center justify-center" title="Copy to Custom">
                            <i class="fas fa-copy"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    };

    // Render Cloud NPCs
    Object.entries(cloudNPCs).forEach(([id, doc]) => {
        html += renderCard(id, doc.data, 'cloud');
    });

    // Render Static NPCs
    for (const cat in BESTIARY) {
        for (const key in BESTIARY[cat]) {
            const npc = BESTIARY[cat][key];
            // Use a composite ID for static items to retrieve them later
            const staticId = `static_${cat}_${key}`.replace(/\s+/g, '_');
            html += renderCard(staticId, npc, 'static');
        }
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Search Filter Logic
    const searchInput = document.getElementById('st-bestiary-search');
    if(searchInput) {
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.bestiary-card').forEach(card => {
                const name = card.querySelector('.npc-name').innerText.toLowerCase();
                card.style.display = name.includes(term) ? 'flex' : 'none';
            });
        };
    }
}

export function handleAddToCombat(id, source) {
    let npcData = null;
    if (source === 'cloud') {
        npcData = window.stState.bestiary[id].data;
    } else {
        // Parse static ID
        // Format: static_Category_Name
        // This is tricky because names have spaces.
        // Better: Find by name match in full list since ID was generated on fly.
        // Actually, we passed ID as a key. Let's just pass data directly if we could, 
        // but functions need to be global.
        
        // Quick lookup:
        const btn = document.activeElement; 
        const name = btn.closest('.bestiary-card').querySelector('.npc-name').innerText;
        for (const cat in BESTIARY) {
            if (BESTIARY[cat][name]) { npcData = BESTIARY[cat][name]; break; }
        }
    }

    if (npcData) {
        // Clone to avoid ref issues
        const combatant = JSON.parse(JSON.stringify(npcData));
        // Ensure ID is unique for combat
        combatant.id = "npc_" + Date.now() + "_" + Math.floor(Math.random()*1000);
        combatant.sourceId = id; // Track origin
        
        addCombatant(combatant, 'NPC');
    }
}

export function previewStaticNpc(id, source) {
    let npcData = null;
    if (source === 'cloud') {
        npcData = window.stState.bestiary[id].data;
    } else {
        // Name lookup via DOM hack or ID parsing
        // Let's assume ID contains the key roughly
        const btn = document.activeElement; 
        const name = btn.closest('.bestiary-card').querySelector('.npc-name').innerText;
        for (const cat in BESTIARY) {
            if (BESTIARY[cat][name]) { npcData = BESTIARY[cat][name]; break; }
        }
    }
    
    if (npcData && window.openNpcSheet) {
        window.openNpcSheet(npcData, null, true);
    }
}

export async function copyStaticNpc(id) {
    const btn = document.activeElement; 
    const name = btn.closest('.bestiary-card').querySelector('.npc-name').innerText;
    let npcData = null;
    for (const cat in BESTIARY) {
        if (BESTIARY[cat][name]) { npcData = BESTIARY[cat][name]; break; }
    }
    
    if (npcData) {
        // Push to cloud
        if (window.stPushNpc) {
            await window.stPushNpc({ ...npcData, name: `${npcData.name} (Copy)` });
        }
    }
}

export async function deleteCloudNpc(id) {
    if(!confirm("Delete this NPC from the cloud?")) return;
    try {
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'bestiary', id));
        showNotification("NPC Deleted.");
    } catch(e) { console.error(e); }
}

export function editCloudNpc(id) {
    const data = window.stState.bestiary[id].data;
    if (data && window.openNpcCreator) {
        // Modify openNpcCreator to support "Edit Mode" for ST
        // We'll pass a callback or handle save specially
        window.openNpcCreator(data.template || 'ghoul', data, id);
        // Note: The main npc-creator.js saves to local window.state.retainers by default.
        // ST needs to override the save button behavior in that modal.
        // Hack: Wait for modal, then replace save button.
        setTimeout(() => {
            const saveBtn = document.getElementById('npc-save-btn');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    // Gather data from inputs (Re-use existing scraping logic? 
                    // No, npc-creator has internal gathering logic. We might need to tap into it.)
                    // Ideally, npc-creator should export a "getData()" function.
                    
                    // For now, let's assume the user edits via standard inputs, 
                    // and we manually trigger the standard save which updates a temporary retainer,
                    // then we grab that and push to firebase.
                    
                    // Actually, easier: Just alert ST to use the form and "Push" it.
                    // Or implement specific ST edit logic later. 
                    // For now, View Only is safer to prevent data loss or complex merge issues.
                    showNotification("Full Cloud Editing not yet implemented. Copy to local, edit, then Push.", "warning");
                };
            }
        }, 500);
    }
}

// ==========================================================================
// 4. CHAT VIEW (ST LOG)
// ==========================================================================

export function renderChatView(container) {
    if (!container) return;
    
    const hist = window.stState.chatHistory || [];
    
    container.innerHTML = `
        <div class="flex flex-col h-full bg-[#0a0a0a]">
            <div class="bg-[#111] p-3 border-b border-[#333] flex justify-between items-center">
                <div class="flex gap-2">
                    <button onclick="window.stClearChat()" class="text-[10px] text-red-500 border border-red-900/50 px-2 py-1 hover:bg-red-900/20 rounded uppercase font-bold">Clear History</button>
                    <button onclick="window.stExportChat()" class="text-[10px] text-blue-400 border border-blue-900/50 px-2 py-1 hover:bg-blue-900/20 rounded uppercase font-bold">Export Log</button>
                </div>
                <div class="text-[10px] text-gray-500">
                    Auto-scroll <input type="checkbox" checked id="st-chat-autoscroll" class="ml-1">
                </div>
            </div>
            
            <div id="st-chat-history" class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]"></div>
            
            <div class="bg-[#111] p-3 border-t border-[#333] space-y-2">
                <!-- RECIPIENT SELECTOR -->
                <div class="flex gap-2 items-center">
                    <span class="text-[10px] uppercase font-bold text-gray-500">To:</span>
                    <label class="flex items-center gap-1 cursor-pointer bg-[#222] px-2 py-1 rounded border border-[#333]">
                        <input type="checkbox" id="st-chat-all-checkbox" checked class="accent-[#d4af37]">
                        <span class="text-xs text-white">Everyone</span>
                    </label>
                    <div class="h-4 w-px bg-[#333]"></div>
                    <div id="st-chat-recipients" class="flex gap-2 overflow-x-auto no-scrollbar max-w-[60%]">
                        <!-- Injected JS below -->
                    </div>
                </div>

                <div class="flex gap-2">
                    <select id="st-chat-type" class="bg-[#050505] border border-[#333] text-gray-300 text-xs px-2 rounded focus:border-[#d4af37] outline-none">
                        <option value="chat">Chat</option>
                        <option value="event">Event (Big)</option>
                        <option value="system">System (Small)</option>
                    </select>
                    <input type="text" id="st-chat-input" class="flex-1 bg-[#050505] border border-[#333] text-white px-3 py-2 text-sm outline-none focus:border-[#d4af37] rounded" placeholder="Storyteller message...">
                    <button id="st-chat-send" class="bg-[#d4af37] text-black font-bold uppercase px-4 py-2 hover:bg-[#fcd34d] transition-colors text-xs rounded">Send</button>
                </div>
            </div>
        </div>
    `;

    // Render Recipients
    const recContainer = document.getElementById('st-chat-recipients');
    const players = window.stState.players || {};
    Object.entries(players).forEach(([uid, p]) => {
        if (p.metadataType === 'journal') return;
        recContainer.innerHTML += `
            <label class="flex items-center gap-1 cursor-pointer bg-[#1a1a1a] px-2 py-1 rounded border border-[#333] hover:border-gray-500 transition-colors shrink-0">
                <input type="checkbox" class="st-recipient-checkbox accent-purple-500" value="${uid}" disabled>
                <span class="text-[10px] text-gray-300 truncate max-w-[80px]">${p.character_name || "Unknown"}</span>
            </label>
        `;
    });

    // Checkbox Logic
    const allCheck = document.getElementById('st-chat-all-checkbox');
    const indChecks = document.querySelectorAll('.st-recipient-checkbox');
    
    allCheck.onchange = () => {
        indChecks.forEach(c => {
            c.disabled = allCheck.checked;
            if(allCheck.checked) c.checked = false;
        });
    };

    // Chat refresh logic is handled by chat-model.js refreshChatUI, which calls renderMessageList
    // We just need to trigger the initial render
    refreshChatUI();

    // Send Logic
    const send = () => {
        const txt = document.getElementById('st-chat-input').value.trim();
        const type = document.getElementById('st-chat-type').value;
        if (!txt) return;

        const isAll = allCheck.checked;
        const selected = Array.from(document.querySelectorAll('.st-recipient-checkbox:checked')).map(c => c.value);
        
        const options = {};
        if (!isAll) {
            if (selected.length === 0) {
                showNotification("Select at least one recipient.", "error");
                return;
            }
            options.recipients = selected;
            options.isWhisper = true;
        }

        sendChronicleMessage(type, txt, null, options);
        document.getElementById('st-chat-input').value = '';
    };

    document.getElementById('st-chat-send').onclick = send;
    document.getElementById('st-chat-input').onkeydown = (e) => { if(e.key==='Enter') send(); };
}

// ==========================================================================
// 5. JOURNAL ACTIONS (ST)
// ==========================================================================

export async function pushHandoutToPlayers(docId, targetUids = null) {
    if (!window.stState.activeChronicleId) return;
    
    try {
        const safeId = docId.startsWith('journal_') ? docId : 'journal_' + docId;
        const docRef = doc(db, 'chronicles', window.stState.activeChronicleId, 'players', safeId);
        
        // If targetUids is null, it means "Everyone" (or handled by the lack of recipients array implies public in some logic, 
        // BUT ui-storyteller.js listener logic checks recipients array. If undefined/null, it might default to private or public depending on implementation.
        // Let's check ui-storyteller.js logic: "if (!data.recipients) isRecipient = true;" -> So null = Public.
        
        await updateDoc(docRef, {
            pushed: true,
            recipients: targetUids // null = everyone, array = specific
        });
        
        const count = targetUids ? targetUids.length : "All";
        showNotification(`Handout Pushed to ${count} Players.`);
        sendChronicleMessage('event', 'Storyteller shared a new Journal Entry.');
    } catch(e) {
        console.error(e);
        showNotification("Push Failed", "error");
    }
}

export async function stDeleteJournalEntry(id) {
    if(!confirm("Permanently delete this journal entry for ALL players?")) return;
    try {
        const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'players', safeId));
        showNotification("Entry Deleted.");
    } catch(e) {
        console.error(e);
        showNotification("Delete Failed", "error");
    }
}

// Global Exports for inline HTML calls
window.stRemovePlayer = stRemovePlayer;
window.stViewPlayerSheet = stViewPlayerSheet;
window.returnToStoryteller = returnToStoryteller;
window.stViewCombatantSheet = stViewCombatantSheet;
window.stToggleCombatVisibility = stToggleCombatVisibility;
window.stOpenCombatVisibilityModal = stOpenCombatVisibilityModal;
window.handleAddToCombat = handleAddToCombat;
window.copyStaticNpc = copyStaticNpc;
window.deleteCloudNpc = deleteCloudNpc;
window.editCloudNpc = editCloudNpc;
window.previewStaticNpc = previewStaticNpc;
window.stDeleteJournalEntry = stDeleteJournalEntry;
window.initWhisper = (uid, name) => {
    // Switch to Chat View and auto-select recipient
    if(window.switchStorytellerView) window.switchStorytellerView('chat');
    setTimeout(() => {
        const allCheck = document.getElementById('st-chat-all-checkbox');
        if(allCheck) { allCheck.checked = false; allCheck.dispatchEvent(new Event('change')); }
        
        const checks = document.querySelectorAll('.st-recipient-checkbox');
        checks.forEach(c => {
            if(c.value === uid) c.checked = true;
            else c.checked = false;
        });
        showNotification(`Whispering to ${name}`);
    }, 100);
};
