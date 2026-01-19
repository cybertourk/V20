import { 
    BACKGROUNDS, ATTRIBUTES, ABILITIES, VIRTUES, 
    V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLE_LIST, SPECIALTY_EXAMPLES
} from "./data.js";

import { 
    renderDots, renderBoxes, setSafeText, showNotification 
} from "./ui-common.js";

import { 
    updatePools, setDots 
} from "./ui-mechanics.js";

import { renderPrintSheet } from "./ui-print.js";

// --- EXPORT HELPERS (Re-exporting for main.js access) ---
export { renderDots, renderBoxes, setDots };

// --- INPUT HYDRATION (Populates Text Fields from State) ---
export function hydrateInputs() {
    if (!window.state || !window.state.textFields) return;
    
    Object.entries(window.state.textFields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = val;
            // Handle select elements specifically if needed
            if (el.tagName === 'SELECT' && !val) {
                el.selectedIndex = 0;
            }
        }
    });

    // Special Case: Generation (Sync dots with text input)
    const gen = window.state.textFields['c-gen'];
    if(gen) {
        const genDots = 13 - parseInt(gen);
        const row = document.querySelector(`.dot-row[data-n="Generation"]`);
        if(row) row.innerHTML = renderDots(genDots, 5);
    }
}
window.hydrateInputs = hydrateInputs;

// --- SOCIAL PROFILE (Background Descriptions) ---
export function renderSocialProfile() {
    const container = document.getElementById('social-profile-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Only show text areas for Backgrounds we actually have dots in
    BACKGROUNDS.forEach(bg => {
        const dots = window.state.dots.back[bg] || 0;
        if (dots > 0) {
            const safeId = 'desc-' + bg.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const storedVal = window.state.textFields[safeId] || "";
            
            const div = document.createElement('div');
            div.className = "flex flex-col gap-1 animate-in fade-in";
            div.innerHTML = `
                <div class="flex justify-between items-end">
                    <label class="text-[10px] font-bold text-gold uppercase tracking-wider">${bg}</label>
                    <span class="text-[9px] text-gray-500 font-bold">${renderDots(dots, 5)}</span>
                </div>
                <textarea id="${safeId}" class="w-full h-16 bg-[#111] border border-[#333] text-gray-300 p-2 text-xs rounded focus:border-gold outline-none resize-none placeholder-gray-700" placeholder="Describe your ${bg}...">${storedVal}</textarea>
            `;
            
            container.appendChild(div);
            
            // Bind listener
            const area = div.querySelector('textarea');
            area.addEventListener('blur', (e) => {
                window.state.textFields[safeId] = e.target.value;
                if(renderPrintSheet) renderPrintSheet();
            });
        }
    });

    if (container.children.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center text-gray-600 italic text-xs py-4">Select Backgrounds in the Advantages tab to add descriptions here.</div>';
    }
}
window.renderSocialProfile = renderSocialProfile;

// --- GENERIC ROW RENDERER (Attributes/Abilities) ---

export function refreshTraitRow(label, type, targetEl) {
    let rowDiv = targetEl;
    if (!rowDiv) {
        const safeId = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
        rowDiv = document.getElementById(safeId);
    }
    
    if(!rowDiv) return;

    // --- UPDATED MIN VALUE LOGIC ---
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    let min = (type === 'attr') ? 1 : 0;
    
    // Override min for Nosferatu Appearance
    if (clan === "Nosferatu" && label === "Appearance") min = 0;

    let val = window.state.dots[type][label];
    if (val === undefined) val = min;
    
    // Ensure value respects min (unless overridden by clan curse)
    if (val < min) {
        val = min;
        window.state.dots[type][label] = val; // Sync state
    }

    const max = 5;

    let showSpecialty = false;
    let warningMsg = "";

    // Specialty Logic
    if (type !== 'virt') {
        if (type === 'attr') {
            if (val >= 4) showSpecialty = true;
        } else if (type === 'abil') {
            if (val >= 1) {
                showSpecialty = true;
                // Broad abilities check could go here if V20-Rules were imported
            }
        }
    }

    let specInputHTML = '';
    if (showSpecialty) {
        const specVal = window.state.specialties[label] || "";
        // Hide empty inputs in play mode
        if (window.state.isPlayMode && !specVal) specInputHTML = '<div class="flex-1"></div>'; 
        else {
            const listId = `list-${label.replace(/[^a-zA-Z0-9]/g, '')}`;
            let optionsHTML = '';
            if (SPECIALTY_EXAMPLES && SPECIALTY_EXAMPLES[label]) {
                optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
            }
            specInputHTML = `<div class="flex-1 mx-2 relative"><input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}"><datalist id="${listId}">${optionsHTML}</datalist></div>`;
        }
    } else { specInputHTML = '<div class="flex-1"></div>'; }

    let styleOverride = "";
    let pointerEvents = "auto";
    let titleMsg = "";
    
    // --- NOSFERATU VISUAL STYLING ---
    if (clan === "Nosferatu" && label === "Appearance") {
        styleOverride = "text-decoration: line-through; color: #666; cursor: not-allowed; opacity: 0.5;";
        pointerEvents = "none"; // Disable dots
        titleMsg = "Nosferatu Weakness: Appearance 0";
    }

    rowDiv.innerHTML = `
        <span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap cursor-pointer hover:text-gold" style="${styleOverride}" title="${titleMsg}">
            ${label}
        </span>
        ${specInputHTML}
        <div class="dot-row flex-shrink-0" data-n="${label}" data-t="${type}" style="pointer-events: ${pointerEvents}; opacity: ${clan === "Nosferatu" && label === "Appearance" ? '0.3' : '1'}">
            ${renderDots(val, max)}
        </div>`;

    // Click Handlers
    rowDiv.querySelector('.trait-label').onclick = () => { 
        if(window.state.isPlayMode && !(clan === "Nosferatu" && label === "Appearance")) {
            if(window.handleTraitClick) window.handleTraitClick(label, type);
        }
    };
    
    rowDiv.querySelector('.dot-row').onclick = (e) => { 
        if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); 
    };
    
    // Bind Specialty Input
    if(showSpecialty && (!window.state.isPlayMode || (window.state.isPlayMode && window.state.specialties[label]))) {
        const input = rowDiv.querySelector('input');
        if(input) {
            input.onblur = (e) => { 
                window.state.specialties[label] = e.target.value; 
                if(renderPrintSheet) renderPrintSheet(); 
            };
            input.disabled = window.state.isPlayMode;
        }
    }
}
window.refreshTraitRow = refreshTraitRow;

