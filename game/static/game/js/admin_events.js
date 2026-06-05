(function () {
    const detail            = document.getElementById('eventDetail');
    const title             = document.getElementById('eventDetailTitle');
    const body              = document.getElementById('eventDetailBody');
    const backBtn           = document.getElementById('eventDetailBack');
    const startBtn          = document.getElementById('startEventBtn');
    const finBtn            = document.getElementById('finishEventBtn');
    const updateSnapBtn     = document.getElementById('updateSnapshotBtn');
    const cancelStartBtn    = document.getElementById('cancelStartBtn');
    const cancelBtn         = document.getElementById('cancelEventBtn');

    let currentEvent = null;
    const completed  = Object.assign({}, COMPLETED);
    const started    = Object.assign({}, STARTED);
    let toastTimer   = null;

    function showCardZoom(slug) {
        const overlay = document.createElement('div');
        overlay.className = 'ev-card-zoom';
        overlay.innerHTML =
            '<button class="ev-card-zoom-close">✕</button>' +
            '<img class="ev-card-zoom-img" src="' + CARTS_URL + slug + '.webp" alt="">';
        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add('active'); });
        overlay.querySelector('.ev-card-zoom-close').addEventListener('click', function () {
            overlay.classList.remove('active');
            setTimeout(function () { overlay.remove(); }, 250);
        });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(function () { overlay.remove(); }, 250);
            }
        });
    }

    function showToast(msg) {
        let toast = document.getElementById('evToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'evToast';
            toast.className = 'ev-toast';
            detail.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, 3000);
    }

    function isCompleted(num) { return Object.prototype.hasOwnProperty.call(completed, String(num)); }
    function isStarted(num)   { return Object.prototype.hasOwnProperty.call(started,   String(num)); }

    function getGridCard(num) {
        return document.querySelector('.event-card[data-event="' + num + '"]');
    }

    function markCompleted(num) {
        const el = getGridCard(num);
        if (el) { el.classList.add('completed'); el.classList.remove('started'); }
    }

    function markUncompleted(num) {
        const el = getGridCard(num);
        if (el) el.classList.remove('completed');
    }

    function markStarted(num) {
        const el = getGridCard(num);
        if (el) el.classList.add('started');
    }

    function markUnstarted(num) {
        const el = getGridCard(num);
        if (el) el.classList.remove('started');
    }

    Object.keys(completed).forEach(function (num) { markCompleted(parseInt(num)); });
    Object.keys(started).forEach(function (num)   { markStarted(parseInt(num)); });

    function buildRows(winners, readonly) {
        body.innerHTML = '';
        CARDS.forEach(function (card) {
            const winner    = winners ? winners.find(function (w) { return w.slug === card.slug; }) : null;
            const isChecked = !!winner;
            const count     = winner ? winner.count : 1;

            const row = document.createElement('div');
            row.className = 'card-row';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'card-checkbox';
            cb.dataset.slug = card.slug;
            cb.checked = isChecked;
            if (readonly) cb.disabled = true;

            const nameEl = document.createElement('div');
            nameEl.className = 'card-row-name';
            nameEl.textContent = card.name || card.slug;

            const infoBtn = document.createElement('button');
            infoBtn.className = 'card-info-btn';
            infoBtn.textContent = 'i';
            infoBtn.type = 'button';
            infoBtn.addEventListener('click', function () { showCardZoom(card.slug); });

            const scoreEl = document.createElement('div');
            scoreEl.className = 'card-row-score';
            scoreEl.textContent = '+' + (card.score * count) + ' балів';

            const counter = document.createElement('div');
            counter.className = 'counter';

            const minus = document.createElement('button');
            minus.className = 'counter-btn';
            minus.textContent = '−';
            minus.disabled = card.fixed_count || readonly;

            const valEl = document.createElement('span');
            valEl.className = 'counter-val';
            valEl.textContent = count;

            const plus = document.createElement('button');
            plus.className = 'counter-btn';
            plus.textContent = '+';
            plus.disabled = card.fixed_count || readonly;

            if (!card.fixed_count && !readonly) {
                minus.addEventListener('click', function () {
                    const v = parseInt(valEl.textContent);
                    if (v > 1) { valEl.textContent = v - 1; scoreEl.textContent = '+' + (card.score * (v - 1)) + ' балів'; }
                });
                plus.addEventListener('click', function () {
                    const v = parseInt(valEl.textContent);
                    valEl.textContent = v + 1;
                    scoreEl.textContent = '+' + (card.score * (v + 1)) + ' балів';
                });
            }

            counter.appendChild(minus);
            counter.appendChild(valEl);
            counter.appendChild(plus);
            row.appendChild(cb);
            row.appendChild(nameEl);
            row.appendChild(infoBtn);
            row.appendChild(scoreEl);
            row.appendChild(counter);
            body.appendChild(row);
        });
    }

    function setButtons(state) {
        startBtn.style.display       = state === 'idle'      ? 'block' : 'none';
        finBtn.style.display         = state === 'started'   ? 'block' : 'none';
        updateSnapBtn.style.display  = state === 'started'   ? 'block' : 'none';
        cancelStartBtn.style.display = state === 'started'   ? 'block' : 'none';
        cancelBtn.style.display      = state === 'completed' ? 'block' : 'none';
    }

    function openEvent(num) {
        currentEvent = num;
        title.textContent = 'Подія ' + num;

        if (isCompleted(num)) {
            buildRows(completed[String(num)], true);
            setButtons('completed');
            cancelBtn.textContent = 'Скасувати розрахунок';
            cancelBtn.disabled = false;
        } else if (isStarted(num)) {
            buildRows(null, false);
            setButtons('started');
            finBtn.textContent = 'Закінчити подію';
            finBtn.disabled = false;
            finBtn.classList.remove('success');
            cancelStartBtn.textContent = 'Скасувати старт';
            cancelStartBtn.disabled = false;
        } else {
            body.innerHTML = '';
            setButtons('idle');
            startBtn.textContent = 'Старт події';
            startBtn.disabled = false;
        }

        detail.classList.add('active');
    }

    function closeEvent() {
        detail.classList.remove('active');
        currentEvent = null;
    }

    document.querySelectorAll('.event-card').forEach(function (card) {
        card.addEventListener('click', function () {
            openEvent(parseInt(card.dataset.event));
        });
    });

    backBtn.addEventListener('click', closeEvent);

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var zoom = document.querySelector('.ev-card-zoom');
        if (zoom) { zoom.classList.remove('active'); setTimeout(function () { zoom.remove(); }, 250); return; }
        if (detail.classList.contains('active')) closeEvent();
    });

    // ── Start ──
    startBtn.addEventListener('click', function () {
        startBtn.disabled = true;
        startBtn.textContent = '⏳ Фіксую слоти...';

        fetch(START_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: currentEvent }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    started[String(currentEvent)] = true;
                    markStarted(currentEvent);
                    openEvent(currentEvent);
                } else {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Старт події';
                }
            })
            .catch(function () {
                startBtn.disabled = false;
                startBtn.textContent = 'Старт події';
            });
    });

    // ── Update snapshot (choice: old / new) ──
    updateSnapBtn.addEventListener('click', function () {
        body.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'snapshot-choice';

        const msg = document.createElement('div');
        msg.className = 'snapshot-choice-msg';
        msg.textContent = 'Який знімок використати\nдля розрахунку балів?';

        const btnOld = document.createElement('button');
        btnOld.className = 'snapshot-choice-btn snapshot-choice-btn--old';
        btnOld.textContent = '📋 Використати старий';

        const btnNew = document.createElement('button');
        btnNew.className = 'snapshot-choice-btn snapshot-choice-btn--new';
        btnNew.textContent = '🔄 Запам\'ятати поточні карти';

        btnOld.addEventListener('click', function () {
            buildRows(null, false);
        });

        btnNew.addEventListener('click', function () {
            btnNew.disabled = true;
            btnOld.disabled = true;
            fetch(UPDATE_SNAPSHOT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: currentEvent }),
            })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.ok) {
                        buildRows(null, false);
                    } else {
                        btnNew.disabled = false;
                        btnOld.disabled = false;
                    }
                })
                .catch(function () {
                    btnNew.disabled = false;
                    btnOld.disabled = false;
                });
        });

        wrap.appendChild(msg);
        wrap.appendChild(btnOld);
        wrap.appendChild(btnNew);
        body.appendChild(wrap);
    });

    // ── Cancel start ──
    cancelStartBtn.addEventListener('click', function () {
        cancelStartBtn.disabled = true;

        fetch(CANCEL_START_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: currentEvent }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    delete started[String(currentEvent)];
                    markUnstarted(currentEvent);
                    cancelStartBtn.textContent = 'Скасовано!';
                    setTimeout(closeEvent, 1000);
                } else {
                    cancelStartBtn.disabled = false;
                }
            })
            .catch(function () { cancelStartBtn.disabled = false; });
    });

    // ── Finish ──
    finBtn.addEventListener('click', function () {
        const winners = [];
        body.querySelectorAll('.card-row').forEach(function (row) {
            const cb = row.querySelector('.card-checkbox');
            if (!cb.checked) return;
            winners.push({
                slug:  cb.dataset.slug,
                count: parseInt(row.querySelector('.counter-val').textContent),
            });
        });

        if (winners.length === 0) {
            showToast('Оберіть хоча б одну картку, яка перемогла у цій події');
            return;
        }

        finBtn.disabled = true;

        fetch(FINISH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: currentEvent, winners: winners }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    completed[String(currentEvent)] = winners;
                    delete started[String(currentEvent)];
                    markCompleted(currentEvent);
                    finBtn.textContent = 'Нараховано!';
                    finBtn.classList.add('success');
                    setTimeout(closeEvent, 1500);
                } else {
                    finBtn.disabled = false;
                }
            })
            .catch(function () { finBtn.disabled = false; });
    });

    // ── Cancel completed ──
    cancelBtn.addEventListener('click', function () {
        cancelBtn.disabled = true;

        fetch(CANCEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: currentEvent }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    delete completed[String(currentEvent)];
                    markUncompleted(currentEvent);
                    cancelBtn.textContent = 'Скасовано!';
                    setTimeout(closeEvent, 1000);
                } else {
                    cancelBtn.disabled = false;
                }
            })
            .catch(function () { cancelBtn.disabled = false; });
    });
})();
