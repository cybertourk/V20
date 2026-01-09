import { ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, CLAN_DISCIPLINES } from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// --- STATE MANAGEMENT ---
if (!window.ghoulState) {
    window.ghoulState = resetGhoulState();
}

function resetGhoulState() {
    return {
        step: 1,
        concept: { name: "", nature: "", demeanor: "", type: "Vassal", domitorClan: "", family: "" },
        attr: { Physical: 1, Social: 1, Mental: 1, priorities: { primary: null, secondary: null, tertiary: null } },
        attrDots: { Strength: 1, Dexterity: 1, Stamina: 1, Charisma: 1, Manipulation: 1, Appearance: 1, Perception: 1, Intelligence: 1, Wits: 1 },
        abil: { priorities: { primary: null, secondary: null, tertiary: null } },
        abilDots: {},
        disc: { Potence: 1 }, // Potence 1 is automatic
        back: {},
        virt: { Conscience: 1, "Self-Control": 1, Courage: 1 },
        humanity: 0,
        willpower: 0,
        bloodPool: 2, // Default approx
        freebies: 21,
        spentFreebies: [],
        completed: false
    };
}

// --- MAIN ENTRY POINT ---
export function openGhoulCreator() {
    window.ghoulState = resetGhoulState();
    renderGhoulCreator();
}

