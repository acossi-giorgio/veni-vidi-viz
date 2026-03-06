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
    if (document.getElementById('chart-1-2')) await renderGdpMapChart("#chart-1-2", 2023);
    if (document.getElementById('chart-1-2')) await renderGdpMapChart("#chart-1-2");

    // Year slider control for GDP map chart
    const yearSelector = document.getElementById('year-selector');
    const yearValue = document.getElementById('year-value');
    const chartControls = document.querySelector('.chart-controls');
    
    if (yearSelector && yearValue) {
      // Year slider live input
      yearSelector.addEventListener('input', (e) => {
        const selectedYear = parseInt(e.target.value);
        if (yearValue) yearValue.textContent = selectedYear;
        updateGdpMapChart("#chart-1-2", selectedYear);
      });
    }

    // Add play/stop button for animation
    if (yearSelector && chartControls) {
      const playBtn = document.createElement('button');
      playBtn.id = 'gdp-play-btn';
      playBtn.innerHTML = '<i class="bi bi-play-fill"></i> Play';
      playBtn.style.cssText =
        'padding:0.5rem 1rem;background:#007bff;color:#fff;border:none;border-radius:4px;' +
        'cursor:pointer;font-family:"Roboto Slab",serif;font-size:0.9rem;' +
        'margin-left:1rem;transition:background 0.2s;';
      playBtn.onmouseover = () => playBtn.style.background = '#0056b3';
      playBtn.onmouseout = () => playBtn.style.background = '#007bff';

      chartControls.appendChild(playBtn);

      // Play/stop functionality with constant speed
      let isPlaying = false;
      const animationSpeed = 1000; // 1 second per year

      playBtn.addEventListener('click', () => {
        const container = document.querySelector('#chart-1-2');
        if (!isPlaying) {
          isPlaying = true;
          playBtn.innerHTML = '<i class="bi bi-stop-fill"></i> Stop';
          playBtn.style.background = '#dc3545';
          playBtn.onmouseover = () => playBtn.style.background = '#c82333';
          playBtn.onmouseout = () => playBtn.style.background = '#dc3545';
          if (container && container._gdpStartAnimation) {
            container._gdpStartAnimation(animationSpeed);
          }
        } else {
          isPlaying = false;
          playBtn.innerHTML = '<i class="bi bi-play-fill"></i> Play';
          playBtn.style.background = '#007bff';
          playBtn.onmouseover = () => playBtn.style.background = '#0056b3';
          playBtn.onmouseout = () => playBtn.style.background = '#007bff';
          if (container && container._gdpClearAnimation) {
            container._gdpClearAnimation();
          }
        }
      });
    }

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

            // Auto-start/stop animation based on active step
            const chartContainer = document.querySelector('#chart-1-2');
            if (chartContainer) {
              // Start animation only when arriving at first step of card (4 or 7)
              if ((stepNum === '4' || stepNum === '7') && chartContainer._gdpStartAnimation) {
                // Clear and start animation when user arrives at map chart first step
                if (chartContainer._gdpClearAnimation) {
                  chartContainer._gdpClearAnimation();
                }
                chartContainer._gdpStartAnimation(1000);
              } else if (!(stepNum === '4' || stepNum === '5' || stepNum === '6' || stepNum === '7') && chartContainer._gdpClearAnimation) {
                // Stop animation when user leaves the entire map section
                chartContainer._gdpClearAnimation();
              }

              // Trigger auto-zoom based on active step
              if (stepNum === '4' && chartContainer._gdpZoomToEurope) {
                // Step 4: first step of second card (PARTE 2) - zoom to Europe
                chartContainer._gdpZoomToEurope();
              } else if (stepNum === '7' && chartContainer._gdpZoomToAfrica) {
                // Step 7: first step of third card (PARTE 3) - zoom to Africa
                chartContainer._gdpZoomToAfrica();
              }
            }

            // Highlight continents in GDP chart based on active step
            const chartContainer1 = document.querySelector('#chart-1-1');
            if (chartContainer1) {
              if (stepNum === '2' && chartContainer1._gdpHighlightContinents) {
                // Step 2: "Consectetur Adipiscing Elit Sed" - highlight Africa & Europe
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

    /* ── Scroll handler (throttled via rAF) ───────────────── */
    let ticking = false;
    scrollContainer.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveStep();
                updateBackground();
                updateFooter();
                ticking = false;
            });
            ticking = true;
        }
    });

    /* ── Initial state ────────────────────────────────────── */
    updateActiveStep();
    updateBackground();
    updateFooter();
}

addEventListener('DOMContentLoaded', init);
