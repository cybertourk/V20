export default class MechanicsRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        this.renderWillpower(characterData);
        this.renderBloodPool(characterData);
        this.renderHealth(characterData);
        this.renderExperience(characterData);
    }

    renderWillpower(characterData) {
        // --- Create Mode (Phase 8) ---
        const createContainer = document.getElementById('phase8-willpower-dots');
        if (createContainer) {
            createContainer.innerHTML = '';
            const currentPerm = characterData.willpower || 1;
            for (let i = 1; i <= 10; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= currentPerm;
                dot.className = `w-3 h-3 rounded-full border border-[#444] cursor-pointer hover:border-white transition-colors ${isFilled ? 'bg-[#af0000] shadow-[0_0_5px_rgba(175,0,0,0.5)]' : 'bg-transparent'}`;
                dot.onclick = () => this.uiManager.updateStat('willpower', null, i);
                createContainer.appendChild(dot);
            }
        }

        // --- Play Mode ---
        const playDotsContainer = document.getElementById('willpower-dots-play');
        const playBoxesContainer = document.getElementById('willpower-boxes-play');

        if (playDotsContainer) {
            playDotsContainer.innerHTML = '';
            const currentPerm = characterData.willpower || 1;
            for (let i = 1; i <= 10; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= currentPerm;
                dot.className = `w-3 h-3 rounded-full border border-[#444] mx-[1px] ${isFilled ? 'bg-[#af0000]' : 'bg-transparent'}`;
                // Usually permanent WP isn't changed easily in play, but we can allow it or make it distinct
                dot.onclick = () => this.uiManager.updateStat('willpower', null, i);
                playDotsContainer.appendChild(dot);
            }
        }

        if (playBoxesContainer) {
            playBoxesContainer.innerHTML = '';
            const currentPerm = characterData.willpower || 1;
            const currentPool = characterData.willpower_pool !== undefined ? characterData.willpower_pool : currentPerm;

            for (let i = 1; i <= 10; i++) {
                const box = document.createElement('div');
                if (i > currentPerm) {
                    box.className = 'w-6 h-6 border border-[#222] bg-black opacity-30'; // Disabled
                } else {
                    const isFilled = i <= currentPool;
                    // Square box style for temporary points
                    box.className = `w-6 h-6 border border-[#555] cursor-pointer hover:border-white transition-colors flex items-center justify-center ${isFilled ? 'bg-[#d4af37] text-black shadow-[0_0_5px_rgba(212,175,55,0.4)]' : 'bg-transparent'}`;
                    
                    // Click logic: Toggle points. 
                    box.onclick = () => this.uiManager.updateStat('willpower_pool', null, i);
                }
                playBoxesContainer.appendChild(box);
            }
        }
    }

    renderBloodPool(characterData) {
        // --- Play Mode Only ---
        const container = document.getElementById('blood-boxes-play');
        if (!container) return;
        container.innerHTML = '';

        // Calculate Max Blood based on Generation
        // V20 Core: 13th=10, 12th=11, 11th=12, 10th=13, 9th=14, 8th=15, 7th=20, 6th=30, 5th=40, 4th=50
        let generation = 13;
        if (characterData.backgrounds) {
            const genBg = characterData.backgrounds.find(b => b.name.toLowerCase().includes('generation'));
            if (genBg) {
                generation = 13 - genBg.value;
            }
        }
        // Manual override if 'Generation' trait exists elsewhere, but usually derived.
        if (characterData.generation) generation = parseInt(characterData.generation);

        const genMap = { 13: 10, 12: 11, 11: 12, 10: 13, 9: 14, 8: 15, 7: 20, 6: 30, 5: 40, 4: 50 };
        const maxBlood = genMap[generation] || 10;

        const currentBlood = characterData.blood_pool !== undefined ? characterData.blood_pool : maxBlood;
        
        // Render 20 boxes grid by default for visual balance, or dynamic
        const totalBoxesToRender = Math.max(maxBlood, 20); // Maintain grid shape

        for (let i = 1; i <= totalBoxesToRender; i++) {
            const box = document.createElement('div');
            
            if (i > maxBlood) {
                 box.className = 'w-5 h-5 border border-[#222] bg-black opacity-20'; // Disabled/Unreachable
            } else {
                const isFilled = i <= currentBlood;
                box.className = `w-5 h-5 border border-[#666] cursor-pointer hover:border-red-500 transition-colors ${isFilled ? 'bg-[#8b0000] shadow-[0_0_4px_#f00]' : 'bg-transparent'}`;
                box.onclick = () => this.uiManager.updateStat('blood_pool', null, i);
            }
            container.appendChild(box);
        }
    }

    renderHealth(characterData) {
        // --- Play Mode ---
        const container = document.getElementById('health-chart-play');
        if (!container) return;
        container.innerHTML = '';

        const levels = [
            { name: 'Bruised', penalty: 0 },
            { name: 'Hurt', penalty: -1 },
            { name: 'Injured', penalty: -1 },
            { name: 'Wounded', penalty: -2 },
            { name: 'Mauled', penalty: -2 },
            { name: 'Crippled', penalty: -5 },
            { name: 'Incapacitated', penalty: 0 }
        ];

        const damageTaken = characterData.health || 0;

        levels.forEach((level, index) => {
            const row = document.createElement('div');
            row.className = 'flex justify-between items-center bg-white/5 p-1 px-2 rounded mb-1 cursor-pointer hover:bg-white/10 transition-colors group';
            
            // Text Label
            const label = document.createElement('span');
            label.className = `text-[10px] uppercase font-bold w-24 ${index < damageTaken ? 'text-red-400' : 'text-gray-400'}`;
            label.textContent = level.name;

            // Penalty
            const pen = document.createElement('span');
            pen.className = 'text-[10px] text-gray-500 w-8 text-center';
            pen.textContent = level.penalty === 0 ? '' : level.penalty;

            // Box [ ] / [X] / [/]
            // Simplified for web: Box is filled if damage reaches this level
            const box = document.createElement('div');
            const isMarked = index < damageTaken;
            
            box.className = `w-4 h-4 border border-[#555] flex items-center justify-center text-xs font-bold ${isMarked ? 'bg-[#8b0000] text-black border-red-500' : 'bg-black text-transparent'}`;
            box.textContent = 'X';

            row.onclick = () => {
                // If clicking the current level, heal one level (go up)
                if (damageTaken === index + 1) {
                    this.uiManager.updateStat('health', null, index);
                } else {
                    // Otherwise set damage to this level
                    this.uiManager.updateStat('health', null, index + 1);
                }
            };

            row.appendChild(label);
            row.appendChild(pen);
            row.appendChild(box);
            container.appendChild(row);
        });
    }

    renderExperience(characterData) {
        const container = document.getElementById('experience-play-container');
        if (!container) return;
        container.innerHTML = '';

        const xp = characterData.experience || 0;
        
        const row = document.createElement('div');
        row.className = 'flex flex-col gap-2';
        
        const label = document.createElement('label');
        label.className = 'text-xs text-gold uppercase font-bold tracking-widest';
        label.textContent = 'Total Experience';

        const input = document.createElement('input');
        input.type = 'number';
        input.value = xp;
        input.className = 'w-full bg-[#111] border border-[#333] p-2 text-white font-mono text-center focus:border-gold outline-none';
        input.onchange = (e) => this.uiManager.updateStat('experience', null, parseInt(e.target.value));

        row.appendChild(label);
        row.appendChild(input);
        container.appendChild(row);
    }
}
