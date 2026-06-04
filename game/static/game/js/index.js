(function () {
    const HOLD_MS    = 300;  // hold time to enter drag mode
    const TAP_MAX_MS = 180;  // max duration for a tap
    const TAP_MAX_PX = 10;   // max movement for a tap

    let dragSrc      = null;
    let ghost        = null;
    let hoveredSlot  = null;
    let holdTimer    = null;
    let isDragging   = false;
    let activeCard   = null;
    let touchStartX  = 0;
    let touchStartY  = 0;
    let touchStartT  = 0;
    let dragMoveHandler = null;

    const blockCards   = document.querySelector('.block-cards');
    const hammerCountEl = document.querySelector('.hammer-count');
    let hammerCount    = parseInt(hammerCountEl?.dataset.count ?? '0', 10);
    const hammerBtn    = document.querySelector('.round-btn');
    const hammerWrap   = document.querySelector('.slot-btn-wrap');
    const appEl        = document.querySelector('.app');

    function getImgSrc(card) { return card.querySelector('.inv-card-img').src; }

    function rejectHammer() {
        hammerWrap.classList.remove('hammer-reject');
        void hammerWrap.offsetWidth;
        hammerWrap.classList.add('hammer-reject');
        setTimeout(() => hammerWrap.classList.remove('hammer-reject'), 400);
    }

    function swingHammer() {
        hammerBtn.classList.remove('swinging');
        void hammerBtn.offsetWidth;
        hammerBtn.classList.add('swinging');
        setTimeout(() => hammerBtn.classList.remove('swinging'), 500);
    }

    function updateHammerDisplay() {
        hammerCountEl.textContent = 'x' + hammerCount;
        hammerCountEl.classList.toggle('empty', hammerCount === 0);
        appEl.classList.toggle('no-hammers', hammerCount === 0);
    }

    updateHammerDisplay();

    function dropIntoSlot(slotWrap, imgSrc) {
        if (hammerCount <= 0) { rejectHammer(); return; }
        const slotImg = slotWrap.querySelector('.slot-img');
        if (slotImg) {
            slotImg.src = imgSrc;
            slotWrap.dataset.occupied = 'true';
            hammerCount--;
            updateHammerDisplay();
            swingHammer();
        }
    }

    function clearSlotHighlights() {
        document.querySelectorAll('.slot-drop-hover').forEach(s => s.classList.remove('slot-drop-hover'));
    }

    function removeGhost() { if (ghost) { ghost.remove(); ghost = null; } }

    // More reliable: check bounding rects directly instead of elementFromPoint
    function findSlotAt(clientX, clientY) {
        for (const wrap of document.querySelectorAll('.slot-wrap')) {
            const r = wrap.getBoundingClientRect();
            if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
                return wrap;
            }
        }
        return null;
    }

    function cancelHold() {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (activeCard) activeCard.classList.remove('press-charging');
    }

    function cleanup() {
        if (dragMoveHandler) {
            document.removeEventListener('touchmove', dragMoveHandler);
            dragMoveHandler = null;
        }
        removeGhost();
        if (dragSrc) { dragSrc.classList.remove('dragging'); dragSrc = null; }
        clearSlotHighlights();
        hoveredSlot  = null;
        isDragging   = false;
        activeCard   = null;
    }

    function activateDrag(card) {
        isDragging = true;
        dragSrc    = card;
        card.classList.remove('press-charging');

        const rect = card.getBoundingClientRect();
        ghost = card.cloneNode(true);
        ghost.className = 'drag-ghost';
        ghost.style.width  = rect.width  + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.left   = rect.left   + 'px';
        ghost.style.top    = rect.top    + 'px';
        document.body.appendChild(ghost);
        card.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(40);

        dragMoveHandler = ev => {
            ev.preventDefault();
            const t = ev.touches[0];
            ghost.style.left = (t.clientX - ghost.offsetWidth  / 2) + 'px';
            ghost.style.top  = (t.clientY - ghost.offsetHeight / 2) + 'px';

            clearSlotHighlights();
            hoveredSlot = findSlotAt(t.clientX, t.clientY);
            if (hoveredSlot) hoveredSlot.classList.add('slot-drop-hover');
        };
        document.addEventListener('touchmove', dragMoveHandler, { passive: false });
    }

    // ── Enlarged card overlay ──
    function showEnlargedCard(card) {
        const src = getImgSrc(card);
        const overlay = document.createElement('div');
        overlay.className = 'card-zoom-overlay';
        overlay.innerHTML = `<img class="card-zoom-img" src="${src}" alt="">`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
        overlay.addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 250);
        });
    }

    // ── Desktop drag (HTML5) ──
    document.querySelectorAll('.inv-card').forEach(card => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', e => {
            dragSrc = card;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => card.classList.add('dragging'), 0);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            clearSlotHighlights();
            dragSrc = null;
        });
    });

    document.querySelectorAll('.slot-wrap').forEach(wrap => {
        wrap.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            clearSlotHighlights();
            wrap.classList.add('slot-drop-hover');
        });
        wrap.addEventListener('dragleave', e => {
            if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('slot-drop-hover');
        });
        wrap.addEventListener('drop', e => {
            e.preventDefault();
            wrap.classList.remove('slot-drop-hover');
            if (dragSrc) dropIntoSlot(wrap, getImgSrc(dragSrc));
        });
    });

    // ── Touch events ──
    blockCards.addEventListener('touchstart', e => {
        const card = e.target.closest('.inv-card');
        if (!card) return;

        activeCard   = card;
        touchStartX  = e.touches[0].clientX;
        touchStartY  = e.touches[0].clientY;
        touchStartT  = Date.now();

        holdTimer = setTimeout(() => {
            holdTimer = null;
            card.classList.add('press-charging');
            holdTimer = setTimeout(() => {
                holdTimer = null;
                activateDrag(card);
            }, 150);
        }, 150);
    }, { passive: true });

    blockCards.addEventListener('touchmove', e => {
        if (isDragging) return;
        if (!activeCard) return;

        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);

        if (dx > TAP_MAX_PX || dy > TAP_MAX_PX) {
            cancelHold();
        }
    }, { passive: true });

    blockCards.addEventListener('touchend', e => {
        const wasDragging = isDragging;
        const card = activeCard;
        const dt = Date.now() - touchStartT;
        const dx = Math.abs((e.changedTouches[0]?.clientX || touchStartX) - touchStartX);
        const dy = Math.abs((e.changedTouches[0]?.clientY || touchStartY) - touchStartY);

        cancelHold();

        if (wasDragging) {
            if (hoveredSlot && dragSrc) dropIntoSlot(hoveredSlot, getImgSrc(dragSrc));
            cleanup();
        } else if (card && dt < TAP_MAX_MS && dx < TAP_MAX_PX && dy < TAP_MAX_PX) {
            // Short tap → enlarge
            activeCard = null;
            showEnlargedCard(card);
        } else {
            activeCard = null;
        }
    }, { passive: true });

    blockCards.addEventListener('touchcancel', () => {
        cancelHold();
        cleanup();
    }, { passive: true });
})();
