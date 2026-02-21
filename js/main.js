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
    viewers: 12,
    offerEndTime: sessionStorage.getItem('offerEndTime') || null,
    configStep: 1
};

// ============================================================
// UTILITIES
// ============================================================
const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const $ = (id) => document.getElementById(id);

// ============================================================
// URGENCY BAR
// ============================================================
const initUrgency = () => {
    // Viewer count
    setInterval(() => {
        const change = Math.floor(Math.random() * 3) - 1;
        state.viewers = Math.max(8, Math.min(45, state.viewers + change));
        $('viewer-count').innerText = state.viewers;
    }, 4000);

    // Timer (persists across refreshes via sessionStorage)
    if (!state.offerEndTime) {
        state.offerEndTime = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem('offerEndTime', state.offerEndTime);
    }
    const tick = () => {
        let distance = state.offerEndTime - Date.now();
        if (distance < 0) {
            state.offerEndTime = Date.now() + 15 * 60 * 1000;
            sessionStorage.setItem('offerEndTime', state.offerEndTime);
            distance = state.offerEndTime - Date.now();
        }
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        $('timer').innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    tick();
    setInterval(tick, 1000);
};

// ============================================================
// HERO SLIDER
// ============================================================
const initHeroSlider = () => {
    const slides = document.querySelectorAll('#hero-carousel img');
    let cur = 0;
    if (!slides.length) return;
    slides[0].classList.add('opacity-100');
    setInterval(() => {
        slides[cur].classList.replace('opacity-100', 'opacity-0');
        cur = (cur + 1) % slides.length;
        slides[cur].classList.replace('opacity-0', 'opacity-100');
    }, 5000);
};

// ============================================================
// 3-STEP CONFIGURATOR
// ============================================================

// Move between configurator steps
window.goToConfigStep = (step) => {
    state.configStep = step;
    for (let i = 1; i <= 3; i++) {
        const el = $(`cfg-step-${i}`);
        if (i === step) {
            el.classList.remove('step-hidden');
            el.classList.add('step-visible');
        } else {
            el.classList.add('step-hidden');
            el.classList.remove('step-visible');
        }
    }
    // Update progress dots
    for (let i = 1; i <= 3; i++) {
        const dot = $(`dot-${i}`);
        if (i < step) {
            dot.className = 'w-8 h-8 rounded-full bg-green-500 text-black font-bold text-sm flex items-center justify-center transition-all duration-300';
            dot.innerHTML = '<i class="fas fa-check text-xs"></i>';
        } else if (i === step) {
            dot.className = 'w-8 h-8 rounded-full bg-brand-orange text-black font-bold text-sm flex items-center justify-center transition-all duration-300';
            dot.innerText = i;
        } else {
            dot.className = 'w-8 h-8 rounded-full bg-gray-700 text-gray-400 font-bold text-sm flex items-center justify-center transition-all duration-300';
            dot.innerText = i;
        }
    }
    // Update label
    const labels = ['', 'Passo 1 de 3 — Selecione a Marca', 'Passo 2 de 3 — Selecione o Modelo', 'Passo 3 de 3 — Selecione o Ano'];
    $('step-label').innerText = labels[step] || '';
    // Hide success banner and kit section when going back
    if (step < 3) {
        $('success-banner').classList.add('hidden');
    }
};

// Brand selected (from grid button or datalist)
window.selectBrand = (brand) => {
    if (!carDatabase[brand]) return;
    state.selectedBrand = brand;
    // Populate model select
    const modelSel = $('model-select');
    modelSel.innerHTML = '<option value="">Selecione o Modelo</option>';
    carDatabase[brand].sort().forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSel.appendChild(opt);
    });
    $('step2-brand-label').innerText = `Marca: ${brand}`;
    $('step2-next').disabled = true;
    goToConfigStep(2);
};

// Model confirmation (step 2 → step 3)
window.confirmarModelo = () => {
    const val = $('model-select').value;
    if (!val) return;
    state.selectedModel = val;
    // Populate year buttons
    const yearsDiv = $('year-buttons');
    yearsDiv.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 12; y--) {
        const btn = document.createElement('button');
        btn.className = 'brand-btn bg-gray-900 border border-gray-700 rounded-lg py-2 text-sm font-bold text-center';
        btn.innerText = y;
        btn.onclick = () => selectYear(y);
        yearsDiv.appendChild(btn);
    }
    $('step3-model-label').innerText = `${state.selectedBrand} ${state.selectedModel}`;
    goToConfigStep(3);
};

