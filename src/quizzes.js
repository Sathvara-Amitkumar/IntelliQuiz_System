import { supabase } from './supabaseClient.js';

const quizListContainer = document.getElementById('quiz-list-container');

const renderQuizzes = (quizzes) => {
    if (!quizListContainer) return;

    if (!quizzes || quizzes.length === 0) {
        quizListContainer.innerHTML = `
            <div class="placeholder-content" style="grid-column: 1 / -1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>No quizzes found.</p>
                <span>Click "Create New Quiz" to get started.</span>
            </div>
        `;
        return;
    }

    quizListContainer.innerHTML = quizzes.map(quiz => `
        <div class="quiz-card">
            <h3 class="quiz-card-header">${quiz.title}</h3>
            <div class="quiz-card-meta">
                <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    ${quiz.total_questions || '0'} Questions
                </span>
            </div>
            <div class="quiz-card-actions">
                <button class="btn btn-outline">View Results</button>
                <button class="btn btn-primary">Start Quiz</button>
            </div>
        </div>
    `).join('');
};


const fetchQuizzes = async () => {
    if (!quizListContainer) return;
    quizListContainer.innerHTML = `<div class="loading-state" style="grid-column: 1 / -1;">Loading quizzes...</div>`;

    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        quizListContainer.innerHTML = `<div class="loading-state error" style="grid-column: 1 / -1;">Error fetching quizzes: ${error.message}</div>`;
        return;
    }

    renderQuizzes(data);
};


if (window.location.pathname.includes('/quizzes.html')) {
    document.addEventListener('DOMContentLoaded', fetchQuizzes);
}
