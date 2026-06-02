(function () {
    let dragSrc = null;
    let ghost = null;
    let hoveredSlot = null;
    let chargeTimer = null;
    let dragTimer = null;
    let isDragging = false;
    let activeCard = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let dragMoveHandler = null;

    const blockCards = document.querySelector('.block-cards');
    const hammerCountEl = document.querySelector('.hammer-count');
    let hammerCount = parseInt(hammerCountEl?.dataset.count ?? '0', 10);
    const hammerBtn = document.querySelector('.round-btn');
    const hammerWrap = document.querySelector('.slot-btn-wrap');
    const appEl = document.querySelector('.app');

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

    function cancelAll() {
        if (chargeTimer) { clearTimeout(chargeTimer); chargeTimer = null; }
        if (dragTimer)   { clearTimeout(dragTimer);   dragTimer   = null; }
        if (activeCard)  { activeCard.classList.remove('press-charging'); }
    }

    function cleanup() {
        if (dragMoveHandler) {
            document.removeEventListener('touchmove', dragMoveHandler);
            dragMoveHandler = null;
        }
        removeGhost();
        if (dragSrc) { dragSrc.classList.remove('dragging'); dragSrc = null; }
        clearSlotHighlights();
        hoveredSlot = null;
        isDragging = false;
        activeCard = null;
    }

    function activateDrag(card) {
        isDragging = true;
        dragSrc = card;
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
        if (navigator.vibrate) navigator.vibrate(50);

        dragMoveHandler = ev => {
            ev.preventDefault();
            const t = ev.touches[0];
            ghost.style.left = (t.clientX - ghost.offsetWidth  / 2) + 'px';
            ghost.style.top  = (t.clientY - ghost.offsetHeight / 2) + 'px';
            ghost.style.display = 'none';
            const el = document.elementFromPoint(t.clientX, t.clientY);
            ghost.style.display = '';
            clearSlotHighlights();
            hoveredSlot = el ? el.closest('.slot-wrap') : null;
            if (hoveredSlot) hoveredSlot.classList.add('slot-drop-hover');
        };
        document.addEventListener('touchmove', dragMoveHandler, { passive: false });
    }

    // Desktop drag
    document.querySelectorAll('.inv-card').forEach(card => {
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

    // Всі touch-слухачі — тільки на контейнері, passive: true
    // Картки самі не чіпаємо — вони не можуть блокувати скрол
    blockCards.addEventListener('touchstart', e => {
        const card = e.target.closest('.inv-card');
        if (!card) return;

        activeCard = card;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        chargeTimer = setTimeout(() => {
            chargeTimer = null;
            card.classList.add('press-charging');
            dragTimer = setTimeout(() => {
                dragTimer = null;
                activateDrag(card);
            }, 1500);
        }, 500);
    }, { passive: true });

    blockCards.addEventListener('touchmove', e => {
        if (isDragging || !activeCard) return;
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 8 || dy > 8) cancelAll();
    }, { passive: true });

    blockCards.addEventListener('touchend', () => {
        cancelAll();
        if (isDragging) {
            if (hoveredSlot && dragSrc) dropIntoSlot(hoveredSlot, getImgSrc(dragSrc));
            cleanup();
        } else {
            activeCard = null;
        }
    }, { passive: true });

    blockCards.addEventListener('touchcancel', () => {
        cancelAll();
        cleanup();
    }, { passive: true });
})();
