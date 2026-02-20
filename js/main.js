import { carDatabase } from './car-data.js';

// --- State Management ---
const state = {
    selectedBrand: localStorage.getItem('selectedBrand') || '',
    selectedModel: localStorage.getItem('selectedModel') || '',
    checkoutStep: 0,
    basePrice: 387.90,
    shippingCost: 16.91, // Default SEDEX
    shippingMethod: 'sedex',
    customer: {},
    viewers: 12,
    offerEndTime: sessionStorage.getItem('offerEndTime') || null
};

// --- DOM Elements ---
const elements = {
    // Shared
    brandSearchInput: document.getElementById('brand-search'),
    brandSelect: document.getElementById('brand-list'),
    modelSelect: document.getElementById('model-select'),
    checkBtn: document.getElementById('check-btn'),
    availMsg: document.getElementById('availability-message'),

    // Checkout Modal
    checkoutModal: document.getElementById('checkout-modal'),
    step0Modal: document.getElementById('step-0-modal'),
    fullCheckoutContainer: document.getElementById('full-checkout-container'),

    // Step 0 Elements
    confirmModelName: document.getElementById('confirm-model-name'),

    // Form Inputs
    inputName: document.getElementById('name'),
    inputEmail: document.getElementById('email'),
    inputCpf: document.getElementById('cpf'),
    inputPhone: document.getElementById('phone'),
    inputCep: document.getElementById('cep'),
    shippingOptions: document.getElementById('shipping-options'),

    // Summary Elements
    sidebarCarModel: document.getElementById('sidebar-car-model'),
    summarySubtotal: document.getElementById('summary-subtotal'),
    summaryShipping: document.getElementById('summary-shipping'),
    summaryTotal: document.getElementById('summary-total'),
    finalPixPrice: document.getElementById('final-pix-price'),

    // Others
    checkoutForm: document.getElementById('checkout-multi-form'),
    mobileMenu: document.getElementById('mobile-menu'),
    viewerCount: document.getElementById('viewer-count'),
    timerEl: document.getElementById('timer'),
    burgerBtn: document.getElementById('menu-btn')
};

// --- Initialization ---
const init = () => {
    initUrgency();
    initCarSelector();
    initEventListeners();
    initMasks();
    initHeroSlider();
};

const initHeroSlider = () => {
    const slides = document.querySelectorAll('#hero-carousel img');
    let currentSlide = 0;

    if (slides.length > 0) {
        // Ensure first slide is visible
        slides[0].classList.remove('opacity-0');
        slides[0].classList.add('opacity-100');

        setInterval(() => {
            // Hide current
            slides[currentSlide].classList.remove('opacity-100');
            slides[currentSlide].classList.add('opacity-0');

            // Move to next
            currentSlide = (currentSlide + 1) % slides.length;

            // Show next
            slides[currentSlide].classList.remove('opacity-0');
            slides[currentSlide].classList.add('opacity-100');
        }, 5000); // Switch every 5 seconds
    }
};

// --- Checkout Logic (New) ---

// Open Step 0 (Pre-confirmation)
const openCheckoutModal = () => {
    elements.checkoutModal.classList.remove('hidden');
    elements.checkoutModal.classList.add('flex');

    // Show Step 0, Hide Full Checkout
    elements.step0Modal.classList.remove('hidden');
    elements.fullCheckoutContainer.classList.add('hidden');

    elements.confirmModelName.innerText = `${state.selectedBrand} ${state.selectedModel}`;
    state.checkoutStep = 0;
};

