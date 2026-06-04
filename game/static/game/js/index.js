(function () {
    const TAP_MAX_MS = 200;
    const TAP_MAX_PX = 10;
    const HOLD_MS    = 180; // two stages: 180ms charge + 180ms activate = 360ms total

    // ── State ──
    let mode      = 'idle'; // idle | holding | dragging
    let holdTimer = null;
    let srcCard   = null;
    let ghost     = null;
    let activeSlot = null;
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

    function placeInSlot(slot, imgSrc) {
        if (hammerCount <= 0) { rejectHammer(); return; }
        const cardSlot = slot.querySelector('.card-slot');
        if (!cardSlot) return;
        let img = cardSlot.querySelector('.slot-img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'slot-img';
            cardSlot.appendChild(img);
        }
        img.src = imgSrc;
        slot.dataset.occupied = 'true';
        hammerCount--;
        updateHammerUI();
        swingHammer();
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

    // ── Zoom overlay ──
    function showZoom(card) {
        const src = card.querySelector('.inv-card-img').src;
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

    // ── Reset ──
    function reset() {
        clearTimeout(holdTimer);
        holdTimer = null;
        if (srcCard) srcCard.classList.remove('dragging', 'press-charging');
        destroyGhost();
        highlightSlot(null);
        activeSlot = null;
        srcCard = null;
        mode = 'idle';
    }

    // ── Touch: start ──
    document.addEventListener('touchstart', e => {
        if (mode !== 'idle') return;
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
            if (dy > 22) { reset(); return; } // clear vertical scroll → cancel
            e.preventDefault();               // otherwise block scroll while holding
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
        const t   = e.changedTouches[0];
        const dt  = Date.now() - startT;
        const dx  = Math.abs(t.clientX - startX);
        const dy  = Math.abs(t.clientY - startY);
        const card = srcCard;
        const slot = activeSlot;

        if (mode === 'dragging') {
            if (slot) placeInSlot(slot, card.querySelector('.inv-card-img').src);
            reset();
            return;
        }

        // holding — check tap
        if (dt < TAP_MAX_MS && dx < TAP_MAX_PX && dy < TAP_MAX_PX) {
            reset();
            showZoom(card);
            return;
        }

        reset();
    }, { passive: true });

    // ── Touch: cancel ──
    document.addEventListener('touchcancel', reset, { passive: true });

    // ── Desktop drag (HTML5) ──
    document.querySelectorAll('.inv-card').forEach(card => {
        card.setAttribute('draggable', 'true');
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
    });

    allSlots().forEach(wrap => {
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
            if (srcCard) placeInSlot(wrap, srcCard.querySelector('.inv-card-img').src);
        });
    });
})();