export function renderRow(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    
    // Check if exists to prevent duplicates
    if(cont.querySelector(`div[id^="trait-row-${type}-${label.replace(/[^a-zA-Z0-9]/g, '')}"]`)) return;

    const div = document.createElement('div'); 
    div.id = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
    div.className = 'flex items-center justify-between w-full py-1';
    cont.appendChild(div);
    refreshTraitRow(label, type, div); 
}
window.renderRow = renderRow;

// --- INVENTORY SYSTEM ---

export function setupInventoryListeners() {
    const typeSel = document.getElementById('inv-type');
    const baseWrap = document.getElementById('inv-base-wrapper');
    const baseSel = document.getElementById('inv-base-select');
    
    if (typeSel) {
        typeSel.addEventListener('change', () => {
            const type = typeSel.value;
            
            // Show/Hide Specific Inputs
            document.getElementById('inv-stats-row').classList.toggle('hidden', type !== 'Weapon');
            document.getElementById('inv-armor-row').classList.toggle('hidden', type !== 'Armor');
            document.getElementById('inv-vehicle-row').classList.toggle('hidden', type !== 'Vehicle');
            
            // Populate Base Select
            baseSel.innerHTML = '<option value="">-- Custom --</option>';
            let list = [];
            if (type === 'Weapon') list = V20_WEAPONS_LIST;
            else if (type === 'Armor') list = V20_ARMOR_LIST;
            else if (type === 'Vehicle') list = V20_VEHICLES;
            
            if (list.length > 0) {
                baseWrap.classList.remove('hidden');
                list.forEach(item => {
                    baseSel.add(new Option(item.name, item.name));
                });
            } else {
                baseWrap.classList.add('hidden');
            }
        });
    }
    
    if (baseSel) {
        baseSel.addEventListener('change', () => {
            const type = typeSel.value;
            const name = baseSel.value;
            let item = null;
            
            if (type === 'Weapon') item = V20_WEAPONS_LIST.find(i => i.name === name);
            else if (type === 'Armor') item = V20_ARMOR_LIST.find(i => i.name === name);
            else if (type === 'Vehicle') item = V20_VEHICLES.find(i => i.name === name);
            
            if (item) {
                document.getElementById('inv-name').value = item.name;
                if (type === 'Weapon') {
                    document.getElementById('inv-diff').value = item.diff;
                    document.getElementById('inv-dmg').value = item.dmg;
                    document.getElementById('inv-range').value = item.range || '';
                    document.getElementById('inv-rate').value = item.rate || '';
                    document.getElementById('inv-clip').value = item.clip || '';
                } else if (type === 'Armor') {
                    document.getElementById('inv-rating').value = item.rating;
                    document.getElementById('inv-penalty').value = item.penalty;
                } else if (type === 'Vehicle') {
                    document.getElementById('inv-safe').value = item.safe;
                    document.getElementById('inv-max').value = item.max;
                    document.getElementById('inv-man').value = item.man;
                }
            }
        });
    }
    
    const addBtn = document.getElementById('add-inv-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            const type = typeSel.value;
            const name = document.getElementById('inv-name').value || "Unnamed Item";
            const carried = document.getElementById('inv-carried').checked;
            
            const newItem = {
                id: Date.now(),
                type: type,
                name: name,
                status: carried ? 'carried' : 'owned',
                stats: {}
            };
            
            if (type === 'Weapon') {
                newItem.stats = {
                    diff: document.getElementById('inv-diff').value || 6,
                    dmg: document.getElementById('inv-dmg').value || '',
                    range: document.getElementById('inv-range').value || '',
                    rate: document.getElementById('inv-rate').value || '',
                    clip: document.getElementById('inv-clip').value || ''
                };
            } else if (type === 'Armor') {
                newItem.stats = {
                    rating: document.getElementById('inv-rating').value || 0,
                    penalty: document.getElementById('inv-penalty').value || 0
                };
            } else if (type === 'Vehicle') {
                newItem.stats = {
                    safe: document.getElementById('inv-safe').value || '',
                    max: document.getElementById('inv-max').value || '',
                    man: document.getElementById('inv-man').value || ''
                };
            }
            
            if (!window.state.inventory) window.state.inventory = [];
            window.state.inventory.push(newItem);
            
            renderInventoryList();
            if(renderPrintSheet) renderPrintSheet();
            showNotification(`Added ${name}`);
            
            // Clear Inputs
            document.getElementById('inv-name').value = '';
        };
    }
}
window.setupInventoryListeners = setupInventoryListeners;