// State Machine for Steps
window.goToCheckoutStep = (step) => {
    state.checkoutStep = step;

    if (step === 1) {
        // Switch from Modal 0 to Full Checkout
        elements.step0Modal.classList.add('hidden');
        elements.fullCheckoutContainer.classList.remove('hidden');
        elements.fullCheckoutContainer.classList.add('flex');

        elements.sidebarCarModel.innerText = `${state.selectedBrand} ${state.selectedModel}`;
        updatePrices();
    }

    // Toggle Section Visibility
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${step}`).classList.remove('hidden');

    // Update Stepper UI
    document.querySelectorAll('.step-dot').forEach(el => {
        const dotStep = parseInt(el.dataset.step);
        if (dotStep <= step) {
            el.classList.add('bg-black', 'text-white');
            el.classList.remove('bg-gray-200', 'text-gray-500');
        } else {
            el.classList.remove('bg-black', 'text-white');
            el.classList.add('bg-gray-200', 'text-gray-500');
        }
    });

    if (step === 3) {
        startPaymentTimer();
    }
};

window.validateAndNext = (currentStep) => {
    if (currentStep === 1) {
        const valid = validateStep1();
        if (valid) goToCheckoutStep(2);
    } else if (currentStep === 2) {
        const valid = validateStep2();
        if (valid) goToCheckoutStep(3);
    }
};

// Step 1 Validation
const validateStep1 = () => {
    const name = elements.inputName.value.trim();
    const email = elements.inputEmail.value.trim();
    const cpf = elements.inputCpf.value.replace(/\D/g, '');
    const phone = elements.inputPhone.value.replace(/\D/g, '');

    if (name.length < 3) return alert('Por favor, digite seu nome completo.');
    if (!validateEmail(email)) return alert('Por favor, digite um e-mail válido.');
    if (cpf.length !== 11) return alert('Por favor, digite um CPF válido.');
    if (phone.length < 10) return alert('Por favor, digite um WhatsApp válido.');

    return true;
};

// Step 2 Logic & Validation
window.calculateShippingMock = () => {
    const cep = elements.inputCep.value.replace(/\D/g, '');
    if (cep.length === 8) {
        // Show options with Loading effect
        elements.shippingOptions.classList.remove('hidden');
        elements.shippingOptions.classList.add('animate-fade-in');

        // Fills address automatically (Mock)
        document.getElementById('address-street').value = "Av. Principal";
        document.getElementById('address-district').value = "Centro";
        document.getElementById('address-city').value = "São Paulo/SP";
    }
};

const validateStep2 = () => {
    const cep = elements.inputCep.value.replace(/\D/g, '');
    const number = document.getElementById('address-number').value;

    if (cep.length !== 8) return alert('Digite um CEP válido.');
    if (!number) return alert('Digite o número do endereço.');

    return true;
};

// Price & Shipping Logic
window.updateTotal = (shippingValue) => {
    state.shippingCost = parseFloat(shippingValue);
    updatePrices();
};

const updatePrices = () => {
    const subtotal = state.basePrice;
    const shipping = state.shippingCost;
    const total = subtotal + shipping;

    elements.summarySubtotal.innerText = formatCurrency(subtotal);
    elements.summaryShipping.innerText = shipping === 0 ? 'Grátis' : formatCurrency(shipping);
    elements.summaryTotal.innerText = formatCurrency(total);

    // PIX 5% discount
    const pixTotal = total * 0.95;
    if (elements.finalPixPrice) {
        elements.finalPixPrice.innerText = formatCurrency(pixTotal);
    }
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Payment Timer
let paymentTimerInterval;
const startPaymentTimer = () => {
    let timeLeft = 600; // 10 minutes
    const display = document.getElementById('payment-timer');

    clearInterval(paymentTimerInterval);
    paymentTimerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        display.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (--timeLeft < 0) {
            clearInterval(paymentTimerInterval);
            alert('O tempo de reserva expirou. Por favor, reinicie o processo.');
            closeCheckout();
        }
    }, 1000);
};

// Final Submission
elements.checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = elements.checkoutForm.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando PIX...';
    btn.disabled = true;

    // Webhook Payload structure
    const payload = {
        name: elements.inputName.value,
        email: elements.inputEmail.value,
        cpf: elements.inputCpf.value,
        phone: elements.inputPhone.value,
        car: `${state.selectedBrand} ${state.selectedModel}`,
        price: state.basePrice + state.shippingCost,
        type: 'PIX'
    };

    console.log("SENDING TO GATEWAY:", payload);

    setTimeout(() => {
        // Appmax Link or Success logic
        alert('Redirecionando para o Gateway Appmax...');
        window.location.href = "https://checkout.appmax.com.br/mock-checkout"; // Configurable
        btn.disabled = false;
    }, 1500);
});


// --- Standard Logic (Car Selector, etc) ---
const initCarSelector = () => {
    const brands = Object.keys(carDatabase).sort();
    const datalist = document.getElementById('brand-list');
    if (datalist) {
        datalist.innerHTML = '';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            datalist.appendChild(option);
        });
    }
};

const updateModels = (brand) => {
    elements.modelSelect.innerHTML = '<option value="">Selecione o Modelo</option>';
    elements.checkBtn.disabled = true;
    elements.modelSelect.disabled = !brand;

    if (brand && carDatabase[brand]) {
        carDatabase[brand].sort().forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            elements.modelSelect.appendChild(option);
        });
        elements.modelSelect.focus();
    }
};

const initEventListeners = () => {
    elements.brandSearchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (!val) return;

        // Case insensitive search for brand key
        const brandKey = Object.keys(carDatabase).find(key => key.toLowerCase() === val.toLowerCase());

        if (brandKey) {
            state.selectedBrand = brandKey;
            localStorage.setItem('selectedBrand', brandKey);
            // Update input to match case correctly if desired, or just use the key for logic
            // e.target.value = brandKey; 
            updateModels(brandKey);
        }
    });

    elements.modelSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            state.selectedModel = e.target.value;
            localStorage.setItem('selectedModel', e.target.value);
            elements.checkBtn.disabled = false;
        }
    });

    document.getElementById('filter-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = elements.checkBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando Estoque...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;

            // Availability Message
            elements.availMsg.innerHTML = `<div class="flex items-center justify-center gap-2"><i class="fas fa-check-circle text-xl"></i> <span>Modelo <strong>${state.selectedBrand} ${state.selectedModel}</strong> disponível!</span></div>`;
            elements.availMsg.classList.remove('hidden');
            elements.availMsg.className = "mt-4 p-4 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg text-center animate-fade-in";
            elements.availMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

            setTimeout(() => {
                openCheckoutModal(); // Logic Entry Point
            }, 800);
        }, 1000);
    });

    elements.burgerBtn.addEventListener('click', () => {
        elements.mobileMenu.classList.toggle('hidden');
    });

    window.closeCheckout = () => {
        elements.checkoutModal.classList.add('hidden');
        elements.checkoutModal.classList.remove('flex');
    };
};

// Input Masks
const initMasks = () => {
    elements.inputCpf.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
    });
    elements.inputPhone.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? '-' + x[3] : ''}`;
    });
    elements.inputCep.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    });
};

const initUrgency = () => {
    // ... existing urgency logic
    // Viewer Count
    setInterval(() => {
        const change = Math.floor(Math.random() * 3) - 1;
        state.viewers = Math.max(8, Math.min(45, state.viewers + change));
        elements.viewerCount.innerText = state.viewers;
    }, 4000);

    // Timer
    if (!state.offerEndTime) {
        state.offerEndTime = new Date().getTime() + 15 * 60 * 1000;
        sessionStorage.setItem('offerEndTime', state.offerEndTime);
    }

    setInterval(() => {
        const now = new Date().getTime();
        let distance = state.offerEndTime - now;

        if (distance < 0) {
            state.offerEndTime = new Date().getTime() + 15 * 60 * 1000; // Reset
            sessionStorage.setItem('offerEndTime', state.offerEndTime);
            distance = state.offerEndTime - now;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        elements.timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
