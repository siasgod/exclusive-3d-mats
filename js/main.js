const API_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

window.selection = {
    brandId: '',
    brandName: '',
    modelId: '',
    modelName: '',
    yearId: '',
    yearName: '',
    kitName: '',
    price: '',
    image: ''
};

const selection = window.selection;

// ═══════════════════════════════════════
// CARROSSEL
// ═══════════════════════════════════════
let carouselInterval = null;

function initCarousel() {
    const container = document.getElementById('hero-carousel');
    const slides = document.querySelectorAll('.hero-slide-img');
    if (!container || slides.length === 0) return;

    // Evita intervalo duplicado se chamado mais de uma vez
    if (carouselInterval) clearInterval(carouselInterval);

    let currentSlide = 0;
    carouselInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        container.scrollTo({
            left: container.offsetWidth * currentSlide,
            behavior: 'smooth'
        });
    }, 4000);
}

// ═══════════════════════════════════════
// FIPE API — com loading visual
// ═══════════════════════════════════════
async function initFipe() {
    const selBrand = document.getElementById('sel-brand');
    if (!selBrand) return;

    selBrand.innerHTML = '<option value="">Carregando marcas...</option>';
    selBrand.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/marcas`);
        const brands = await response.json();

        selBrand.innerHTML = '<option value="">Selecione a Marca</option>';
        selBrand.disabled = false;

        brands
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.codigo;
                opt.textContent = b.nome;
                selBrand.appendChild(opt);
            });
    } catch (e) {
        selBrand.innerHTML = '<option value="">Erro ao carregar marcas</option>';
        selBrand.disabled = false;
        console.error("Erro FIPE:", e);
    }
}

// ═══════════════════════════════════════
// SELEÇÃO DE MARCA
// ═══════════════════════════════════════
document.getElementById('sel-brand')?.addEventListener('change', async (e) => {
    const id = e.target.value;
    const modelTrigger = document.getElementById('model-trigger');
    const label = document.getElementById('model-selected-text');

    if (!id) {
        if (modelTrigger) modelTrigger.disabled = true;
        return;
    }

    if (modelTrigger) modelTrigger.disabled = false;
    selection.brandId = id;
    selection.brandName = e.target.options[e.target.selectedIndex].text;
    if (label) label.innerText = "Carregando modelos...";

    try {
        const res = await fetch(`${API_BASE}/marcas/${id}/modelos`);
        const data = await res.json();
        window.allModels = data.modelos;
        renderModels(window.allModels);
        if (label) label.innerText = "Selecione o Modelo";
    } catch (error) {
        if (label) label.innerText = "Erro ao carregar";
        console.error("Erro ao buscar modelos:", error);
    }
});

// ═══════════════════════════════════════
// RENDERIZAR MODELOS
// ═══════════════════════════════════════
function renderModels(list) {
    const container = document.getElementById('model-results');
    if (!container) return;
    container.innerHTML = '';

    if (!list.length) {
        container.innerHTML = '<p style="padding:10px;color:#9ca3af;font-size:13px;">Nenhum modelo encontrado</p>';
        return;
    }

    list.forEach(m => {
        const btn = document.createElement('button');
        btn.innerText = m.nome;
        btn.type = "button";
        btn.onclick = () => selectModel(m.codigo, m.nome);
        container.appendChild(btn);
    });
}

// ═══════════════════════════════════════
// BUSCA DE MODELO
// ═══════════════════════════════════════
document.getElementById('model-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!window.allModels) return;
    const filtered = window.allModels.filter(m =>
        m.nome.toLowerCase().includes(term)
    );
    renderModels(filtered);
});

document.getElementById('model-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const popover = document.getElementById('model-popover');
    if (popover) {
        popover.classList.toggle('show');
        const searchInput = document.getElementById('model-search');
        if (searchInput) searchInput.value = "";
    }
});

document.addEventListener('click', (e) => {
    const popover = document.getElementById('model-popover');
    const trigger = document.getElementById('model-trigger');
    if (popover && !trigger?.contains(e.target) && !popover.contains(e.target)) {
        popover.classList.remove('show');
    }
});

function selectModel(id, name) {
    selection.modelId = id;
    selection.modelName = name;
    const modelSelectedText = document.getElementById('model-selected-text');
    if (modelSelectedText) modelSelectedText.innerText = name;
    document.getElementById('model-popover')?.classList.remove('show');
    loadYears(id);
}

// ═══════════════════════════════════════
// CARREGAR ANOS — com filtro de códigos inválidos (ex: 32000 Elétrico)
// ═══════════════════════════════════════
async function loadYears(modelId) {
    const selYear = document.getElementById('sel-year');
    if (!selYear) return;

    selYear.disabled = false;
    selYear.innerHTML = '<option>Carregando anos...</option>';

    try {
        const res = await fetch(
            `${API_BASE}/marcas/${selection.brandId}/modelos/${modelId}/anos`
        );
        const years = await res.json();

        if (!years.length) {
            selYear.innerHTML = '<option value="">Nenhum ano disponível</option>';
            return;
        }

        selYear.innerHTML = '<option value="">Selecione o Ano</option>';

        years.forEach(y => {
            // Filtra códigos inválidos como 32000 (código interno FIPE para elétrico sem ano real)
            // Mantém entradas cujo nome começa com 4 dígitos (ex: "2024 Elétrico" é válido)
            const codigoNumerico = parseInt(y.codigo);
            if (codigoNumerico > 9999 && !y.nome.match(/^\d{4}/)) return;

            const opt = document.createElement('option');
            opt.value = y.codigo;
            opt.textContent = y.nome;
            selYear.appendChild(opt);
        });

    } catch (error) {
        selYear.innerHTML = '<option value="">Erro ao carregar</option>';
        console.error("Erro ao carregar anos:", error);
    }
}

// ═══════════════════════════════════════
// SELEÇÃO DE ANO
// ═══════════════════════════════════════
document.getElementById('sel-year')?.addEventListener('change', (e) => {
    if (!e.target.value) return;

    selection.yearId = e.target.value;
    selection.yearName = e.target.options[e.target.selectedIndex].text;

    const full = `${selection.brandName} ${selection.modelName} (${selection.yearName})`;

    const confVehicleText = document.getElementById('conf-vehicle-text');
    if (confVehicleText) confVehicleText.innerText = full;

    document.getElementById('confirm-box')?.classList.remove('hidden');

    const drawerVehicle = document.getElementById('drawer-vehicle');
    if (drawerVehicle) drawerVehicle.innerText = full;

    setTimeout(() => {
        const kits = document.getElementById('kit-section');
        if (kits) kits.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
});

// ═══════════════════════════════════════
// CONTROLE DO DRAWER
// ═══════════════════════════════════════
window.selectKit = function (kitName, price) {
    if (!selection.yearId) {
        // Feedback inline — rola para o seletor e destaca brevemente
        const vehicleSelector = document.getElementById('vehicle-selector');
        if (vehicleSelector) {
            vehicleSelector.scrollIntoView({ behavior: 'smooth' });
            vehicleSelector.style.outline = '3px solid #16a34a';
            setTimeout(() => vehicleSelector.style.outline = '', 2000);
        }
        return;
    }

    const imgPath = kitName.toLowerCase().includes("porta malas")
        ? "./assets/kit-complete-BFARBGDS.jpg"
        : "./assets/kit-basic-Tk9H7iJ2.jpg";

    selection.kitName = kitName;
    selection.price = price;
    selection.image = imgPath;

    // Salva imediatamente ao selecionar o kit
    localStorage.setItem("checkout_selection", JSON.stringify(selection));

    const kitNameEl = document.getElementById('drawer-kit-name');
    const priceEl = document.getElementById('drawer-price');
    const imgEl = document.getElementById('drawer-kit-img');

    if (kitNameEl) kitNameEl.textContent = kitName;
    if (priceEl) priceEl.innerText = `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
    if (imgEl) imgEl.src = imgPath;

    openDrawer();
};

