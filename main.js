import { supabase } from './src/supabaseClient.js';

// --- UI State Management based on Auth ---

const updateNavUI = (user) => {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    if (user) {
        // Hardcoded check for admin email
        if (user.email === 'admin@intelliquiz.com') {
            navActions.innerHTML = `
                <a href="/dashboard.html" class="btn btn-outline">Dashboard</a>
                <button class="btn btn-primary" id="logoutBtnMain">Logout</button>
            `;
            document.getElementById('logoutBtnMain')?.addEventListener('click', async () => {
                await supabase.auth.signOut();
            });
        } else {
             // Regular user is logged in
            navActions.innerHTML = `
                <a href="/profile.html" class="btn btn-outline">My Account</a>
                <button class="btn btn-primary" id="logoutBtnMain">Logout</button>
            `;
             document.getElementById('logoutBtnMain')?.addEventListener('click', async () => {
                await supabase.auth.signOut();
            });
        }
    } else {
        // User is logged out
        navActions.innerHTML = `
            <button class="btn btn-outline" id="loginBtn">Login</button>
            <button class="btn btn-primary" id="signupBtnNav">Get Started</button>
        `;
        // Re-attach event listeners for login/signup
        document.getElementById('loginBtn')?.addEventListener('click', () => openModal(loginModal));
        document.getElementById('signupBtnNav')?.addEventListener('click', () => openModal(signupModal));
    }
};


supabase.auth.onAuthStateChange((event, session) => {
    updateNavUI(session?.user);
    if (event === 'SIGNED_OUT') {
        // Ensure UI is updated correctly on logout
        updateNavUI(null);
    }
});

// Check initial auth state on page load
const checkInitialSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    updateNavUI(session?.user);
};
checkInitialSession();


// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Navbar Scroll Effect
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar?.classList.add('scrolled');
    } else {
        navbar?.classList.remove('scrolled');
    }
});

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        if (href === '#') {
            e.preventDefault();
            return;
        }
        
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
        
        if (navLinks?.classList.contains('active')) {
            navLinks.classList.remove('active');
            mobileMenuBtn?.classList.remove('active');
        }
    });
});

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .step, .cta-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Counter Animation for Stats
const animateCounter = (element, target) => {
    const duration = 2000;
    let start = 0;
    const end = target;
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    
    const timer = setInterval(() => {
        start += increment;
        const text = element.dataset.text || '';
        if (text.includes('K')) {
            element.textContent = `${start}K+`;
        } else if (text.includes('%')) {
            element.textContent = `${start}%`;
        } else {
            element.textContent = start;
        }
        
        if (start == end) {
            clearInterval(timer);
            element.textContent = text;
        }
    }, stepTime);
};

const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                stat.dataset.text = text;
                const num = parseInt(text.replace(/[^0-9]/g, ''));
                stat.textContent = '0';
                animateCounter(stat, num);
            });
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Auth Modal Logic
const modalOverlay = document.getElementById('modalOverlay');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');

const signupBtns = [
    document.getElementById('signupBtnHero'),
    document.getElementById('signupBtnCta')
];

const loginModalClose = document.getElementById('loginModalClose');
const signupModalClose = document.getElementById('signupModalClose');

const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

const openModal = (modal) => {
    // Clear any previous messages
    modal.querySelector('.form-message').textContent = '';
    modal.querySelector('.form-message').className = 'form-message';
    
    modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
};

const closeModal = () => {
    modalOverlay.classList.add('hidden');
    loginModal?.classList.add('hidden');
    signupModal?.classList.add('hidden');
    document.body.classList.remove('modal-open');
};

// We need to check if these elements exist before adding listeners
document.getElementById('loginBtn')?.addEventListener('click', () => openModal(loginModal));
document.getElementById('signupBtnNav')?.addEventListener('click', () => openModal(signupModal));

signupBtns.forEach(btn => btn?.addEventListener('click', () => openModal(signupModal)));

loginModalClose?.addEventListener('click', closeModal);
signupModalClose?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', closeModal);

switchToSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
    setTimeout(() => openModal(signupModal), 300);
});

switchToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
    setTimeout(() => openModal(loginModal), 300);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay?.classList.contains('hidden')) {
        closeModal();
    }
});

// --- Supabase Auth ---

const handleAuthSubmit = async (form, isSignUp) => {
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const button = form.querySelector('button[type="submit"]');
    const messageEl = form.querySelector('.form-message');

    button.disabled = true;
    button.textContent = 'Processing...';
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    let response;
    if (isSignUp) {
        const name = form.querySelector('#signup-name').value;
        response = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });
    } else {
        response = await supabase.auth.signInWithPassword({ email, password });
    }

    const { data, error } = response;

    if (error) {
        messageEl.textContent = error.message;
        messageEl.classList.add('error');
    } else {
        if (isSignUp && data.user?.identities?.length === 0) {
            messageEl.textContent = 'User with this email already exists.';
            messageEl.classList.add('error');
        } else if (isSignUp) {
            messageEl.textContent = 'Success! Please check your email for a verification link.';
            messageEl.classList.add('success');
            setTimeout(closeModal, 3000);
        } else {
            messageEl.textContent = 'Login successful! Welcome back.';
            messageEl.classList.add('success');
            setTimeout(closeModal, 2000);
        }
    }

    button.disabled = false;
    button.textContent = isSignUp ? 'Create Account' : 'Log In';
};

signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAuthSubmit(signupForm, true);
});

loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAuthSubmit(loginForm, false);
});


// Add loading class removal
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

console.log('IntelliQuiz Landing Page Loaded Successfully! 🚀');
