import { 
    V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLES_LIST, HEALTH_STATES,
    VIT
} from "./data.js";

// ==========================================================================
// NOTIFICATION PREFERENCES (LOCAL STORAGE)
// ==========================================================================

const NOTIF_KEY = 'v20_notification_prefs';

export const notifPrefs = JSON.parse(localStorage.getItem(NOTIF_KEY)) || {
    masterSound: true,
    chatSound: true,    // Type: chat
    combatSound: true,  // Type: roll, system
    journalSound: true, // Type: event, whisper
    cooldown: 0         // Seconds (0, 5, 20, 30)
};

let lastChimeTime = 0;

export function saveNotificationPrefs(newPrefs) {
    Object.assign(notifPrefs, newPrefs);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifPrefs));
}
window.saveNotificationPrefs = saveNotificationPrefs;
window.notifPrefs = notifPrefs; // Expose for UI checks

// ==========================================================================
// AUDIO SYSTEM (Church Bell Chime)
// ==========================================================================

/**
 * Plays the specific church bell chime from the provided URL.
 * Triggers on new incoming notifications, filtered by user preferences.
 * @param {string} type - The type of notification triggering the sound.
 */
function playBellChime(type) {
    // 1. Master Switch
    if (!notifPrefs.masterSound) return;

    // 2. Cooldown Check
    const now = Date.now();
    if (notifPrefs.cooldown > 0 && (now - lastChimeTime) < (notifPrefs.cooldown * 1000)) {
        return;
    }

    // 3. Category Filter
    let shouldPlay = true;
    if (type === 'chat' && !notifPrefs.chatSound) shouldPlay = false;
    if ((type === 'roll' || type === 'system') && !notifPrefs.combatSound) shouldPlay = false;
    if ((type === 'event' || type === 'whisper') && !notifPrefs.journalSound) shouldPlay = false;

    if (!shouldPlay) return;

    try {
        // Using the specific church bell sound file provided by Zeb
        const bell = new Audio('https://files.catbox.moe/7yeahl.WAV');
        bell.volume = 0.5;
        
        // Play and handle potential browser-based auto-play blockages
        const playPromise = bell.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Browsers often block audio until the user interacts with the page once.
                // console.warn("Audio chime prevented by browser auto-play policy.");
            });
        }
        
        // Update timestamp only on successful trigger intent
        lastChimeTime = now;

    } catch (e) {
        console.error("Audio playback error:", e);
    }
}

// ==========================================================================
// TOAST NOTIFICATION SYSTEM (PERSISTENT & LEFT-ALIGNED)
// ==========================================================================

/**
 * Displays a stackable toast notification on the left side of the screen.
 * REMAIN ON SCREEN: These toasts stay until clicked away by the user.
 * MAX LIMIT: Keeps the 5 most recent toasts.
 * @param {string} msg - The message body.
 * @param {string} type - The toast style ('info', 'roll', 'system', 'chat', 'whisper', 'event').
 * @param {string} header - The small bold text at the top of the toast.
 */
