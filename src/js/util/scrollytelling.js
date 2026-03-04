function initScrollytelling() {
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

    /* ── Scroll handler (throttled via rAF) ───────────────── */
    let ticking = false;
    scrollContainer.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveStep();
                updateBackground();
                ticking = false;
            });
            ticking = true;
        }
    });

    /* ── Initial state ────────────────────────────────────── */
    updateActiveStep();
    updateBackground();
}

window.initScrollytelling = initScrollytelling;
