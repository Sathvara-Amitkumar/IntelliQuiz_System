import { supabase } from './supabaseClient.js';

const ADMIN_EMAIL = 'admin@intelliquiz.com';

const handleAdminLogin = async (form) => {
    const email = form.querySelector('#admin-email').value;
    const password = form.querySelector('#admin-password').value;
    const button = form.querySelector('button[type="submit"]');
    const messageEl = form.querySelector('.form-message');

    button.disabled = true;
    button.textContent = 'Logging In...';
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        messageEl.textContent = error.message;
        messageEl.classList.add('error');
        button.disabled = false;
        button.textContent = 'Log In';
        return;
    }

    if (data.user && data.user.email === ADMIN_EMAIL) {
        messageEl.textContent = 'Login successful! Redirecting...';
        messageEl.classList.add('success');
        window.location.href = '/dashboard.html';
    } else {
        await supabase.auth.signOut();
        messageEl.textContent = 'Access denied. Only admins can log in here.';
        messageEl.classList.add('error');
        button.disabled = false;
        button.textContent = 'Log In';
    }
};

const protectAdminRoutes = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || session.user.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        window.location.href = '/admin.html';
        return;
    }
};

const handleLogout = async () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.disabled = true;
        const span = logoutBtn.querySelector('span');
        if(span) span.textContent = 'Logging Out...';
    }
    await supabase.auth.signOut();
    window.location.href = '/';
};

const setActiveSidebarLink = () => {
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a.sidebar-link');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
};

// --- Page Specific Logic ---
const adminLoginForm = document.getElementById('admin-login-form');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAdminLogin(adminLoginForm);
    });
}

const currentPath = window.location.pathname;
const protectedPaths = ['/dashboard.html', '/users.html', '/quizzes.html', '/create-quiz.html'];

if (protectedPaths.some(path => currentPath.includes(path))) {
    protectAdminRoutes();
    setActiveSidebarLink();
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}
