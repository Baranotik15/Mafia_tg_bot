(function () {
    const detail    = document.getElementById('eventDetail');
    const title     = document.getElementById('eventDetailTitle');
    const body      = document.getElementById('eventDetailBody');
    const backBtn   = document.getElementById('eventDetailBack');
    const finBtn    = document.getElementById('finishEventBtn');
    const cancelBtn = document.getElementById('cancelEventBtn');

    let currentEvent = null;
    const completed  = Object.assign({}, COMPLETED);

    function isCompleted(num) {
        return Object.prototype.hasOwnProperty.call(completed, num);
    }

    function getGridCard(num) {
        return document.querySelector('.event-card[data-event="' + num + '"]');
    }

    function markCompleted(num) {
        const el = getGridCard(num);
        if (el) el.classList.add('completed');
    }

    function markUncompleted(num) {
        const el = getGridCard(num);
        if (el) el.classList.remove('completed');
    }

    Object.keys(completed).forEach(function (num) {
        markCompleted(parseInt(num));
    });

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
            row.appendChild(scoreEl);
            row.appendChild(counter);
            body.appendChild(row);
        });
    }

    function openEvent(num) {
        currentEvent = num;
        title.textContent = 'Подія ' + num;

        if (isCompleted(num)) {
            buildRows(completed[num], true);
            finBtn.style.display = 'none';
            cancelBtn.style.display = 'block';
            cancelBtn.textContent = 'Скасувати розрахунок';
            cancelBtn.disabled = false;
        } else {
            buildRows(null, false);
            finBtn.style.display = 'block';
            finBtn.textContent = 'Закінчити подію';
            finBtn.disabled = false;
            finBtn.classList.remove('success');
            cancelBtn.style.display = 'none';
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

        if (winners.length === 0) return;

        finBtn.disabled = true;

        fetch(FINISH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: currentEvent, winners: winners }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    completed[currentEvent] = winners;
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
                    delete completed[currentEvent];
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
