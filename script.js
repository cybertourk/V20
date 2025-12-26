import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DATA IMPORT (V20 Rules) ---
import { 
    APP_VERSION, CLANS, ARCHETYPES, ATTRIBUTES, ABILITIES, BACKGROUNDS, DISCIPLINES, 
    VIRTUES, PATHS, VIT, HEALTH_STATES, GEN_LIMITS, SPECIALTY_EXAMPLES, DERANGEMENTS, 
    V20_MERITS_LIST, V20_FLAWS_LIST, V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLE_LIST, 
    STEPS_CONFIG 
} from "./data.js";

// --- ERROR HANDLER ---
window.onerror = function(msg, url, line) {
    const notif = document.getElementById('notification');
    if(notif) {
        notif.innerText = "ERROR: " + msg;
        notif.style.display = 'block';
        notif.style.backgroundColor = 'red';
    }
    console.error("Global Error:", msg, "Line:", line);
};

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB8qLWOiC3csqPnucbj3XOtireOgPjjL_k",
  authDomain: "v20-character-creator.firebaseapp.com",
  projectId: "v20-character-creator",
  storageBucket: "v20-character-creator.firebasestorage.app",
  messagingSenderId: "110220382386",
  appId: "1:110220382386:web:81b5d203c2bc4f81f5b9ab",
  measurementId: "G-RWPX9139HB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'v20-neonate-sheet';

// --- INJECT CUSTOM STYLES FOR FREEBIE DOTS ---
const style = document.createElement('style');
style.innerHTML = `
    .dot.freebie { background-color: #3b82f6 !important; box-shadow: 0 0 4px #3b82f6; }
`;
document.head.appendChild(style);

// --- STATE MANAGEMENT ---
window.state = {
    isPlayMode: false, freebieMode: false, activePool: [], currentPhase: 1, furthestPhase: 1,
    dots: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    // New: Track points spent during freebie mode specifically
    freebieSpend: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} }, 
    prios: { attr: {}, abil: {} },
    // status.health_states: Array of 7 integers. 0=Empty, 1=Bashing(/), 2=Lethal(X), 3=Aggravated(*)
    status: { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 },
    specialties: {}, 
    socialExtras: {}, textFields: {}, havens: [], bloodBonds: [], vehicles: [], customAbilityCategories: {},
    derangements: [], merits: [], flaws: [], inventory: [],
    meta: { filename: "", folder: "" } 
};

let user = null;

// --- CONSTANTS FOR RULES ---
const BROAD_ABILITIES = ["Crafts", "Science"];

const setSafeText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
function showNotification(msg) { const el = document.getElementById('notification'); if (el) { el.innerText = msg; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 4000); } }

function syncInputs() {
    document.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(el => {
        if (el.id && !el.id.startsWith('inv-') && !el.id.startsWith('merit-') && !el.id.startsWith('flaw-') && !el.id.startsWith('save-') && !el.closest('.combat-row') && !el.classList.contains('specialty-input')) window.state.textFields[el.id] = el.value;
    });
}

function hydrateInputs() {
    Object.entries(window.state.textFields || {}).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
}

