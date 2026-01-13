import { GhoulTemplate } from "./npc-ghoul.js";
import { MortalTemplate } from "./npc-mortal.js";
import { AnimalTemplate } from "./npc-animal.js";
import { 
    ATTRIBUTES, ABILITIES, VIRTUES, DISCIPLINES, BACKGROUNDS, 
    ARCHETYPES, CLANS, SPECIALTY_EXAMPLES as SPECIALTIES,
    V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// Registry of available templates
const TEMPLATES = {
    'mortal': MortalTemplate,
    'ghoul': GhoulTemplate,
    'animal': AnimalTemplate
};

// Filter Lists for NPCs (They don't need PC-specific traits)
const EXCLUDED_BACKGROUNDS = ["Black Hand Membership", "Domain", "Generation", "Herd", "Retainers", "Rituals", "Status"];
const EXCLUDED_VITALS = ["Apparent Age", "R.I.P."];

// State Variables
let activeNpc = null;
let currentTemplate = null;
let activeIndex = null;
let currentTab = 'step1';
let modes = { xp: false, freebie: false };
let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

// ==========================================================================
// INITIALIZATION & STATE MANAGEMENT
// ==========================================================================

/**
 * Open the NPC Creator Modal (Edit/Create Mode)
 * @param {String} typeKey - 'mortal', 'ghoul', or 'animal'
 * @param {Object|Event} dataOrEvent - Existing NPC data or click event
 * @param {Number} index - Index in global retainer list (for saving)
 */
export function openNpcCreator(typeKey = 'mortal', dataOrEvent = null, index = null) {
    console.log(`Opening NPC Creator for type: ${typeKey}`);
    
    // Default to Mortal if invalid type passed
    if (!TEMPLATES[typeKey]) typeKey = 'mortal';
    
    currentTemplate = TEMPLATES[typeKey];

    let incomingData = null;
    // Check if dataOrEvent is actually an Event object (click event) or data
    const isEvent = dataOrEvent && (typeof dataOrEvent.preventDefault === 'function' || dataOrEvent.target);
    if (dataOrEvent && !isEvent) incomingData = dataOrEvent;

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1';
    modes = { xp: false, freebie: false };
    resetPriorities();

    if (incomingData) {
        // Edit Mode: Deep Copy to prevent direct mutation until save
        activeNpc = JSON.parse(JSON.stringify(incomingData));
        
        // Ensure template matches data if data has a type recorded
        if (activeNpc.template && TEMPLATES[activeNpc.template]) {
            currentTemplate = TEMPLATES[activeNpc.template];
        }
        
        sanitizeNpcData(activeNpc);
        
        // Restore priorities if saved, else detect them
        if (activeNpc.priorities) localPriorities = JSON.parse(JSON.stringify(activeNpc.priorities));
        else autoDetectPriorities();
    } else {
        // Create Mode: Load defaults
        activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
        activeNpc.template = typeKey;
        sanitizeNpcData(activeNpc);
        recalcStatus();
    }

    renderEditorModal();
}

/**
 * Open NPC in Read-Only / Play Mode Sheet
 * @param {Object} npc - The NPC object data
 * @param {Number} index - The index in the global retainers array (for saving state)
 */
export function openNpcSheet(npc, index) {
    if (!npc) return;
    activeNpc = npc; // We reference the object directly to allow live updates to state (Health/WP)
    activeIndex = index;
    
    // Ensure template loaded for rules checks
    const typeKey = npc.template || 'mortal';
    currentTemplate = TEMPLATES[typeKey] || MortalTemplate;
    
    // Critical: Ensure data structure is valid before rendering
    sanitizeNpcData(activeNpc);

    renderPlaySheetModal();
}

/**
 * Ensure all necessary NPC data structures exist.
 * Fixes legacy data issues (e.g. converting health numbers to objects).
 */
function sanitizeNpcData(npc) {
    // 1. Ensure basic container objects exist
    const keys = ['attributes', 'abilities', 'disciplines', 'backgrounds', 'virtues', 'specialties', 'merits', 'flaws', 'bio'];
    keys.forEach(k => { 
        if (!npc[k]) npc[k] = {}; 
    });

    // 2. Ensure Logs exist
    if (!npc.experience) npc.experience = { total: 0, spent: 0, log: [] };
    if (!npc.freebieLog) npc.freebieLog = []; 
    
    // 3. Ensure Attributes/Abilities have defaults (unless Animal which has specific defaults)
    if (npc.template !== 'animal') {
        if (ATTRIBUTES) Object.values(ATTRIBUTES).flat().forEach(a => { if (npc.attributes[a] === undefined) npc.attributes[a] = 1; });
        if (ABILITIES) Object.values(ABILITIES).flat().forEach(a => { if (npc.abilities[a] === undefined) npc.abilities[a] = 0; });
    }
    
    // 4. FIX: Ensure Health is an Object (Legacy Support)
    // Old animal templates might have saved health as a number (e.g., 7)
    if (!npc.health || typeof npc.health !== 'object') {
        npc.health = { damage: 0, aggravated: 0 }; 
    }
    
    // 5. Ensure Pools exist
    if (npc.tempWillpower === undefined) npc.tempWillpower = npc.willpower || 1;
    if (npc.currentBlood === undefined) npc.currentBlood = npc.bloodPool || 10;
}

function switchTemplate(newType) {
    if (!TEMPLATES[newType]) return;
    
    // Preserve Identity Info (Name, Bio, etc.)
    const preserved = {
        name: activeNpc.name,
        chronicle: activeNpc.chronicle,
        concept: activeNpc.concept,
        nature: activeNpc.nature,
        demeanor: activeNpc.demeanor,
        bio: JSON.parse(JSON.stringify(activeNpc.bio || {}))
    };

    currentTemplate = TEMPLATES[newType];
    
    // Load Defaults for the new type
    activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
    activeNpc.template = newType;
    
    // Restore Identity
    Object.assign(activeNpc, preserved);
    
    sanitizeNpcData(activeNpc);
    resetPriorities();
    recalcStatus();
    
    // Reset Modes
    modes.xp = false; 
    modes.freebie = false;
    
    renderEditorModal();
    showNotification(`Switched to ${currentTemplate.label} template.`);
}

function resetPriorities() {
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };
}

function autoDetectPriorities() {
    const sumGroup = (cat, groupList, isAttr) => {
        let sum = 0;
        groupList.forEach(k => {
            const val = isAttr ? (activeNpc.attributes[k] || 1) : (activeNpc.abilities[k] || 0);
            sum += isAttr ? Math.max(0, val - 1) : val;
        });
        return sum;
    };

    const pConfig = currentTemplate.getPriorities();

    ['attr', 'abil'].forEach(cat => {
        const groups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
        const sums = groups.map(g => ({ 
            grp: g, 
            val: sumGroup(cat, cat === 'attr' ? ATTRIBUTES[g] : ABILITIES[g], cat === 'attr') 
        })).sort((a, b) => b.val - a.val);

        sums.forEach((item, idx) => {
            if (pConfig[cat][idx] !== undefined) {
                localPriorities[cat][item.grp] = pConfig[cat][idx];
            }
        });
    });
}

function recalcStatus() {
    if (activeNpc.template === 'animal') return; // Animals don't derive logic the same way

    const baseHum = (activeNpc.virtues.Conscience || 1) + (activeNpc.virtues["Self-Control"] || 1);
    const baseWill = activeNpc.virtues.Courage || 1;
    
    const hasHumMod = activeNpc.experience?.log.some(l => l.type === 'humanity' || l.trait === 'Humanity') || activeNpc.freebieLog?.some(l => l.type === 'humanity' || l.trait === 'humanity');
    const hasWillMod = activeNpc.experience?.log.some(l => l.type === 'willpower' || l.trait === 'Willpower') || activeNpc.freebieLog?.some(l => l.type === 'willpower' || l.trait === 'willpower');

    if (!hasHumMod) activeNpc.humanity = baseHum;
    else if (activeNpc.humanity < baseHum) activeNpc.humanity = baseHum;

    if (!hasWillMod) activeNpc.willpower = baseWill;
    else if (activeNpc.willpower < baseWill) activeNpc.willpower = baseWill;
}

// ==========================================================================
// IMPORT / EXPORT
// ==========================================================================

