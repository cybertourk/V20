import { 
    ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS, ARCHETYPES, CLANS, 
    SPECIALTY_EXAMPLES as SPECIALTIES, 
    V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// Revenant Families (Not currently in data.js, so kept local)
const REVENANT_FAMILIES = ["Bratovitch", "Grimaldi", "Obertus", "Zantosa"];

// Standard V20 Clan Disciplines for Vassal Discounts
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
    "Baali": ["Demonism", "Obfuscate", "Presence"], // Optional extra
    "Cappadocian": ["Auspex", "Fortitude", "Necromancy"] // Optional extra
};

// Family Disciplines for Revenants
const FAMILY_DISCIPLINES = {
    "Bratovitch": ["Animalism", "Potence", "Vicissitude"],
    "Grimaldi": ["Celerity", "Dominate", "Fortitude"],
    "Obertus": ["Auspex", "Obfuscate", "Vicissitude"],
    "Zantosa": ["Auspex", "Presence", "Vicissitude"]
};

// --- XP COSTS (V20 Ghouls p. 499) ---
// Note: Costs use "Current Rating" multiplier, not "Target Rating".
const XP_COSTS = {
    newAbility: 3,         // Flat cost for first dot
    newDiscipline: 20,     // Flat cost for first dot
    attribute: 4,          // Current Rating x 4
    ability: 2,            // Current Rating x 2
    clanDiscipline: 15,    // Current Level x 15 (In-Clan/Family)
    otherDiscipline: 25,   // Current Level x 25 (Out-of-Clan)
    virtue: 2,             // Current Rating x 2
    humanity: 2,           // Current Rating x 2
    willpower: 1,          // Current Rating x 1
    background: 3          // Storyteller discretion (usually 3)
};

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';
let xpMode = false; // Toggle for XP spending

// Priority State Checkers (V20 Ghoul Rules)
const PRIO_CONFIG = {
    attr: [6, 4, 3],
    abil: [11, 7, 4]
};

let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

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
    
    // Reset Local State
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

        // Init XP Data if missing
        if (!activeGhoul.experience) {
            activeGhoul.experience = { total: 0, spent: 0, log: [] };
        }

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
    
    if (activeGhoul.humanity < baseHum) activeGhoul.humanity = baseHum;
    if (activeGhoul.willpower < baseWill) activeGhoul.willpower = baseWill;
}

