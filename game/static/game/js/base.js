document.addEventListener('contextmenu', e => e.preventDefault());

(function scaleApp() {
    const app = document.querySelector('.app');
    if (!app) return;
    function apply() {
        const scale = Math.min(window.innerWidth / 390, window.innerHeight / 844);
        app.style.transform = `scale(${scale})`;
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
