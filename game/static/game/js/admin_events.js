(function () {
    const detail  = document.getElementById('eventDetail');
    const title   = document.getElementById('eventDetailTitle');
    const body    = document.getElementById('eventDetailBody');
    const backBtn = document.getElementById('eventDetailBack');
    const finBtn  = document.getElementById('finishEventBtn');

    let currentEvent = null;

    function openEvent(num) {
        currentEvent = num;
        title.textContent = 'Подія ' + num;
        body.innerHTML = '';

        CARDS.forEach(function (card) {
            const row = document.createElement('div');
            row.className = 'card-row';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'card-checkbox';
            cb.dataset.slug = card.slug;

            const nameEl = document.createElement('div');
            nameEl.className = 'card-row-name';
            nameEl.textContent = card.name || card.slug;

            const scoreEl = document.createElement('div');
            scoreEl.className = 'card-row-score';
            scoreEl.textContent = '+' + card.score + ' балів';

            const counter = document.createElement('div');
            counter.className = 'counter';

            const minus = document.createElement('button');
            minus.className = 'counter-btn';
            minus.textContent = '−';
            minus.disabled = card.fixed_count;

            const valEl = document.createElement('span');
            valEl.className = 'counter-val';
            valEl.textContent = '1';

            const plus = document.createElement('button');
            plus.className = 'counter-btn';
            plus.textContent = '+';
            plus.disabled = card.fixed_count;

            if (!card.fixed_count) {
                minus.addEventListener('click', function () {
                    const v = parseInt(valEl.textContent);
                    if (v > 1) valEl.textContent = v - 1;
                });
                plus.addEventListener('click', function () {
                    const v = parseInt(valEl.textContent);
                    valEl.textContent = v + 1;
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

        finBtn.textContent = 'Закінчити подію';
        finBtn.disabled = false;
        finBtn.classList.remove('success');
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
            const slug  = cb.dataset.slug;
            const count = parseInt(row.querySelector('.counter-val').textContent);
            winners.push({ slug: slug, count: count });
        });

        if (winners.length === 0) return;

        finBtn.disabled = true;

        fetch(FINISH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: currentEvent, winners: winners }),
        })
            .then(function (r) { return r.json(); })
            .then(function () {
                finBtn.textContent = 'Нараховано!';
                finBtn.classList.add('success');
                setTimeout(closeEvent, 1500);
            })
            .catch(function () {
                finBtn.disabled = false;
            });
    });
})();
