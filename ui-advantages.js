class AdvantagesRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        this.renderDisciplines(characterData);
        this.renderBackgrounds(characterData);
        this.renderVirtues(characterData);
    }

    renderDisciplines(characterData) {
        const container = document.getElementById('disciplines-section');
        if (!container) return;
        container.innerHTML = '<h3>Disciplines</h3>';

        const list = document.createElement('div');
        list.className = 'advantages-list';

        // Render existing disciplines
        (characterData.disciplines || []).forEach((disc, index) => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = disc.name;
            nameInput.placeholder = 'Discipline Name';
            nameInput.className = 'stat-name-input';
            nameInput.onchange = (e) => this.uiManager.updateArrayItem('disciplines', index, 'name', e.target.value);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'dots-container';

            const maxVal = 5;
            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('span');
                dot.className = i <= disc.value ? 'dot filled' : 'dot empty';
                dot.onclick = () => this.uiManager.updateArrayItem('disciplines', index, 'value', i);
                dotsContainer.appendChild(dot);
            }

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => this.uiManager.removeArrayItem('disciplines', index);

            row.appendChild(nameInput);
            row.appendChild(dotsContainer);
            row.appendChild(removeBtn);
            list.appendChild(row);
        });

        // Add button
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Discipline';
        addBtn.className = 'add-btn';
        addBtn.onclick = () => this.uiManager.addArrayItem('disciplines', { name: '', value: 1 });

        container.appendChild(list);
        container.appendChild(addBtn);
    }

    renderBackgrounds(characterData) {
        const container = document.getElementById('backgrounds-section');
        if (!container) return;
        container.innerHTML = '<h3>Backgrounds</h3>';

        const list = document.createElement('div');
        list.className = 'advantages-list';

        (characterData.backgrounds || []).forEach((bg, index) => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = bg.name;
            nameInput.placeholder = 'Background Name';
            nameInput.className = 'stat-name-input';
            nameInput.onchange = (e) => this.uiManager.updateArrayItem('backgrounds', index, 'name', e.target.value);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'dots-container';

            const maxVal = 5;
            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('span');
                dot.className = i <= bg.value ? 'dot filled' : 'dot empty';
                dot.onclick = () => this.uiManager.updateArrayItem('backgrounds', index, 'value', i);
                dotsContainer.appendChild(dot);
            }

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => this.uiManager.removeArrayItem('backgrounds', index);

            row.appendChild(nameInput);
            row.appendChild(dotsContainer);
            row.appendChild(removeBtn);
            list.appendChild(row);
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Background';
        addBtn.className = 'add-btn';
        addBtn.onclick = () => this.uiManager.addArrayItem('backgrounds', { name: '', value: 1 });

        container.appendChild(list);
        container.appendChild(addBtn);
    }

    renderVirtues(characterData) {
        const container = document.getElementById('virtues-section');
        if (!container) return;
        container.innerHTML = '<h3>Virtues</h3>';

        const virtues = ['conscience', 'self_control', 'courage'];
        // Check for alternate paths later if needed, V20 defaults
        const labels = {
            'conscience': 'Conscience',
            'self_control': 'Self-Control',
            'courage': 'Courage'
        };

        virtues.forEach(virtue => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const label = document.createElement('span');
            label.className = 'stat-label';
            label.textContent = labels[virtue];
            
            // Clickable for rolling
            label.style.cursor = 'pointer';
            label.onclick = () => this.uiManager.rollDice(virtue, characterData.virtues[virtue]);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'dots-container';

            const currentVal = characterData.virtues[virtue] || 1;
            const maxVal = 5;

            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('span');
                dot.className = i <= currentVal ? 'dot filled' : 'dot empty';
                dot.onclick = () => this.uiManager.updateStat('virtues', virtue, i);
                dotsContainer.appendChild(dot);
            }

            row.appendChild(label);
            row.appendChild(dotsContainer);
            container.appendChild(row);
        });
    }
}
