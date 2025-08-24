document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        input.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*()_+]/g, '');
        });
      });
      
});

const API_URL = '/api/auth';
const errorElement = document.getElementById('error');

function handleError(error, customMessage = null) {
    console.error('Ошибка:', error);
    errorElement.textContent = customMessage || error.message || 'Произошла ошибка';
    errorElement.style.display = 'block';
    return null;
}

// Логин
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        return handleError(new Error('Заполните все поля'));
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.status === 401) {
            throw new Error('Неверный логин или пароль');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Ошибка сервера');
        }
        
        const { token } = await response.json();
        localStorage.setItem('jwtToken', token);
        window.location.href = '/dashboard.html';

    } catch (error) {
        errorElement.textContent = error.message.includes('Неверный логин или пароль') 
        ? 'Неверный логин или пароль' 
        : 'Ошибка при входе';
    }
};

//Регистрация
async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!username || !password) {
        return handleError(new Error('Заполните все поля'));
    }

    const validation = validatePassword(password);
    if (validation !== true) {
        return handleError(new Error(validation.join('\n')));
    }
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка регистрации');
        }

        alert('Регистрация успешна! Теперь войдите.');
        window.location.href = '/login.html';
    } catch (err) {
        handleError(error);
    }
}

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', login);
}

if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', register);
}
function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push("Пароль должен содержать минимум 8 символов.");
    }
    if (password.length > 64) {
        errors.push(`Пароль должен содержать не более 64 символов`);
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Пароль должен содержать минимум одну строчную букву.");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Пароль должен содержать минимум одну заглавную букву.");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Пароль должен содержать минимум одну цифру.")
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Пароль должен содержать минимум один спецсимвол (!, @, # и т.д.)");
    }

    return errors.length === 0 ? true : errors;
}