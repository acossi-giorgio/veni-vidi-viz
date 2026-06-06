/* ============================================================
   VENI VIDI VIZ — common.js
   Sorgente unica dei colori per tutti i grafici.
   Le sezioni del sito restano gestite dal CSS.
   ============================================================ */

const CHART_COLORS = {
  countries: [
    '#aeb6bf',
    '#b6bec6',
    '#bdc3c7',
    '#c5cbd0',
    '#ccd1d5',
    '#d3d8dc',
    '#dbe0e3',
    '#e2e6e9',
  ],
  continents: {
    Africa: '#E66100',
    Asia: '#7B4173',
    Europe: '#2CA02C',
    'North America': '#D95C62',
    'South America': '#E4B7C0',
    Oceania: '#1F77B4',
  },
  themes: {
    africa: '#E66100',
    europe: '#2CA02C',
    mpi: '#DE2D26',
    childMarriage: '#8B0000',
    fgm: '#5B1E53',
    incomeWork: '#DE2D26',
    gender: '#D81B60',
    migration: '#16A085',
    education: '#F39C12',
  },
  metrics: {
    income: ['#EEF3F8', '#D0DBE7', '#9FB3C8', '#627D98', '#2C3E50'],
    education: ['#FFF4DB', '#FDE3A7', '#F7C65F', '#F39C12', '#B9770E'],
    mpi: ['#FEE0D2', '#FDBBA1', '#FC9272', '#FB6A4A', '#DE2D26'],
    risk: ['#FEE0D2', '#FDBBA1', '#FC9272', '#FB6A4A', '#DE2D26'],
    fgm: ['#F2E5F0', '#D9B8D4', '#B97BB8', '#8E4A84', '#5B1E53'],
    migration: ['#E2F5F2', '#A9E0D7', '#5CC6B5', '#16A085', '#0E6655'],
  },
  ui: {
    controlActive: '#2C3E50',
    controlActiveStrong: '#1F2D3A',
    controlMuted: '#EEF2F5',
    controlMutedBorder: '#DDE2E7',
    controlMutedInk: '#22303C',
    chartWater: '#F2F5F7',
    chartBaseFill: '#EDF1F4',
    chartNoDataFill: '#DFE5EA',
    chartNoDataStripe: '#9AA5B1',
    chartGrid: '#E6EAEE',
    chartAxis: '#8A94A6',
    chartLabel: '#4B5563',
    chartPanel: 'rgba(255, 255, 255, 0.96)',
    chartTooltipBg: 'rgba(28, 25, 23, 0.94)',
    chartTooltipInk: '#ffffff',
    chartNeutralDot: '#BDC3C7',
    genderGirls: '#D81B60',
    genderBoys: '#1A85FF',
  },
  gradients: {
    fgmQuintiles: {
      poorest: '#5B1E53',
      second: '#8E4A84',
      middle: '#B97BB8',
      fourth: '#D9B8D4',
      richest: '#F2E5F0',
    },
  },
};

window.CHART_COLORS = CHART_COLORS;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function formatCoverageCount(covered, total, options = {}) {
  const {
    label = 'Copertura dati',
    unit = 'paesi',
    includePercent = true,
    precision = 0,
  } = options;
  const safeCovered = Number.isFinite(covered) ? covered : 0;
  const safeTotal = Number.isFinite(total) ? total : 0;
  const pct = safeTotal > 0 ? (safeCovered / safeTotal) * 100 : 0;
  const pctLabel = includePercent ? ` (${pct.toFixed(precision)}%)` : '';
  return `${escapeHtml(label)}: <strong>${safeCovered}/${safeTotal} ${escapeHtml(unit)}</strong>${pctLabel}`;
}

function formatCoverageBlock(lines = [], options = {}) {
  const {
    title = 'Copertura dati',
    titleTag = 'div',
    titleClass = 'tooltip-coverage__title',
    lineClass = 'tooltip-coverage__line',
  } = options;
  const safeLines = lines.filter(Boolean);
  if (!safeLines.length) return '';
  const body = safeLines.map(line => {
    if (typeof line === 'string') return `<div class="${lineClass}">${line}</div>`;
    const {
      label,
      covered,
      total,
      unit = 'paesi',
      includePercent = true,
      precision = 0,
    } = line;
    return `<div class="${lineClass}">${formatCoverageCount(covered, total, { label, unit, includePercent, precision })}</div>`;
  }).join('');
  return `<section class="tooltip-coverage"><${titleTag} class="${titleClass}">${escapeHtml(title)}</${titleTag}>${body}</section>`;
}

function mountChartWarningHint(host, message, options = {}) {
  if (!host || !message) return null;
  const anchorHost = host.closest?.('.chart-box, .fullscreen-chart-wrap') || host;
  const {
    top = 'var(--header-controls-center-y, 33px)',
    right = 'calc(var(--hint-right-3, 130px) + var(--hint-size, 34px) + var(--hint-gap, 6px))',
    zIndex = '25',
  } = options;

  const existing = anchorHost.querySelector('.chart-warning-hint-inline');
  if (existing) existing.remove();

  let tooltip = document.getElementById('chart-warning-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-warning-tooltip';
    Object.assign(tooltip.style, {
      position: 'fixed',
      display: 'none',
      pointerEvents: 'none',
      zIndex: '10030',
      maxWidth: '280px',
      padding: '8px 10px',
      borderRadius: '8px',
      background: 'rgba(28, 25, 23, 0.94)',
      color: '#fffdf8',
      fontSize: '11px',
      lineHeight: '1.55',
      boxShadow: '0 10px 28px rgba(16,18,34,0.35)',
      whiteSpace: 'normal',
    });
    document.body.appendChild(tooltip);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chart-warning-hint-inline';
  btn.setAttribute('aria-label', 'Attenzione: dati da ultimo anno disponibile');
  btn.innerHTML = '<span aria-hidden="true">!</span>';
  Object.assign(btn.style, {
    position: 'absolute',
    top,
    right,
    zIndex,
    width: 'var(--hint-size, 34px)',
    height: 'var(--hint-size, 34px)',
    borderRadius: '999px',
    border: '1px solid rgba(191, 94, 24, 0.35)',
    background: 'rgba(255, 248, 240, 0.96)',
    color: '#bf5e18',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translateY(-50%)',
    cursor: 'help',
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: '1',
    boxShadow: '0 1px 6px rgba(0,0,0,0.10)',
  });

  const safeHtml = escapeHtml(message).replace(/\n/g, '<br>');
  const show = () => {
    tooltip.innerHTML = `<strong>Attenzione</strong><br>${safeHtml}`;
    tooltip.style.display = 'block';
    const rect = btn.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    let x = rect.left - box.width - 10;
    let y = rect.top + (rect.height - box.height) / 2;
    if (x < 8) x = rect.right + 10;
    if (x + box.width > window.innerWidth - 8) x = Math.max(8, window.innerWidth - box.width - 8);
    if (y < 8) y = 8;
    if (y + box.height > window.innerHeight - 8) y = Math.max(8, window.innerHeight - box.height - 8);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };
  const hide = () => { tooltip.style.display = 'none'; };

  btn.addEventListener('mouseenter', show);
  btn.addEventListener('focus', show);
  btn.addEventListener('mouseleave', hide);
  btn.addEventListener('blur', hide);

  anchorHost.appendChild(btn);
  return btn;
}

window.escapeHtml = escapeHtml;
window.formatCoverageCount = formatCoverageCount;
window.formatCoverageBlock = formatCoverageBlock;
window.mountChartWarningHint = mountChartWarningHint;
