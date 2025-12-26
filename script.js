import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DATA IMPORT ---
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
        notif.innerText = "Error: " + msg;
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

// --- INJECT CUSTOM STYLES ---
const style = document.createElement('style');
style.innerHTML = `
    .dot.freebie { background-color: #3b82f6 !important; box-shadow: 0 0 4px #3b82f6; }
`;
document.head.appendChild(style);

// --- STATE ---
window.state = {
    isPlayMode: false, freebieMode: false, activePool: [], currentPhase: 1, furthestPhase: 1,
    dots: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    freebieSpend: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    prios: { attr: {}, abil: {} },
    status: { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 },
    specialties: {}, 
    socialExtras: {}, textFields: {}, havens: [], bloodBonds: [], vehicles: [], customAbilityCategories: {},
    derangements: [], merits: [], flaws: [], inventory: [],
    meta: { filename: "", folder: "" } 
};

let user = null;
const BROAD_ABILITIES = ["Crafts", "Science"];

// --- HELPERS ---
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

function renderDots(count, max = 5, freebieCount = 0) { 
    let h = ''; 
    const baseCount = count - freebieCount;
    for(let i=1; i<=max; i++) {
        let classes = "dot";
        if (i <= count) classes += " filled";
        if (window.state.freebieMode && i > baseCount && i <= count) classes += " freebie";
        h += `<span class="${classes}" data-v="${i}"></span>`; 
    }
    return h; 
}

function renderBoxes(count, checked = 0, type = '') { 
    let h = ''; 
    for(let i=1; i<=count; i++) h += `<span class="box ${i <= checked ? 'checked' : ''}" data-v="${i}" data-type="${type}"></span>`; 
    return h; 
}

// --- CORE FUNCTIONS (Defined on window immediately) ---

window.calculateTotalFreebiesSpent = function(tempState = window.state) {
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
};

window.checkStepComplete = function(step) {
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
};

window.checkCreationComplete = function() { return window.checkStepComplete(1) && window.checkStepComplete(2) && window.checkStepComplete(3) && window.checkStepComplete(4); };