function openDrawer() {
    const drawer = document.getElementById('checkout-drawer');
    const sticky = document.getElementById('sticky-footer');
    if (drawer) {
        drawer.classList.remove('drawer-hidden');
        drawer.classList.add('drawer-open');
    }
    if (sticky) sticky.style.display = "none";
    document.body.style.overflow = 'hidden';
}

window.closeDrawer = function () {
    const drawer = document.getElementById('checkout-drawer');
    const sticky = document.getElementById('sticky-footer');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-hidden');
    }
    if (sticky) sticky.style.display = "block";
    document.body.style.overflow = '';
};

// ═══════════════════════════════════════
// REDIRECIONAMENTO
// ═══════════════════════════════════════
window.drawerConfirmPayment = () => {
    const btn = document.getElementById('drawer-pay-btn');

    if (!selection.kitName || !selection.price) {
        // Sem kit selecionado — fecha drawer e rola para seção de kits
        closeDrawer();
        setTimeout(() => {
            const kits = document.getElementById('kit-section');
            if (kits) kits.scrollIntoView({ behavior: 'smooth' });
        }, 300);
        return;
    }

    // Garante preço como número decimal limpo antes de passar na URL
    const priceNumeric = parseFloat(String(selection.price).replace(',', '.')).toFixed(2);

    const vehicle = `${selection.brandName} ${selection.modelName} (${selection.yearName})`;

    localStorage.setItem("checkout_selection", JSON.stringify(selection));

    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Encaminhando...';
        btn.disabled = true;
    }

    const params = new URLSearchParams({
        kit: selection.kitName,
        preco: priceNumeric,
        veiculo: vehicle,
        imagem: selection.image || ''
    });

    window.location.href = `dados-pagamento.html?${params.toString()}`;
};

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    initFipe();
});