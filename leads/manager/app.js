/**
 * ============================================================================
 * LEADS MAKER MAPS - SALES PAGE & MULTI-PAYMENT CHECKOUT ENGINE
 * Suporte a:
 * - Multi-Planos: 6 Meses (R$ 47,90), Vitalício (R$ 99,90), Dev Teste (R$ 0,10)
 * - Múltiplas Licenças (1 a 5) com Desconto Progressivo (20%, 30%, 40%, 50%)
 * - Pagamento PIX com +10% OFF Adicional Instantâneo
 * - Pagamento no Cartão de Crédito em até 3x SEM JUROS
 * - Recuperação Automática de Chaves por E-mail
 * ============================================================================
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNbovL8ijHvHkHmwTAMGW1fomGEcpmXTdJGLB8114M0L1bcuMRqyvCyP0RU1252mECRw/exec';
const MP_PUBLIC_KEY = 'APP_USR-23492382-d2fd-4c69-8a2f-0123e4036d46';

// Inicializa SDK do Mercado Pago
let mp = null;
try {
  if (typeof MercadoPago !== 'undefined') {
    mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
  }
} catch (e) {
  console.warn('Mercado Pago SDK load warning:', e);
}

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

let selectedPlanKey = 'vitalicio'; // Default: Vitalício
let selectedQty = 1;               // Default: 1 Licença
let selectedMethod = 'pix';        // Default: PIX (+10% OFF)
let devUnlocked = false;

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

  // 1. Seleção de Plano
  planCards.forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      selectedPlanKey = card.dataset.plan || 'vitalicio';
      updateCheckoutCalculations();
    });
  });

  // 2. Seleção de Quantidade (1 a 5)
  qtyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      qtyButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedQty = parseInt(btn.dataset.qty, 10) || 1;
      updateCheckoutCalculations();
    });
  });

  // 3. Seleção de Forma de Pagamento (PIX vs Cartão)
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

    // Atualiza Badges e Labels
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

    // Linha de Desconto de Quantidade
    if (rowQtyDiscount) {
      if (qtyDiscountAmount > 0) {
        rowQtyDiscount.style.display = 'flex';
        summaryQtyLabel.textContent = `Desconto por Quantidade (${(qtyDiscountRate * 100).toFixed(0)}% OFF):`;
        summaryQtyVal.textContent = `- R$ ${qtyDiscountAmount.toFixed(2).replace('.', ',')}`;
      } else {
        rowQtyDiscount.style.display = 'none';
      }
    }

    // Linha de Desconto do PIX
    if (rowPixDiscount) {
      if (selectedMethod === 'pix' && pixDiscountAmount > 0) {
        rowPixDiscount.style.display = 'flex';
        summaryPixVal.textContent = `- R$ ${pixDiscountAmount.toFixed(2).replace('.', ',')}`;
      } else {
        rowPixDiscount.style.display = 'none';
      }
    }

    // Total
    if (summaryTotalPrice) {
      summaryTotalPrice.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
    }

    // Parcelamento em até 3x SEM JUROS no Cartão
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

    // Texto do Botão de Envio
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

  // Inicializa cálculos
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

  // 4. Submissão do Checkout Unificado (PIX ou Cartão)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('payer-name').value.trim();
      const email = document.getElementById('payer-email').value.trim();
      const phone = document.getElementById('payer-phone').value.trim();
      const devPassword = (selectedPlanKey === 'dev_test' && devPasswordInput) ? devPasswordInput.value.trim() : '';

      if (!email || !name) {
        alert('Por favor, preencha seu nome e e-mail.');
        return;
      }

      const calcs = updateCheckoutCalculations();

      // =======================================================================
      // FLUXO A: PAGAMENTO VIA PIX (+10% OFF)
      // =======================================================================
      if (selectedMethod === 'pix') {
        btnSubmitPayment.disabled = true;
        btnSubmitPayment.textContent = 'Gerando QR Code PIX no Mercado Pago...';

        try {
          let createUrl = `${APPS_SCRIPT_URL}?action=create_pix&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&amount=${calcs.finalTotal.toFixed(2)}&plan=${selectedPlanKey}&quantity=${selectedQty}`;
          
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

            startPaymentPolling(currentPaymentId, email, phone, PLANS[selectedPlanKey].name);
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

      // =======================================================================
      // FLUXO B: PAGAMENTO VIA CARTÃO DE CRÉDITO (Até 3x sem juros)
      // =======================================================================
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
          // 1. Gera Token Seguro de Cartão via API do Mercado Pago
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

          // 2. Envia Token para o Backend Apps Script processar
          const payUrl = `${APPS_SCRIPT_URL}?action=create_card_payment&token=${encodeURIComponent(cardToken)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&amount=${calcs.cardTotal.toFixed(2)}&plan=${selectedPlanKey}&quantity=${selectedQty}&installments=${installments}&doc_number=${encodeURIComponent(docNumber)}`;

          const payRes = await fetch(payUrl, { method: 'GET', redirect: 'follow' });
          const payResult = await payRes.json();

          if (payResult && payResult.success && payResult.status === 'approved') {
            // Pagamento Aprovado com Sucesso!
            showSuccessModal(payResult.licenseKeys || [payResult.licenseKey], PLANS[selectedPlanKey].name, payResult.downloadUrl);
          } else {
            alert(payResult.message || 'Pagamento recusado pela operadora do cartão.');
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

  // 5. Exibe Modal com Múltiplas Chaves de Licença
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

      // Listeners dos botões individuais de cópia
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

  // Polling de Aprovação do Pix
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

  // 6. Modal de Recuperação de Chaves
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

  // 7. Modo Desenvolvedor
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
        devUnlocked = true;
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
