import { 
    ATTRIBUTES, ABILITIES, VIRTUES 
} from "./data.js";

import { 
    renderDots 
} from "./ui-common.js";

// --- PRINT SHEET RENDERER ---

export function renderPrintSheet() {
    if (!window.state) return;
    
    // Refresh Movement if available (Play Mode dependency, safe check)
    if (window.renderMovementSection && window.state.isPlayMode) window.renderMovementSection();

    // 1. Header Fields
    const map = {
        'c-name': 'pr-name', 'c-nature': 'pr-nature', 'c-clan': 'pr-clan',
        'c-player': 'pr-player', 'c-demeanor': 'pr-demeanor', 'c-gen': 'pr-gen',
        'c-chronicle': 'pr-chronicle', 'c-concept': 'pr-concept', 'c-sire': 'pr-sire'
    };
    for (const [src, dest] of Object.entries(map)) {
        const val = window.state.textFields[src] || "";
        const el = document.getElementById(dest);
        if (el) el.innerText = val;
    }

    // 2. Attributes
    ['Physical', 'Social', 'Mental'].forEach(cat => {
        let destId = "";
        if(cat === 'Physical') destId = 'pr-attr-phys';
        if(cat === 'Social') destId = 'pr-attr-soc';
        if(cat === 'Mental') destId = 'pr-attr-men';
        
        const container = document.getElementById(destId);
        if (container) {
            // Preserve Header (h4), clear rows
            const header = container.querySelector('h4');
            container.innerHTML = '';
            if(header) container.appendChild(header);

            ATTRIBUTES[cat].forEach(attr => {
                const val = window.state.dots.attr[attr] || 1;
                const row = document.createElement('div');
                row.className = "flex justify-between border-b border-black text-xs mb-1";
                row.innerHTML = `<span class="font-bold uppercase">${attr}</span><span>${renderDots(val, 5)}</span>`; 
                container.appendChild(row);
            });
        }
    });

    // 3. Abilities
    ['Talents', 'Skills', 'Knowledges'].forEach(cat => {
        let destId = "";
        if(cat === 'Talents') destId = 'pr-abil-tal';
        if(cat === 'Skills') destId = 'pr-abil-ski';
        if(cat === 'Knowledges') destId = 'pr-abil-kno';

        const container = document.getElementById(destId);
        if (container) {
            const header = container.querySelector('h4');
            container.innerHTML = '';
            if(header) container.appendChild(header);

            ABILITIES[cat].forEach(abil => {
                const val = window.state.dots.abil[abil] || 0;
                const row = document.createElement('div');
                row.className = "flex justify-between border-b border-black text-xs mb-1";
                row.innerHTML = `<span class="font-bold uppercase">${abil}</span><span>${renderDots(val, 5)}</span>`;
                container.appendChild(row);
            });
            
            // Custom Abilities
            if(window.state.customAbilityCategories) {
                Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => {
                    if (c === cat) {
                        const val = window.state.dots.abil[name] || 0;
                        const row = document.createElement('div');
                        row.className = "flex justify-between border-b border-black text-xs mb-1";
                        row.innerHTML = `<span class="font-bold uppercase text-gray-700">${name}</span><span>${renderDots(val, 5)}</span>`;
                        container.appendChild(row);
                    }
                });
            }
        }
    });

    // 4. Advantages (Disciplines, Backgrounds)
    const renderAdvSection = (src, destId, max = 5) => {
        const container = document.getElementById(destId);
        if (container) {
            container.innerHTML = '';
            Object.entries(src).forEach(([name, val]) => {
                if(val > 0) { // Only print dots > 0
                    const row = document.createElement('div');
                    row.className = "flex justify-between border-b border-black text-xs mb-1";
                    row.innerHTML = `<span class="font-bold uppercase">${name}</span><span>${renderDots(val, max)}</span>`;
                    container.appendChild(row);
                }
            });
        }
    };
    renderAdvSection(window.state.dots.disc, 'pr-disc-list');
    renderAdvSection(window.state.dots.back, 'pr-back-list');

    // Virtues
    const vCont = document.getElementById('pr-virt-list');
    if(vCont) {
        vCont.innerHTML = '';
        VIRTUES.forEach(v => {
            const val = window.state.dots.virt[v] || 1;
            const row = document.createElement('div');
            row.className = "flex justify-between border-b border-black text-xs mb-1";
            row.innerHTML = `<span class="font-bold uppercase">${v}</span><span>${renderDots(val, 5)}</span>`;
            vCont.appendChild(row);
        });
    }

    // 5. Merits / Flaws / Other Traits
    const mfCont = document.getElementById('pr-merits-flaws');
    if(mfCont) {
        mfCont.innerHTML = '';
        
        const renderItem = (item, type) => {
            const div = document.createElement('div');
            div.className = "mb-1";
            // Format: Name (Val pt Type): Description
            const header = document.createElement('span');
            header.className = "font-bold";
            header.innerText = `${item.name} (${item.val} pt ${type})`;
            
            div.appendChild(header);
            
            if (item.desc) {
                const descSpan = document.createElement('span');
                descSpan.className = "italic ml-1";
                descSpan.innerText = `- ${item.desc}`;
                div.appendChild(descSpan);
            }
            mfCont.appendChild(div);
        };

        (window.state.merits || []).forEach(m => renderItem(m, 'Merit'));
        (window.state.flaws || []).forEach(f => renderItem(f, 'Flaw'));
    }
    
    const otCont = document.getElementById('pr-other-traits');
    if(otCont) {
        otCont.innerHTML = '';
        Object.entries(window.state.dots.other || {}).forEach(([k,v]) => {
            if(v > 0) {
                 const row = document.createElement('div');
                 row.className = "flex justify-between border-b border-black text-xs mb-1";
                 row.innerHTML = `<span>${k}</span><span>${renderDots(v,5)}</span>`;
                 otCont.appendChild(row);
            }
        });
    }

    // 6. Humanity / Willpower / Blood
    const hCont = document.getElementById('pr-humanity');
    const bName = document.getElementById('pr-bearing');
    if(hCont) {
        // Calculate humanity if not set, or use stored
        const baseH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
        const currentH = window.state.status.humanity !== undefined ? window.state.status.humanity : baseH;
        hCont.innerHTML = renderDots(currentH, 10);
    }
    if(bName) bName.innerText = `${window.state.textFields['c-bearing-name']||''} (${window.state.textFields['c-bearing-value']||''})`;

    const wDots = document.getElementById('pr-willpower-dots');
    const wBox = document.getElementById('pr-willpower-boxes');
    if(wDots) {
        const baseW = window.state.dots.virt?.Courage || 1;
        const currentW = window.state.status.willpower !== undefined ? window.state.status.willpower : baseW;
        wDots.innerHTML = renderDots(currentW, 10);
    }
    if(wBox) {
        let html = '';
        // Temp willpower boxes
        const temp = window.state.status.tempWillpower !== undefined ? window.state.status.tempWillpower : 5;
        for(let i=0; i<10; i++) {
             html += `<span class="box ${i < temp ? 'checked' : ''}"></span>`;
        }
        wBox.innerHTML = html;
    }

    const bBox = document.getElementById('pr-blood-boxes');
    if(bBox) {
        // Max blood based on Gen
        const gen = 13 - (window.state.dots.back['Generation']||0);
        // Simple approximation or use Rules
        let html = '';
        const currentB = window.state.status.blood || 0;
        for(let i=0; i<20; i++) { // Max 20 boxes on sheet usually
             html += `<span class="box ${i < currentB ? 'checked' : ''}"></span>`;
        }
        bBox.innerHTML = html;
    }

    // 7. Health
    const healthCont = document.getElementById('pr-health');
    if(healthCont) {
        healthCont.innerHTML = '';
        const levels = ['Bruised', 'Hurt -1', 'Injured -1', 'Wounded -2', 'Mauled -2', 'Crippled -5', 'Incapacitated'];
        levels.forEach((l, i) => {
            const state = (window.state.status.health_states && window.state.status.health_states[i]) || 0;
            const row = document.createElement('div');
            row.className = "flex justify-between items-center border-b border-black";
            row.innerHTML = `<span>${l}</span><span class="box" data-state="${state}"></span>`;
            healthCont.appendChild(row);
        });
    }

    // 8. Combat & Inventory
    const combatTbl = document.getElementById('pr-combat-table');
    if (combatTbl) {
        // Use a single string buffer to construct the innerHTML
        let tblHTML = '';
        
        // Add Maneuvers (Extended V20 List)
        const manuevers = [
            {n: 'Bite', d: 6, dmg: 'Str+1 (A)'},
            {n: 'Block', d: 6, dmg: 'None (R)'},
            {n: 'Claw', d: 6, dmg: 'Str+1 (A)'},
            {n: 'Clinch', d: 6, dmg: 'Str (B)'},
            {n: 'Disarm', d: 7, dmg: 'Special'},
            {n: 'Dodge', d: 6, dmg: 'None (R)'},
            {n: 'Hold', d: 6, dmg: 'None (C)'},
            {n: 'Kick', d: 7, dmg: 'Str+1 (B)'},
            {n: 'Parry', d: 6, dmg: 'None (R)'},
            {n: 'Strike', d: 6, dmg: 'Str (B)'},
            {n: 'Sweep', d: 7, dmg: 'Str (K)'},
            {n: 'Tackle', d: 7, dmg: 'Str+1 (K)'},
            {n: 'Weapon Str.', d: 6, dmg: 'Weapon'}
        ];
        manuevers.forEach(m => {
            tblHTML += `<tr><td class="py-1 border-b border-gray-300 font-bold">${m.n}</td><td class="border-b border-gray-300">${m.d}</td><td class="border-b border-gray-300">${m.dmg}</td></tr>`;
        });
        
        // Add Weapons from Inventory
        if(window.state.inventory && Array.isArray(window.state.inventory)) {
            window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => {
                const name = w.displayName || w.name;
                const stats = w.stats || {};
                tblHTML += `<tr><td class="py-1 border-b border-gray-300 font-bold italic">${name}</td><td class="border-b border-gray-300">${stats.diff||6}</td><td class="border-b border-gray-300">${stats.dmg||'-'}</td></tr>`;
            });
        }
        
        combatTbl.innerHTML = tblHTML;
    }

    // Armor Info
    const armorInfo = document.getElementById('pr-armor-info');
    if (armorInfo) {
        let armorHTML = "None";
        if (window.state.inventory && Array.isArray(window.state.inventory)) {
            const armors = window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried');
            if (armors.length > 0) {
                const names = armors.map(a => a.name).join(', ');
                const rating = armors.reduce((a, b) => a + (parseInt(b.stats?.rating)||0), 0);
                const penalty = armors.reduce((a, b) => a + (parseInt(b.stats?.penalty)||0), 0);
                armorHTML = `<strong>Worn:</strong> ${names}<br><strong>Rating:</strong> ${rating} | <strong>Penalty:</strong> ${penalty}`;
            }
        }
        armorInfo.innerHTML = armorHTML;
    }

    // Gear Lists
    const gearCarried = document.getElementById('pr-gear-carried');
    const gearOwned = document.getElementById('pr-gear-owned');
    const vehicles = document.getElementById('pr-vehicles');
    
    if (window.state.inventory && Array.isArray(window.state.inventory)) {
        if (gearCarried) gearCarried.innerHTML = window.state.inventory.filter(i => i.status === 'carried' && i.type !== 'Vehicle' && i.type !== 'Armor' && i.type !== 'Weapon').map(i => i.name).join(', ');
        if (gearOwned) gearOwned.innerHTML = window.state.inventory.filter(i => i.status === 'owned' && i.type !== 'Vehicle').map(i => i.name).join(', ');
        if (vehicles) vehicles.innerHTML = window.state.inventory.filter(i => i.type === 'Vehicle').map(i => `${i.name} (Safe:${i.stats?.safe} Max:${i.stats?.max})`).join('<br>');
    }

    // --- NEW: Update Edit Mode (Phase 6) Combat/Armor ---
    const armorRatingEl = document.getElementById('total-armor-rating');
    const armorPenaltyEl = document.getElementById('total-armor-penalty');
    const armorNamesEl = document.getElementById('active-armor-names');
    const combatListEl = document.getElementById('combat-list-create');

    // 1. Calculate Armor for Edit Mode
    if (window.state.inventory && Array.isArray(window.state.inventory)) {
        const armors = window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried');
        let totalR = 0, totalP = 0, names = [];
        armors.forEach(a => {
            totalR += parseInt(a.stats?.rating) || 0;
            totalP += parseInt(a.stats?.penalty) || 0;
            names.push(a.displayName || a.name);
        });
        if (armorRatingEl) armorRatingEl.innerText = totalR;
        if (armorPenaltyEl) armorPenaltyEl.innerText = totalP;
        if (armorNamesEl) armorNamesEl.innerText = names.length > 0 ? names.join(', ') : "None";
    }

    // 2. Full Update of Edit Mode Combat List
    if (combatListEl) {
        // Get the parent container (the column flex container)
        const combatContainer = combatListEl.parentElement;
        if (combatContainer) {
            // Rebuild the ENTIRE content of the parent to replace hardcoded items
            let html = `
                <div class="grid grid-cols-7 gap-1 text-[9px] uppercase text-gray-400 font-bold border-b border-[#555] pb-1 mb-2 text-center">
                    <div class="col-span-2 text-left pl-2">Attack</div>
                    <div>Diff</div>
                    <div>Dmg</div>
                    <div>Rng</div>
                    <div>Rate</div>
                    <div>Clip</div>
                </div>
            `;

            // Standard V20 Maneuvers (Same list as Play Mode)
            const standards = [
                {n:'Bite', diff:6, dmg:'Str+1(A)', rng:'-', rate:'-', clip:'-'},
                {n:'Block', diff:6, dmg:'None (R)', rng:'-', rate:'-', clip:'-'},
                {n:'Claw', diff:6, dmg:'Str+1(A)', rng:'-', rate:'-', clip:'-'},
                {n:'Clinch', diff:6, dmg:'Str(C)', rng:'-', rate:'-', clip:'-'},
                {n:'Disarm', diff:7, dmg:'Special', rng:'-', rate:'-', clip:'-'},
                {n:'Dodge', diff:6, dmg:'None (R)', rng:'-', rate:'-', clip:'-'},
                {n:'Hold', diff:6, dmg:'None (C)', rng:'-', rate:'-', clip:'-'},
                {n:'Kick', diff:7, dmg:'Str+1', rng:'-', rate:'-', clip:'-'},
                {n:'Parry', diff:6, dmg:'None (R)', rng:'-', rate:'-', clip:'-'},
                {n:'Strike', diff:6, dmg:'Str', rng:'-', rate:'-', clip:'-'},
                {n:'Sweep', diff:7, dmg:'Str(K)', rng:'-', rate:'-', clip:'-'},
                {n:'Tackle', diff:7, dmg:'Str+1(K)', rng:'-', rate:'-', clip:'-'},
                {n:'Weapon Strike', diff:6, dmg:'Weapon', rng:'-', rate:'-', clip:'-'},
                {n:'Auto Fire', diff:8, dmg:'Special', rng:'-', rate:'-', clip:'-'},
                {n:'Multi Shot', diff:6, dmg:'Weapon', rng:'-', rate:'-', clip:'-'},
                {n:'Strafing', diff:8, dmg:'Special', rng:'-', rate:'-', clip:'-'},
                {n:'3-Rnd Burst', diff:7, dmg:'Weapon', rng:'-', rate:'-', clip:'-'},
                {n:'Two Weapons', diff:7, dmg:'Weapon', rng:'-', rate:'-', clip:'-'}
            ];

            standards.forEach(s => {
                html += `
                    <div class="grid grid-cols-7 gap-1 text-[9px] border-b border-[#222] py-1 text-center text-gray-500 hover:bg-[#1a1a1a]">
                        <div class="col-span-2 text-left pl-2 font-bold text-white">${s.n}</div>
                        <div>${s.diff}</div>
                        <div>${s.dmg}</div>
                        <div>${s.rng}</div>
                        <div>${s.rate}</div>
                        <div>${s.clip}</div>
                    </div>
                `;
            });

            // Add Equipped Weapons
            if (window.state.inventory && Array.isArray(window.state.inventory)) {
                window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => {
                    const name = w.displayName || w.name;
                    html += `
                        <div class="grid grid-cols-7 gap-1 text-[9px] border-b border-[#222] py-1 text-center text-gray-500 hover:bg-[#1a1a1a]">
                            <div class="col-span-2 text-left pl-2 font-bold text-gold truncate" title="${name}">${name}</div>
                            <div>${w.stats.diff || 6}</div>
                            <div>${w.stats.dmg || '-'}</div>
                            <div>${w.stats.range || '-'}</div>
                            <div>${w.stats.rate || '-'}</div>
                            <div>${w.stats.clip || '-'}</div>
                        </div>
                    `;
                });
            }

            // Restore the empty container div for future use (though we are overwriting parent)
            html += '<div id="combat-list-create" class="space-y-1 mt-2"></div>';
            
            combatContainer.innerHTML = html;
        }
    }

    // 9. Expanded Backgrounds & Havens
    const bgDetails = document.getElementById('pr-background-details');
    if (bgDetails) {
        bgDetails.innerHTML = '';
        Object.keys(window.state.dots.back).forEach(bgName => {
            if(window.state.dots.back[bgName] > 0) {
                const safeId = 'desc-' + bgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const txt = window.state.textFields[safeId] || "";
                if(txt) {
                    bgDetails.innerHTML += `<div><strong>${bgName}:</strong> ${txt}</div>`;
                }
            }
        });
    }

    const havens = document.getElementById('pr-havens');
    if(havens && window.state.havens) {
        havens.innerHTML = window.state.havens.map(h => `<div><strong>${h.name}</strong> (${h.loc}): ${h.desc}</div>`).join('');
    }

    const bonds = document.getElementById('pr-blood-bonds');
    if(bonds && window.state.bloodBonds) {
        bonds.innerHTML = window.state.bloodBonds.map(b => `<div><strong>${b.type}:</strong> ${b.name} (${b.rating})</div>`).join('');
    }

    // 10. Bio / Psychology
    const appearance = document.getElementById('pr-appearance');
    if(appearance) appearance.innerText = document.getElementById('bio-desc')?.value || "";

    const derangements = document.getElementById('pr-derangements');
    if(derangements && window.state.derangements) derangements.innerText = window.state.derangements.join(', ');

    const langs = document.getElementById('pr-languages');
    if(langs) langs.innerText = document.getElementById('bio-languages')?.value || "";

    const gst = document.getElementById('pr-goals-st');
    if(gst) gst.innerText = document.getElementById('bio-goals-st')?.value || "";

    const glt = document.getElementById('pr-goals-lt');
    if(glt) glt.innerText = document.getElementById('bio-goals-lt')?.value || "";

    const hist = document.getElementById('pr-history');
    if(hist) hist.innerText = document.getElementById('char-history')?.value || "";
}
window.renderPrintSheet = renderPrintSheet;
