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

// --- SELEÇÃO DE MARCA ---
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

function renderModels(list) {
    const container = document.getElementById('model-results');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(m => {
        const btn = document.createElement('button');
        btn.innerText = m.nome;
        btn.type = "button";
        btn.onclick = () => selectModel(m.codigo, m.nome);
        container.appendChild(btn);
    });
}

document.getElementById('model-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!window.allModels) return;
    const filtered = window.allModels.filter(m => m.nome.toLowerCase().includes(term));
    renderModels(filtered);
});

document.getElementById('model-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const popover = document.getElementById('model-popover');
    if (popover) {
        popover.classList.toggle('show');
        document.getElementById('model-search')?.focus();
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
    document.getElementById('confirm-box')?.classList.remove('hidden');
    const drawerVehicle = document.getElementById('drawer-vehicle');
    if (drawerVehicle) drawerVehicle.innerText = full;
});

// --- CONTROLE DO DRAWER (IMAGEM E PREÇO) ---
window.selectKit = function (kitName, price) {
    if (!selection.yearId) {
        alert("⚠️ Selecione seu veículo primeiro para garantir o encaixe perfeito!");
        document.getElementById('kit-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const kitNameEl = document.getElementById('drawer-kit-name');
    const priceEl = document.getElementById('drawer-price');
    const imgEl = document.getElementById('drawer-kit-img');

    if (kitNameEl) kitNameEl.textContent = kitName;

    if (priceEl) {
        priceEl.innerText = `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
    }

    if (imgEl) {
        if (kitName.toLowerCase().includes("porta malas")) {
            imgEl.src = "./assets/kit-complete-BFARBGDS.jpg";
        } else {
            imgEl.src = "./assets/kit-basic-Tk9H7iJ2.jpg";
        }
    }

    openDrawer();
};

function openDrawer() {
    const drawer = document.getElementById('checkout-drawer');
    if (drawer) {
        drawer.classList.remove('drawer-hidden');
        drawer.classList.add('drawer-visible');
    }
    document.body.style.overflow = 'hidden';
}

window.closeDrawer = function () {
    const drawer = document.getElementById('checkout-drawer');
    if (drawer) {
        drawer.classList.remove('drawer-visible');
        drawer.classList.add('drawer-hidden');
    }
    document.body.style.overflow = '';
};

// --- FUNÇÃO AUXILIAR: CAPTURA DADOS DO SEU FORMULÁRIO ---
function getFormCustomerData() {
    return {
        name: document.getElementById('nome')?.value || "",
        email: document.getElementById('email')?.value || "",
        cpf: document.getElementById('cpf')?.value?.replace(/\D/g, '') || "",
        cep: document.getElementById('cep')?.value || "",
        street: document.getElementById('rua')?.value || "",
        number: document.getElementById('numero')?.value || "",
        neighborhood: document.getElementById('bairro')?.value || "",
        city: document.getElementById('cidade')?.value || "",
        state: document.getElementById('uf')?.value || ""
    };
}

// --- INTEGRAÇÃO FINAL SYNCPAY (GERAÇÃO DE PIX) ---
window.drawerConfirmPayment = async () => {
    const btn = document.getElementById('drawer-pay-btn');
    const customer = getFormCustomerData();

    if (!customer.cpf || !customer.name || !customer.email) {
        alert("⚠️ Por favor, preencha seus dados de contato e endereço antes de finalizar.");
        return;
    }

    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando PIX...';
        btn.disabled = true;
    }

    const kitName = document.getElementById('drawer-kit-name')?.innerText || 'Kit Tapetes';
    const priceRaw = document.getElementById('drawer-price')?.innerText || '0,00';
    const priceCentavos = Math.round(parseFloat(priceRaw.replace('R$', '').replace('.', '').replace(',', '.').trim()) * 100);

    const payload = {
        amount: priceCentavos,
        payment_method: "pix",
        customer: {
            name: customer.name,
            email: customer.email,
            cpf_cnpj: customer.cpf
        },
        items: [{
            name: kitName,
            qty: 1,
            amount: priceCentavos
        }]
    };

    try {
        // Agora chamamos a nossa própria API na Vercel para evitar erro de CORS
        const response = await fetch("/api/gerar-pix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success || data.pix_qr_code) {
            renderPixResult(data.pix_qr_code, data.pix_code);
        } else {
            throw new Error(data.message || "Erro ao processar pagamento");
        }
    } catch (error) {
        console.error("Erro no processamento:", error);
        alert("Houve um erro ao gerar o PIX. Verifique os dados e tente novamente.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'FINALIZAR PAGAMENTO <i class="fas fa-arrow-right"></i>';
        }
    }
};

// --- RENDERIZA O RESULTADO DO PIX NO DRAWER ---
function renderPixResult(qrCode, copiaCola) {
    const drawerArea = document.querySelector('#checkout-drawer .padding-24') || document.getElementById('checkout-drawer');

    drawerArea.innerHTML = `
        <div style="text-align:center; padding: 10px; animation: fadeIn 0.5s ease;">
            <h3 style="color:#111; margin-bottom:15px;">Pague com PIX</h3>
            <div style="background:#fff; padding:10px; border:2px solid #22c55e; border-radius:12px; display:inline-block; margin-bottom:15px;">
                <img src="${qrCode}" style="width:200px; height:200px; display:block;">
            </div>
            <p style="font-size:12px; color:#666; margin-bottom:10px;">Escaneie o código ou copie a chave abaixo:</p>
            <input type="text" id="pixCopiaCola" value="${copiaCola}" readonly 
                style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:11px; text-align:center; background:#f9f9f9; margin-bottom:15px;">
            <button onclick="copyPixCode()" id="btnCopy" style="width:100%; padding:18px; background:#22c55e; color:#000; border:none; border-radius:12px; font-weight:900; cursor:pointer;">
                <i class="far fa-copy"></i> COPIAR CÓDIGO PIX
            </button>
            <p style="margin-top:15px; font-size:10px; color:#999;">A aprovação é imediata após o pagamento.</p>
        </div>
    `;
}

window.copyPixCode = function () {
    const input = document.getElementById('pixCopiaCola');
    input.select();
    navigator.clipboard.writeText(input.value);
    const btn = document.getElementById('btnCopy');
    btn.innerHTML = '<i class="fas fa-check"></i> COPIADO COM SUCESSO!';
    setTimeout(() => { btn.innerHTML = '<i class="far fa-copy"></i> COPIAR CÓDIGO PIX'; }, 3000);
};

window.onload = () => {
    initCarousel();
    initFipe();
    const timerDisplay = document.querySelector('#timer');
    if (timerDisplay) startTimer(15 * 60, timerDisplay);
};