async function init() {
  // Carica il componente scrollytelling
  await loadComponent('scrolly-main-container', 'components/scrolly-main.html');

  // Inizializza i grafici D3.js
  if (document.getElementById('chart-1-1')) renderGdpLineChart("#chart-1-1");
  if (document.getElementById('chart-1-2')) renderExampleChart("#chart-1-2");
  if (document.getElementById('chart-2-1')) renderExampleChart("#chart-2-1");

  // Avvia lo scrollytelling
  if (typeof initScrollytelling === 'function') {
    initScrollytelling();
  }

  // Aggiorna il titolo della sezione nella navbar
  updateSectionTitle();
  window.addEventListener('scroll', updateSectionTitle);
}

function updateSectionTitle() {
  const activeStep = document.querySelector('.scrolly-step.is-active');
  const titleNav = document.getElementById('sectionTitleNav');
  
  if (activeStep) {
    const title = activeStep.querySelector('h2') || activeStep.querySelector('h3');
    if (title) {
      titleNav.textContent = title.textContent;
    }
  } else {
    titleNav.textContent = '';
  }
}

addEventListener('DOMContentLoaded', init);