// --- MAIN RENDER ---
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
                    <!-- XP Mode Toggle -->
                    <div class="ml-6 flex items-center gap-2 border-l border-[#444] pl-4">
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
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step5">6. Finishing</button>
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

                    <!-- STEP 4: ADVANTAGES -->
                    <div id="step4" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Advantages</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                </div>
                                <div>
                                    <h3 class="column-title">Virtues <span id="g-virtue-header-limit" class="text-gray-500 text-xs"></span></h3>
                                    <div id="g-virt-list" class="space-y-3 mt-4 mb-4"></div>
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

                    <!-- STEP 6: FINISHING (FREEBIES) -->
                    <div id="step5" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0 h-full">
                            <div class="section-title">Finishing Touches & Freebie Points</div>
                            
                            <div class="flex flex-col md:flex-row gap-6 h-full">
                                <!-- LEFT: UPGRADE PANEL -->
                                <div class="flex-1 space-y-8 overflow-y-auto pr-2 max-h-[60vh]">
                                    
                                    <!-- Merits & Flaws Block -->
                                    <div class="border border-[#333] bg-black/40 p-4">
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

                                    <!-- Status Block -->
                                    <div class="border border-[#333] bg-black/40 p-4 grid grid-cols-2 gap-4">
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

                                    <!-- Attributes Upgrade -->
                                    <div>
                                        <h3 class="column-title mb-2">Attributes</h3>
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div id="fb-attr-phys"></div>
                                            <div id="fb-attr-soc"></div>
                                            <div id="fb-attr-men"></div>
                                        </div>
                                    </div>

                                    <!-- Abilities Upgrade -->
                                    <div>
                                        <h3 class="column-title mb-2">Abilities</h3>
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div id="fb-abil-tal"></div>
                                            <div id="fb-abil-ski"></div>
                                            <div id="fb-abil-kno"></div>
                                        </div>
                                    </div>

                                    <!-- Advantages Upgrade -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 class="column-title mb-2">Disciplines & Backgrounds</h3>
                                            <div id="fb-disc-list" class="space-y-1"></div>
                                            <div id="fb-back-list" class="space-y-1 mt-4"></div>
                                        </div>
                                        <div>
                                            <h3 class="column-title mb-2">Virtues</h3>
                                            <div id="fb-virt-list" class="space-y-2"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- RIGHT: LEDGER (Creation) -->
                                <div class="w-full md:w-64 flex-shrink-0" id="creation-ledger-container">
                                    <div class="sticky top-0 space-y-4">
                                        <h3 class="column-title">Freebie Ledger</h3>
                                        <div class="text-[10px] font-mono space-y-2 p-4 bg-black/40 border border-[#333] text-gray-400">
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Attributes (5):</span> <span id="fb-cost-attr" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Abilities (2):</span> <span id="fb-cost-abil" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Disciplines (10):</span> <span id="fb-cost-disc" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Backgrounds (1):</span> <span id="fb-cost-back" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Virtues (2):</span> <span id="fb-cost-virt" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Humanity (1):</span> <span id="fb-cost-hum" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Willpower (1):</span> <span id="fb-cost-will" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Merits (Cost):</span> <span id="fb-cost-merit" class="text-white">0</span></div>
                                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Flaws (Bonus):</span> <span id="fb-cost-flaw" class="text-green-400">0</span></div>
                                        </div>
                                        <div class="p-4 border border-[#d4af37]/30 bg-[#d4af37]/10 rounded text-center shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                            <div class="uppercase text-[9px] font-bold text-[#d4af37] tracking-widest">Freebies Remaining</div>
                                            <div id="final-freebie-disp" class="text-4xl font-black text-white mt-2 font-cinzel">21</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div> <!-- End Main Scroll Area -->

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
                    <span class="text-[#d4af37]">Note:</span> Abilities capped at 3 dots until 'Finishing' step. Specialties available at 4+ dots.
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
    renderGhoulXpSidebar(); // New Renderer

    setupNavListeners(modal);
    setupActionListeners(modal);
    bindDotClicks(modal);
    updateTracker();
    updateVirtueHeader();
}

// ... existing helpers ...

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

// ... existing updateWeaknessDisplay ...
function updateWeaknessDisplay(clan) {}

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
}

