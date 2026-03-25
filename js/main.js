const API_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

window.selection = window.selection || {
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
let carouselInterval = null;
let allModels = [];
let currentBrandRequest = null;
let currentYearRequest = null;

const SUPPORT_WHATSAPP = 'https://wa.me/5574999859221?text=Ol%C3%A1!%20N%C3%A3o%20encontrei%20meu%20carro%20na%20lista%20de%20modelos.';

const PRIORITY_BRANDS = [
    'Volkswagen',
    'Chevrolet',
    'Fiat',
    'Toyota',
    'Hyundai',
    'Honda',
    'Ford',
    'Renault',
    'Jeep',
    'Nissan',
    'Peugeot',
    'Citroën',
    'Citroen',
    'BYD',
    'Kia',
    'Mitsubishi',
    'Audi',
    'BMW',
    'Mercedes-Benz',
    'Volvo',
    'Chery',
    'CAOA Chery'
];

function byId(id) {
    return document.getElementById(id);
}

function setText(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
}

function setHtml(id, html) {
    const el = byId(id);
    if (el) el.innerHTML = html;
}

function showElement(id) {
    byId(id)?.classList.remove('hidden');
}

function hideElement(id) {
    byId(id)?.classList.add('hidden');
}

function scrollToElement(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pulseOutline(el, color = '#16a34a') {
    if (!el) return;
    el.style.outline = `3px solid ${color}`;
    el.style.outlineOffset = '4px';
    setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
    }, 1800);
}

function normalizePrice(value) {
    if (typeof value === 'number') return value.toFixed(2);
    return parseFloat(String(value).replace(',', '.')).toFixed(2);
}

function getVehicleLabel() {
    if (!selection.brandName || !selection.modelName || !selection.yearName) return '';
    return `${selection.brandName} ${selection.modelName} (${selection.yearName})`;
}

function normalizeBrandName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
}

