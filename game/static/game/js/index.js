(function () {
    let dragSrc = null;
    let ghost = null;
    let hoveredSlot = null;

    const hammerCountEl = document.querySelector('.hammer-count');
    let hammerCount = parseInt(hammerCountEl?.dataset.count ?? '0', 10);
    const hammerBtn = document.querySelector('.round-btn');
    const hammerWrap = document.querySelector('.slot-btn-wrap');
    const appEl = document.querySelector('.app');

    function getImgSrc(card) { return card.querySelector('.inv-card-img').src; }

    function rejectSlot(slotWrap) {
        slotWrap.classList.remove('rejecting');
        void slotWrap.offsetWidth;
        slotWrap.classList.add('rejecting');
        setTimeout(() => slotWrap.classList.remove('rejecting'), 450);
    }

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

    document.querySelectorAll('.inv-card').forEach(card => {
        card.addEventListener('touchstart', e => {
            dragSrc = card;
            const rect = card.getBoundingClientRect();
            ghost = card.cloneNode(true);
            ghost.className = 'drag-ghost';
            ghost.style.width  = rect.width  + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.left   = rect.left   + 'px';
            ghost.style.top    = rect.top    + 'px';
            document.body.appendChild(ghost);
            card.classList.add('dragging');
        }, { passive: true });

        card.addEventListener('touchmove', e => {
            if (!ghost) return;
            e.preventDefault();
            const touch = e.touches[0];
            ghost.style.left = (touch.clientX - ghost.offsetWidth  / 2) + 'px';
            ghost.style.top  = (touch.clientY - ghost.offsetHeight / 2) + 'px';
            ghost.style.display = 'none';
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            ghost.style.display = '';
            clearSlotHighlights();
            hoveredSlot = el ? el.closest('.slot-wrap') : null;
            if (hoveredSlot) hoveredSlot.classList.add('slot-drop-hover');
        }, { passive: false });

        card.addEventListener('touchend', () => {
            if (hoveredSlot && dragSrc) dropIntoSlot(hoveredSlot, getImgSrc(dragSrc));
            cleanup();
        });
        card.addEventListener('touchcancel', cleanup);
    });

    function cleanup() {
        removeGhost();
        if (dragSrc) { dragSrc.classList.remove('dragging'); dragSrc = null; }
        clearSlotHighlights();
        hoveredSlot = null;
    }
})();
