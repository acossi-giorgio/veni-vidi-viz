/* ────────────────────────────────────────────────────────────
   UTILITIES
   ──────────────────────────────────────────────────────────── */

/* Data Loading */
async function loadData(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.error(`Failed to load ${path}:`, response.statusText);
      return [];
    }

    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error(`Error loading data from ${path}:`, error);
    return [];
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(',').map(v => v.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = isNaN(values[index]) ? values[index] : Number(values[index]);
    });

    data.push(row);
  }

  return data;
}

/* DOM Manipulation */
function createElement(tag, classes = '', attributes = {}) {
  const el = document.createElement(tag);
  if (classes) {
    el.className = classes;
  }
  Object.entries(attributes).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

function select(selector) {
  return document.querySelector(selector);
}

function selectAll(selector) {
  return document.querySelectorAll(selector);
}

function hasClass(el, className) {
  return el.classList.contains(className);
}

function addClass(el, className) {
  el.classList.add(className);
}

function removeClass(el, className) {
  el.classList.remove(className);
}

function toggleClass(el, className) {
  el.classList.toggle(className);
}

function setStyle(el, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    el.style[key] = value;
  });
}

function on(el, event, handler) {
  el.addEventListener(event, handler);
}

function off(el, event, handler) {
  el.removeEventListener(event, handler);
}

