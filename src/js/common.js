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
    includePercent = false,
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

function getTooltipContinentColor(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'africa') return CHART_COLORS.continents.Africa;
  if (text === 'europe' || text === 'europa') return CHART_COLORS.continents.Europe;
  return null;
}

function accentTooltipContinents(text) {
  const safe = escapeHtml(text);
  const africa = getTooltipContinentColor('Africa');
  const europe = getTooltipContinentColor('Europe');
  if (!safe) return safe;
  return safe
    .replace(/\bAfrica\b/g, `<span style="color:${africa}">Africa</span>`)
    .replace(/\bEurope\b/g, `<span style="color:${europe}">Europe</span>`)
    .replace(/\bEuropa\b/g, `<span style="color:${europe}">Europa</span>`);
}

function ensureHoverTooltip(id = 'chart-hover-tooltip', options = {}) {
  const {
    className = 'chart-hover-tooltip',
    maxWidth = null,
  } = options;
  let tooltip = document.getElementById(id);
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = id;
    document.body.appendChild(tooltip);
  }
  tooltip.className = className;
  tooltip.style.display = 'none';
  tooltip.style.pointerEvents = 'none';
  if (maxWidth) tooltip.style.setProperty('--tooltip-max-width', maxWidth);
  else tooltip.style.removeProperty('--tooltip-max-width');
  return tooltip;
}

function buildHoverTooltipHtml(config = {}) {
  const {
    title = '',
    titleHtml = '',
    titleColor = '',
    meta = '',
    rows = [],
    sections = [],
    footer = '',
  } = config;

  const titleStyle = titleColor ? ` style="color:${escapeHtml(titleColor)}"` : '';
  const resolvedTitleColor = titleColor || getTooltipContinentColor(title);
  const titleAccentStyle = resolvedTitleColor ? ` style="color:${escapeHtml(resolvedTitleColor)}"` : '';
  const safeRows = rows.filter(Boolean).map((row) => {
    if (typeof row === 'string') {
      return `<div class="chart-hover-tooltip__row chart-hover-tooltip__row--text">${accentTooltipContinents(row)}</div>`;
    }
    if (row.html) {
      return `<div class="chart-hover-tooltip__row chart-hover-tooltip__row--text">${row.html}</div>`;
    }
    const label = accentTooltipContinents(row.label || '');
    const value = row.valueHtml != null
      ? row.valueHtml
      : accentTooltipContinents(row.value ?? 'N/D');
    return (
      `<div class="chart-hover-tooltip__row">` +
      `<span class="chart-hover-tooltip__label">${label}</span>` +
      `<strong class="chart-hover-tooltip__value">${value}</strong>` +
      `</div>`
    );
  }).join('');

  const safeSections = sections.filter(Boolean).map((section) => {
    const sectionRows = (section.rows || []).map((row) => {
      if (typeof row === 'string') {
        return `<div class="chart-hover-tooltip__row chart-hover-tooltip__row--text">${accentTooltipContinents(row)}</div>`;
      }
      if (row.html) {
        return `<div class="chart-hover-tooltip__row chart-hover-tooltip__row--text">${row.html}</div>`;
      }
      return (
        `<div class="chart-hover-tooltip__row">` +
        `<span class="chart-hover-tooltip__label">${accentTooltipContinents(row.label || '')}</span>` +
        `<strong class="chart-hover-tooltip__value">${row.valueHtml != null ? row.valueHtml : accentTooltipContinents(row.value ?? 'N/D')}</strong>` +
        `</div>`
      );
    }).join('');
    return (
      `<section class="chart-hover-tooltip__section">` +
      `${section.title ? `<div class="chart-hover-tooltip__section-title">${accentTooltipContinents(section.title)}</div>` : ''}` +
      `${sectionRows}` +
      `</section>`
    );
  }).join('');

  return (
    `<div class="chart-hover-tooltip__panel">` +
    `${titleHtml ? `<div class="chart-hover-tooltip__title"${titleStyle || titleAccentStyle}>${titleHtml}</div>` : (title ? `<div class="chart-hover-tooltip__title"${titleStyle || titleAccentStyle}>${accentTooltipContinents(title)}</div>` : '')}` +
    `${meta ? `<div class="chart-hover-tooltip__meta">${escapeHtml(meta)}</div>` : ''}` +
    `${safeRows ? `<div class="chart-hover-tooltip__body">${safeRows}</div>` : ''}` +
    `${safeSections}` +
    `${footer ? `<div class="chart-hover-tooltip__footer">${footer}</div>` : ''}` +
    `</div>`
  );
}

function positionHoverTooltip(tooltip, event, options = {}) {
  if (!tooltip || !event) return;
  const {
    offsetX = 14,
    offsetY = -28,
    margin = 8,
  } = options;
  const clientX = Number.isFinite(event.clientX) ? event.clientX : 0;
  const clientY = Number.isFinite(event.clientY) ? event.clientY : 0;
  const box = tooltip.getBoundingClientRect();
  let x = clientX + offsetX;
  let y = clientY + offsetY;
  if (x + box.width > window.innerWidth - margin) x = clientX - box.width - Math.abs(offsetX);
  if (y + box.height > window.innerHeight - margin) y = clientY - box.height - Math.abs(offsetY);
  if (y < margin) y = clientY + Math.abs(offsetX);
  if (x < margin) x = margin;
  if (x + box.width > window.innerWidth - margin) x = Math.max(margin, window.innerWidth - box.width - margin);
  if (y + box.height > window.innerHeight - margin) y = Math.max(margin, window.innerHeight - box.height - margin);
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function showHoverTooltip(tooltip, event, content, options = {}) {
  if (!tooltip) return;
  tooltip.innerHTML = typeof content === 'string' ? content : buildHoverTooltipHtml(content);
  tooltip.style.display = 'block';
  positionHoverTooltip(tooltip, event, options);
}

function hideHoverTooltip(tooltip) {
  if (!tooltip) return;
  tooltip.style.display = 'none';
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
      padding: '0.82rem 0.95rem 0.88rem',
      borderRadius: '14px',
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 252, 0.96))',
      color: '#1f2937',
      fontSize: '11px',
      lineHeight: '1.55',
      boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
      border: '1px solid rgba(148, 163, 184, 0.28)',
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
    tooltip.innerHTML = `<strong style="display:block;margin-bottom:0.2rem;color:#0f172a">Attenzione</strong>${safeHtml}`;
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
window.ensureHoverTooltip = ensureHoverTooltip;
window.buildHoverTooltipHtml = buildHoverTooltipHtml;
window.positionHoverTooltip = positionHoverTooltip;
window.showHoverTooltip = showHoverTooltip;
window.hideHoverTooltip = hideHoverTooltip;
window.mountChartWarningHint = mountChartWarningHint;