window.updatePools = function() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];
    if (!window.state.freebieSpend) window.state.freebieSpend = { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} };

    if (!window.state.freebieMode && !window.state.isPlayMode) {
        const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
        const bW = (window.state.dots.virt?.Courage || 1);
        window.state.status.humanity = bH;
        window.state.status.willpower = bW;
        window.state.status.tempWillpower = bW;
    }
    const curH = window.state.status.humanity;
    const curW = window.state.status.willpower; 
    const tempW = window.state.status.tempWillpower;
    const gen = parseInt(document.getElementById('c-gen')?.value) || 13;
    const lim = GEN_LIMITS[gen] || GEN_LIMITS[13];

    document.querySelectorAll('.dot-row').forEach(el => {
        const name = el.dataset.n;
        const type = el.dataset.t;
        if (name && type && window.state.dots[type]) {
            const val = window.state.dots[type][name] || 0; 
            const freebies = (window.state.freebieSpend[type] && window.state.freebieSpend[type][name]) || 0;
            el.innerHTML = renderDots(val, 5, freebies);
        }
    });

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
         const totalSpent = window.calculateTotalFreebiesSpent(window.state);
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
        if (window.state.isPlayMode) fbBtn.disabled = true;
        else fbBtn.disabled = false; 
    }

    const p8h = document.getElementById('phase8-humanity-dots');
    if(p8h) {
        p8h.innerHTML = renderDots(curH, 10);
        p8h.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) window.setDots('Humanity', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }
    const p8w = document.getElementById('phase8-willpower-dots');
    if(p8w) {
        p8w.innerHTML = renderDots(curW, 10);
        p8w.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) window.setDots('Willpower', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }

    document.querySelectorAll('#humanity-dots-play').forEach(el => el.innerHTML = renderDots(curH, 10));
    document.querySelectorAll('#willpower-dots-play').forEach(el => el.innerHTML = renderDots(curW, 10));
    document.querySelectorAll('#willpower-boxes-play').forEach(el => el.innerHTML = renderBoxes(curW, tempW, 'wp'));
    
    const bpContainer = document.querySelectorAll('#blood-boxes-play');
    bpContainer.forEach(el => {
        let h = '';
        const currentBlood = window.state.status.blood || 0;
        const maxBloodForGen = lim.m;
        for (let i = 1; i <= 20; i++) {
            let classes = "box";
            if (i <= currentBlood) classes += " checked";
            if (i > maxBloodForGen) { classes += " cursor-not-allowed opacity-50 bg-[#1a1a1a] pointer-events-none"; } else { classes += " cursor-pointer"; }
            h += `<span class="${classes}" data-v="${i}" data-type="blood"></span>`;
        }
        el.innerHTML = h;
    });
    
    const healthCont = document.getElementById('health-chart-play');
    if(healthCont && healthCont.children.length === 0) {
         HEALTH_STATES.forEach((h, i) => {
            const d = document.createElement('div'); d.className = 'flex justify-between items-center text-[10px] uppercase border-b border-[#333] py-2 font-bold';
            d.innerHTML = `<span>${h.l}</span><div class="flex gap-3"><span>${h.p !== 0 ? h.p : ''}</span><div class="box" data-v="${i+1}" data-type="health"></div></div>`;
            healthCont.appendChild(d);
        });
    }
    const healthStates = window.state.status.health_states || [0,0,0,0,0,0,0];
    document.querySelectorAll('#health-chart-play .box').forEach((box, i) => {
        box.classList.remove('checked'); 
        box.dataset.state = healthStates[i] || 0; 
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

window.handleTraitClick = function(name, type) {
    const val = window.state.dots[type][name] || 0;
    const existingIdx = window.state.activePool.findIndex(p => p.name === name);
    if (existingIdx > -1) window.state.activePool.splice(existingIdx, 1);
    else { if (window.state.activePool.length >= 2) window.state.activePool.shift(); window.state.activePool.push({name, val}); }
    document.querySelectorAll('.trait-label').forEach(el => el.classList.toggle('selected', window.state.activePool.some(p => p.name === el.innerText)));
    const display = document.getElementById('pool-display');
    const hint = document.getElementById('specialty-hint');
    
    if (!hint && display) {
        const hDiv = document.createElement('div');
        hDiv.id = 'specialty-hint';
        hDiv.className = 'text-[9px] text-[#4ade80] mt-1 h-4 flex items-center';
        display.parentNode.insertBefore(hDiv, display.nextSibling);
    }
    
    if (window.state.activePool.length > 0) {
        setSafeText('pool-display', window.state.activePool.map(p => `${p.name} (${p.val})`).join(' + '));
        
        const specs = window.state.activePool
            .map(p => window.state.specialties[p.name])
            .filter(s => s); 
            
        const hintEl = document.getElementById('specialty-hint');
        if (hintEl) {
            if (specs.length > 0) {
                 const isApplied = document.getElementById('use-specialty')?.checked;
                 
                 if(isApplied) {
                     hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`;
                 } else {
                     hintEl.innerHTML = `
                        <span>Possible Specialty: ${specs.join(', ')}</span>
                        <button id="apply-spec-btn" class="ml-2 bg-[#d4af37] text-black px-1 rounded hover:bg-white pointer-events-auto text-[9px] font-bold uppercase">APPLY</button>
                     `;
                     const btn = document.getElementById('apply-spec-btn');
                     if(btn) {
                         btn.onclick = (e) => {
                             e.stopPropagation(); 
                             const cb = document.getElementById('use-specialty');
                             if(cb) {
                                 cb.checked = true;
                                 showNotification(`Applied: ${specs.join(', ')}`);
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

window.setDots = function(name, type, val, min, max = 5) {
    if (window.state.isPlayMode) return;
    if (type === 'status') {
        if (!window.state.freebieMode) return;
        if (name === 'Humanity') window.state.status.humanity = val;
        else if (name === 'Willpower') {
            window.state.status.willpower = val;
            window.state.status.tempWillpower = val; 
        }
        if (window.calculateTotalFreebiesSpent(window.state) > (parseInt(document.getElementById('c-freebie-total')?.value) || 15)) { showNotification("Freebie Limit Exceeded!"); return; }
        window.updatePools(); return;
    }
    const currentVal = window.state.dots[type][name] || min;
    let newVal = val;
    if (val === currentVal) newVal = val - 1;
    if (newVal < min) newVal = min;

    if (window.state.freebieMode) {
        const diff = newVal - currentVal;
        
        if(!window.state.freebieSpend) window.state.freebieSpend = { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} };
        if(!window.state.freebieSpend[type]) window.state.freebieSpend[type] = {};
        
        const currentSpend = window.state.freebieSpend[type][name] || 0;

        if (diff > 0) {
            window.state.freebieSpend[type][name] = currentSpend + diff;
        } else if (diff < 0) {
            const reduceAmount = Math.min(Math.abs(diff), currentSpend);
            window.state.freebieSpend[type][name] = currentSpend - reduceAmount;
        }

        const tempState = JSON.parse(JSON.stringify(window.state));
        if (!tempState.dots[type]) tempState.dots[type] = {};
        tempState.dots[type][name] = newVal;
        const projectedCost = window.calculateTotalFreebiesSpent(tempState);
        const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
        if (projectedCost > limit) { 
            window.state.freebieSpend[type][name] = currentSpend; 
            showNotification("Freebie Limit Exceeded!"); 
            return; 
        }
    } else {
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
    
    if (type === 'attr' || type === 'abil') {
        window.refreshTraitRow(name, type);
    } else {
        const freebies = (window.state.freebieSpend && window.state.freebieSpend[type] && window.state.freebieSpend[type][name]) || 0;
        document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`).forEach(el => el.innerHTML = renderDots(newVal, max, freebies));
    }
    window.updatePools();
};

window.refreshTraitRow = function(label, type) {
    const safeId = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
    const rowDiv = document.getElementById(safeId);
    if(!rowDiv) return false;

    const min = (type === 'attr') ? 1 : 0;
    const val = window.state.dots[type][label] || min;
    const max = 5;
    const freebies = (window.state.freebieSpend[type] && window.state.freebieSpend[type][label]) || 0;

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
    rowDiv.querySelector('.dot-row').onclick = (e) => { if (e.target.dataset.v) window.setDots(label, type, parseInt(e.target.dataset.v), min, max); };
    
    if(showSpecialty && (!window.state.isPlayMode || (window.state.isPlayMode && window.state.specialties[label]))) {
        const input = rowDiv.querySelector('input');
        if(input) {
            input.onblur = (e) => { window.state.specialties[label] = e.target.value; };
            if (warningMsg) { input.onfocus = () => showNotification(warningMsg); }
            input.disabled = window.state.isPlayMode;
        }
    }
    return true;
};

window.renderRow = function(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    const div = document.createElement('div'); 
    div.id = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, ''); 
    div.className = 'flex items-center justify-between w-full py-1';
    cont.appendChild(div);
    window.refreshTraitRow(label, type); 
};

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

window.renderDerangementsList = function() {
    const cont = document.getElementById('derangements-list');
    if (!cont) return;
    cont.innerHTML = '';
    window.state.derangements.forEach((d, idx) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center text-xs text-white border-b border-[#333] py-1";
        row.innerHTML = `<span>${d}</span><span class="remove-btn text-red-500" onclick="window.removeDerangement(${idx})">&times;</span>`;
        cont.appendChild(row);
    });
    const addRow = document.createElement('div');
    addRow.className = "flex gap-2 mt-2";
    let options = `<option value="">+ Add Derangement</option>` + DERANGEMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
    addRow.innerHTML = `
        <select id="derangement-select" class="flex-1 text-[10px] uppercase font-bold bg-black/40 border border-[#444] text-white p-1">
            ${options} <option value="Custom">Custom...</option>
        </select>
        <input type="text" id="derangement-custom" class="hidden flex-1 text-[10px] bg-black/40 border border-[#444] text-white p-1" placeholder="Type name...">
        <button id="add-derangement-btn" class="bg-[#8b0000] text-white px-2 py-1 text-[10px] font-bold hover:bg-red-700">ADD</button>
    `;
    cont.appendChild(addRow);
    const sel = document.getElementById('derangement-select');
    const inp = document.getElementById('derangement-custom');
    const btn = document.getElementById('add-derangement-btn');
    sel.onchange = () => { if (sel.value === 'Custom') { sel.classList.add('hidden'); inp.classList.remove('hidden'); inp.focus(); } };
    btn.onclick = () => {
        let val = sel.value === 'Custom' ? inp.value : sel.value;
        if (val && val !== 'Custom') { window.state.derangements.push(val); window.renderDerangementsList(); window.updatePools(); }
    };
};
window.removeDerangement = (idx) => { window.state.derangements.splice(idx, 1); window.renderDerangementsList(); window.updatePools(); };

window.renderBloodBondRow = function() {
    const cont = document.getElementById('blood-bond-list'); if (!cont) return;
    const row = document.createElement('div'); row.className = 'flex gap-2 items-center border-b border-[#222] pb-2 advantage-row';
    row.innerHTML = `<select class="w-24 text-[10px] uppercase font-bold mr-2 border-b border-[#333] bg-transparent"><option value="Bond">Bond</option><option value="Vinculum">Vinculum</option></select><input type="text" placeholder="Bound to..." class="flex-1 text-xs"><input type="number" placeholder="Lvl" class="w-10 text-center text-xs" min="1" max="3"><div class="remove-btn">&times;</div>`;
    const typeSel = row.querySelector('select'); const nI = row.querySelector('input[type="text"]'); const rI = row.querySelector('input[type="number"]'); const del = row.querySelector('.remove-btn');
    if (cont.children.length === 0) del.style.visibility = 'hidden';
    const onUpd = () => {
        if (typeSel.value === 'Bond') { rI.max = 3; if(parseInt(rI.value) > 3) rI.value = 3; }
        if (typeSel.value === 'Vinculum') { rI.max = 10; if(parseInt(rI.value) > 10) rI.value = 10; }
        window.state.bloodBonds = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ type: r.querySelector('select').value, name: r.querySelector('input[type="text"]').value, rating: r.querySelector('input[type="number"]').value })).filter(b => b.name);
        if (cont.lastElementChild === row && nI.value !== "") window.renderBloodBondRow();
        window.updatePools(); 
    };
    typeSel.onchange = onUpd; nI.onblur = onUpd; rI.onblur = onUpd; del.onclick = () => { row.remove(); onUpd(); };
    cont.appendChild(row);
};

