import { supabase } from './supabaseClient.js';

const userTableBody = document.getElementById('user-table-body');
const toastElement = document.getElementById('toast-notification');

/**
 * Generates a random 6-character alphanumeric password.
 * @returns {string} The generated password.
 */
const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

/**
 * Displays a toast notification message.
 * @param {string} message The message to display.
 */
const showToast = (message) => {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.remove('hidden');
    setTimeout(() => {
        toastElement.classList.add('hidden');
    }, 3000);
};

/**
 * Renders the user data into the HTML table.
 * @param {Array} profiles - Array of user profile objects.
 */
const renderTable = (profiles) => {
    if (!userTableBody) return;
    
    userTableBody.innerHTML = profiles.map(profile => `
        <tr data-user-id="${profile.id}">
            <td><small>${profile.id}</small></td>
            <td>${profile.email || 'N/A'}</td>
            <td>${profile.full_name || 'N/A'}</td>
            <td>
                <div class="password-field-container">
                    <input type="text" class="temp-password-input" value="${profile.temp_password || ''}" readonly>
                </div>
            </td>
            <td>
                <button class="regenerate-btn" title="Regenerate Password">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                </button>
            </td>
        </tr>
    `).join('');
};

/**
 * Fetches users from the profiles table and renders them in the dashboard.
 * It also generates and saves temporary passwords for users who don't have one.
 */
const fetchAndDisplayUsers = async () => {
    if (!userTableBody) return;
    userTableBody.innerHTML = '<tr><td colspan="5" class="loading-state">Loading users...</td></tr>';

    const { data: initialProfiles, error } = await supabase.from('profiles').select('*');

    if (error) {
        userTableBody.innerHTML = `<tr><td colspan="5" class="loading-state error">Error fetching users: ${error.message}</td></tr>`;
        return;
    }

    if (!initialProfiles || initialProfiles.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="5" class="loading-state">No users found.</td></tr>';
        return;
    }

    const profilesToUpdate = initialProfiles
        .filter(p => !p.temp_password)
        .map(p => ({
            id: p.id,
            temp_password: generateRandomPassword(),
            temp_password_generated_at: new Date().toISOString(),
        }));

    if (profilesToUpdate.length > 0) {
        const { error: updateError } = await supabase.from('profiles').upsert(profilesToUpdate);
        if (updateError) {
            showToast(`Error saving new passwords: ${updateError.message}`);
            renderTable(initialProfiles); // Render with what we have
        } else {
            // Re-fetch to get the complete, updated data
            const { data: refreshedProfiles, error: refreshError } = await supabase.from('profiles').select('*');
            if (refreshError) {
                renderTable(initialProfiles); // Fallback on error
            } else {
                renderTable(refreshedProfiles);
            }
        }
    } else {
        renderTable(initialProfiles);
    }
};

/**
 * Handles the click event for regenerating a user's password.
 * @param {Event} e The click event.
 */
const handleRegeneratePassword = async (e) => {
    const button = e.target.closest('.regenerate-btn');
    if (!button) return;

    const row = button.closest('tr');
    const userId = row.dataset.userId;
    if (!userId) return;
    
    button.disabled = true;

    const newPassword = generateRandomPassword();

    const { data, error } = await supabase
        .from('profiles')
        .update({
            temp_password: newPassword,
            temp_password_generated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    
    button.disabled = false;

    if (error) {
        showToast(`Error updating password: ${error.message}`);
    } else {
        const input = row.querySelector('.temp-password-input');
        if (input) {
            input.value = newPassword;
        }
        showToast(`New password generated for ${data.email}.`);
    }
};

/**
 * Sends an email to all users.
 * @returns {Promise<void>}
 */
export async function sendMailToAllUsers() {
    const res = await fetch('http://localhost:3001/api/send-mails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    alert('Emails sent to all users!');
}
window.sendMailToAllUsers = sendMailToAllUsers;

// Initial load and event listeners
if (window.location.pathname.includes('/users.html')) {
    document.addEventListener('DOMContentLoaded', fetchAndDisplayUsers);
    userTableBody?.addEventListener('click', handleRegeneratePassword);
}