function sortBrandsByPriority(brands) {
    const priorityIndex = new Map(
        PRIORITY_BRANDS.map((name, index) => [normalizeBrandName(name), index])
    );

    return [...brands].sort((a, b) => {
        const aIndex = priorityIndex.get(normalizeBrandName(a.nome));
        const bIndex = priorityIndex.get(normalizeBrandName(b.nome));

        const aIsPriority = Number.isInteger(aIndex);
        const bIsPriority = Number.isInteger(bIndex);

        if (aIsPriority && bIsPriority) return aIndex - bIndex;
        if (aIsPriority) return -1;
        if (bIsPriority) return 1;

        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
}

function sortYears(list) {
    return [...list].sort((a, b) => {
        const aYear = parseInt(String(a.nome).match(/^\d{4}/)?.[0] || '0', 10);
        const bYear = parseInt(String(b.nome).match(/^\d{4}/)?.[0] || '0', 10);
        return bYear - aYear;
    });
}

function persistSelection() {
    try {
        localStorage.setItem('landing_selection', JSON.stringify(selection));
    } catch (error) {
        console.warn('Não foi possível salvar a seleção localmente.', error);
    }
}

function getKitCards() {
    return [...document.querySelectorAll('.kit-card')];
}

function getKitButtons() {
    return [...document.querySelectorAll('.kit-buy-btn')];
}

function getKitNameFromCard(card) {
    return card?.querySelector('h5')?.textContent?.trim() || 'Kit';
}

function injectStoreUxStyles() {
    if (byId('runtime-store-ux-styles')) return;

    const style = document.createElement('style');
    style.id = 'runtime-store-ux-styles';
    style.textContent = `
        .kit-card-locked {
            opacity: .92;
        }

        .kit-card-ready {
            border-color: rgba(26, 158, 74, 0.42) !important;
            box-shadow:
                0 0 0 2px rgba(26, 158, 74, 0.09),
                0 18px 34px rgba(12, 18, 13, 0.08) !important;
        }

        .kit-card-picked {
            border-color: #1a9e4a !important;
            box-shadow:
                0 0 0 3px rgba(26, 158, 74, 0.16),
                0 18px 38px rgba(26, 158, 74, 0.12) !important;
            transform: translateY(-2px);
        }

        .confirm-box-live {
            animation: confirmPulse .75s ease;
        }

        @keyframes confirmPulse {
            0% {
                transform: scale(.985);
                box-shadow: 0 0 0 0 rgba(26, 158, 74, 0);
            }
            60% {
                transform: scale(1.01);
                box-shadow: 0 0 0 10px rgba(26, 158, 74, 0.04);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(26, 158, 74, 0);
            }
        }
    `;
    document.head.appendChild(style);
}

function setKitButtonLabel(button, text) {
    if (!button) return;
    button.innerHTML = `<i class="fas fa-cart-shopping"></i>${text}`;
}

function updateStickyCta() {
    const btn = byId('sticky-buy-btn');
    if (!btn) return;

    const label = btn.querySelector('span');
    if (!label) return;

    if (selection.yearId) {
        label.textContent = 'Escolher kit para meu carro';
    } else {
        label.textContent = 'Ver molde do meu carro';
    }
}

function updateStorePresentation() {
    const panelTitle = document.querySelector('.buy-panel-title h3');
    const helperLine = document.querySelector('.helper-line');
    const confirmBox = byId('confirm-box');
    const confirmPrompt = confirmBox?.querySelector('.confirm-kit-prompt');
    const confirmDescription = confirmBox?.querySelector('.confirm-top div span');
    const kitSection = byId('kit-section');

    const vehicleReady = !!selection.yearId;
    const vehicleLabel = getVehicleLabel();

    if (panelTitle) {
        panelTitle.textContent = vehicleReady
            ? 'Escolha o kit do seu carro'
            : 'Selecione seu carro e escolha o kit';
    }

    if (helperLine) {
        helperLine.innerHTML = vehicleReady
            ? `Molde identificado para <strong>${vehicleLabel}</strong>. Agora escolha o kit logo abaixo.`
            : `Aqui o lead não precisa “entender demais” a página: ele escolhe <strong>marca</strong>, <strong>modelo</strong>, <strong>ano</strong> e já vê os kits no mesmo bloco.`;
    }

    if (confirmPrompt) {
        confirmPrompt.innerHTML = vehicleReady
            ? `<i class="fas fa-check-circle"></i> pronto para comprar`
            : `<i class="fas fa-circle-info"></i> selecione o veículo`;
    }

    if (confirmDescription) {
        confirmDescription.textContent = vehicleReady
            ? 'Seu carro foi reconhecido. Agora escolha o kit logo abaixo.'
            : 'Selecione marca, modelo e ano para liberar os kits.';
    }

    getKitCards().forEach((card) => {
        card.classList.remove('kit-card-picked');

        if (vehicleReady) {
            card.classList.add('kit-card-ready');
            card.classList.remove('kit-card-locked');
        } else {
            card.classList.remove('kit-card-ready');
            card.classList.add('kit-card-locked');
        }
    });

    getKitButtons().forEach((button) => {
        const card = button.closest('.kit-card');
        const kitName = getKitNameFromCard(card);

        if (vehicleReady) {
            setKitButtonLabel(button, `Comprar ${kitName.toLowerCase()}`);
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        } else {
            setKitButtonLabel(button, 'Selecionar carro acima');
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        }
    });

    if (kitSection) {
        kitSection.style.scrollMarginTop = '130px';
    }
}

function pulseKitSection() {
    const kitSection = byId('kit-section');
    if (!kitSection) return;

    pulseOutline(kitSection, '#1a9e4a');

    const rect = kitSection.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.top <= (window.innerHeight - 160);

    if (!isVisible && window.innerWidth < 980) {
        setTimeout(() => {
            scrollToElement(kitSection);
        }, 180);
    }
}

function markPickedKit(kitName) {
    getKitCards().forEach((card) => {
        const name = getKitNameFromCard(card).toLowerCase();
        const isPicked = name.includes(kitName.toLowerCase());

        card.classList.toggle('kit-card-picked', isPicked);
    });
}

function resetModelUi() {
    const trigger = byId('model-trigger');
    const searchInput = byId('model-search');

    if (trigger) trigger.disabled = !selection.brandId;
    setText('model-selected-text', selection.brandId ? 'Selecione o Modelo' : 'Selecione primeiro a Marca');
    if (searchInput) searchInput.value = '';
    byId('model-popover')?.classList.remove('show');

    const results = byId('model-results');
    if (results) results.innerHTML = '';
}

function resetYearUi(message = 'Selecione o Ano') {
    const year = byId('sel-year');
    if (!year) return;
    year.disabled = true;
    year.innerHTML = `<option value="">${message}</option>`;
}

function clearVehicleConfirmation() {
    hideElement('confirm-box');
    setText('conf-vehicle-text', '');
}

function resetSelectionFrom(step) {
    if (step === 'brand') {
        selection.brandId = '';
        selection.brandName = '';
    }

    if (step === 'brand' || step === 'model') {
        selection.modelId = '';
        selection.modelName = '';
        allModels = [];
        resetModelUi();
    }

    if (step === 'brand' || step === 'model' || step === 'year') {
        selection.yearId = '';
        selection.yearName = '';
        resetYearUi(step === 'brand' ? 'Selecione primeiro a Marca' : 'Selecione o Ano');
        clearVehicleConfirmation();
    }

    selection.kitName = '';
    selection.price = '';
    selection.image = '';

    persistSelection();
    updateStickyCta();
    updateStorePresentation();
}

function renderModelError() {
    setHtml(
        'model-results',
        `<div style="padding:12px; font-size:13px; color:#6b7280; line-height:1.5;">
            Não foi possível carregar os modelos agora.<br>
            <a href="${SUPPORT_WHATSAPP}" target="_blank" rel="noopener noreferrer" style="color:#16a34a; font-weight:700; text-decoration:none;">Falar com o suporte</a>
        </div>`
    );
}

function renderYearError() {
    const year = byId('sel-year');
    if (!year) return;
    year.disabled = false;
    year.innerHTML = '<option value="">Erro ao carregar anos</option>';
}

function renderModels(list) {
    const container = byId('model-results');
    if (!container) return;

    container.innerHTML = '';

    if (!list.length) {
        container.innerHTML = '<p style="padding:10px; color:#9ca3af; font-size:13px;">Nenhum modelo encontrado</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach((model) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = model.nome;
        btn.addEventListener('click', () => selectModel(model.codigo, model.nome));
        fragment.appendChild(btn);
    });

    container.appendChild(fragment);
}

function toggleModelPopover(forceOpen = null) {
    const popover = byId('model-popover');
    const searchInput = byId('model-search');
    if (!popover) return;

    const willOpen = forceOpen === null ? !popover.classList.contains('show') : forceOpen;
    popover.classList.toggle('show', willOpen);

    if (willOpen) {
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        renderModels(allModels);
    }
}

function selectModel(id, name) {
    selection.modelId = id;
    selection.modelName = name;
    selection.yearId = '';
    selection.yearName = '';

    setText('model-selected-text', name);
    toggleModelPopover(false);
    clearVehicleConfirmation();
    persistSelection();
    updateStickyCta();
    updateStorePresentation();
    loadYears(id);
}

async function initCarousel() {
    const container = byId('hero-carousel');
    const slides = document.querySelectorAll('.hero-slide-img');
    const dotsContainer = byId('carousel-dots');

    if (!container || slides.length === 0) return;

    if (carouselInterval) clearInterval(carouselInterval);

    let currentSlide = 0;

    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', `Ir para imagem ${index + 1}`);
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '999px';
            dot.style.border = 'none';
            dot.style.cursor = 'pointer';
            dot.style.background = index === 0 ? 'var(--green)' : 'rgba(255,255,255,0.35)';
            dot.style.transition = 'all .2s ease';
            dot.addEventListener('click', () => goToSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    function updateDots() {
        if (!dotsContainer) return;
        [...dotsContainer.children].forEach((dot, index) => {
            dot.style.background = index === currentSlide ? 'var(--green)' : 'rgba(255,255,255,0.35)';
            dot.style.transform = index === currentSlide ? 'scale(1.15)' : 'scale(1)';
        });
    }

    function goToSlide(index) {
        currentSlide = index;
        container.scrollTo({
            left: container.offsetWidth * currentSlide,
            behavior: 'smooth'
        });
        updateDots();
    }

    carouselInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        goToSlide(currentSlide);
    }, 4000);

    container.addEventListener('mouseenter', () => clearInterval(carouselInterval));
    container.addEventListener('mouseleave', () => {
        clearInterval(carouselInterval);
        carouselInterval = setInterval(() => {
            currentSlide = (currentSlide + 1) % slides.length;
            goToSlide(currentSlide);
        }, 4000);
    });

    updateDots();
}