window.renderDynamicHavenRow = function() {
    const cont = document.getElementById('multi-haven-list'); if (!cont) return;
    const row = document.createElement('div'); row.className = 'border-b border-[#222] pb-4 advantage-row';
    row.innerHTML = `<div class="flex justify-between items-center mb-2"><input type="text" placeholder="Haven Title..." class="flex-1 text-[10px] font-bold text-gold uppercase !border-b !border-[#333]"><div class="remove-btn">&times;</div></div><input type="text" placeholder="Location..." class="text-xs mb-2 !border-b !border-[#333]"><textarea class="h-16 text-xs" placeholder="Details..."></textarea>`;
    const nameIn = row.querySelectorAll('input')[0]; const locIn = row.querySelectorAll('input')[1]; const descIn = row.querySelector('textarea'); const del = row.querySelector('.remove-btn');
    if (cont.children.length === 0) del.style.visibility = 'hidden';
    const onUpd = () => {
        window.state.havens = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ name: r.querySelectorAll('input')[0].value, loc: r.querySelectorAll('input')[1].value, desc: r.querySelector('textarea').value })).filter(h => h.name || h.loc);
        if (cont.lastElementChild === row && nameIn.value !== "") window.renderDynamicHavenRow();
        window.updatePools(); 
    };
    [nameIn, locIn, descIn].forEach(el => el.onblur = onUpd); del.onclick = () => { row.remove(); onUpd(); };
    cont.appendChild(row);
};

