import { carDatabase } from './car-data.js';

// ============================================================
// STATE
// ============================================================
const state = {
    selectedBrand: '',
    selectedModel: '',
    selectedYear: '',
    selectedKit: null,
    kitPrice: 0,
    vehicleConfirmed: false,
    viewers: 12,
    offerEndTime: sessionStorage.getItem('offerEndTime') || null,
};

// ============================================================
// UTILITIES
// ============================================================
const $ = (id) => document.getElementById(id);
const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// ============================================================
// URGENCY BAR
// ============================================================
const initUrgency = () => {
    setInterval(() => {
        const change = Math.floor(Math.random() * 3) - 1;
        state.viewers = Math.max(8, Math.min(45, state.viewers + change));
        const el = $('viewer-count');
        if (el) el.innerText = state.viewers;
    }, 4000);

    if (!state.offerEndTime) {
        state.offerEndTime = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem('offerEndTime', state.offerEndTime);
    }
    const tick = () => {
        let distance = Number(state.offerEndTime) - Date.now();
        if (distance < 0) {
            state.offerEndTime = Date.now() + 15 * 60 * 1000;
            sessionStorage.setItem('offerEndTime', state.offerEndTime);
            distance = 15 * 60 * 1000;
        }
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        const el = $('timer');
        if (el) el.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    tick();
    setInterval(tick, 1000);
};

// ============================================================
// HERO SLIDER
// ============================================================
const initHeroSlider = () => {
    const slides = document.querySelectorAll('#hero-carousel .hero-slide');
    let cur = 0;
    if (!slides.length) return;
    slides[cur].classList.add('active');
    setInterval(() => {
        slides[cur].classList.remove('active');
        cur = (cur + 1) % slides.length;
        slides[cur].classList.add('active');
    }, 4500);
};

// ============================================================
// 3-DROPDOWN CAR SELECTOR
// ============================================================
const initCarSelector = () => {
    const brandSel = $('sel-brand');
    const modelSel = $('sel-model');
    const yearSel = $('sel-year');
    if (!brandSel) return;

    // Populate brands
    const brands = Object.keys(carDatabase).sort();
    brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brandSel.appendChild(opt);
    });

    brandSel.addEventListener('change', () => {
        const brand = brandSel.value;
        state.selectedBrand = brand;
        state.selectedModel = '';
        state.selectedYear = '';
        state.vehicleConfirmed = false;
        hideConfirmBox();

        // Reset downstream
        modelSel.innerHTML = '<option value="">Selecione o modelo</option>';
        modelSel.disabled = !brand;
        yearSel.innerHTML = '<option value="">Selecione o ano</option>';
        yearSel.disabled = true;

        if (!brand) return;
        const models = Object.keys(carDatabase[brand]).sort();
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSel.appendChild(opt);
        });
    });

    modelSel.addEventListener('change', () => {
        const model = modelSel.value;
        state.selectedModel = model;
        state.selectedYear = '';
        state.vehicleConfirmed = false;
        hideConfirmBox();

        yearSel.innerHTML = '<option value="">Selecione o ano</option>';
        yearSel.disabled = !model;

        if (!model) return;
        const years = carDatabase[state.selectedBrand][model];
        // Show newest first
        [...years].reverse().forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSel.appendChild(opt);
        });
    });

    yearSel.addEventListener('change', () => {
        const year = yearSel.value;
        state.selectedYear = year;
        state.vehicleConfirmed = false;
        hideConfirmBox();
        if (year) confirmVehicle();
    });
};

const confirmVehicle = () => {
    state.vehicleConfirmed = true;
    const { selectedBrand: b, selectedModel: m, selectedYear: y } = state;

    // Update confirmation box text
    const confText = $('conf-vehicle-text');
    if (confText) confText.textContent = `${b} ${m} ${y}`;

    const box = $('confirm-box');
    if (box) {
        box.classList.remove('hidden');
        box.classList.add('animate-bounce-in');
    }

    // Update sticky button price to reflect selected kit or default
    updateStickyPrice();
};

const hideConfirmBox = () => {
    const box = $('confirm-box');
    if (box) box.classList.add('hidden');
};

