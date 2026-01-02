class AbilityRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        const container = document.getElementById('abilities-section');
        if (!container) return;
        container.innerHTML = '';

        const categories = ['talents', 'skills', 'knowledges'];

        categories.forEach(category => {
            const colDiv = document.createElement('div');
            colDiv.className = 'ability-column';

            const header = document.createElement('h3');
            header.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            colDiv.appendChild(header);

            const abilities = this.uiManager.rules.abilities[category];
            abilities.forEach(ability => {
                const abilityRow = document.createElement('div');
                abilityRow.className = 'stat-row';

                const label = document.createElement('span');
                label.className = 'stat-label';
                label.textContent = ability;
                
                // Clickable label for rolling
                label.style.cursor = 'pointer';
                label.onclick = () => this.uiManager.rollDice(ability, characterData.abilities[ability]);

                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'dots-container';

                const currentVal = characterData.abilities[ability] || 0;
                const maxVal = 5;

                for (let i = 1; i <= maxVal; i++) {
                    const dot = document.createElement('span');
                    dot.className = i <= currentVal ? 'dot filled' : 'dot empty';
                    dot.dataset.value = i;
                    dot.dataset.ability = ability;
                    dot.onclick = () => this.uiManager.updateStat('abilities', ability, i);
                    dotsContainer.appendChild(dot);
                }

                abilityRow.appendChild(label);
                abilityRow.appendChild(dotsContainer);
                colDiv.appendChild(abilityRow);
            });

            container.appendChild(colDiv);
        });
    }
}
