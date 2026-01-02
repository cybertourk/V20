import UIRenderer from './ui-renderer.js';
import rules from './v20-rules.js';
import blankTemplate from './data.js'; 
import * as FirebaseManager from './firebase-manager.js'; 

class MainApp {
    constructor() {
        this.characterData = JSON.parse(JSON.stringify(blankTemplate || {}));
        this.rules = rules;
        
        this.currentStep = 1;
        this.totalSteps = 8;
        this.stepNames = [
            "Concept", "Attributes", "Abilities", "Advantages", 
            "Backgrounds", "Merits", "Vitals", "Finalize"
        ];

        this.uiRenderer = new UIRenderer(this, this.rules);

        this.init();
    }

    init() {
        console.log("Initializing V20 App...");
        
        this.renderNavigation(); 
        this.bindWindowExposes(); 
        this.bindButtonListeners(); 

        this.goToStep(1); 
        this.render();

        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    renderNavigation() {
        const navContainer = document.getElementById('sheet-nav');
        if (!navContainer) return;
        navContainer.innerHTML = '';

        this.stepNames.forEach((name, index) => {
            const stepNum = index + 1;
            const btn = document.createElement('button');
            btn.textContent = `${stepNum}. ${name}`;
            btn.className = `px-4 py-3 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-colors hover:bg-[#111] ${this.currentStep === stepNum ? 'text-[#af0000] border-[#af0000]' : 'text-gray-500 border-transparent hover:text-gray-300'}`;
            
            btn.onclick = () => this.goToStep(stepNum);
            navContainer.appendChild(btn);
        });
    }

    goToStep(stepNum) {
        this.currentStep = stepNum;
        
        for (let i = 1; i <= this.totalSteps; i++) {
            const phase = document.getElementById(`phase-${i}`);
            if (phase) {
                phase.style.display = 'none';
                phase.classList.remove('active');
            }
        }

        const activePhase = document.getElementById(`phase-${stepNum}`);
        if (activePhase) {
            activePhase.style.display = 'block';
            setTimeout(() => activePhase.classList.add('active'), 10);
        }

        this.renderNavigation();
    }

    render() {
        this.uiRenderer.render(this.characterData);
        this.updateCalculatedStats();
    }

    updateCalculatedStats() {
        this.updatePoolCounters();
        this.calculateFreebies();
    }

    updatePoolCounters() {
        const update = (id, arr) => {
            const el = document.getElementById(id);
            if (el) el.textContent = `[${(arr || []).length}]`;
        };
        update('p-disc', this.characterData.disciplines);
        update('p-back', this.characterData.backgrounds);
        
        // Count specific groups
        this.updateGroupCounter('p-phys', 'attributes', ['Strength', 'Dexterity', 'Stamina']);
        this.updateGroupCounter('p-social', 'attributes', ['Charisma', 'Manipulation', 'Appearance']);
        this.updateGroupCounter('p-mental', 'attributes', ['Perception', 'Intelligence', 'Wits']);
        
        this.updateGroupCounter('p-tal', 'abilities', this.rules.abilities.talents);
        this.updateGroupCounter('p-ski', 'abilities', this.rules.abilities.skills);
        this.updateGroupCounter('p-kno', 'abilities', this.rules.abilities.knowledges);
    }

    updateGroupCounter(elementId, category, fields) {
        const el = document.getElementById(elementId);
        if (!el || !this.characterData[category]) return;
        
        let total = 0;
        fields.forEach(field => {
            total += (this.characterData[category][field] || 0);
        });
        el.textContent = `[${total}]`;
    }

    // --- Freebie Point Logic ---
    calculateFreebies() {
        if (!this.rules.freebieCosts) return;

        let spent = {
            attr: 0, abil: 0, disc: 0, back: 0, virt: 0, human: 0, will: 0, merit: 0, flaw: 0
        };

        // 1. Attributes (Base: 7/5/3 = 15 dots free. Start at 1 dot each = 3 free per category. Total Base dots = 15+3+3+3 = 24? No.
        // Standard V20: Start with 1 dot in each. Priority adds 7/5/3.
        // Total Free Dots = (3*1) + (3*1) + (3*1) + 7 + 5 + 3 = 24 total dots.
        // Any dot above this count is a freebie? 
        // SIMPLIFIED LOGIC: We assume the user allocates base dots correctly. We just count TOTAL dots minus BASE dots (24).
        let totalAttr = 0;
        Object.values(this.characterData.attributes).forEach(v => totalAttr += v);
        // Base is 9 (1 each) + 7 + 5 + 3 = 24.
        const extraAttr = Math.max(0, totalAttr - 24);
        spent.attr = extraAttr * this.rules.freebieCosts.attributes;

        // 2. Abilities (Base: 13/9/5 = 27 dots. Start at 0.)
        let totalAbil = 0;
        Object.values(this.characterData.abilities).forEach(v => totalAbil += v);
        const extraAbil = Math.max(0, totalAbil - 27);
        spent.abil = extraAbil * this.rules.freebieCosts.abilities;

        // 3. Disciplines (Base: 3 dots)
        let totalDisc = 0;
        (this.characterData.disciplines || []).forEach(d => totalDisc += d.value);
        const extraDisc = Math.max(0, totalDisc - 3);
        spent.disc = extraDisc * this.rules.freebieCosts.disciplines;

        // 4. Backgrounds (Base: 5 dots)
        let totalBack = 0;
        (this.characterData.backgrounds || []).forEach(b => totalBack += b.value);
        const extraBack = Math.max(0, totalBack - 5);
        spent.back = extraBack * this.rules.freebieCosts.backgrounds;

        // 5. Virtues (Base: 7 dots. Start at 1 each = 3. Total 10.)
        let totalVirt = 0;
        Object.values(this.characterData.virtues).forEach(v => totalVirt += v);
        const extraVirt = Math.max(0, totalVirt - 10);
        spent.virt = extraVirt * this.rules.freebieCosts.virtues;

        // 6. Humanity (Base: Sum of Conscience + Self-Control)
        // Note: Manual humanity overrides are tricky. We'll skip complex derivation for now and just check manual dots if separate array used, 
        // but current data model derives it mostly. If we assume Humanity = Conscience + SelfControl, it costs 0 freebies.
        // If user raises it directly:
        // Let's assume calculated base humanity is (Conscience + SelfControl).
        // If we store it separately, we diff. For now, ignoring specific humanity freebie cost unless stored separately.

        // 7. Willpower (Base: Courage)
        const baseWill = this.characterData.virtues.courage || 1;
        const currentWill = this.characterData.willpower || 1;
        const extraWill = Math.max(0, currentWill - baseWill);
        spent.will = extraWill * this.rules.freebieCosts.willpower;

        // 8. Merits & Flaws
        (this.characterData.merits || []).forEach(m => spent.merit += m.value);
        (this.characterData.flaws || []).forEach(f => spent.flaw += f.value);

        // Update UI
        this.updateLedgerUI(spent);
    }

    updateLedgerUI(spent) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.textContent = val;
        };
        set('sb-attr', spent.attr);
        set('sb-abil', spent.abil);
        set('sb-disc', spent.disc);
        set('sb-back', spent.back);
        set('sb-virt', spent.virt);
        // set('sb-human', spent.human); 
        set('sb-will', spent.will);
        set('sb-merit', spent.merit);
        set('sb-flaw', spent.flaw);

