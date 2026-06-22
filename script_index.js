// Lógica menú hamburguesa
function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    menu.classList.toggle("hidden");
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById("userMenu");
    const btn = document.querySelector('button[onclick="toggleUserMenu()"]');
    if (menu && btn) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    }
});

// Lógica del carrusel mejorada para infinito y automático
function slideCarousel(direction) {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;

    const scrollAmount = carousel.clientWidth;
    const maxScroll = carousel.scrollWidth - scrollAmount;
    
    // Si estamos al final y vamos hacia adelante, vuelve al inicio
    if (carousel.scrollLeft >= maxScroll && direction === 1) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
        carousel.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
    }
}

// CARRUSEL AUTOMÁTICO (Cada 3.5 segundos)
setInterval(() => {
    slideCarousel(1);
}, 3500);