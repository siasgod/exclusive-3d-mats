const API_BASE = "https://parallelum.com.br/fipe/api/v1/carros";
let selection = { brandId: '', brandName: '', modelId: '', modelName: '', yearId: '' };

// --- TIMER REGRESSIVO ---
function startTimer(duration, display) {
    let timer = duration, minutes, seconds;
    setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        display.textContent = minutes + ":" + seconds;
        if (--timer < 0) timer = duration;
    }, 1000);
}

// --- CARROSSEL AUTOMÁTICO ---
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide-img');
const dotsContainer = document.getElementById('carousel-dots');

function initCarousel() {
    slides.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = i === 0 ? 'dot active' : 'dot';
        d.onclick = () => goToSlide(i);
        dotsContainer.appendChild(d);
    });
    setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        goToSlide(currentSlide);
    }, 4000);
}

function goToSlide(index) {
    const container = document.getElementById('hero-carousel');
    const dots = document.querySelectorAll('.dot');
    if (!container || dots.length === 0) return;
    container.scrollTo({ left: container.offsetWidth * index, behavior: 'smooth' });
    dots.forEach(d => d.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');
    currentSlide = index;
}

// --- FIPE API INTEGRATION (CORRIGIDO) ---
async function initFipe() {
    const selBrand = document.getElementById('sel-brand');
    try {
        const response = await fetch(`${API_BASE}/marcas`);
        const brands = await response.json();
        selBrand.innerHTML = '<option value="">Selecione a Marca</option>';
        brands.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.codigo;
            opt.textContent = b.nome;
            selBrand.appendChild(opt);
        });
    } catch (e) {
        if (selBrand) selBrand.innerHTML = '<option>Erro ao carregar marcas</option>';
    }
}

// Evento Marca -> Modelo
const brandEl = document.getElementById('sel-brand');
if (brandEl) {
    brandEl.addEventListener('change', async (e) => {
        const id = e.target.value;
        if (!id) return;
        selection.brandId = id;
        selection.brandName = e.target.options[e.target.selectedIndex].text;

        const trigger = document.getElementById('model-trigger');
        const label = document.getElementById('model-selected-text');
        if (trigger) trigger.disabled = false;
        if (label) label.innerText = "Carregando...";

        const res = await fetch(`${API_BASE}/marcas/${id}/modelos`);
        const data = await res.json();
        window.allModels = data.modelos;
        renderModels(window.allModels);
        if (label) label.innerText = "Selecione o Modelo";
    });
}

function renderModels(list) {
    const container = document.getElementById('model-results');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(m => {
        const btn = document.createElement('button');
        btn.innerText = m.nome;
        btn.onclick = () => selectModel(m.codigo, m.nome);
        container.appendChild(btn);
    });
}

function selectModel(id, name) {
    selection.modelId = id;
    selection.modelName = name;
    const modelText = document.getElementById('model-selected-text');
    if (modelText) modelText.innerText = name;
    const modelPopover = document.getElementById('model-popover');
    if (modelPopover) modelPopover.classList.remove('show');
    loadYears(id);
}

async function loadYears(modelId) {
    const selYear = document.getElementById('sel-year');
    if (!selYear) return;
    selYear.disabled = false;
    selYear.innerHTML = '<option>Aguarde...</option>';
    const res = await fetch(`${API_BASE}/marcas/${selection.brandId}/modelos/${modelId}/anos`);
    const years = await res.json();
    selYear.innerHTML = '<option value="">Selecione o Ano</option>';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.codigo;
        opt.textContent = y.nome;
        selYear.appendChild(opt);
    });
}