// MOVED UP FOR SAFETY
window.renderInventoryList = function() {
    const listCarried = document.getElementById('inv-list-carried');
    const listOwned = document.getElementById('inv-list-owned');
    const listVehicles = document.getElementById('vehicle-list');
    if(listCarried) listCarried.innerHTML = '';
    if(listOwned) listOwned.innerHTML = '';
    if(listVehicles) listVehicles.innerHTML = '';
    if(!listCarried || !listOwned || !listVehicles) return;
    (window.state.inventory || []).forEach((item, idx) => {
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
    window.updatePools();
};

window.removeInventory = (idx) => { window.state.inventory.splice(idx, 1); window.renderInventoryList(); };
window.toggleInvStatus = (idx) => { const item = window.state.inventory[idx]; item.status = item.status === 'carried' ? 'owned' : 'carried'; window.renderInventoryList(); };

// UPDATED: Now supports identifying Freebie dots
function renderDots(count, max = 5, freebieCount = 0) { 
    let h = ''; 
    const baseCount = count - freebieCount;
    for(let i=1; i<=max; i++) {
        let classes = "dot";
        if (i <= count) classes += " filled";
        // Only show blue if in Freebie Mode AND this specific dot is a freebie addition
        if (window.state.freebieMode && i > baseCount && i <= count) classes += " freebie";
        h += `<span class="${classes}" data-v="${i}"></span>`; 
    }
    return h; 
}
function renderBoxes(count, checked = 0, type = '') { let h = ''; for(let i=1; i<=count; i++) h += `<span class="box ${i <= checked ? 'checked' : ''}" data-v="${i}" data-type="${type}"></span>`; return h; }

// --- PLAY MODE INTERACTION ---
document.addEventListener('click', function(e) {
    if (!window.state.isPlayMode) return;
    if (!e.target.classList.contains('box')) return;
    
    const type = e.target.dataset.type;
    const val = parseInt(e.target.dataset.v);
    if (!type || isNaN(val)) return;

    if (type === 'wp') {
        if (window.state.status.tempWillpower === val) window.state.status.tempWillpower = val - 1;
        else window.state.status.tempWillpower = val;
    } else if (type === 'blood') {
        if (window.state.status.blood === val) window.state.status.blood = val - 1;
        else window.state.status.blood = val;
    } else if (type === 'health') {
        const idx = val - 1; 
        if (window.state.status.health_states === undefined) window.state.status.health_states = [0,0,0,0,0,0,0];
        const current = window.state.status.health_states[idx] || 0;
        window.state.status.health_states[idx] = (current + 1) % 4;
    }
    window.updatePools();
});

// --- FILE MANAGER LOGIC ---

window.handleNew = function() {
    if(!confirm("Create new character? Unsaved changes will be lost.")) return;
    window.location.reload(); 
};

window.handleSaveClick = function() {
    if(!user) return showNotification("Login Required");
    syncInputs();
    
    // Pre-fill inputs if existing
    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    if(window.state.meta.filename) nameIn.value = window.state.meta.filename;
    else nameIn.value = document.getElementById('c-name').value || "Unnamed Vampire";
    
    if(window.state.meta.folder) folderIn.value = window.state.meta.folder;
    
    document.getElementById('save-modal').classList.add('active');
};

window.handleLoadClick = async function() {
    if(!user) return showNotification("Login Required");
    document.getElementById('load-modal').classList.add('active');
    await renderFileBrowser();
};

window.performSave = async function() {
    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    let rawName = nameIn.value.trim();
    let folder = folderIn.value.trim() || "Unsorted";
    
    if(!rawName) return showNotification("Filename required");
    
    // Sanitize ID
    const safeId = rawName.replace(/[^a-zA-Z0-9 _-]/g, "");
    
    window.state.meta.filename = safeId;
    window.state.meta.folder = folder;
    
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', safeId);
        await setDoc(docRef, { 
            ...window.state, 
            lastSaved: Date.now() 
        });
        showNotification("Inscribed.");
        document.getElementById('save-modal').classList.remove('active');
        
        // Update Datalist
        const dl = document.getElementById('folder-datalist');
        if(dl && !Array.from(dl.options).some(o => o.value === folder)) {
            const opt = document.createElement('option');
            opt.value = folder;
            dl.appendChild(opt);
        }
    } catch (e) { 
        showNotification("Save Error."); 
        console.error(e); 
    }
};

async function renderFileBrowser() {
    const browser = document.getElementById('file-browser');
    browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">Consulting Archives...</div>';
    
    try {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'characters'));
        const snap = await getDocs(q);
        
        const structure = {};
        
        snap.forEach(d => {
            const data = d.data();
            const f = data.meta?.folder || "Unsorted";
            if(!structure[f]) structure[f] = [];
            structure[f].push({ id: d.id, ...data });
        });
        
        browser.innerHTML = '';
        
        // Sort folders (Unsorted last)
        const folders = Object.keys(structure).sort((a,b) => a === "Unsorted" ? 1 : b === "Unsorted" ? -1 : a.localeCompare(b));
        
        const dl = document.getElementById('folder-datalist');
        if(dl) dl.innerHTML = ''; // Reset datalist
        
        folders.forEach(f => {
            if(dl) { const opt = document.createElement('option'); opt.value = f; dl.appendChild(opt); }
            
            const header = document.createElement('div');
            header.className = 'folder-header';
            header.innerHTML = `<i class="fas fa-folder mr-2"></i> ${f}`;
            browser.appendChild(header);
            
            structure[f].forEach(char => {
                const row = document.createElement('div');
                row.className = 'file-row';
                const date = new Date(char.lastSaved || Date.now()).toLocaleDateString();
                row.innerHTML = `
                    <div class="flex-1">
                        <div class="file-info text-white">${char.meta?.filename || char.id}</div>
                        <div class="file-meta">${char.textFields['c-clan'] || 'Unknown Clan'} • ${char.textFields['c-nature'] || 'Unknown Nature'}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="file-meta">${date}</div>
                        <button class="file-delete-btn" title="Delete" onclick="window.deleteCharacter('${char.id}', '${char.meta?.filename || char.id}', event)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                row.onclick = async (e) => {
                    if(e.target.closest('.file-delete-btn')) return;
                    await loadSelectedChar(char);
                };
                browser.appendChild(row);
            });
        });
        
        if(folders.length === 0) browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">No Archives Found.</div>';
        
    } catch (e) {
        console.error(e);
        browser.innerHTML = '<div class="text-red-500 text-center mt-10">Archive Error.</div>';
    }
}

window.deleteCharacter = async function(id, name, event) {
    if(event) event.stopPropagation();
    if(!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'characters', id));
        showNotification("Deleted.");
        await renderFileBrowser(); // Refresh list
    } catch (e) {
        console.error("Delete Error:", e);
        showNotification("Delete Failed.");
    }
};

async function loadSelectedChar(data) {
    if(!confirm(`Recall ${data.meta?.filename}? Unsaved progress will be lost.`)) return;
    
    window.state = data;
    if(!window.state.specialties) window.state.specialties = {}; 
    if(!window.state.freebieSpend) window.state.freebieSpend = { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} }; // Init if missing
    
    if (!window.state.furthestPhase) window.state.furthestPhase = 1;
    if (window.state.status && window.state.status.tempWillpower === undefined) {
        window.state.status.tempWillpower = window.state.status.willpower || 5;
    }
    if (window.state.status && (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states))) {
        const oldDamage = window.state.status.health || 0;
        window.state.status.health_states = [0,0,0,0,0,0,0];
        for(let i=0; i<oldDamage && i<7; i++) {
            window.state.status.health_states[i] = 2;
        }
    }
    
    // UI Refresh
    hydrateInputs();
    const mList = document.getElementById('merits-list-create');
    if(mList) { mList.innerHTML = ''; renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST); }
    const fList = document.getElementById('flaws-list-create');
    if(fList) { fList.innerHTML = ''; renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST); }
    
    renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
    renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
    renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
    renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
    renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
    renderDerangementsList();
    renderBloodBondRow();
    renderDynamicHavenRow();
    
    window.renderInventoryList();
    window.updatePools();
    
    // Re-render standard rows to ensure specialties appear if data exists
    if(window.state.dots.attr) {
        Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { refreshTraitRow(a, 'attr'); }));
    }
    if(window.state.dots.abil) {
        Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { refreshTraitRow(a, 'abil'); }));
    }
    
    // Close Modal
    document.getElementById('load-modal').classList.remove('active');
    showNotification("Recalled.");
    
    if (window.state.isPlayMode) { window.togglePlayMode(); window.togglePlayMode(); } // Quick refresh
    window.changeStep(window.state.furthestPhase || 1);
}

// --- DICE & CORE LOGIC ---

window.clearPool = function() {
    window.state.activePool = [];
    document.querySelectorAll('.trait-label').forEach(el => el.classList.remove('selected'));
    setSafeText('pool-display', "Select traits to build pool...");
    const hint = document.getElementById('specialty-hint'); if(hint) hint.innerHTML = '';
    // Uncheck specialty box
    const cb = document.getElementById('use-specialty');
    if(cb) cb.checked = false;
    document.getElementById('dice-tray').classList.remove('open');
};

window.rollPool = function() {
    const poolSize = window.state.activePool.reduce((a,b) => a + b.val, 0);
    if (poolSize <= 0) { showNotification("Pool Empty"); return; }
    const diff = parseInt(document.getElementById('roll-diff').value) || 6;
    const isSpec = document.getElementById('use-specialty').checked;
    let results = [], ones = 0, rawSuccesses = 0;
    for(let i=0; i<poolSize; i++) {
        const die = Math.floor(Math.random() * 10) + 1;
        results.push(die);
        if (die === 1) ones++;
        if (die >= diff) { if (isSpec && die === 10) rawSuccesses += 2; else rawSuccesses += 1; }
    }
    let net = rawSuccesses - ones;
    let outcome = "", outcomeClass = "";
    if (rawSuccesses === 0 && ones > 0) { outcome = "BOTCH"; outcomeClass = "dice-botch"; } 
    else if (net <= 0) { outcome = "FAILURE"; outcomeClass = "text-gray-400"; } 
    else { outcome = `${net} SUCCESS${net > 1 ? 'ES' : ''}`; outcomeClass = "dice-success"; }
    const tray = document.getElementById('roll-results');
    const row = document.createElement('div');
    row.className = 'bg-black/60 p-2 border border-[#333] text-[10px] mb-2 animate-in fade-in slide-in-from-right-4 duration-300';
    // Updated Dice Styling: Bigger Font (text-3xl) and spacing
    const diceRender = results.map(d => {
        let c = 'text-gray-500';
        if (d === 1) c = 'text-[#ff0000] font-bold';
        else if (d >= diff) { c = 'text-[#d4af37] font-bold'; if (d === 10 && isSpec) c = 'text-[#4ade80] font-black'; }
        return `<span class="${c} text-3xl mx-1">${d}</span>`;
    }).join(' ');
    row.innerHTML = `<div class="flex justify-between border-b border-[#444] pb-1 mb-1"><span class="text-gray-400">Diff ${diff}${isSpec ? '*' : ''}</span><span class="${outcomeClass} font-black text-sm">${outcome}</span></div><div class="tracking-widest flex flex-wrap justify-center py-2">${diceRender}</div>`;
    tray.insertBefore(row, tray.firstChild);
};

function calculateTotalFreebiesSpent(tempState = window.state) {
    let attrDots = 0; Object.keys(ATTRIBUTES).forEach(cat => ATTRIBUTES[cat].forEach(a => attrDots += (tempState.dots.attr[a] || 1)));
    const attrCost = Math.max(0, attrDots - 24) * 5;
    let abilDots = 0;
    Object.keys(ABILITIES).forEach(cat => {
        ABILITIES[cat].forEach(a => abilDots += (tempState.dots.abil[a] || 0));
        if (tempState.customAbilityCategories) { Object.entries(tempState.customAbilityCategories).forEach(([name, c]) => { if (c === cat && tempState.dots.abil[name]) abilDots += tempState.dots.abil[name]; }); }
    });
    const abilCost = Math.max(0, abilDots - 27) * 2;
    let discDots = Object.values(tempState.dots.disc || {}).reduce((a,b)=>a+b,0);
    const discCost = Math.max(0, discDots - 3) * 7;
    let backDots = Object.values(tempState.dots.back || {}).reduce((a,b)=>a+b,0);
    const backCost = Math.max(0, backDots - 5) * 1;
    let virtDots = VIRTUES.reduce((a,v) => a + (tempState.dots.virt[v] || 1), 0);
    const virtCost = Math.max(0, virtDots - 10) * 2;
    const bH = (tempState.dots.virt?.Conscience || 1) + (tempState.dots.virt?.["Self-Control"] || 1);
    const bW = (tempState.dots.virt?.Courage || 1);
    const curH = tempState.status.humanity !== undefined ? tempState.status.humanity : bH;
    const curW = tempState.status.willpower !== undefined ? tempState.status.willpower : bW;
    const humCost = Math.max(0, curH - bH) * 2;
    const willCost = Math.max(0, curW - bW) * 1;
    let mfCost = 0, mfBonus = 0;
    if (tempState.merits) tempState.merits.forEach(m => mfCost += (parseInt(m.val) || 0));
    if (tempState.flaws) tempState.flaws.forEach(f => mfBonus += (parseInt(f.val) || 0));
    const cappedBonus = Math.min(mfBonus, 7);
    return (attrCost + abilCost + discCost + backCost + virtCost + humCost + willCost + mfCost) - cappedBonus;
}

function checkStepComplete(step) {
    syncInputs();
    const s = window.state;
    if (!s.prios) s.prios = { attr: {}, abil: {} };
    if (!s.dots) s.dots = { attr: {}, abil: {}, disc: {}, back: {}, virt: {} };
    if (step === 1) return !!(s.textFields['c-name'] && s.textFields['c-nature'] && s.textFields['c-demeanor'] && s.textFields['c-clan']);
    if (step === 2) {
        const prios = Object.values(s.prios.attr || {});
        if (prios.length !== 3 || !prios.includes(7) || !prios.includes(5) || !prios.includes(3)) return false;
        return ['Physical', 'Social', 'Mental'].every(cat => {
            const limit = s.prios.attr[cat] || 0;
            let spent = 0;
            ATTRIBUTES[cat].forEach(a => { const val = parseInt(s.dots.attr[a] || 1); spent += (val - 1); });
            return spent === limit;
        });
    }
    if (step === 3) {
        const prios = Object.values(s.prios.abil || {});
        if (prios.length !== 3 || !prios.includes(13) || !prios.includes(9) || !prios.includes(5)) return false;
        return ['Talents', 'Skills', 'Knowledges'].every(cat => {
            const limit = s.prios.abil[cat] || 0;
            let spent = 0;
            ABILITIES[cat].forEach(a => spent += parseInt(s.dots.abil[a] || 0));
            if (s.customAbilityCategories) { Object.entries(s.customAbilityCategories).forEach(([name, c]) => { if (c === cat) spent += parseInt(s.dots.abil[name] || 0); }); }
            return spent === limit;
        });
    }
    if (step === 4) {
        const discSpent = Object.values(s.dots.disc || {}).reduce((a, b) => a + parseInt(b||0), 0);
        const backSpent = Object.values(s.dots.back || {}).reduce((a, b) => a + parseInt(b||0), 0);
        const virtTotal = VIRTUES.reduce((a, v) => a + parseInt(s.dots.virt[v] || 1), 0);
        return discSpent === 3 && backSpent === 5 && virtTotal === 10;
    }
    return true;
}

function checkCreationComplete() { return checkStepComplete(1) && checkStepComplete(2) && checkStepComplete(3) && checkStepComplete(4); }

window.updateWalkthrough = function() {
    if (window.state.isPlayMode) { document.getElementById('walkthrough-guide').classList.add('opacity-0', 'pointer-events-none'); return; } 
    else { document.getElementById('walkthrough-guide').classList.remove('opacity-0', 'pointer-events-none'); }
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    const isComplete = checkStepComplete(current);
    const msgEl = document.getElementById('guide-message');
    const iconEl = document.getElementById('guide-icon');
    const stepData = STEPS_CONFIG.find(s => s.id === current);
    if (current < furthest) {
        msgEl.innerText = `Return to Step ${furthest}`;
        msgEl.className = "bg-gray-900/90 border border-gray-500 text-gray-300 px-4 py-2 rounded text-xs font-bold shadow-lg w-48 text-right";
        iconEl.classList.add('ready'); 
    } else {
        if (isComplete) {
            msgEl.innerText = "Step Complete! Next >>";
            msgEl.className = "bg-green-900/90 border border-green-500 text-green-100 px-4 py-2 rounded text-xs font-bold shadow-lg w-48 text-right";
            iconEl.classList.add('ready');
        } else {
            msgEl.innerText = stepData ? stepData.msg : "Continue...";
            msgEl.className = "bg-black/90 border border-[#d4af37] text-[#f0e6d2] px-4 py-2 rounded text-xs font-bold shadow-lg w-48 text-right";
            iconEl.classList.remove('ready');
        }
    }
};

window.nextStep = function() {
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    if (current < furthest) window.changeStep(furthest);
    else if (checkStepComplete(current)) { if (current < 8) window.changeStep(current + 1); else showNotification("Character Ready!"); } 
    else showNotification("Complete current step first!");
};

window.updatePools = function() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    // Init temporary willpower if missing (backward compatibility)
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    // Init health states if missing
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];

    // Ensure freebieSpend object exists if not present
    if (!window.state.freebieSpend) window.state.freebieSpend = { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} };

    if (!window.state.freebieMode && !window.state.isPlayMode) {
        const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
        const bW = (window.state.dots.virt?.Courage || 1);
        window.state.status.humanity = bH;
        window.state.status.willpower = bW;
        // In creation, temp syncs with permanent unless deliberately changed later
        window.state.status.tempWillpower = bW;
    }
    const curH = window.state.status.humanity;
    const curW = window.state.status.willpower; // Permanent rating
    const tempW = window.state.status.tempWillpower; // Current pool
    const gen = parseInt(document.getElementById('c-gen')?.value) || 13;
    const lim = GEN_LIMITS[gen] || GEN_LIMITS[13];

    // Update standard dot rows (Attribute/Ability/Disc/Back/Virt)
    // We reuse logic to find all dot-rows and refresh their visual state
    document.querySelectorAll('.dot-row').forEach(el => {
        const name = el.dataset.n;
        const type = el.dataset.t;
        if (name && type && window.state.dots[type]) {
            const val = window.state.dots[type][name] || 0; 
            const freebies = (window.state.freebieSpend[type] && window.state.freebieSpend[type][name]) || 0;
            el.innerHTML = renderDots(val, 5, freebies);
        }
    });

    // Prio displays
    Object.keys(ATTRIBUTES).forEach(cat => {
        let cs = 0; ATTRIBUTES[cat].forEach(a => cs += ((window.state.dots.attr[a] || 1) - 1));
        const targetId = (cat === 'Social') ? 'p-social' : (cat === 'Mental') ? 'p-mental' : 'p-phys';
        setSafeText(targetId, `[${Math.max(0, (window.state.prios.attr[cat] || 0) - cs)}]`);
    });
    Object.keys(ABILITIES).forEach(cat => {
        let cs = 0; ABILITIES[cat].forEach(a => cs += (window.state.dots.abil[a] || 0));
        if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === cat && window.state.dots.abil[name]) cs += window.state.dots.abil[name]; }); }
        setSafeText('p-' + cat.toLowerCase().slice(0,3), `[${Math.max(0, (window.state.prios.abil[cat] || 0) - cs)}]`);
    });
    const discSpent = Object.values(window.state.dots.disc || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-disc', `[${Math.max(0, 3 - discSpent)}]`);
    const backSpent = Object.values(window.state.dots.back || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-back', `[${Math.max(0, 5 - backSpent)}]`);
    const virtTotalDots = VIRTUES.reduce((a, v) => a + (window.state.dots.virt[v] || 1), 0);
    setSafeText('p-virt', `[${Math.max(0, 7 - (virtTotalDots - 3))}]`);

    if (window.state.freebieMode) {
         const totalSpent = calculateTotalFreebiesSpent(window.state);
         setSafeText('f-total-top', totalSpent); 
         let attrDots = 0; Object.keys(ATTRIBUTES).forEach(cat => ATTRIBUTES[cat].forEach(a => attrDots += (window.state.dots.attr[a] || 1)));
         setSafeText('sb-attr', Math.max(0, attrDots - 24) * 5);
         let abilDots = 0; Object.keys(ABILITIES).forEach(cat => { ABILITIES[cat].forEach(a => abilDots += (window.state.dots.abil[a] || 0)); if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === cat && window.state.dots.abil[name]) abilDots += window.state.dots.abil[name]; }); } });
         setSafeText('sb-abil', Math.max(0, abilDots - 27) * 2);
         setSafeText('sb-disc', Math.max(0, discSpent - 3) * 7);
         setSafeText('sb-back', Math.max(0, backSpent - 5) * 1);
         setSafeText('sb-virt', Math.max(0, (virtTotalDots-3) - 7) * 2);
         const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
         const bW = (window.state.dots.virt?.Courage || 1);
         const cH = window.state.status.humanity !== undefined ? window.state.status.humanity : bH;
         const cW = window.state.status.willpower !== undefined ? window.state.status.willpower : bW;
         setSafeText('sb-human', Math.max(0, cH - bH) * 2);
         setSafeText('sb-will', Math.max(0, cW - bW) * 1);
         let mfCost = 0, mfBonus = 0;
         if (window.state.merits) window.state.merits.forEach(m => mfCost += (parseInt(m.val) || 0));
         if (window.state.flaws) window.state.flaws.forEach(f => mfBonus += (parseInt(f.val) || 0));
         const cappedBonus = Math.min(mfBonus, 7);
         setSafeText('sb-merit', mfCost);
         setSafeText('sb-flaw', `+${cappedBonus}`);
         const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
         setSafeText('sb-total', limit - totalSpent);
         document.getElementById('freebie-sidebar').classList.add('active'); 
    } else {
         document.getElementById('freebie-sidebar').classList.remove('active');
    }

    const fbBtn = document.getElementById('toggle-freebie-btn');
    if (fbBtn) {
        const complete = checkCreationComplete();
        // Allow toggle always (user request), unless totally incomplete maybe? 
        // User asked: "Freebie mode to still be toggleable even if the freebie points have all been spent"
        // And "When in edit mode only".
        if (window.state.isPlayMode) fbBtn.disabled = true;
        else fbBtn.disabled = false; // Always enabled in edit mode
    }

    const p8h = document.getElementById('phase8-humanity-dots');
    if(p8h) {
        // Freebie logic for humanity? status traits are tricky.
        // We track them via status object, but can track spend in freebieSpend.status?
        // Implementing simple rendering for now.
        p8h.innerHTML = renderDots(curH, 10);
        p8h.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) setDots('Humanity', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }
    const p8w = document.getElementById('phase8-willpower-dots');
    if(p8w) {
        p8w.innerHTML = renderDots(curW, 10);
        p8w.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) setDots('Willpower', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }

    document.querySelectorAll('#humanity-dots-play').forEach(el => el.innerHTML = renderDots(curH, 10));
    document.querySelectorAll('#willpower-dots-play').forEach(el => el.innerHTML = renderDots(curW, 10));
    
    // UPDATED PLAY MODE BOX RENDERING
    // Willpower: Max count = Permanent Rating (curW). Checked = Temp Rating (tempW).
    document.querySelectorAll('#willpower-boxes-play').forEach(el => el.innerHTML = renderBoxes(curW, tempW, 'wp'));
    
    // --- 20 BOX BLOOD POOL IMPLEMENTATION ---
    const bpContainer = document.querySelectorAll('#blood-boxes-play');
    bpContainer.forEach(el => {
        let h = '';
        const currentBlood = window.state.status.blood || 0;
        const maxBloodForGen = lim.m;
        
        for (let i = 1; i <= 20; i++) {
            let classes = "box";
            if (i <= currentBlood) classes += " checked";
            
            // Visual locking for blood exceeding Gen limit
            // Changed from opacity-20 to opacity-50 for better visibility per user request
            // Added explicit styling to ensure they look like 'empty slots' rather than missing
            if (i > maxBloodForGen) {
                classes += " cursor-not-allowed opacity-50 bg-[#1a1a1a]"; 
            } else {
                classes += " cursor-pointer";
            }
            // Pointer events none prevents clicking, but we keep them visible
            if (i > maxBloodForGen) classes += " pointer-events-none";
            
            h += `<span class="${classes}" data-v="${i}" data-type="blood"></span>`;
        }
        el.innerHTML = h;
    });
    // ----------------------------------------
    
    const healthCont = document.getElementById('health-chart-play');
    if(healthCont && healthCont.children.length === 0) {
         HEALTH_STATES.forEach((h, i) => {
            const d = document.createElement('div'); d.className = 'flex justify-between items-center text-[10px] uppercase border-b border-[#333] py-2 font-bold';
            d.innerHTML = `<span>${h.l}</span><div class="flex gap-3"><span>${h.p !== 0 ? h.p : ''}</span><div class="box" data-v="${i+1}" data-type="health"></div></div>`;
            healthCont.appendChild(d);
        });
    }
    // Update Health Boxes (Clicking box N means "Damage Level N" reached)
    const healthStates = window.state.status.health_states || [0,0,0,0,0,0,0];
    document.querySelectorAll('#health-chart-play .box').forEach((box, i) => {
        box.classList.remove('checked'); // Remove old check logic
        box.dataset.state = healthStates[i] || 0; // Apply new cycle logic
    });
    
    const cList = document.getElementById('combat-list-create');
    if(cList && window.state.inventory) {
        cList.innerHTML = '';
        window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => {
             let display = w.displayName || w.name;
             const r = document.createElement('div');
             r.className = "grid grid-cols-6 gap-2 text-[10px] border-b border-[#222] py-1 text-center text-white items-center";
             r.innerHTML = `
                <div class="col-span-2 text-left pl-2 font-bold text-gold truncate">${display}</div>
                <div>${w.stats.diff}</div>
                <div class="text-gold font-bold">${w.stats.dmg}</div>
                <div>${w.stats.range}</div>
                <div>${w.stats.clip}</div>
             `;
             cList.appendChild(r);
        });
        
        let totalArmor = 0; let totalPenalty = 0; let activeArmor = [];
        window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => {
            totalArmor += parseInt(a.stats?.rating) || 0;
            totalPenalty += parseInt(a.stats?.penalty) || 0;
            activeArmor.push(a.displayName || a.name);
        });
        setSafeText('total-armor-rating', totalArmor);
        setSafeText('total-armor-penalty', totalPenalty);
        setSafeText('active-armor-names', activeArmor.length > 0 ? activeArmor.join(', ') : "None");
    }
    window.updateWalkthrough();
};

// ============================================
// NEW: Helper to refresh specific row UI
// ============================================
function refreshTraitRow(label, type) {
    const safeId = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
    const rowDiv = document.getElementById(safeId);
    if(!rowDiv) return; // Should exist if rendered by renderRow

    const min = (type === 'attr') ? 1 : 0;
    const val = window.state.dots[type][label] || min;
    const max = 5;
    // FREEBIE CHECK
    const freebies = (window.state.freebieSpend[type] && window.state.freebieSpend[type][label]) || 0;

    // Recalculate specialty logic (Copied from renderRow)
    let showSpecialty = false;
    let warningMsg = "";

    if (type !== 'virt') {
        if (type === 'attr') {
            if (val >= 4) showSpecialty = true;
        } else if (type === 'abil') {
            if (val >= 1) {
                showSpecialty = true;
                if (!BROAD_ABILITIES.includes(label) && val < 4) {
                    warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                } else if (BROAD_ABILITIES.includes(label)) {
                    warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
                }
            }
        }
    }

    let specInputHTML = '';
    if (showSpecialty) {
        const specVal = window.state.specialties[label] || "";
        // Hide logic for Play Mode + Empty
        if (window.state.isPlayMode && !specVal) {
            specInputHTML = '<div class="flex-1"></div>'; 
        } else {
            const listId = `list-${label.replace(/[^a-zA-Z0-9]/g, '')}`;
            let optionsHTML = '';
            if (SPECIALTY_EXAMPLES && SPECIALTY_EXAMPLES[label]) {
                optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
            }
            
            specInputHTML = `
                <div class="flex-1 mx-2 relative">
                    <input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}">
                    <datalist id="${listId}">${optionsHTML}</datalist>
                </div>
            `;
        }
    } else {
        specInputHTML = '<div class="flex-1"></div>'; 
    }

    rowDiv.innerHTML = `
        <span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap cursor-pointer hover:text-gold">${label}</span>
        ${specInputHTML}
        <div class="dot-row flex-shrink-0" data-n="${label}" data-t="${type}">${renderDots(val, max, freebies)}</div>
    `;

    rowDiv.querySelector('.trait-label').onclick = () => { if(window.state.isPlayMode) window.handleTraitClick(label, type); };
    rowDiv.querySelector('.dot-row').onclick = (e) => { if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); };
    
    if(showSpecialty && (!window.state.isPlayMode || (window.state.isPlayMode && window.state.specialties[label]))) {
        const input = rowDiv.querySelector('input');
        if(input) {
            input.onblur = (e) => { window.state.specialties[label] = e.target.value; };
            if (warningMsg) { input.onfocus = () => showNotification(warningMsg); }
            input.disabled = window.state.isPlayMode;
        }
    }
}

function setDots(name, type, val, min, max = 5) {
    if (window.state.isPlayMode) return;
    if (type === 'status') {
        if (!window.state.freebieMode) return;
        if (name === 'Humanity') window.state.status.humanity = val;
        else if (name === 'Willpower') {
            window.state.status.willpower = val;
            window.state.status.tempWillpower = val; // Sync temp when permanent changes
        }
        if (calculateTotalFreebiesSpent(window.state) > (parseInt(document.getElementById('c-freebie-total')?.value) || 15)) { showNotification("Freebie Limit Exceeded!"); return; }
        window.updatePools(); return;
    }
    const currentVal = window.state.dots[type][name] || min;
    let newVal = val;
    if (val === currentVal) newVal = val - 1;
    if (newVal < min) newVal = min;

    // -- LOGIC UPDATE: Freebie vs Base differentiation --
    if (window.state.freebieMode) {
        // Calculate direction
        const diff = newVal - currentVal;
        
        // Ensure state exists
        if(!window.state.freebieSpend) window.state.freebieSpend = { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} };
        if(!window.state.freebieSpend[type]) window.state.freebieSpend[type] = {};
        
        const currentSpend = window.state.freebieSpend[type][name] || 0;

        if (diff > 0) {
            // Increasing in Freebie Mode -> Increases Spend
            window.state.freebieSpend[type][name] = currentSpend + diff;
        } else if (diff < 0) {
            // Decreasing in Freebie Mode -> Decreases Spend first
            // If we have spend, reduce it. 
            // Example: Val 4, Spend 1. Click 3. Diff -1. Spend becomes 0.
            // Example: Val 4, Spend 0. Click 3. Diff -1. Spend stays 0.
            const reduceAmount = Math.min(Math.abs(diff), currentSpend);
            window.state.freebieSpend[type][name] = currentSpend - reduceAmount;
        }

        const tempState = JSON.parse(JSON.stringify(window.state));
        if (!tempState.dots[type]) tempState.dots[type] = {};
        tempState.dots[type][name] = newVal;
        const projectedCost = calculateTotalFreebiesSpent(tempState);
        const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
        if (projectedCost > limit) { 
            // Revert local spend change if failed
            window.state.freebieSpend[type][name] = currentSpend; 
            showNotification("Freebie Limit Exceeded!"); 
            return; 
        }
    } else {
        // Standard Mode checks (Base Limits)
        // Note: We don't touch freebieSpend here, only dots.
        // But we should prevent reducing dots below the "Freebie Base"?
        // Actually, V20 rules usually imply you buy freebies ON TOP of base.
        // If user reduces dots in Base mode, it effectively acts as reducing base.
        // We will allow it for flexibility.
        
        if (type === 'attr') {
            let group = null; Object.keys(ATTRIBUTES).forEach(k => { if(ATTRIBUTES[k].includes(name)) group = k; });
            if (group) {
                 const limit = window.state.prios.attr[group];
                 if (limit === undefined) { showNotification(`Select priority for ${group}!`); return; }
                 let currentSpent = 0;
                 ATTRIBUTES[group].forEach(a => { if (a !== name) { const v = window.state.dots.attr[a] || 1; currentSpent += (v - 1); } });
                 if (currentSpent + (newVal - 1) > limit) { showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'abil') {
            if (newVal > 3) { showNotification("Max 3 dots in Abilities during creation!"); return; }
            let group = null; Object.keys(ABILITIES).forEach(k => { if(ABILITIES[k].includes(name)) group = k; });
            if (!group && window.state.customAbilityCategories && window.state.customAbilityCategories[name]) group = window.state.customAbilityCategories[name];
            if (group) {
                const limit = window.state.prios.abil[group];
                if (limit === undefined) { showNotification(`Select priority for ${group}!`); return; }
                let currentSpent = 0; ABILITIES[group].forEach(a => { if (a !== name) currentSpent += (window.state.dots.abil[a] || 0); });
                if (window.state.customAbilityCategories) { Object.keys(window.state.dots.abil).forEach(k => { if (k !== name && window.state.customAbilityCategories[k] === group) currentSpent += (window.state.dots.abil[k] || 0); }); }
                if (currentSpent + newVal > limit) { showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'disc') {
            let currentSpent = 0; Object.keys(window.state.dots.disc).forEach(d => { if (d !== name) currentSpent += (window.state.dots.disc[d] || 0); });
            if (currentSpent + newVal > 3) { showNotification("Max 3 Creation Dots!"); return; }
        } else if (type === 'back') {
            let currentSpent = 0; Object.keys(window.state.dots.back).forEach(b => { if (b !== name) currentSpent += (window.state.dots.back[b] || 0); });
            if (currentSpent + newVal > 5) { showNotification("Max 5 Creation Dots!"); return; }
        } else if (type === 'virt') {
            let currentSpent = 0; VIRTUES.forEach(v => { if (v !== name) currentSpent += (window.state.dots.virt[v] || 1); });
            if ((currentSpent + newVal) > 10) { showNotification("Max 7 Creation Dots!"); return; }
        }
    }
    window.state.dots[type][name] = newVal;
    if (type === 'virt' && !window.state.isPlayMode && !window.state.freebieMode) {
         const con = window.state.dots.virt.Conscience || 1;
         const self = window.state.dots.virt["Self-Control"] || 1;
         const cou = window.state.dots.virt.Courage || 1;
         window.state.status.humanity = con + self;
         window.state.status.willpower = cou;
         window.state.status.tempWillpower = cou;
    }
    
    // UPDATED: Refresh Logic
    if (type === 'attr' || type === 'abil') {
        // Full Refresh needed to toggle Specialty input
        refreshTraitRow(name, type);
    } else {
        // Just update dots for other types (passing freebie count)
        const freebies = (window.state.freebieSpend && window.state.freebieSpend[type] && window.state.freebieSpend[type][name]) || 0;
        document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`).forEach(el => el.innerHTML = renderDots(newVal, max, freebies));
    }
    window.updatePools();
}

function renderRow(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    const val = window.state.dots[type][label] || min;
    const div = document.createElement('div'); 
    
    // Assign ID for easier refresh
    div.id = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
    
    // Check for specialty eligibility
    let showSpecialty = false;
    let warningMsg = "";

    if (type !== 'virt') {
        if (type === 'attr') {
            if (val >= 4) showSpecialty = true;
        } else if (type === 'abil') {
            if (val >= 1) {
                showSpecialty = true;
                if (!BROAD_ABILITIES.includes(label) && val < 4) {
                    warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                } else if (BROAD_ABILITIES.includes(label)) {
                    warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
                }
            }
        }
    }

    // HTML Construction: Flex row to handle "Name - Specialty - Dots"
    div.className = 'flex items-center justify-between w-full py-1';
    
    let specInputHTML = '';
    if (showSpecialty) {
        const specVal = window.state.specialties[label] || "";
        // Hide logic for Play Mode + Empty
        if (window.state.isPlayMode && !specVal) {
            specInputHTML = '<div class="flex-1"></div>'; 
        } else {
            const listId = `list-${label.replace(/[^a-zA-Z0-9]/g, '')}`;
            let optionsHTML = '';
            if (SPECIALTY_EXAMPLES && SPECIALTY_EXAMPLES[label]) {
                optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
            }
            
            specInputHTML = `
                <div class="flex-1 mx-2 relative">
                    <input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}">
                    <datalist id="${listId}">${optionsHTML}</datalist>
                </div>
            `;
        }
    } else {
        // Spacer to keep layout somewhat consistent if desired, or just nothing for "Name .... Dots"
        specInputHTML = '<div class="flex-1"></div>'; 
    }

    // Calculate freebies for rendering blue dots
    const freebies = (window.state.freebieSpend && window.state.freebieSpend[type] && window.state.freebieSpend[type][label]) || 0;

    div.innerHTML = `
        <span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap cursor-pointer hover:text-gold">${label}</span>
        ${specInputHTML}
        <div class="dot-row flex-shrink-0" data-n="${label}" data-t="${type}">${renderDots(val, max, freebies)}</div>
    `;

    div.querySelector('.trait-label').onclick = () => { if(window.state.isPlayMode) window.handleTraitClick(label, type); };
    div.querySelector('.dot-row').onclick = (e) => { if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); };
    
    // Attach specialty input listeners if present
    if(showSpecialty && (!window.state.isPlayMode || (window.state.isPlayMode && window.state.specialties[label]))) {
        const input = div.querySelector('input');
        if(input) {
            input.onblur = (e) => { window.state.specialties[label] = e.target.value; };
            if (warningMsg) { input.onfocus = () => showNotification(warningMsg); }
            input.disabled = window.state.isPlayMode;
        }
    }

    cont.appendChild(div);
}