async function initFipe() {
    const selBrand = byId('sel-brand');
    if (!selBrand) return;

    selBrand.innerHTML = '<option value="">Carregando marcas...</option>';
    selBrand.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/marcas`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const brands = await response.json();

        selBrand.innerHTML = '<option value="">Selecione a Marca</option>';
        selBrand.disabled = false;

        sortBrandsByPriority(brands).forEach((brand) => {
            const opt = document.createElement('option');
            opt.value = brand.codigo;
            opt.textContent = brand.nome;
            selBrand.appendChild(opt);
        });
    } catch (error) {
        selBrand.innerHTML = '<option value="">Erro ao carregar marcas</option>';
        selBrand.disabled = false;
        console.error('Erro FIPE:', error);
    }
}

async function handleBrandChange(event) {
    const id = event.target.value;
    const label = byId('model-selected-text');

    resetSelectionFrom('model');
    selection.brandId = id;
    selection.brandName = id ? event.target.options[event.target.selectedIndex].text : '';

    if (!id) {
        resetSelectionFrom('brand');
        setText('model-selected-text', 'Selecione primeiro a Marca');
        return;
    }

    const trigger = byId('model-trigger');
    if (trigger) trigger.disabled = false;
    if (label) label.textContent = 'Carregando modelos...';
    setHtml('model-results', '<p style="padding:10px; color:#9ca3af; font-size:13px;">Buscando modelos...</p>');

    try {
        currentBrandRequest?.abort?.();
        currentBrandRequest = new AbortController();

        const res = await fetch(`${API_BASE}/marcas/${id}/modelos`, {
            signal: currentBrandRequest.signal
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        allModels = [...(data.modelos || [])].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        );

        renderModels(allModels);
        setText('model-selected-text', 'Selecione o Modelo');
        persistSelection();
        updateStorePresentation();
    } catch (error) {
        if (error.name === 'AbortError') return;
        setText('model-selected-text', 'Erro ao carregar modelos');
        renderModelError();
        console.error('Erro ao buscar modelos:', error);
    }
}

function handleModelSearch(event) {
    const term = event.target.value.trim().toLowerCase();

    if (!allModels.length) {
        renderModels([]);
        return;
    }

    if (!term) {
        renderModels(allModels);
        return;
    }

    const filtered = allModels.filter((model) => model.nome.toLowerCase().includes(term));
    renderModels(filtered);
}

async function loadYears(modelId) {
    const selYear = byId('sel-year');
    if (!selYear) return;

    selYear.disabled = true;
    selYear.innerHTML = '<option value="">Carregando anos...</option>';

    try {
        currentYearRequest?.abort?.();
        currentYearRequest = new AbortController();

        const res = await fetch(`${API_BASE}/marcas/${selection.brandId}/modelos/${modelId}/anos`, {
            signal: currentYearRequest.signal
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const years = await res.json();
        const validYears = sortYears(years).filter((year) => /^\d{4}/.test(year.nome));

        selYear.disabled = false;

        if (!validYears.length) {
            selYear.innerHTML = '<option value="">Nenhum ano disponível</option>';
            return;
        }

        selYear.innerHTML = '<option value="">Selecione o Ano</option>';

        validYears.forEach((year) => {
            const opt = document.createElement('option');
            opt.value = year.codigo;
            opt.textContent = year.nome;
            selYear.appendChild(opt);
        });
    } catch (error) {
        if (error.name === 'AbortError') return;
        renderYearError();
        console.error('Erro ao carregar anos:', error);
    }
}

function handleYearChange(event) {
    if (!event.target.value) {
        resetSelectionFrom('year');
        return;
    }

    selection.yearId = event.target.value;
    selection.yearName = event.target.options[event.target.selectedIndex].text;

    const full = getVehicleLabel();
    const confirmBox = byId('confirm-box');

    setText('conf-vehicle-text', full);
    showElement('confirm-box');

    if (confirmBox) {
        confirmBox.classList.remove('confirm-box-live');
        void confirmBox.offsetWidth;
        confirmBox.classList.add('confirm-box-live');
    }

    persistSelection();
    updateStickyCta();
    updateStorePresentation();

    setTimeout(() => {
        pulseKitSection();
    }, 200);
}

window.safeTrackAddToCart = function safeTrackAddToCart(contentName, value) {
    try {
        if (typeof window.fbq === 'function') {
            window.fbq('track', 'AddToCart', {
                content_name: contentName,
                value,
                currency: 'BRL'
            });
        }
    } catch (error) {
        console.warn('Pixel AddToCart falhou, mas a navegação continua.', error);
    }
};

window.selectKit = function selectKit(kitName, price) {
    if (!selection.yearId) {
        const vehicleSelector = byId('vehicle-selector');
        const helperLine = document.querySelector('.helper-line');

        if (helperLine) {
            helperLine.innerHTML = `Antes de escolher o kit, selecione <strong>marca</strong>, <strong>modelo</strong> e <strong>ano</strong> do veículo.`;
        }

        scrollToElement(vehicleSelector || byId('comprar'));
        pulseOutline(vehicleSelector, '#16a34a');
        return;
    }

    const imgPath = kitName.toLowerCase().includes('completo')
        ? './assets/kit-complete-BFARBGDS.jpg'
        : './assets/kit-basic-Tk9H7iJ2.jpg';

    selection.kitName = kitName;
    selection.price = price;
    selection.image = imgPath;

    persistSelection();
    updateStorePresentation();
    markPickedKit(kitName);

    try {
        localStorage.setItem('checkout_selection', JSON.stringify(selection));
    } catch (error) {
        console.warn('Não foi possível salvar checkout_selection.', error);
    }

    const btns = getKitButtons();
    btns.forEach((btn) => {
        btn.disabled = true;
        btn.style.opacity = '0.75';
        btn.style.cursor = 'wait';
    });

    const params = new URLSearchParams({
        kit: kitName,
        preco: normalizePrice(price),
        veiculo: getVehicleLabel(),
        imagem: imgPath
    });

    setTimeout(() => {
        window.location.href = `dados-pagamento.html?${params.toString()}`;
    }, 120);
};

window.closeDrawer = function closeDrawer() {
    const drawer = byId('checkout-drawer');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-hidden');
    }
    document.body.style.overflow = '';
};

window.drawerConfirmPayment = () => { };

function stickyBuyClick() {
    if (!selection.yearId) {
        scrollToElement(byId('comprar'));
        pulseOutline(byId('vehicle-selector'));
        return;
    }

    pulseKitSection();
}
window.stickyBuyClick = stickyBuyClick;

function bindEvents() {
    byId('sel-brand')?.addEventListener('change', handleBrandChange);
    byId('model-search')?.addEventListener('input', handleModelSearch);

    byId('model-trigger')?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!selection.brandId) return;
        toggleModelPopover();
    });

    document.addEventListener('click', (event) => {
        const popover = byId('model-popover');
        const trigger = byId('model-trigger');
        if (popover && !trigger?.contains(event.target) && !popover.contains(event.target)) {
            toggleModelPopover(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') toggleModelPopover(false);
    });

    byId('sel-year')?.addEventListener('change', handleYearChange);
}

function boot() {
    injectStoreUxStyles();
    bindEvents();
    initCarousel();
    initFipe();
    updateStickyCta();
    resetYearUi('Selecione primeiro a Marca');
    setText('model-selected-text', 'Selecione primeiro a Marca');
    updateStorePresentation();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}