const yearEl = document.getElementById('sel-year');
if (yearEl) {
    yearEl.addEventListener('change', (e) => {
        if (!e.target.value) return;
        selection.yearId = e.target.value;
        const full = `${selection.brandName} ${selection.modelName} ${e.target.options[e.target.selectedIndex].text}`;
        const confText = document.getElementById('conf-vehicle-text');
        const confBox = document.getElementById('confirm-box');
        const drVehicle = document.getElementById('drawer-vehicle');
        if (confText) confText.innerText = full;
        if (confBox) confBox.classList.remove('hidden');
        if (drVehicle) drVehicle.innerText = full;
    });
}

// Busca no Pop-over
const modelSearch = document.getElementById('model-search');
if (modelSearch) {
    modelSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (window.allModels) {
            const filtered = window.allModels.filter(m => m.nome.toLowerCase().includes(term));
            renderModels(filtered);
        }
    });
}

const modelTrigger = document.getElementById('model-trigger');
if (modelTrigger) {
    modelTrigger.onclick = () => {
        const modelPopover = document.getElementById('model-popover');
        if (modelPopover) modelPopover.classList.toggle('show');
    };
}

// --- 4. KITS E DRAWER (Preservados para funcionalidade) ---
window.stickyBuyClick = function () {
    const comprar = document.getElementById('comprar');
    if (comprar) comprar.scrollIntoView({ behavior: 'smooth' });
};

window.drawerAlterarVeiculo = function () {
    window.closeDrawer();
    const comprar = document.getElementById('comprar');
    if (comprar) comprar.scrollIntoView({ behavior: 'smooth' });
};

window.selectKit = function (kitName, price) {
    if (!selection.yearId && !document.getElementById('sel-year').value) {
        alert("⚠️ ATENÇÃO: Você precisa selecionar seu veículo primeiro para garantirmos o encaixe perfeito!");
        const comprarSection = document.getElementById('comprar');
        if (comprarSection) comprarSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const dKitName = document.getElementById('drawer-kit-name');
    const dPrice = document.getElementById('drawer-price');
    if (dKitName) dKitName.textContent = kitName;
    if (dPrice) dPrice.innerHTML = `R$ ${price.toFixed(2)} <span style="font-size:12px;font-weight:600;color:#888">no PIX</span>`;

    // Preços originais para o drawer
    const dOriginal = document.getElementById('drawer-original-price');
    const origPrice = price < 70 ? 329.90 : 489.90;
    if (dOriginal) dOriginal.textContent = `R$ ${origPrice.toFixed(2)}`;

    openDrawer();
};

function openDrawer() {
    const backdrop = document.getElementById('drawer-backdrop');
    const drawer = document.getElementById('checkout-drawer');
    if (backdrop) backdrop.classList.remove('hidden');
    if (drawer) {
        drawer.classList.remove('drawer-hidden');
        drawer.classList.add('drawer-open');
    }
    document.body.style.overflow = 'hidden';
}

window.closeDrawer = function () {
    const backdrop = document.getElementById('drawer-backdrop');
    const drawer = document.getElementById('checkout-drawer');
    if (backdrop) backdrop.classList.add('hidden');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-hidden');
    }
    document.body.style.overflow = '';
};

window.drawerConfirmPayment = () => {
    const btn = document.getElementById('drawer-pay-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Redirecionando...';
        btn.disabled = true;
    }
    setTimeout(() => {
        const kitName = document.getElementById('drawer-kit-name') ? document.getElementById('drawer-kit-name').textContent : '';
        const fullVehicle = `${selection.brandName} ${selection.modelName}`;
        const price = document.getElementById('drawer-price') ? document.getElementById('drawer-price').innerText : '';

        alert(`Redirecionando para o pagamento seguro...\nKit: ${kitName}\nVeículo: ${fullVehicle}\nValor: ${price}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>CONFIRMAR E PAGAR';
            btn.disabled = false;
        }
    }, 1500);
};

// Inicialização
window.onload = () => {
    const timerDisplay = document.querySelector('#timer');
    if (timerDisplay) startTimer(15 * 60, timerDisplay);
    initCarousel();
    initFipe();
};