// ... existing validateChange ...
function validateChange(type, key, newVal, currentVal) {
    if (xpMode) return true; // XP Mode has its own validation

    const delta = newVal - currentVal;

    if (currentTab === 'step5') {
        if (delta > 0) return true;

        if (type === 'attributes') {
            let group = null;
            if (ATTRIBUTES.Physical.includes(key)) group = 'Physical';
            else if (ATTRIBUTES.Social.includes(key)) group = 'Social';
            else if (ATTRIBUTES.Mental.includes(key)) group = 'Mental';
            
            if (group) {
                const limit = localPriorities.attr[group] || 0;
                let currentSpent = 0;
                ATTRIBUTES[group].forEach(k => {
                    const val = (k === key) ? newVal : (activeGhoul.attributes[k] || 1);
                    currentSpent += Math.max(0, val - 1);
                });
                
                if (currentSpent < limit) {
                    showNotification("Cannot refund dots allocated during Creation (Attributes).");
                    return false;
                }
            }
        }

        if (type === 'abilities') {
            let group = null;
            if (ABILITIES.Talents.includes(key)) group = 'Talents';
            else if (ABILITIES.Skills.includes(key)) group = 'Skills';
            else if (ABILITIES.Knowledges.includes(key)) group = 'Knowledges';

            if (group) {
                const limit = localPriorities.abil[group] || 0;
                let currentSpent = 0;
                const list = (group === 'Talents') ? ABILITIES.Talents : (group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
                list.forEach(k => {
                    const val = (k === key) ? newVal : (activeGhoul.abilities[k] || 0);
                    currentSpent += val;
                });

                if (currentSpent < limit) {
                    showNotification("Cannot refund dots allocated during Creation (Abilities).");
                    return false;
                }
            }
        }

        if (type === 'disciplines') {
            let total = 0;
            Object.entries(activeGhoul.disciplines).forEach(([k, v]) => {
                const val = (k === key) ? newVal : v;
                total += val;
            });
            if (total < 2) {
                showNotification("Cannot refund the base 2 Creation dots for Disciplines.");
                return false;
            }
        }

        if (type === 'backgrounds') {
            let total = 0;
            Object.entries(activeGhoul.backgrounds).forEach(([k, v]) => {
                const val = (k === key) ? newVal : v;
                total += val;
            });
            if (total < 5) {
                showNotification("Cannot refund the base 5 Creation dots for Backgrounds.");
                return false;
            }
        }

        if (type === 'virtues') {
            const limit = activeGhoul.type === 'Revenant' ? 5 : 7;
            let total = 0;
            VIRTUES.forEach(k => {
                const val = (k === key) ? newVal : (activeGhoul.virtues[k] || 1);
                total += Math.max(0, val - 1);
            });
            if (total < limit) {
                showNotification(`Cannot refund the base ${limit} Creation dots for Virtues.`);
                return false;
            }
        }

        if (type === 'humanity') {
            const base = (activeGhoul.virtues.Conscience||1) + (activeGhoul.virtues["Self-Control"]||1);
            if (newVal < base) {
                showNotification("Cannot lower Humanity below base derived from Virtues.");
                return false;
            }
        }
        if (type === 'willpower') {
            const base = (activeGhoul.virtues.Courage||1);
            if (newVal < base) {
                showNotification("Cannot lower Willpower below base derived from Courage.");
                return false;
            }
        }

        return true; 
    }

    if (delta <= 0) return true; 

    if (type === 'attributes') {
        let group = null;
        if (ATTRIBUTES.Physical.includes(key)) group = 'Physical';
        else if (ATTRIBUTES.Social.includes(key)) group = 'Social';
        else if (ATTRIBUTES.Mental.includes(key)) group = 'Mental';

        if (!group) return true;

        const limit = localPriorities.attr[group];
        if (limit === null) {
            showNotification("Please select a priority for this Attribute group first.");
            return false;
        }

        let spent = 0;
        ATTRIBUTES[group].forEach(k => spent += Math.max(0, (activeGhoul.attributes[k] || 1) - 1));
        
        if (spent + delta > limit) {
            showNotification(`Cannot exceed ${limit} dots for ${group} Attributes.`);
            return false;
        }
    }

    if (type === 'abilities') {
        let group = null;
        if (ABILITIES.Talents.includes(key)) group = 'Talents';
        else if (ABILITIES.Skills.includes(key)) group = 'Skills';
        else if (ABILITIES.Knowledges.includes(key)) group = 'Knowledges';

        if (!group) return true;

        if (newVal > 3) {
            showNotification("Abilities are capped at 3 dots during creation.");
            return false;
        }

        const limit = localPriorities.abil[group];
        if (limit === null) {
            showNotification("Please select a priority for this Ability group first.");
            return false;
        }

        let spent = 0;
        const list = (group === 'Talents') ? ABILITIES.Talents : (group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
        list.forEach(k => spent += (activeGhoul.abilities[k] || 0));

        if (spent + delta > limit) {
            showNotification(`Cannot exceed ${limit} dots for ${group}.`);
            return false;
        }
    }

    if (type === 'disciplines') {
        let total = 0;
        Object.values(activeGhoul.disciplines).forEach(v => total += v);
        if (total + delta > 2) {
             showNotification("Creation Limit: 1 Free Dot + Potence 1 (Total 2). Use Freebies for more.");
             return false;
        }
    }

    if (type === 'backgrounds') {
        let total = 0;
        Object.values(activeGhoul.backgrounds).forEach(v => total += v);
        if (total + delta > 5) {
             showNotification("Creation Limit: 5 Dots in Backgrounds. Use Freebies for more.");
             return false;
        }
    }

    if (type === 'virtues') {
        let total = 0;
        VIRTUES.forEach(v => total += Math.max(0, (activeGhoul.virtues[v] || 1) - 1));
        const limit = activeGhoul.type === 'Revenant' ? 5 : 7;
        
        if (total + delta > limit) {
             showNotification(`Creation Limit: ${limit} Dots in Virtues. Use Freebies for more.`);
             return false;
        }
    }

    return true;
}

// ... existing renderPrioButtons ...
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

// ... existing handlePrioClick ...
function handlePrioClick(e) {
    if (xpMode) return; // Disable priority switching in XP mode
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

// ... existing updatePriorityUI ...
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

// ... existing updateCounters ...
function updateCounters() {
    ['attr', 'abil'].forEach(cat => {
        Object.entries(localPriorities[cat]).forEach(([group, limit]) => {
            const el = document.getElementById(`cnt-${cat}-${group}`);
            if(!el) return;
            
            let spent = 0;
            let list = (cat === 'attr') ? ATTRIBUTES[group] : 
                       (group === 'Talents' ? ABILITIES.Talents : 
                        group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
            
            list.forEach(item => {
                const val = (cat === 'attr') ? activeGhoul.attributes[item] : activeGhoul.abilities[item];
                if (cat === 'attr') spent += Math.max(0, (val||1) - 1);
                else spent += (val||0);
            });

            if (limit) {
                const color = spent > limit ? 'text-red-500 font-bold' : (spent === limit ? 'text-green-500 font-bold' : 'text-gray-500');
                el.innerHTML = `<span class="${color}">${spent} / ${limit}</span>`;
            } else {
                el.innerHTML = `<span class="text-gray-600">[${spent}]</span>`;
            }
        });
    });
    updateTracker();
}

// ... existing switchTab ...
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.ghoul-step').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.ghoul-tab').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('text-[#d4af37]', 'border-b-2', 'border-b-[#d4af37]', 'bg-[#111]');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('text-[#d4af37]', 'border-b-2', 'border-b-[#d4af37]', 'bg-[#111]');
            btn.classList.add('text-gray-500');
        }
    });

    const modal = document.getElementById('ghoul-modal');
    if(modal) bindDotClicks(modal);
}

