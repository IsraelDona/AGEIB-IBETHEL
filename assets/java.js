console.log('IBETHEL AGEIB site script loaded');

document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.nav-list a');
  const nav = document.querySelector('.site-header nav');
  const menuBtn = document.querySelector('.menu-toggle');

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      if (nav) {
        nav.classList.remove('open');
      }
    });
  });

  const heroMedia = document.querySelector('.hero-media');
  const heroLogo = document.querySelector('.hero-logo');

  if (heroMedia && heroLogo) {
    const logoProbe = new Image();
    logoProbe.src = heroLogo.src;

    logoProbe.onload = () => {
      heroMedia.classList.add('logo-ready');
    };

    logoProbe.onerror = () => {
      heroMedia.classList.remove('logo-ready');
    };
  }

  const contactForm = document.querySelector('#contact-form');
  const formStatus = document.querySelector('#form-status');

  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }

      const formData = new FormData(contactForm);
      const endpoint = contactForm.getAttribute('action') || '/api/contact';

      // Honeypot simple: si rempli, on coupe l'envoi.
      if (String(formData.get('_gotcha') || '').trim() !== '') {
        formStatus.className = 'form-status err';
        formStatus.textContent = 'Echec de verification anti-spam.';
        return;
      }

      const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        message: String(formData.get('message') || '').trim(),
      };

      const submitButton = contactForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }
      formStatus.className = 'form-status';
      formStatus.textContent = 'Envoi en cours...';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let serverMessage = '';
          try {
            const errorData = await response.json();
            serverMessage = String(errorData.message || '');
          } catch (parseError) {
            serverMessage = '';
          }
          throw new Error(serverMessage || 'Submission failed');
        }

        contactForm.reset();
        formStatus.className = 'form-status ok';
        formStatus.textContent = 'Message envoye. Nous vous repondrons rapidement.';
      } catch (error) {
        formStatus.className = 'form-status err';
        formStatus.textContent = error.message || 'Service indisponible. Reessayez plus tard.';
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
});
