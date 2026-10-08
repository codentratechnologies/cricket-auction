/**
 * CricSquad Landing Page — Premium Scroll & Entry Animations
 * Uses IntersectionObserver for performant, GPU-accelerated animations
 */

(function () {
    'use strict';

    /* ─────────────────────────────────────────
       1. INTERSECTION OBSERVER — Scroll Reveal
    ───────────────────────────────────────── */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Stagger children if parent has data-stagger
                if (entry.target.dataset.stagger) {
                    const children = entry.target.querySelectorAll('[data-reveal]');
                    children.forEach((child, i) => {
                        setTimeout(() => child.classList.add('is-visible'), i * 100);
                    });
                }
                revealObserver.unobserve(entry.target); // animate once
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    // Auto-register all [data-reveal] elements
    function registerRevealElements() {
        document.querySelectorAll('[data-reveal]').forEach(el => {
            revealObserver.observe(el);
        });
    }

    /* ─────────────────────────────────────────
       2. COUNTER ANIMATION — Numbers count up
    ───────────────────────────────────────── */
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    function animateCounter(el) {
        const target = parseInt(el.dataset.count, 10);
        const duration = 1800;
        const start = performance.now();
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = prefix + Math.floor(eased * target).toLocaleString('en-IN') + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    /* ─────────────────────────────────────────
       3. PARALLAX — Subtle depth on scroll
    ───────────────────────────────────────── */
    function initParallax() {
        const parallaxEls = document.querySelectorAll('[data-parallax]');
        if (!parallaxEls.length) return;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            parallaxEls.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.15;
                const rect = el.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const offset = (centerY - window.innerHeight / 2) * speed;
                el.style.transform = `translateY(${offset}px)`;
            });
        }, { passive: true });
    }

    /* ─────────────────────────────────────────
       4. CURSOR SPOTLIGHT — Premium glow effect
    ───────────────────────────────────────── */
    function initCursorSpotlight() {
        const spotlight = document.createElement('div');
        spotlight.className = 'cursor-spotlight';
        document.body.appendChild(spotlight);

        let mouseX = 0, mouseY = 0;
        let spotX = 0, spotY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animate() {
            spotX += (mouseX - spotX) * 0.08;
            spotY += (mouseY - spotY) * 0.08;
            spotlight.style.transform = `translate(${spotX - 200}px, ${spotY - 200}px)`;
            requestAnimationFrame(animate);
        }
        animate();
    }

    /* ─────────────────────────────────────────
       5. MAGNETIC BUTTONS — Buttons attract cursor
    ───────────────────────────────────────── */
    function initMagneticButtons() {
        document.querySelectorAll('.btn-primary, .btn-outline').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    /* ─────────────────────────────────────────
       6. TILT CARDS — 3D tilt on hover
    ───────────────────────────────────────── */
    function initTiltCards() {
        document.querySelectorAll('.feature-card, .auction-widget, .p-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
                card.style.boxShadow = `${-x * 20}px ${-y * 20}px 40px rgba(37,99,235,0.12)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });
        });
    }

    /* ─────────────────────────────────────────
       7. NAVBAR PROGRESS BAR — Scroll indicator
    ───────────────────────────────────────── */
    function initScrollProgress() {
        const bar = document.createElement('div');
        bar.className = 'scroll-progress-bar';
        document.body.appendChild(bar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            bar.style.width = progress + '%';
        }, { passive: true });
    }

    /* ─────────────────────────────────────────
       8. SECTION ENTRY — Add data-reveal attrs
    ───────────────────────────────────────── */
    function tagSections() {
        // Features strip items
        document.querySelectorAll('.feature-item').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = `${i * 80}ms`;
        });

        // Feature cards
        document.querySelectorAll('.feature-card').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = `${i * 80}ms`;
        });

        // How it works steps / timeline
        document.querySelectorAll('.step-card, .hw-card').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = `${i * 100}ms`;
        });

        // Pricing cards
        document.querySelectorAll('.p-card').forEach((el, i) => {
            el.setAttribute('data-reveal', 'scale-up');
            el.style.transitionDelay = `${i * 120}ms`;
        });

        // Live auction cards
        document.querySelectorAll('.la-card').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = `${i * 100}ms`;
        });

        // FAQ items
        document.querySelectorAll('.faq-item').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-left');
            el.style.transitionDelay = `${i * 60}ms`;
        });

        // Section headings
        document.querySelectorAll('.section-title, .features-header h2, .hw-header h2, .la-header h2, .faq-header h2').forEach(el => {
            el.setAttribute('data-reveal', 'fade-up');
        });
        document.querySelectorAll('.section-subtitle, .features-header p, .hw-header p, .la-header p, .faq-header p').forEach(el => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = '80ms';
        });

        // Trust banner
        document.querySelectorAll('.tb-feature').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = `${i * 80}ms`;
        });

        // Footer columns
        document.querySelectorAll('.f-col-brand, .f-col-link, .f-col-subscribe').forEach((el, i) => {
            el.setAttribute('data-reveal', 'fade-up');
            el.style.transitionDelay = `${i * 80}ms`;
        });
    }

    /* ─────────────────────────────────────────
       INIT
    ───────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        tagSections();
        registerRevealElements();
        initParallax();
        initCursorSpotlight();
        initMagneticButtons();
        initTiltCards();
        initScrollProgress();
    });

})();