        const totalSpent = (spent.attr + spent.abil + spent.disc + spent.back + spent.virt + spent.human + spent.will + spent.merit);
        const totalBonus = spent.flaw; // Flaws give points back
        
        // Base Freebies usually 15
        const baseFreebies = 15; 
        const remaining = baseFreebies + totalBonus - totalSpent;

        const totalEl = document.getElementById('sb-total');
        if (totalEl) {
            totalEl.textContent = remaining;
            totalEl.className = remaining >= 0 ? "text-green-400" : "text-red-500 font-bold animate-pulse";
        }
    }

    bindButtonListeners() {
        const newBtn = document.getElementById('cmd-new');
        if (newBtn) newBtn.onclick = () => this.handleNewCharacter();

        const saveBtn = document.getElementById('cmd-save');
        if (saveBtn) saveBtn.onclick = () => this.openSaveModal();

        const loadBtn = document.getElementById('cmd-load');
        if (loadBtn) loadBtn.onclick = () => this.openLoadModal();

        const confirmSave = document.getElementById('confirm-save-btn');
        if (confirmSave) confirmSave.onclick = () => this.performFirebaseSave();
    }

    handleNewCharacter() {
        if (confirm("Create new character? Unsaved changes will be lost.")) {
            this.characterData = JSON.parse(JSON.stringify(blankTemplate));
            this.goToStep(1);
            this.render();
        }
    }

    openSaveModal() {
        const modal = document.getElementById('save-modal');
        if (modal) {
            modal.classList.add('active');
            const nameInput = document.getElementById('save-name-input');
            if (nameInput) nameInput.value = this.characterData.filename || this.characterData.name || "";
        }
    }

    async performFirebaseSave() {
        const nameInput = document.getElementById('save-name-input');
        const folderInput = document.getElementById('save-folder-input');
        
        if (nameInput) {
            this.characterData.filename = nameInput.value;
            if (!this.characterData.name) this.characterData.name = nameInput.value;
        }
        if (folderInput) this.characterData.folder = folderInput.value;

        const success = await FirebaseManager.saveCharacter(this.characterData);
        if (success) {
            document.getElementById('save-modal').classList.remove('active');
            alert("Character Inscribed to Archives.");
        }
    }

    async openLoadModal() {
        const modal = document.getElementById('load-modal');
        const browser = document.getElementById('file-browser');
        
        if (modal && browser) {
            modal.classList.add('active');
            browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">Consulting Archives...</div>';
            
            const list = await FirebaseManager.getCharacterList();
            
            if (list.length === 0) {
                browser.innerHTML = '<div class="text-center text-red-500 mt-10">No Archives Found.</div>';
                return;
            }

            browser.innerHTML = '';
            list.forEach(char => {
                const row = document.createElement('div');
                row.className = 'flex justify-between items-center p-3 border-b border-[#333] hover:bg-[#111] cursor-pointer transition-colors';
                row.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-white font-bold text-xs uppercase tracking-wider">${char.name}</span>
                        <span class="text-[9px] text-gold">${char.clan} | Gen ${char.generation}</span>
                    </div>
                    <div class="text-[9px] text-gray-500">${new Date(char.lastModified).toLocaleDateString()}</div>
                `;
                row.onclick = async () => {
                    await this.loadCharacterData(char.id);
                    modal.classList.remove('active');
                };
                browser.appendChild(row);
            });
        }
    }

    async loadCharacterData(id) {
        const data = await FirebaseManager.loadCharacter(id);
        if (data) {
            this.characterData = data;
            this.render();
            alert(`Resurrected: ${data.name}`);
        }
    }

    updateCharacterData(field, value) {
        this.characterData[field] = value;
        if (field === 'clan') {
            this.uiRenderer.renderClanWeakness(this.characterData);
        }
    }

    updateCharacterStat(category, statName, value) {
        if (category === 'attributes' || category === 'abilities') {
            if (!this.characterData[category]) this.characterData[category] = {};
            this.characterData[category][statName] = value;
        } else if (category === 'virtues') {
            if (!this.characterData.virtues) this.characterData.virtues = {};
            this.characterData.virtues[statName] = value;
        } else if (category === 'health' || category === 'willpower' || category === 'willpower_pool' || category === 'blood_pool' || category === 'experience') {
            if (statName === null) {
                this.characterData[category] = value;
            }
        }
        this.render();
    }

    updateArrayData(arrayName, index, key, value) {
        if (!this.characterData[arrayName]) this.characterData[arrayName] = [];
        if (this.characterData[arrayName][index]) {
            this.characterData[arrayName][index][key] = value;
        }
        this.render();
    }

    removeArrayData(arrayName, index) {
        if (!this.characterData[arrayName]) return;
        this.characterData[arrayName].splice(index, 1);
        this.render();
    }

    addArrayData(arrayName, newItem) {
        if (!this.characterData[arrayName]) this.characterData[arrayName] = [];
        this.characterData[arrayName].push(newItem);
        this.render();
    }

    // --- Dice Rolling Engine (V20 Rules) ---
    handleRoll(statName, statValue) {
        const resultsContainer = document.getElementById('roll-results');
        if (!resultsContainer) return;

        // Get options
        const diff = parseInt(document.getElementById('roll-diff')?.value || 6);
        const useSpecialty = document.getElementById('use-specialty')?.checked || false;

        let successes = 0;
        let ones = 0;
        let rolls = [];
        
        for(let i=0; i < statValue; i++) {
            const die = Math.floor(Math.random() * 10) + 1;
            rolls.push(die);
            
            if (die >= diff) {
                successes++;
                // Specialty: 10s count as 2 successes
                if (useSpecialty && die === 10) {
                    successes++; 
                }
            }
            if (die === 1) {
                ones++;
            }
        }

        // V20 Rule: 1s cancel successes
        // Note: They do NOT cancel "specialty" bonus successes separately, just total successes.
        // Actually, V20 Core p. 250: "Each 1 rolled cancels out one success."
        // Specialty 10 is just 2 successes.
        
        const netSuccesses = Math.max(0, successes - ones);
        
        // Botch Check: If 0 successes were rolled (before 1s cancelled? No, after?)
        // V20: "If you roll no successes at all, and you roll one or more 1s, you botch."
        // Meaning if 'successes' (before subtraction) was 0, AND ones > 0.
        let resultType = 'Failure';
        let resultClass = 'text-gray-500';

        if (successes === 0 && ones > 0) {
            resultType = 'BOTCH';
            resultClass = 'text-red-600 animate-pulse font-black';
        } else if (netSuccesses > 0) {
            resultType = `${netSuccesses} Success${netSuccesses > 1 ? 'es' : ''}`;
            resultClass = 'text-green-400 font-bold';
        }

        const msg = document.createElement('div');
        msg.className = 'text-xs text-gray-300 border-b border-[#333] py-2';
        msg.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gold font-bold">${statName}</span>
                <span class="text-gray-500">Diff ${diff} ${useSpecialty ? '(Spec)' : ''}</span>
            </div>
            <div class="tracking-widest my-1 text-[10px] text-gray-400">[ ${rolls.join(', ')} ]</div>
            <div class="${resultClass} text-right uppercase">${resultType}</div>
        `;
        resultsContainer.prepend(msg);
    }

    bindWindowExposes() {
        // Expose functions for onclick handlers in HTML
        window.rollPool = () => {
            // This is usually triggered by "Roll Pool" button which might combine multiple stats
            // For now, we mock it or check if user selected things.
            // Since we implemented click-to-roll on individual stats, we can rely on that mostly.
            console.log("Custom pool rolling not fully implemented yet.");
        };
        
        window.clearPool = () => {
            console.log("Clear Pool");
        };

        window.toggleSidebarLedger = () => {
            const sb = document.getElementById('freebie-sidebar');
            if(sb) sb.classList.toggle('active');
        };

        window.togglePlayMode = () => {
            const playSheet = document.getElementById('play-mode-sheet');
            const sheetContent = document.getElementById('sheet-content'); 
            if (playSheet && sheetContent) {
                const isPlay = !playSheet.classList.contains('hidden');
                if (isPlay) {
                    playSheet.classList.add('hidden');
                    sheetContent.classList.remove('hidden'); 
                } else {
                    playSheet.classList.remove('hidden');
                    sheetContent.classList.add('hidden'); 
                }
                this.render(); 
            }
        };
        
        window.nextStep = () => {
            if (this.currentStep < this.totalSteps) {
                this.goToStep(this.currentStep + 1);
            }
        };
    }
}

const app = new MainApp();
export default app;