// ============================================================
// KIT SELECTION
// ============================================================
window.selectKit = (kitName, price) => {
    state.selectedKit = kitName;
    state.kitPrice = price;

    // Visual: highlight selected kit card
    document.querySelectorAll('.kit-card').forEach(c => c.classList.remove('kit-selected'));
    const cards = document.querySelectorAll('.kit-card');
    cards.forEach(c => {
        if (c.dataset.kit === kitName) c.classList.add('kit-selected');
    });

    updateStickyPrice();

    // If vehicle already confirmed, open drawer directly
    if (state.vehicleConfirmed) {
        openDrawer();
    } else {
        // Scroll to selector
        smoothScrollTo('comprar');
    }
};

// ============================================================
// STICKY FOOTER BUTTON
// ============================================================
const updateStickyPrice = () => {
    const btn = $('sticky-buy-btn');
    if (!btn) return;
    if (state.kitPrice > 0) {
        btn.innerHTML = `<i class="fas fa-shopping-cart mr-2"></i>COMPRAR AGORA &mdash; ${formatCurrency(state.kitPrice)}`;
    } else {
        btn.innerHTML = `<i class="fas fa-shopping-cart mr-2"></i>COMPRAR AGORA`;
    }
};

window.stickyBuyClick = () => {
    if (!state.vehicleConfirmed) {
        smoothScrollTo('comprar');
        // Pulse the selector to draw attention
        const sel = $('sel-brand');
        if (sel) {
            sel.classList.add('ring-2', 'ring-brand-orange');
            setTimeout(() => sel.classList.remove('ring-2', 'ring-brand-orange'), 2000);
        }
        return;
    }
    openDrawer();
};

// ============================================================
// BOTTOM DRAWER (Checkout)
// ============================================================
const openDrawer = () => {
    const drawer = $('checkout-drawer');
    const backdrop = $('drawer-backdrop');
    if (!drawer) return;

    // Populate drawer with current state
    const dVehicle = $('drawer-vehicle');
    if (dVehicle) {
        dVehicle.textContent = `${state.selectedBrand} ${state.selectedModel} ${state.selectedYear}`;
    }
    const dKit = $('drawer-kit-name');
    if (dKit) dKit.textContent = state.selectedKit || 'Kit Interno + Porta Malas';

    const dPrice = $('drawer-price');
    if (dPrice) dPrice.textContent = formatCurrency(state.kitPrice || 79.90);

    const dOriginal = $('drawer-original-price');
    const origPrice = state.kitPrice === 59.90 ? 329.90 : 489.90;
    if (dOriginal) dOriginal.textContent = formatCurrency(origPrice);

    drawer.classList.remove('drawer-hidden');
    drawer.classList.add('drawer-open');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeDrawer = () => {
    const drawer = $('checkout-drawer');
    const backdrop = $('drawer-backdrop');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-hidden');
    }
    if (backdrop) backdrop.classList.add('hidden');
    document.body.style.overflow = '';
};

window.drawerAlterarVeiculo = () => {
    closeDrawer();
    state.vehicleConfirmed = false;
    hideConfirmBox();
    smoothScrollTo('comprar');
};

window.drawerConfirmPayment = () => {
    const btn = $('drawer-pay-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Redirecionando...';
        btn.disabled = true;
    }
    // Fire pixel event if available
    if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout', { value: state.kitPrice, currency: 'BRL' });
    }
    // TODO: replace with real gateway URL
    setTimeout(() => {
        alert(`Redirecionando para o pagamento seguro...\nKit: ${state.selectedKit}\nVeículo: ${state.selectedBrand} ${state.selectedModel} ${state.selectedYear}\nValor: ${formatCurrency(state.kitPrice)}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>CONFIRMAR E PAGAR';
            btn.disabled = false;
        }
    }, 1500);
};

// ============================================================
// SMOOTH SCROLL
// ============================================================
const smoothScrollTo = (id) => {
    const el = $(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.scrollToSection = smoothScrollTo;

// ============================================================
// NAV
// ============================================================
const initNav = () => {
    const btn = $('menu-btn');
    const menu = $('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('hidden'));
        menu.querySelectorAll('a').forEach(a =>
            a.addEventListener('click', () => menu.classList.add('hidden'))
        );
    }
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initUrgency();
    initHeroSlider();
    initCarSelector();
    initNav();
});
