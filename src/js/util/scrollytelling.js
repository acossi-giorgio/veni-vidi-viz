function initScrollytelling() {
    const scrollyContainer = document.getElementById('scrolly-unified');
    if (!scrollyContainer) return;

    document.body.classList.add('slide-mode');

    const scrollyStepsContainer = scrollyContainer.querySelector('.scrolly-steps');
    const steps = Array.from(scrollyContainer.querySelectorAll('.scrolly-step'));
    const stage = scrollyContainer.querySelector('.scrolly-stage');
    const mainSection = scrollyContainer.closest('.snap-section');

    let lastScrollY = 0;
    let lastActiveStep = null;

    // Apply wide-mode on init based on the already-active step
    const initialActive = scrollyContainer.querySelector('.scrolly-step.is-active');
    if (initialActive && initialActive.classList.contains('scrolly-step-wide')) {
        scrollyContainer.classList.add('wide-mode');
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

        // 3. Chart activation with directional slide
        const chartId = step.getAttribute('data-step');
        if (stage && chartId !== null) {
            const currentActiveChart = stage.querySelector('.chart-container.is-active');
            const targetChart = stage.querySelector(`.chart-container[data-chart="${chartId}"]`);

            if (currentActiveChart && currentActiveChart !== targetChart) {
                const outClass = scrollingDown ? 'slide-exit-up' : 'slide-exit-down';
                currentActiveChart.classList.add(outClass);
                currentActiveChart.addEventListener('transitionend', () => {
                    currentActiveChart.classList.remove('is-active', 'slide-exit-up', 'slide-exit-down');
                }, { once: true });
            }

            if (targetChart && targetChart !== currentActiveChart) {
                const inClass = scrollingDown ? 'slide-enter-down' : 'slide-enter-up';
                targetChart.classList.add(inClass);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        targetChart.classList.remove('slide-enter-down', 'slide-enter-up');
                        targetChart.classList.add('is-active');
                    });
                });
            } else if (!targetChart && currentActiveChart) {
                const outClass = scrollingDown ? 'slide-exit-up' : 'slide-exit-down';
                currentActiveChart.classList.add(outClass);
                currentActiveChart.addEventListener('transitionend', () => {
                    currentActiveChart.classList.remove('is-active', 'slide-exit-up', 'slide-exit-down');
                }, { once: true });
            }
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

    // Initial activation using nearest-to-center
    const initialNearest = getStepNearestCenter();
    if (initialNearest) activateStep(initialNearest, true);
}

window.initScrollytelling = initScrollytelling;


    let lastScrollY = 0;
    let lastActiveStep = null;

    // Apply wide-mode on init based on the already-active step
    const initialActive = scrollyContainer.querySelector('.scrolly-step.is-active');
    if (initialActive && initialActive.classList.contains('scrolly-step-wide')) {
        scrollyContainer.classList.add('wide-mode');
    }

    scrollyStepsContainer.addEventListener('scroll', () => {
        lastScrollY = scrollyStepsContainer.scrollTop;
    });

    const observerOptions = {
        root: scrollyStepsContainer,
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const step = entry.target;
            if (step === lastActiveStep) return;

            // Determine scroll direction for chart slide direction
            const currentScrollY = scrollyStepsContainer.scrollTop;
            const scrollingDown = currentScrollY >= lastScrollY;
            lastScrollY = currentScrollY;

            // 1. Text activation
            steps.forEach(s => s.classList.remove('is-active'));
            step.classList.add('is-active');

            // 2. Wide-mode toggle: if step has class scrolly-step-wide, expand container
            if (step.classList.contains('scrolly-step-wide')) {
                scrollyContainer.classList.add('wide-mode');
            } else {
                scrollyContainer.classList.remove('wide-mode');
            }

            // 3. Chart activation with directional slide
            const chartId = step.getAttribute('data-step');
            if (stage && chartId !== null) {
                const currentActiveChart = stage.querySelector('.chart-container.is-active');
                const targetChart = stage.querySelector(`.chart-container[data-chart="${chartId}"]`);

                if (currentActiveChart && currentActiveChart !== targetChart) {
                    // Slide outgoing chart in the direction the user came FROM
                    const outClass = scrollingDown ? 'slide-exit-up' : 'slide-exit-down';
                    currentActiveChart.classList.add(outClass);
                    currentActiveChart.addEventListener('transitionend', () => {
                        currentActiveChart.classList.remove('is-active', 'slide-exit-up', 'slide-exit-down');
                    }, { once: true });
                }

                if (targetChart) {
                    // Start new chart from opposite side
                    const inClass = scrollingDown ? 'slide-enter-down' : 'slide-enter-up';
                    targetChart.classList.add(inClass);
                    // Force reflow before adding is-active so the transition fires
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            targetChart.classList.remove('slide-enter-down', 'slide-enter-up');
                            targetChart.classList.add('is-active');
                        });
                    });
                } else if (!targetChart && currentActiveChart) {
                    // 'none' chart - just slide out existing
                    const outClass = scrollingDown ? 'slide-exit-up' : 'slide-exit-down';
                    currentActiveChart.classList.add(outClass);
                    currentActiveChart.addEventListener('transitionend', () => {
                        currentActiveChart.classList.remove('is-active', 'slide-exit-up', 'slide-exit-down');
                    }, { once: true });
                }
            }

            // 4. Background activation
            const bgId = step.getAttribute('data-bg');
            if (mainSection && bgId) {
                // Handle bg-intro (id=0) specially
                mainSection.querySelectorAll('.scrolly-bg-layer').forEach(bg => bg.classList.remove('is-active'));
                let targetBg;
                if (bgId === '0') {
                    targetBg = mainSection.querySelector('.scrolly-bg-layer.bg-intro');
                } else {
                    targetBg = mainSection.querySelector(`.scrolly-bg-layer.bg-sec-${bgId}`);
                }
                if (targetBg) targetBg.classList.add('is-active');
            }

            lastActiveStep = step;
        });
    }, observerOptions);

    steps.forEach(step => observer.observe(step));
}

window.initScrollytelling = initScrollytelling;

