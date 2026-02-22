// Configurações da API
const API_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

// Estado da seleção
const state = {
    brandId: '',
    brandName: '',
    modelId: '',
    modelName: '',
    yearId: '',
    yearName: '',
    fullText: '',
    viewers: 12,
    offerEndTime: sessionStorage.getItem('offerEndTime') || null,
    currentSlide: 0
};

// Elementos do DOM
const $ = (id) => document.getElementById(id);
const selBrand = $('sel-brand');
const modelTrigger = $('model-trigger');
const modelSelectedText = $('model-selected-text');
const modelPopover = $('model-popover');
const modelSearch = $('model-search');
const modelResults = $('model-results');
const selYear = $('sel-year');
const confirmBox = $('confirm-box');
const confVehicleText = $('conf-vehicle-text');
const drawerVehicle = $('drawer-vehicle');

// Lista temporária de modelos para o filtro de busca
let allModels = [];

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
    const carousel = $('hero-carousel');
    const dots = document.querySelectorAll('#carousel-dots .dot');
    const totalSlides = dots.length;

    if (!carousel || totalSlides === 0) return;

    const updateSlider = () => {
        carousel.scrollLeft = carousel.offsetWidth * state.currentSlide;
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === state.currentSlide);
        });
    };

    window.goToSlide = (n) => {
        state.currentSlide = n;
        updateSlider();
    };

    setInterval(() => {
        state.currentSlide = (state.currentSlide + 1) % totalSlides;
        updateSlider();
    }, 5000);
};

// ============================================================
// FIPE API SELECTOR
// ============================================================
async function initFipe() {
    try {
        const response = await fetch(`${API_BASE}/marcas`);
        const brands = await response.json();

        brands.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(brand => {
            const opt = document.createElement('option');
            opt.value = brand.codigo;
            opt.textContent = brand.nome;
            selBrand.appendChild(opt);
        });
    } catch (error) {
        console.error("Erro ao carregar marcas:", error);
    }
}

selBrand.addEventListener('change', async (e) => {
    const brandId = e.target.value;
    const brandName = selBrand.options[selBrand.selectedIndex].text;

    if (!brandId) return resetFrom('brand');

    state.brandId = brandId;
    state.brandName = brandName;

    resetFrom('model');
    modelSelectedText.textContent = "Carregando modelos...";

    try {
        const response = await fetch(`${API_BASE}/marcas/${brandId}/modelos`);
        const data = await response.json();
        allModels = data.modelos;

        renderModels(allModels);
        modelTrigger.disabled = false;
        modelSelectedText.textContent = "Selecione o modelo";
    } catch (error) {
        modelSelectedText.textContent = "Erro ao carregar";
    }
});

modelTrigger.addEventListener('click', () => {
    modelPopover.classList.toggle('show');
    if (modelPopover.classList.contains('show')) modelSearch.focus();
});

document.addEventListener('click', (e) => {
    if (modelTrigger && modelPopover && !modelTrigger.contains(e.target) && !modelPopover.contains(e.target)) {
        modelPopover.classList.remove('show');
    }
});

modelSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allModels.filter(m => m.nome.toLowerCase().includes(term));
    renderModels(filtered);
});

function renderModels(modelsList) {
    modelResults.innerHTML = '';
    modelsList.forEach(model => {
        const btn = document.createElement('button');
        btn.textContent = model.nome;
        btn.onclick = () => selectModel(model.codigo, model.nome);
        modelResults.appendChild(btn);
    });
}

async function selectModel(id, name) {
    state.modelId = id;
    state.modelName = name;
    modelSelectedText.textContent = name;
    modelPopover.classList.remove('show');

    resetFrom('year');
    selYear.innerHTML = '<option value="">Carregando anos...</option>';

    try {
        const response = await fetch(`${API_BASE}/marcas/${state.brandId}/modelos/${id}/anos`);
        const years = await response.json();

        selYear.innerHTML = '<option value="">Selecione o ano</option>';
        years.forEach(year => {
            const opt = document.createElement('option');
            opt.value = year.codigo;
            opt.textContent = year.nome;
            selYear.appendChild(opt);
        });
        selYear.disabled = false;
    } catch (error) {
        selYear.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

selYear.addEventListener('change', (e) => {
    const yearId = e.target.value;
    const yearName = selYear.options[selYear.selectedIndex].text;

    if (!yearId) return;

    state.yearId = yearId;
    state.yearName = yearName;
    state.fullText = `${state.brandName} ${state.modelName} (${yearName})`;

    confVehicleText.textContent = state.fullText;
    confirmBox.classList.remove('hidden');

    if (drawerVehicle) drawerVehicle.textContent = state.fullText;
});

function resetFrom(step) {
    if (confirmBox) confirmBox.classList.add('hidden');
    if (step === 'brand') {
        if (modelTrigger) modelTrigger.disabled = true;
        if (modelSelectedText) modelSelectedText.textContent = "Aguardando marca...";
        allModels = [];
    }
    if (step === 'model' || step === 'brand') {
        if (selYear) {
            selYear.disabled = true;
            selYear.innerHTML = '<option value="">Selecione o ano</option>';
        }
    }
}

// ============================================================
// KITS & DRAWER
// ============================================================
window.selectKit = function (name, price) {
    if (!state.yearId) {
        alert("Por favor, selecione seu veículo primeiro.");
        const comprarSection = $('comprar');
        if (comprarSection) comprarSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const dKitName = $('drawer-kit-name');
    const dPrice = $('drawer-price');

    if (dKitName) dKitName.textContent = name;
    if (dPrice) dPrice.innerHTML = `R$ ${price.toFixed(2)} <span style="font-size:12px;font-weight:600;color:#888">no PIX</span>`;

    // Original prices for drawer
    const dOriginal = $('drawer-original-price');
    const origPrice = price < 70 ? 329.90 : 489.90;
    if (dOriginal) dOriginal.textContent = `R$ ${origPrice.toFixed(2)}`;

    openDrawer();
};

function openDrawer() {
    const backdrop = $('drawer-backdrop');
    const drawer = $('checkout-drawer');
    if (backdrop) backdrop.classList.remove('hidden');
    if (drawer) {
        drawer.classList.remove('drawer-hidden');
        drawer.classList.add('drawer-open');
    }
    document.body.style.overflow = 'hidden';
}

window.closeDrawer = function () {
    const backdrop = $('drawer-backdrop');
    const drawer = $('checkout-drawer');
    if (backdrop) backdrop.classList.add('hidden');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-hidden');
    }
    document.body.style.overflow = '';
};

window.drawerConfirmPayment = () => {
    const btn = $('drawer-pay-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Redirecionando...';
        btn.disabled = true;
    }
    setTimeout(() => {
        alert(`Redirecionando para o pagamento seguro...\nKit: ${document.getElementById('drawer-kit-name').textContent}\nVeículo: ${state.fullText}\nValor: ${document.getElementById('drawer-price').innerText}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>CONFIRMAR E PAGAR';
            btn.disabled = false;
        }
    }, 1500);
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initUrgency();
    initHeroSlider();
    initFipe();
});
