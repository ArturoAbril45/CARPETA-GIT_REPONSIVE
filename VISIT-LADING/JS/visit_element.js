/* Project by Arturo Abril - JavaScript for VISIT Real Estate Landing Page
VISIT - Real Estate Landing Page
Arturo Abril - Junior Web Developer
Portfolio: https://arturoabril.github.io/Portfolio/
GitHub:
*/

const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');
const modal = document.getElementById('contactModal');
const modalClose = document.querySelector('.modal-close');
const modalPropertyName = document.getElementById('modalPropertyName');
const contactForm = document.getElementById('contactForm');
const modalContactForm = document.getElementById('modalContactForm');
const navbar = document.querySelector('.navbar');
const scrollToTopBtn = document.getElementById('scrollToTop');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
    } else {
        navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
    }
    
    if (currentScroll > 400) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
    
    lastScroll = currentScroll;
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

function openContactModal(propertyName) {
    modal.style.display = 'block';
    modalPropertyName.textContent = propertyName;
    document.body.style.overflow = 'hidden';
}

modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    console.log('Formulario principal enviado:', data);
    
    showSuccessMessage('Solicitud enviada correctamente. Nos pondremos en contacto contigo en las próximas 24 horas.');
    
    contactForm.reset();
});

modalContactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(modalContactForm);
    const data = Object.fromEntries(formData);
    data.property = modalPropertyName.textContent;
    
    console.log('Formulario modal enviado:', data);
    
    showSuccessMessage('Información solicitada correctamente. Un asesor se comunicará contigo pronto.');
    
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    modalContactForm.reset();
});

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('slide-out');
        setTimeout(() => {
            if (messageDiv.parentNode) {
                document.body.removeChild(messageDiv);
            }
        }, 300);
    }, 5000);
}

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -80px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.property-card, .benefit-item, .featured-card'
    );
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            const navbarHeight = navbar.offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

const emailInputs = document.querySelectorAll('input[type="email"]');
const phoneInputs = document.querySelectorAll('input[type="tel"]');

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\(\)\+]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

emailInputs.forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value && !validateEmail(this.value)) {
            this.style.borderColor = '#dc3545';
            showValidationError(this, 'Correo electrónico inválido');
        } else {
            this.style.borderColor = '';
            removeValidationError(this);
        }
    });
    
    input.addEventListener('input', function() {
        if (this.style.borderColor === 'rgb(220, 53, 69)') {
            this.style.borderColor = '';
            removeValidationError(this);
        }
    });
});

phoneInputs.forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value && !validatePhone(this.value)) {
            this.style.borderColor = '#dc3545';
            showValidationError(this, 'Número de teléfono inválido');
        } else {
            this.style.borderColor = '';
            removeValidationError(this);
        }
    });
    
    input.addEventListener('input', function() {
        if (this.style.borderColor === 'rgb(220, 53, 69)') {
            this.style.borderColor = '';
            removeValidationError(this);
        }
    });
});

function showValidationError(input, message) {
    removeValidationError(input);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = 'color: #dc3545; font-size: 13px; margin-top: 6px;';
    errorDiv.textContent = message;
    input.parentElement.appendChild(errorDiv);
}

function removeValidationError(input) {
    const errorDiv = input.parentElement.querySelector('.validation-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

const textareas = document.querySelectorAll('textarea');

textareas.forEach(textarea => {
    const maxLength = 500;
    
    const counter = document.createElement('div');
    counter.style.cssText = 'text-align: right; font-size: 13px; color: #6a6a6a; margin-top: 6px;';
    counter.textContent = `0 / ${maxLength}`;
    textarea.parentElement.appendChild(counter);
    
    textarea.addEventListener('input', function() {
        const length = this.value.length;
        counter.textContent = `${length} / ${maxLength}`;
        
        if (length > maxLength) {
            this.value = this.value.substring(0, maxLength);
            counter.textContent = `${maxLength} / ${maxLength}`;
            counter.style.color = '#dc3545';
        } else if (length > maxLength * 0.9) {
            counter.style.color = '#ffc107';
        } else {
            counter.style.color = '#6a6a6a';
        }
    });
});

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

console.log('%c🏢 INMOBILIARIAS ABC', 'font-size: 20px; font-weight: bold; color: #1a2e1a;');
console.log('%cSistema de gestión inicializado', 'font-size: 14px; color: #4a6b4a;');
console.log('%cContacto: (664) 123-4567', 'font-size: 12px; color: #6a6a6a;');