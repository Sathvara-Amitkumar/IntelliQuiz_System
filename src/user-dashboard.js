import { supabase } from './supabaseClient.js';

let currentUser = null;

const protectUserRoute = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = '/';
        return;
    }

    if (session.user.email === 'admin@intelliquiz.com') {
        window.location.href = '/dashboard.html';
        return;
    }

    currentUser = session.user;
    loadUserData();
};

const loadUserData = async () => {
    if (!currentUser) return;

    const userName = document.getElementById('userName');
    const displayName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    userName.textContent = displayName;

    await Promise.all([
        loadStatistics(),
        loadRecentActivity(),
        loadQuizHistory()
    ]);
};

const loadStatistics = async () => {
    try {
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select('score, total_questions, percentage, time_taken_seconds')
            .eq('user_id', currentUser.id)
            .eq('status', 'completed');

        if (error) {
            console.error('Error loading statistics:', error);
            return;
        }

        const totalQuizzes = attempts?.length || 0;
        const averageScore = totalQuizzes > 0
            ? (attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalQuizzes).toFixed(1)
            : 0;
        const bestScore = totalQuizzes > 0
            ? Math.max(...attempts.map(a => a.percentage || 0)).toFixed(1)
            : 0;
        const totalTimeSeconds = totalQuizzes > 0
            ? attempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0)
            : 0;
        const totalTimeHours = (totalTimeSeconds / 3600).toFixed(1);

        document.getElementById('totalQuizzes').textContent = totalQuizzes;
        document.getElementById('averageScore').textContent = `${averageScore}%`;
        document.getElementById('bestScore').textContent = `${bestScore}%`;
        document.getElementById('totalTime').textContent = `${totalTimeHours}h`;

    } catch (err) {
        console.error('Error in loadStatistics:', err);
    }
};

const loadRecentActivity = async () => {
    try {
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                created_at,
                status,
                percentage,
                quizzes (
                    title
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error loading recent activity:', error);
            return;
        }

        const activityList = document.getElementById('activityList');

        if (!attempts || attempts.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No activity yet. Join a quiz to get started!</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = attempts.map(attempt => {
            const time = new Date(attempt.created_at).toLocaleString();
            const status = attempt.status === 'completed' ? 'Completed' : 'In Progress';
            const title = attempt.quizzes?.title || 'Quiz';

            return `
                <div class="activity-item">
                    <div class="activity-title">${title} - ${status}</div>
                    <div class="activity-time">${time}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error in loadRecentActivity:', err);
    }
};

const loadQuizHistory = async () => {
    try {
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                completed_at,
                percentage,
                score,
                total_questions,
                quizzes (
                    title
                )
            `)
            .eq('user_id', currentUser.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error loading quiz history:', error);
            return;
        }

        const historyList = document.getElementById('quizHistoryList');

        if (!attempts || attempts.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>No quiz history yet</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = attempts.map(attempt => {
            const date = new Date(attempt.completed_at).toLocaleDateString();
            const title = attempt.quizzes?.title || 'Quiz';
            const percentage = attempt.percentage || 0;
            const scoreClass = percentage >= 70 ? 'high' : percentage >= 50 ? 'medium' : 'low';

            return `
                <div class="quiz-history-item">
                    <div class="quiz-history-title">
                        ${title}
                        <span class="quiz-history-score ${scoreClass}">
                            ${attempt.score}/${attempt.total_questions} (${percentage.toFixed(1)}%)
                        </span>
                    </div>
                    <div class="quiz-history-date">${date}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error in loadQuizHistory:', err);
    }
};

const handleJoinQuiz = async (e) => {
    e.preventDefault();

    const quizIdInput = document.getElementById('quizId');
    const quizPasswordInput = document.getElementById('quizPassword');
    const messageEl = document.querySelector('.join-quiz-form .form-message');
    const submitBtn = document.querySelector('.join-quiz-form button[type="submit"]');

    const quizId = quizIdInput.value.trim();
    const quizPassword = quizPasswordInput.value.trim();

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Joining...';
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    try {
        const { data: quiz, error } = await supabase
            .from('quizzes')
            .select('id, title, quiz_password, is_published')
            .eq('id', quizId)
            .eq('is_published', true)
            .maybeSingle();

        if (error) {
            messageEl.textContent = 'Error finding quiz. Please check the Quiz ID.';
            messageEl.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start Quiz';
            return;
        }

        if (!quiz) {
            messageEl.textContent = 'Quiz not found or not available.';
            messageEl.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start Quiz';
            return;
        }

        if (quiz.quiz_password && quiz.quiz_password !== quizPassword) {
            messageEl.textContent = 'Incorrect password. Please try again.';
            messageEl.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start Quiz';
            return;
        }

        const { data: existingAttempt } = await supabase
            .from('quiz_attempts')
            .select('id, status')
            .eq('user_id', currentUser.id)
            .eq('quiz_id', quizId)
            .maybeSingle();

        if (existingAttempt && existingAttempt.status === 'completed') {
            messageEl.textContent = 'You have already completed this quiz.';
            messageEl.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start Quiz';
            return;
        }

        messageEl.textContent = 'Redirecting to quiz...';
        messageEl.classList.add('success');

        setTimeout(() => {
            window.location.href = `/take-quiz.html?quizId=${quizId}`;
        }, 1000);

    } catch (err) {
        console.error('Error joining quiz:', err);
        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.classList.add('error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Quiz';
    }
};

const handleLogout = async () => {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Logging out...';

    await supabase.auth.signOut();
    window.location.href = '/';
};

document.getElementById('joinQuizForm')?.addEventListener('submit', handleJoinQuiz);
document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

protectUserRoute();
