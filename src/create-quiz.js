import { supabase } from './supabaseClient.js';

const form = document.getElementById('create-quiz-form');
const steps = Array.from(document.querySelectorAll('.form-step'));
const indicators = Array.from(document.querySelectorAll('.step-indicator'));
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const saveBtn = document.getElementById('save-quiz-btn');
const toastElement = document.getElementById('toast-notification');

// Form elements
const generateQuestionsBtn = document.getElementById('generate-questions-btn');
const questionReviewContainer = document.getElementById('question-review-container');

let currentStep = 1;
let generatedQuestions = [];

const showToast = (message) => {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.remove('hidden');
    setTimeout(() => toastElement.classList.add('hidden'), 3000);
};

const updateFormState = () => {
    steps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === currentStep);
    });
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index + 1 <= currentStep);
    });

    prevBtn.disabled = currentStep === 1;
    nextBtn.classList.toggle('hidden', currentStep === steps.length);
    saveBtn.classList.toggle('hidden', currentStep !== steps.length);
};

const validateStep = (step) => {
    if (step === 1) {
        const title = document.getElementById('quiz-title').value;
        const totalQuestions = document.getElementById('total-questions').value;
        if (!title.trim()) {
            showToast('Quiz Title is required.');
            return false;
        }
        if (!totalQuestions || parseInt(totalQuestions) < 1) {
            showToast('Please enter a valid number of questions.');
            return false;
        }
    }
    if (step === 2) {
        if (generatedQuestions.length === 0) {
            showToast('Please generate questions before proceeding.');
            return false;
        }
    }
    return true;
};

const handleNext = () => {
    if (validateStep(currentStep) && currentStep < steps.length) {
        currentStep++;
        updateFormState();
    }
};

const handlePrev = () => {
    if (currentStep > 1) {
        currentStep--;
        updateFormState();
    }
};

const handleGenerateQuestions = async () => {
    const prompt = document.getElementById('quiz-prompt').value;
    const totalQuestions = document.getElementById('total-questions').value;

    if (!prompt.trim()) {
        showToast('Please enter a prompt for the quiz.');
        return;
    }

    generateQuestionsBtn.disabled = true;
    generateQuestionsBtn.textContent = 'Generating...';
    questionReviewContainer.innerHTML = '<div class="loading-state">Generating questions... Please wait. This may take a moment.</div>';
    
    // Call the secure Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { prompt, totalQuestions: parseInt(totalQuestions) },
    });

    generateQuestionsBtn.disabled = false;
    generateQuestionsBtn.textContent = 'Generate Questions';

    if (error) {
        showToast(`AI Generation Error: ${error.message}`);
        questionReviewContainer.innerHTML = `<div class="loading-state error">Failed to generate questions. Please check the function logs in your Supabase dashboard.</div>`;
        return;
    }

    if (!data.questions || data.questions.length === 0) {
        showToast('The AI could not generate questions from your prompt. Please try a different prompt.');
        questionReviewContainer.innerHTML = `<div class="loading-state">No questions were generated.</div>`;
        return;
    }

    generatedQuestions = data.questions;
    renderReviewQuestions();
    showToast('Questions generated successfully! You can now review them.');
};

const renderReviewQuestions = () => {
    questionReviewContainer.innerHTML = generatedQuestions.map((q, index) => `
        <div class="review-question-card">
            <h4>Question ${index + 1}: ${q.question_text}</h4>
            <ul class="review-options-list">
                ${q.options.map(opt => `
                    <li class="review-option ${opt.is_correct ? 'correct' : ''}">
                        ${opt.option_text}
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
};

const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Insert into quizzes table
    const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({
            title: document.getElementById('quiz-title').value,
            total_questions: parseInt(document.getElementById('total-questions').value),
            created_by: user.id
        })
        .select()
        .single();

    if (quizError) {
        showToast(`Error creating quiz: ${quizError.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Quiz';
        return;
    }

    const quizId = quizData.id;

    // 2. Prepare questions and options for insertion
    const questionsToInsert = generatedQuestions.map(q => ({
        quiz_id: quizId,
        question_text: q.question_text
    }));

    const { data: insertedQuestions, error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select();

    if (questionsError) {
        showToast(`Error saving questions: ${questionsError.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Quiz';
        return;
    }

    const optionsToInsert = [];
    insertedQuestions.forEach((dbQuestion, index) => {
        const originalQuestion = generatedQuestions[index];
        originalQuestion.options.forEach(opt => {
            optionsToInsert.push({
                question_id: dbQuestion.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct
            });
        });
    });

    const { error: optionsError } = await supabase.from('options').insert(optionsToInsert);

    if (optionsError) {
        showToast(`Error saving options: ${optionsError.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Quiz';
        return;
    }
    
    showToast('Quiz saved successfully! Redirecting...');
    setTimeout(() => {
        window.location.href = '/quizzes.html';
    }, 2000);
};


// Event Listeners
nextBtn.addEventListener('click', handleNext);
prevBtn.addEventListener('click', handlePrev);
form.addEventListener('submit', handleSaveQuiz);
generateQuestionsBtn.addEventListener('click', handleGenerateQuestions);

// Initial state
updateFormState();