window.renderDynamicTraitRow = function(containerId, type, list) {
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
};

window.renderDynamicAdvantageRow = function(containerId, type, list, isAbil = false) {
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
            window.setDots(curName, type, val, 0, 5);
            
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
};

window.updateBackgroundDescriptions = function() {
    const cont = document.getElementById('social-profile-list'); if (!cont) return;
    cont.innerHTML = ''; let hasBackgrounds = false;
    if (window.state.dots.back) { Object.entries(window.state.dots.back).forEach(([name, val]) => { if (val > 0) { renderSocialProfileDescription('social-profile-list', name); hasBackgrounds = true; } }); }
    if (!hasBackgrounds) cont.innerHTML = `<div class="col-span-1 md:col-span-2 text-center text-gray-500 italic py-10">Select Backgrounds in the Advantages section to add descriptions here.</div>`;
    hydrateInputs();
};

window.toggleFreebieMode = function() {
     window.state.freebieMode = !window.state.freebieMode;
     document.body.classList.toggle('freebie-mode', window.state.freebieMode);
     const fbBtn = document.getElementById('toggle-freebie-btn');
     const fbBtnText = document.getElementById('freebie-btn-text');
     if (fbBtnText) fbBtnText.innerText = window.state.freebieMode ? "Exit Freebies" : "Freebies";
     if (fbBtn) { fbBtn.classList.toggle('bg-blue-900/40', window.state.freebieMode); fbBtn.classList.toggle('border-blue-500', window.state.freebieMode); fbBtn.classList.toggle('text-blue-200', window.state.freebieMode); }
     const mMsg = document.getElementById('merit-locked-msg'); const fMsg = document.getElementById('flaw-locked-msg');
     if(mMsg) mMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     if(fMsg) fMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     window.renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
     window.renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
     window.updatePools(); 
};

