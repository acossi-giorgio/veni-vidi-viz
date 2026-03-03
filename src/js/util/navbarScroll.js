async function setupNavbarBlur() {
  let attempts = 0;
  const checkNavbar = setInterval(() => {
    const navbarElement = document.querySelector('header#navbar-container .navbar');
    if (navbarElement) {
      clearInterval(checkNavbar);

      window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
          navbarElement.classList.add('glass-navbar');
        } else {
          navbarElement.classList.remove('glass-navbar');
        }
      });
    }
    attempts++;
    if (attempts > 50) clearInterval(checkNavbar);
  }, 10);
}

document.addEventListener("DOMContentLoaded", setupNavbarBlur);
