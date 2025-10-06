import { supabase } from './supabaseClient.js';

const totalQuizzesEl = document.getElementById('total-quizzes');
const totalStudentsEl = document.getElementById('total-students');

/**
 * Fetches and displays the main dashboard statistics.
 */
const fetchDashboardStats = async () => {
    // Fetch total students (profiles)
    const { count: studentCount, error: studentError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (studentError) {
        console.error('Error fetching student count:', studentError);
        if (totalStudentsEl) totalStudentsEl.textContent = 'N/A';
    } else {
        if (totalStudentsEl) totalStudentsEl.textContent = studentCount;
    }

    // Fetch total quizzes
    const { count: quizCount, error: quizError } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true });

    if (quizError) {
        console.error('Error fetching quiz count:', quizError);
        if (totalQuizzesEl) totalQuizzesEl.textContent = 'N/A';
    } else {
        if (totalQuizzesEl) totalQuizzesEl.textContent = quizCount;
    }
};

// Initial load for the dashboard page
if (window.location.pathname.includes('/dashboard.html')) {
    document.addEventListener('DOMContentLoaded', fetchDashboardStats);
}
