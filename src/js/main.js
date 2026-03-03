async function init() {
  // Carica l'unico componente rimasto
  await loadComponent('scrolly-main-container', 'components/scrolly-main.html');

  // Inizializza i grafici D3.js se presenti
  if (document.getElementById('chart-1-1')) renderExampleChart("#chart-1-1");
  if (document.getElementById('chart-1-2')) renderExampleChart("#chart-1-2");
  if (document.getElementById('chart-2-1')) renderExampleChart("#chart-2-1");
  if (document.getElementById('chart-2-2')) renderExampleChart("#chart-2-2");
  if (document.getElementById('chart-3-1')) renderExampleChart("#chart-3-1");
  if (document.getElementById('chart-3-2')) renderExampleChart("#chart-3-2");

  // Avvia lo scrollytelling
  if (typeof initScrollytelling === 'function') {
    initScrollytelling();
  }
}

addEventListener('DOMContentLoaded', init);
