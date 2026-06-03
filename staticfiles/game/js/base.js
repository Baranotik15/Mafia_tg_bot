document.addEventListener('contextmenu', e => e.preventDefault());

if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('portrait').catch(() => {});
}
if (window.Telegram && Telegram.WebApp && Telegram.WebApp.lockOrientation) {
    Telegram.WebApp.lockOrientation();
}

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
