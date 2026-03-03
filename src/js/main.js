async function init() {
  await loadComponent('navbar-container', 'components/navbar.html');
  await loadComponent('intro-container', 'components/intro.html');

  
  await loadComponent('section-1-container', 'components/section1.html');
  await loadComponent('section-2-container', 'components/section2.html');
  await loadComponent('section-3-container', 'components/section3.html');

  
  await loadComponent('section-datasets-container', 'components/datasets.html');
  await loadComponent('section-about-container', 'components/about.html');

  
  router.init();

  
  const isHomePage = document.getElementById('page-home').style.display !== 'none';
  if (isHomePage) {
    document.querySelectorAll('.navbar a[href*="index.html#"]').forEach(link => {
      const href = link.getAttribute('href');
      const anchor = href.split('index.html')[1]; 
      link.setAttribute('href', anchor);
    });
  }

  
  if (document.getElementById('chart-1-1')) renderExampleChart("#chart-1-1");
  if (document.getElementById('chart-1-2')) renderExampleChart("#chart-1-2");
  if (document.getElementById('chart-2-1')) renderExampleChart("#chart-2-1");
  if (document.getElementById('chart-2-2')) renderExampleChart("#chart-2-2");
  if (document.getElementById('chart-3-1')) renderExampleChart("#chart-3-1");
  if (document.getElementById('chart-3-2')) renderExampleChart("#chart-3-2");

  if (typeof setupMobileNavAutoClose === 'function') {
    setupMobileNavAutoClose();
  }

  
  if (window.bootstrap && window.bootstrap.ScrollSpy) {
    new window.bootstrap.ScrollSpy(document.body, {
      target: '#mainNavbar'
    });
  }

  
  setupNavbarBlur();
}


function setupNavbarBlur() {
  const navbarElement = document.querySelector('header#navbar-container .navbar');
  if (!navbarElement) return;

  const updateNavbarState = () => {
    if (window.scrollY > 10) {
      navbarElement.classList.add('glass-navbar');
    } else {
      navbarElement.classList.remove('glass-navbar');
    }
  };

  window.addEventListener('scroll', updateNavbarState);
  updateNavbarState(); 
}

addEventListener('DOMContentLoaded', init);