window.toggleSidebarLedger = function() { document.getElementById('freebie-sidebar').classList.toggle('open'); };

window.togglePlayMode = function() {
    window.state.isPlayMode = !window.state.isPlayMode;
    document.body.classList.toggle('play-mode', window.state.isPlayMode);
    const pBtn = document.getElementById('play-mode-btn'); const pBtnText = document.getElementById('play-btn-text');
    if(pBtnText) pBtnText.innerText = window.state.isPlayMode ? "Edit" : "Play";
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value'].includes(el.id)) return;
        el.disabled = window.state.isPlayMode;
    });
    if (window.state.isPlayMode) {
        const row = document.getElementById('play-concept-row');
        if (row) row.innerHTML = `<div><span class="label-text">Name:</span> <span class="text-white font-bold">${document.getElementById('c-name').value}</span></div><div><span class="label-text">Nature:</span> <span class="text-white font-bold">${document.getElementById('c-nature').value}</span></div><div><span class="label-text">Clan:</span> <span class="text-white font-bold">${document.getElementById('c-clan').value}</span></div><div><span class="label-text">Player:</span> <span class="text-white font-bold">${document.getElementById('c-player').value}</span></div><div><span class="label-text">Demeanor:</span> <span class="text-white font-bold">${document.getElementById('c-demeanor').value}</span></div><div><span class="label-text">Generation:</span> <span class="text-white font-bold">${document.getElementById('c-gen').value}</span></div>`;
        const ra = document.getElementById('play-row-attr'); ra.innerHTML = '';
        Object.entries(ATTRIBUTES).forEach(([c,l]) => { const s = document.createElement('div'); s.className='sheet-section !mt-0'; s.innerHTML=`<div class="column-title">${c}</div>`; l.forEach(a=>window.renderRow(s,a,'attr',1)); ra.appendChild(s); });
        const rb = document.getElementById('play-row-abil'); rb.innerHTML = '';
        Object.entries(ABILITIES).forEach(([c,l]) => { const s = document.createElement('div'); s.className='sheet-section !mt-0'; s.innerHTML=`<div class="column-title">${c}</div>`; l.forEach(a=>window.renderRow(s,a,'abil',0)); rb.appendChild(s); });
        const rc = document.getElementById('play-row-adv'); rc.innerHTML = '';
        const ds = document.createElement('div'); ds.className='sheet-section !mt-0'; ds.innerHTML='<div class="column-title">Disciplines</div>';
        Object.entries(window.state.dots.disc).forEach(([n,v]) => { if(v>0) window.renderRow(ds,n,'disc',0); }); rc.appendChild(ds);
        const bs = document.createElement('div'); bs.className='sheet-section !mt-0'; bs.innerHTML='<div class="column-title">Backgrounds</div>';
        Object.entries(window.state.dots.back).forEach(([n,v]) => { if(v>0) window.renderRow(bs,n,'back',0); }); rc.appendChild(bs);
        const vs = document.createElement('div'); vs.className='sheet-section !mt-0'; vs.innerHTML='<div class="column-title">Virtues</div>';
        VIRTUES.forEach(v => window.renderRow(vs, v, 'virt', 1)); rc.appendChild(vs);
        const pg = document.getElementById('play-social-grid'); if(pg) {
            pg.innerHTML = ''; BACKGROUNDS.forEach(s => { const dots = window.state.dots.back[s] || 0; const safeId = 'desc-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'); const el = document.getElementById(safeId); const txt = el ? el.value : ""; if(dots || txt) pg.innerHTML += `<div class="border-l-2 border-[#333] pl-4 mb-4"><div class="flex justify-between items-center"><label class="label-text text-gold">${s}</label><div class="text-[8px] font-bold text-white">${renderDots(dots,5)}</div></div><div class="text-xs text-gray-200 mt-1">${txt || "No description."}</div></div>`; });
        }
        const pb = document.getElementById('play-blood-bonds'); if(pb) {
            pb.innerHTML = ''; window.state.bloodBonds.forEach(b => { const label = b.type === 'Bond' ? (b.rating == 3 ? 'Full Bond' : `Drink ${b.rating}`) : `Vinculum ${b.rating}`; pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; });
        }
        const mf = document.getElementById('merit-flaw-rows-play'); if(mf) {
            mf.innerHTML = ''; if(window.state.merits) window.state.merits.forEach(m => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${m.name}</span><span class="text-red-400 font-bold">${m.val}</span></div>`; }); if(window.state.flaws) window.state.flaws.forEach(f => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${f.name}</span><span class="text-green-400 font-bold">${f.val}</span></div>`; });
        }
        const ot = document.getElementById('other-traits-rows-play'); if(ot) {
            ot.innerHTML = ''; Object.entries(window.state.dots.other).forEach(([n,v]) => { if(v>0) window.renderRow(ot, n, 'other', 0); });
        }
        const plv = document.getElementById('play-vitals-list'); if(plv) {
            plv.innerHTML = ''; VIT.forEach(v => { const val = document.getElementById('bio-' + v)?.value; if(val) plv.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 font-bold"><span class="text-gray-400">${v.replace('-',' ')}:</span> <span>${val}</span></div>`; });
        }
        const cp = document.getElementById('combat-rows-play'); if(cp) {
            cp.innerHTML = ''; const standards = [{n:'Bite',diff:5,dmg:'Str+1(A)'}, {n:'Clinch',diff:6,dmg:'Str(B)'}, {n:'Grapple',diff:6,dmg:'Str(B)'}, {n:'Kick',diff:7,dmg:'Str+1(B)'}, {n:'Punch',diff:6,dmg:'Str(B)'}, {n:'Tackle',diff:7,dmg:'Str+1(B)'}];
            standards.forEach(s => { const r = document.createElement('tr'); r.className='border-b border-[#222] text-[10px] text-gray-500'; r.innerHTML = `<td class="p-2 font-bold text-white">${s.n}</td><td class="p-2">${s.diff}</td><td class="p-2">${s.dmg}</td><td class="p-2">-</td><td class="p-2">-</td><td class="p-2">-</td>`; cp.appendChild(r); });
            if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => { let display = w.displayName || w.name; const r = document.createElement('tr'); r.className='border-b border-[#222] text-[10px]'; r.innerHTML = `<td class="p-2 font-bold text-gold">${display}</td><td class="p-2 text-white">${w.stats.diff}</td><td class="p-2 text-white">${w.stats.dmg}</td><td class="p-2">${w.stats.range}</td><td class="p-2">${w.stats.rate}</td><td class="p-2">${w.stats.clip}</td>`; cp.appendChild(r); }); }
        }
        if(document.getElementById('rituals-list-play')) document.getElementById('rituals-list-play').innerText = document.getElementById('rituals-list-create-ta').value;
        let carried = []; let owned = []; if(window.state.inventory) { window.state.inventory.forEach(i => { const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; if(i.status === 'carried') carried.push(str); else owned.push(str); }); }
        setSafeText('play-gear-carried', carried.join(', ')); setSafeText('play-gear-owned', owned.join(', '));
        if(document.getElementById('play-bio-desc')) document.getElementById('play-bio-desc').innerText = document.getElementById('bio-desc').value;
        if(document.getElementById('play-derangements')) { const pd = document.getElementById('play-derangements'); pd.innerHTML = window.state.derangements.length > 0 ? window.state.derangements.map(d => `<div>• ${d}</div>`).join('') : '<span class="text-gray-500 italic">None</span>'; }
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages').value;
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st').value;
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt').value;
        if(document.getElementById('play-history')) document.getElementById('play-history').innerText = document.getElementById('char-history').value;
        const feedSrc = document.getElementById('inv-feeding-grounds'); if (feedSrc) setSafeText('play-feeding-grounds', feedSrc.value);
        if(document.getElementById('armor-rating-play')) { let totalA = 0; let totalP = 0; let names = []; if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => { totalA += parseInt(a.stats?.rating)||0; totalP += parseInt(a.stats?.penalty)||0; names.push(a.displayName || a.name); }); } setSafeText('armor-rating-play', totalA); setSafeText('armor-penalty-play', totalP); setSafeText('armor-desc-play', names.join(', ')); }
        if (document.getElementById('play-vehicles')) { const pv = document.getElementById('play-vehicles'); pv.innerHTML = ''; if (window.state.inventory) { window.state.inventory.filter(i => i.type === 'Vehicle').forEach(v => { let display = v.displayName || v.name; pv.innerHTML += `<div class="mb-2 border-b border-[#333] pb-1"><div class="font-bold text-white uppercase text-[10px]">${display}</div><div class="text-[9px] text-gray-400">Safe:${v.stats.safe} | Max:${v.stats.max} | Man:${v.stats.man}</div></div>`; }); } }
        if (document.getElementById('play-havens-list')) { const ph = document.getElementById('play-havens-list'); ph.innerHTML = ''; window.state.havens.forEach(h => { ph.innerHTML += `<div class="border-l-2 border-gold pl-4 mb-4"><div class="flex justify-between"><div><div class="font-bold text-white uppercase text-[10px]">${h.name}</div><div class="text-[9px] text-gold italic">${h.loc}</div></div></div><div class="text-xs text-gray-400 mt-1">${h.desc}</div></div>`; }); }
        
        window.changeStep(1);
    } else {
        window.changeStep(window.state.furthestPhase || 1);
    }
};

