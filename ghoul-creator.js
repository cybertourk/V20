import { 
    ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS, ARCHETYPES, CLANS, 
    SPECIALTY_EXAMPLES as SPECIALTIES, 
    V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// --- CONSTANTS & CONFIG ---

const REVENANT_FAMILIES = ["Bratovitch", "Grimaldi", "Obertus", "Zantosa"];

const CLAN_DISCIPLINES = {
    "Assamite": ["Celerity", "Obfuscate", "Quietus"],
    "Brujah": ["Celerity", "Potence", "Presence"],
    "Followers of Set": ["Obfuscate", "Presence", "Serpentis"],
    "Gangrel": ["Animalism", "Fortitude", "Protean"],
    "Giovanni": ["Dominate", "Necromancy", "Potence"],
    "Lasombra": ["Dominate", "Obtenebration", "Potence"],
    "Malkavian": ["Auspex", "Dominate", "Obfuscate"],
    "Nosferatu": ["Animalism", "Obfuscate", "Potence"],
    "Ravnos": ["Animalism", "Chimerstry", "Fortitude"],
    "Toreador": ["Auspex", "Celerity", "Presence"],
    "Tremere": ["Auspex", "Dominate", "Thaumaturgy"],
    "Tzimisce": ["Animalism", "Auspex", "Vicissitude"],
    "Ventrue": ["Dominate", "Fortitude", "Presence"],
    "Caitiff": [],
    "Baali": ["Demonism", "Obfuscate", "Presence"],
    "Cappadocian": ["Auspex", "Fortitude", "Necromancy"]
};

const FAMILY_DISCIPLINES = {
    "Bratovitch": ["Animalism", "Potence", "Vicissitude"],
    "Grimaldi": ["Celerity", "Dominate", "Fortitude"],
    "Obertus": ["Auspex", "Obfuscate", "Vicissitude"],
    "Zantosa": ["Auspex", "Presence", "Vicissitude"]
};

// V20 Ghouls p. 499 (Experience Costs)
const XP_COSTS = {
    newAbility: 3,         
    newDiscipline: 20,     
    attribute: 4,          
    ability: 2,            
    clanDiscipline: 15,    
    otherDiscipline: 25,   
    virtue: 2,             
    humanity: 2,           
    willpower: 1,          
    background: 3          
};

// V20 Ghouls p. 499 (Freebie Costs)
const FREEBIE_COSTS = {
    attribute: 5,
    ability: 2,
    discipline: 10,
    background: 1,
    virtue: 2,
    humanity: 1,
    willpower: 1
};

const PRIO_CONFIG = {
    attr: [6, 4, 3],
    abil: [11, 7, 4]
};

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';
let xpMode = false;
let freebieMode = false; // New Toggle

let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

// --- HELPER FUNCTIONS (Defined Before Usage) ---

function renderPrioButtons(cat, group) {
    const vals = PRIO_CONFIG[cat];
    return vals.map(v => `
        <button type="button" 
            class="w-6 h-6 rounded-full border border-gray-600 text-[9px] font-bold text-gray-400 hover:text-white hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-all ghoul-prio-btn"
            data-cat="${cat}" data-group="${group}" data-val="${v}">
            ${v}
        </button>
    `).join('');
}

function updatePriorityUI() {
    document.querySelectorAll('.ghoul-prio-btn').forEach(btn => {
        const { cat, group, val } = btn.dataset;
        const v = parseInt(val);
        
        if (localPriorities[cat][group] === v) {
            btn.classList.add('bg-[#d4af37]', 'text-black', 'border-[#d4af37]', 'font-black');
            btn.classList.remove('border-gray-600', 'text-gray-400');
        } else {
            const isTaken = Object.values(localPriorities[cat]).includes(v);
            
            btn.classList.remove('bg-[#d4af37]', 'text-black', 'border-[#d4af37]', 'font-black');
            if (isTaken) {
                btn.classList.add('opacity-20', 'cursor-not-allowed', 'border-gray-800');
                btn.classList.remove('border-gray-600', 'hover:border-[#d4af37]');
            } else {
                btn.classList.add('border-gray-600', 'text-gray-400', 'hover:border-[#d4af37]');
                btn.classList.remove('opacity-20', 'cursor-not-allowed', 'border-gray-800');
            }
        }
        btn.onclick = handlePrioClick;
    });
}

function handlePrioClick(e) {
    if (xpMode || freebieMode) return; // Disable priority switching in special modes
    const btn = e.target;
    const { cat, group, val } = btn.dataset;
    const v = parseInt(val);

    const currentAssignment = Object.entries(localPriorities[cat]).find(([g, assignedVal]) => assignedVal === v);
    if (currentAssignment) {
        const [otherGroup, otherVal] = currentAssignment;
        localPriorities[cat][otherGroup] = null;
    }

    if (localPriorities[cat][group] === v) {
        localPriorities[cat][group] = null;
    } else {
        localPriorities[cat][group] = v;
    }

    updatePriorityUI();
    updateCounters();
}

function renderGroup(id, title, list, type) {
    const el = document.getElementById(id);
    if(!el) return;
    let html = ''; 
    if (list) {
        list.forEach(item => {
            const val = activeGhoul[type][item] || 0;
            const dispVal = (type === 'attributes' && val < 1) ? 1 : val;
            
            // Specialty Check
            let specialtyHtml = '';
            if ((type === 'attributes' || type === 'abilities') && val >= 4) {
                const specVal = (activeGhoul.specialties && activeGhoul.specialties[item]) || '';
                const options = (SPECIALTIES && SPECIALTIES[item]) ? SPECIALTIES[item] : [];
                const datalistId = `spec-list-${item.replace(/\s/g, '-')}`;
                const datalistHtml = `
                    <datalist id="${datalistId}">
                        ${options.map(opt => `<option value="${opt}">`).join('')}
                    </datalist>
                `;

                specialtyHtml = `
                    ${datalistHtml}
                    <input type="text" 
                        class="specialty-input bg-transparent border-b border-[#333] text-[9px] text-[#d4af37] w-20 ml-2 focus:outline-none focus:border-[#d4af37] placeholder-gray-600" 
                        placeholder="Specialty" 
                        list="${datalistId}"
                        data-key="${item}" 
                        value="${specVal}">
                `;
            }
            
            html += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="${type}" data-key="${item}">
                    <div class="flex items-center">
                        <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${item}</span>
                        ${specialtyHtml}
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80 transition-opacity">
                        ${renderDots(dispVal, 5)}
                    </div>
                </div>
            `;
        });
    }
    el.innerHTML = html;
}

// --- INITIALIZER ---

export function openGhoulCreator(dataOrEvent = null, index = null) {
    console.log("Creating/Editing Ghoul...", dataOrEvent); 

    let incomingData = null;
    const isEvent = dataOrEvent && (typeof dataOrEvent.preventDefault === 'function' || typeof dataOrEvent.stopPropagation === 'function');
    
    if (dataOrEvent && !isEvent) {
        incomingData = dataOrEvent;
    }

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1';
    xpMode = false;
    freebieMode = false;
    
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };

    if (incomingData) {
        activeGhoul = JSON.parse(JSON.stringify(incomingData));
        // Patch missing objects
        ['attributes', 'abilities', 'disciplines', 'backgrounds', 'specialties', 'merits', 'flaws', 'bio'].forEach(k => { if (!activeGhoul[k]) activeGhoul[k] = {}; });
        if (!activeGhoul.virtues) activeGhoul.virtues = { Conscience: 1, "Self-Control": 1, Courage: 1 };
        if (!activeGhoul.disciplines.Potence) activeGhoul.disciplines.Potence = 1;
        if (!activeGhoul.experience) activeGhoul.experience = { total: 0, spent: 0, log: [] };
        if (!activeGhoul.freebies) activeGhoul.freebies = { spent: 0, log: [] };

        initBaseDots(activeGhoul);
        
        if (activeGhoul.priorities) {
            localPriorities = JSON.parse(JSON.stringify(activeGhoul.priorities));
        } else {
            autoDetectPriorities();
        }

    } else {
        const defaultChronicle = (window.character && window.character.chronicle) ? window.character.chronicle : "";

        activeGhoul = {
            name: "", player: "", chronicle: defaultChronicle, type: "Vassal", concept: "", 
            domitor: "", domitorClan: "", family: "", weakness: "",
            nature: "", demeanor: "",
            attributes: {}, abilities: {}, 
            disciplines: { Potence: 1 }, 
            backgrounds: {}, 
            virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
            specialties: {},
            merits: {}, flaws: {}, bio: {},
            experience: { total: 0, spent: 0, log: [] },
            freebies: { spent: 0, log: [] },
            priorities: {
                attr: { Physical: null, Social: null, Mental: null },
                abil: { Talents: null, Skills: null, Knowledges: null }
            },
            humanity: 2, willpower: 1, bloodPool: 10 
        };
        initBaseDots(activeGhoul);
        recalcStatus();
    }

    renderEditorModal();
    switchTab('step1');
}

function initBaseDots(ghoul) {
    if (ATTRIBUTES) Object.values(ATTRIBUTES).flat().forEach(a => { if (ghoul.attributes[a] === undefined) ghoul.attributes[a] = 1; });
    if (ABILITIES) Object.values(ABILITIES).flat().forEach(a => { if (ghoul.abilities[a] === undefined) ghoul.abilities[a] = 0; });
}

function autoDetectPriorities() {
    const sumGroup = (cat, groupList, isAttr) => {
        let sum = 0;
        groupList.forEach(k => {
            const val = isAttr ? (activeGhoul.attributes[k] || 1) : (activeGhoul.abilities[k] || 0);
            sum += isAttr ? Math.max(0, val - 1) : val;
        });
        return sum;
    };

    const attrSums = [
        { grp: 'Physical', val: sumGroup('attr', ATTRIBUTES.Physical, true) },
        { grp: 'Social', val: sumGroup('attr', ATTRIBUTES.Social, true) },
        { grp: 'Mental', val: sumGroup('attr', ATTRIBUTES.Mental, true) }
    ].sort((a, b) => b.val - a.val);

    if(attrSums[0]) localPriorities.attr[attrSums[0].grp] = 6;
    if(attrSums[1]) localPriorities.attr[attrSums[1].grp] = 4;
    if(attrSums[2]) localPriorities.attr[attrSums[2].grp] = 3;

    const abilSums = [
        { grp: 'Talents', val: sumGroup('abil', ABILITIES.Talents, false) },
        { grp: 'Skills', val: sumGroup('abil', ABILITIES.Skills, false) },
        { grp: 'Knowledges', val: sumGroup('abil', ABILITIES.Knowledges, false) }
    ].sort((a, b) => b.val - a.val);

    if(abilSums[0]) localPriorities.abil[abilSums[0].grp] = 11;
    if(abilSums[1]) localPriorities.abil[abilSums[1].grp] = 7;
    if(abilSums[2]) localPriorities.abil[abilSums[2].grp] = 4;
}

function recalcStatus() {
    const baseHum = (activeGhoul.virtues.Conscience || 1) + (activeGhoul.virtues["Self-Control"] || 1);
    const baseWill = activeGhoul.virtues.Courage || 1;
    
    // Only set if not already set, or if calculation puts it higher (don't auto-lower if user spent points)
    if (!activeGhoul.humanity || activeGhoul.humanity < baseHum) activeGhoul.humanity = baseHum;
    if (!activeGhoul.willpower || activeGhoul.willpower < baseWill) activeGhoul.willpower = baseWill;
}

// --- RENDER MAIN MODAL ---

function renderEditorModal() {
    let modal = document.getElementById('ghoul-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ghoul-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const bgOptions = (BACKGROUNDS || []).map(b => `<option value="${b}">${b}</option>`).join('');
    const discOptions = (DISCIPLINES || []).map(d => `<option value="${d}">${d}</option>`).join('');
    const archList = (ARCHETYPES || []).sort();
    const archOptions = archList.map(a => `<option value="${a}">${a}</option>`).join('');
    const clanOptions = (CLANS || []).sort().map(c => `<option value="${c}">${c}</option>`).join('');
    const revOptions = (REVENANT_FAMILIES || []).map(r => `<option value="${r}">${r}</option>`).join('');

    // Merit/Flaw Options
    const meritOpts = (V20_MERITS_LIST || []).map(m => `<option value="${m.n}|${m.v}">${m.n} (${m.v} pts)</option>`).join('');
    const flawOpts = (V20_FLAWS_LIST || []).map(f => `<option value="${f.n}|${f.v}">${f.n} (${f.v} pts)</option>`).join('');

    modal.innerHTML = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative font-serif">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase shadow-black drop-shadow-md">
                        <i class="fas fa-user-plus mr-2 text-[#8b0000]"></i>Ghoul Creator <span class="text-xs align-top opacity-50 ml-1">V20</span>
                    </h2>
                    
                    <!-- Mode Toggles -->
                    <div class="ml-6 flex items-center gap-2 border-l border-[#444] pl-4">
                        <!-- Freebie Toggle -->
                        <button id="toggle-freebie-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all ${freebieMode ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'text-gray-500 hover:text-white hover:border-gray-300'}">
                            <i class="fas fa-star mr-1"></i> Freebie Mode: ${freebieMode ? 'ON' : 'OFF'}
                        </button>

                        <!-- XP Toggle -->
                        <button id="toggle-xp-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all ${xpMode ? 'bg-purple-900/40 text-purple-300 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-gray-500 hover:text-white hover:border-gray-300'}">
                            <i class="fas fa-hourglass-half mr-1"></i> XP Mode: ${xpMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
                <button id="close-ghoul-modal" class="text-gray-400 hover:text-white text-xl px-2 transition-transform hover:rotate-90"><i class="fas fa-times"></i></button>
            </div>

            <!-- TABS -->
            <div class="flex border-b border-[#333] bg-[#050505] text-[10px] uppercase font-bold text-gray-500 tracking-wider overflow-x-auto no-scrollbar shrink-0">
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step1">1. Concept</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step2">2. Attributes</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step3">3. Abilities</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step4">4. Advantages</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="stepBio">5. Biography</button>
            </div>

            <!-- CONTENT -->
            <div class="flex-1 overflow-hidden relative flex">
                
                <!-- MAIN SCROLL AREA -->
                <div class="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-[#050505] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                    
                    <!-- STEP 1: IDENTITY -->
                    <div id="step1" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Character Concept</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div class="space-y-6">
                                    <div><label class="label-text text-[#d4af37]">Name</label><input type="text" id="g-name" value="${activeGhoul.name || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                    <div><label class="label-text text-[#d4af37]">Player</label><input type="text" id="g-player" value="${activeGhoul.player || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                    <div><label class="label-text text-[#d4af37]">Domitor Name</label><input type="text" id="g-domitor" value="${activeGhoul.domitor || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                </div>
                                <div class="space-y-6">
                                    <div>
                                        <label class="label-text text-[#d4af37]">Nature</label>
                                        <select id="g-nature" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors appearance-none">
                                            <option value="" class="bg-black text-gray-500">Select Archetype...</option>
                                            ${archOptions}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="label-text text-[#d4af37]">Demeanor</label>
                                        <select id="g-demeanor" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors appearance-none">
                                            <option value="" class="bg-black text-gray-500">Select Archetype...</option>
                                            ${archOptions}
                                        </select>
                                    </div>
                                    <div><label class="label-text text-[#d4af37]">Concept</label><input type="text" id="g-concept" value="${activeGhoul.concept || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                </div>
                                <div class="space-y-6">
                                    <div>
                                        <label class="label-text text-[#d4af37]">Ghoul Type</label>
                                        <select id="g-type" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                            <option value="Vassal" ${activeGhoul.type === 'Vassal' ? 'selected' : ''} class="bg-black">Vassal (7 Virtue Dots)</option>
                                            <option value="Independent" ${activeGhoul.type === 'Independent' ? 'selected' : ''} class="bg-black">Independent (7 Virtue Dots)</option>
                                            <option value="Revenant" ${activeGhoul.type === 'Revenant' ? 'selected' : ''} class="bg-black">Revenant (5 Virtue Dots)</option>
                                        </select>
                                    </div>
                                    <!-- Conditional Fields -->
                                    <div id="div-domitor-clan" class="${activeGhoul.type === 'Revenant' ? 'hidden' : 'block'}">
                                        <label class="label-text text-[#d4af37]">Domitor Clan</label>
                                        <select id="g-domitor-clan" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                            <option value="" class="bg-black">Unknown/None</option>
                                            ${clanOptions}
                                        </select>
                                    </div>
                                    <div id="div-family" class="${activeGhoul.type === 'Revenant' ? 'block' : 'hidden'}">
                                        <label class="label-text text-[#d4af37]">Revenant Family</label>
                                        <select id="g-family" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                            <option value="" class="bg-black">Select Family...</option>
                                            ${revOptions}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <!-- Weakness Display -->
                            <div class="mt-6 p-4 bg-red-900/10 border border-red-900/30 rounded">
                                <label class="label-text text-red-400">Weakness (Conditional)</label>
                                <textarea id="g-weakness" class="w-full h-20 bg-transparent border-b border-[#444] text-white p-1 text-xs focus:border-red-500 focus:outline-none transition-colors" placeholder="Enter specific weakness details here if conditions are met (e.g. 'Rashes in sunlight' if Setite blood consumed)...">${activeGhoul.weakness || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 2: ATTRIBUTES -->
                    <div id="step2" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Attributes (6 / 4 / 3)</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div id="col-attr-phys">
                                    <h3 class="column-title">Physical <span id="cnt-attr-Physical" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('attr', 'Physical')}
                                    </div>
                                    <div id="g-attr-phys"></div>
                                </div>
                                <div id="col-attr-soc">
                                    <h3 class="column-title">Social <span id="cnt-attr-Social" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('attr', 'Social')}
                                    </div>
                                    <div id="g-attr-soc"></div>
                                </div>
                                <div id="col-attr-men">
                                    <h3 class="column-title">Mental <span id="cnt-attr-Mental" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('attr', 'Mental')}
                                    </div>
                                    <div id="g-attr-men"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: ABILITIES -->
                    <div id="step3" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Abilities (11 / 7 / 4) - Max 3 Dots</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div id="col-abil-tal">
                                    <h3 class="column-title">Talents <span id="cnt-abil-Talents" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('abil', 'Talents')}
                                    </div>
                                    <div id="g-abil-tal"></div>
                                </div>
                                <div id="col-abil-ski">
                                    <h3 class="column-title">Skills <span id="cnt-abil-Skills" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('abil', 'Skills')}
                                    </div>
                                    <div id="g-abil-ski"></div>
                                </div>
                                <div id="col-abil-kno">
                                    <h3 class="column-title">Knowledges <span id="cnt-abil-Knowledges" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('abil', 'Knowledges')}
                                    </div>
                                    <div id="g-abil-kno"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 4: ADVANTAGES & MERITS -->
                    <div id="step4" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Advantages & Traits</div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <!-- Left Column -->
                                <div>
                                    <h3 class="column-title">Disciplines (Potence 1 + 1 Free Dot)</h3>
                                    <div class="text-[9px] text-gray-500 mb-2 italic">Creation Limit: 2 Dots Total.</div>
                                    <div id="g-disc-list" class="space-y-1 mt-2"></div>
                                    <div class="mt-3">
                                        <select id="g-disc-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold focus:border-[#d4af37] focus:outline-none">
                                            <option value="" class="bg-black">+ Add Discipline</option>
                                            ${discOptions}
                                        </select>
                                    </div>
                                    <div class="mt-8">
                                        <h3 class="column-title">Backgrounds (5 Dots Free)</h3>
                                        <div id="g-back-list" class="space-y-1 mt-2"></div>
                                        <div class="mt-3">
                                            <select id="g-back-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold focus:border-[#d4af37] focus:outline-none">
                                                <option value="" class="bg-black">+ Add Background</option>
                                                ${bgOptions}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <!-- MERITS & FLAWS (Moved from Step 5) -->
                                    <div class="mt-8 border-t border-[#333] pt-6">
                                        <h3 class="column-title mb-4">Merits & Flaws (Max 7 Flaw Points)</h3>
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <select id="g-merit-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2">
                                                    <option value="" class="bg-black">Add Merit...</option>
                                                    ${meritOpts}
                                                </select>
                                                <div id="g-merits-list" class="space-y-1"></div>
                                            </div>
                                            <div>
                                                <select id="g-flaw-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2">
                                                    <option value="" class="bg-black">Add Flaw...</option>
                                                    ${flawOpts}
                                                </select>
                                                <div id="g-flaws-list" class="space-y-1"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column -->
                                <div>
                                    <h3 class="column-title">Virtues <span id="g-virtue-header-limit" class="text-gray-500 text-xs"></span></h3>
                                    <div id="g-virt-list" class="space-y-3 mt-4 mb-4"></div>

                                    <!-- Status Block (Always Visible Here) -->
                                    <div class="border border-[#333] bg-black/40 p-4 grid grid-cols-2 gap-4 mt-8">
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-[#d4af37] uppercase">Humanity</span>
                                            <div class="dot-row cursor-pointer" id="g-humanity-row">${renderDots(activeGhoul.humanity, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-[#d4af37] uppercase">Willpower</span>
                                            <div class="dot-row cursor-pointer" id="g-willpower-row">${renderDots(activeGhoul.willpower, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs col-span-2 border-t border-[#333] pt-2">
                                            <span class="font-bold text-[#d4af37] uppercase">Blood Pool (Vitae)</span>
                                            <input type="number" id="g-blood" value="${activeGhoul.bloodPool}" class="w-12 bg-transparent border-b border-[#444] text-center text-white p-1 font-bold text-lg focus:border-[#d4af37] outline-none">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 5: BIOGRAPHY (NEW) -->
                    <div id="stepBio" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Biography & Vitals</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-4">
                                    ${VIT.map(v => `
                                        <div class="flex justify-between items-center border-b border-[#333] pb-1">
                                            <label class="label-text text-[#d4af37] w-1/3">${v}</label>
                                            <input type="text" class="w-2/3 bg-transparent text-white text-xs text-right focus:outline-none bio-input" data-field="${v}" value="${activeGhoul.bio[v] || ''}">
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="space-y-4">
                                    <div>
                                        <label class="label-text text-[#d4af37] mb-2">Description / Appearance</label>
                                        <textarea id="g-bio-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeGhoul.bio.Description || ''}</textarea>
                                    </div>
                                    <div>
                                        <label class="label-text text-[#d4af37] mb-2">Notes / History</label>
                                        <textarea id="g-bio-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeGhoul.bio.Notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div> <!-- End Main Scroll Area -->

                <!-- RIGHT SIDEBAR: FREEBIE LEDGER (Visible in Freebie Mode) -->
                <div id="freebie-ledger-panel" class="${freebieMode ? 'flex' : 'hidden'} w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all">
                    <div class="p-3 border-b border-[#333] bg-[#111]">
                        <h3 class="text-[#d4af37] font-cinzel font-bold text-center">Freebie Ledger</h3>
                    </div>
                    
                    <div class="p-3 border-b border-[#333] bg-[#1a1a1a]">
                        <div class="flex justify-between items-center text-xs mb-1">
                            <span class="text-gray-400">Total Freebies</span>
                            <span class="text-white font-bold">21</span>
                        </div>
                        <div class="flex justify-between items-center text-xs mb-1">
                            <span class="text-gray-400">Flaw Bonus</span>
                            <span id="fb-bonus-disp" class="text-green-400 font-bold">0</span>
                        </div>
                        <div class="border-t border-[#333] pt-1 flex justify-between items-center text-xs">
                            <span class="text-[#d4af37] font-bold uppercase">Remaining</span>
                            <span id="fb-rem-disp" class="text-white font-black text-lg">21</span>
                        </div>
                    </div>

                    <!-- CATEGORIZED COSTS -->
                    <div id="fb-breakdown-list" class="space-y-2 text-xs p-3 border-b border-[#333]">
                        <!-- Injected via JS -->
                    </div>

                    <div class="mt-2 px-3 flex-1 flex flex-col min-h-0">
                        <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Freebie Log</h4>
                        <div id="fb-log-list" class="text-[9px] text-gray-400 flex-1 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5">
                            <!-- Log entries injected here -->
                        </div>
                    </div>
                </div>

                <!-- RIGHT SIDEBAR: XP LEDGER (Visible in XP Mode) -->
                <div id="xp-ledger-panel" class="${xpMode ? 'flex' : 'hidden'} w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all">
                    <div class="p-3 border-b border-[#333] bg-[#111]">
                        <h3 class="text-purple-400 font-cinzel font-bold text-center">XP Log</h3>
                    </div>
                    
                    <div class="p-3 border-b border-[#333] bg-[#1a1a1a]">
                        <div class="flex justify-between items-center text-xs mb-2">
                            <span class="text-gray-400">Total XP</span>
                            <input type="number" id="xp-total-input" value="${activeGhoul.experience.total}" onchange="window.updateGhoulTotalXP(this.value)" class="w-16 bg-black border border-[#333] text-purple-400 text-center font-bold focus:border-purple-500 outline-none">
                        </div>
                    </div>

                    <!-- CATEGORIZED COSTS -->
                    <div id="xp-breakdown-list" class="space-y-2 text-xs p-3 border-b border-[#333]">
                        <!-- Injected via JS -->
                    </div>

                    <div class="p-3 border-b border-[#333] bg-[#111]">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-400">Total Spent</span>
                            <span id="xp-spent-disp" class="text-white font-bold">${activeGhoul.experience.spent}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs mt-1 pt-1 border-t border-[#333]">
                            <span class="text-gray-400">Remaining</span>
                            <span id="xp-rem-disp" class="text-green-400 font-bold">${activeGhoul.experience.total - activeGhoul.experience.spent}</span>
                        </div>
                    </div>

                    <div class="mt-2 px-3">
                        <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Session Log</h4>
                        <div id="xp-log-list" class="text-[9px] text-gray-400 h-40 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5">
                            <!-- Log entries injected here -->
                        </div>
                    </div>
                </div>

            </div>

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#050505] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic">
                    <span class="text-[#d4af37]">Note:</span> Abilities capped at 3 dots until Freebie Mode is active. Specialties available at 4+ dots.
                </div>
                <div class="flex gap-4">
                    <button id="cancel-ghoul" class="border border-[#444] text-gray-400 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] hover:text-white transition tracking-wider">Cancel</button>
                    <button id="save-ghoul" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2 border border-transparent hover:border-red-500">
                        <i class="fas fa-check"></i> Save & Close
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Populate Fields
    if(activeGhoul.nature) document.getElementById('g-nature').value = activeGhoul.nature;
    if(activeGhoul.demeanor) document.getElementById('g-demeanor').value = activeGhoul.demeanor;
    if(activeGhoul.domitorClan) document.getElementById('g-domitor-clan').value = activeGhoul.domitorClan;
    if(activeGhoul.family) document.getElementById('g-family').value = activeGhoul.family;

    renderDotGroups();
    renderDynamicLists();
    renderMeritsFlaws(); 
    updatePriorityUI(); 
    renderFreebieLists();
    renderGhoulXpSidebar(); // XP Logic
    renderGhoulFreebieSidebar(); // Freebie Logic

    setupNavListeners(modal);
    setupActionListeners(modal);
    bindDotClicks(modal);
    updateTracker(); // Keep tracking logic for Steps 1-4
    updateVirtueHeader();
}

// ... existing XP helpers ...

function renderGhoulXpSidebar() {
    // 1. Calculate Buckets
    const log = activeGhoul.experience.log || [];
    let buckets = {
        newAbil: 0,
        attr: 0,
        abil: 0,
        disc: 0,
        virt: 0,
        humanity: 0,
        willpower: 0,
        background: 0
    };

    log.forEach(entry => {
        // Use type stored in log, fallback to detection if missing
        const type = entry.type; 
        const cost = entry.cost;
        
        if (type === 'attributes' || type === 'attr') buckets.attr += cost;
        else if (type === 'abilities' || type === 'abil') {
            if (entry.from === 0 && entry.cost > 0) buckets.newAbil += cost; // Only count buying new ability here
            else buckets.abil += cost;
        }
        else if (type === 'disciplines' || type === 'disc') buckets.disc += cost;
        else if (type === 'virtues' || type === 'virt') buckets.virt += cost;
        else if (type === 'humanity') buckets.humanity += cost;
        else if (type === 'willpower') buckets.willpower += cost;
        else if (type === 'backgrounds' || type === 'back') buckets.background += cost;
    });

    // 2. Render Breakdown List
    const breakdown = document.getElementById('xp-breakdown-list');
    if (breakdown) {
        breakdown.innerHTML = '';
        const addRow = (label, val) => {
            const row = document.createElement('div');
            row.className = "flex justify-between items-center gap-1";
            // Match main app style: Label gray, value colored
            row.innerHTML = `<span class="text-gray-400 truncate">${label}</span><span class="text-purple-400 font-bold bg-black/95 z-10 shrink-0">${val}</span>`;
            breakdown.appendChild(row);
        };

        addRow("New Ability (3)", buckets.newAbil);
        addRow("Attributes (x4)", buckets.attr);
        addRow("Abilities (x2)", buckets.abil);
        addRow("Disciplines (x15/25)", buckets.disc);
        addRow("Virtues (x2)", buckets.virt);
        addRow("Humanity (x2)", buckets.humanity);
        addRow("Willpower (x1)", buckets.willpower);
        addRow("Backgrounds (3)", buckets.background);
    }

    // 3. Render Log List
    const logList = document.getElementById('xp-log-list');
    if (logList) {
        if (log.length === 0) {
            logList.innerHTML = '<div class="text-center italic opacity-50 mt-4">No XP spent yet.</div>';
        } else {
            logList.innerHTML = log.slice().reverse().map(entry => {
                const isRefund = entry.cost < 0;
                const costDisp = isRefund ? `+${Math.abs(entry.cost)}` : `-${entry.cost}`;
                const color = isRefund ? 'text-green-400' : 'text-purple-400';
                
                return `
                <div class="border-b border-[#222] pb-1 mb-1">
                    <div class="flex justify-between text-white">
                        <span class="font-bold">${entry.trait}</span>
                        <span class="${color}">${costDisp}</span>
                    </div>
                    <div class="flex justify-between text-[8px] text-gray-500">
                        <span>${entry.from} &rarr; ${entry.to}</span>
                        <span>${new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 4. Update Totals
    const spentEl = document.getElementById('xp-spent-disp');
    const remEl = document.getElementById('xp-rem-disp');
    
    if (spentEl) spentEl.innerText = activeGhoul.experience.spent;
    if (remEl) remEl.innerText = activeGhoul.experience.total - activeGhoul.experience.spent;
}

// --- FREEBIE LOGIC ---

function renderGhoulFreebieSidebar() {
    if (!activeGhoul.freebies) activeGhoul.freebies = { spent: 0, log: [] };
    
    const log = activeGhoul.freebies.log || [];
    
    // Calculate Stats
    let flawBonus = 0;
    let meritCost = 0;
    
    if (activeGhoul.flaws) Object.values(activeGhoul.flaws).forEach(v => flawBonus += v);
    // Cap flaw bonus at 7
    const cappedFlawBonus = Math.min(7, flawBonus);
    
    if (activeGhoul.merits) Object.values(activeGhoul.merits).forEach(v => meritCost += v);

    let buckets = {
        attr: 0, abil: 0, disc: 0, virt: 0, hum: 0, will: 0, back: 0
    };

    let logSpent = 0;
    log.forEach(entry => {
        logSpent += entry.cost;
        if (entry.type === 'attributes' || entry.type === 'attr') buckets.attr += entry.cost;
        else if (entry.type === 'abilities' || entry.type === 'abil') buckets.abil += entry.cost;
        else if (entry.type === 'disciplines' || entry.type === 'disc') buckets.disc += entry.cost;
        else if (entry.type === 'virtues' || entry.type === 'virt') buckets.virt += entry.cost; 
        else if (entry.type === 'humanity') buckets.hum += entry.cost;
        else if (entry.type === 'willpower') buckets.will += entry.cost;
        else if (entry.type === 'backgrounds') buckets.back += entry.cost;
    });

    const totalSpent = logSpent + meritCost;
    const totalAvail = 21 + cappedFlawBonus;
    const remaining = totalAvail - totalSpent;

    // Render Status
    document.getElementById('fb-bonus-disp').innerText = `+${cappedFlawBonus}`;
    const remEl = document.getElementById('fb-rem-disp');
    if (remEl) {
        remEl.innerText = remaining;
        remEl.className = remaining >= 0 ? "text-white font-black text-lg" : "text-red-500 font-black text-lg";
    }

    // Render Breakdown
    const breakdown = document.getElementById('fb-breakdown-list');
    if (breakdown) {
        breakdown.innerHTML = '';
        const addRow = (label, val) => {
            if (val === 0) return;
            const row = document.createElement('div');
            row.className = "flex justify-between items-center gap-1";
            row.innerHTML = `<span class="text-gray-400 truncate">${label}</span><span class="text-[#d4af37] font-bold bg-black/95 z-10 shrink-0">${val}</span>`;
            breakdown.appendChild(row);
        };
        addRow("Merits", meritCost);
        addRow("Attributes (5)", buckets.attr);
        addRow("Abilities (2)", buckets.abil);
        addRow("Disciplines (10)", buckets.disc);
        addRow("Backgrounds (1)", buckets.back);
        addRow("Virtues (2)", buckets.virt);
        addRow("Humanity (1)", buckets.hum);
        addRow("Willpower (1)", buckets.will);
    }

    // Render Log
    const logList = document.getElementById('fb-log-list');
    if (logList) {
        if (log.length === 0) {
            logList.innerHTML = '<div class="text-center italic opacity-50 mt-4">No freebies spent on dots.</div>';
        } else {
            logList.innerHTML = log.slice().reverse().map(entry => {
                const isRefund = entry.cost < 0;
                const costDisp = isRefund ? `+${Math.abs(entry.cost)}` : `-${entry.cost}`;
                const color = isRefund ? 'text-green-400' : 'text-[#d4af37]';
                
                return `
                <div class="border-b border-[#222] pb-1 mb-1">
                    <div class="flex justify-between text-white">
                        <span class="font-bold">${entry.trait}</span>
                        <span class="${color}">${costDisp}</span>
                    </div>
                    <div class="flex justify-between text-[8px] text-gray-500">
                        <span>${entry.from} &rarr; ${entry.to}</span>
                        <span>${new Date(entry.date).toLocaleTimeString()}</span>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

function handleFreebieSpend(type, key, newVal, currentVal) {
    let targetVal = newVal;
    if (newVal === currentVal) {
        targetVal = currentVal - 1; // Toggle off = remove dot
    }

    if (targetVal === currentVal) return;

    // BUYING
    if (targetVal > currentVal) {
        // Enforce 1 dot at a time for simplicity in logging
        if (targetVal > currentVal + 1) {
             showNotification("Please purchase dots one at a time.");
             return;
        }

        // Calculate Cost
        let cost = 0;
        if (type === 'attributes') cost = FREEBIE_COSTS.attribute;
        else if (type === 'abilities') cost = FREEBIE_COSTS.ability;
        else if (type === 'disciplines') cost = FREEBIE_COSTS.discipline;
        else if (type === 'backgrounds') cost = FREEBIE_COSTS.background;
        else if (type === 'virtues') cost = FREEBIE_COSTS.virtue;
        else if (type === 'humanity') cost = FREEBIE_COSTS.humanity;
        else if (type === 'willpower') cost = FREEBIE_COSTS.willpower;

        // Check Funds
        const logSpent = activeGhoul.freebies.log.reduce((acc, l) => acc + l.cost, 0);
        let meritCost = 0;
        if (activeGhoul.merits) Object.values(activeGhoul.merits).forEach(v => meritCost += v);
        let flawBonus = 0;
        if (activeGhoul.flaws) Object.values(activeGhoul.flaws).forEach(v => flawBonus += v);
        
        const totalSpent = logSpent + meritCost;
        const totalAvail = 21 + Math.min(7, flawBonus);
        const rem = totalAvail - totalSpent;

        if (cost > rem) {
            showNotification("Not enough Freebie Points!");
            return;
        }

        activeGhoul.freebies.spent += cost;
        activeGhoul.freebies.log.push({
            date: Date.now(),
            trait: key || type, // Use type for hum/will
            from: currentVal,
            to: targetVal,
            cost: cost,
            type: type
        });

        updateValue(type, key, targetVal);
        showNotification(`Spent ${cost} Freebies`);
    }
    // REFUNDING
    else {
        let refundAmount = 0;
        if (type === 'attributes') refundAmount = FREEBIE_COSTS.attribute;
        else if (type === 'abilities') refundAmount = FREEBIE_COSTS.ability;
        else if (type === 'disciplines') refundAmount = FREEBIE_COSTS.discipline;
        else if (type === 'backgrounds') refundAmount = FREEBIE_COSTS.background;
        else if (type === 'virtues') refundAmount = FREEBIE_COSTS.virtue;
        else if (type === 'humanity') refundAmount = FREEBIE_COSTS.humanity;
        else if (type === 'willpower') refundAmount = FREEBIE_COSTS.willpower;

        activeGhoul.freebies.spent -= refundAmount;
        activeGhoul.freebies.log.push({
            date: Date.now(),
            trait: key || type,
            from: currentVal,
            to: targetVal,
            cost: -refundAmount,
            type: type
        });

        updateValue(type, key, targetVal);
        showNotification(`Refunded ${refundAmount} Freebies`);
    }
    
    renderGhoulFreebieSidebar();
}

function updateValue(type, key, val) {
    if (type === 'attributes' || type === 'abilities' || type === 'virtues' || type === 'disciplines' || type === 'backgrounds') {
        activeGhoul[type][key] = val;
    } else if (type === 'humanity') {
        activeGhoul.humanity = val;
    } else if (type === 'willpower') {
        activeGhoul.willpower = val;
    }
    
    renderDotGroups();
    renderDynamicLists();
    renderFreebieLists();
    bindDotClicks(document.getElementById('ghoul-modal'));
}

// ... existing bindDotClicks ...
function bindDotClicks(modal) {
    const rows = modal.querySelectorAll('.dot-row-interactive');
    const humRow = document.getElementById('g-humanity-row');
    const willRow = document.getElementById('g-willpower-row');

    const bindDirect = (el, type) => {
        if(!el) return;
        el.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const newVal = parseInt(e.target.dataset.v);
            let currentVal = activeGhoul[type];
            
            if (xpMode) {
                handleXpSpend(type, type, newVal, currentVal); 
                return;
            }
            if (freebieMode) {
                handleFreebieSpend(type, type, newVal, currentVal); // Key is same as type
                return;
            }

            // Normal Logic
            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            if (finalVal < 1) finalVal = 1;
            if (!validateChange(type, null, finalVal, currentVal)) return;
            activeGhoul[type] = finalVal;
            el.innerHTML = renderDots(finalVal, 10);
            updateCounters();
        };
    };

    if(humRow) bindDirect(humRow, 'humanity');
    if(willRow) bindDirect(willRow, 'willpower');

    rows.forEach(row => {
        row.onclick = null; 
        row.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const type = row.dataset.type;
            const key = row.dataset.key;
            const newVal = parseInt(e.target.dataset.v);
            
            if (!activeGhoul[type]) activeGhoul[type] = {};
            
            let currentVal = activeGhoul[type][key] || 0;
            if ((type === 'attributes' || type === 'virtues') && activeGhoul[type][key] === undefined) currentVal = 1;

            if (xpMode) {
                handleXpSpend(type, key, newVal, currentVal);
                return;
            }
            if (freebieMode) {
                handleFreebieSpend(type, key, newVal, currentVal);
                return;
            }

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;

            if (!validateChange(type, key, finalVal, currentVal)) return;
            
            activeGhoul[type][key] = finalVal;
            
            renderDotGroups();
            renderDynamicLists();
            renderFreebieLists();
            
            bindDotClicks(modal);

            if (type === 'virtues') {
                recalcStatus();
                const hDots = document.getElementById('g-humanity-row');
                const wDots = document.getElementById('g-willpower-row');
                if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
                if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);
            }

            updateCounters();
        };
    });
}

// ... existing renderMeritsFlaws ...
function renderMeritsFlaws() {
    const mList = document.getElementById('g-merits-list');
    const fList = document.getElementById('g-flaws-list');
    
    if(mList) {
        mList.innerHTML = '';
        if(activeGhoul.merits) {
            Object.entries(activeGhoul.merits).forEach(([name, val]) => {
                mList.innerHTML += `<div class="flex justify-between text-[9px] text-gray-300 bg-black/50 p-1 rounded"><span>${name}</span><span>${val} pts <i class="fas fa-times text-red-500 cursor-pointer ml-2" onclick="window.removeGhoulItem('merits', '${name}')"></i></span></div>`;
            });
        }
    }
    
    if(fList) {
        fList.innerHTML = '';
        if(activeGhoul.flaws) {
            Object.entries(activeGhoul.flaws).forEach(([name, val]) => {
                fList.innerHTML += `<div class="flex justify-between text-[9px] text-red-300 bg-black/50 p-1 rounded"><span>${name}</span><span>${val} pts <i class="fas fa-times text-red-500 cursor-pointer ml-2" onclick="window.removeGhoulItem('flaws', '${name}')"></i></span></div>`;
            });
        }
    }
    // Update Freebie Ledger Sidebar if visible
    renderGhoulFreebieSidebar();
}

// ... existing updateTracker ... (Only for Step 1-4 validation now)
function updateTracker() {
    let spent = {
        attr: { Physical: 0, Social: 0, Mental: 0 },
        abil: { Talents: 0, Skills: 0, Knowledges: 0 },
        disc: 0, back: 0, virt: 0,
        freebies: 21
    };

    if(ATTRIBUTES) {
        ATTRIBUTES.Physical.forEach(a => spent.attr.Physical += Math.max(0, (activeGhoul.attributes[a]||1)-1));
        ATTRIBUTES.Social.forEach(a => spent.attr.Social += Math.max(0, (activeGhoul.attributes[a]||1)-1));
        ATTRIBUTES.Mental.forEach(a => spent.attr.Mental += Math.max(0, (activeGhoul.attributes[a]||1)-1));
    }

    if(ABILITIES) {
        ABILITIES.Talents.forEach(a => spent.abil.Talents += (activeGhoul.abilities[a]||0));
        ABILITIES.Skills.forEach(a => spent.abil.Skills += (activeGhoul.abilities[a]||0));
        ABILITIES.Knowledges.forEach(a => spent.abil.Knowledges += (activeGhoul.abilities[a]||0));
    }

    // Colors for Counters in Steps 2-3
    ['attr', 'abil'].forEach(cat => {
        Object.entries(localPriorities[cat]).forEach(([group, limit]) => {
            let s = 0;
            if (cat === 'attr') {
                if(group === 'Physical') s = spent.attr.Physical;
                if(group === 'Social') s = spent.attr.Social;
                if(group === 'Mental') s = spent.attr.Mental;
            } else {
                if(group === 'Talents') s = spent.abil.Talents;
                if(group === 'Skills') s = spent.abil.Skills;
                if(group === 'Knowledges') s = spent.abil.Knowledges;
            }
            
            const el = document.getElementById(`cnt-${cat}-${group}`);
            if(el) {
                if (limit) {
                    const color = s > limit ? 'text-red-500 font-bold' : (s === limit ? 'text-green-500 font-bold' : 'text-gray-500');
                    el.innerHTML = `<span class="${color}">${s} / ${limit}</span>`;
                } else {
                    el.innerHTML = `<span class="text-gray-600">[${s}]</span>`;
                }
            }
        });
    });
}

// ... existing renderDotGroups ...
function renderDotGroups() {
    if(ATTRIBUTES) {
        renderGroup('g-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
        renderGroup('g-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
        renderGroup('g-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');
    }
    if(ABILITIES) {
        renderGroup('g-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
        renderGroup('g-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
        renderGroup('g-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');
    }
    if(VIRTUES) renderGroup('g-virt-list', null, VIRTUES, 'virtues');
}

// ... existing renderDynamicLists ...
function renderDynamicLists() {
    renderDisciplines();
    renderBackgrounds();
}

// ... existing renderDisciplines ...
function renderDisciplines() {
    const el = document.getElementById('g-disc-list');
    if(!el) return;
    el.innerHTML = '';
    
    if(activeGhoul.disciplines) {
        Object.entries(activeGhoul.disciplines).forEach(([name, val]) => {
            const isAuto = name === 'Potence';
            el.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="disciplines" data-key="${name}">
                    <div class="flex items-center gap-2">
                        ${!isAuto ? `<span class="text-red-500 cursor-pointer hover:text-red-300" onclick="window.removeGhoulItem('disciplines','${name}')">&times;</span>` : '<span class="w-2"></span>'}
                        <span class="text-[10px] uppercase font-bold ${isAuto ? 'text-[#d4af37]' : 'text-white'}">${name}</span>
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>
            `;
        });
    }
}

// ... existing renderBackgrounds ...
function renderBackgrounds() {
    const el = document.getElementById('g-back-list');
    if(!el) return;
    el.innerHTML = '';
    
    if(activeGhoul.backgrounds) {
        Object.entries(activeGhoul.backgrounds).forEach(([name, val]) => {
            el.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="backgrounds" data-key="${name}">
                    <div class="flex items-center gap-2">
                        <span class="text-red-500 cursor-pointer hover:text-red-300" onclick="window.removeGhoulItem('backgrounds','${name}')">&times;</span>
                        <span class="text-[10px] uppercase font-bold text-white">${name}</span>
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>
            `;
        });
    }
}

// ... existing removeGhoulItem ...
window.removeGhoulItem = function(type, key) {
    if (type === 'disciplines' && key === 'Potence') return; 
    
    if (type === 'merits') {
        delete activeGhoul.merits[key];
        renderMeritsFlaws();
        updateTracker();
        return;
    }
    if (type === 'flaws') {
        delete activeGhoul.flaws[key];
        renderMeritsFlaws();
        updateTracker();
        return;
    }

    if (activeGhoul[type] && activeGhoul[type][key] !== undefined) {
        delete activeGhoul[type][key];
        renderDynamicLists();
        renderFreebieLists(); // Update step 5 too
        updateCounters();
        bindDotClicks(document.getElementById('ghoul-modal'));
    }
};

// ... existing setupActionListeners ...
function setupActionListeners(modal) {
    const close = () => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    };
    
    document.getElementById('close-ghoul-modal').onclick = close;
    document.getElementById('cancel-ghoul').onclick = close;
    
    document.getElementById('save-ghoul').onclick = () => {
        activeGhoul.name = document.getElementById('g-name').value;
        activeGhoul.domitor = document.getElementById('g-domitor').value;
        activeGhoul.concept = document.getElementById('g-concept').value;
        activeGhoul.type = document.getElementById('g-type').value;
        activeGhoul.player = document.getElementById('g-player').value;
        activeGhoul.weakness = document.getElementById('g-weakness').value;
        
        const natureEl = document.getElementById('g-nature');
        const demeanorEl = document.getElementById('g-demeanor');
        const clanEl = document.getElementById('g-domitor-clan');
        const famEl = document.getElementById('g-family');

        if(natureEl) activeGhoul.nature = natureEl.value;
        if(demeanorEl) activeGhoul.demeanor = demeanorEl.value;
        if(clanEl) activeGhoul.domitorClan = clanEl.value;
        if(famEl) activeGhoul.family = famEl.value;

        // Save Bio inputs
        const bioInputs = modal.querySelectorAll('.bio-input');
        if(!activeGhoul.bio) activeGhoul.bio = {};
        bioInputs.forEach(input => {
            activeGhoul.bio[input.dataset.field] = input.value;
        });
        activeGhoul.bio.Description = document.getElementById('g-bio-desc').value;
        activeGhoul.bio.Notes = document.getElementById('g-bio-notes').value;

        activeGhoul.bloodPool = parseInt(document.getElementById('g-blood').value) || 10;
        
        // SAVE PRIORITIES (Critical for Freebie calculation on reload)
        activeGhoul.priorities = JSON.parse(JSON.stringify(localPriorities));

        if (!window.state.retainers) window.state.retainers = [];
        if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = activeGhoul;
        else window.state.retainers.push(activeGhoul);

        if(window.renderRetainersTab) window.renderRetainersTab(document.getElementById('play-content'));
        
        if (typeof showNotification === 'function') {
            showNotification("Retainer Added. Please save your character.");
        } else if (window.showNotification) {
            window.showNotification("Retainer Added. Please save your character.");
        }
        
        close();
    };

    const typeSelect = document.getElementById('g-type');
    if(typeSelect) {
        typeSelect.onchange = (e) => {
            const val = e.target.value;
            activeGhoul.type = val;
            
            // Toggle UI visibility
            const isRevenant = val === 'Revenant';
            document.getElementById('div-domitor-clan').className = isRevenant ? 'hidden' : 'block';
            document.getElementById('div-family').className = isRevenant ? 'block' : 'hidden';

            updateVirtueHeader();
            updateCounters(); 
        };
    }

    // Clan Change Listener (Just saves state, no autofill)
    const clanSelect = document.getElementById('g-domitor-clan');
    if(clanSelect) {
        clanSelect.onchange = (e) => {
            activeGhoul.domitorClan = e.target.value;
        };
    }

    const meritSel = document.getElementById('g-merit-select');
    if(meritSel) {
        meritSel.onchange = (e) => {
            const val = e.target.value;
            if(!val) return;
            const [name, cost] = val.split('|');
            if(!activeGhoul.merits) activeGhoul.merits = {};
            activeGhoul.merits[name] = parseInt(cost);
            renderMeritsFlaws();
            updateTracker();
            e.target.value = "";
        };
    }

    const flawSel = document.getElementById('g-flaw-select');
    if(flawSel) {
        flawSel.onchange = (e) => {
            const val = e.target.value;
            if(!val) return;
            const [name, bonus] = val.split('|');
            if(!activeGhoul.flaws) activeGhoul.flaws = {};
            activeGhoul.flaws[name] = parseInt(bonus);
            renderMeritsFlaws();
            updateTracker();
            e.target.value = "";
        };
    }

    // Specialty Inputs
    modal.addEventListener('change', (e) => {
        if(e.target.classList.contains('specialty-input')) {
            const key = e.target.dataset.key;
            if(!activeGhoul.specialties) activeGhoul.specialties = {};
            activeGhoul.specialties[key] = e.target.value;
        }
    });

    // XP Toggle
    const xpBtn = document.getElementById('toggle-xp-mode');
    if (xpBtn) {
        xpBtn.onclick = toggleXpMode;
    }

    // Freebie Toggle
    const fbBtn = document.getElementById('toggle-freebie-mode');
    if (fbBtn) {
        fbBtn.onclick = toggleFreebieMode;
    }

    const setupDrop = (id, type, renderFn) => {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!activeGhoul[type]) activeGhoul[type] = {};
                
                // XP MODE NEW DISCIPLINE ADD
                if (xpMode && type === 'disciplines' && activeGhoul[type][val] === undefined) {
                    activeGhoul[type][val] = 0;
                    renderFn();
                    bindDotClicks(modal);
                }
                // FREEBIE MODE NEW DISCIPLINE ADD
                else if (freebieMode && type === 'disciplines' && activeGhoul[type][val] === undefined) {
                    activeGhoul[type][val] = 0;
                    renderFn();
                    bindDotClicks(modal);
                }
                // CREATION MODE
                else if(activeGhoul[type][val] === undefined) {
                    if (!validateChange(type, val, 1, 0)) {
                        e.target.value = "";
                        return;
                    }
                    activeGhoul[type][val] = 1;
                    renderFn();
                    renderFreebieLists(); // Update step 5 too
                    updateCounters();
                    bindDotClicks(modal);
                }
                e.target.value = "";
            }
        };
    };
    setupDrop('g-disc-select', 'disciplines', renderDisciplines);
    setupDrop('g-back-select', 'backgrounds', renderBackgrounds);
}

// Toggle Functions
function toggleXpMode() {
    xpMode = !xpMode;
    if(xpMode) freebieMode = false; // Mutually exclusive
    renderEditorModal();
    switchTab(currentTab);
}

function toggleFreebieMode() {
    freebieMode = !freebieMode;
    if(freebieMode) xpMode = false; // Mutually exclusive
    renderEditorModal();
    switchTab(currentTab);
}

// ... existing renderFreebieLists ...
function renderFreebieLists() {
    if(ATTRIBUTES) {
        renderGroup('fb-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
        renderGroup('fb-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
        renderGroup('fb-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');
    }
    if(ABILITIES) {
        renderGroup('fb-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
        renderGroup('fb-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
        renderGroup('fb-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');
    }
    renderDynamicListsForFreebies();
    if(VIRTUES) renderGroup('fb-virt-list', null, VIRTUES, 'virtues');
}

// ... existing renderDynamicListsForFreebies ...
function renderDynamicListsForFreebies() {
    const dEl = document.getElementById('fb-disc-list');
    const bEl = document.getElementById('fb-back-list');
    
    if(dEl && activeGhoul.disciplines) {
        dEl.innerHTML = '';
        Object.entries(activeGhoul.disciplines).forEach(([name, val]) => {
            const isAuto = name === 'Potence';
            dEl.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="disciplines" data-key="${name}">
                    <span class="text-[10px] uppercase font-bold ${isAuto ? 'text-[#d4af37]' : 'text-white'}">${name}</span>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>`;
        });
    }

    if(bEl && activeGhoul.backgrounds) {
        bEl.innerHTML = '';
        Object.entries(activeGhoul.backgrounds).forEach(([name, val]) => {
            bEl.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="backgrounds" data-key="${name}">
                    <span class="text-[10px] uppercase font-bold text-white">${name}</span>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>`;
        });
    }
}
