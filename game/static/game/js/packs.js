const delay = ms => new Promise(r => setTimeout(r, ms));

const infoBtn      = document.getElementById('pack-info-btn');
const infoOverlay  = document.getElementById('pack-info-overlay');
const infoClose    = document.getElementById('pack-info-close');
const openBtn      = document.getElementById('pack-open-btn');
const countEl      = document.querySelector('.pack-count');
const packBottle   = document.querySelector('.pack-bottle');
const packWrap     = document.querySelector('.pack-bottle-wrap');
const packFlash    = document.getElementById('pack-flash');
const animOverlay  = document.getElementById('pack-anim-overlay');
const animTitle    = document.getElementById('pack-anim-title');
const animContent  = document.getElementById('pack-anim-content');
const animReward   = document.getElementById('pack-anim-reward');
const animClose    = document.getElementById('pack-anim-close');

let pendingPacksLeft = null;

// Info overlay
infoBtn.addEventListener('click', () => infoOverlay.classList.add('active'));
infoClose.addEventListener('click', () => infoOverlay.classList.remove('active'));
infoOverlay.addEventListener('click', e => {
    if (e.target === infoOverlay) infoOverlay.classList.remove('active');
});

// Open pack
openBtn.addEventListener('click', async () => {
    if (openBtn.dataset.busy) return;
    const currentCount = parseInt(countEl.textContent.replace('x', '')) || 0;
    if (currentCount <= 0) return;

    openBtn.dataset.busy = '1';

    // Start fetch in parallel with animation
    const fetchPromise = fetch(OPEN_URL, { method: 'POST' })
        .then(r => r.ok ? r.json() : Promise.reject(r.status));

    // 1. Shake
    packBottle.classList.add('pack-shaking');
    await delay(620);
    packBottle.classList.remove('pack-shaking');

    // 2. Flash + pack vanishes
    packFlash.classList.add('pack-flashing');
    packWrap.classList.add('pack-vanish');
    await delay(480);
    packFlash.classList.remove('pack-flashing');

    // 3. Get API result
    let data;
    try {
        data = await fetchPromise;
    } catch {
        packWrap.classList.remove('pack-vanish');
        delete openBtn.dataset.busy;
        return;
    }

    pendingPacksLeft = data.packs_left;

    // 4. Show overlay
    animContent.innerHTML = '';
    animReward.innerHTML  = '';
    animTitle.textContent = '';
    animTitle.className   = 'pack-anim-title';
    animClose.style.opacity      = '0';
    animClose.style.pointerEvents = 'none';
    animOverlay.classList.add('active');

    await delay(80);

    if (data.collection_full) {
        await animateCollectionFull();
    } else {
        await animateCards(data.cards, data.hammers_earned);
    }

    animClose.style.opacity      = '1';
    animClose.style.pointerEvents = '';
});

animClose.addEventListener('click', () => {
    animOverlay.classList.remove('active');
    packWrap.classList.remove('pack-vanish');
    if (pendingPacksLeft !== null) {
        countEl.textContent  = 'x' + pendingPacksLeft;
        pendingPacksLeft     = null;
    }
    delete openBtn.dataset.busy;
});

function makeCard(card) {
    const img = CARTS_URL + card.slug + '.png';
    const el = document.createElement('div');
    el.className = 'anim-card';
    el.innerHTML = `
        <div class="anim-card-inner">
            <div class="anim-card-back">
                <div class="anim-card-back-glyph">✦</div>
            </div>
            <div class="anim-card-front">
                <img src="${img}" class="anim-card-img" alt="">
            </div>
        </div>`;
    return el;
}

async function animateCards(cards, hammersEarned) {
    // Title
    animTitle.textContent = 'Нові карти!';
    animTitle.className   = 'pack-anim-title';

    // Build triangle: 2 top + 1 bottom
    const topRow = document.createElement('div');
    topRow.className = 'pack-tri-top';
    const botRow = document.createElement('div');
    botRow.className = 'pack-tri-bot';

    const cardEls = cards.map(c => makeCard(c));
    if (cardEls[0]) topRow.appendChild(cardEls[0]);
    if (cardEls[1]) topRow.appendChild(cardEls[1]);
    if (cardEls[2]) botRow.appendChild(cardEls[2]);

    animContent.appendChild(topRow);
    animContent.appendChild(botRow);

    // Drop cards in with stagger
    await delay(120);
    cardEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('anim-card--visible'), i * 130);
    });
    await delay(130 * cardEls.length + 280);

    // Flip one by one
    for (const el of cardEls) {
        el.querySelector('.anim-card-inner').classList.add('flipped');
        await delay(260);
    }
    await delay(180);

    // Hammer reward
    const rewardEl = document.createElement('div');
    rewardEl.className = 'pack-hammer-reward';
    const hammerWord = hammersEarned === 1 ? 'молоток' : 'молотки';
    rewardEl.innerHTML = `
        <img src="${HAMMER_URL}" class="pack-hammer-icon" alt="">
        <span class="pack-hammer-text">+${hammersEarned} ${hammerWord}</span>`;
    animReward.appendChild(rewardEl);

    await delay(450);
}

async function animateCollectionFull() {
    animTitle.textContent = 'Колекція повна!';
    animTitle.className   = 'pack-anim-title pack-anim-title--gold';

    // 3 hammer icons + ×3
    const fullHammers = document.createElement('div');
    fullHammers.className = 'pack-full-hammers';
    fullHammers.innerHTML = `
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">`;

    const x3El = document.createElement('div');
    x3El.className = 'pack-full-x3';
    x3El.textContent = '×3';

    animContent.appendChild(fullHammers);
    animContent.appendChild(x3El);

    // Hammers fall in staggered
    await delay(100);
    const hammerImgs = fullHammers.querySelectorAll('.pack-full-hammer');
    hammerImgs.forEach((h, i) => {
        setTimeout(() => h.classList.add('pack-full-hammer--visible'), i * 200);
    });
    await delay(200 * hammerImgs.length + 200);

    // ×3 pops
    x3El.classList.add('pack-full-x3--visible');
    await delay(350);

    // Sub text
    const subEl = document.createElement('div');
    subEl.className = 'pack-full-sub';
    subEl.textContent = '+3 молотки замість карт';
    animReward.appendChild(subEl);

    await delay(380);
}
