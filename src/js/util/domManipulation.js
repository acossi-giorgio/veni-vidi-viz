async function loadComponent(id, componentPath) {
  const fetchUrl = `${componentPath}?t=${new Date().getTime()}`;
  const container = document.getElementById(id);

  container.style.opacity = '0';
  container.style.transition = 'opacity 0.3s ease-in-out';

  const html = await fetch(fetchUrl).then(r => r.text());
  container.innerHTML = html;

  setTimeout(() => {
    container.style.opacity = '1';
  }, 50);
}

function renderChart(id, renderFunction, datasets) {
  const container = document.getElementById(id);
  renderFunction(container, datasets);
}