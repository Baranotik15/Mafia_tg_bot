document.addEventListener('contextmenu', e => e.preventDefault());

(function telegramAuth() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
        document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100vh;'
            + 'background:#111;color:#fff;font-family:sans-serif;text-align:center">'
            + '<div><p>Відкрийте застосунок через Telegram</p>'
            + '<a href="https://t.me/" style="color:#5b9bd5">Відкрити Telegram</a></div></div>';
        return;
    }
    const initData = tg.initData || '';
    const body = new URLSearchParams({ init_data: initData });
    if (tg.initDataUnsafe?.user) {
        body.set('unsafe_user', JSON.stringify(tg.initDataUnsafe.user));
    }
    fetch('/auth/', { method: 'POST', body })
        .then(r => r.json())
        .then(data => { if (data.ok && data.new_session) window.location.reload(); })
        .catch(() => {});
})();

(function scaleApp() {
    const app = document.querySelector('.app');
    if (!app) return;
    function apply() {
        const scale = Math.min(window.innerWidth / 390, window.innerHeight / 740, 1.0);
        app.style.transform = `scale(${scale})`;
        app.style.height = Math.round(window.innerHeight / scale) + 'px';
        app.style.opacity = '1';
    }
    apply();
    window.addEventListener('resize', () => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        apply();
    });
})();

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('touchstart', () => {
        btn.classList.add('hovered', 'pressing');
    }, { passive: true });
    btn.addEventListener('touchend', () => {
        btn.classList.remove('pressing');
        setTimeout(() => btn.classList.remove('hovered'), 250);
    });
    btn.addEventListener('touchcancel', () => {
        btn.classList.remove('hovered', 'pressing');
    });
});
