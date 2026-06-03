const infoBtn = document.getElementById('pack-info-btn');
const infoOverlay = document.getElementById('pack-info-overlay');
const infoClose = document.getElementById('pack-info-close');

infoBtn.addEventListener('click', () => infoOverlay.classList.add('active'));
infoClose.addEventListener('click', () => infoOverlay.classList.remove('active'));
infoOverlay.addEventListener('click', e => { if (e.target === infoOverlay) infoOverlay.classList.remove('active'); });

const openBtn = document.getElementById('pack-open-btn');
const overlay = document.getElementById('pack-result-overlay');
const resultCards = document.getElementById('pack-result-cards');
const closeBtn = document.getElementById('pack-result-close');
const countEl = document.querySelector('.pack-count');

const RARITY_LABEL = {
    common:    'Звичайна',
    uncommon:  'Незвична',
    rare:      'Рідкісна',
    epic:      'Епічна',
    legendary: 'Легендарна',
};

openBtn.addEventListener('click', async () => {
    if (openBtn.dataset.busy) return;
    const currentCount = parseInt(countEl.textContent.replace('x', '')) || 0;
    if (currentCount <= 0) return;

    openBtn.dataset.busy = '1';
    openBtn.style.opacity = '0.6';

    try {
        const res = await fetch(OPEN_URL, { method: 'POST' });
        const data = await res.json();

        if (!res.ok) return;

        countEl.textContent = 'x' + data.packs_left;

        if (data.collection_full) {
            resultCards.innerHTML = `
                <div class="pack-result-full">
                    🎉 Колекція повна!<br>
                    <span>+3 молотки за пак</span>
                </div>`;
        } else {
            resultCards.innerHTML = data.cards.map(c => `
                <div class="pack-result-card pack-result-card--${c.rarity}">
                    <div class="prc-name">${c.name}</div>
                    <div class="prc-rarity">${RARITY_LABEL[c.rarity] || c.rarity}</div>
                </div>
            `).join('');
        }

        overlay.classList.add('active');
    } finally {
        delete openBtn.dataset.busy;
        openBtn.style.opacity = '';
    }
});

closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
});
