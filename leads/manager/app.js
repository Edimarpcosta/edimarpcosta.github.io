/**
 * ============================================================================
 * LEADS MAKER MAPS - SALES PAGE & MULTI-PAYMENT CHECKOUT ENGINE
 * Suporte a:
 * - Multi-Planos: 6 Meses (R$ 47,90), Vitalício (R$ 99,90), Dev Teste (R$ 0,10)
 * - Múltiplas Licenças (1 a 5) com Desconto Progressivo (20%, 30%, 40%, 50%)
 * - Pagamento PIX com +10% OFF Adicional Instantâneo
 * - Pagamento no Cartão de Crédito em até 3x SEM JUROS
 * - Auto-format de Celular no modelo (19)9 1234-5678
 * - Validador Inteligente de E-mail com Verificação de Domínio MX via Google DNS
 * - Recuperação Automática de Chaves por E-mail
 * ============================================================================
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNbovL8ijHvHkHmwTAMGW1fomGEcpmXTdJGLB8114M0L1bcuMRqyvCyP0RU1252mECRw/exec';
const MP_PUBLIC_KEY = 'APP_USR-23492382-d2fd-4c69-8a2f-0123e4036d46';

// Planos Configurados
const PLANS = {
  semestral: {
    name: 'Acesso 6 Meses',
    price: 47.90,
    period: '6 meses de acesso'
  },
  vitalicio: {
    name: 'Acesso Vitalício',
    price: 99.90,
    period: 'Acesso vitalício sem expiração'
  },
  dev_test: {
    name: 'Licença Dev (Vitalícia)',
    price: 0.10,
    period: 'Acesso vitalício para testes'
  }
};

const QTY_DISCOUNTS = {
  1: { rate: 0.00, label: '1 Licença (Individual)' },
  2: { rate: 0.20, label: '2 Licenças (20% OFF)' },
  3: { rate: 0.30, label: '3 Licenças (30% OFF)' },
  4: { rate: 0.40, label: '4 Licenças (40% OFF)' },
  5: { rate: 0.50, label: '5 Licenças (50% OFF - Metade do Preço!)' }
};

// Dicionário de Typos Comuns em Provedores de E-mail
const COMMON_EMAIL_TYPOS = {
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.com.b': 'yahoo.com.br'
};

// Domínios de E-mail Descartáveis/Temporários Bloqueados
const DISPOSABLE_DOMAINS = [
  'tempmail.com', '10minutemail.com', 'mailinator.com', 'guerrillamail.com',
  'trashmail.com', 'yopmail.com', 'sharklasers.com', 'getnada.com',
  'dispostable.com', 'temp-mail.org', 'crazymailing.com', 'dropmail.me'
];

let selectedPlanKey = 'vitalicio'; // Default: Vitalício
let selectedQty = 1;               // Default: 1 Licença
let selectedMethod = 'pix';        // Default: PIX (+10% OFF)
let isEmailVerifiedValid = false;

document.addEventListener('DOMContentLoaded', () => {
  // Elementos de Planos e Quantidade
  const planCards = document.querySelectorAll('.plan-card');
  const qtyButtons = document.querySelectorAll('.qty-btn');
  const qtyDiscountBadge = document.getElementById('qty-discount-badge');
  const selectedPlanBadge = document.getElementById('checkout-selected-plan-badge');

  // Elementos das Abas de Pagamento
  const tabPix = document.getElementById('tab-pix');
  const tabCard = document.getElementById('tab-card');
  const cardFieldsContainer = document.getElementById('card-fields-container');

  // Elementos do Resumo do Pedido
  const summaryPlanText = document.getElementById('summary-plan-text');
  const summaryBasePrice = document.getElementById('summary-base-price');
  const rowQtyDiscount = document.getElementById('row-qty-discount');
  const summaryQtyLabel = document.getElementById('summary-qty-label');
  const summaryQtyVal = document.getElementById('summary-qty-val');
  const rowPixDiscount = document.getElementById('row-pix-discount');
  const summaryPixVal = document.getElementById('summary-pix-val');
  const summaryTotalPrice = document.getElementById('summary-total-price');
  const summaryInstallmentsHint = document.getElementById('summary-installments-hint');
  const btnSubmitPayment = document.getElementById('btn-submit-payment');
  const cardInstallmentsSelect = document.getElementById('card-installments');

  // Elementos do Form
  const form = document.getElementById('checkout-form');
  const payerNameInput = document.getElementById('payer-name');
  const payerEmailInput = document.getElementById('payer-email');
  const payerPhoneInput = document.getElementById('payer-phone');
  const emailFeedback = document.getElementById('email-validation-feedback');
  const pixContainer = document.getElementById('pix-container');
  const pixQrImg = document.getElementById('pix-qr-img');
  const pixCodeInput = document.getElementById('pix-code-input');
  const btnCopyPix = document.getElementById('btn-copy-pix');
  const pixStatusBadge = document.getElementById('pix-status-badge');

  // Elementos de Modal de Sucesso
  const successModal = document.getElementById('success-modal');
  const generatedPlanSpan = document.getElementById('generated-license-plan');
  const modalKeysContainer = document.getElementById('modal-keys-container');
  const btnCopyKey = document.getElementById('btn-copy-key');
  const btnDownloadExtension = document.getElementById('btn-download-extension');

  // Elementos de Recuperação
  const navBtnRecover = document.getElementById('nav-btn-recover');
  const linkOpenRecovery = document.getElementById('link-open-recovery');
  const recoveryModal = document.getElementById('recovery-modal');
  const btnCloseRecovery = document.getElementById('btn-close-recovery');
  const recoveryForm = document.getElementById('recovery-form');
  const recoveryEmailInput = document.getElementById('recovery-email-input');
  const btnSubmitRecovery = document.getElementById('btn-submit-recovery');
  const recoveryStatusMsg = document.getElementById('recovery-status-msg');

  // Elementos do Modo Desenvolvedor
  const btnToggleDev = document.getElementById('btn-toggle-dev');
  const devPasswordBox = document.getElementById('dev-password-box');
  const devPasswordInput = document.getElementById('dev-password-input');
  const btnUnlockDev = document.getElementById('btn-unlock-dev');
  const devPlanCard = document.getElementById('dev-plan-card');

  let pollingInterval = null;
  let currentPaymentId = null;
  let allGeneratedKeys = [];
  let emailCheckTimeout = null;

  // =========================================================================
  // 1. AUTO-FORMAT DE TELEFONE CELULAR NO MODELO (19)9 1234-5678
  // =========================================================================
  function formatCelular(val) {
    let digits = val.replace(/\D/g, '').substring(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 3) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2, 3)} ${digits.slice(3)}`;
    return `(${digits.slice(0, 2)})${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (payerPhoneInput) {
    payerPhoneInput.addEventListener('input', (e) => {
      const formatted = formatCelular(e.target.value);
      e.target.value = formatted;
    });

    payerPhoneInput.addEventListener('blur', (e) => {
      const digits = e.target.value.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 10) {
        payerPhoneInput.style.borderColor = '#ef4444';
      } else {
        payerPhoneInput.style.borderColor = '';
      }
    });
  }

  // =========================================================================
  // 2. VALIDADOR DE E-MAIL COM VERIFICAÇÃO DE DOMÍNIO MX VIA GOOGLE DNS
  // =========================================================================
  async function validateEmailAdvanced(email) {
    if (!email || !email.includes('@')) {
      return { valid: false, message: 'Digite um e-mail válido.' };
    }

    const clean = email.trim().toLowerCase();
    const parts = clean.split('@');
    if (parts.length !== 2) {
      return { valid: false, message: 'Formato de e-mail inválido.' };
    }

    const user = parts[0];
    const domain = parts[1];

    if (!user || user.length < 1 || !domain || domain.length < 3 || !domain.includes('.')) {
      return { valid: false, message: 'Domínio do e-mail incompleto.' };
    }

    // Nível 1: Regex RFC 5322
    const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!regex.test(clean)) {
      return { valid: false, message: 'Caracteres inválidos no e-mail.' };
    }

    // Nível 2: Detector de E-mails Temporários / Descartáveis
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return { valid: false, message: 'E-mails temporários/descartáveis não são permitidos para entrega de licenças.' };
    }

    // Nível 3: Detector de Typos
    if (COMMON_EMAIL_TYPOS[domain]) {
      const suggestedDomain = COMMON_EMAIL_TYPOS[domain];
      const suggestedEmail = `${user}@${suggestedDomain}`;
      return {
        valid: false,
        isTypo: true,
        suggestion: suggestedEmail,
        message: `Você quis dizer <strong>${suggestedEmail}</strong>?`
      };
    }

    // Nível 4: Verificação de Domínio MX via DNS over HTTPS (Google DoH)
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      const hasMx = data && data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;

      if (!hasMx) {
        // Tenta checar registro A se MX não responder explicitamente
        const resA = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
          headers: { 'Accept': 'application/json' }
        });
        const dataA = await resA.json();
        const hasA = dataA && dataA.Status === 0 && Array.isArray(dataA.Answer) && dataA.Answer.length > 0;

        if (!hasA) {
          return { valid: false, message: `O domínio <strong>@${domain}</strong> não existe na internet.` };
        }
      }
    } catch (netErr) {
      // Fallback em caso de erro na consulta de DNS (não bloqueia usuário)
      console.warn('DNS validation fallback:', netErr);
    }

    return { valid: true, message: 'E-mail válido e verificado!' };
  }

  // Listener em Tempo Real do E-mail
  if (payerEmailInput && emailFeedback) {
    payerEmailInput.addEventListener('input', () => {
      clearTimeout(emailCheckTimeout);
      const val = payerEmailInput.value.trim();

      if (!val || val.length < 5 || !val.includes('@')) {
        emailFeedback.style.display = 'none';
        payerEmailInput.style.borderColor = '';
        isEmailVerifiedValid = false;
        return;
      }

      emailFeedback.style.display = 'block';
      emailFeedback.style.color = '#9ca3af';
      emailFeedback.innerHTML = '🔍 Verificando domínio...';

      emailCheckTimeout = setTimeout(async () => {
        const result = await validateEmailAdvanced(val);

        if (result.valid) {
          emailFeedback.style.color = '#34d399';
          emailFeedback.innerHTML = '✅ E-mail válido e verificado!';
          payerEmailInput.style.borderColor = '#10b981';
          isEmailVerifiedValid = true;
        } else if (result.isTypo) {
          emailFeedback.style.color = '#fbbf24';
          emailFeedback.innerHTML = `⚠️ ${result.message} <button type="button" id="btn-fix-email" style="background: none; border: underline; color: #60a5fa; cursor: pointer; padding: 0 4px; font-weight: bold;">Corrigir</button>`;
          payerEmailInput.style.borderColor = '#f59e0b';
          isEmailVerifiedValid = false;

          const btnFix = document.getElementById('btn-fix-email');
          if (btnFix) {
            btnFix.addEventListener('click', () => {
              payerEmailInput.value = result.suggestion;
              payerEmailInput.dispatchEvent(new Event('input'));
            });
          }
        } else {
          emailFeedback.style.color = '#f87171';
          emailFeedback.innerHTML = `❌ ${result.message}`;
          payerEmailInput.style.borderColor = '#ef4444';
          isEmailVerifiedValid = false;
        }
      }, 400);
    });
  }

  // =========================================================================
  // 3. SELEÇÃO DE PLANOS E QUANTIDADE (1 A 5)
  // =========================================================================
  planCards.forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      selectedPlanKey = card.dataset.plan || 'vitalicio';
      updateCheckoutCalculations();
    });
  });

  qtyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      qtyButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedQty = parseInt(btn.dataset.qty, 10) || 1;
      updateCheckoutCalculations();
    });
  });

  // =========================================================================
  // 4. FORMAS DE PAGAMENTO (PIX VS CARTÃO)
  // =========================================================================
  if (tabPix && tabCard) {
    tabPix.addEventListener('click', () => {
      tabPix.classList.add('active');
      tabCard.classList.remove('active');
      selectedMethod = 'pix';
      if (cardFieldsContainer) cardFieldsContainer.style.display = 'none';
      updateCheckoutCalculations();
    });

    tabCard.addEventListener('click', () => {
      tabCard.classList.add('active');
      tabPix.classList.remove('active');
      selectedMethod = 'card';
      if (cardFieldsContainer) cardFieldsContainer.style.display = 'block';
      updateCheckoutCalculations();
    });
  }

  /**
   * Recalcula preços, descontos progressivos e parcelamento
   */
  function updateCheckoutCalculations() {
    const plan = PLANS[selectedPlanKey];
    const baseUnit = plan.price;
    const baseTotal = baseUnit * selectedQty;

    // Desconto por Quantidade
    const qtyInfo = QTY_DISCOUNTS[selectedQty] || { rate: 0, label: '' };
    const qtyDiscountRate = selectedPlanKey === 'dev_test' ? 0 : qtyInfo.rate;
    const qtyDiscountAmount = baseTotal * qtyDiscountRate;
    const cardTotal = Math.max(0.10, baseTotal - qtyDiscountAmount);

    // Desconto Extra do PIX (+10% OFF adicional)
    let pixDiscountAmount = 0;
    let finalTotal = cardTotal;
    if (selectedMethod === 'pix' && selectedPlanKey !== 'dev_test') {
      pixDiscountAmount = cardTotal * 0.10;
      finalTotal = Math.max(0.10, cardTotal - pixDiscountAmount);
    }

    if (qtyDiscountBadge) {
      qtyDiscountBadge.textContent = qtyInfo.label;
    }

    if (selectedPlanBadge) {
      selectedPlanBadge.textContent = `Plano: ${plan.name} (${selectedQty}x) — ${selectedMethod === 'pix' ? 'PIX +10% OFF' : 'Cartão até 3x s/ juros'}`;
    }

    if (summaryPlanText) {
      summaryPlanText.textContent = `${selectedQty}x ${plan.name}`;
    }

    if (summaryBasePrice) {
      summaryBasePrice.textContent = `R$ ${baseTotal.toFixed(2).replace('.', ',')}`;
    }

    if (rowQtyDiscount) {
      if (qtyDiscountAmount > 0) {
        rowQtyDiscount.style.display = 'flex';
        summaryQtyLabel.textContent = `Desconto por Quantidade (${(qtyDiscountRate * 100).toFixed(0)}% OFF):`;
        summaryQtyVal.textContent = `- R$ ${qtyDiscountAmount.toFixed(2).replace('.', ',')}`;
      } else {
        rowQtyDiscount.style.display = 'none';
      }
    }

    if (rowPixDiscount) {
      if (selectedMethod === 'pix' && pixDiscountAmount > 0) {
        rowPixDiscount.style.display = 'flex';
        summaryPixVal.textContent = `- R$ ${pixDiscountAmount.toFixed(2).replace('.', ',')}`;
      } else {
        rowPixDiscount.style.display = 'none';
      }
    }

    if (summaryTotalPrice) {
      summaryTotalPrice.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
    }

    if (summaryInstallmentsHint && cardInstallmentsSelect) {
      if (selectedMethod === 'card') {
        const p1 = cardTotal;
        const p2 = cardTotal / 2;
        const p3 = cardTotal / 3;

        summaryInstallmentsHint.style.display = 'block';
        summaryInstallmentsHint.textContent = `Ou em até 3x de R$ ${p3.toFixed(2).replace('.', ',')} SEM JUROS`;

        cardInstallmentsSelect.innerHTML = `
          <option value="1">1x de R$ ${p1.toFixed(2).replace('.', ',')} (Sem Juros)</option>
          <option value="2">2x de R$ ${p2.toFixed(2).replace('.', ',')} (Sem Juros)</option>
          <option value="3" selected>3x de R$ ${p3.toFixed(2).replace('.', ',')} (Sem Juros)</option>
          <option value="6">6x de R$ ${(cardTotal * 1.15 / 6).toFixed(2).replace('.', ',')} (com juros MP)</option>
          <option value="12">12x de R$ ${(cardTotal * 1.25 / 12).toFixed(2).replace('.', ',')} (com juros MP)</option>
        `;
      } else {
        summaryInstallmentsHint.style.display = 'none';
      }
    }

    if (btnSubmitPayment) {
      if (selectedMethod === 'pix') {
        btnSubmitPayment.textContent = `📱 Gerar QR Code PIX de R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
      } else {
        const installments = cardInstallmentsSelect ? cardInstallmentsSelect.value : '3';
        const installmentVal = cardTotal / parseInt(installments || '1', 10);
        btnSubmitPayment.textContent = `💳 Pagar R$ ${cardTotal.toFixed(2).replace('.', ',')} no Cartão (${installments}x de R$ ${installmentVal.toFixed(2).replace('.', ',')})`;
      }
    }

    return {
      baseTotal,
      cardTotal,
      finalTotal,
      qtyDiscountAmount,
      pixDiscountAmount
    };
  }

  updateCheckoutCalculations();

  // Máscaras de Cartão
  const cardNumberInput = document.getElementById('card-number');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 16);
      v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
      e.target.value = v;
    });
  }

  const cardExpirationInput = document.getElementById('card-expiration');
  if (cardExpirationInput) {
    cardExpirationInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
      e.target.value = v;
    });
  }

  const cardDocNumberInput = document.getElementById('card-doc-number');
  if (cardDocNumberInput) {
    cardDocNumberInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      e.target.value = v;
    });
  }

  // =========================================================================
  // 5. SUBMISSÃO DO CHECKOUT (PIX OU CARTÃO)
  // =========================================================================
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (payerNameInput ? payerNameInput.value : '').trim();
      const email = (payerEmailInput ? payerEmailInput.value : '').trim();
      const phone = (payerPhoneInput ? payerPhoneInput.value : '').trim();
      const devPassword = (selectedPlanKey === 'dev_test' && devPasswordInput) ? devPasswordInput.value.trim() : '';

      if (!name) {
        alert('Por favor, informe o seu nome.');
        if (payerNameInput) payerNameInput.focus();
        return;
      }

      // Validação profunda de e-mail antes do envio
      const emailCheck = await validateEmailAdvanced(email);
      if (!emailCheck.valid) {
        alert('Por favor, verifique o seu e-mail: ' + (emailCheck.message.replace(/<[^>]+>/g, '')));
        if (payerEmailInput) payerEmailInput.focus();
        return;
      }

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        alert('Por favor, informe um número de telefone/celular válido no modelo (19)9 1234-5678.');
        if (payerPhoneInput) payerPhoneInput.focus();
        return;
      }

      const calcs = updateCheckoutCalculations();

      // FLUXO PIX
      if (selectedMethod === 'pix') {
        btnSubmitPayment.disabled = true;
        btnSubmitPayment.textContent = 'Gerando QR Code PIX no Mercado Pago...';

        try {
          let createUrl = `${APPS_SCRIPT_URL}?action=create_pix&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(cleanPhone)}&amount=${calcs.finalTotal.toFixed(2)}&plan=${selectedPlanKey}&quantity=${selectedQty}`;
          
          if (selectedPlanKey === 'dev_test') {
            createUrl += `&dev_password=${encodeURIComponent(devPassword || '1ktn130534')}`;
          }

          let response = await fetch(createUrl, { method: 'GET', redirect: 'follow' });
          let data = await response.json();

          if (data && data.success && data.qr_code) {
            currentPaymentId = data.payment_id;

            if (data.qr_code_base64) {
              pixQrImg.src = `data:image/png;base64,${data.qr_code_base64}`;
            } else {
              pixQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.qr_code)}`;
            }

            pixCodeInput.value = data.qr_code;
            form.style.display = 'none';
            pixContainer.style.display = 'block';

            startPaymentPolling(currentPaymentId, email, cleanPhone, PLANS[selectedPlanKey].name);
          } else {
            alert(data.message || 'Erro ao gerar o QR Code no Mercado Pago.');
          }
        } catch (err) {
          console.error('Erro na chamada do Pix:', err);
          alert('Erro ao conectar ao servidor de pagamento.');
        } finally {
          btnSubmitPayment.disabled = false;
          updateCheckoutCalculations();
        }
      }

      // FLUXO CARTÃO
      else if (selectedMethod === 'card') {
        const rawCardNumber = (document.getElementById('card-number').value || '').replace(/\s/g, '');
        const cardHolder = document.getElementById('card-holder-name').value.trim();
        const expiration = document.getElementById('card-expiration').value.trim();
        const cvv = document.getElementById('card-cvv').value.trim();
        const docNumber = (document.getElementById('card-doc-number').value || '').replace(/\D/g, '');
        const installments = cardInstallmentsSelect.value || '3';

        if (!rawCardNumber || rawCardNumber.length < 13) {
          alert('Número do cartão inválido.');
          return;
        }
        if (!cardHolder) {
          alert('Informe o nome impresso no cartão.');
          return;
        }
        if (!expiration || !expiration.includes('/')) {
          alert('Validade do cartão inválida (formato MM/AA).');
          return;
        }
        if (!cvv || cvv.length < 3) {
          alert('Código de segurança (CVV) inválido.');
          return;
        }

        const [expMonth, expYearShort] = expiration.split('/');
        const expYear = expYearShort.length === 2 ? '20' + expYearShort : expYearShort;

        btnSubmitPayment.disabled = true;
        btnSubmitPayment.textContent = 'Processando cartão no Mercado Pago...';

        try {
          const tokenUrl = `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`;
          const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card_number: rawCardNumber,
              cardholder: {
                name: cardHolder,
                identification: {
                  type: 'CPF',
                  number: docNumber || '00000000000'
                }
              },
              expiration_month: parseInt(expMonth, 10),
              expiration_year: parseInt(expYear, 10),
              security_code: cvv
            })
          });

          const tokenData = await tokenRes.json();
          if (!tokenData.id) {
            throw new Error(tokenData.message || 'Falha ao validar os dados do cartão.');
          }

          const cardToken = tokenData.id;

          const payUrl = `${APPS_SCRIPT_URL}?action=create_card_payment&token=${encodeURIComponent(cardToken)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(cleanPhone)}&amount=${calcs.cardTotal.toFixed(2)}&plan=${selectedPlanKey}&quantity=${selectedQty}&installments=${installments}&doc_number=${encodeURIComponent(docNumber)}`;

          const payRes = await fetch(payUrl, { method: 'GET', redirect: 'follow' });
          const payResult = await payRes.json();

          if (payResult && payResult.success && payResult.status === 'approved') {
            showSuccessModal(payResult.licenseKeys || [payResult.licenseKey], PLANS[selectedPlanKey].name, payResult.downloadUrl);
          } else {
            alert(payResult.message || 'Pagamento não aprovado pela operadora do cartão.');
          }
        } catch (cardErr) {
          console.error('Erro ao processar cartão:', cardErr);
          alert('Erro ao processar o cartão: ' + cardErr.message);
        } finally {
          btnSubmitPayment.disabled = false;
          updateCheckoutCalculations();
        }
      }
    });
  }

  // =========================================================================
  // 6. MODAL DE SUCESSO COM MÚLTIPLAS CHAVES
  // =========================================================================
  function showSuccessModal(keys, planName, downloadUrl) {
    allGeneratedKeys = Array.isArray(keys) ? keys : [keys];

    if (generatedPlanSpan) {
      generatedPlanSpan.textContent = `${allGeneratedKeys.length}x ${planName}`;
    }

    if (modalKeysContainer) {
      modalKeysContainer.innerHTML = '';
      allGeneratedKeys.forEach((k, idx) => {
        const keyBox = document.createElement('div');
        keyBox.style.background = 'rgba(16, 185, 129, 0.1)';
        keyBox.style.border = '1px dashed #10b981';
        keyBox.style.borderRadius = '8px';
        keyBox.style.padding = '10px 14px';
        keyBox.style.display = 'flex';
        keyBox.style.justifyContent = 'space-between';
        keyBox.style.alignItems = 'center';
        keyBox.innerHTML = `
          <div>
            <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 700;">Licença ${idx + 1}:</div>
            <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #34d399;">${k}</span>
          </div>
          <button type="button" class="btn-copy-single" data-key="${k}" style="padding: 4px 10px; font-size: 11px; background: #059669; border: none; color: #fff; border-radius: 4px; cursor: pointer;">Copiar</button>
        `;
        modalKeysContainer.appendChild(keyBox);
      });

      document.querySelectorAll('.btn-copy-single').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.key);
          btn.textContent = 'Copiado!';
          setTimeout(() => btn.textContent = 'Copiar', 2000);
        });
      });
    }

    if (btnDownloadExtension && downloadUrl) {
      btnDownloadExtension.href = downloadUrl;
    }

    if (successModal) {
      successModal.style.display = 'flex';
    }
  }

  // Copiar todas as chaves
  if (btnCopyKey) {
    btnCopyKey.addEventListener('click', () => {
      const keysText = allGeneratedKeys.join('\n');
      navigator.clipboard.writeText(keysText);
      btnCopyKey.textContent = 'Todas as Chaves Copiadas!';
      btnCopyKey.style.background = '#10b981';
      setTimeout(() => {
        btnCopyKey.textContent = '📋 Copiar Chave(s)';
        btnCopyKey.style.background = '';
      }, 2000);
    });
  }

  // Copiar Pix Copia e Cola
  if (btnCopyPix) {
    btnCopyPix.addEventListener('click', () => {
      pixCodeInput.select();
      navigator.clipboard.writeText(pixCodeInput.value);
      btnCopyPix.textContent = 'Copiado!';
      btnCopyPix.style.background = '#10b981';
      setTimeout(() => {
        btnCopyPix.textContent = 'Copiar';
        btnCopyPix.style.background = '';
      }, 2000);
    });
  }

  // Polling de Pagamento Pix
  function startPaymentPolling(paymentId, email, phone, planName) {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
      try {
        const checkUrl = `${APPS_SCRIPT_URL}?action=check_payment&payment_id=${encodeURIComponent(paymentId)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone || '')}`;
        let res = await fetch(checkUrl, { method: 'GET', redirect: 'follow' });
        let result = await res.json();

        if (result && result.approved === true) {
          clearInterval(pollingInterval);

          pixStatusBadge.innerHTML = '🟢 <strong>PAGAMENTO APROVADO!</strong>';
          pixStatusBadge.style.background = '#dcfce7';
          pixStatusBadge.style.color = '#15803d';

          showSuccessModal(result.licenseKeys || [result.licenseKey], planName, result.downloadUrl);
        }
      } catch (e) {
        console.warn('Polling check error:', e);
      }
    }, 3500);
  }

  // =========================================================================
  // 7. MODAL DE RECUPERAÇÃO DE CHAVES
  // =========================================================================
  function openRecoveryModal(e) {
    if (e) e.preventDefault();
    if (recoveryModal) {
      recoveryModal.style.display = 'flex';
      if (recoveryStatusMsg) recoveryStatusMsg.style.display = 'none';
      if (recoveryEmailInput) recoveryEmailInput.focus();
    }
  }

  function closeRecoveryModal() {
    if (recoveryModal) recoveryModal.style.display = 'none';
  }

  if (navBtnRecover) navBtnRecover.addEventListener('click', openRecoveryModal);
  if (linkOpenRecovery) linkOpenRecovery.addEventListener('click', openRecoveryModal);
  if (btnCloseRecovery) btnCloseRecovery.addEventListener('click', closeRecoveryModal);

  if (recoveryForm) {
    recoveryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = recoveryEmailInput ? recoveryEmailInput.value.trim() : '';
      if (!email) return;

      btnSubmitRecovery.disabled = true;
      btnSubmitRecovery.textContent = 'Buscando suas licenças...';

      try {
        const url = `${APPS_SCRIPT_URL}?action=recover_license&email=${encodeURIComponent(email)}`;
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        const data = await res.json();

        if (recoveryStatusMsg) {
          recoveryStatusMsg.style.display = 'block';
          if (data && data.success) {
            recoveryStatusMsg.style.background = '#dcfce7';
            recoveryStatusMsg.style.color = '#15803d';
            recoveryStatusMsg.innerHTML = '✅ <strong>Sucesso!</strong> ' + (data.message || 'Chaves reenviadas.');
            recoveryForm.reset();
          } else {
            recoveryStatusMsg.style.background = '#fee2e2';
            recoveryStatusMsg.style.color = '#b91c1c';
            recoveryStatusMsg.innerHTML = '❌ ' + (data.message || 'Nenhuma licença ativa encontrada.');
          }
        }
      } catch (err) {
        if (recoveryStatusMsg) {
          recoveryStatusMsg.style.display = 'block';
          recoveryStatusMsg.style.background = '#fee2e2';
          recoveryStatusMsg.style.color = '#b91c1c';
          recoveryStatusMsg.innerHTML = '❌ Erro ao conectar ao servidor.';
        }
      } finally {
        btnSubmitRecovery.disabled = false;
        btnSubmitRecovery.textContent = 'Reenviar Chave(s) por E-mail';
      }
    });
  }

  // =========================================================================
  // 8. MODO DESENVOLVEDOR (SENHA MESTRA)
  // =========================================================================
  if (btnToggleDev) {
    btnToggleDev.addEventListener('click', (e) => {
      e.preventDefault();
      if (devPasswordBox) {
        devPasswordBox.style.display = devPasswordBox.style.display === 'none' || !devPasswordBox.style.display ? 'block' : 'none';
        if (devPasswordInput) devPasswordInput.focus();
      }
    });
  }

  if (btnUnlockDev) {
    btnUnlockDev.addEventListener('click', () => {
      const pwd = devPasswordInput ? devPasswordInput.value.trim() : '';
      if (pwd === '1ktn130534') {
        if (devPlanCard) {
          devPlanCard.style.display = 'flex';
          document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
          devPlanCard.classList.add('active');
        }
        selectedPlanKey = 'dev_test';
        if (devPasswordBox) devPasswordBox.style.display = 'none';
        updateCheckoutCalculations();
        alert('🎉 Modo Desenvolvedor Desbloqueado!');
      } else {
        alert('Senha incorreta.');
      }
    });
  }
});