window.handleTraitClick = function(name, type) {
    const val = window.state.dots[type][name] || 0;
    const existingIdx = window.state.activePool.findIndex(p => p.name === name);
    if (existingIdx > -1) window.state.activePool.splice(existingIdx, 1);
    else { if (window.state.activePool.length >= 2) window.state.activePool.shift(); window.state.activePool.push({name, val}); }
    document.querySelectorAll('.trait-label').forEach(el => el.classList.toggle('selected', window.state.activePool.some(p => p.name === el.innerText)));
    const display = document.getElementById('pool-display');
    const hint = document.getElementById('specialty-hint');
    
    // Create specialty hint container if missing (dynamic insertion)
    if (!hint && display) {
        const hDiv = document.createElement('div');
        hDiv.id = 'specialty-hint';
        hDiv.className = 'text-[9px] text-[#4ade80] mt-1 h-4 flex items-center';
        display.parentNode.insertBefore(hDiv, display.nextSibling);
    }
    
    if (window.state.activePool.length > 0) {
        setSafeText('pool-display', window.state.activePool.map(p => `${p.name} (${p.val})`).join(' + '));
        
        // Scan for potential specialties
        const specs = window.state.activePool
            .map(p => window.state.specialties[p.name])
            .filter(s => s); // remove empty/undefined
            
        const hintEl = document.getElementById('specialty-hint');
        if (hintEl) {
            if (specs.length > 0) {
                 // Check if already applied
                 const isApplied = document.getElementById('use-specialty')?.checked;
                 
                 if(isApplied) {
                     hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`;
                 } else {
                     hintEl.innerHTML = `
                        <span>Possible Specialty: ${specs.join(', ')}</span>
                        <button id="apply-spec-btn" class="ml-2 bg-[#d4af37] text-black px-1 rounded hover:bg-white pointer-events-auto text-[9px] font-bold uppercase">APPLY</button>
                     `;
                     // Bind click
                     const btn = document.getElementById('apply-spec-btn');
                     if(btn) {
                         btn.onclick = (e) => {
                             e.stopPropagation(); 
                             const cb = document.getElementById('use-specialty');
                             if(cb) {
                                 cb.checked = true;
                                 showNotification(`Applied: ${specs.join(', ')}`);
                                 // Refresh hint text immediately to show active state
                                 hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`;
                             }
                         };
                     }
                 }
            } else {
                hintEl.innerHTML = '';
            }
        }
        
        document.getElementById('dice-tray').classList.add('open');
    } else { window.clearPool(); }
};

