import { 
    db, doc, updateDoc, deleteDoc, setDoc, collection, addDoc, getDoc 
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";
import { 
    combatState, addCombatant, removeCombatant, updateInitiative, 
    setCombatantStatus, setCombatantHidden, rollNPCInitiative 
} from "./combat-tracker.js";
import { BESTIARY } from "./bestiary-data.js";
import { renderMessageList } from "./chat-model.js";

// ==========================================================================
// 1. ROSTER VIEW
// ==========================================================================

export function renderRosterView() {
    const container = document.getElementById('st-viewport');
    if (!container) return;
    
    // Check state from global window object to avoid circular dependencies
    const players = window.stState?.players || {};
    const playerList = Object.values(players);

    if (playerList.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-500">
                <i class="fas fa-users-slash text-4xl mb-4 opacity-50"></i>
                <p>No players connected to this Chronicle.</p>
                <div class="text-xs mt-2 bg-[#111] p-2 rounded border border-[#333]">
                    ID: <span class="text-white font-mono select-all">${window.stState.activeChronicleId}</span>
                </div>
            </div>`;
        return;
    }

    let html = `<div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full custom-scrollbar">`;
    
    playerList.forEach(p => {
        if (p.metadataType === 'journal') return; // Skip journal entries if they leaked into players list

        const lastActive = p.last_active ? new Date(p.last_active) : new Date(0);
        const diffSeconds = (new Date() - lastActive) / 1000;
        const isOnline = diffSeconds < 300 && p.status !== 'Offline';
        const statusColor = isOnline ? 'text-green-500' : 'text-red-500';
        
        const sheet = p.full_sheet || {};
        const clan = sheet.textFields?.['c-clan'] || "Unknown Clan";
        const health = p.live_stats?.health || [];
        const dmg = health.filter(x => x > 0).length;
        const wp = p.live_stats?.willpower || 0;
        const bp = p.live_stats?.blood || 0;

        html += `
            <div class="bg-[#111] border border-[#333] rounded-lg overflow-hidden group hover:border-[#d4af37] transition-all relative">
                <div class="p-3 bg-black border-b border-[#333] flex justify-between items-center">
                    <div class="font-bold text-[#d4af37] truncate text-sm">${p.character_name || "Unknown"}</div>
                    <div class="text-[10px] ${statusColor} font-bold uppercase flex items-center gap-1">
                        <i class="fas fa-circle text-[6px]"></i> ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
                
                <div class="p-3 space-y-2">
                    <div class="text-[10px] text-gray-400 flex justify-between">
                        <span>${clan}</span>
                        <span>${sheet.textFields?.['c-player'] || "Unknown Player"}</span>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-2 text-center text-xs font-bold bg-[#0a0a0a] p-2 rounded border border-[#222]">
                        <div class="text-red-500"><i class="fas fa-heart"></i> ${dmg}/7</div>
                        <div class="text-blue-400"><i class="fas fa-brain"></i> ${wp}</div>
                        <div class="text-[#af0000]"><i class="fas fa-tint"></i> ${bp}</div>
                    </div>

                    <div class="flex gap-2 mt-2">
                        <button onclick="window.stViewPlayerSheet('${p.id}')" class="flex-1 bg-[#222] hover:bg-[#333] text-white text-[10px] py-2 rounded uppercase font-bold border border-[#444] transition-colors">
                            View Sheet
                        </button>
                        <button onclick="window.initWhisper('${p.id}', '${(p.character_name||'Player').replace(/'/g, "\\'")}')" class="flex-1 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 text-[10px] py-2 rounded uppercase font-bold border border-[#333] transition-colors">
                            Whisper
                        </button>
                    </div>
                </div>
                
                <button onclick="window.stRemovePlayer('${p.id}')" class="absolute top-2 right-12 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2" title="Kick Player">
                    <i class="fas fa-ban"></i>
                </button>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

export async function stRemovePlayer(uid) {
    if (!confirm("Kick this player from the chronicle?")) return;
    try {
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'players', uid));
        showNotification("Player Removed");
    } catch (e) {
        console.error(e);
        showNotification("Error removing player", "error");
    }
}

export function stViewPlayerSheet(uid) {
    const player = window.stState.players[uid];
    if (!player || !player.full_sheet) return showNotification("No sheet data available.");

    // Store current state to restore later
    window.stState.tempStorytellerBackup = JSON.parse(JSON.stringify(window.state));
    
    // Load player state locally for viewing
    window.state = JSON.parse(JSON.stringify(player.full_sheet));
    window.state.isPlayMode = true; // Force play mode view
    
    // Render the sheet
    const container = document.getElementById('st-viewport');
    container.innerHTML = `
        <div class="flex flex-col h-full bg-[#050505]">
            <div class="bg-red-900/20 border-b border-red-900 p-2 flex justify-between items-center">
                <span class="text-red-400 font-bold text-xs uppercase tracking-wider">Viewing: ${player.character_name}</span>
                <button onclick="window.returnToStoryteller()" class="bg-red-900 hover:bg-red-700 text-white px-4 py-1 text-xs font-bold uppercase rounded">Close Sheet</button>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 relative" id="st-sheet-preview-container">
                <!-- Sheet Injected Here -->
            </div>
        </div>
    `;

    // We render the standard play mode UI into this container
    // This requires temporarily hijacking the global renderer target or using the print renderer as a base
    // For fidelity, we'll use the print renderer inside the div as it's cleaner for read-only
    
    // Hack: Temporarily redirect the print element logic or just render print view
    const previewCont = document.getElementById('st-sheet-preview-container');
    
    // We can reuse the renderPrintSheet logic but target a specific div if modified,
    // Or we can manually construct a view.
    // Simplest approach: Use the Print Sheet renderer logic but modified to write to innerHTML
    // Since renderPrintSheet writes to #print-sheet, let's clone that node
    
    if (window.renderPrintSheet) {
        window.renderPrintSheet(); // Updates DOM #print-sheet based on window.state (which is now player's)
        const printContent = document.getElementById('print-sheet').cloneNode(true);
        printContent.classList.remove('hidden', 'print:block');
        printContent.style.display = 'block';
        printContent.style.backgroundColor = '#111';
        printContent.style.color = '#ccc';
        printContent.style.maxWidth = '800px';
        printContent.style.margin = '0 auto';
        
        // Dark mode adjustments for the white print sheet
        printContent.querySelectorAll('.border-black').forEach(el => el.classList.replace('border-black', 'border-gray-600'));
        
        previewCont.appendChild(printContent);
    }
}

export function returnToStoryteller() {
    // Restore ST State
    if (window.stState.tempStorytellerBackup) {
        window.state = window.stState.tempStorytellerBackup;
        delete window.stState.tempStorytellerBackup;
    }
    window.renderRosterView();
}

// ==========================================================================
// 2. COMBAT VIEW
// ==========================================================================

export function renderCombatView() {
    const container = document.getElementById('st-viewport');
    if (!container) return;

    if (!combatState.isActive) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center">
                <h3 class="text-[#d4af37] font-cinzel text-xl mb-4">Combat Tracker Inactive</h3>
                <button onclick="window.stStartCombat()" class="bg-[#8b0000] hover:bg-red-700 text-white px-6 py-3 rounded uppercase font-bold tracking-widest shadow-lg transition-transform hover:scale-105">
                    <i class="fas fa-swords mr-2"></i> Initiate Combat
                </button>
            </div>
        `;
        return;
    }

    const phaseLabel = combatState.phase === 'declare' ? 'Declaration (Low -> High)' : 'Action (High -> Low)';
    const phaseClass = combatState.phase === 'declare' ? 'text-blue-400 border-blue-900' : 'text-red-500 border-red-900';

    let html = `
        <div class="flex flex-col h-full bg-[#0a0a0a]">
            <!-- Combat Header -->
            <div class="bg-[#111] border-b border-[#333] p-3 flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <div class="text-center bg-[#222] px-3 py-1 rounded border border-[#444]">
                        <div class="text-[9px] text-gray-500 uppercase font-bold">Round</div>
                        <div class="text-xl font-bold text-white">${combatState.turn}</div>
                    </div>
                    <div class="px-3 py-1 rounded border ${phaseClass} bg-[#1a1a1a]">
                        <div class="text-xs font-bold uppercase">${phaseLabel}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.stRollInit()" class="bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] px-3 py-1 text-xs uppercase font-bold rounded" title="Roll for all NPCs">
                        <i class="fas fa-dice mr-1"></i> Auto-Roll NPCs
                    </button>
                    <button onclick="window.stNextTurn()" class="bg-[#d4af37] hover:bg-[#fcd34d] text-black px-4 py-1 text-xs uppercase font-bold rounded shadow-lg">
                        Next Phase <i class="fas fa-forward ml-1"></i>
                    </button>
                    <button onclick="window.stEndCombat()" class="bg-red-900 hover:bg-red-700 text-white px-3 py-1 text-xs uppercase font-bold rounded border border-red-700">
                        End
                    </button>
                </div>
            </div>

            <!-- Combat List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
    `;

    // Sort Combatants based on Phase
    let list = [...combatState.combatants];
    if (combatState.phase === 'declare') list.sort((a,b) => a.init - b.init); // Ascending
    else list.sort((a,b) => b.init - a.init); // Descending

    if (list.length === 0) {
        html += `<div class="text-center text-gray-500 italic mt-10">No combatants. Add from Roster or Bestiary.</div>`;
    } else {
        list.forEach(c => {
            const isActive = c.id === combatState.activeCombatantId;
            const rowClass = isActive ? 'border-[#d4af37] bg-[#1a1a1a]' : 'border-[#333] bg-[#111]';
            const typeColor = c.type === 'Player' ? 'text-blue-400' : 'text-red-400';
            
            // Hidden Icon Logic
            let hiddenIcon = '<i class="fas fa-eye text-gray-600 opacity-30 hover:opacity-100 cursor-pointer" title="Visible to All"></i>';
            if (c.hidden === true) hiddenIcon = '<i class="fas fa-eye-slash text-red-500 cursor-pointer" title="Hidden from All"></i>';
            else if (Array.isArray(c.hidden)) hiddenIcon = '<i class="fas fa-low-vision text-orange-400 cursor-pointer" title="Partially Hidden"></i>';

            // Health Tracking for NPCs
            let healthBar = '';
            if (c.type === 'NPC' && c.health) {
                const track = c.health.track || [0,0,0,0,0,0,0];
                const dmg = track.filter(x=>x>0).length;
                const pct = Math.max(0, 100 - (dmg * 14.2));
                const barColor = pct > 50 ? 'bg-green-600' : (pct > 25 ? 'bg-yellow-600' : 'bg-red-600');
                healthBar = `
                    <div class="w-24 h-2 bg-black border border-[#333] rounded overflow-hidden mt-1" title="Health: ${7-dmg}/7">
                        <div class="h-full ${barColor}" style="width: ${pct}%"></div>
                    </div>
                `;
            }

            html += `
                <div class="${rowClass} border rounded p-2 flex items-center justify-between transition-colors relative group">
                    <div class="flex items-center gap-4">
                        <div class="flex flex-col items-center w-12">
                            <input type="number" value="${c.init}" onchange="window.stUpdateInit('${c.id}', this.value)" class="w-full bg-black border border-[#444] text-center text-[#d4af37] font-bold text-lg rounded focus:outline-none focus:border-[#d4af37]">
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-white text-sm cursor-pointer hover:text-[#d4af37] hover:underline" onclick="window.stViewCombatantSheet('${c.id}')">${c.name}</span>
                                <span class="text-[9px] uppercase font-bold border border-[#333] px-1 rounded bg-black ${typeColor}">${c.type}</span>
                            </div>
                            ${healthBar}
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="text-right">
                            <div class="text-[10px] text-gray-500 uppercase font-bold">Status</div>
                            <div class="text-xs text-white font-bold">${c.status}</div>
                        </div>
                        
                        <div class="h-8 w-px bg-[#333]"></div>
                        
                        <div class="flex gap-2">
                            <button onclick="window.stToggleCombatVisibility('${c.id}')" class="p-2 hover:bg-[#222] rounded">
                                ${hiddenIcon}
                            </button>
                            <button onclick="window.stOpenCombatVisibilityModal('${c.id}')" class="p-2 hover:bg-[#222] rounded text-gray-500 hover:text-white" title="Visibility Settings">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button onclick="window.stRemoveCombatant('${c.id}')" class="p-2 hover:bg-[#222] rounded text-red-900 hover:text-red-500">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div>`;
    container.innerHTML = html;
}

export function stViewCombatantSheet(id) {
    const combatant = combatState.combatants.find(c => c.id === id);
    if (!combatant) return;

    if (combatant.type === 'Player') {
        window.stViewPlayerSheet(id);
    } else {
        // Handle NPC Sheet View
        let npcData = null;
        if (combatant.sourceId && window.stState.bestiary[combatant.sourceId]) {
            npcData = window.stState.bestiary[combatant.sourceId].data;
        } else {
            // Check static bestiary
            for (const cat in BESTIARY) {
                if (BESTIARY[cat][combatant.name]) {
                    npcData = BESTIARY[cat][combatant.name];
                    break;
                }
            }
        }

        if (npcData) {
            // Open NPC Sheet Modal (using existing logic if possible or custom)
            if (window.openNpcSheet) window.openNpcSheet(npcData); // Requires npc-sheet-play.js to be loaded
            else showNotification("NPC Sheet Viewer not loaded.", "error");
        } else {
            showNotification("No data found for this NPC.", "error");
        }
    }
}

export async function stToggleCombatVisibility(id) {
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    
    // Toggle between Visible (false) and Hidden (true)
    const newVal = c.hidden === true ? false : true;
    await setCombatantHidden(id, newVal);
}

export function stOpenCombatVisibilityModal(id) {
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;

    const modal = document.getElementById('st-combat-vis-modal');
    const input = document.getElementById('st-combat-vis-id');
    const list = document.getElementById('st-combat-vis-player-list');
    const saveBtn = document.getElementById('st-combat-vis-save');
    
    if (!modal || !list) return;

    input.value = id;
    list.innerHTML = '';

    const players = window.stState.players || {};
    const currentHidden = Array.isArray(c.hidden) ? c.hidden : (c.hidden === true ? Object.keys(players) : []);

    Object.entries(players).forEach(([uid, p]) => {
        const isChecked = currentHidden.includes(uid);
        list.innerHTML += `
            <label class="flex items-center gap-2 p-1 hover:bg-[#222] rounded cursor-pointer">
                <input type="checkbox" class="vis-check accent-[#d4af37]" value="${uid}" ${isChecked ? 'checked' : ''}>
                <span class="text-xs text-gray-300">${p.character_name}</span>
            </label>
        `;
    });

    saveBtn.onclick = async () => {
        const selected = Array.from(document.querySelectorAll('.vis-check:checked')).map(cb => cb.value);
        let finalVal = false;
        
        if (selected.length === Object.keys(players).length && selected.length > 0) finalVal = true; // Hide from all
        else if (selected.length > 0) finalVal = selected; // Partial
        else finalVal = false; // Visible

        await setCombatantHidden(id, finalVal);
        modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
}

export function handleAddToCombat(id, type = 'NPC') {
    if (!combatState.isActive) {
        showNotification("Start Combat First.", "warning");
        return;
    }

    let entity = null;
    
    if (type === 'Player') {
        const p = window.stState.players[id];
        if (p) entity = { id: id, name: p.character_name };
    } else {
        // NPC Logic
        if (window.stState.bestiary[id]) {
            // Cloud NPC
            const npc = window.stState.bestiary[id];
            entity = { id: id + '_' + Date.now(), name: npc.name, sourceId: id }; // Unique ID for multiple instances
        } else {
            // Static NPC
            // Find in BESTIARY
            let data = null;
            for (const cat in BESTIARY) {
                if (BESTIARY[cat][id]) { data = BESTIARY[cat][id]; break; }
            }
            if (data) {
                entity = { id: id + '_' + Date.now(), name: data.name };
            }
        }
    }

    if (entity) {
        addCombatant(entity, type);
    }
}

// ==========================================================================
// 3. BESTIARY VIEW
// ==========================================================================

export function renderBestiaryView() {
    const container = document.getElementById('st-viewport');
    if (!container) return;

    let html = `
        <div class="flex h-full gap-4 p-4">
            <!-- LIST -->
            <div class="w-1/3 flex flex-col bg-[#111] border border-[#333] h-full">
                <div class="p-2 border-b border-[#333] flex justify-between items-center bg-black">
                    <h3 class="text-[#d4af37] font-bold text-xs uppercase">Bestiary</h3>
                    <button onclick="window.openNpcCreator('ghoul')" class="text-[10px] bg-[#333] hover:bg-[#444] text-white px-2 py-1 rounded border border-[#555]">+ Custom NPC</button>
                </div>
                <div class="overflow-y-auto flex-1 p-2 space-y-4 custom-scrollbar">
    `;

    // 1. Custom/Cloud NPCs
    const cloudNPCs = window.stState.bestiary || {};
    if (Object.keys(cloudNPCs).length > 0) {
        html += `<div class="text-[10px] text-blue-400 font-bold uppercase mb-1">Custom / Cloud</div>`;
        Object.entries(cloudNPCs).forEach(([id, npc]) => {
            html += `
                <div class="flex justify-between items-center p-2 hover:bg-[#222] border-b border-[#222] group cursor-pointer" onclick="window.editCloudNpc('${id}')">
                    <span class="text-xs text-white font-bold">${npc.name}</span>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="event.stopPropagation(); window.stAddToCombat('${id}', 'NPC')" class="text-red-500 hover:text-white" title="Add to Combat"><i class="fas fa-swords"></i></button>
                        <button onclick="event.stopPropagation(); window.deleteCloudNpc('${id}')" class="text-gray-500 hover:text-red-500" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    }

    // 2. Static Bestiary
    Object.keys(BESTIARY).forEach(category => {
        html += `<div class="text-[10px] text-gray-500 font-bold uppercase mt-4 mb-1 border-b border-[#222]">${category}</div>`;
        Object.entries(BESTIARY[category]).forEach(([name, data]) => {
            // Use name as ID for static
            html += `
                <div class="flex justify-between items-center p-2 hover:bg-[#222] border-b border-[#222] group cursor-pointer" onclick="window.previewStaticNpc('${name}')">
                    <span class="text-xs text-gray-300 group-hover:text-white">${name}</span>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="event.stopPropagation(); window.stAddToCombat('${name}', 'NPC')" class="text-red-900 hover:text-red-500" title="Add to Combat"><i class="fas fa-swords"></i></button>
                        <button onclick="event.stopPropagation(); window.copyStaticNpc('${name}')" class="text-gray-600 hover:text-[#d4af37]" title="Copy to Custom"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
            `;
        });
    });

    html += `
                </div>
            </div>
            
            <!-- PREVIEW PANE -->
            <div class="w-2/3 bg-[#0a0a0a] border border-[#333] h-full overflow-hidden relative" id="bestiary-preview">
                <div class="flex flex-col items-center justify-center h-full text-gray-600 italic">
                    <i class="fas fa-dragon text-6xl mb-4 opacity-20"></i>
                    <p>Select an NPC to preview details.</p>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

export async function copyStaticNpc(name) {
    let data = null;
    for (const cat in BESTIARY) {
        if (BESTIARY[cat][name]) { data = BESTIARY[cat][name]; break; }
    }
    if (!data) return;

    if (window.stPushNpc) {
        // Clone data to avoid reference issues
        const copy = JSON.parse(JSON.stringify(data));
        copy.name = copy.name + " (Copy)";
        window.stPushNpc(copy);
    }
}

export async function deleteCloudNpc(id) {
    if(!confirm("Delete this custom NPC?")) return;
    try {
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'bestiary', id));
        showNotification("NPC Deleted");
    } catch(e) { console.error(e); }
}

export function editCloudNpc(id) {
    const npc = window.stState.bestiary[id];
    if (!npc) return;
    if (window.openNpcCreator) {
        // Pass the ID so the creator knows to update existing
        window.openNpcCreator(npc.data.template || 'ghoul', npc.data, id);
    }
}

export function previewStaticNpc(name) {
    const container = document.getElementById('bestiary-preview');
    if(!container) return;
    
    let data = null;
    for (const cat in BESTIARY) {
        if (BESTIARY[cat][name]) { data = BESTIARY[cat][name]; break; }
    }
    
    if (data) {
        // Generate a quick read-only view
        // Re-use logic from npc-sheet-play logic if available, or build simple HTML
        let statsHtml = '';
        if(data.attributes) {
            statsHtml += `<div class="grid grid-cols-3 gap-4 mb-4 border-b border-[#333] pb-2">
                ${Object.entries(data.attributes).map(([k,v]) => `<div><span class="text-gray-500 uppercase text-[10px]">${k}</span> <span class="text-white font-bold">${v}</span></div>`).join('')}
            </div>`;
        }
        
        container.innerHTML = `
            <div class="p-6 h-full overflow-y-auto custom-scrollbar">
                <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold mb-1">${data.name}</h2>
                <div class="text-xs text-gray-500 uppercase font-bold mb-6">${data.species || "Unknown"}</div>
                
                ${statsHtml}
                
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-red-500 uppercase font-bold text-xs mb-2">Abilities</h4>
                        <div class="text-xs text-gray-300 space-y-1">
                            ${data.abilities ? Object.entries(data.abilities).map(([k,v]) => `<div>${k}: ${v}</div>`).join('') : 'None'}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-purple-400 uppercase font-bold text-xs mb-2">Disciplines/Powers</h4>
                        <div class="text-xs text-gray-300 space-y-1">
                            ${data.disciplines ? Object.entries(data.disciplines).map(([k,v]) => `<div>${k}: ${v}</div>`).join('') : 'None'}
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 bg-[#111] p-3 border border-[#333] rounded">
                    <div class="text-[10px] text-gray-500 uppercase font-bold mb-1">Notes / Bio</div>
                    <div class="text-sm text-gray-300 italic leading-relaxed">
                        ${data.bio?.Description || "No description."}
                        <br><br>
                        ${data.bio?.Notes || ""}
                    </div>
                </div>
            </div>
        `;
    }
}

// ==========================================================================
// 4. CHAT VIEW
// ==========================================================================

export function renderChatView(container) {
    container.innerHTML = `
        <div class="flex flex-col h-full">
            <div id="st-chat-history" class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#0a0a0a]"></div>
            
            <div class="p-3 bg-[#111] border-t border-[#333] shrink-0">
                <div class="flex gap-2 mb-2">
                    <select id="st-chat-type" class="bg-[#222] text-white text-xs border border-[#444] px-2 rounded focus:border-[#d4af37] outline-none">
                        <option value="chat">Chat</option>
                        <option value="system">System</option>
                        <option value="event">Event (Banner)</option>
                    </select>
                    
                    <!-- RECIPIENT SELECTOR -->
                    <div class="relative">
                        <button id="st-chat-recipient-btn" class="bg-[#222] border border-[#444] text-gray-300 text-xs px-3 py-1.5 flex items-center gap-2 hover:border-[#d4af37] transition-colors rounded min-w-[120px]" onclick="document.getElementById('st-chat-recipients').classList.toggle('hidden')">
                            <span>Everyone</span> <i class="fas fa-chevron-down text-[8px] ml-auto"></i>
                        </button>
                        <div id="st-chat-recipients" class="hidden absolute bottom-full left-0 w-48 bg-[#1a1a1a] border border-[#333] shadow-xl p-2 max-h-48 overflow-y-auto custom-scrollbar z-50 rounded mb-1">
                            <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer border-b border-[#333] mb-1 pb-1">
                                <input type="checkbox" id="st-chat-all-checkbox" class="accent-[#d4af37]" checked>
                                <span class="text-xs text-gold font-bold">Everyone</span>
                            </label>
                            <div id="st-chat-player-list" class="space-y-1"></div>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <input type="text" id="st-chat-input" class="flex-1 bg-[#050505] border border-[#333] text-white px-3 py-2 text-sm focus:border-[#d4af37] outline-none rounded" placeholder="Message...">
                    <button id="st-chat-send" class="bg-[#d4af37] text-black font-bold uppercase px-4 py-2 hover:bg-[#fcd34d] transition-colors text-xs rounded">Send</button>
                </div>
                
                <div class="flex justify-between mt-2 pt-2 border-t border-[#333]">
                    <div class="text-[9px] text-gray-600 uppercase font-bold cursor-pointer hover:text-red-500" onclick="window.stClearChat()">Clear History</div>
                    <div class="text-[9px] text-gray-600 uppercase font-bold cursor-pointer hover:text-blue-400" onclick="window.stExportChat()">Export Log</div>
                </div>
            </div>
        </div>
    `;

    // Populate recipients
    const pList = document.getElementById('st-chat-player-list');
    const players = window.stState.players || {};
    Object.entries(players).forEach(([uid, p]) => {
        if (!p.metadataType) {
            pList.innerHTML += `
                <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer">
                    <input type="checkbox" class="st-recipient-checkbox accent-[#d4af37]" value="${uid}">
                    <span class="text-xs text-gray-300">${p.character_name}</span>
                </label>
            `;
        }
    });

    // Checkbox logic
    const allCheck = document.getElementById('st-chat-all-checkbox');
    const recipientBtn = document.getElementById('st-chat-recipient-btn');
    const checks = document.querySelectorAll('.st-recipient-checkbox');

    const updateLabel = () => {
        const count = Array.from(checks).filter(c => c.checked).length;
        const span = recipientBtn.querySelector('span');
        if (allCheck.checked) {
            span.innerText = "Everyone";
            span.className = "";
        } else if (count === 0) {
            span.innerText = "Select...";
            span.className = "text-red-500 font-bold";
        } else {
            span.innerText = `Whisper (${count})`;
            span.className = "text-purple-400 font-bold";
        }
    };

    allCheck.onchange = () => {
        checks.forEach(c => { c.disabled = allCheck.checked; if(allCheck.checked) c.checked = false; });
        updateLabel();
    };
    checks.forEach(c => c.onchange = updateLabel);

    // Send Logic
    const send = () => {
        const txt = document.getElementById('st-chat-input').value.trim();
        const type = document.getElementById('st-chat-type').value;
        if (!txt) return;

        const isAll = allCheck.checked;
        const selected = Array.from(document.querySelectorAll('.st-recipient-checkbox:checked')).map(c => c.value);

        if (!isAll && selected.length === 0) {
            showNotification("Select at least one recipient.", "error");
            return;
        }

        const options = {};
        if (!isAll) {
            options.isWhisper = true;
            options.recipients = selected;
        }

        if (window.sendChronicleMessage) {
            window.sendChronicleMessage(type, txt, null, options);
            document.getElementById('st-chat-input').value = '';
        }
    };

    document.getElementById('st-chat-send').onclick = send;
    document.getElementById('st-chat-input').onkeydown = (e) => { if(e.key==='Enter') send(); };

    if (window.stState.chatHistory) {
        renderMessageList(document.getElementById('st-chat-history'), window.stState.chatHistory);
    }
}

export function initWhisper(uid) {
    if (window.switchStorytellerView) window.switchStorytellerView('chat');
    // Allow DOM to update
    setTimeout(() => {
        const allCheck = document.getElementById('st-chat-all-checkbox');
        const menu = document.getElementById('st-chat-recipients');
        if (allCheck) {
            allCheck.checked = false;
            allCheck.dispatchEvent(new Event('change'));
        }
        if (menu) menu.classList.remove('hidden');
        
        const checks = document.querySelectorAll('.st-recipient-checkbox');
        checks.forEach(c => {
            if (c.value === uid) {
                c.checked = true;
                c.dispatchEvent(new Event('change'));
            }
        });
    }, 100);
}

// ==========================================================================
// 5. JOURNAL & HANDOUTS
// ==========================================================================

export async function pushHandoutToPlayers(entryId, recipients = null) {
    if (!entryId) return;
    
    // If recipients is null, it means EVERYONE. 
    // If it's an array, it's specific people.
    
    try {
        const safeId = entryId.startsWith('journal_') ? entryId : 'journal_' + entryId;
        const docRef = doc(db, 'chronicles', window.stState.activeChronicleId, 'players', safeId);
        
        // We only need to update the flags, the data should already be synced via the save
        await updateDoc(docRef, {
            pushed: true,
            recipients: recipients // null = public, array = specific
        });
        
        if (recipients) {
            showNotification(`Handout pushed to ${recipients.length} players.`);
        } else {
            showNotification("Handout pushed to everyone.");
        }
        
    } catch(e) {
        console.error("Push Error:", e);
        showNotification("Failed to push handout.", "error");
    }
}

export async function stDeleteJournalEntry(id) {
    if(!confirm("Delete this entry permanently?")) return;
    try {
        const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'players', safeId));
        showNotification("Entry Deleted");
    } catch(e) {
        console.error(e);
        showNotification("Error deleting entry", "error");
    }
}