function renderGhoulCreator() {
    // Ensure container exists
    let modal = document.getElementById('ghoul-creator-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ghoul-creator-modal';
        modal.className = "fixed inset-0 bg-black/95 z-50 flex flex-col p-4 overflow-y-auto text-gray-200 font-serif";
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');

    const s = window.ghoulState;
    
    // Header
    let html = `
        <div class="flex justify-between items-center border-b border-red-900 pb-2 mb-4">
            <h1 class="text-2xl text-red-600 font-bold uppercase tracking-widest">Ghoul Creator</h1>
            <button onclick="document.getElementById('ghoul-creator-modal').classList.add('hidden')" class="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>
        
        <!-- STEP NAVIGATION -->
        <div class="flex gap-2 mb-6 justify-center">
            ${[1,2,3,4,5].map(i => `
                <button onclick="window.setGhoulStep(${i})" class="px-3 py-1 text-xs border ${s.step === i ? 'border-red-500 bg-red-900/30 text-white' : 'border-[#333] text-gray-600'} uppercase font-bold transition-colors">
                    Step ${i}
                </button>
            `).join('')}
        </div>

        <div id="ghoul-step-content" class="flex-1 max-w-4xl mx-auto w-full">
            <!-- Content Injected Here -->
        </div>
        
        <div class="mt-4 pt-4 border-t border-[#333] flex justify-between">
            <div class="text-xs text-gray-500">V20 Rules: Attributes 6/4/3, Abilities 11/7/4, Freebies 21</div>
            ${s.step === 5 ? `<button onclick="window.saveGhoul()" class="bg-green-800 hover:bg-green-700 text-white px-4 py-2 font-bold uppercase rounded text-sm">Save Ghoul</button>` : ''}
        </div>
    `;
    
    modal.innerHTML = html;
    renderStepContent();
}

window.setGhoulStep = (step) => {
    window.ghoulState.step = step;
    renderGhoulCreator();
};

function renderStepContent() {
    const cont = document.getElementById('ghoul-step-content');
    if (!cont) return;
    const s = window.ghoulState;

    if (s.step === 1) {
        // --- STEP 1: CONCEPT ---
        cont.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                    <input type="text" class="w-full bg-[#111] border border-[#444] p-2 text-white" value="${s.concept.name}" onchange="window.ghoulState.concept.name = this.value">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Ghoul Type</label>
                    <select class="w-full bg-[#111] border border-[#444] p-2 text-white" onchange="window.ghoulState.concept.type = this.value; window.renderGhoulCreator();">
                        <option value="Vassal" ${s.concept.type==='Vassal'?'selected':''}>Vassal (Bound)</option>
                        <option value="Independent" ${s.concept.type==='Independent'?'selected':''}>Independent</option>
                        <option value="Revenant" ${s.concept.type==='Revenant'?'selected':''}>Revenant</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nature</label>
                    <input type="text" class="w-full bg-[#111] border border-[#444] p-2 text-white" value="${s.concept.nature}" onchange="window.ghoulState.concept.nature = this.value">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Demeanor</label>
                    <input type="text" class="w-full bg-[#111] border border-[#444] p-2 text-white" value="${s.concept.demeanor}" onchange="window.ghoulState.concept.demeanor = this.value">
                </div>
                ${s.concept.type === 'Vassal' ? `
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Domitor's Clan (Guides Disciplines)</label>
                    <select class="w-full bg-[#111] border border-[#444] p-2 text-white" onchange="window.ghoulState.concept.domitorClan = this.value">
                        <option value="">-- Select Clan --</option>
                        ${Object.keys(CLAN_DISCIPLINES).map(c => `<option value="${c}" ${s.concept.domitorClan===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                </div>` : ''}
                ${s.concept.type === 'Revenant' ? `
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Revenant Family</label>
                    <input type="text" class="w-full bg-[#111] border border-[#444] p-2 text-white" placeholder="e.g. Grimaldi, Zantosa" value="${s.concept.family}" onchange="window.ghoulState.concept.family = this.value">
                </div>` : ''}
            </div>
        `;
    } else if (s.step === 2) {
        // --- STEP 2: ATTRIBUTES (6/4/3) ---
        // Basic priority selector logic simplified for this view
        const cats = ['Physical', 'Social', 'Mental'];
        
        let html = `<div class="mb-4 text-center text-sm text-gray-400">Prioritize Categories (6 / 4 / 3). Start with 1 dot free.</div><div class="grid grid-cols-3 gap-6">`;
        
        cats.forEach(cat => {
            const currentVal = calculateAttrDots(cat);
            const limit = getAttrLimit(cat);
            
            html += `
                <div class="bg-[#111] p-3 border border-[#333]">
                    <div class="flex justify-between items-center mb-2 border-b border-[#333] pb-1">
                        <span class="font-bold uppercase text-red-500">${cat}</span>
                        <select class="text-xs bg-black border border-[#444]" onchange="window.setGhoulPriority('attr', '${cat}', this.value)">
                            <option value="">-</option>
                            <option value="primary" ${s.attr.priorities[cat.toLowerCase()] === 'primary' ? 'selected' : ''}>Primary (6)</option>
                            <option value="secondary" ${s.attr.priorities[cat.toLowerCase()] === 'secondary' ? 'selected' : ''}>Secondary (4)</option>
                            <option value="tertiary" ${s.attr.priorities[cat.toLowerCase()] === 'tertiary' ? 'selected' : ''}>Tertiary (3)</option>
                        </select>
                    </div>
                    <div class="text-[10px] text-right mb-2 text-gray-500">Spent: ${currentVal} / ${limit}</div>
                    <div class="space-y-2">
            `;
            
            ATTRIBUTES[cat].forEach(attr => {
                html += `
                    <div class="flex justify-between items-center text-xs">
                        <span>${attr}</span>
                        <div class="cursor-pointer" onclick="window.addGhoulDot('attr', '${attr}', '${cat}')">
                            ${renderDots(s.attrDots[attr], 5)}
                        </div>
                    </div>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;
        cont.innerHTML = html;

    } else if (s.step === 3) {
        // --- STEP 3: ABILITIES (11/7/4) ---
        const cats = ['Talents', 'Skills', 'Knowledges'];
        let html = `<div class="mb-4 text-center text-sm text-gray-400">Prioritize Categories (11 / 7 / 4). Max 3 dots per Ability.</div><div class="grid grid-cols-3 gap-6">`;
        
        cats.forEach(cat => {
            const currentVal = calculateAbilDots(cat);
            const limit = getAbilLimit(cat);
            
            html += `
                <div class="bg-[#111] p-3 border border-[#333]">
                    <div class="flex justify-between items-center mb-2 border-b border-[#333] pb-1">
                        <span class="font-bold uppercase text-blue-400">${cat}</span>
                        <select class="text-xs bg-black border border-[#444]" onchange="window.setGhoulPriority('abil', '${cat}', this.value)">
                            <option value="">-</option>
                            <option value="primary" ${s.abil.priorities[cat.toLowerCase()] === 'primary' ? 'selected' : ''}>Primary (11)</option>
                            <option value="secondary" ${s.abil.priorities[cat.toLowerCase()] === 'secondary' ? 'selected' : ''}>Secondary (7)</option>
                            <option value="tertiary" ${s.abil.priorities[cat.toLowerCase()] === 'tertiary' ? 'selected' : ''}>Tertiary (4)</option>
                        </select>
                    </div>
                    <div class="text-[10px] text-right mb-2 text-gray-500">Spent: ${currentVal} / ${limit}</div>
                    <div class="space-y-1 h-64 overflow-y-auto pr-2">
            `;
            
            ABILITIES[cat].forEach(abil => {
                const val = s.abilDots[abil] || 0;
                html += `
                    <div class="flex justify-between items-center text-xs">
                        <span>${abil}</span>
                        <div class="cursor-pointer" onclick="window.addGhoulDot('abil', '${abil}', '${cat}')">
                            ${renderDots(val, 5)}
                        </div>
                    </div>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;
        cont.innerHTML = html;

    } else if (s.step === 4) {
        // --- STEP 4: ADVANTAGES ---
        const discPoints = Object.values(s.disc).reduce((a,b)=>a+b,0) - 1; // Subtract auto potence
        const backPoints = Object.values(s.back).reduce((a,b)=>a+b,0);
        // Virtues start at 1 free.
        const virtPoints = (s.virt.Conscience - 1) + (s.virt["Self-Control"] - 1) + (s.virt.Courage - 1);
        const virtLimit = (s.concept.type === 'Revenant') ? 5 : 7;

        cont.innerHTML = `
            <div class="grid grid-cols-3 gap-6">
                <!-- Disciplines -->
                <div class="bg-[#111] p-3 border border-[#333]">
                    <h3 class="font-bold text-purple-400 mb-2 border-b border-[#333]">Disciplines (${discPoints}/1)</h3>
                    <div class="text-xs text-gray-500 mb-2">Potence 1 is automatic. Choose 1 other (Level 1).</div>
                    <div class="space-y-2 mb-2">
                        ${Object.entries(s.disc).map(([k,v]) => `
                            <div class="flex justify-between text-xs">
                                <span>${k}</span>
                                <span>${renderDots(v, 1)} ${k!=='Potence'?'<span onclick="delete window.ghoulState.disc[\''+k+'\']; window.renderGhoulCreator()" class="cursor-pointer ml-1 text-red-500">×</span>':''}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${discPoints < 1 ? `
                        <input type="text" placeholder="Add Discipline..." class="w-full bg-black border border-[#444] text-xs p-1" onkeydown="if(event.key==='Enter'){ window.ghoulState.disc[this.value]=1; window.renderGhoulCreator(); }">
                    ` : '<div class="text-xs text-green-500">Limit Reached</div>'}
                </div>

                <!-- Backgrounds -->
                <div class="bg-[#111] p-3 border border-[#333]">
                    <h3 class="font-bold text-gold mb-2 border-b border-[#333]">Backgrounds (${backPoints}/5)</h3>
                    <div class="space-y-2 mb-2 h-40 overflow-y-auto">
                        ${Object.entries(s.back).map(([k,v]) => `
                            <div class="flex justify-between text-xs items-center">
                                <span>${k}</span>
                                <div class="flex gap-1">
                                    <span class="cursor-pointer" onclick="window.ghoulState.back['${k}'] = Math.max(0, ${v}-1); if(window.ghoulState.back['${k}']==0) delete window.ghoulState.back['${k}']; window.renderGhoulCreator()">-</span>
                                    <span>${v}</span>
                                    <span class="cursor-pointer" onclick="if(${backPoints}<5) { window.ghoulState.back['${k}'] = Math.min(5, ${v}+1); window.renderGhoulCreator(); }">+</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${backPoints < 5 ? `
                        <select class="w-full bg-black border border-[#444] text-xs p-1" onchange="if(this.value){ window.ghoulState.back[this.value] = (window.ghoulState.back[this.value]||0)+1; window.renderGhoulCreator(); }">
                            <option value="">+ Add Background</option>
                            ${BACKGROUNDS.map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                    ` : ''}
                </div>

                <!-- Virtues -->
                <div class="bg-[#111] p-3 border border-[#333]">
                    <h3 class="font-bold text-white mb-2 border-b border-[#333]">Virtues (${virtPoints}/${virtLimit})</h3>
                    ${VIRTUES.map(v => `
                        <div class="flex justify-between items-center text-xs mb-1">
                            <span>${v}</span>
                            <div class="cursor-pointer" onclick="window.addGhoulVirtue('${v}', ${virtLimit})">
                                ${renderDots(s.virt[v], 5)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (s.step === 5) {
        // --- STEP 5: FREEBIES ---
        // Calc Base Stats
        s.humanity = (s.virt.Conscience || 1) + (s.virt["Self-Control"] || 1);
        s.willpower = s.virt.Courage || 1;
        
        cont.innerHTML = `
            <div class="flex gap-4">
                <div class="flex-1 bg-[#111] p-3 border border-[#333]">
                    <h3 class="font-bold text-white border-b border-[#333] mb-2">Final Touches</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>Humanity: <span class="text-white font-bold">${s.humanity}</span></div>
                        <div>Willpower: <span class="text-white font-bold">${s.willpower}</span></div>
                        <div>Blood Pool: <input type="number" class="w-12 bg-black border border-[#444] text-center" value="${s.bloodPool}" onchange="window.ghoulState.bloodPool = parseInt(this.value)"></div>
                    </div>
                    <div class="text-xs text-gray-400">
                        Spend 21 Freebie Points to raise traits. Use the previous tabs to increment values; logic for "Freebie Mode" in this simplified creator is manual or requires re-visiting steps.
                        <br><br>
                        *Since this is a "Lite" creator, please manually adjust dots in previous steps if using Freebies, or just save and edit in play mode.*
                    </div>
                </div>
                <div class="w-1/3 bg-[#111] p-3 border border-[#333]">
                    <h3 class="font-bold text-gold border-b border-[#333] mb-2">Summary</h3>
                    <div class="text-xs space-y-1">
                        <div>Name: ${s.concept.name}</div>
                        <div>Type: ${s.concept.type}</div>
                        <div>Disc: ${Object.keys(s.disc).join(', ')}</div>
                    </div>
                </div>
            </div>
        `;
    }
}
window.renderGhoulCreator = renderGhoulCreator;

// --- HELPERS ---

window.setGhoulPriority = (type, cat, priority) => {
    const s = window.ghoulState;
    // Clear previous if reassigned
    Object.keys(s[type].priorities).forEach(k => {
        if (s[type].priorities[k] === priority) s[type].priorities[k] = null;
    });
    s[type].priorities[cat.toLowerCase()] = priority;
    window.renderGhoulCreator();
};

window.addGhoulDot = (type, name, cat) => {
    const s = window.ghoulState;
    
    if (type === 'attr') {
        const priority = s.attr.priorities[cat.toLowerCase()];
        if (!priority) { showNotification("Select priority first!"); return; }
        const limit = priority === 'primary' ? 6 : (priority === 'secondary' ? 4 : 3);
        const current = calculateAttrDots(cat);
        
        if (s.attrDots[name] < 5 && current < limit) {
            s.attrDots[name]++;
        } else if (s.attrDots[name] > 1) {
            s.attrDots[name]--;
        }
    } else if (type === 'abil') {
        const priority = s.abil.priorities[cat.toLowerCase()];
        if (!priority) { showNotification("Select priority first!"); return; }
        const limit = priority === 'primary' ? 11 : (priority === 'secondary' ? 7 : 4);
        const current = calculateAbilDots(cat);
        
        const val = s.abilDots[name] || 0;
        // Max 3 dots in creation
        if (val < 3 && current < limit) {
            s.abilDots[name] = val + 1;
        } else if (val > 0) {
            s.abilDots[name] = val - 1;
            if (s.abilDots[name] === 0) delete s.abilDots[name];
        }
    }
    window.renderGhoulCreator();
};

window.addGhoulVirtue = (name, limit) => {
    const s = window.ghoulState;
    const currentTotal = (s.virt.Conscience - 1) + (s.virt["Self-Control"] - 1) + (s.virt.Courage - 1);
    
    if (s.virt[name] < 5 && currentTotal < limit) {
        s.virt[name]++;
    } else if (s.virt[name] > 1) {
        s.virt[name]--;
    }
    window.renderGhoulCreator();
};

window.saveGhoul = () => {
    const s = window.ghoulState;
    if (!s.concept.name) { showNotification("Name required!"); return; }
    
    // Construct simplified retainer object
    const retainer = {
        id: Date.now(),
        name: s.concept.name,
        type: "Ghoul (" + s.concept.type + ")",
        stats: {
            attributes: s.attrDots,
            abilities: s.abilDots,
            disciplines: s.disc,
            backgrounds: s.back,
            virtues: s.virt,
            humanity: s.humanity,
            willpower: s.willpower,
            blood: s.bloodPool
        },
        concept: s.concept
    };
    
    // Save to main state
    if (!window.state.retainers) window.state.retainers = [];
    window.state.retainers.push(retainer);
    
    showNotification("Ghoul Saved to Retainers!");
    document.getElementById('ghoul-creator-modal').classList.add('hidden');
    // Refresh Play Mode or wherever retainers are shown (implementation needed in ui-nav later)
    if(window.renderRetainersTab) window.renderRetainersTab();
};

function calculateAttrDots(cat) {
    let sum = 0;
    ATTRIBUTES[cat].forEach(a => sum += (window.ghoulState.attrDots[a] - 1));
    return sum;
}

function getAttrLimit(cat) {
    const p = window.ghoulState.attr.priorities[cat.toLowerCase()];
    if (p === 'primary') return 6;
    if (p === 'secondary') return 4;
    if (p === 'tertiary') return 3;
    return 0;
}

function calculateAbilDots(cat) {
    let sum = 0;
    ABILITIES[cat].forEach(a => sum += (window.ghoulState.abilDots[a] || 0));
    return sum;
}

function getAbilLimit(cat) {
    const p = window.ghoulState.abil.priorities[cat.toLowerCase()];
    if (p === 'primary') return 11;
    if (p === 'secondary') return 7;
    if (p === 'tertiary') return 4;
    return 0;
}