/* Common Utilities */
function debounce(func, delay) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function throttled(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatNumber(num, decimals = 0) {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatCurrency(num, currency = 'USD') {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(num);
}

function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

function setQueryParam(param, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(param, value);
  window.history.replaceState({}, '', `?${params.toString()}`);
}

/* ────────────────────────────────────────────────────────────
   MAIN APPLICATION
   ──────────────────────────────────────────────────────────── */

async function init() {
  // Il contenuto scrollytelling è già in index.html
  const scrollyContainer = document.getElementById('scrolly-main-container');
  if (scrollyContainer) {
    // Inizializza i grafici D3.js
    if (document.getElementById('chart-1-1')) renderGdpLineChart("#chart-1-1");
    if (document.getElementById('chart-1-2')) await renderGdpMapChart("#chart-1-2");
    if (document.getElementById('chart-2-1')) renderDumbbellChart("#chart-2-1");

    // Avvia lo scrollytelling
    if (typeof setupScrollytelling === 'function') {
      setupScrollytelling();
    }

    // Aggiorna il titolo della sezione nella navbar
    updateSectionTitle();
    window.addEventListener('scroll', updateSectionTitle);
  }

  // Gestisci la visibilità del footer (su tutte le pagine)
  handleFooterVisibility();
}

function handleFooterVisibility() {
  const footer = document.getElementById('scrolly-footer');
  if (!footer) return;

  function updateFooter() {
    // Se siamo sulla pagina scrollytelling (body.slide-mode), la visibilità
    // è gestita da setupScrollytelling. Altrimenti, usa scroll globale.
    if (document.body.classList.contains('slide-mode')) return;

    const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
    footer.classList.toggle('is-visible', atBottom);
  }

  window.addEventListener('scroll', updateFooter, { passive: true });
  updateFooter(); // Controllo iniziale
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

/* ── Scrollytelling Setup ───────────────────────────────────── */
function setupScrollytelling() {
    const scrollContainer = document.getElementById('scrolly-unified');
    if (!scrollContainer) return;

    document.body.classList.add('slide-mode');

    const mainSection = scrollContainer.closest('.section');
    const sections = Array.from(scrollContainer.querySelectorAll('.scrolly-section'));
    const steps = Array.from(scrollContainer.querySelectorAll('.scrolly-step'));
    const stages = Array.from(scrollContainer.querySelectorAll('.scrolly-section-stage'));

    let lastActiveStep = null;
    let lastActiveBg = null;
    let lastZoomStep = null;

    /* ── Background switching ─────────────────────────────────
       Find the section whose vertical centre is closest to the
       viewport centre and activate its background layer.        */
    function updateBackground() {
        const h = scrollContainer.clientHeight;
        const center = h / 2;
        let best = null;
        let bestDist = Infinity;

        sections.forEach(sec => {
            const r = sec.getBoundingClientRect();
            const scrollR = scrollContainer.getBoundingClientRect();
            const secCenter = r.top - scrollR.top + r.height / 2;
            const dist = Math.abs(secCenter - center);
            if (dist < bestDist) { bestDist = dist; best = sec; }
        });

        if (best && mainSection) {
            const bgId = best.getAttribute('data-bg');
            if (bgId && bgId !== lastActiveBg) {
                mainSection.querySelectorAll('.scrolly-bg-layer')
                    .forEach(bg => bg.classList.remove('is-active'));

                const target = bgId === '0'
                    ? mainSection.querySelector('.scrolly-bg-layer.bg-intro')
                    : mainSection.querySelector(`.scrolly-bg-layer.bg-sec-${bgId}`);
                if (target) target.classList.add('is-active');
                lastActiveBg = bgId;
            }
        }
    }

    /* ── Step activation ──────────────────────────────────────
       The step card nearest the vertical centre of the scroll
       container gets the .is-active class (full opacity).       */
    function updateActiveStep() {
        const h = scrollContainer.clientHeight;
        const center = h / 2;
        let nearest = null;
        let nearestDist = Infinity;

        steps.forEach(step => {
            const r = step.getBoundingClientRect();
            const scrollR = scrollContainer.getBoundingClientRect();
            const stepCenter = r.top - scrollR.top + r.height / 2;
            const dist = Math.abs(stepCenter - center);
            if (dist < nearestDist) { nearestDist = dist; nearest = step; }
        });

        if (nearest && nearest !== lastActiveStep) {
            steps.forEach(s => s.classList.remove('is-active'));
            nearest.classList.add('is-active');
            lastActiveStep = nearest;

            if (typeof updateSectionTitle === 'function') {
                updateSectionTitle();
            }

            const stepNum = nearest.getAttribute('data-step');
            const stepNumInt = parseInt(stepNum);

            // Auto-start/stop animation based on active step
            const chartContainer = document.querySelector('#chart-1-2');
            if (chartContainer) {
              // Start animation only when arriving at first step of card (5 or 6)
              if ((stepNum === '5') && chartContainer._gdpStartAnimation) {
                // Clear and start animation when user arrives at map chart first step
                if (chartContainer._gdpClearAnimation) {
                  chartContainer._gdpClearAnimation();
                }
                chartContainer._gdpStartAnimation(1000);
              } else if (!(stepNum === '5' || stepNum === '6') && chartContainer._gdpClearAnimation) {
                // Stop animation when user leaves the entire map section
                chartContainer._gdpClearAnimation();
              }

              // Trigger auto-zoom based on active step with scroll direction
              const isMovingForward = lastZoomStep === null || stepNumInt > parseInt(lastZoomStep);
              
              if (stepNum === '5' && chartContainer._gdpZoomToEurope && isMovingForward) {
                // Step 5: zoom to Europe
                chartContainer._gdpZoomToEurope();
                lastZoomStep = stepNum;
              } else if (stepNum === '6' && chartContainer._gdpZoomToAfrica && isMovingForward) {
                // Step 6: zoom to Africa
                chartContainer._gdpZoomToAfrica();
                lastZoomStep = stepNum;
              } else if (!isMovingForward && stepNumInt < 5 && chartContainer._gdpZoomToWorld) {
                // Going back before step 5 - reset to world view
                chartContainer._gdpZoomToWorld();
                lastZoomStep = null;
              } else if (stepNum === '5' && !isMovingForward && parseInt(lastZoomStep) === 6 && chartContainer._gdpZoomToEurope) {
                // Going back from 6 (Africa) to 5 (Europe) - keep Europe view
                chartContainer._gdpZoomToEurope();
                lastZoomStep = stepNum;
              }
            }

            // Highlight continents in GDP chart based on active step
            const chartContainer1 = document.querySelector('#chart-1-1');
            if (chartContainer1) {
              if (stepNum === '3' && chartContainer1._gdpHighlightContinents) {
                // Step 3: "Consectetur Adipiscing Elit Sed" - highlight Africa & Europe
                chartContainer1._gdpHighlightContinents(["Africa", "Europe"]);
              } else if ((stepNum === '1' || stepNum === '0') && chartContainer1._gdpHighlightContinents) {
                // Reset to show all continents
                chartContainer1._gdpHighlightContinents(null);
              }
            }
        }
    }

    /* ── Chart stage visibility ───────────────────────────────
       IntersectionObserver adds .is-visible to each stage when
       its parent split-section scrolls into view, triggering
       the CSS slide-up / fade-in transition on the chart box.  */
    const stageObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
    }, {
        root: scrollContainer,
        threshold: 0.15
    });

    stages.forEach(stage => stageObserver.observe(stage));

    /* ── Footer show/hide on scroll bottom ────────────────── */
    const footer = document.getElementById('scrolly-footer');
    function updateFooter() {
        if (!footer) return;
        const atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight
            >= scrollContainer.scrollHeight - 40;
        footer.classList.toggle('is-visible', atBottom);
    }

    /* ── Scroll handler (real-time, no throttling for sticky feel) ──── */
    scrollContainer.addEventListener('scroll', () => {
        updateActiveStep();
        updateBackground();
        updateFooter();
    }, { passive: true });

    /* ── Initial state ────────────────────────────────────── */
    updateActiveStep();
    updateBackground();
    updateFooter();
}

addEventListener('DOMContentLoaded', init);
