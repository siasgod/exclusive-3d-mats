const API_BASE = "https://parallelum.com.br/fipe/api/v1/carros";
let selection = { brandId: '', brandName: '', modelId: '', modelName: '', yearId: '', yearName: '' };

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

// --- CARROSSEL ---
function initCarousel() {
    const container = document.getElementById('hero-carousel');
    const slides = document.querySelectorAll('.hero-slide-img');
    if (!container || slides.length === 0) return;
    let currentSlide = 0;
    setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        container.scrollTo({ left: container.offsetWidth * currentSlide, behavior: 'smooth' });
    }, 4000);
}

// --- FIPE API ---
async function initFipe() {
    const selBrand = document.getElementById('sel-brand');
    if (!selBrand) return;

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
    } catch (e) { console.error("Erro FIPE:", e); }
}

document.getElementById('sel-brand')?.addEventListener('change', async (e) => {
    const id = e.target.value;
    if (!id) return;
    selection.brandId = id;
    selection.brandName = e.target.options[e.target.selectedIndex].text;

    const label = document.getElementById('model-selected-text');
    if (label) label.innerText = "Carregando modelos...";

    try {
        const res = await fetch(`${API_BASE}/marcas/${id}/modelos`);
        const data = await res.json();
        window.allModels = data.modelos;
        renderModels(window.allModels);
        if (label) label.innerText = "Selecione o Modelo";
    } catch (error) {
        if (label) label.innerText = "Erro ao carregar";
    }
});

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

    const modelSelectedText = document.getElementById('model-selected-text');
    if (modelSelectedText) modelSelectedText.innerText = name;

    const modelPopover = document.getElementById('model-popover');
    if (modelPopover) modelPopover.classList.remove('show');

    loadYears(id);
}

async function loadYears(modelId) {
    const selYear = document.getElementById('sel-year');
    if (!selYear) return;

    selYear.disabled = false;
    selYear.innerHTML = '<option>Carregando anos...</option>';

    try {
        const res = await fetch(`${API_BASE}/marcas/${selection.brandId}/modelos/${modelId}/anos`);
        const years = await res.json();
        selYear.innerHTML = '<option value="">Selecione o Ano</option>';
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.codigo;
            opt.textContent = y.nome;
            selYear.appendChild(opt);
        });
    } catch (error) {
        selYear.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

document.getElementById('sel-year')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    selection.yearId = e.target.value;
    selection.yearName = e.target.options[e.target.selectedIndex].text;

    const full = `${selection.brandName} ${selection.modelName} (${selection.yearName})`;

    const confVehicleText = document.getElementById('conf-vehicle-text');
    if (confVehicleText) confVehicleText.innerText = full;

    const confirmBox = document.getElementById('confirm-box');
    if (confirmBox) confirmBox.classList.remove('hidden');

    const drawerVehicle = document.getElementById('drawer-vehicle');
    if (drawerVehicle) drawerVehicle.innerText = full;
});

// --- CONTROLE DO DRAWER ---
window.selectKit = function (kitName, price) {
    if (!selection.yearId) {
        alert("⚠️ Selecione seu veículo primeiro para garantir o encaixe perfeito!");
        const comprarSection = document.getElementById('comprar');
        if (comprarSection) comprarSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const kitNameEl = document.getElementById('drawer-kit-name');
    const priceEl = document.getElementById('drawer-price');

    if (kitNameEl) kitNameEl.textContent = kitName;
    if (priceEl) priceEl.innerText = `R$ ${price.toFixed(2)}`;

    openDrawer();
};

function openDrawer() {
    const drawer = document.getElementById('checkout-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeDrawer = function () {
    const drawer = document.getElementById('checkout-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
};

// REDIRECIONAMENTO PARA A PÁGINA DE DADOS (PASSO 1)
window.drawerConfirmPayment = () => {
    const btn = document.getElementById('drawer-pay-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Redirecionando...';
        btn.disabled = true;
    }

    // Captura dados com segurança (evita erro se o HTML não tiver os IDs exatos)
    const kitEl = document.getElementById('drawer-kit-name');
    const priceEl = document.getElementById('drawer-price');
    const vehicleEl = document.getElementById('drawer-vehicle');

    const params = new URLSearchParams({
        kit: kitEl ? (kitEl.innerText || kitEl.textContent) : 'Kit Padrão',
        preco: priceEl ? (priceEl.innerText || priceEl.textContent) : '0.00',
        veiculo: vehicleEl ? (vehicleEl.innerText || vehicleEl.textContent) : 'Veículo não selecionado'
    });

    // Aguarda 1 segundo e redireciona
    setTimeout(() => {
        window.location.href = `dados-pagamento.html?${params.toString()}`;
    }, 1000);
};

window.onload = () => {
    initCarousel();
    initFipe();
    const timerDisplay = document.querySelector('#timer');
    if (timerDisplay) startTimer(15 * 60, timerDisplay);
};