function renderDynamicAdvantageRow(containerId, type, list, isAbil = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    let existingItems = [];
    if (type === 'abil') {
        let category = '';
        if (containerId === 'custom-talents') category = 'Talents';
        else if (containerId === 'custom-skills') category = 'Skills';
        else if (containerId === 'custom-knowledges') category = 'Knowledges';
        if (window.state.customAbilityCategories) { existingItems = Object.keys(window.state.dots.abil).filter(k => window.state.customAbilityCategories[k] === category); }
    } else { if (window.state.dots[type]) existingItems = Object.keys(window.state.dots[type]); }

    const buildRow = (name = "") => {
        const row = document.createElement('div'); 
        // Layout: Flex Row for Name - Specialty - Dots - Remove
        row.className = 'flex items-center justify-between gap-1 mb-2 advantage-row w-full';
        
        // 1. Input/Select (Name)
        let inputField;
        if (isAbil) { 
            inputField = document.createElement('input'); 
            inputField.type = 'text'; 
            inputField.placeholder = "Write-in..."; 
            // Name should be bold, font slightly larger than specialty
            inputField.className = 'font-bold uppercase !bg-black/20 !border-b !border-[#333] text-[11px] w-24 flex-shrink-0'; 
            inputField.value = name; 
        } else { 
            inputField = document.createElement('select'); 
            inputField.className = 'font-bold uppercase text-[11px] w-24 flex-shrink-0'; 
            inputField.innerHTML = `<option value="">-- Choose ${type} --</option>` + list.map(item => `<option value="${item}" ${item === name ? 'selected' : ''}>${item}</option>`).join(''); 
        }

        // 2. Specialty Logic
        let showSpecialty = false;
        let warningMsg = "";
        if (name && (isAbil || type === 'attr')) { // Logic for custom/dynamic rows
             const currentVal = window.state.dots[type][name] || 0;
             if (currentVal >= 1) {
                 showSpecialty = true;
                 if (currentVal < 4) {
                     warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                 }
                 // Custom abilities check for broadness if name matches standard list, but these are custom writes usually
                 if (BROAD_ABILITIES.includes(name)) warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
             }
        }

        // 3. Specialty Input HTML
        const specWrapper = document.createElement('div');
        specWrapper.className = 'flex-1 mx-2 relative'; // Takes remaining middle space
        
        if (showSpecialty) {
             const specVal = window.state.specialties[name] || "";
             // Hide logic for Play Mode + Empty
             if (window.state.isPlayMode && !specVal) {
                 specWrapper.innerHTML = '';
             } else {
                 const listId = `list-${name.replace(/[^a-zA-Z0-9]/g, '')}`;
                 let optionsHTML = '';
                 if (SPECIALTY_EXAMPLES && SPECIALTY_EXAMPLES[name]) {
                     optionsHTML = SPECIALTY_EXAMPLES[name].map(s => `<option value="${s}">`).join('');
                 }
                 
                 specWrapper.innerHTML = `
                    <input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}">
                    <datalist id="${listId}">${optionsHTML}</datalist>
                 `;
                 const inp = specWrapper.querySelector('input');
                 inp.onblur = (e) => { window.state.specialties[name] = e.target.value; };
                 if(warningMsg) inp.onfocus = () => showNotification(warningMsg);
                 inp.disabled = window.state.isPlayMode;
             }
        }

        // 4. Dots
        const dotCont = document.createElement('div'); 
        dotCont.className = 'dot-row flex-shrink-0';
        const val = name ? (window.state.dots[type][name] || 0) : 0;
        const freebies = (window.state.freebieSpend && window.state.freebieSpend[type] && window.state.freebieSpend[type][name]) || 0;
        dotCont.innerHTML = renderDots(val, 5, freebies);
        if (name) { dotCont.dataset.n = name; dotCont.dataset.t = type; }

        // 5. Remove Button
        const removeBtn = document.createElement('div'); 
        removeBtn.className = 'remove-btn flex-shrink-0 ml-1'; 
        removeBtn.innerHTML = '&times;';
        if (!name) removeBtn.style.visibility = 'hidden';

        // Event Listeners for Update Logic (Same as before)
        let curName = name;
        let category = null;
        if (containerId === 'custom-talents') category = 'Talents'; else if (containerId === 'custom-skills') category = 'Skills'; else if (containerId === 'custom-knowledges') category = 'Knowledges';
        
        const onUpdate = (newVal) => {
            if (curName && curName !== newVal) { 
                const dots = window.state.dots[type][curName]; delete window.state.dots[type][curName]; 
                if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName];
                if (newVal) window.state.dots[type][newVal] = dots || 0; 
                // Migrate specialty if name changes
                if(window.state.specialties[curName]) {
                    window.state.specialties[newVal] = window.state.specialties[curName];
                    delete window.state.specialties[curName];
                }
            }
            curName = newVal;
            if (newVal) { 
                window.state.dots[type][newVal] = window.state.dots[type][newVal] || 0; 
                dotCont.innerHTML = renderDots(window.state.dots[type][newVal], 5);
                dotCont.dataset.n = newVal; dotCont.dataset.t = type;
                if (category) { if (!window.state.customAbilityCategories) window.state.customAbilityCategories = {}; window.state.customAbilityCategories[newVal] = category; }
                if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; buildRow(); }
            }
            window.updatePools();
        };
        
        if (isAbil) inputField.onblur = (e) => onUpdate(e.target.value); else inputField.onchange = (e) => onUpdate(e.target.value);
        
        removeBtn.onclick = () => { if (curName) { delete window.state.dots[type][curName]; if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName]; } row.remove(); window.updatePools(); };
        
        dotCont.onclick = (e) => { 
            if (!curName || !e.target.dataset.v) return; 
            let val = parseInt(e.target.dataset.v);
            const currentVal = window.state.dots[type][curName] || 0;
            if (val === currentVal) val = val - 1;
            
            // NOTE: Reuse setDots logic via direct call instead of copy-paste to ensure freebie logic applies
            // But setDots handles rendering.
            setDots(curName, type, val, 0, 5);
            
            // --- UPDATED LOGIC TO RE-RENDER FOR SPECIALTY INPUT ---
            // If we cross 0->1 or 1->0, we need to rebuild the row to show/hide specialty
            const wasZero = currentVal === 0;
            const isZero = val === 0;
            if (wasZero !== isZero) {
                // Simplest way to refresh structure for dynamic row is to replace it
                // But we want to keep focus if possible? Or just rebuild.
                // Since this function is closed over `row`, we can't easily recall `buildRow` on the same element.
                // We will manually update the specWrapper HTML
                let showSpecialty = false;
                let warningMsg = "";
                if (curName && (isAbil || type === 'attr') && val >= 1) {
                     showSpecialty = true;
                     if (val < 4) warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                     if (BROAD_ABILITIES.includes(curName)) warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
                }
                
                specWrapper.innerHTML = '';
                if (showSpecialty) {
                     const specVal = window.state.specialties[curName] || "";
                     // Hide logic for Play Mode + Empty
                     if (window.state.isPlayMode && !specVal) {
                         // Keep empty
                     } else {
                         const listId = `list-${curName.replace(/[^a-zA-Z0-9]/g, '')}`;
                         let optionsHTML = '';
                         if (SPECIALTY_EXAMPLES && SPECIALTY_EXAMPLES[curName]) {
                             optionsHTML = SPECIALTY_EXAMPLES[curName].map(s => `<option value="${s}">`).join('');
                         }
                         
                         specWrapper.innerHTML = `
                            <input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}">
                            <datalist id="${listId}">${optionsHTML}</datalist>
                         `;
                         const inp = specWrapper.querySelector('input');
                         inp.onblur = (e) => { window.state.specialties[curName] = e.target.value; };
                         if(warningMsg) inp.onfocus = () => showNotification(warningMsg);
                         inp.disabled = window.state.isPlayMode;
                     }
                }
            }
            // -------------------------------------------------------
        };

        row.appendChild(inputField);
        row.appendChild(specWrapper);
        row.appendChild(dotCont);
        row.appendChild(removeBtn);
        container.appendChild(row);
    };
    existingItems.forEach(item => buildRow(item));
    buildRow();
}

