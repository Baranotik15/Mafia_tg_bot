const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Promo code ──
function initPromo() {
    const promoOverlay = document.getElementById('pack-promo-overlay');
    const promoInput   = document.getElementById('promo-input');
    const promoMsg     = document.getElementById('promo-msg');
    const promoSubmit  = document.getElementById('promo-submit');
    const promoCancel  = document.getElementById('promo-cancel');
    const packAddBtn   = document.querySelector('.pack-icon-btn[data-role="add"]');

    function openPromo() {
        promoInput.value = '';
        promoMsg.textContent = '';
        promoMsg.className = 'promo-msg';
        promoOverlay.classList.add('active');
        setTimeout(() => promoInput.focus(), 150);
    }

    function closePromo() {
        promoOverlay.classList.remove('active');
    }

    packAddBtn.addEventListener('click', openPromo);
    promoCancel.addEventListener('click', closePromo);
    promoOverlay.addEventListener('click', e => {
        if (e.target === promoOverlay) closePromo();
    });
    promoInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')  promoSubmit.click();
        if (e.key === 'Escape') closePromo();
    });

    promoSubmit.addEventListener('click', async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) { promoMsg.textContent = 'Введіть промокод'; return; }

        promoSubmit.disabled = true;
        promoMsg.textContent = '';
        promoMsg.className = 'promo-msg';

        try {
            const resp = await fetch(PROMO_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await resp.json();
            if (data.ok) {
                const packs = data.packs;
                const word = packs === 1 ? 'пак' : (packs < 5 ? 'паки' : 'паків');
                promoMsg.textContent = `✅ +${packs} ${word} додано!`;
                promoMsg.className = 'promo-msg ok';
                countEl.textContent = 'x' + data.packs_total;
                setTimeout(closePromo, 1400);
            } else {
                const msgs = {
                    invalid_code:    'Промокод не знайдено або вже використано',
                    no_code:         'Введіть промокод',
                    player_not_found:'Гравець не знайдений',
                };
                promoMsg.textContent = msgs[data.error] || 'Помилка. Спробуйте ще раз.';
            }
        } catch {
            promoMsg.textContent = 'Помилка мережі. Спробуйте ще раз.';
        } finally {
            promoSubmit.disabled = false;
        }
    });
}

initPromo();

function showEnlargedCard(src) {
    const overlay = document.createElement('div');
    overlay.className = 'card-zoom-overlay';
    overlay.innerHTML = `<button class="card-zoom-close">✕</button><img class="card-zoom-img" src="${src}" alt="">`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    overlay.querySelector('.card-zoom-close').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 250);
    });
}

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
    SND_1.currentTime = 0;
    SND_1.play().catch(() => {});
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
    const img = CARTS_URL + card.slug + '.webp';
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

    // Build 2 rows: 2 top + 2 bottom
    const topRow = document.createElement('div');
    topRow.className = 'pack-tri-top';
    const botRow = document.createElement('div');
    botRow.className = 'pack-tri-top';

    const cardEls = cards.map(c => makeCard(c));
    if (cardEls[0]) topRow.appendChild(cardEls[0]);
    if (cardEls[1]) topRow.appendChild(cardEls[1]);
    if (cardEls[2]) botRow.appendChild(cardEls[2]);
    if (cardEls[3]) botRow.appendChild(cardEls[3]);

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

    // Tap to enlarge after flip
    cardEls.forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            const src = el.querySelector('.anim-card-img').src;
            showEnlargedCard(src);
        });
    });

    // Hammer reward
    const rewardEl = document.createElement('div');
    rewardEl.className = 'pack-hammer-reward';
    const hammerWord = hammersEarned === 1 ? 'якір' : (hammersEarned < 5 ? 'якорі' : 'якорів');
    rewardEl.innerHTML = `
        <img src="${HAMMER_URL}" class="pack-hammer-icon" alt="">
        <span class="pack-hammer-text">+${hammersEarned} ${hammerWord}</span>`;
    animReward.appendChild(rewardEl);

    await delay(450);
}

async function animateCollectionFull() {
    animTitle.textContent = 'Колекція повна!';
    animTitle.className   = 'pack-anim-title pack-anim-title--gold';

    // 5 anchor icons + ×5
    const fullHammers = document.createElement('div');
    fullHammers.className = 'pack-full-hammers';
    fullHammers.innerHTML = `
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">
        <img src="${HAMMER_URL}" class="pack-full-hammer" alt="">`;

    const x3El = document.createElement('div');
    x3El.className = 'pack-full-x3';
    x3El.textContent = '×5';

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
    subEl.textContent = '+5 якорів замість карт';
    animReward.appendChild(subEl);

    await delay(380);
}

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (infoOverlay.classList.contains('active')) { infoOverlay.classList.remove('active'); return; }
    if (animOverlay.classList.contains('active') && animClose.style.pointerEvents !== 'none') { animClose.click(); return; }
    const zoom = document.querySelector('.card-zoom-overlay');
    if (zoom) { zoom.classList.remove('active'); setTimeout(() => zoom.remove(), 250); }
});
