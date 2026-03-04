function initScrollytelling() {
    const scrollyContainer = document.getElementById('scrolly-unified');
    if (!scrollyContainer) return;

    document.body.classList.add('slide-mode');

    const scrollyStepsContainer = scrollyContainer.querySelector('.scrolly-steps');
    const steps = Array.from(scrollyContainer.querySelectorAll('.scrolly-step'));
    const stage = scrollyContainer.querySelector('.scrolly-stage');
    const allCharts = stage ? Array.from(stage.querySelectorAll('.chart-container')) : [];
    const mainSection = scrollyContainer.closest('.snap-section');

    let lastScrollY = 0;
    let lastActiveStep = null;
    let lastActiveChart = null;

    // Apply wide-mode on init based on the already-active step
    const initialActive = scrollyContainer.querySelector('.scrolly-step.is-active');
    if (initialActive && initialActive.classList.contains('scrolly-step-wide')) {
        scrollyContainer.classList.add('wide-mode');
    }

    /**
     * Glitch-proof chart switch:
     * 1. Instantly hide ALL charts (no transition)
     * 2. Position target off-screen in the entry direction (no transition)
     * 3. Re-enable transitions
     * 4. Animate target to center
     */
    function switchChart(chartId, scrollingDown) {
        const targetChart = stage.querySelector(`.chart-container[data-chart="${chartId}"]`);

        // Step 1: instantly reset every chart to hidden (no animation)
        allCharts.forEach(c => {
            c.classList.add('no-transition');
            c.classList.remove('is-active');
        });
        // Force browser to apply the no-transition state synchronously
        void stage.offsetHeight;

        if (!targetChart) return;

        // Step 2: position target off-screen (still no transition)
        targetChart.style.transform = scrollingDown ? 'translateY(100%)' : 'translateY(-100%)';
        targetChart.style.opacity = '0';
        // Force reflow so the off-screen position is painted
        void targetChart.offsetHeight;

        // Step 3: re-enable transitions on ALL charts
        allCharts.forEach(c => c.classList.remove('no-transition'));

        // Step 4: animate target into view
        targetChart.style.transform = '';
        targetChart.style.opacity = '';
        targetChart.classList.add('is-active');
    }

    function activateStep(step, scrollingDown) {
        if (step === lastActiveStep) return;

        // 1. Text activation
        steps.forEach(s => s.classList.remove('is-active'));
        step.classList.add('is-active');

        // 2. Wide-mode toggle
        if (step.classList.contains('scrolly-step-wide')) {
            scrollyContainer.classList.add('wide-mode');
        } else {
            scrollyContainer.classList.remove('wide-mode');
        }

        // 3. Chart activation — only when chart ID changes
        const chartId = step.getAttribute('data-chart');
        if (stage && chartId !== null && chartId !== lastActiveChart) {
            switchChart(chartId, scrollingDown);
            lastActiveChart = chartId;
        }

        // 4. Background activation
        const bgId = step.getAttribute('data-bg');
        if (mainSection && bgId) {
            mainSection.querySelectorAll('.scrolly-bg-layer').forEach(bg => bg.classList.remove('is-active'));
            let targetBg;
            if (bgId === '0') {
                targetBg = mainSection.querySelector('.scrolly-bg-layer.bg-intro');
            } else {
                targetBg = mainSection.querySelector(`.scrolly-bg-layer.bg-sec-${bgId}`);
            }
            if (targetBg) targetBg.classList.add('is-active');
        }

        // 5. Update navbar section title
        if (typeof updateSectionTitle === 'function') {
            updateSectionTitle();
        }

        lastActiveStep = step;
    }

    function getStepNearestCenter() {
        const containerRect = scrollyStepsContainer.getBoundingClientRect();
        const center = containerRect.top + containerRect.height / 2;
        let nearest = null;
        let nearestDist = Infinity;
        steps.forEach(step => {
            const rect = step.getBoundingClientRect();
            const stepCenter = rect.top + rect.height / 2;
            const dist = Math.abs(stepCenter - center);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = step;
            }
        });
        return nearest;
    }

    let ticking = false;
    scrollyStepsContainer.addEventListener('scroll', () => {
        const currentScrollY = scrollyStepsContainer.scrollTop;
        const scrollingDown = currentScrollY >= lastScrollY;
        lastScrollY = currentScrollY;

        if (!ticking) {
            requestAnimationFrame(() => {
                const nearest = getStepNearestCenter();
                if (nearest) activateStep(nearest, scrollingDown);
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initial activation — no animation for the first chart
    const initialNearest = getStepNearestCenter();
    if (initialNearest) {
        const chartId = initialNearest.getAttribute('data-chart');
        if (chartId) {
            const target = stage ? stage.querySelector(`.chart-container[data-chart="${chartId}"]`) : null;
            if (target) {
                allCharts.forEach(c => { c.classList.add('no-transition'); c.classList.remove('is-active'); });
                target.classList.add('is-active');
                void stage.offsetHeight;
                allCharts.forEach(c => c.classList.remove('no-transition'));
            }
            lastActiveChart = chartId;
        }
        activateStep(initialNearest, true);
    }
}

window.initScrollytelling = initScrollytelling;