function exportNpcData() {
    const dataStr = JSON.stringify(activeNpc, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = (activeNpc.name || "npc").replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importNpcData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && typeof data === 'object') {
                activeNpc = data;
                sanitizeNpcData(activeNpc);
                
                // Verify template exists
                if (activeNpc.template && TEMPLATES[activeNpc.template]) {
                    currentTemplate = TEMPLATES[activeNpc.template];
                } else {
                    activeNpc.template = 'mortal';
                    currentTemplate = TEMPLATES['mortal'];
                }
                
                // Refresh priorities
                if (activeNpc.priorities) localPriorities = activeNpc.priorities;
                else autoDetectPriorities();
                
                renderEditorModal();
                showNotification("NPC Imported Successfully");
            } else {
                alert("Invalid JSON structure.");
            }
        } catch (err) {
            console.error(err);
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================================================
// PLAY SHEET RENDERER (VIEW MODE)
// ==========================================================================

function renderPlaySheetModal() {
    let modal = document.getElementById('npc-play-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'npc-play-modal';
        modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const typeLabel = activeNpc.template === 'ghoul' 
        ? `${activeNpc.type || 'Ghoul'} ${activeNpc.domitorClan ? `(${activeNpc.domitorClan})` : ''}` 
        : (activeNpc.template === 'animal' ? 'Animal' : 'Mortal');

    // Only show Virtues if not an Animal (they use Willpower/Blood but typically no Virtues)
    const showVirtues = activeNpc.template !== 'animal';

    // --- BIO & EXTRAS GENERATION ---
    
    // 1. Physical Stats (Skin, Eyes, Sex, etc. - mostly for Animals/Mortals)
    const physicalStats = Object.entries(activeNpc.bio || {})
        .filter(([k, v]) => v && k !== 'Description' && k !== 'Notes')
        .map(([k, v]) => `<div class="flex justify-between border-b border-[#333] pb-1 mb-1 text-[10px]"><span class="text-gray-500 font-bold uppercase">${k}:</span> <span class="text-gray-200">${v}</span></div>`)
        .join('');

    // 2. Weakness (Ghoul / Revenant)
    const weaknessDisplay = activeNpc.weakness ? `
        <div class="mt-4 p-2 border border-red-900/50 bg-red-900/10 rounded">
            <span class="text-red-400 font-bold uppercase text-[10px] block mb-1">Weakness / Curse</span>
            <p class="text-xs text-red-200 italic">${activeNpc.weakness}</p>
        </div>` : '';

    // 3. Natural Weapons (Animal)
    const naturalWeaponsDisplay = activeNpc.naturalWeapons ? `
        <div class="mt-4 p-2 border border-yellow-900/50 bg-yellow-900/10 rounded">
            <span class="text-[#d4af37] font-bold uppercase text-[10px] block mb-1">Natural Weapons / Abilities</span>
            <p class="text-xs text-gray-300">${activeNpc.naturalWeapons}</p>
        </div>` : '';

    // 4. Domitor Info (Ghoul / Ghouled Animal)
    let domitorDisplay = '';
    if (activeNpc.domitor) {
        domitorDisplay = `<div class="mt-2 text-xs text-gray-400"><span class="font-bold text-gray-500 uppercase text-[10px]">Domitor:</span> <span class="text-white">${activeNpc.domitor}</span>`;
        if (activeNpc.domitorClan) domitorDisplay += ` <span class="text-gray-500">(${activeNpc.domitorClan})</span>`;
        domitorDisplay += '</div>';
    }
    if (activeNpc.bondLevel) {
        domitorDisplay += `<div class="mt-1 text-xs text-gray-400"><span class="font-bold text-gray-500 uppercase text-[10px]">Blood Bond:</span> <span class="text-[#d4af37]">Step ${activeNpc.bondLevel}</span></div>`;
    }

    const html = `
        <div class="w-[95%] max-w-5xl h-[95%] bg-[#0a0a0a] border border-[#444] shadow-2xl flex flex-col relative font-serif text-white overflow-hidden">
            <!-- Header -->
            <div class="bg-[#111] p-4 border-b border-[#333] flex justify-between items-center shrink-0">
                <div>
                    <h2 class="text-3xl font-cinzel font-bold text-[#d4af37] leading-none">${activeNpc.name || "Unnamed NPC"}</h2>
                    <div class="text-xs text-gray-400 uppercase tracking-widest mt-1 font-bold">${typeLabel}</div>
                </div>
                <div class="flex items-center gap-4">
                    <button id="close-play-modal" class="text-gray-500 hover:text-white text-2xl"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    <!-- Col 1: Attributes & Abilities -->
                    <div class="space-y-6">
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Attributes</h3>
                            ${renderSimpleDots(activeNpc.attributes, ATTRIBUTES, 'attributes')}
                        </div>
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Abilities</h3>
                            ${renderSimpleDots(activeNpc.abilities, ABILITIES, 'abilities')}
                        </div>
                    </div>

                    <!-- Col 2: Advantages -->
                    <div class="space-y-6">
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Disciplines</h3>
                            ${Object.keys(activeNpc.disciplines).length > 0 
                                ? Object.entries(activeNpc.disciplines).map(([k,v]) => `<div class="flex justify-between text-xs mb-1 font-bold"><span class="uppercase">${k}</span><span>${renderDots(v,5)}</span></div>`).join('') 
                                : '<div class="text-gray-600 italic text-xs">None</div>'}
                        </div>
                        
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Backgrounds</h3>
                            ${Object.keys(activeNpc.backgrounds).length > 0 
                                ? Object.entries(activeNpc.backgrounds).map(([k,v]) => `<div class="flex justify-between text-xs mb-1 font-bold"><span class="uppercase">${k}</span><span>${renderDots(v,5)}</span></div>`).join('') 
                                : '<div class="text-gray-600 italic text-xs">None</div>'}
                        </div>

                        ${showVirtues ? `
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Virtues</h3>
                            ${VIRTUES.map(v => `<div class="flex justify-between text-xs mb-1 font-bold"><span class="uppercase">${v}</span><span>${renderDots(activeNpc.virtues[v]||1, 5)}</span></div>`).join('')}
                        </div>` : ''}
                    </div>

                    <!-- Col 3: Vitals (Interactive) -->
                    <div class="space-y-6">
                        
                        <!-- Willpower -->
                        <div class="bg-[#111] p-4 border border-[#333]">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="text-[#d4af37] font-bold uppercase text-sm">Willpower</h3>
                                <div class="text-xs font-bold text-gray-500">Perm: ${activeNpc.willpower}</div>
                            </div>
                            <div class="flex justify-center gap-1 mb-2">
                                ${renderInteractiveBoxes('tempWillpower', 10, activeNpc.tempWillpower)}
                            </div>
                        </div>

                        <!-- Blood Pool -->
                        ${activeNpc.bloodPool > 0 ? `
                        <div class="bg-[#111] p-4 border border-[#333]">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="text-[#8b0000] font-bold uppercase text-sm">Blood Pool</h3>
                                <div class="text-xs font-bold text-gray-500">Max: ${activeNpc.bloodPool}</div>
                            </div>
                            <div class="flex flex-wrap justify-center gap-1 mb-2">
                                ${renderInteractiveBoxes('currentBlood', activeNpc.bloodPool, activeNpc.currentBlood, true)}
                            </div>
                        </div>` : ''}

                        <!-- Health -->
                        <div class="bg-[#111] p-4 border border-[#333]">
                            <h3 class="text-gray-400 font-bold uppercase text-sm mb-3">Health</h3>
                            <div class="space-y-1 text-xs">
                                ${renderHealthTrack()}
                            </div>
                        </div>

                        <!-- Combat / Gear Summary -->
                        <div class="bg-black/40 p-3 border border-[#333] text-xs">
                            <h4 class="font-bold text-gray-500 uppercase mb-2">Combat Notes</h4>
                            <div class="text-gray-300">
                                <div class="flex justify-between border-b border-[#333] py-1"><span>Initiative:</span> <span>${(activeNpc.attributes.Dexterity||1) + (activeNpc.attributes.Wits||1)} + 1d10</span></div>
                                <div class="flex justify-between border-b border-[#333] py-1"><span>Soak (Bash):</span> <span>${activeNpc.attributes.Stamina||1} Dice</span></div>
                                <div class="flex justify-between border-b border-[#333] py-1"><span>Soak (Lethal):</span> <span>${activeNpc.template==='mortal' ? 0 : (activeNpc.attributes.Stamina||1)} Dice</span></div>
                                ${(activeNpc.disciplines.Fortitude) ? `<div class="flex justify-between border-b border-[#333] py-1 text-gold"><span>Fortitude:</span> <span>+${activeNpc.disciplines.Fortitude} Dice</span></div>` : ''}
                                ${(activeNpc.disciplines.Potence) ? `<div class="flex justify-between border-b border-[#333] py-1 text-gold"><span>Potence:</span> <span>+${activeNpc.disciplines.Potence} Auto Succ.</span></div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bio / Merits / Extras Footer -->
                <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#333] pt-6">
                    
                    <!-- Left Column: Biography & Description -->
                    <div class="space-y-4">
                        <h4 class="text-gray-500 font-bold uppercase text-xs border-b border-[#333] pb-1">Biography</h4>
                        ${activeNpc.bio.Description ? `
                            <div class="text-xs text-gray-300 italic leading-relaxed mb-4">${activeNpc.bio.Description}</div>
                        ` : '<div class="text-xs text-gray-600 italic">No description provided.</div>'}
                        
                        ${activeNpc.bio.Notes ? `
                            <div class="mt-2"><span class="text-gray-500 font-bold text-[10px] uppercase">Notes:</span> <span class="text-xs text-gray-400">${activeNpc.bio.Notes}</span></div>
                        ` : ''}

                        ${naturalWeaponsDisplay}
                        ${weaknessDisplay}
                    </div>

                    <!-- Right Column: Stats, Merits, Identity -->
                    <div class="space-y-4">
                        ${domitorDisplay ? `
                            <div class="bg-[#111] p-2 border border-[#333] rounded mb-4">
                                ${domitorDisplay}
                            </div>
                        ` : ''}

                        ${physicalStats ? `
                            <div class="mb-4">
                                <h4 class="text-gray-500 font-bold uppercase text-xs border-b border-[#333] pb-1 mb-2">Details</h4>
                                ${physicalStats}
                            </div>
                        ` : ''}

                        <div>
                             <h4 class="text-gray-500 font-bold uppercase text-xs mb-2 border-b border-[#333] pb-1">Merits & Flaws</h4>
                             <div class="text-xs">
                                ${Object.keys(activeNpc.merits).length > 0 || Object.keys(activeNpc.flaws).length > 0 ? `
                                    ${Object.entries(activeNpc.merits).map(([k,v]) => `<span class="inline-block bg-blue-900/30 border border-blue-900/50 rounded px-2 py-0.5 mr-2 mb-1">${k} (${v})</span>`).join('')}
                                    ${Object.entries(activeNpc.flaws).map(([k,v]) => `<span class="inline-block bg-red-900/30 border border-red-900/50 rounded px-2 py-0.5 mr-2 mb-1 text-red-300">${k} (${v})</span>`).join('')}
                                ` : '<span class="text-gray-600 italic">None</span>'}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.innerHTML = html;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Bind Close
    document.getElementById('close-play-modal').onclick = () => { modal.style.display = 'none'; };

    // Bind Interactive Boxes
    bindPlayInteractions(modal);
}

function renderSimpleDots(data, structure, type) {
    let html = '';
    // Determine categories based on type
    const cats = type === 'attributes' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
    
    cats.forEach(cat => {
        const list = structure[cat];
        html += `<div class="mb-3"><div class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 border-b border-[#333]">${cat}</div>`;
        list.forEach(k => {
            const val = data[k] || 0;
            if (val > 0 || type === 'attributes') {
                html += `<div class="flex justify-between items-center mb-0.5 text-xs">
                    <span class="text-gray-300">${k}</span>
                    <span>${renderDots(val, 5)}</span>
                </div>`;
            }
        });
        html += `</div>`;
    });
    return html;
}

function renderInteractiveBoxes(field, max, current, isSquare = false) {
    let html = '';
    const shapeClass = isSquare ? 'w-3 h-3 rounded-sm' : 'w-3 h-3 rounded-full';
    
    for (let i = 1; i <= max; i++) {
        let stateClass = 'bg-gray-800 border-gray-600'; // Empty
        if (i <= current) {
            stateClass = isSquare ? 'bg-[#8b0000] border-red-900' : 'bg-[#d4af37] border-yellow-700'; // Filled
        }
        html += `<div class="${shapeClass} border cursor-pointer hover:opacity-80 transition-colors npc-box-interact" data-field="${field}" data-val="${i}">
            <div class="${stateClass} w-full h-full"></div>
        </div>`;
    }
    return html;
}

function renderHealthTrack() {
    let levels = [
        { l: 'Bruised', p: 0 },
        { l: 'Hurt', p: -1 },
        { l: 'Injured', p: -1 },
        { l: 'Wounded', p: -2 },
        { l: 'Mauled', p: -2 },
        { l: 'Crippled', p: -5 },
        { l: 'Incapacitated', p: 0 }
    ];

    // Check for Custom Health Configuration (Animals)
    if (activeNpc.healthConfig && Array.isArray(activeNpc.healthConfig) && activeNpc.healthConfig.length > 0) {
        levels = activeNpc.healthConfig;
    }

    // Use safely sanitized object
    const damage = (activeNpc.health && activeNpc.health.damage) || 0;

    return levels.map((lvl, idx) => {
        const isFilled = idx < damage;
        const boxContent = isFilled ? '<i class="fas fa-times text-red-500"></i>' : '';
        return `
            <div class="flex justify-between items-center h-5">
                <span class="w-24">${lvl.l}</span>
                <span class="text-gray-500 w-8 text-center">${lvl.p === 0 ? '' : lvl.p}</span>
                <div class="w-4 h-4 border border-gray-600 bg-black flex items-center justify-center cursor-pointer hover:border-white npc-health-box" data-idx="${idx}">
                    ${boxContent}
                </div>
            </div>
        `;
    }).join('');
}

function bindPlayInteractions(modal) {
    // Stat Boxes (Willpower / Blood)
    modal.querySelectorAll('.npc-box-interact').forEach(box => {
        box.onclick = (e) => {
            const field = box.dataset.field;
            const val = parseInt(box.dataset.val);
            const current = activeNpc[field] || 0;
            
            // Toggle logic
            if (val === current) activeNpc[field] = val - 1;
            else activeNpc[field] = val;

            savePlayState();
            renderPlaySheetModal(); 
        };
    });

    // Health Boxes
    modal.querySelectorAll('.npc-health-box').forEach(box => {
        box.onclick = (e) => {
            const idx = parseInt(box.dataset.idx);
            
            // Ensure object exists before assignment
            if (typeof activeNpc.health !== 'object') activeNpc.health = { damage: 0, aggravated: 0 };
            
            const currentDmg = activeNpc.health.damage || 0;
            
            if (idx === currentDmg - 1) {
                activeNpc.health.damage = idx;
            } else {
                activeNpc.health.damage = idx + 1;
            }
            
            savePlayState();
            renderPlaySheetModal();
        };
    });
}

function savePlayState() {
    if (activeIndex !== null && window.state.retainers) {
        window.state.retainers[activeIndex] = activeNpc;
        if (window.performSave) window.performSave(true); 
    }
}

// ==========================================================================
// EDITOR UI RENDERER (EDIT/CREATE MODE)
// ==========================================================================

function renderEditorModal() {
    let modal = document.getElementById('npc-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'npc-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const archOptions = (ARCHETYPES || []).sort().map(a => `<option value="${a}">${a}</option>`).join('');
    // Ensure the clan stored is marked as selected
    const clanOptions = (CLANS || []).sort().map(c => `<option value="${c}" ${activeNpc.domitorClan === c ? 'selected' : ''}>${c}</option>`).join('');
    
    // Determine which extras to show
    const extrasHtml = currentTemplate.renderIdentityExtras ? currentTemplate.renderIdentityExtras(activeNpc) : '';
    
    // Feature Flags
    const f = currentTemplate.features || { disciplines: true, bloodPool: true, virtues: true, backgrounds: true, humanity: true };
    
    // CONDITIONAL VISIBILITY
    const isGhoul = activeNpc.template === 'ghoul';
    const isGhouledAnimal = activeNpc.template === 'animal' && activeNpc.ghouled;
    const showDomitor = isGhoul || isGhouledAnimal;
    
    // Determine initial visibility of specific fields (Column distribution handled in template now, but we need flags here)
    const showDomitorClan = activeNpc.type === 'Vassal';
    const showBondLevel = activeNpc.type === 'Vassal';

    try {
        modal.innerHTML = `
            <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative font-serif">
                
                <!-- HEADER -->
                <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                    <div class="flex items-center gap-4">
                        <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase shadow-black drop-shadow-md flex items-center">
                            <i class="fas fa-user-edit mr-3 text-[#8b0000]"></i>
                            <select id="npc-type-selector" class="bg-transparent border-none text-[#d4af37] font-bold uppercase focus:outline-none cursor-pointer hover:text-white transition-colors appearance-none">
                                <option value="mortal" ${activeNpc.template === 'mortal' ? 'selected' : ''}>Mortal</option>
                                <option value="ghoul" ${activeNpc.template === 'ghoul' ? 'selected' : ''}>Ghoul / Revenant</option>
                                <option value="animal" ${activeNpc.template === 'animal' ? 'selected' : ''}>Animal</option>
                            </select>
                            <i class="fas fa-caret-down text-xs ml-2 opacity-50"></i>
                        </h2>
                        <div class="ml-6 flex items-center gap-2 border-l border-[#444] pl-4">
                             <button id="toggle-fb-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all">
                                <i class="fas fa-star mr-1"></i> Freebie Mode
                            </button>
                            <button id="toggle-xp-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all">
                                <i class="fas fa-hourglass-half mr-1"></i> XP Mode
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-import-npc" class="text-gray-400 hover:text-white text-[10px] uppercase font-bold px-2 py-1"><i class="fas fa-file-import mr-1"></i> Import</button>
                        <input type="file" id="file-import-npc" class="hidden" accept=".json">
                        <button id="btn-export-npc" class="text-gray-400 hover:text-white text-[10px] uppercase font-bold px-2 py-1"><i class="fas fa-file-export mr-1"></i> Export</button>
                        <button id="close-npc-modal" class="text-gray-400 hover:text-white text-xl px-2 ml-4"><i class="fas fa-times"></i></button>
                    </div>
                </div>

                <!-- TABS -->
                <div class="flex border-b border-[#333] bg-[#050505] text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    ${renderTabButton('step1', '1. Concept')}
                    ${renderTabButton('step2', '2. Attributes')}
                    ${renderTabButton('step3', '3. Abilities')}
                    ${renderTabButton('step4', '4. Advantages')}
                    ${renderTabButton('stepBio', '5. Biography')}
                </div>

                <!-- CONTENT AREA -->
                <div class="flex-1 overflow-hidden relative flex">
                    <div class="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-[#050505] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                        
                        <!-- STEP 1: IDENTITY -->
                        <div id="step1" class="npc-step hidden">
                            <div class="sheet-section !mt-0">
                                <div class="section-title">Concept & Identity</div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    
                                    <!-- COLUMN 1: Basic Identity & Ghoul Type -->
                                    <div class="space-y-6">
                                        <div><label class="label-text text-[#d4af37]">Name</label><input type="text" id="npc-name" value="${activeNpc.name || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                                        
                                        <!-- Ghoul Type (Column 1) -->
                                        ${isGhoul ? `
                                            <div>
                                                <label class="label-text text-[#d4af37]">Ghoul Type</label>
                                                <select id="npc-subtype" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none">
                                                    <option value="Vassal" ${activeNpc.type === 'Vassal' ? 'selected' : ''}>Vassal (Bound)</option>
                                                    <option value="Independent" ${activeNpc.type === 'Independent' ? 'selected' : ''}>Independent</option>
                                                    <option value="Revenant" ${activeNpc.type === 'Revenant' ? 'selected' : ''}>Revenant</option>
                                                </select>
                                            </div>
                                        ` : ''}

                                        <!-- Domitor: Only for Ghouls or Ghouled Animals -->
                                        ${showDomitor ? `
                                            <div><label class="label-text text-[#d4af37]">Domitor Name</label><input type="text" id="npc-domitor" value="${activeNpc.domitor || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                                            
                                            <!-- Domitor Clan (Moved from Column 3) -->
                                            <div id="div-extra-clan" class="${showDomitorClan ? 'block' : 'hidden'} mt-2">
                                                <label class="label-text text-[#d4af37]">Domitor's Clan</label>
                                                <select id="npc-extra-clan" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                                    <option value="" class="bg-black">Unknown / None</option>
                                                    ${clanOptions}
                                                </select>
                                                <p class="text-[9px] text-gray-500 mt-1 italic">Determines in-clan disciplines.</p>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <!-- COLUMN 2: Psychology & Bond Level -->
                                    <div class="space-y-6">
                                        <div>
                                            <label class="label-text text-[#d4af37]">Nature</label>
                                            <select id="npc-nature" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="">Select...</option>${archOptions}</select>
                                        </div>
                                        <div>
                                            <label class="label-text text-[#d4af37]">Demeanor</label>
                                            <select id="npc-demeanor" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="">Select...</option>${archOptions}</select>
                                        </div>
                                        <div><label class="label-text text-[#d4af37]">Concept</label><input type="text" id="npc-concept" value="${activeNpc.concept || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>

                                        <!-- Bond Level (Column 2) -->
                                        ${isGhoul ? `
                                            <div id="div-bond-level" class="${showBondLevel ? 'block' : 'hidden'}">
                                                <label class="label-text text-[#d4af37]">Blood Bond Level</label>
                                                <select id="npc-bond-level" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none">
                                                    <option value="1" ${activeNpc.bondLevel == 1 ? 'selected' : ''}>Step 1 (First Drink)</option>
                                                    <option value="2" ${activeNpc.bondLevel == 2 ? 'selected' : ''}>Step 2 (Strong Feelings)</option>
                                                    <option value="3" ${activeNpc.bondLevel == 3 ? 'selected' : ''}>Step 3 (Full Bond)</option>
                                                </select>
                                                <p class="text-[9px] text-gray-500 mt-1 italic">V20 p. 500: Determines loyalty.</p>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <!-- COLUMN 3: Extras (Revenant Family, Weakness, Rules Box) -->
                                    <div class="space-y-6">
                                        ${extrasHtml}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: ATTRIBUTES -->
                        <div id="step2" class="npc-step hidden">
                            <div class="sheet-section !mt-0">
                                <div class="section-title">Attributes</div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    ${renderAttributeColumn('Physical')}
                                    ${renderAttributeColumn('Social')}
                                    ${renderAttributeColumn('Mental')}
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3: ABILITIES -->
                        <div id="step3" class="npc-step hidden">
                            <div class="sheet-section !mt-0">
                                <div class="section-title">Abilities</div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    ${renderAbilityColumn('Talents')}
                                    ${renderAbilityColumn('Skills')}
                                    ${renderAbilityColumn('Knowledges')}
                                </div>
                            </div>
                        </div>

                        <!-- STEP 4: ADVANTAGES (Dynamic Grid) -->
                        <div id="step4" class="npc-step hidden">
                            <div class="sheet-section !mt-0">
                                <div class="section-title">Advantages</div>
                                <!-- Uses Flex wrap for adaptive layout if columns are empty -->
                                <div class="flex flex-wrap gap-10 justify-between items-start">
                                    
                                    <!-- Col 1: Disciplines & Backgrounds -->
                                    ${ (f.disciplines || f.backgrounds) ? `
                                    <div class="flex-1 min-w-[200px]">
                                        ${f.disciplines ? `
                                            <h3 class="column-title">Disciplines</h3>
                                            <div id="npc-disc-list" class="space-y-1 mt-2"></div>
                                            <div class="mt-3"><select id="npc-disc-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold"><option value="">+ Add Discipline</option>${(DISCIPLINES||[]).map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>
                                        ` : ''}
                                        
                                        ${f.backgrounds ? `
                                            <h3 class="column-title ${f.disciplines ? 'mt-8' : ''}">Backgrounds</h3>
                                            <div id="npc-back-list" class="space-y-1 mt-2"></div>
                                            <div class="mt-3">
                                                <select id="npc-back-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold">
                                                    <option value="">+ Add Background</option>
                                                    ${(BACKGROUNDS||[]).filter(b => !EXCLUDED_BACKGROUNDS.includes(b)).map(b=>`<option value="${b}">${b}</option>`).join('')}
                                                </select>
                                            </div>
                                        ` : ''}
                                    </div>` : ''}
                                    
                                    <!-- Col 2: Virtues & Vitals -->
                                    <div class="flex-1 min-w-[200px]">
                                        ${f.virtues ? `
                                            <h3 class="column-title">Virtues <span id="virtue-limit-display" class="text-xs text-gray-500"></span></h3>
                                            <div id="npc-virtue-list" class="space-y-3 mt-4 mb-4"></div>
                                            <div class="mt-8 border-t border-[#333] pt-4">
                                                ${f.humanity ? `
                                                <div class="flex justify-between items-center text-xs mb-4">
                                                    <span class="font-bold text-[#d4af37]">HUMANITY</span>
                                                    <div class="dot-row-direct cursor-pointer" id="npc-humanity-row">${renderDots(activeNpc.humanity, 10)}</div>
                                                </div>` : ''}
                                        ` : '<div class="mt-4"></div>'}
                                        
                                        <div class="flex justify-between items-center text-xs mb-4">
                                            <span class="font-bold text-[#d4af37]">WILLPOWER</span>
                                            <div class="dot-row-direct cursor-pointer" id="npc-willpower-row">${renderDots(activeNpc.willpower, 10)}</div>
                                        </div>
                                        
                                        ${f.bloodPool ? `
                                            <div class="flex justify-between items-center text-xs">
                                                <span class="font-bold text-[#d4af37]">BLOOD POOL</span>
                                                <input type="number" id="npc-blood" value="${activeNpc.bloodPool}" class="w-12 bg-transparent border-b border-[#444] text-center text-white p-1 font-bold text-lg focus:border-[#d4af37] outline-none">
                                            </div>
                                        ` : ''}
                                        ${f.virtues ? `</div>` : ''} 
                                    </div>
                                    
                                    <!-- Col 3: Merits/Flaws -->
                                    <div class="flex-1 min-w-[200px]">
                                        <h3 class="column-title">Merits & Flaws</h3>
                                        <select id="npc-merit-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2"><option value="">Add Merit...</option>${(V20_MERITS_LIST||[]).map(m=>`<option value="${m.n}|${m.v}">${m.n} (${m.v})</option>`).join('')}</select>
                                        <div id="npc-merits-list" class="space-y-1"></div>
                                        
                                        <select id="npc-flaw-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2 mt-4"><option value="">Add Flaw...</option>${(V20_FLAWS_LIST||[]).map(f=>`<option value="${f.n}|${f.v}">${f.n} (${f.v})</option>`).join('')}</select>
                                        <div id="npc-flaws-list" class="space-y-1"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 5: BIO -->
                        <div id="stepBio" class="npc-step hidden">
                            <div class="sheet-section !mt-0">
                                <div class="section-title">Biography</div>
                                
                                <!-- Use Custom Template Renderer if available, else Default -->
                                ${currentTemplate.renderBio ? currentTemplate.renderBio(activeNpc) : `
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div class="space-y-4">
                                            ${VIT.filter(v => !EXCLUDED_VITALS.includes(v)).map(v => `<div class="flex justify-between items-center border-b border-[#333] pb-1"><label class="label-text text-[#d4af37] w-1/3">${v}</label><input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="${v}" value="${activeNpc.bio[v]||''}"></div>`).join('')}
                                        </div>
                                        <div class="space-y-4">
                                            <div><label class="label-text text-[#d4af37] mb-2">Description</label><textarea id="npc-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeNpc.bio.Description||''}</textarea></div>
                                            <div><label class="label-text text-[#d4af37] mb-2">Notes</label><textarea id="npc-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeNpc.bio.Notes||''}</textarea></div>
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- SIDEBAR: XP LEDGER -->
                    <div id="npc-xp-sidebar" class="hidden w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0">
                        <div class="p-3 bg-[#111] border-b border-[#333] text-center"><h3 class="text-purple-400 font-cinzel font-bold">XP Ledger</h3></div>
                        
                        <div class="text-[10px] font-mono space-y-2 p-4 bg-black/40 text-gray-400 flex-none border-b border-[#333]">
                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Attributes:</span> <span id="npc-xp-cost-attr" class="text-white">0</span></div>
                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Abilities:</span> <span id="npc-xp-cost-abil" class="text-white">0</span></div>
                            ${f.disciplines ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Disciplines:</span> <span id="npc-xp-cost-disc" class="text-white">0</span></div>` : ''}
                            ${f.backgrounds ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Backgrounds:</span> <span id="npc-xp-cost-back" class="text-white">0</span></div>` : ''}
                            ${f.virtues ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Virtues:</span> <span id="npc-xp-cost-virt" class="text-white">0</span></div>` : ''}
                            ${f.humanity ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Humanity:</span> <span id="npc-xp-cost-hum" class="text-white">0</span></div>` : ''}
                            <div class="flex justify-between border-b border-[#222] pb-1"><span>Willpower:</span> <span id="npc-xp-cost-will" class="text-white">0</span></div>
                            
                            <div class="mt-4 pt-2 border-t border-[#444]">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-500">Total XP</span>
                                    <input type="number" id="npc-xp-total" value="${activeNpc.experience.total}" class="w-16 bg-black border border-[#333] text-purple-400 text-center font-bold">
                                </div>
                                <div class="flex justify-between font-bold text-xs text-white">
                                    <span>Remaining:</span>
                                    <span id="npc-xp-remain" class="text-purple-400">0</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex-1 overflow-y-auto p-2 border-t border-[#333] bg-[#0a0a0a]">
                            <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider sticky top-0 bg-[#0a0a0a] pb-1">Session Log</h4>
                            <div id="npc-xp-list" class="text-[9px] font-mono text-gray-400 space-y-1"></div>
                        </div>
                    </div>

                    <!-- SIDEBAR: FREEBIE LEDGER -->
                    <div id="npc-fb-sidebar" class="hidden w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all flex flex-col">
                        <div class="p-3 bg-[#111] border-b border-[#333] text-center"><h3 class="text-[#d4af37] font-cinzel font-bold">Freebie Ledger</h3></div>
                        
                        <div class="text-[10px] font-mono space-y-2 p-4 bg-black/40 text-gray-400 flex-none border-b border-[#333]">
                            <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-attr">Attributes (5):</span> <span id="npc-fb-cost-attr" class="text-white">0</span></div>
                            <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-abil">Abilities (2):</span> <span id="npc-fb-cost-abil" class="text-white">0</span></div>
                            ${f.disciplines ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-disc">Disciplines (10):</span> <span id="npc-fb-cost-disc" class="text-white">0</span></div>` : ''}
                            ${f.backgrounds ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-back">Backgrounds (1):</span> <span id="npc-fb-cost-back" class="text-white">0</span></div>` : ''}
                            ${f.virtues ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-virt">Virtues (2):</span> <span id="npc-fb-cost-virt" class="text-white">0</span></div>` : ''}
                            ${f.humanity ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-human">Humanity (1):</span> <span id="npc-fb-cost-hum" class="text-white">0</span></div>` : ''}
                            <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-will">Willpower (1):</span> <span id="npc-fb-cost-will" class="text-white">0</span></div>
                            <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-merit">Merits (Cost):</span> <span id="npc-fb-cost-merit" class="text-white">0</span></div>
                            <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-flaw">Flaws (Bonus):</span> <span id="npc-fb-cost-flaw" class="text-green-400">0</span></div>
                            <div class="mt-4 flex justify-between font-bold text-xs text-white">
                                <span>Remaining:</span>
                                <span id="npc-fb-total-calc" class="text-green-400">15</span>
                            </div>
                        </div>

                        <div class="flex-1 overflow-y-auto p-2 border-t border-[#333] bg-[#0a0a0a]">
                            <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider sticky top-0 bg-[#0a0a0a] pb-1">Spending Log</h4>
                            <div id="npc-fb-log-list" class="text-[9px] font-mono text-gray-400 space-y-1"></div>
                        </div>

                        <div class="p-4 bg-[#d4af37]/10 border-t border-[#d4af37]/30 text-center flex-none">
                            <div class="uppercase text-[9px] font-bold text-[#d4af37]">Freebies Remaining</div>
                            <div id="npc-fb-final" class="text-4xl font-black text-white mt-2 font-cinzel">21</div>
                        </div>
                    </div>
                </div>

                <!-- FOOTER -->
                <div class="p-4 border-t border-[#444] bg-[#050505] flex justify-between items-center shrink-0">
                    <div class="text-[10px] text-gray-500 italic">Mode: ${currentTemplate.label}</div>
                    <div class="flex gap-4">
                        <button id="npc-cancel" class="border border-[#444] text-gray-400 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] hover:text-white transition">Cancel</button>
                        <button id="npc-save" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2">
                            <i class="fas fa-check"></i> Save & Close
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Critical error building NPC Modal:", err);
        return; // Abort cleanly if string build fails
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    if(activeNpc.nature) document.getElementById('npc-nature').value = activeNpc.nature;
    if(activeNpc.demeanor) document.getElementById('npc-demeanor').value = activeNpc.demeanor;

    // --- SETUP LISTENERS ---
    
    // TEMPLATE SWITCHER
    const ts = document.getElementById('npc-type-selector');
    if(ts) ts.onchange = (e) => switchTemplate(e.target.value);

    // Tab Switching
    modal.querySelectorAll('.npc-tab').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    
    // Mode Toggles
    const bxp = document.getElementById('toggle-xp-mode');
    const bfb = document.getElementById('toggle-fb-mode');
    if(bxp) bxp.onclick = () => toggleMode('xp');
    if(bfb) bfb.onclick = () => toggleMode('freebie');
    
    // Import / Export
    document.getElementById('btn-import-npc').onclick = () => document.getElementById('file-import-npc').click();
    document.getElementById('file-import-npc').onchange = importNpcData;
    document.getElementById('btn-export-npc').onclick = exportNpcData;

    // Save/Cancel
    document.getElementById('npc-cancel').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('npc-save').onclick = saveNpc;
    document.getElementById('close-npc-modal').onclick = () => { modal.style.display = 'none'; };

    // Dynamic Adders
    const setupAdd = (id, type, renderFn) => {
        const el = document.getElementById(id);
        if(el) el.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!activeNpc[type]) activeNpc[type] = {};
                activeNpc[type][val] = (modes.xp || modes.freebie) ? 0 : 1;
                renderFn();
                bindDotClicks();
                e.target.value = "";
            }
        };
    };
    setupAdd('npc-disc-select', 'disciplines', renderDisciplines);
    setupAdd('npc-back-select', 'backgrounds', renderBackgrounds);

    // Merits/Flaws
    const setupMF = (id, type) => {
        const el = document.getElementById(id);
        if(el) el.onchange = (e) => {
            if(!e.target.value) return;
            const [name, val] = e.target.value.split('|');
            const cost = parseInt(val);
            
            if(modes.freebie) {
                const avail = getFreebiesAvailable();
                const realCost = type === 'merits' ? cost : -cost; // Flaw adds points
                if (realCost > avail) {
                    showNotification("Not enough Freebie Points!");
                    e.target.value = "";
                    return;
                }

                activeNpc[type][name] = cost;
                activeNpc.freebieLog.push({
                    type: type === 'merits' ? 'merit' : 'flaw',
                    trait: name,
                    cost: realCost,
                    val: cost
                });
            } else {
                activeNpc[type][name] = cost;
            }
            
            renderMeritsFlaws();
            updateFreebieCalc();
            e.target.value = "";
        };
    };
    setupMF('npc-merit-select', 'merits');
    setupMF('npc-flaw-select', 'flaws');

    // ADDED: Listener for Blood Pool to keep state in sync immediately
    const bloodInput = document.getElementById('npc-blood');
    if(bloodInput) bloodInput.oninput = (e) => {
        activeNpc.bloodPool = parseInt(e.target.value) || 0;
    };

    const xpTot = document.getElementById('npc-xp-total');
    if(xpTot) xpTot.onchange = (e) => {
        activeNpc.experience.total = parseInt(e.target.value) || 0;
        updateXpLog();
    };

    if (currentTemplate.setupListeners) {
        currentTemplate.setupListeners(modal, activeNpc, () => {
             // Callback for UI updates triggered by template logic
             updateVirtueDisplay();
             renderAllDots(); 
        });
    }

    switchTab('step1');
    updateModeUI();
    renderAllDots();
    renderDisciplines();
    renderBackgrounds();
    renderMeritsFlaws();
    updateVirtueDisplay();
    updatePrioritiesUI();
    updateXpLog();
    updateFreebieCalc();
}

function renderTabButton(id, label) {
    return `<button class="npc-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="${id}">${label}</button>`;
}

function switchTab(id) {
    currentTab = id;
    document.querySelectorAll('.npc-step').forEach(d => d.classList.add('hidden'));
    const tgt = document.getElementById(id);
    if(tgt) tgt.classList.remove('hidden');
    
    document.querySelectorAll('.npc-tab').forEach(b => {
        if(b.dataset.tab === id) b.classList.add('text-[#d4af37]', 'bg-[#111]');
        else b.classList.remove('text-[#d4af37]', 'bg-[#111]');
    });
}

function toggleMode(mode) {
    if (mode === 'xp') {
        modes.xp = !modes.xp;
        if(modes.xp) modes.freebie = false;
    } else {
        modes.freebie = !modes.freebie;
        if(modes.freebie) modes.xp = false;
    }
    updateModeUI();
}

function updateModeUI() {
    const xpBtn = document.getElementById('toggle-xp-mode');
    const fbBtn = document.getElementById('toggle-fb-mode');
    const xpBar = document.getElementById('npc-xp-sidebar');
    const fbBar = document.getElementById('npc-fb-sidebar');

    const setActive = (btn, isActive, color) => {
        if (!btn) return;
        if (isActive) btn.className = `text-[10px] uppercase font-bold px-3 py-1 border rounded transition-all bg-${color}-900/40 text-${color}-300 border-${color}-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]`;
        else btn.className = "text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all text-gray-500 hover:text-white";
    };

    setActive(xpBtn, modes.xp, 'purple');
    setActive(fbBtn, modes.freebie, 'yellow');

    if(xpBar) {
        if(modes.xp) {
            xpBar.classList.remove('hidden');
            xpBar.classList.add('flex');
            updateXpLog();
        } else {
            xpBar.classList.add('hidden');
            xpBar.classList.remove('flex');
        }
    }

    if(fbBar) {
        if(modes.freebie) {
            fbBar.classList.remove('hidden');
            fbBar.classList.add('flex');
            updateFreebieCalc();
        } else {
            fbBar.classList.add('hidden');
            fbBar.classList.remove('flex');
        }
    }
}

function getFreebiesAvailable() {
    let spent = 0;
    activeNpc.freebieLog.forEach(l => spent += l.cost);
    return 21 - spent;
}

// --- LOGIC HUB ---

function handleValueChange(type, key, newVal) {
    let currentVal = (key) ? (activeNpc[type][key] || 0) : activeNpc[type];
    
    // Mode Checks (XP or Freebie)
    if (modes.xp) {
        let finalVal = newVal;
        // Toggle logic: If clicking current value, assume decrement (Undo)
        if (newVal === currentVal) finalVal = newVal - 1;

        if (finalVal > currentVal) {
            // BUY
            const cost = currentTemplate.getCost('xp', type, key, currentVal, finalVal, activeNpc);
            if (cost <= 0) { showNotification("XP cost invalid/zero."); return; }
            
            const rem = activeNpc.experience.total - activeNpc.experience.spent;
            if (cost > rem) { showNotification(`Not enough XP. Need ${cost}, Have ${rem}`); return; }

            activeNpc.experience.spent += cost;
            activeNpc.experience.log.push({ 
                date: Date.now(), 
                trait: key || type, 
                type: type, 
                from: currentVal, 
                to: finalVal, 
                cost: cost 
            });
            applyChange(type, key, finalVal);

        } else if (finalVal < currentVal) {
            // UNDO / REFUND
            let logIdx = -1;
            const targetTrait = key || type;
            
            for (let i = activeNpc.experience.log.length - 1; i >= 0; i--) {
                const entry = activeNpc.experience.log[i];
                if (entry.trait === targetTrait && entry.to === currentVal && entry.from === finalVal) {
                    logIdx = i;
                    break;
                }
            }

            if (logIdx !== -1) {
                const entry = activeNpc.experience.log[logIdx];
                activeNpc.experience.spent -= entry.cost;
                activeNpc.experience.log.splice(logIdx, 1);
                applyChange(type, key, finalVal);
            } else {
                showNotification("Cannot refund points not spent in this session/log.");
            }
        }
    } 
    else if (modes.freebie) {
        let finalVal = newVal;
        if (newVal === currentVal) finalVal = newVal - 1; 
        
        // 1. Refund Validation
        if (finalVal < currentVal) {
            if (!validateFreebieRefund(type, key, finalVal)) {
                showNotification("Cannot refund base dots (Creation points).");
                return;
            }
        }

        // Basic Floors
        if (type === 'attributes' && finalVal < 1) return;
        if (finalVal < 0) return;

        // 2. Spending Logic
        if (finalVal > currentVal) {
            // Check Affordability
            const cost = calculateMarginalFreebieCost(type, key, currentVal, finalVal);
            const avail = getFreebiesAvailable();
            
            if (cost > avail) {
                showNotification(`Not enough Freebie Points! Need ${cost}, have ${avail}.`);
                return;
            }

            if (cost > 0) {
                activeNpc.freebieLog.push({
                    type: type,
                    trait: key || type,
                    from: currentVal,
                    to: finalVal,
                    cost: cost
                });
            }
        } else {
            // Selling (Smart Refund)
            let rangeTop = currentVal;
            const rangeBottom = finalVal;
            const traitName = key || type;

            for (let i = activeNpc.freebieLog.length - 1; i >= 0; i--) {
                const entry = activeNpc.freebieLog[i];
                if (entry.trait !== traitName) continue;

                if (entry.from >= rangeBottom) {
                    activeNpc.freebieLog.splice(i, 1);
                }
                else if (entry.to > rangeBottom) {
                    const retainedCost = calculateMarginalFreebieCost(type, key, entry.from, rangeBottom, rangeBottom);
                    entry.to = rangeBottom;
                    entry.cost = retainedCost;
                }
            }
        }

        applyChange(type, key, finalVal);
    } 
    else {
        // Normal Creation Mode
        // Prevent direct modification of derived traits
        if (type === 'humanity' || type === 'willpower') {
            showNotification("Derived trait. Modify Virtues or use Freebie/XP mode.");
            return;
        }

        if (newVal === currentVal) newVal = newVal - 1;
        if ((type === 'attributes' || type === 'virtues') && newVal < 1) return;
        if (newVal < 0) return;

        const valid = currentTemplate.validateChange(type, key, newVal, currentVal, activeNpc, localPriorities);
        if (valid === true) {
            applyChange(type, key, newVal);
        } else {
            showNotification(valid);
        }
    }
}

// Helper: Calculate marginal cost
function calculateMarginalFreebieCost(type, key, startVal, endVal, simulatedVal = null) {
    let group = null;
    let cap = 0;
    let spent = 0;

    // Attributes & Abilities
    if (type === 'attributes' || type === 'abilities') {
        const list = (type === 'attributes') ? ATTRIBUTES : ABILITIES;
        if (list.Physical && list.Physical.includes(key)) group = 'Physical';
        else if (list.Social && list.Social.includes(key)) group = 'Social';
        else if (list.Mental && list.Mental.includes(key)) group = 'Mental';
        else if (list.Talents && list.Talents.includes(key)) group = 'Talents';
        else if (list.Skills && list.Skills.includes(key)) group = 'Skills';
        else if (list.Knowledges && list.Knowledges.includes(key)) group = 'Knowledges';

        if (group) {
            const priorities = (type === 'attributes') ? localPriorities.attr : localPriorities.abil;
            cap = priorities[group] || 0;
            const groupList = list[group];
            groupList.forEach(k => {
                let v = (activeNpc[type][k] || (type === 'attributes' ? 1 : 0));
                if (simulatedVal !== null && k === key) v = simulatedVal;
                
                if (type === 'attributes') spent += Math.max(0, v - 1);
                else spent += v;
            });
        }
    }
    // Disciplines
    else if (type === 'disciplines') {
        cap = 2; 
        Object.keys(activeNpc.disciplines).forEach(k => {
            let v = activeNpc.disciplines[k];
            if (simulatedVal !== null && k === key) v = simulatedVal;
            spent += v;
        });
    }
    // Backgrounds
    else if (type === 'backgrounds') {
        cap = 5;
        Object.keys(activeNpc.backgrounds).forEach(k => {
            let v = activeNpc.backgrounds[k];
            if (simulatedVal !== null && k === key) v = simulatedVal;
            spent += v;
        });
    }
    // Virtues
    else if (type === 'virtues') {
        cap = currentTemplate.getVirtueLimit(activeNpc);
        VIRTUES.forEach(k => {
            let v = (activeNpc.virtues[k] || 1);
            if (simulatedVal !== null && k === key) v = simulatedVal;
            spent += Math.max(0, v - 1);
        });
    }
    // Humanity
    else if (type === 'humanity') {
        cap = (activeNpc.virtues.Conscience||1) + (activeNpc.virtues["Self-Control"]||1);
        spent = simulatedVal !== null ? simulatedVal : activeNpc.humanity;
    }
    // Willpower
    else if (type === 'willpower') {
        cap = (activeNpc.virtues.Courage||1);
        spent = simulatedVal !== null ? simulatedVal : activeNpc.willpower;
    }

    let currentTraitContrib = 0;
    let currentValForCalc = simulatedVal !== null ? simulatedVal : (key ? activeNpc[type][key] : activeNpc[type]);
    if(type === 'attributes' || type === 'virtues') currentValForCalc = Math.max(0, currentValForCalc - 1);
    
    let baseSpent = spent - currentValForCalc;
    
    let startContrib = type === 'attributes' || type === 'virtues' ? Math.max(0, startVal - 1) : startVal;
    let endContrib = type === 'attributes' || type === 'virtues' ? Math.max(0, endVal - 1) : endVal;
    
    let totalStart = baseSpent + startContrib;
    let totalEnd = baseSpent + endContrib;
    
    let overageStart = Math.max(0, totalStart - cap);
    let overageEnd = Math.max(0, totalEnd - cap);
    
    let chargedDots = overageEnd - overageStart;
    
    if (chargedDots > 0) {
        const costPerDot = currentTemplate.getCost('freebie', type, key, 0, 1, activeNpc);
        return chargedDots * costPerDot;
    }
    
    return 0;
}

function validateFreebieRefund(type, key, newVal) {
    if (type === 'attributes' || type === 'abilities') {
        let group = null;
        const list = (type === 'attributes') ? ATTRIBUTES : ABILITIES;
        
        if (list.Physical && list.Physical.includes(key)) group = 'Physical';
        else if (list.Social && list.Social.includes(key)) group = 'Social';
        else if (list.Mental && list.Mental.includes(key)) group = 'Mental';
        else if (list.Talents && list.Talents.includes(key)) group = 'Talents';
        else if (list.Skills && list.Skills.includes(key)) group = 'Skills';
        else if (list.Knowledges && list.Knowledges.includes(key)) group = 'Knowledges';

        if (!group) return true;

        const priorities = (type === 'attributes') ? localPriorities.attr : localPriorities.abil;
        const limit = priorities[group];
        if (limit === null) return true;

        let total = 0;
        const groupList = list[group];
        groupList.forEach(k => {
            const v = (k === key) ? newVal : (activeNpc[type][k] || (type==='attributes'?1:0));
            if (type === 'attributes') total += Math.max(0, (v||1) - 1);
            else total += v;
        });

        return total >= limit;
    }
    if (type === 'disciplines') {
        let total = 0;
        Object.keys(activeNpc.disciplines).forEach(k => {
            const v = (k === key) ? newVal : activeNpc.disciplines[k];
            total += v;
        });
        return total >= 2; 
    }
    if (type === 'backgrounds') {
        let total = 0;
        Object.keys(activeNpc.backgrounds).forEach(k => {
            const v = (k === key) ? newVal : activeNpc.backgrounds[k];
            total += v;
        });
        return total >= 5;
    }
    if (type === 'virtues') {
        let total = 0;
        VIRTUES.forEach(k => {
            const v = (k === key) ? newVal : (activeNpc.virtues[k] || 1);
            total += Math.max(0, v - 1);
        });
        const limit = currentTemplate.getVirtueLimit(activeNpc);
        return total >= limit;
    }
    if (type === 'humanity') {
        const base = (activeNpc.virtues.Conscience||1) + (activeNpc.virtues["Self-Control"]||1);
        return newVal >= base;
    }
    if (type === 'willpower') {
        const base = (activeNpc.virtues.Courage||1);
        return newVal >= base;
    }
    return true;
}

function applyChange(type, key, val) {
    if (key) activeNpc[type][key] = val;
    else activeNpc[type] = val;

    if (type === 'virtues') recalcStatus();

    renderAllDots();
    renderDisciplines();
    renderBackgrounds();
    updateXpLog();
    updateFreebieCalc();
}

// --- DOT RENDERING & INTERACTION ---

function renderAttributeColumn(group) {
    // SAFEGUARD: Ensure group exists in ATTRIBUTES
    if (!ATTRIBUTES[group]) return `<div>Error: ${group} undefined</div>`;
    
    const list = ATTRIBUTES[group];
    return `
        <div>
            <h3 class="column-title">${group} <span id="cnt-attr-${group}" class="text-[10px] text-gray-500 ml-1"></span></h3>
            <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('attr', group)}</div>
            <div id="list-attr-${group}">${list.map(k => renderDotRow('attributes', k, activeNpc.attributes[k], group)).join('')}</div>
        </div>
    `;
}

function renderAbilityColumn(group) {
    if (!ABILITIES[group]) return `<div>Error: ${group} undefined</div>`;

    const list = ABILITIES[group];
    return `
        <div>
            <h3 class="column-title">${group} <span id="cnt-abil-${group}" class="text-[10px] text-gray-500 ml-1"></span></h3>
            <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('abil', group)}</div>
            <div id="list-abil-${group}">${list.map(k => renderDotRow('abilities', k, activeNpc.abilities[k], group)).join('')}</div>
        </div>
    `;
}

function renderDotRow(type, key, val, group) {
    return `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="${type}" data-key="${key}" data-group="${group}">
            <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${key}</span>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val || 0, 5)}</div>
        </div>
    `;
}

function renderAllDots() {
    ['Physical', 'Social', 'Mental'].forEach(g => {
        const el = document.getElementById(`list-attr-${g}`);
        if (el && ATTRIBUTES[g]) {
            el.innerHTML = ATTRIBUTES[g].map(k => renderDotRow('attributes', k, activeNpc.attributes[k], g)).join('');
        }
    });

    ['Talents', 'Skills', 'Knowledges'].forEach(g => {
        const el = document.getElementById(`list-abil-${g}`);
        if (el && ABILITIES[g]) {
            el.innerHTML = ABILITIES[g].map(k => renderDotRow('abilities', k, activeNpc.abilities[k], g)).join('');
        }
    });
    
    const vList = document.getElementById('npc-virtue-list');
    if(vList) vList.innerHTML = VIRTUES.map(k => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="virtues" data-key="${k}">
            <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${k}</span>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(activeNpc.virtues[k] || 1, 5)}</div>
        </div>
    `).join('');

    const humRow = document.getElementById('npc-humanity-row');
    if(humRow) humRow.innerHTML = renderDots(activeNpc.humanity, 10);
    
    const willRow = document.getElementById('npc-willpower-row');
    if(willRow) willRow.innerHTML = renderDots(activeNpc.willpower, 10);
    
    // ADDED: Update Blood Pool Input (if not currently being typed in)
    const bloodIn = document.getElementById('npc-blood');
    if(bloodIn && document.activeElement !== bloodIn) {
        bloodIn.value = activeNpc.bloodPool || 0;
    }
    
    bindDotClicks();
    updatePrioritiesUI();
}

function renderDisciplines() {
    const list = document.getElementById('npc-disc-list');
    if(!list) return;
    list.innerHTML = Object.entries(activeNpc.disciplines).map(([k,v]) => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="disciplines" data-key="${k}">
            <div class="flex gap-2 items-center">
                <i class="fas fa-times text-red-500 cursor-pointer text-xs hover:text-white" onclick="window.removeNpcItem('disciplines', '${k}')"></i>
                <span class="text-[10px] uppercase font-bold text-white">${k}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(v, 5)}</div>
        </div>
    `).join('');
    bindDotClicks();
}

function renderBackgrounds() {
    const list = document.getElementById('npc-back-list');
    if(!list) return;
    list.innerHTML = Object.entries(activeNpc.backgrounds).map(([k,v]) => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="backgrounds" data-key="${k}">
            <div class="flex gap-2 items-center">
                <i class="fas fa-times text-red-500 cursor-pointer text-xs hover:text-white" onclick="window.removeNpcItem('backgrounds', '${k}')"></i>
                <span class="text-[10px] uppercase font-bold text-white">${k}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(v, 5)}</div>
        </div>
    `).join('');
    bindDotClicks();
}

function renderMeritsFlaws() {
    const mList = document.getElementById('npc-merits-list');
    const fList = document.getElementById('npc-flaws-list');
    
    mList.innerHTML = Object.entries(activeNpc.merits).map(([k,v]) => 
        `<div class="flex justify-between text-[9px] text-gray-300 bg-black/50 p-1 rounded"><span>${k}</span><span>${v} pts <i class="fas fa-times text-red-500 ml-2 cursor-pointer" onclick="window.removeNpcItem('merits', '${k}')"></i></span></div>`
    ).join('');
    
    fList.innerHTML = Object.entries(activeNpc.flaws).map(([k,v]) => 
        `<div class="flex justify-between text-[9px] text-red-300 bg-black/50 p-1 rounded"><span>${k}</span><span>${v} pts <i class="fas fa-times text-red-500 ml-2 cursor-pointer" onclick="window.removeNpcItem('flaws', '${k}')"></i></span></div>`
    ).join('');
}

window.removeNpcItem = function(type, key) {
    // Log removal for Freebie Mode if applicable
    if (modes.freebie) {
        // Find if this item was bought in freebie mode log
        const logIdx = activeNpc.freebieLog.findIndex(l => l.type === (type==='merits'?'merit':'flaw') && l.trait === key);
        if (logIdx !== -1) activeNpc.freebieLog.splice(logIdx, 1);
    }

    if(activeNpc[type]) delete activeNpc[type][key];
    renderDisciplines();
    renderBackgrounds();
    renderMeritsFlaws();
    updateFreebieCalc();
}

function bindDotClicks() {
    document.querySelectorAll('.dot-interactive').forEach(row => {
        row.onclick = (e) => {
            if(!e.target.classList.contains('dot')) return;
            const { type, key } = row.dataset;
            const newVal = parseInt(e.target.dataset.v);
            handleValueChange(type, key, newVal);
        };
    });

    const bindDirect = (id, type) => {
        const el = document.getElementById(id);
        if(el) el.onclick = (e) => {
            if(!e.target.classList.contains('dot')) return;
            handleValueChange(type, null, parseInt(e.target.dataset.v));
        }
    };
    bindDirect('npc-humanity-row', 'humanity');
    bindDirect('npc-willpower-row', 'willpower');
}

function renderPrioButtons(cat, group) {
    const vals = currentTemplate.getPriorities()[cat];
    // Safety check if template doesn't use priorities (like Animal)
    if (!vals) return '';
    return vals.map(v => `
        <button class="npc-prio-btn w-6 h-6 rounded-full border border-gray-600 text-[9px] font-bold text-gray-400 hover:text-white hover:border-[#d4af37] transition-all"
            data-cat="${cat}" data-group="${group}" data-val="${v}">${v}</button>
    `).join('');
}

function updatePrioritiesUI() {
    const btns = document.querySelectorAll('.npc-prio-btn');
    btns.forEach(btn => {
        const { cat, group, val } = btn.dataset;
        const v = parseInt(val);
        const current = localPriorities[cat][group];

        btn.className = "npc-prio-btn w-6 h-6 rounded-full border text-[9px] font-bold transition-all mr-1 ";
        if (current === v) {
            btn.classList.add('bg-[#d4af37]', 'text-black', 'border-[#d4af37]');
        } else if (Object.values(localPriorities[cat]).includes(v)) {
            btn.classList.add('border-gray-800', 'text-gray-600', 'opacity-30', 'cursor-not-allowed');
        } else {
            btn.classList.add('border-gray-600', 'text-gray-400', 'hover:border-[#d4af37]', 'hover:text-white');
            btn.onclick = () => {
                if(modes.xp || modes.freebie) return;
                const existingOwner = Object.keys(localPriorities[cat]).find(k => localPriorities[cat][k] === v);
                if(existingOwner) localPriorities[cat][existingOwner] = null;
                localPriorities[cat][group] = v;
                updatePrioritiesUI();
                renderAllDots();
            };
        }
    });

    ['attr', 'abil'].forEach(cat => {
        Object.keys(localPriorities[cat]).forEach(grp => {
            const limit = localPriorities[cat][grp];
            const el = document.getElementById(`cnt-${cat}-${grp}`);
            if(!el) return;
            let spent = 0;
            const list = (cat === 'attr') ? ATTRIBUTES[grp] : ABILITIES[grp];
            list.forEach(k => {
                const val = (cat === 'attr') ? activeNpc.attributes[k] : activeNpc.abilities[k];
                spent += (cat === 'attr') ? Math.max(0, (val||1)-1) : (val||0);
            });
            if (limit) {
                const color = spent > limit ? 'text-red-500' : (spent === limit ? 'text-green-500' : 'text-gray-500');
                el.innerHTML = `<span class="${color}">${spent}/${limit}</span>`;
            } else {
                el.innerHTML = `[${spent}]`;
            }
        });
    });
}

function updateVirtueDisplay() {
    const limit = currentTemplate.getVirtueLimit(activeNpc);
    const el = document.getElementById('virtue-limit-display');
    if(el) el.innerText = `(Max ${limit} Dots)`;
}

// --- LOGGING & SIDEBARS ---

function updateXpLog() {
    if(!modes.xp) return;
    const spentDiv = document.getElementById('npc-xp-spent');
    const remDiv = document.getElementById('npc-xp-remain');
    
    // Recalculate totals from log
    let costs = { attr: 0, abil: 0, disc: 0, back: 0, virt: 0, hum: 0, will: 0, merit: 0, flaw: 0 };
    let spentTotal = 0;

    activeNpc.experience.log.forEach(entry => {
        const type = entry.type; 
        const cost = entry.cost;
        spentTotal += cost;

        if (type === 'attributes') costs.attr += cost;
        else if (type === 'abilities') costs.abil += cost;
        else if (type === 'disciplines') costs.disc += cost;
        else if (type === 'backgrounds') costs.back += cost;
        else if (type === 'virtues') costs.virt += cost;
        else if (type === 'humanity') costs.hum += cost;
        else if (type === 'willpower') costs.will += cost;
    });

    activeNpc.experience.spent = spentTotal; // Sync state
    
    if(spentDiv) spentDiv.innerText = activeNpc.experience.spent;
    if(remDiv) remDiv.innerText = activeNpc.experience.total - activeNpc.experience.spent;

    // Update Category Breakdown (Matched to Freebie Layout)
    const setXpCost = (id, val) => {
        const el = document.getElementById(id);
        if(el) {
            el.innerText = val;
            el.className = val > 0 ? "text-purple-400 font-bold" : "text-gray-500";
        }
    };
    
    setXpCost('npc-xp-cost-attr', costs.attr);
    setXpCost('npc-xp-cost-abil', costs.abil);
    setXpCost('npc-xp-cost-disc', costs.disc);
    setXpCost('npc-xp-cost-back', costs.back);
    setXpCost('npc-xp-cost-virt', costs.virt);
    setXpCost('npc-xp-cost-hum', costs.hum);
    setXpCost('npc-xp-cost-will', costs.will);

    // Update Log
    const logDiv = document.getElementById('npc-xp-list');
    if(logDiv) {
        if(activeNpc.experience.log.length === 0) {
            logDiv.innerHTML = '<div class="italic opacity-50">No XP spent.</div>';
        } else {
            // Newest at top
            logDiv.innerHTML = activeNpc.experience.log.slice().reverse().map(l => {
                const date = new Date(l.date).toLocaleDateString(undefined, { month:'short', day:'numeric' });
                return `
                    <div class="flex justify-between border-b border-[#222] pb-1 mb-1 text-[9px]">
                        <div><span class="text-gray-500">[${date}]</span> <span class="text-white font-bold">${l.trait}</span></div>
                        <div class="text-purple-400 font-bold">-${l.cost}</div>
                    </div>
                    <div class="text-[8px] text-gray-600 mb-1 italic">${l.from} &rarr; ${l.to}</div>
                `;
            }).join('');
        }
    }
}

function updateFreebieCalc() {
    if(!modes.freebie) return;
    
    let costs = { attr: 0, abil: 0, disc: 0, back: 0, virt: 0, hum: 0, will: 0, merit: 0, flaw: 0 };
    let totalSpent = 0;
    
    activeNpc.freebieLog.forEach(l => {
        totalSpent += l.cost;
        if (l.type === 'attributes') costs.attr += l.cost;
        else if (l.type === 'abilities') costs.abil += l.cost;
        else if (l.type === 'disciplines') costs.disc += l.cost;
        else if (l.type === 'backgrounds') costs.back += l.cost;
        else if (l.type === 'virtues') costs.virt += l.cost;
        else if (l.type === 'humanity') costs.hum += l.cost;
        else if (l.type === 'willpower') costs.will += l.cost;
        else if (l.type === 'merit') costs.merit += l.cost;
        else if (l.type === 'flaw') costs.flaw += Math.abs(l.cost); // Flaws are usually bonus, so track magnitude here
    });

    const remaining = 21 - totalSpent;

    const setCost = (id, val) => {
        const el = document.getElementById(id);
        if(el) {
            el.innerText = val;
            el.className = val > 0 ? "text-red-400 font-bold" : "text-gray-500";
        }
    };
    
    setCost('npc-fb-cost-attr', costs.attr);
    setCost('npc-fb-cost-abil', costs.abil);
    setCost('npc-fb-cost-disc', costs.disc);
    setCost('npc-fb-cost-back', costs.back);
    setCost('npc-fb-cost-virt', costs.virt);
    setCost('npc-fb-cost-hum', costs.hum);
    setCost('npc-fb-cost-will', costs.will);
    setCost('npc-fb-cost-merit', costs.merit);
    
    const flawEl = document.getElementById('npc-fb-cost-flaw');
    if(flawEl) {
        flawEl.innerText = costs.flaw;
        flawEl.className = costs.flaw > 0 ? "text-green-400 font-bold" : "text-gray-500";
    }
    
    const fbEl = document.getElementById('npc-fb-final');
    if(fbEl) {
        fbEl.innerText = remaining;
        fbEl.className = remaining >= 0 ? "text-4xl font-black text-white mt-2 font-cinzel" : "text-4xl font-black text-red-500 mt-2 font-cinzel";
    }
    
    const fbTotalCalc = document.getElementById('npc-fb-total-calc');
    if(fbTotalCalc) {
        fbTotalCalc.innerText = remaining;
        fbTotalCalc.className = remaining >= 0 ? "text-green-400" : "text-red-500";
    }

    const logEl = document.getElementById('npc-fb-log-list');
    if(logEl) {
        if (activeNpc.freebieLog.length === 0) logEl.innerHTML = '<div class="italic opacity-50">No freebie points spent.</div>';
        else {
            logEl.innerHTML = activeNpc.freebieLog.slice().reverse().map(l => {
                const isBonus = l.cost < 0;
                const costDisplay = isBonus ? `+${Math.abs(l.cost)}` : `-${l.cost}`;
                const color = isBonus ? 'text-green-400' : 'text-red-400';
                
                let detail = "";
                if (l.from !== undefined && l.to !== undefined) {
                    detail = `${l.from} &rarr; ${l.to}`;
                } else {
                    detail = "Added";
                }

                return `
                    <div class="flex justify-between border-b border-[#222] pb-1 mb-1 text-[9px]">
                        <div><span class="text-white font-bold">${l.trait}</span></div>
                        <div class="${color} font-bold">${costDisplay}</div>
                    </div>
                    <div class="text-[8px] text-gray-600 mb-1 italic">${detail}</div>
                `;
            }).join('');
        }
    }
}

// --- SAVE ---

function saveNpc() {
    activeNpc.name = document.getElementById('npc-name').value;
    activeNpc.player = ""; // Explicitly cleared as requested
    activeNpc.domitor = document.getElementById('npc-domitor') ? document.getElementById('npc-domitor').value : "";
    activeNpc.concept = document.getElementById('npc-concept').value;
    activeNpc.nature = document.getElementById('npc-nature').value;
    activeNpc.demeanor = document.getElementById('npc-demeanor').value;
    
    const bioInputs = document.querySelectorAll('.npc-bio');
    bioInputs.forEach(i => activeNpc.bio[i.dataset.field] = i.value);
    activeNpc.bio.Description = document.getElementById('npc-desc').value;
    activeNpc.bio.Notes = document.getElementById('npc-notes').value;
    
    const bloodInput = document.getElementById('npc-blood');
    activeNpc.bloodPool = bloodInput ? parseInt(bloodInput.value) || 10 : 10;

    // ADDED: Sync current pools to permanent ratings
    // This ensures that when creating/editing an NPC, they start with full pools
    // Fixes issue where Animals show correct Max Blood but empty Current Blood boxes
    activeNpc.currentBlood = activeNpc.bloodPool;
    activeNpc.tempWillpower = activeNpc.willpower;

    activeNpc.priorities = JSON.parse(JSON.stringify(localPriorities));

    // Explicitly grab dynamic template fields that might not be auto-bound
    const clanEl = document.getElementById('npc-extra-clan');
    if (clanEl) activeNpc.domitorClan = clanEl.value;

    const famEl = document.getElementById('npc-extra-family');
    if (famEl) activeNpc.family = famEl.value;

    const spEl = document.getElementById('npc-species');
    if (spEl) activeNpc.species = spEl.value;

    const occEl = document.getElementById('npc-occupation');
    if (occEl) activeNpc.occupation = occEl.value;
    
    const subType = document.getElementById('npc-subtype');
    if (subType) activeNpc.type = subType.value;

    const weak = document.getElementById('g-weakness');
    if (weak) activeNpc.weakness = weak.value;

    const natW = document.getElementById('npc-nat-weapons');
    if (natW) activeNpc.naturalWeapons = natW.value;

    // Bond Level
    const bondEl = document.getElementById('npc-bond-level');
    if (bondEl) activeNpc.bondLevel = parseInt(bondEl.value) || 0;

    // Toggle Check
    const ghoulToggle = document.getElementById('npc-ghoul-toggle');
    if (ghoulToggle) activeNpc.ghouled = ghoulToggle.checked;

    // SANITIZATION: Clean undefined values before saving to prevent Firebase errors
    const cleanNpc = JSON.parse(JSON.stringify(activeNpc));

    if (!window.state.retainers) window.state.retainers = [];
    if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = cleanNpc;
    else window.state.retainers.push(cleanNpc);

    if (window.renderNpcTab) window.renderNpcTab();
    showNotification(`${currentTemplate.label} Saved.`);
    document.getElementById('npc-modal').style.display = 'none';
}

// --- UNSAVED CHANGES PROTECTION ---
window.addEventListener('beforeunload', (e) => {
    // Only warn if a character name exists (implies work has been done)
    const name = window.state?.textFields?.['c-name'];
    if (name) {
        e.preventDefault();
        e.returnValue = ''; // Legacy support for Chrome
        return "Unsaved changes may be lost.";
    }
});