function renderDynamicTraitRow(containerId, type, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const stateArray = type === 'Merit' ? (window.state.merits || []) : (window.state.flaws || []);
    container.innerHTML = '';
    const appendRow = (data = null) => {
        const row = document.createElement('div'); row.className = 'flex gap-2 items-center mb-2 trait-row';
        let options = `<option value="">-- Select ${type} --</option>`;
        list.forEach(item => {
            const rangeText = item.range ? `(${item.range}pt)` : `(${item.v}pt)`;
            options += `<option value="${item.n}" data-val="${item.v}" data-var="${item.variable||false}">${item.n} ${rangeText}</option>`;
        });
        options += '<option value="Custom">-- Custom / Write-in --</option>';
        row.innerHTML = `<div class="flex-1 relative"><select class="w-full text-[11px] font-bold uppercase bg-[#111] text-white border-b border-[#444]">${options}</select><input type="text" placeholder="Custom Name..." class="hidden w-full text-[11px] font-bold uppercase border-b border-[#444] bg-transparent text-white"></div><input type="number" class="w-10 text-center text-[11px] !border !border-[#444] font-bold" min="1"><div class="remove-btn">&times;</div>`;
        container.appendChild(row);
        const selectEl = row.querySelector('select');
        const textEl = row.querySelector('input[type="text"]');
        const numEl = row.querySelector('input[type="number"]');
        const removeBtn = row.querySelector('.remove-btn');
        const isLocked = !window.state.freebieMode;
        selectEl.disabled = isLocked; textEl.disabled = isLocked; numEl.disabled = isLocked;
        if(isLocked) { selectEl.classList.add('opacity-50'); textEl.classList.add('opacity-50'); numEl.classList.add('opacity-50'); }
        if (data) {
            const exists = list.some(l => l.n === data.name);
            if (exists) {
                selectEl.value = data.name; numEl.value = data.val;
                const itemData = list.find(l => l.n === data.name);
                if (itemData && !itemData.variable) { numEl.disabled = true; numEl.classList.add('opacity-50'); }
            } else { selectEl.value = "Custom"; selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.value = data.name; numEl.value = data.val; }
        } else { numEl.value = ""; removeBtn.style.visibility = 'hidden'; }
        const syncState = () => {
            const allRows = container.querySelectorAll('.trait-row');
            const newState = [];
            allRows.forEach(r => {
                const s = r.querySelector('select');
                const t = r.querySelector('input[type="text"]');
                const n = r.querySelector('input[type="number"]');
                let name = s.value === 'Custom' ? t.value : s.value;
                let val = parseInt(n.value) || 0;
                if (name && name !== 'Custom') newState.push({ name, val });
            });
            if (type === 'Merit') window.state.merits = newState; else window.state.flaws = newState;
            window.updatePools();
        };
        selectEl.addEventListener('change', (e) => {
            if (selectEl.value === 'Custom') { selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.focus(); numEl.value = 1; numEl.disabled = false; numEl.classList.remove('opacity-50'); } 
            else if (selectEl.value) {
                const opt = selectEl.options[selectEl.selectedIndex];
                const baseVal = opt.dataset.val;
                const isVar = opt.dataset.var === "true";
                numEl.value = baseVal;
                if (!isVar) { numEl.disabled = true; numEl.classList.add('opacity-50'); } else { numEl.disabled = false; numEl.classList.remove('opacity-50'); }
                if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); }
            } else { numEl.value = ""; numEl.disabled = false; }
            syncState();
        });
        textEl.addEventListener('blur', () => { if (textEl.value === "") { textEl.classList.add('hidden'); selectEl.classList.remove('hidden'); selectEl.value = ""; } else { if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); } } syncState(); });
        numEl.addEventListener('change', syncState);
        removeBtn.addEventListener('click', () => { row.remove(); syncState(); });
    };
    if (stateArray.length > 0) stateArray.forEach(d => appendRow(d));
    appendRow();
}
