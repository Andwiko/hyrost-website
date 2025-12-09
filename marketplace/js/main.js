document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const navbarMenuWrapper = document.getElementById('navbarMenuWrapper');

    if (hamburger && navbarMenuWrapper) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navbarMenuWrapper.classList.toggle('active');
        });
    }
});