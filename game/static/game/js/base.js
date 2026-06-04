document.addEventListener('contextmenu', e => e.preventDefault());

(function telegramAuth() {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) return;
    const body = new URLSearchParams({ init_data: tg.initData });
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
    window.addEventListener('resize', apply);
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