// Year selected → show success banner
window.selectYear = (year) => {
    state.selectedYear = year;
    $('success-text').innerText = `Molde Premium disponível para ${state.selectedBrand} ${state.selectedModel} (${year})`;
    $('success-banner').classList.remove('hidden');
    $('success-banner').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// Scroll to kit section and reveal it
window.scrollToKitSection = () => {
    const kitSection = $('kit-section');
    kitSection.classList.remove('hidden');
    setTimeout(() => {
        kitSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

// Init brand datalist & search input
const initCarSelector = () => {
    const brands = Object.keys(carDatabase).sort();
    const datalist = $('brand-list');
    datalist.innerHTML = '';
    brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        datalist.appendChild(opt);
    });

    // Listen for datalist selection
    $('brand-search').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const key = Object.keys(carDatabase).find(k => k.toLowerCase() === val.toLowerCase());
        if (key) selectBrand(key);
    });

    // Step 2 model select enable next button
    $('model-select').addEventListener('change', (e) => {
        $('step2-next').disabled = !e.target.value;
    });
};

// ============================================================
// KIT SELECTION
// ============================================================
window.selectKit = (kitName, price) => {
    state.selectedKit = kitName;
    state.kitPrice = price;
    openCheckout();
};

// ============================================================
// CHECKOUT MODAL
// ============================================================
const openCheckout = () => {
    const modal = $('checkout-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Populate summary
    $('modal-kit-name').innerText = state.selectedKit || 'Kit Exclusive 3D';
    $('modal-kit-price').innerText = formatCurrency(state.kitPrice);
    $('modal-model-name').innerText = `${state.selectedBrand} ${state.selectedModel} ${state.selectedYear}`.trim() || '—';

    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
};

window.closeCheckout = () => {
    $('checkout-modal').classList.add('hidden');
    $('checkout-modal').classList.remove('flex');
    document.body.style.overflow = '';
};

// ============================================================
// CHECKOUT SUBMISSION
// ============================================================
window.submitCheckout = () => {
    const name = $('co-name').value.trim();
    const cpf = $('co-cpf').value.replace(/\D/g, '');
    const phone = $('co-phone').value.replace(/\D/g, '');
    const email = $('co-email').value.trim();

    if (name.length < 3) { alert('Por favor, digite seu nome completo.'); return; }
    if (cpf.length !== 11) { alert('Por favor, digite um CPF válido (11 dígitos).'); return; }
    if (phone.length < 10) { alert('Por favor, digite um celular válido com DDD.'); return; }
    if (!validateEmail(email)) { alert('Por favor, digite um e-mail válido.'); return; }

    const btn = $('checkout-submit-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processando...';
    btn.disabled = true;

    const payload = {
        name,
        cpf: $('co-cpf').value,
        phone: $('co-phone').value,
        email,
        car: `${state.selectedBrand} ${state.selectedModel} ${state.selectedYear}`.trim(),
        kit: state.selectedKit,
        price: formatCurrency(state.kitPrice),
    };

    console.log('[Exclusive3D] Checkout payload:', payload);

    // Pixel event
    if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout', { value: state.kitPrice, currency: 'BRL' });
    }

    setTimeout(() => {
        // TODO: Replace with real gateway URL
        alert(`Redirecionando para o pagamento seguro...\nKit: ${payload.kit}\nValor: ${payload.price}`);
        btn.innerHTML = '<i class="fas fa-lock mr-2"></i> IR PARA PAGAMENTO SEGURO';
        btn.disabled = false;
    }, 1500);
};

// ============================================================
// INPUT MASKS
// ============================================================
const initMasks = () => {
    const cpfInput = $('co-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            e.target.value = e.target.value
                .replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                .substring(0, 14);
        });
    }
    const phoneInput = $('co-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? '-' + x[3] : ''}`;
        });
    }
};

// ============================================================
// NAV - Mobile Menu
// ============================================================
const initNav = () => {
    const btn = $('menu-btn');
    const menu = $('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('hidden'));
        // Close when a link is clicked
        menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.add('hidden')));
    }
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initUrgency();
    initHeroSlider();
    initCarSelector();
    initMasks();
    initNav();
    // Start on step 1
    goToConfigStep(1);
});