// 2. Auth & Database (Runs Async)
onAuthStateChanged(auth, async (u) => {
    console.log("Auth State Changed. User:", u ? u.uid : "None");
    if(u) {
        user = u;
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none';

        try {
            if (typeof ARCHETYPES === 'undefined') throw new Error("Data not loaded");

            const ns = document.getElementById('c-nature');
            const ds = document.getElementById('c-demeanor');
            const cs = document.getElementById('c-clan');

            if(ns && ds) {
                const sortedArch = [...ARCHETYPES].sort(); 
                ns.innerHTML = ''; ds.innerHTML = ''; 
                sortedArch.forEach(a => { 
                    ns.add(new Option(a,a)); 
                    if(ds) ds.add(new Option(a,a)); 
                });
            }

            if(cs) {
                const sortedClans = [...CLANS].sort();
                cs.innerHTML = '';
                sortedClans.forEach(c => cs.add(new Option(c,c)));
            }

            const ps1 = document.getElementById('c-path-name');
            const ps2 = document.getElementById('c-path-name-create');
            
            if(ps1) { ps1.innerHTML = ''; PATHS.forEach(p => ps1.add(new Option(p,p))); }
            if(ps2) { ps2.innerHTML = ''; PATHS.forEach(p => ps2.add(new Option(p,p))); }
            

            // Safe Event Listeners
            if(ps1) ps1.addEventListener('change', (e) => { 
                if(ps2) ps2.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });
            
            if(ps2) ps2.addEventListener('change', (e) => { 
                if(ps1) ps1.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });

            const freebieInp = document.getElementById('c-freebie-total');
            if(freebieInp) freebieInp.oninput = window.updatePools;

            // Initial UI Setup
            const s1 = document.getElementById('list-attr-physical');
            if (s1) {
                Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { window.state.dots.attr[a] = 1; window.renderRow('list-attr-'+c.toLowerCase(), a, 'attr', 1); }));
                Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { window.state.dots.abil[a] = 0; window.renderRow('list-abil-'+c.toLowerCase(), a, 'abil', 0); }));
            }
            
            window.renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
            window.renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
            window.renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
            window.renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
            window.renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
            window.renderDerangementsList(); 
            VIRTUES.forEach(v => { window.state.dots.virt[v] = 1; window.renderRow('list-virt', v, 'virt', 1); });
            const vitalCont = document.getElementById('vitals-create-inputs');
            if(vitalCont) {
                vitalCont.innerHTML = ''; 
                VIT.forEach(v => { const d = document.createElement('div'); d.innerHTML = `<label class="label-text">${v}</label><input type="text" id="bio-${v}">`; vitalCont.appendChild(d); });
            }
            window.renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
            window.renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
            window.renderInventoryList();
            
            const otherT = document.getElementById('other-traits-rows-create');
            if(otherT) {
                otherT.innerHTML = '';
                for(let i=0; i<8; i++) {
                    const d2 = document.createElement('div'); d2.className = 'flex items-center gap-2 mb-2';
                    d2.innerHTML = `<input type="text" id="ot-n-${i}" placeholder="Other..." class="w-40 text-[11px] font-bold"><div class="dot-row" id="ot-dr-${i}"></div>`;
                    otherT.appendChild(d2);
                    const dr = d2.querySelector('.dot-row'); dr.innerHTML = renderDots(0, 5);
                    dr.onclick = (e) => { const n = document.getElementById(`ot-n-${i}`).value || `Other_${i}`; if(e.target.classList.contains('dot')) { let v = parseInt(e.target.dataset.v); const currentVal = window.state.dots.other[n] || 0; if (v === currentVal) v = v - 1; window.state.dots.other[n] = v; dr.innerHTML = renderDots(v, 5); } };
                }
            }

            document.querySelectorAll('.prio-btn').forEach(b => b.onclick = (e) => {
                const {cat, group, v} = e.target.dataset;
                 const catGroups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
                catGroups.forEach(g => {
                    if (window.state.prios[cat][g] === parseInt(v)) {
                        window.state.prios[cat][g] = null;
                        if (cat === 'attr') { ATTRIBUTES[g].forEach(a => window.state.dots.attr[a] = 1); ATTRIBUTES[g].forEach(a => { const row = document.querySelector(`.dot-row[data-n="${a}"][data-t="attr"]`); if(row) row.innerHTML = renderDots(1, 5); }); } 
                        else { ABILITIES[g].forEach(a => window.state.dots.abil[a] = 0); if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === g) window.state.dots.abil[name] = 0; }); } ABILITIES[g].forEach(a => { const row = document.querySelector(`.dot-row[data-n="${a}"][data-t="abil"]`); if(row) row.innerHTML = renderDots(0, 5); }); const allCustom = document.querySelectorAll('#custom-talents .advantage-row, #custom-skills .advantage-row, #custom-knowledges .advantage-row'); allCustom.forEach(r => { const dot = r.querySelector('.dot-row'); if(dot) dot.innerHTML = renderDots(0,5); }); }
                    }
                });
                window.state.prios[cat][group] = parseInt(v);
                document.querySelectorAll(`.prio-btn[data-cat="${cat}"]`).forEach(el => { const isActive = window.state.prios[cat][el.dataset.group] == el.dataset.v; el.classList.toggle('active', isActive); });
                window.updatePools();
            });
            window.renderBloodBondRow();
            window.renderDynamicHavenRow();

            // Bind Top Buttons
            const topPlayBtn = document.getElementById('play-mode-btn');
            if(topPlayBtn) topPlayBtn.onclick = window.togglePlayMode;
            
            const topFreebieBtn = document.getElementById('toggle-freebie-btn');
            if(topFreebieBtn) topFreebieBtn.onclick = window.toggleFreebieMode;

            // Bind File Manager
            const cmdNew = document.getElementById('cmd-new');
            if(cmdNew) cmdNew.onclick = window.handleNew;
            
            const cmdSave = document.getElementById('cmd-save');
            if(cmdSave) cmdSave.onclick = window.handleSaveClick;
            
            const cmdLoad = document.getElementById('cmd-load');
            if(cmdLoad) cmdLoad.onclick = window.handleLoadClick;
            
            const confirmSave = document.getElementById('confirm-save-btn');
            if(confirmSave) confirmSave.onclick = window.performSave;

            window.changeStep(1);

        } catch (dbErr) {
            console.error("DB/Init Error:", dbErr);
            showNotification("Init Error: Check Console");
        }
    } else {
        // Anonymous Sign In
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
    }
});
