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
function renderBoxes(count, checked = 0, type = '') { let h = ''; for(let i=1; i<=count; i++) h += `<span class="box ${i <= checked ? 'checked' : ''}" data-v="${i}" data-type="${type}"></span>`; return h; }

// --- UI & NAVIGATION FUNCTIONS ---

function renderSocialProfileDescription(containerId, name) {
    const cont = document.getElementById(containerId); if (!cont) return;
    const safeId = 'desc-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const row = document.createElement('div'); row.className = 'mb-4 pb-2 border-b border-[#222]';
    row.innerHTML = `<label class="label-text text-gold">${name}</label><textarea id="${safeId}" class="h-16 text-xs" placeholder="Identity details for ${name}..."></textarea>`;
    cont.appendChild(row);
}

function updateBackgroundDescriptions() {
    const cont = document.getElementById('social-profile-list'); if (!cont) return;
    cont.innerHTML = ''; let hasBackgrounds = false;
    if (window.state.dots.back) { Object.entries(window.state.dots.back).forEach(([name, val]) => { if (val > 0) { renderSocialProfileDescription('social-profile-list', name); hasBackgrounds = true; } }); }
    if (!hasBackgrounds) cont.innerHTML = `<div class="col-span-1 md:col-span-2 text-center text-gray-500 italic py-10">Select Backgrounds in the Advantages section to add descriptions here.</div>`;
    hydrateInputs();
}

window.changeStep = function(s) {
    if (!window.state.furthestPhase || s > window.state.furthestPhase) { if (s > (window.state.furthestPhase || 0)) window.state.furthestPhase = s; }
    document.querySelectorAll('.step-container').forEach(c => c.classList.remove('active'));
    const prefix = window.state.isPlayMode ? 'play-mode-' : 'phase-';
    const target = document.getElementById(prefix + s);
    if (target) { target.classList.add('active'); window.state.currentPhase = s; }
    if (s === 5) updateBackgroundDescriptions();
    const nav = document.getElementById('sheet-nav');
    if (nav) {
        nav.innerHTML = '';
        if (window.state.isPlayMode) {
             const steps = ["Sheet", "Traits", "Social", "Biography"];
             steps.forEach((text, i) => {
                const it = document.createElement('div'); it.className = `nav-item ${window.state.currentPhase === (i+1) ? 'active' : ''}`;
                it.innerHTML = `<i class="fas fa-scroll"></i><span style="display:block; font-size:9px; margin-top:2px;">${text}</span>`;
                it.onclick = () => window.changeStep(i+1); nav.appendChild(it);
            });
        } else {
            const furthest = window.state.furthestPhase || 1;
            STEPS_CONFIG.forEach(step => {
                const it = document.createElement('div'); let statusClass = '';
                if (step.id === s) statusClass = 'active'; else if (step.id < s) statusClass = 'completed'; else if (step.id <= furthest) statusClass = 'unlocked'; else statusClass = 'locked';
                it.className = `nav-item ${statusClass}`;
                it.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full"><i class="fas ${step.icon}"></i><span style="display:block !important; font-size:7px; text-transform:uppercase; margin-top:2px; opacity:1;">${step.label}</span></div>`;
                it.onclick = () => { if (step.id <= furthest) window.changeStep(step.id); };
                nav.appendChild(it);
            });
        }
    }
    window.updatePools();
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
     renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
     renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
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
    // If play mode activated, refresh UI to show reading view
    if (window.state.isPlayMode) {
        // Concept Row
        const row = document.getElementById('play-concept-row');
        if (row) row.innerHTML = `<div><span class="label-text">Name:</span> <span class="text-white font-bold">${document.getElementById('c-name').value}</span></div><div><span class="label-text">Nature:</span> <span class="text-white font-bold">${document.getElementById('c-nature').value}</span></div><div><span class="label-text">Clan:</span> <span class="text-white font-bold">${document.getElementById('c-clan').value}</span></div><div><span class="label-text">Player:</span> <span class="text-white font-bold">${document.getElementById('c-player').value}</span></div><div><span class="label-text">Demeanor:</span> <span class="text-white font-bold">${document.getElementById('c-demeanor').value}</span></div><div><span class="label-text">Generation:</span> <span class="text-white font-bold">${document.getElementById('c-gen').value}</span></div>`;
        
        // Attributes
        const ra = document.getElementById('play-row-attr'); ra.innerHTML = '';
        Object.entries(ATTRIBUTES).forEach(([c,l]) => { const s = document.createElement('div'); s.className='sheet-section !mt-0'; s.innerHTML=`<div class="column-title">${c}</div>`; l.forEach(a=>renderRow(s,a,'attr',1)); ra.appendChild(s); });
        
        // Abilities
        const rb = document.getElementById('play-row-abil'); rb.innerHTML = '';
        Object.entries(ABILITIES).forEach(([c,l]) => { const s = document.createElement('div'); s.className='sheet-section !mt-0'; s.innerHTML=`<div class="column-title">${c}</div>`; l.forEach(a=>renderRow(s,a,'abil',0)); rb.appendChild(s); });
        
        // Advantages
        const rc = document.getElementById('play-row-adv'); rc.innerHTML = '';
        const ds = document.createElement('div'); ds.className='sheet-section !mt-0'; ds.innerHTML='<div class="column-title">Disciplines</div>';
        Object.entries(window.state.dots.disc).forEach(([n,v]) => { if(v>0) renderRow(ds,n,'disc',0); }); rc.appendChild(ds);
        
        const bs = document.createElement('div'); bs.className='sheet-section !mt-0'; bs.innerHTML='<div class="column-title">Backgrounds</div>';
        Object.entries(window.state.dots.back).forEach(([n,v]) => { if(v>0) renderRow(bs,n,'back',0); }); rc.appendChild(bs);
        
        const vs = document.createElement('div'); vs.className='sheet-section !mt-0'; vs.innerHTML='<div class="column-title">Virtues</div>';
        VIRTUES.forEach(v => renderRow(vs, v, 'virt', 1)); rc.appendChild(vs);
        
        // Social
        const pg = document.getElementById('play-social-grid'); if(pg) {
            pg.innerHTML = ''; BACKGROUNDS.forEach(s => { const dots = window.state.dots.back[s] || 0; const safeId = 'desc-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'); const el = document.getElementById(safeId); const txt = el ? el.value : ""; if(dots || txt) pg.innerHTML += `<div class="border-l-2 border-[#333] pl-4 mb-4"><div class="flex justify-between items-center"><label class="label-text text-gold">${s}</label><div class="text-[8px] font-bold text-white">${renderDots(dots,5)}</div></div><div class="text-xs text-gray-200 mt-1">${txt || "No description."}</div></div>`; });
        }
        
        // Bonds
        const pb = document.getElementById('play-blood-bonds'); if(pb) {
            pb.innerHTML = ''; window.state.bloodBonds.forEach(b => { const label = b.type === 'Bond' ? (b.rating == 3 ? 'Full Bond' : `Drink ${b.rating}`) : `Vinculum ${b.rating}`; pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; });
        }
        
        // Merits/Flaws
        const mf = document.getElementById('merit-flaw-rows-play'); if(mf) {
            mf.innerHTML = ''; if(window.state.merits) window.state.merits.forEach(m => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${m.name}</span><span class="text-red-400 font-bold">${m.val}</span></div>`; }); if(window.state.flaws) window.state.flaws.forEach(f => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${f.name}</span><span class="text-green-400 font-bold">${f.val}</span></div>`; });
        }
        
        // Other Traits
        const ot = document.getElementById('other-traits-rows-play'); if(ot) {
            ot.innerHTML = ''; Object.entries(window.state.dots.other).forEach(([n,v]) => { if(v>0) renderRow(ot, n, 'other', 0); });
        }
        
        // Bio
        const plv = document.getElementById('play-vitals-list'); if(plv) {
            plv.innerHTML = ''; VIT.forEach(v => { const val = document.getElementById('bio-' + v)?.value; if(val) plv.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 font-bold"><span class="text-gray-400">${v.replace('-',' ')}:</span> <span>${val}</span></div>`; });
        }
        
        // Combat
        const cp = document.getElementById('combat-rows-play'); if(cp) {
            cp.innerHTML = ''; const standards = [{n:'Bite',diff:5,dmg:'Str+1(A)'}, {n:'Clinch',diff:6,dmg:'Str(B)'}, {n:'Grapple',diff:6,dmg:'Str(B)'}, {n:'Kick',diff:7,dmg:'Str+1(B)'}, {n:'Punch',diff:6,dmg:'Str(B)'}, {n:'Tackle',diff:7,dmg:'Str+1(B)'}];
            standards.forEach(s => { const r = document.createElement('tr'); r.className='border-b border-[#222] text-[10px] text-gray-500'; r.innerHTML = `<td class="p-2 font-bold text-white">${s.n}</td><td class="p-2">${s.diff}</td><td class="p-2">${s.dmg}</td><td class="p-2">-</td><td class="p-2">-</td><td class="p-2">-</td>`; cp.appendChild(r); });
            if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => { let display = w.displayName || w.name; const r = document.createElement('tr'); r.className='border-b border-[#222] text-[10px]'; r.innerHTML = `<td class="p-2 font-bold text-gold">${display}</td><td class="p-2 text-white">${w.stats.diff}</td><td class="p-2 text-white">${w.stats.dmg}</td><td class="p-2">${w.stats.range}</td><td class="p-2">${w.stats.rate}</td><td class="p-2">${w.stats.clip}</td>`; cp.appendChild(r); }); }
        }
        
        // Rituals & Gear
        if(document.getElementById('rituals-list-play')) document.getElementById('rituals-list-play').innerText = document.getElementById('rituals-list-create-ta').value;
        let carried = []; let owned = []; if(window.state.inventory) { window.state.inventory.forEach(i => { const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; if(i.status === 'carried') carried.push(str); else owned.push(str); }); }
        setSafeText('play-gear-carried', carried.join(', ')); setSafeText('play-gear-owned', owned.join(', '));
        
        // Bio Text
        if(document.getElementById('play-bio-desc')) document.getElementById('play-bio-desc').innerText = document.getElementById('bio-desc').value;
        if(document.getElementById('play-derangements')) { const pd = document.getElementById('play-derangements'); pd.innerHTML = window.state.derangements.length > 0 ? window.state.derangements.map(d => `<div>• ${d}</div>`).join('') : '<span class="text-gray-500 italic">None</span>'; }
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages').value;
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st').value;
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt').value;
        if(document.getElementById('play-history')) document.getElementById('play-history').innerText = document.getElementById('char-history').value;
        const feedSrc = document.getElementById('inv-feeding-grounds'); if (feedSrc) setSafeText('play-feeding-grounds', feedSrc.value);
        
        // Armor
        if(document.getElementById('armor-rating-play')) { let totalA = 0; let totalP = 0; let names = []; if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => { totalA += parseInt(a.stats?.rating)||0; totalP += parseInt(a.stats?.penalty)||0; names.push(a.displayName || a.name); }); } setSafeText('armor-rating-play', totalA); setSafeText('armor-penalty-play', totalP); setSafeText('armor-desc-play', names.join(', ')); }
        
        // Vehicles & Havens
        if (document.getElementById('play-vehicles')) { const pv = document.getElementById('play-vehicles'); pv.innerHTML = ''; if (window.state.inventory) { window.state.inventory.filter(i => i.type === 'Vehicle').forEach(v => { let display = v.displayName || v.name; pv.innerHTML += `<div class="mb-2 border-b border-[#333] pb-1"><div class="font-bold text-white uppercase text-[10px]">${display}</div><div class="text-[9px] text-gray-400">Safe:${v.stats.safe} | Max:${v.stats.max} | Man:${v.stats.man}</div></div>`; }); } }
        if (document.getElementById('play-havens-list')) { const ph = document.getElementById('play-havens-list'); ph.innerHTML = ''; window.state.havens.forEach(h => { ph.innerHTML += `<div class="border-l-2 border-gold pl-4 mb-4"><div class="flex justify-between"><div><div class="font-bold text-white uppercase text-[10px]">${h.name}</div><div class="text-[9px] text-gold italic">${h.loc}</div></div></div><div class="text-xs text-gray-400 mt-1">${h.desc}</div></div>`; }); }
        
        window.changeStep(1);
    } else {
        window.changeStep(window.state.furthestPhase || 1);
    }
};