export function renderInventoryList() {
    const carriedList = document.getElementById('inv-list-carried');
    const ownedList = document.getElementById('inv-list-owned');
    const vehicleList = document.getElementById('vehicle-list');
    
    if (!carriedList || !ownedList) return;
    
    carriedList.innerHTML = '';
    ownedList.innerHTML = '';
    if (vehicleList) vehicleList.innerHTML = '';
    
    if (!window.state.inventory) window.state.inventory = [];
    
    window.state.inventory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center text-xs border-b border-[#222] py-1 bg-[#111]/50 px-2 rounded mb-1 group";
        
        let statsTxt = "";
        if (item.type === 'Weapon') statsTxt = `Diff:${item.stats.diff} Dmg:${item.stats.dmg}`;
        else if (item.type === 'Armor') statsTxt = `Rating:${item.stats.rating}`;
        else if (item.type === 'Vehicle') statsTxt = `Safe:${item.stats.safe}`;
        
        div.innerHTML = `
            <div class="flex-1">
                <span class="font-bold text-white">${item.name}</span>
                <span class="text-[9px] text-gray-500 ml-2 uppercase">${item.type}</span>
                <div class="text-[9px] text-gold italic">${statsTxt}</div>
            </div>
            <div class="flex gap-2">
                <button class="text-[9px] text-blue-400 hover:text-white uppercase font-bold" onclick="window.toggleInvStatus(${index})">${item.status === 'carried' ? 'Store' : 'Carry'}</button>
                <button class="text-red-500 hover:text-red-300" onclick="window.removeInvItem(${index})">&times;</button>
            </div>
        `;
        
        if (item.type === 'Vehicle' && vehicleList) {
            vehicleList.appendChild(div);
        } else if (item.status === 'carried') {
            carriedList.appendChild(div);
        } else {
            ownedList.appendChild(div);
        }
    });
}
window.renderInventoryList = renderInventoryList;

window.toggleInvStatus = function(index) {
    const item = window.state.inventory[index];
    item.status = item.status === 'carried' ? 'owned' : 'carried';
    renderInventoryList();
    updatePools(); // Update Armor pool if needed
    if(renderPrintSheet) renderPrintSheet();
};

window.removeInvItem = function(index) {
    if(confirm("Delete item?")) {
        window.state.inventory.splice(index, 1);
        renderInventoryList();
        updatePools();
        if(renderPrintSheet) renderPrintSheet();
    }
};
