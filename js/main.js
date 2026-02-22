// CONFIGURAÇÕES
const API_BASE = "https://parallelum.com.br/fipe/api/v1/carros";
let selection = { brandId: '', brandName: '', modelId: '', modelName: '', yearId: '' };
let allModels = [];

// --- 1. LÓGICA DO CARROSSEL ---
let currentSlide = 0;

// Utilidade para selecionar elementos (mantida para facilitar integração)
const $ = (id) => document.getElementById(id);

window.goToSlide = function (index) {
    const container = $('hero-carousel');
    const dots = document.querySelectorAll('.dot');
    if (!container) return;

    container.scrollTo({ left: container.offsetWidth * index, behavior: 'smooth' });
    dots.forEach(d => d.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');
    currentSlide = index;
};

const initHeroSlider = () => {
    const carousel = $('hero-carousel');
    const dots = document.querySelectorAll('.dot');
    if (!carousel || dots.length === 0) return;

    // Update dots based on scroll position (manual swipe)
    carousel.addEventListener('scroll', () => {
        const index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
        currentSlide = index;
    });
};

// --- 2. LÓGICA FIPE API (SELETOR) ---
async function initFipe() {
    const selBrand = $('sel-brand');
    if (!selBrand) return;

    try {
        const response = await fetch(`${API_BASE}/marcas`);
        const brands = await response.json();
        brands.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.codigo;
            opt.textContent = b.nome;
            selBrand.appendChild(opt);
        });
    } catch (e) { console.error("Erro API Marcas", e); }
}

// Quando mudar a Marca
const brandEl = $('sel-brand');
if (brandEl) {
    brandEl.addEventListener('change', async (e) => {
        const id = e.target.value;
        if (!id) return;

        selection.brandId = id;
        selection.brandName = e.target.options[e.target.selectedIndex].text;

        // UI Update
        const trigger = $('model-trigger');
        const label = $('model-selected-text');
        if (trigger) trigger.disabled = false;
        if (label) label.innerText = "Carregando modelos...";

        const res = await fetch(`${API_BASE}/marcas/${id}/modelos`);
        const data = await res.json();
        allModels = data.modelos;
        renderModels(allModels);
        if (label) label.innerText = "Selecione o modelo";
    });
}

// Pop-over e Busca
const modelSearch = $('model-search');
if (modelSearch) {
    modelSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderModels(allModels.filter(m => m.nome.toLowerCase().includes(term)));
    });
}

const modelTrigger = $('model-trigger');
const modelPopover = $('model-popover');
if (modelTrigger && modelPopover) {
    modelTrigger.addEventListener('click', () => {
        modelPopover.classList.toggle('show');
        if (modelPopover.classList.contains('show')) $('model-search').focus();
    });

    // Fechar popover ao clicar fora
    document.addEventListener('click', (e) => {
        if (!modelTrigger.contains(e.target) && !modelPopover.contains(e.target)) {
            modelPopover.classList.remove('show');
        }
    });
}

function renderModels(list) {
    const container = $('model-results');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(m => {
        const btn = document.createElement('button');
        btn.innerText = m.nome;
        btn.onclick = () => selectModel(m.codigo, m.nome);
        container.appendChild(btn);
    });
}

async function selectModel(id, name) {
    selection.modelId = id;
    selection.modelName = name;
    const label = $('model-selected-text');
    if (label) label.innerText = name;
    if (modelPopover) modelPopover.classList.remove('show');

    const selYear = $('sel-year');
    if (selYear) {
        selYear.disabled = false;
        selYear.innerHTML = '<option>Carregando anos...</option>';

        try {
            const res = await fetch(`${API_BASE}/marcas/${selection.brandId}/modelos/${id}/anos`);
            const years = await res.json();
            selYear.innerHTML = '<option value="">Selecione o ano</option>';
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y.codigo;
                opt.textContent = y.nome;
                selYear.appendChild(opt);
            });
        } catch (e) {
            selYear.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }
}

// Finalização e Segurança (Trava de Kit)
const yearEl = $('sel-year');
if (yearEl) {
    yearEl.addEventListener('change', (e) => {
        if (!e.target.value) return;
        selection.yearId = e.target.value;
        const fullVehicle = `${selection.brandName} ${selection.modelName} ${e.target.options[e.target.selectedIndex].text}`;

        const confText = $('conf-vehicle-text');
        const confBox = $('confirm-box');
        const drVehicle = $('drawer-vehicle');

        if (confText) confText.innerText = fullVehicle;
        if (confBox) confBox.classList.remove('hidden');
        if (drVehicle) drVehicle.innerText = fullVehicle;
    });
}

// --- 3. LÓGICA DE URGÊNCIA (Preservada) ---
const initUrgency = () => {
    let viewers = 12;
    setInterval(() => {
        const change = Math.floor(Math.random() * 3) - 1;
        viewers = Math.max(8, Math.min(45, viewers + change));
        const el = $('viewer-count');
        if (el) el.innerText = viewers;
    }, 4000);

    let offerEndTime = sessionStorage.getItem('offerEndTime');
    if (!offerEndTime) {
        offerEndTime = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem('offerEndTime', offerEndTime);
    }
    const tick = () => {
        let distance = Number(offerEndTime) - Date.now();
        if (distance < 0) {
            offerEndTime = Date.now() + 15 * 60 * 1000;
            sessionStorage.setItem('offerEndTime', offerEndTime);
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

// --- 4. KITS E DRAWER ---
window.selectKit = function (kitName, price) {
    if (!selection.yearId) {
        alert("⚠️ ATENÇÃO: Você precisa selecionar seu veículo primeiro para garantirmos o encaixe perfeito!");
        const comprarSection = $('comprar');
        if (comprarSection) comprarSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const dKitName = $('drawer-kit-name');
    const dPrice = $('drawer-price');
    if (dKitName) dKitName.textContent = kitName;
    if (dPrice) dPrice.innerHTML = `R$ ${price.toFixed(2)} <span style="font-size:12px;font-weight:600;color:#888">no PIX</span>`;

    // Preços originais para o drawer
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
        const kitName = $('drawer-kit-name') ? $('drawer-kit-name').textContent : '';
        const fullVehicle = `${selection.brandName} ${selection.modelName}`;
        const price = $('drawer-price') ? $('drawer-price').innerText : '';

        alert(`Redirecionando para o pagamento seguro...\nKit: ${kitName}\nVeículo: ${fullVehicle}\nValor: ${price}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>CONFIRMAR E PAGAR';
            btn.disabled = false;
        }
    }, 1500);
};

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    initUrgency();
    initHeroSlider();
    initFipe();
});
