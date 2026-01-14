import { ATTRIBUTES, ABILITIES, VIRTUES } from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";
import { toggleStat, clearPool } from "./ui-mechanics.js";

let ctx = {}; // context: { activeNpc, activeIndex }
let callbacks = {}; // { closeModal, saveNpc, toggleDiceUI }

export function initPlaySheet(context, callbackMap) {
    ctx = context;
    callbacks = callbackMap;
}

export function renderPlaySheetModal() {
    let modal = document.getElementById('npc-play-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'npc-play-modal';
        // z-index must be high, but typically below the dice roller (which is often z-[1000] or similar)
        modal.className = 'fixed inset-0 bg-black/95 z-[90] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const npc = ctx.activeNpc;

    const typeLabel = npc.template === 'ghoul' 
        ? `${npc.type || 'Ghoul'} ${npc.domitorClan ? `(${npc.domitorClan})` : ''}` 
        : (npc.template === 'animal' ? 'Animal' : 'Mortal');

    const showVirtues = npc.template !== 'animal';
    const showHumanity = npc.template !== 'animal';
    const humanityLabel = npc.template === 'vampire' ? 'Humanity / Road' : 'Humanity';

    // --- BIO & EXTRAS GENERATION ---
    
    // 1. Physical Stats (Skin, Eyes, Sex, etc.)
    const physicalStats = Object.entries(npc.bio || {})
        .filter(([k, v]) => v && k !== 'Description' && k !== 'Notes')
        .map(([k, v]) => `<div class="flex justify-between border-b border-[#333] pb-1 mb-1 text-[10px]"><span class="text-gray-500 font-bold uppercase">${k}:</span> <span class="text-gray-200">${v}</span></div>`)
        .join('');

    // 2. Weakness (Ghoul / Revenant)
    const weaknessDisplay = npc.weakness ? `
        <div class="mt-4 p-2 border border-red-900/50 bg-red-900/10 rounded">
            <span class="text-red-400 font-bold uppercase text-[10px] block mb-1">Weakness / Curse</span>
            <p class="text-xs text-red-200 italic">${npc.weakness}</p>
        </div>` : '';

    // 3. Natural Weapons (Animal) - Interactive
    const formatNaturalWeapons = (text) => {
        if (!text) return '';
        return text.replace(/([a-zA-Z0-9\s-]+)\s*\((\d+)\)/g, (match, name, dice) => {
            return `<span class="npc-attack-interact cursor-pointer text-[#d4af37] font-bold border-b border-dashed border-[#d4af37]/30 hover:text-white hover:border-white transition-colors ml-1" data-name="${name.trim()}" data-dice="${dice}">${match}</span>`;
        });
    };

    const naturalWeaponsDisplay = npc.naturalWeapons ? `
        <div class="mt-4 p-2 border border-yellow-900/50 bg-yellow-900/10 rounded">
            <span class="text-[#d4af37] font-bold uppercase text-[10px] block mb-1">Natural Weapons / Abilities</span>
            <p class="text-xs text-gray-300 leading-relaxed">${formatNaturalWeapons(npc.naturalWeapons)}</p>
        </div>` : '';

    // 4. Domitor Info
    let domitorDisplay = '';
    if (npc.domitor) {
        domitorDisplay = `<div class="mt-2 text-xs text-gray-400"><span class="font-bold text-gray-500 uppercase text-[10px]">Domitor:</span> <span class="text-white">${npc.domitor}</span>`;
        if (npc.domitorClan) domitorDisplay += ` <span class="text-gray-500">(${npc.domitorClan})</span>`;
        domitorDisplay += '</div>';
    }
    if (npc.bondLevel) {
        domitorDisplay += `<div class="mt-1 text-xs text-gray-400"><span class="font-bold text-gray-500 uppercase text-[10px]">Blood Bond:</span> <span class="text-[#d4af37]">Step ${npc.bondLevel}</span></div>`;
    }

    // --- PREPARE COMBAT STATS ---
    const dex = npc.attributes.Dexterity || 1;
    const wits = npc.attributes.Wits || 1;
    let sta = npc.attributes.Stamina || 1;
    const fort = (npc.disciplines && npc.disciplines.Fortitude) || 0;
    const pot = (npc.disciplines && npc.disciplines.Potence) || 0;

    // Filter Inventory
    const inventory = npc.inventory || [];
    const weapons = inventory.filter(i => i.type === 'Melee' || i.type === 'Ranged' || i.type === 'Weapon');
    const armor = inventory.filter(i => i.type === 'Armor');
    
    // Calculate Armor Rating
    let armorRating = 0;
    if (armor.length > 0) {
        armor.forEach(a => {
            const rating = parseInt(a.stats?.rating || a.rating || 0);
            armorRating += rating;
        });
    }

    const html = `
        <div class="w-[95%] max-w-5xl h-[95%] bg-[#0a0a0a] border border-[#444] shadow-2xl flex flex-col relative font-serif text-white overflow-hidden pb-16">
            <!-- Header -->
            <div class="bg-[#111] p-4 border-b border-[#333] flex justify-between items-center shrink-0">
                <div>
                    <h2 class="text-3xl font-cinzel font-bold text-[#d4af37] leading-none">${npc.name || "Unnamed NPC"}</h2>
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
                            ${renderSimpleDots(npc.attributes, ATTRIBUTES, 'attributes')}
                        </div>
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Abilities</h3>
                            ${renderSimpleDots(npc.abilities, ABILITIES, 'abilities')}
                        </div>
                    </div>

                    <!-- Col 2: Advantages -->
                    <div class="space-y-6">
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Disciplines</h3>
                            ${Object.keys(npc.disciplines).length > 0 
                                ? Object.entries(npc.disciplines).map(([k,v]) => `
                                    <div class="flex justify-between text-xs mb-1 font-bold group">
                                        <span class="uppercase cursor-pointer hover:text-[#d4af37] transition-colors roll-stat" data-stat="${k}" data-val="${v}" data-type="discipline">${k}</span>
                                        <span>${renderDots(v,5)}</span>
                                    </div>`).join('') 
                                : '<div class="text-gray-600 italic text-xs">None</div>'}
                        </div>
                        
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Backgrounds</h3>
                            ${Object.keys(npc.backgrounds).length > 0 
                                ? Object.entries(npc.backgrounds).map(([k,v]) => `<div class="flex justify-between text-xs mb-1 font-bold"><span class="uppercase">${k}</span><span>${renderDots(v,5)}</span></div>`).join('') 
                                : '<div class="text-gray-600 italic text-xs">None</div>'}
                        </div>

                        ${showVirtues ? `
                        <div class="sheet-section bg-black/30 p-4 border border-[#222]">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2">Virtues</h3>
                            ${VIRTUES.map(v => `<div class="flex justify-between text-xs mb-1 font-bold group">
                                <span class="uppercase cursor-pointer hover:text-[#d4af37] transition-colors roll-stat" data-stat="${v}" data-val="${npc.virtues[v]||1}" data-type="virtue">${v}</span>
                                <span>${renderDots(npc.virtues[v]||1, 5)}</span>
                            </div>`).join('')}
                        </div>` : ''}
                    </div>

                    <!-- Col 3: Vitals (Interactive) -->
                    <div class="space-y-6">
                        
                        <!-- Humanity / Road -->
                        ${showHumanity ? `
                        <div class="bg-[#111] p-4 border border-[#333]">
                             <div class="flex justify-between items-center mb-2">
                                <h3 class="text-[#d4af37] font-bold uppercase text-sm cursor-pointer hover:text-white roll-stat" data-stat="Humanity" data-val="${npc.humanity}" data-type="humanity">${humanityLabel}</h3>
                                <div class="text-xs font-bold text-gray-500">Rating: ${npc.humanity}</div>
                            </div>
                            <div class="flex justify-center gap-1">
                                ${renderDots(npc.humanity, 10)}
                            </div>
                        </div>` : ''}

                        <!-- Willpower -->
                        <div class="bg-[#111] p-4 border border-[#333]">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="text-[#d4af37] font-bold uppercase text-sm cursor-pointer hover:text-white roll-stat" data-stat="Willpower" data-val="${npc.willpower}" data-type="willpower">Willpower</h3>
                                <div class="text-xs font-bold text-gray-500">Perm: ${npc.willpower}</div>
                            </div>
                            <div class="flex justify-center gap-1 mb-2">
                                ${renderInteractiveBoxes('tempWillpower', 10, npc.tempWillpower)}
                            </div>
                        </div>

                        <!-- Blood Pool -->
                        ${npc.bloodPool > 0 ? `
                        <div class="bg-[#111] p-4 border border-[#333]">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="text-[#8b0000] font-bold uppercase text-sm">Blood Pool</h3>
                                <div class="text-xs font-bold text-gray-500">Max: ${npc.bloodPool}</div>
                            </div>
                            <div class="flex flex-wrap justify-center gap-1 mb-2">
                                ${renderInteractiveBoxes('currentBlood', npc.bloodPool, npc.currentBlood, true)}
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
                                
                                <!-- Initiative -->
                                <div class="flex justify-between border-b border-[#333] py-1 cursor-pointer hover:text-[#d4af37] transition-colors npc-combat-interact"
                                     data-action="init" data-v1="${dex}" data-v2="${wits}">
                                    <span class="font-bold">Initiative:</span> 
                                    <span>${dex + wits} + 1d10</span>
                                </div>

                                <!-- Soak (Bash) -->
                                <div class="flex justify-between border-b border-[#333] py-1 cursor-pointer hover:text-[#d4af37] transition-colors npc-combat-interact"
                                     data-action="soak" data-v1="${sta}" data-v2="${fort}" data-v3="${armorRating}">
                                    <span class="font-bold">Soak (Bash):</span> 
                                    <span>${sta + fort + armorRating} Dice</span>
                                </div>

                                <!-- Soak (Lethal) -->
                                <div class="flex justify-between border-b border-[#333] py-1 cursor-pointer hover:text-[#d4af37] transition-colors npc-combat-interact"
                                     data-action="soak" data-v1="${npc.template === 'mortal' ? 0 : sta}" data-v2="${fort}" data-v3="${armorRating}">
                                    <span class="font-bold">Soak (Lethal):</span> 
                                    <span>${(npc.template === 'mortal' ? 0 : sta) + fort + armorRating} Dice</span>
                                </div>
                                
                                ${armorRating > 0 ? `<div class="text-[9px] text-gray-500 italic text-right mb-1">Includes Armor: +${armorRating}</div>` : ''}

                                <!-- Weapons List (Attack Rolls) -->
                                ${weapons.length > 0 ? `
                                    <div class="mt-2 pt-2 border-t border-[#333]">
                                        ${weapons.map(w => {
                                            let pool = dex;
                                            let skill = 'Melee';
                                            if (w.type === 'Ranged') skill = 'Firearms'; 
                                            // Fallback logic if we need to differentiate Brawl
                                            if (w.name.toLowerCase().includes('fist') || w.name.toLowerCase().includes('clinch')) skill = 'Brawl';

                                            const skillVal = npc.abilities[skill] || 0;
                                            const total = pool + skillVal;
                                            const dmg = w.stats?.damage || w.damage || "STR";
                                            
                                            return `
                                            <div class="flex justify-between border-b border-[#333] py-1 cursor-pointer hover:text-[#d4af37] transition-colors npc-combat-interact"
                                                 data-action="weapon" data-v1="${pool}" data-v2="${skillVal}" data-name="${w.name}">
                                                <span class="font-bold text-[#d4af37]">${w.name}</span> 
                                                <span>${total} Dice <span class="text-[9px] text-gray-500">(${dmg})</span></span>
                                            </div>`;
                                        }).join('')}
                                    </div>
                                ` : ''}

                                <!-- Fortitude -->
                                ${(fort > 0) ? `
                                <div class="flex justify-between border-b border-[#333] py-1 text-gold cursor-pointer hover:text-white transition-colors npc-combat-interact"
                                     data-action="stat" data-name="Fortitude" data-v1="${fort}">
                                    <span>Fortitude:</span> <span>+${fort} Dice</span>
                                </div>` : ''}

                                <!-- Potence -->
                                ${(pot > 0) ? `
                                <div class="flex justify-between border-b border-[#333] py-1 text-gold cursor-pointer hover:text-white transition-colors npc-combat-interact"
                                     data-action="stat" data-name="Potence" data-v1="${pot}">
                                    <span>Potence:</span> <span>+${pot} Auto Succ.</span>
                                </div>` : ''}

                            </div>
                        </div>
                        
                        <!-- Inventory List (New) -->
                        ${inventory.length > 0 ? `
                        <div class="bg-[#111] p-3 border border-[#333] text-xs">
                            <h4 class="font-bold text-gray-500 uppercase mb-2">Inventory</h4>
                            <div class="space-y-1">
                                ${inventory.map(i => `<div class="text-gray-400 flex justify-between border-b border-[#222] pb-1"><span>${i.name}</span> <span class="text-[9px] uppercase">${i.type}</span></div>`).join('')}
                            </div>
                        </div>` : ''}

                         <!-- Feeding Grounds (Added) -->
                        ${npc.feedingGrounds ? `
                        <div class="bg-[#111] p-3 border border-[#333] text-xs mt-4">
                            <h4 class="font-bold text-gray-500 uppercase mb-2">Feeding Grounds</h4>
                            <div class="text-gray-400 italic whitespace-pre-wrap">${npc.feedingGrounds}</div>
                        </div>` : ''}

                    </div>
                </div>

                <!-- Bio / Merits / Extras Footer -->
                <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#333] pt-6">
                    
                    <!-- Left Column: Biography & Description -->
                    <div class="space-y-4">
                        <h4 class="text-gray-500 font-bold uppercase text-xs border-b border-[#333] pb-1">Biography</h4>
                        ${npc.bio.Description ? `
                            <div class="text-xs text-gray-300 italic leading-relaxed mb-4">${npc.bio.Description}</div>
                        ` : '<div class="text-xs text-gray-600 italic">No description provided.</div>'}
                        
                        ${npc.bio.Notes ? `
                            <div class="mt-2"><span class="text-gray-500 font-bold text-[10px] uppercase">Notes:</span> <span class="text-xs text-gray-400">${npc.bio.Notes}</span></div>
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
                                ${Object.keys(npc.merits).length > 0 || Object.keys(npc.flaws).length > 0 ? `
                                    ${Object.entries(npc.merits).map(([k,v]) => `<span class="inline-block bg-blue-900/30 border border-blue-900/50 rounded px-2 py-0.5 mr-2 mb-1">${k} (${v})</span>`).join('')}
                                    ${Object.entries(npc.flaws).map(([k,v]) => `<span class="inline-block bg-red-900/30 border border-red-900/50 rounded px-2 py-0.5 mr-2 mb-1 text-red-300">${k} (${v})</span>`).join('')}
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

    // Show Dice Engine when Play Sheet is open
    if(callbacks.toggleDiceUI) callbacks.toggleDiceUI(true, true);

    // Bind Close
    document.getElementById('close-play-modal').onclick = () => { 
        modal.style.display = 'none'; 
        if(callbacks.closeModal) callbacks.closeModal();
    };

    bindPlayInteractions(modal);
}

function renderSimpleDots(data, structure, type) {
    let html = '';
    const cats = type === 'attributes' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
    
    cats.forEach(cat => {
        const list = structure[cat];
        if(!list) return;
        
        html += `<div class="mb-3"><div class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 border-b border-[#333]">${cat}</div>`;
        list.forEach(k => {
            const val = data[k] || 0;
            if (val > 0 || type === 'attributes') {
                html += `<div class="flex justify-between items-center mb-0.5 text-xs group">
                    <span class="text-gray-300 cursor-pointer hover:text-[#d4af37] transition-colors roll-stat" data-stat="${k}" data-val="${val}" data-type="${type}">${k}</span>
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
        let stateClass = 'bg-gray-800 border-gray-600'; 
        if (i <= current) {
            stateClass = isSquare ? 'bg-[#8b0000] border-red-900' : 'bg-[#d4af37] border-yellow-700';
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

    if (ctx.activeNpc.healthConfig && Array.isArray(ctx.activeNpc.healthConfig) && ctx.activeNpc.healthConfig.length > 0) {
        levels = ctx.activeNpc.healthConfig;
    }

    const damage = (ctx.activeNpc.health && ctx.activeNpc.health.damage) || 0;

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
    // 1. ROLL STATS
    modal.querySelectorAll('.roll-stat').forEach(el => {
        el.onclick = () => {
            const name = el.dataset.stat;
            const score = parseInt(el.dataset.val) || 0;
            const type = el.dataset.type;
            if (typeof toggleStat === 'function') toggleStat(name, score, type);
        };
    });

    // 2. COMBAT STATS
    modal.querySelectorAll('.npc-combat-interact').forEach(el => {
        el.onclick = () => {
            if (typeof clearPool === 'function') clearPool();
            
            const action = el.dataset.action;
            const v1 = parseInt(el.dataset.v1) || 0;
            const v2 = parseInt(el.dataset.v2) || 0;
            const v3 = parseInt(el.dataset.v3) || 0; 

            if (typeof toggleStat === 'function') {
                if (action === 'init') {
                    toggleStat('Dexterity', v1, 'attribute');
                    toggleStat('Wits', v2, 'attribute');
                    showNotification("Initiative Pool Loaded. Roll 1 Die + Total.");
                }
                else if (action === 'soak') {
                    toggleStat('Stamina', v1, 'attribute');
                    if (v2 > 0) toggleStat('Fortitude', v2, 'discipline');
                    if (v3 > 0) toggleStat('Armor', v3, 'custom');
                    showNotification("Soak Pool Loaded.");
                }
                else if (action === 'stat') {
                    const name = el.dataset.name;
                    toggleStat(name, v1, 'discipline');
                }
                else if (action === 'weapon') {
                    const name = el.dataset.name;
                    if (v1 > 0) toggleStat('Dexterity', v1, 'attribute');
                    if (v2 > 0) toggleStat('Skill', v2, 'ability'); 
                    showNotification(`Attack: ${name} Loaded.`);
                }
            }
        };
    });

    // 3. STAT BOXES (Willpower / Blood)
    modal.querySelectorAll('.npc-box-interact').forEach(box => {
        box.onclick = () => {
            const field = box.dataset.field;
            const val = parseInt(box.dataset.val);
            const current = ctx.activeNpc[field] || 0;
            
            // Cap Temp Willpower at Permanent
            if (field === 'tempWillpower') {
                const perm = ctx.activeNpc.willpower || 10;
                if (val > perm) return;
            }
            
            if (val === current) ctx.activeNpc[field] = val - 1;
            else ctx.activeNpc[field] = val;

            if(callbacks.saveNpc) callbacks.saveNpc(true); // Silent save
            renderPlaySheetModal(); 
        };
    });

    // 4. HEALTH BOXES
    modal.querySelectorAll('.npc-health-box').forEach(box => {
        box.onclick = () => {
            const idx = parseInt(box.dataset.idx);
            if (typeof ctx.activeNpc.health !== 'object') ctx.activeNpc.health = { damage: 0, aggravated: 0 };
            
            const currentDmg = ctx.activeNpc.health.damage || 0;
            if (idx === currentDmg - 1) ctx.activeNpc.health.damage = idx;
            else ctx.activeNpc.health.damage = idx + 1;
            
            if(callbacks.saveNpc) callbacks.saveNpc(true);
            renderPlaySheetModal();
        };
    });

    // 5. NATURAL WEAPONS
    modal.querySelectorAll('.npc-attack-interact').forEach(el => {
        el.onclick = () => {
            if (typeof clearPool === 'function') clearPool();
            const name = el.dataset.name;
            const dice = parseInt(el.dataset.dice) || 0;
            if (typeof toggleStat === 'function') {
                toggleStat(name, dice, 'custom');
                showNotification(`Attack Pool: ${name} (${dice}) loaded.`);
            }
        };
    });
}