// ... existing setupNavListeners ...
function setupNavListeners(modal) {
    const tabs = modal.querySelectorAll('.ghoul-tab');
    tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));
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

// ... existing renderGroup ...
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
                
                // Get relevant options
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

    const setupDrop = (id, type, renderFn) => {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!activeGhoul[type]) activeGhoul[type] = {};
                
                // XP MODE NEW DISCIPLINE ADD
                if (xpMode && type === 'disciplines' && activeGhoul[type][val] === undefined) {
                    // Start at 0? No, V20 says learn new discipline = 10xp for first dot (or 20 for non-physical).
                    // We'll init at 0 and let user click dot 1 to buy it.
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

// --- XP LOGIC ---

function toggleXpMode() {
    xpMode = !xpMode;
    const modal = document.getElementById('ghoul-modal');
    if(modal) {
        // Redraw to show/hide panels
        // Ideally we just toggle classes but strict re-render is safer for bindings
        renderEditorModal();
        switchTab(currentTab); // Return to current tab
    }
}

// Global hook for the XP total input
window.updateGhoulTotalXP = function(val) {
    if (activeGhoul && activeGhoul.experience) {
        activeGhoul.experience.total = parseInt(val) || 0;
        document.getElementById('xp-rem-disp').innerText = activeGhoul.experience.total - activeGhoul.experience.spent;
    }
}

// Calculate cost for a single dot purchase/refund
function calculateXpCost(type, key, targetLevel, currentLevel) {
    const current = targetLevel - 1; // "Current Rating" before purchase

    // Basic checks
    if (type === 'attributes') {
        // Current Rating x 4
        // If current is 0 (impossible for attributes), handle gracefully.
        return Math.max(1, current) * XP_COSTS.attribute;
    } 
    else if (type === 'abilities') {
        // First dot (0 -> 1) is 3 XP.
        if (targetLevel === 1) return XP_COSTS.newAbility;
        // Else Current Rating x 2
        return current * XP_COSTS.ability;
    }
    else if (type === 'virtues') {
        // Current Rating x 2
        return current * XP_COSTS.virtue;
    }
    else if (type === 'willpower') {
        // Current Rating
        return current * XP_COSTS.willpower;
    }
    else if (type === 'humanity') {
        // Current Rating x 2
        return current * XP_COSTS.humanity;
    }
    else if (type === 'disciplines') {
        // First Dot?
        if (targetLevel === 1) return XP_COSTS.newDiscipline;

        // Multiplier: 15 (In-Clan) or 25 (Out-of-Clan)
        let multiplier = XP_COSTS.otherDiscipline; // Default 25

        // Check In-Clan Status
        let isInClan = false;
        
        if (activeGhoul.type === 'Independent') {
            // Independent cost break on Celerity, Fortitude, Potence
            if (['Celerity', 'Fortitude', 'Potence'].includes(key)) isInClan = true;
        } 
        else if (activeGhoul.type === 'Revenant') {
            const fam = activeGhoul.family;
            if (fam && FAMILY_DISCIPLINES[fam] && FAMILY_DISCIPLINES[fam].includes(key)) isInClan = true;
        }
        else if (activeGhoul.type === 'Vassal') {
            const clan = activeGhoul.domitorClan;
            // Vassal cost break on Domitor's Clan Disciplines
            if (clan && CLAN_DISCIPLINES[clan] && CLAN_DISCIPLINES[clan].includes(key)) isInClan = true;
        }
        
        if (isInClan) multiplier = XP_COSTS.clanDiscipline; // 15
        
        return current * multiplier;
    }
    else if (type === 'backgrounds') {
        return XP_COSTS.background;
    }
    return 0;
}

function handleXpSpend(type, key, newVal, currentVal) {
    let targetVal = newVal;
    // Toggle logic: If clicking the dot corresponding to current rating, treat as removing that dot
    if (newVal === currentVal) {
        targetVal = currentVal - 1;
    }

    if (targetVal === currentVal) return; // No change

    // BUYING
    if (targetVal > currentVal) {
        if (targetVal > currentVal + 1) {
             showNotification("Please purchase dots one at a time.");
             return;
        }
        
        // Calculate Cost for next dot (the dot we are buying is targetVal)
        let cost = calculateXpCost(type, key, targetVal, currentVal); 
        
        // Check Funds
        const rem = activeGhoul.experience.total - activeGhoul.experience.spent;
        if (cost > rem) {
            showNotification("Not enough XP!");
            return;
        }

        // Execute without confirm
        activeGhoul.experience.spent += cost;
        activeGhoul.experience.log.push({
            date: Date.now(),
            trait: key,
            from: currentVal,
            to: targetVal,
            cost: cost,
            type: type
        });
        
        updateValue(type, key, targetVal);
        showNotification(`Spent ${cost} XP`);
    } 
    // REFUNDING
    else {
        // Iterate down from currentVal to targetVal
        // e.g. Current 3, Target 2. Loop v=3. Cost(3).
        let totalRefund = 0;
        
        for (let v = currentVal; v > targetVal; v--) {
            // Removing dot 'v'.
            totalRefund += calculateXpCost(type, key, v, v-1); 
        }

        activeGhoul.experience.spent -= totalRefund;
        if (activeGhoul.experience.spent < 0) activeGhoul.experience.spent = 0; // Safety

        activeGhoul.experience.log.push({
            date: Date.now(),
            trait: key,
            from: currentVal,
            to: targetVal,
            cost: -totalRefund, // Negative cost implies refund
            type: type
        });

        updateValue(type, key, targetVal);
        showNotification(`Refunded ${totalRefund} XP`);
    }

    renderGhoulXpSidebar(); // Update sidebar immediately
}

function updateValue(type, key, val) {
    if (type === 'attributes' || type === 'abilities' || type === 'virtues' || type === 'disciplines' || type === 'backgrounds') {
        activeGhoul[type][key] = val;
    } else if (type === 'humanity') {
        activeGhoul.humanity = val;
    } else if (type === 'willpower') {
        activeGhoul.willpower = val;
    }
    
    // Refresh visual dots
    renderDotGroups();
    renderDynamicLists();
    renderFreebieLists();
    
    // Rebind since DOM changed
    bindDotClicks(document.getElementById('ghoul-modal'));
}

function updateVirtueHeader() {
    const header = document.getElementById('g-virtue-header-limit');
    if (!header) return;
    const isRevenant = activeGhoul.type === 'Revenant';
    const limit = isRevenant ? 5 : 7;
    header.innerText = `(Free Dots: ${limit})`;
}

function bindDotClicks(modal) {
    const rows = modal.querySelectorAll('.dot-row-interactive');
    const humRow = document.getElementById('g-humanity-row');
    const willRow = document.getElementById('g-willpower-row');

    const bindDirect = (el, type) => {
        if(!el) return;
        el.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            // Mode Check
            const newVal = parseInt(e.target.dataset.v);
            let currentVal = activeGhoul[type];
            
            if (xpMode) {
                handleXpSpend(type, type, newVal, currentVal); // Key is same as type for hum/will
                return;
            }

            if (currentTab !== 'step5') return;
            
            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            if (finalVal < 1) finalVal = 1;
            
            // Validate Logic for Derived traits
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

            // XP BRANCH
            if (xpMode) {
                handleXpSpend(type, key, newVal, currentVal);
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

    let costs = { attr: 0, abil: 0, disc: 0, back: 0, virt: 0, hum: 0, will: 0, merit: 0, flaw: 0 };

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
            
            const cap = limit || 0; 
            if (s > cap) {
                const multiplier = (cat === 'attr') ? 5 : 2;
                if (cat === 'attr') costs.attr += (s - cap) * multiplier;
                else costs.abil += (s - cap) * multiplier;
            }
        });
    });

    let totalDiscDots = 0;
    if(activeGhoul.disciplines) {
        Object.values(activeGhoul.disciplines).forEach(v => totalDiscDots += v);
    }
    const freeDiscDots = 2; 
    if (totalDiscDots > freeDiscDots) {
        costs.disc = (totalDiscDots - freeDiscDots) * 10;
    }

    let backDots = 0;
    if(activeGhoul.backgrounds) Object.values(activeGhoul.backgrounds).forEach(v => backDots += v);
    if (backDots > 5) costs.back = (backDots - 5) * 1;

    let virtDots = 0;
    if(VIRTUES && activeGhoul.virtues) VIRTUES.forEach(v => virtDots += Math.max(0, (activeGhoul.virtues[v]||1)-1));
    const virtLimit = (activeGhoul.type === 'Revenant') ? 5 : 7;
    if (virtDots > virtLimit) costs.virt = (virtDots - virtLimit) * 2;

    const baseHum = (activeGhoul.virtues.Conscience||1) + (activeGhoul.virtues["Self-Control"]||1);
    if (activeGhoul.humanity > baseHum) {
        costs.hum = (activeGhoul.humanity - baseHum) * 1;
    }

    const baseWill = (activeGhoul.virtues.Courage||1);
    if (activeGhoul.willpower > baseWill) {
        costs.will = (activeGhoul.willpower - baseWill) * 1;
    }

    // Merits Cost
    if (activeGhoul.merits) {
        Object.values(activeGhoul.merits).forEach(v => costs.merit += v);
    }

    // Flaws Bonus (Capped at 7)
    let flawTotal = 0;
    if (activeGhoul.flaws) {
        Object.values(activeGhoul.flaws).forEach(v => flawTotal += v);
    }
    costs.flaw = Math.min(7, flawTotal);

    const setCost = (id, val) => {
        const el = document.getElementById(id);
        if(el) {
            el.innerText = val;
            el.className = val > 0 ? "text-red-400 font-bold" : "text-gray-500";
        }
    };
    
    setCost('fb-cost-attr', costs.attr);
    setCost('fb-cost-abil', costs.abil);
    setCost('fb-cost-disc', costs.disc);
    setCost('fb-cost-back', costs.back);
    setCost('fb-cost-virt', costs.virt);
    setCost('fb-cost-hum', costs.hum);
    setCost('fb-cost-will', costs.will);
    setCost('fb-cost-merit', costs.merit);
    
    // Update Flaw Display
    const flawEl = document.getElementById('fb-cost-flaw');
    if(flawEl) {
        flawEl.innerText = costs.flaw;
        flawEl.className = costs.flaw > 0 ? "text-green-400 font-bold" : "text-gray-500";
    }

    const totalSpent = costs.attr + costs.abil + costs.disc + costs.back + costs.virt + costs.hum + costs.will + costs.merit;
    const totalBonus = costs.flaw;
    const remaining = (21 + totalBonus) - totalSpent;
    
    const fbEl = document.getElementById('final-freebie-disp');
    if(fbEl) {
        fbEl.innerText = remaining;
        fbEl.className = remaining >= 0 ? "text-4xl font-black text-white mt-2 font-cinzel" : "text-4xl font-black text-red-500 mt-2 font-cinzel";
    }
}
