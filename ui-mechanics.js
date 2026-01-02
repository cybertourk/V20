class MechanicsRenderer {
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
        const container = document.getElementById('willpower-section');
        if (!container) return;
        container.innerHTML = '<h3>Willpower</h3>';

        const row = document.createElement('div');
        row.className = 'mechanic-row';

        // Permanent Willpower (Dots)
        const permCol = document.createElement('div');
        permCol.className = 'mechanic-col';
        permCol.innerHTML = '<h4>Permanent</h4>';
        
        const permDots = document.createElement('div');
        permDots.className = 'dots-container';
        const currentPerm = characterData.willpower || 1;
        
        for (let i = 1; i <= 10; i++) {
            const dot = document.createElement('span');
            dot.className = i <= currentPerm ? 'dot filled' : 'dot empty';
            dot.onclick = () => this.uiManager.updateStat('willpower', null, i);
            permDots.appendChild(dot);
        }
        permCol.appendChild(permDots);

        // Temporary Willpower (Squares)
        const tempCol = document.createElement('div');
        tempCol.className = 'mechanic-col';
        tempCol.innerHTML = '<h4>Current</h4>';

        const tempContainer = document.createElement('div');
        tempContainer.className = 'squares-container';
        const currentTemp = characterData.willpower_pool !== undefined ? characterData.willpower_pool : currentPerm;

        for (let i = 1; i <= 10; i++) {
            const square = document.createElement('span');
            // Show available squares up to Permanent rating
            if (i > currentPerm) {
                square.className = 'square disabled';
            } else {
                square.className = i <= currentTemp ? 'square filled' : 'square empty';
                square.onclick = () => this.uiManager.updateStat('willpower_pool', null, i);
            }
            tempContainer.appendChild(square);
        }
        tempCol.appendChild(tempContainer);

        row.appendChild(permCol);
        row.appendChild(tempCol);
        container.appendChild(row);
    }

    renderBloodPool(characterData) {
        const container = document.getElementById('blood-section');
        if (!container) return;
        container.innerHTML = '<h3>Blood Pool</h3>';

        const poolContainer = document.createElement('div');
        poolContainer.className = 'squares-container blood-pool';

        // Default max blood for Gen 13 is 10. This logic might need expansion based on Generation.
        // For now, render 20 squares but disable those above max.
        const generation = characterData.backgrounds?.find(b => b.name.toLowerCase() === 'generation')?.value || 0;
        // Simple lookup for V20 max blood based on Generation (approximate)
        // 13th: 10, 12th: 11, ... 8th: 15, etc. 
        // Base logic: 10 + (13 - Generation) if Gen <= 13? 
        // Standard V20: Gen 13=10, 12=11, 11=12, 10=13, 9=14, 8=15, 7=20, 6=30, 5=40, 4=50
        // We will default to 10 if not set, or allow manual override if data exists.
        
        let maxBlood = 10;
        // Simple mapping for generation
        const genMap = { 13: 10, 12: 11, 11: 12, 10: 13, 9: 14, 8: 15, 7: 20, 6: 30, 5: 40, 4: 50 };
        // Calculate generation value (Base 13 usually, minus dots in Generation background isn't direct mapping in V20, usually Generation background adds to starting, decreasing generation.
        // If 'Generation' background is 1, Gen is 12. If 5, Gen is 8.
        const genBackground = characterData.backgrounds?.find(b => b.name.toLowerCase() === 'generation');
        let currentGen = 13;
        if (genBackground) {
            currentGen = 13 - genBackground.value;
        }
        maxBlood = genMap[currentGen] || 10;
        if (currentGen < 8) maxBlood = genMap[currentGen]; // Higher pools for elders

        const currentBlood = characterData.blood_pool !== undefined ? characterData.blood_pool : maxBlood;

        const displayMax = Math.max(maxBlood, 20); // Show at least 20 slots for visual consistency

        for (let i = 1; i <= displayMax; i++) {
            const square = document.createElement('span');
            if (i > maxBlood) {
                square.className = 'square disabled';
            } else {
                square.className = i <= currentBlood ? 'square filled' : 'square empty';
                square.onclick = () => this.uiManager.updateStat('blood_pool', null, i);
            }
            poolContainer.appendChild(square);
        }

        const info = document.createElement('div');
        info.className = 'small-text';
        info.textContent = `Generation: ${currentGen} | Max Blood: ${maxBlood}`;

        container.appendChild(info);
        container.appendChild(poolContainer);
    }

    renderHealth(characterData) {
        const container = document.getElementById('health-section');
        if (!container) return;
        container.innerHTML = '<h3>Health</h3>';

        const levels = [
            { name: 'Bruised', penalty: 0 },
            { name: 'Hurt', penalty: -1 },
            { name: 'Injured', penalty: -1 },
            { name: 'Wounded', penalty: -2 },
            { name: 'Mauled', penalty: -2 },
            { name: 'Crippled', penalty: -5 },
            { name: 'Incapacitated', penalty: 0 }
        ];

        const healthBox = document.createElement('div');
        healthBox.className = 'health-list';

        // characterData.health could be a number (damage taken)
        const damageTaken = characterData.health || 0;

        levels.forEach((level, index) => {
            const row = document.createElement('div');
            row.className = 'health-row';
            
            const label = document.createElement('span');
            label.textContent = `${level.name} (${level.penalty})`;
            label.className = 'health-label';

            const box = document.createElement('span');
            // If the current index is less than damageTaken, it is marked.
            // Simplified: 0 damage = no boxes. 1 damage = Bruised box marked.
            // Standard sheet often marks from top down.
            const isMarked = (index < damageTaken);
            
            // Visual style: [ ] vs [X] vs [/]
            box.className = isMarked ? 'health-box marked' : 'health-box';
            box.textContent = isMarked ? 'X' : '';
            
            // Clicking a box sets damage to that level + 1 (because 0 index is 1st level)
            // Or toggles. Let's make it set the damage level.
            box.onclick = () => {
                // If clicking the current max damage, reduce by 1 (toggle off)
                if (damageTaken === index + 1) {
                    this.uiManager.updateStat('health', null, index);
                } else {
                    this.uiManager.updateStat('health', null, index + 1);
                }
            };

            row.appendChild(label);
            row.appendChild(box);
            healthBox.appendChild(row);
        });

        container.appendChild(healthBox);
    }

    renderExperience(characterData) {
        const container = document.getElementById('experience-section');
        if (!container) return;
        
        container.innerHTML = '<h3>Experience</h3>';
        
        const row = document.createElement('div');
        row.className = 'xp-row';

        const label = document.createElement('label');
        label.textContent = 'Total Experience:';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = characterData.experience || 0;
        input.className = 'xp-input';
        input.onchange = (e) => this.uiManager.updateStat('experience', null, parseInt(e.target.value));

        row.appendChild(label);
        row.appendChild(input);
        container.appendChild(row);
    }
}
