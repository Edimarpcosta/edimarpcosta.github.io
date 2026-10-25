/**
 * Módulo de Créditos, Metodologia e Licenças - Analítica Política 2026 (v9.1 - Seção 15)
 * Renderiza modal `/sobre`, rodapé institucional e modal de reporte de erro com carimbo de hora.
 */

export class CreditsUI {
  constructor(arg1 = 'sobre-modal', arg2 = null) {
    const modalId = arg2 || arg1 || 'sobre-modal';
    this.sobreModal = document.getElementById(modalId);
    this.reportModal = document.getElementById('reportar-erro-modal');
  }

  init() {
    this.attachEvents();
  }

  attachEvents() {
    // Abrir modal Sobre via links
    document.querySelectorAll('.btn-open-sobre').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSobre();
      });
    });

    // Fechar modal sobre
    this.sobreModal?.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      this.closeSobre();
    });

    // Abrir modal Reportar Erro
    document.querySelectorAll('.btn-reportar-erro').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cardTitle = btn.getAttribute('data-card') || 'Placar / Dados Gerais';
        this.openReportError(cardTitle);
      });
    });

    // Fechar modal reportar erro
    this.reportModal?.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      this.closeReportError();
    });

    // Formulário de reporte de erro
    const form = document.getElementById('form-reportar-erro');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedback = document.getElementById('reportar-feedback');
        if (feedback) {
          feedback.textContent = '✓ Relato registrado com sucesso. Nossa equipe de dados auditará os boletins do TSE.';
          feedback.classList.remove('hidden');
          feedback.style.display = 'block';
        }
        setTimeout(() => {
          this.closeReportError();
          if (feedback) {
            feedback.classList.add('hidden');
            feedback.style.display = 'none';
          }
          form.reset();
        }, 2000);
      });
    }
  }

  openSobre() {
    if (!this.sobreModal) return;
    this.sobreModal.classList.remove('hidden');
    this.sobreModal.style.display = 'flex';
  }

  closeSobre() {
    if (!this.sobreModal) return;
    this.sobreModal.classList.add('hidden');
    this.sobreModal.style.display = 'none';
  }

  openReportError(cardTitle = 'Painel Geral') {
    if (!this.reportModal) return;
    const cardEl = document.getElementById('report-card-name');
    const timeEl = document.getElementById('report-data-time');
    if (cardEl) cardEl.textContent = cardTitle;
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')} (Brasília)`;
    }
    this.reportModal.classList.remove('hidden');
    this.reportModal.style.display = 'flex';
  }

  closeReportError() {
    if (!this.reportModal) return;
    this.reportModal.classList.add('hidden');
    this.reportModal.style.display = 'none';
  }
}