// --- CORE LOGIC FUNCTIONS ---

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
        if (window.state.isPlayMode) fbBtn.disabled = true;
        else fbBtn.disabled = false; 
    }

    const p8h = document.getElementById('phase8-humanity-dots');
    if(p8h) {
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

            // Initial UI Setup (Moved inside Auth for safety data dependency)
            const s1 = document.getElementById('list-attr-physical');
            if (s1) {
                Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { window.state.dots.attr[a] = 1; renderRow('list-attr-'+c.toLowerCase(), a, 'attr', 1); }));
                Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { window.state.dots.abil[a] = 0; renderRow('list-abil-'+c.toLowerCase(), a, 'abil', 0); }));
            }
            
            renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
            renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
            renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
            renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
            renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
            renderDerangementsList(); 
            VIRTUES.forEach(v => { window.state.dots.virt[v] = 1; renderRow('list-virt', v, 'virt', 1); });
            const vitalCont = document.getElementById('vitals-create-inputs');
            if(vitalCont) {
                vitalCont.innerHTML = ''; 
                VIT.forEach(v => { const d = document.createElement('div'); d.innerHTML = `<label class="label-text">${v}</label><input type="text" id="bio-${v}">`; vitalCont.appendChild(d); });
            }
            renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
            renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
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
            renderBloodBondRow();
            renderDynamicHavenRow();

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