export function showNotification(msg, type = 'info', header = 'System') { 
    const container = document.getElementById('toast-container');
    if (!container) {
        // Fallback to legacy notification if the container element is missing from index.html
        const el = document.getElementById('notification'); 
        if (el) { 
            el.innerText = msg; 
            el.style.display = 'block'; 
            setTimeout(() => { el.style.display = 'none'; }, 4000); 
        } 
        return;
    }

    // Play Sound (Filtered by Settings)
    playBellChime(type);

    // Limit Check (Max 5)
    // Remove the oldest (top) notifications if we exceed the limit
    while (container.children.length >= 5) {
        if (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Map font-awesome icons to message types
    let icon = 'fa-info-circle';
    if (type === 'roll') icon = 'fa-dice-d20';
    if (type === 'system') icon = 'fa-cog';
    if (type === 'chat') icon = 'fa-comment';
    if (type === 'whisper') icon = 'fa-user-secret';
    if (type === 'event') icon = 'fa-bullhorn';

    toast.innerHTML = `
        <div class="toast-header">
            <span><i class="fas ${icon} mr-1"></i> ${header}</span>
            <span class="opacity-50 text-[8px]">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="toast-body">${msg}</div>
        <div class="text-[8px] text-gray-600 mt-1 uppercase font-bold text-right">[ Click to Dismiss ]</div>
    `;

    // Add the toast to the stacking container on the left
    container.appendChild(toast);

    // PERSISTENCE: Toasts remain until clicked.
    // Click to dismiss logic (Triggers the slide-out animation defined in CSS)
    toast.onclick = () => {
        toast.classList.add('hiding');
        setTimeout(() => { 
            if (toast.parentNode) toast.remove(); 
        }, 300); 
    };
};
window.showNotification = showNotification;

// ==========================================================================
// CORE UI HELPERS
// ==========================================================================

export function setSafeText(id, val) { 
    const el = document.getElementById(id); 
    if(el) el.innerText = val; 
}
window.setSafeText = setSafeText;

export function renderDots(count, max = 5) { 
    let h = ''; 
    for(let i=1; i<=max; i++) h += `<span class="dot ${i <= count ? 'filled' : ''}" data-v="${i}"></span>`; 
    return h; 
}
window.renderDots = renderDots;

export function renderBoxes(count, checked = 0, type = '') { 
    let h = ''; 
    for(let i=1; i<=count; i++) h += `<span class="box ${i <= checked ? 'checked' : ''}" data-v="${i}" data-type="${type}"></span>`; 
    return h; 
}
window.renderBoxes = renderBoxes;

/**
 * Syncs the visual sheet state with the data stored in window.state.textFields.
 */
export function hydrateInputs() {
    if(!window.state || !window.state.textFields) return;
    Object.entries(window.state.textFields).forEach(([id, val]) => { 
        const el = document.getElementById(id); 
        if (el) el.value = val; 
    });
    if(window.renderPrintSheet) window.renderPrintSheet(); 
}
window.hydrateInputs = hydrateInputs;

/**
 * Renders textareas for each background that has at least one dot.
 */
export function renderSocialProfile() {
    const list = document.getElementById('social-profile-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (window.state.dots.back) {
        Object.entries(window.state.dots.back).forEach(([name, val]) => {
            if (val > 0) {
                const safeId = 'desc-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const box = document.createElement('div');
                box.className = 'flex flex-col gap-1';
                const existingVal = window.state.textFields[safeId] || "";
                
                box.innerHTML = `
                    <label class="label-text text-gold">${name} (${val} dots)</label>
                    <textarea id="${safeId}" class="h-20 w-full text-xs bg-black/40 border border-[#333] text-white p-2" placeholder="Describe your ${name}...">${existingVal}</textarea>
                `;
                list.appendChild(box);
                const ta = box.querySelector('textarea');
                ta.onblur = (e) => { 
                    window.state.textFields[safeId] = e.target.value; 
                    if(window.renderPrintSheet) window.renderPrintSheet(); 
                };
            }
        });
    }
    
    if (list.innerHTML === '') {
        list.innerHTML = '<div class="text-gray-500 italic text-xs">Select Backgrounds in Step 4 to add descriptions here.</div>';
    }
}
window.renderSocialProfile = renderSocialProfile;

// ==========================================================================
// INVENTORY MANAGEMENT
// ==========================================================================

export function setupInventoryListeners() {
    const typeSelect = document.getElementById('inv-type');
    const baseSelect = document.getElementById('inv-base-select');
    const baseWrapper = document.getElementById('inv-base-wrapper');
    const addBtn = document.getElementById('add-inv-btn');
    
    if(!typeSelect || !addBtn) return; 

    typeSelect.onchange = () => {
        const t = typeSelect.value;
        const statsRow = document.getElementById('inv-stats-row');
        const armorRow = document.getElementById('inv-armor-row');
        const vehicleRow = document.getElementById('inv-vehicle-row');

        if (statsRow) statsRow.classList.toggle('hidden', t !== 'Weapon');
        if (armorRow) armorRow.classList.toggle('hidden', t !== 'Armor');
        if (vehicleRow) vehicleRow.classList.toggle('hidden', t !== 'Vehicle');
        
        if (['Weapon', 'Armor', 'Vehicle'].includes(t)) {
            baseWrapper.classList.remove('hidden');
            baseSelect.innerHTML = '<option value="">-- Custom / Manual --</option>';
            let source = [];
            if(t==='Weapon') source = V20_WEAPONS_LIST;
            if(t==='Armor') source = V20_ARMOR_LIST;
            if(t==='Vehicle') source = V20_VEHICLES_LIST;
            source.forEach((item, i) => { baseSelect.add(new Option(item.name, i)); });
        } else {
            baseWrapper.classList.add('hidden');
            baseSelect.innerHTML = '';
        }
    };

    baseSelect.onchange = () => {
        const t = typeSelect.value;
        const idx = baseSelect.value;
        if (idx === "") return;
        let item = null;
        if(t==='Weapon') item = V20_WEAPONS_LIST[idx];
        if(t==='Armor') item = V20_ARMOR_LIST[idx];
        if(t==='Vehicle') item = V20_VEHICLES_LIST[idx];
        
        if (item) {
            document.getElementById('inv-name').value = item.name;
            if (t==='Weapon') {
                document.getElementById('inv-diff').value = item.diff;
                document.getElementById('inv-dmg').value = item.dmg;
                document.getElementById('inv-range').value = item.range;
                document.getElementById('inv-rate').value = item.rate;
                document.getElementById('inv-clip').value = item.clip;
            }
            if (t==='Armor') {
                document.getElementById('inv-rating').value = item.rating;
                document.getElementById('inv-penalty').value = item.penalty;
            }
            if (t==='Vehicle') {
                document.getElementById('inv-safe').value = item.safe;
                document.getElementById('inv-max').value = item.max;
                document.getElementById('inv-man').value = item.man;
            }
        }
    };

    addBtn.onclick = () => {
        const type = typeSelect.value;
        const name = document.getElementById('inv-name').value || "Unnamed Item";
        const isCarried = document.getElementById('inv-carried').checked;
        
        const newItem = { type, name, displayName: name, status: isCarried ? 'carried' : 'owned', stats: {} };
        if (baseSelect.value !== "") newItem.baseType = baseSelect.options[baseSelect.selectedIndex].text;

        if (type === 'Weapon') {
            newItem.stats = {
                diff: document.getElementById('inv-diff').value || 6,
                dmg: document.getElementById('inv-dmg').value || "",
                range: document.getElementById('inv-range').value || "",
                rate: document.getElementById('inv-rate').value || "",
                clip: document.getElementById('inv-clip').value || ""
            };
        } else if (type === 'Armor') {
            newItem.stats = { rating: document.getElementById('inv-rating').value || 0, penalty: document.getElementById('inv-penalty').value || 0 };
        } else if (type === 'Vehicle') {
            newItem.stats = { safe: document.getElementById('inv-safe').value || "", max: document.getElementById('inv-max').value || "", man: document.getElementById('inv-man').value || "" };
        }

        if (!window.state.inventory) window.state.inventory = [];
        window.state.inventory.push(newItem);
        document.getElementById('inv-name').value = "";
        baseSelect.value = "";
        renderInventoryList();
        if(window.renderPrintSheet) window.renderPrintSheet();
        window.showNotification("Item Added");
    };
}
window.setupInventoryListeners = setupInventoryListeners;

export function renderInventoryList() {
    const listCarried = document.getElementById('inv-list-carried');
    const listOwned = document.getElementById('inv-list-owned');
    const listVehicles = document.getElementById('vehicle-list');
    
    if(listCarried) listCarried.innerHTML = '';
    if(listOwned) listOwned.innerHTML = '';
    if(listVehicles) listVehicles.innerHTML = '';
    
    if(!listCarried || !listOwned || !listVehicles || !window.state || !window.state.inventory) return;
    
    window.state.inventory.forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = "flex justify-between items-center bg-black/40 border border-[#333] p-1 text-[10px] mb-1";
        let displayName = item.displayName || item.name;
        if(item.type === 'Weapon' && item.baseType && item.baseType !== displayName) displayName += ` <span class="text-gray-500">[${item.baseType}]</span>`;
        let details = "";
        if(item.type === 'Weapon') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Diff:${item.stats.diff} Dmg:${item.stats.dmg} Rng:${item.stats.range}</div>`;
        else if(item.type === 'Armor') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Rating:${item.stats.rating} Penalty:${item.stats.penalty}</div>`;
        else if(item.type === 'Vehicle') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Safe:${item.stats.safe} Max:${item.stats.max} Man:${item.stats.man}</div>`;
        const statusColor = item.status === 'carried' ? 'text-green-400' : 'text-gray-500';
        const statusLabel = item.status === 'carried' ? 'CARRIED' : 'OWNED';
        d.innerHTML = `
            <div class="flex-1 overflow-hidden mr-2"><div class="font-bold text-white uppercase truncate" title="${item.displayName || item.name}">${displayName}</div>${details}</div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${item.type !== 'Vehicle' ? `<button class="${statusColor} font-bold text-[8px] border border-[#333] px-1 hover:bg-[#222]" onclick="window.toggleInvStatus(${idx})">${statusLabel}</button>` : ''}
                <button class="text-red-500 font-bold px-1 hover:text-red-300" onclick="window.removeInventory(${idx})">&times;</button>
            </div>`;
        if (item.type === 'Vehicle') listVehicles.appendChild(d);
        else { if (item.status === 'carried') listCarried.appendChild(d); else listOwned.appendChild(d); }
    });
    if(window.updatePools) window.updatePools();
    if(window.renderPrintSheet) window.renderPrintSheet();
}
window.renderInventoryList = renderInventoryList;

export function removeInventory(idx) { 
    window.state.inventory.splice(idx, 1); 
    renderInventoryList(); 
}
window.removeInventory = removeInventory;

export function toggleInvStatus(idx) { 
    const item = window.state.inventory[idx]; 
    item.status = item.status === 'carried' ? 'owned' : 'carried'; 
    renderInventoryList(); 
}
window.toggleInvStatus = toggleInvStatus;

// --- BOX CLICK HANDLER (Willpower, Blood, Health) ---
export function handleBoxClick(type, val, element) {
    if (!window.state.isPlayMode) return;

    if (type === 'wp') {
        let cur = window.state.status.tempWillpower || 0;
        window.state.status.tempWillpower = (val === cur) ? val - 1 : val;
    } 
    else if (type === 'blood') {
        let cur = window.state.status.blood || 0;
        window.state.status.blood = (val === cur) ? val - 1 : val;
    } 
    else if (type === 'health') {
        const idx = val - 1;
        const healthStates = window.state.status.health_states || [0,0,0,0,0,0,0];
        let s = healthStates[idx] || 0;
        s = (s + 1) % 4; 
        healthStates[idx] = s;
        window.state.status.health_states = healthStates;
        if(element) element.dataset.state = s; 
    }
    if(window.updatePools) window.updatePools();
    if(window.renderPrintSheet) window.renderPrintSheet(); 
}
window.handleBoxClick = handleBoxClick;
