/**
 * JAVASCRIPT CONTROLLER - LANDING PAGE PROJETO VIDA AMERICANA (sobre.js)
 * Interações de menu, cópia de chave PIX, lightbox de galeria e contadores.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initCopyPix();
  initLightbox();
  initStatsCounters();
  initContactForm();
});

/**
 * Menu Mobile
 */
function initMobileMenu() {
  const btnToggle = document.getElementById('btn-mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (btnToggle && navMenu) {
    btnToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = btnToggle.querySelector('i');
      if (icon) {
        if (navMenu.classList.contains('open')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        } else {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      }
    });

    // Fecha o menu ao clicar em qualquer link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const icon = btnToggle.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      });
    });
  }
}

/**
 * Cópia de Chave PIX com 1 Clique
 */
function initCopyPix() {
  const btnCopy = document.getElementById('btn-copy-pix');
  const pixKeyText = document.getElementById('pix-key-val');

  if (btnCopy && pixKeyText) {
    btnCopy.addEventListener('click', async () => {
      const key = pixKeyText.innerText.trim();
      try {
        await navigator.clipboard.writeText(key);
        showToastNotice('Chave PIX copiada com sucesso! Obrigado por apoiar.');
        btnCopy.innerHTML = '<i class="fas fa-check mr-1"></i> Copiado!';
        setTimeout(() => {
          btnCopy.innerHTML = '<i class="fas fa-copy mr-1"></i> Copiar Chave';
        }, 3000);
      } catch (err) {
        // Fallback antigo
        const temp = document.createElement('textarea');
        temp.value = key;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToastNotice('Chave PIX copiada!');
      }
    });
  }
}

/**
 * Lightbox para a Galeria de Fotos
 */
function initLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const btnClose = document.getElementById('lightbox-close');

  if (!modal || !modalImg) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('.gallery-img');
      if (img) {
        modalImg.src = img.src;
        modal.classList.add('active');
      }
    });
  });

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
}

/**
 * Contadores Animados para Estatísticas
 */
function initStatsCounters() {
  const counters = document.querySelectorAll('.stat-number');
  let animated = false;

  const animateCounters = () => {
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-target');
      const prefix = counter.getAttribute('data-prefix') || '';
      const suffix = counter.getAttribute('data-suffix') || '';
      let count = 0;
      const speed = 25;
      const step = Math.max(1, Math.ceil(target / 60));

      const updateCount = () => {
        count += step;
        if (count < target) {
          counter.innerText = `${prefix}${count}${suffix}`;
          setTimeout(updateCount, speed);
        } else {
          counter.innerText = `${prefix}${target}${suffix}`;
        }
      };
      updateCount();
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.5 });

  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    observer.observe(statsSection);
  }
}

/**
 * Formulário de Contato e Voluntariado
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('contact-name').value;
      showToastNotice(`Obrigado, ${nome}! Sua mensagem foi enviada. Entraremos em contato em breve.`);
      form.reset();
    });
  }
}

/**
 * Toast Notice
 */
function showToastNotice(message) {
  const existing = document.querySelector('.toast-notice');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notice';
  toast.innerHTML = `<i class="fas fa-heart text-white"></i> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(30px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
