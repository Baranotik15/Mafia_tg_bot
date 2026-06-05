(function () {
    const TAP_MAX_MS = 200;
    const TAP_MAX_PX = 10;
    const HOLD_MS    = 180;

    // ── State ──
    let mode        = 'idle'; // idle | holding | dragging
    let holdTimer   = null;
    let srcCard     = null;
    let ghost       = null;
    let activeSlot  = null;
    let justDropped = false;
    let startX = 0, startY = 0, startT = 0;

    // ── DOM ──
    const blockCards    = document.querySelector('.block-cards');
    const hammerCountEl = document.querySelector('.hammer-count');
    const hammerBtn     = document.querySelector('.round-btn');
    const hammerWrap    = document.querySelector('.slot-btn-wrap');
    const appEl         = document.querySelector('.app');
    let hammerCount     = parseInt(hammerCountEl?.dataset.count ?? '0', 10);

    // ── Hammer UI ──
    function updateHammerUI() {
        hammerCountEl.textContent = 'x' + hammerCount;
        hammerCountEl.classList.toggle('empty', hammerCount === 0);
        appEl.classList.toggle('no-hammers', hammerCount === 0);
    }
    updateHammerUI();

    function swingHammer() {
        hammerBtn.classList.remove('swinging');
        void hammerBtn.offsetWidth;
        hammerBtn.classList.add('swinging');
        setTimeout(() => hammerBtn.classList.remove('swinging'), 500);
    }

    function rejectHammer() {
        hammerWrap.classList.remove('hammer-reject');
        void hammerWrap.offsetWidth;
        hammerWrap.classList.add('hammer-reject');
        setTimeout(() => hammerWrap.classList.remove('hammer-reject'), 400);
    }

    // ── Slots ──
    function allSlots() {
        return Array.from(document.querySelectorAll('.slot-wrap'));
    }

    function slotAt(x, y) {
        for (const s of allSlots()) {
            const r = s.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
        }
        return null;
    }

    function highlightSlot(target) {
        allSlots().forEach(s => s.classList.toggle('slot-drop-hover', s === target));
    }

    function renderSlot(slotWrap, imgSrc) {
        const cardSlot = slotWrap.querySelector('.card-slot');
        cardSlot.querySelectorAll('.slot-img').forEach(el => el.remove());
        const img = document.createElement('img');
        img.className = 'slot-img';
        img.src = imgSrc;
        img.alt = '';
        const frame = cardSlot.querySelector('.slot-frame');
        cardSlot.insertBefore(img, frame);
        slotWrap.dataset.occupied = 'true';
        slotWrap.classList.add('slot-occupied');
    }

    // ── Collection grid ──
    function removeCardFromGrid(slug) {
        document.querySelector(`.inv-card[data-slug="${slug}"]`)?.remove();
        const grid = document.querySelector('.inv-grid');
        if (grid && grid.children.length === 0) {
            grid.remove();
            const empty = document.createElement('div');
            empty.className = 'inv-empty';
            empty.textContent = 'Колекція порожня';
            blockCards.appendChild(empty);
        }
    }

    function addCardToGrid(slug) {
        blockCards.querySelector('.inv-empty')?.remove();
        let grid = document.querySelector('.inv-grid');
        if (!grid) {
            grid = document.createElement('div');
            grid.className = 'inv-grid';
            blockCards.appendChild(grid);
        }
        const card = document.createElement('div');
        card.className = 'inv-card';
        card.dataset.slug = slug;
        card.setAttribute('draggable', 'true');
        card.innerHTML = `<img class="inv-card-img" draggable="false" src="${CARTS_URL}${slug}.webp" alt="${slug}">`;
        grid.appendChild(card);
        attachDesktopDrag(card);
    }

    // ── API ──
    async function apiSetSlot(position, slug) {
        const res = await fetch(SET_SLOT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position, slug }),
        });
        return res.json();
    }

    async function dropIntoSlot(slotWrap, slug, imgSrc) {
        if (hammerCount <= 0) { rejectHammer(); return; }
        const position = parseInt(slotWrap.dataset.position);
        const data = await apiSetSlot(position, slug);
        if (data.ok) {
            justDropped = true;
            setTimeout(() => { justDropped = false; }, 400);
            if (data.old_slug) addCardToGrid(data.old_slug);
            removeCardFromGrid(slug);
            renderSlot(slotWrap, imgSrc);
            hammerCount = data.hammers;
            updateHammerUI();
            swingHammer();
        } else if (data.error === 'no_hammers') {
            rejectHammer();
        }
    }

    // ── Zoom overlay ──
    function showZoomSrc(src) {
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

    function showZoom(card) {
        showZoomSrc(card.querySelector('.inv-card-img').src);
    }

    // ── Ghost ──
    function spawnGhost(card, cx, cy) {
        const r = card.getBoundingClientRect();
        ghost = card.cloneNode(true);
        ghost.className  = 'drag-ghost';
        ghost.style.width  = r.width  + 'px';
        ghost.style.height = r.height + 'px';
        ghost.style.left   = (cx - r.width  / 2) + 'px';
        ghost.style.top    = (cy - r.height / 2) + 'px';
        document.body.appendChild(ghost);
    }

    function moveGhost(cx, cy) {
        if (!ghost) return;
        ghost.style.left = (cx - ghost.offsetWidth  / 2) + 'px';
        ghost.style.top  = (cy - ghost.offsetHeight / 2) + 'px';
    }

    function destroyGhost() { if (ghost) { ghost.remove(); ghost = null; } }

    // ── Reset ──
    function reset() {
        clearTimeout(holdTimer);
        holdTimer = null;
        if (srcCard) srcCard.classList.remove('dragging', 'press-charging');
        destroyGhost();
        highlightSlot(null);
        activeSlot = null;
        srcCard    = null;
        mode       = 'idle';
    }

    // ── Touch: start ──
    document.addEventListener('touchstart', e => {
        if (mode !== 'idle') return;

        // Tap on occupied slot → zoom
        const slotTap = e.target.closest('.slot-wrap');
        if (slotTap && slotTap.dataset.occupied === 'true') {
            const img = slotTap.querySelector('.slot-img');
            if (img) showZoomSrc(img.src);
            return;
        }

        const card = e.target.closest('.inv-card');
        if (!card || !blockCards.contains(card)) return;

        srcCard = card;
        startX  = e.touches[0].clientX;
        startY  = e.touches[0].clientY;
        startT  = Date.now();
        mode    = 'holding';

        holdTimer = setTimeout(() => {
            if (mode !== 'holding') return;
            srcCard.classList.add('press-charging');
            holdTimer = setTimeout(() => {
                if (mode !== 'holding') return;
                mode = 'dragging';
                srcCard.classList.remove('press-charging');
                srcCard.classList.add('dragging');
                spawnGhost(srcCard, startX, startY);
                if (navigator.vibrate) navigator.vibrate(40);
            }, HOLD_MS);
        }, HOLD_MS);
    }, { passive: true });

    // ── Touch: move ──
    document.addEventListener('touchmove', e => {
        if (mode === 'idle') return;
        const t  = e.touches[0];
        const dy = Math.abs(t.clientY - startY);

        if (mode === 'holding') {
            if (dy > 22) { reset(); return; }
            e.preventDefault();
            return;
        }
        if (mode === 'dragging') {
            e.preventDefault();
            moveGhost(t.clientX, t.clientY);
            activeSlot = slotAt(t.clientX, t.clientY);
            highlightSlot(activeSlot);
        }
    }, { passive: false });

    // ── Touch: end ──
    document.addEventListener('touchend', e => {
        if (mode === 'idle') return;
        const t  = e.changedTouches[0];
        const dt = Date.now() - startT;
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        const card = srcCard;

        if (mode === 'dragging') {
            const slot = slotAt(t.clientX, t.clientY) || activeSlot;
            if (slot) {
                const slug   = card.dataset.slug;
                const imgSrc = card.querySelector('.inv-card-img').src;
                reset();
                dropIntoSlot(slot, slug, imgSrc);
            } else {
                reset();
            }
            return;
        }

        if (dt < TAP_MAX_MS && dx < TAP_MAX_PX && dy < TAP_MAX_PX) {
            reset();
            showZoom(card);
            return;
        }
        reset();
    }, { passive: true });

    document.addEventListener('touchcancel', reset, { passive: true });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const hammerOverlay = document.getElementById('hammerInfoOverlay');
        if (hammerOverlay?.classList.contains('active')) { hammerOverlay.classList.remove('active'); return; }
        const zoom = document.querySelector('.card-zoom-overlay');
        if (zoom) { zoom.classList.remove('active'); setTimeout(() => zoom.remove(), 250); }
    });

    const hammerInfoBtn     = document.getElementById('hammerInfoBtn');
    const hammerInfoOverlay = document.getElementById('hammerInfoOverlay');
    const hammerInfoClose   = document.getElementById('hammerInfoClose');

    hammerInfoBtn.addEventListener('click', () => hammerInfoOverlay.classList.add('active'));
    hammerInfoClose.addEventListener('click', () => hammerInfoOverlay.classList.remove('active'));
    hammerInfoOverlay.addEventListener('click', e => {
        if (e.target === hammerInfoOverlay) hammerInfoOverlay.classList.remove('active');
    });

    // ── Desktop drag ──
    function attachDesktopDrag(card) {
        card.draggable = true;
        card.addEventListener('dragstart', e => {
            srcCard = card;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => card.classList.add('dragging'), 0);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            highlightSlot(null);
            srcCard = null;
        });
        card.addEventListener('click', () => { if (!justDropped) showZoom(card); });
    }

    document.querySelectorAll('.inv-card').forEach(attachDesktopDrag);

    allSlots().forEach(wrap => {
        wrap.addEventListener('click', () => {
            if (srcCard || justDropped) return;
            if (wrap.dataset.occupied !== 'true') return;
            const img = wrap.querySelector('.slot-img');
            if (img) showZoomSrc(img.src);
        });
        wrap.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            highlightSlot(wrap);
        });
        wrap.addEventListener('dragleave', e => {
            if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('slot-drop-hover');
        });
        wrap.addEventListener('drop', e => {
            e.preventDefault();
            highlightSlot(null);
            if (!srcCard) return;
            const slug   = srcCard.dataset.slug;
            const imgSrc = srcCard.querySelector('.inv-card-img').src;
            dropIntoSlot(wrap, slug, imgSrc);
        });
    });
})();
