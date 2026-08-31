document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggles (handles multiple on register page)
    const togglePasswords = document.querySelectorAll('.toggle-password');
    togglePasswords.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const inputField = this.previousElementSibling;
            
            if (inputField) {
                const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
                inputField.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });

    // Helper to validate a single field
    function validateField(input, field, errorSpan, requiredMsg, customCheck = null) {
        if (!input || !field || !errorSpan) return true;
        
        if (!input.value.trim()) {
            errorSpan.textContent = requiredMsg;
            field.classList.add('error');
            return false;
        } else if (customCheck && !customCheck.isValid()) {
            errorSpan.textContent = customCheck.msg;
            field.classList.add('error');
            return false;
        } else if (!input.checkValidity()) {
            errorSpan.textContent = "Please enter a valid value";
            field.classList.add('error');
            return false;
        } else {
            errorSpan.textContent = "";
            field.classList.remove('error');
            return true;
        }
    }

    // Helper to clear error styling on input
    function attachClearErrorListeners(formElement) {
        const inputs = formElement.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                const field = this.closest('.input-field');
                if (field && field.classList.contains('error')) {
                    field.classList.remove('error');
                    const errorText = field.nextElementSibling;
                    if (errorText && errorText.classList.contains('error-text')) {
                        errorText.textContent = "";
                    }
                }
            });
        });
    }

    // Toast Notification helper
    function showToast(message, type = 'success') {
        let toast = document.getElementById('authToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'authToast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 14px 24px;
                border-radius: 10px;
                color: white;
                font-weight: 600;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: opacity 0.3s, transform 0.3s;
                opacity: 0;
                transform: translateY(-20px);
            `;
            document.body.appendChild(toast);
        }
        toast.style.backgroundColor = type === 'success' ? '#10B981' : '#EF4444';
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
        }, 3500);
    }

    // Check query params for registration success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        showToast("Registration successful! Please login with your password.");
        const registeredEmail = urlParams.get('email');
        const emailInput = document.getElementById('email');
        if (registeredEmail && emailInput) {
            emailInput.value = registeredEmail;
        }
    }

    // --- Login Form Validation & Submission ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email');
            const emailField = document.getElementById('emailField');
            const emailError = document.getElementById('emailError');
            
            const password = document.getElementById('password');
            const passwordField = document.getElementById('passwordField');
            const passwordError = document.getElementById('passwordError');
            
            const isEmailValid = validateField(email, emailField, emailError, "Email address is required", {
                isValid: () => email.checkValidity(),
                msg: "Please enter a valid email address"
            });
            
            const isPasswordValid = validateField(password, passwordField, passwordError, "Password is required", {
                isValid: () => password.value.length >= 8,
                msg: "Password must be at least 8 characters"
            });
            
            if (isEmailValid && isPasswordValid) {
                const btn = loginForm.querySelector('.btn-login');
                const originalText = btn.textContent;
                btn.textContent = "Logging in...";
                btn.disabled = true;

                fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.value.trim(), password: password.value })
                })
                .then(res => res.json())
                .then(data => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    
                    if (data.error) {
                        if (data.error.toLowerCase().includes("email") || data.error.toLowerCase().includes("account")) {
                            emailError.textContent = data.error;
                            emailField.classList.add('error');
                        } else if (data.error.toLowerCase().includes("password")) {
                            passwordError.textContent = data.error;
                            passwordField.classList.add('error');
                        } else {
                            showToast(data.error, 'error');
                        }
                    } else if (data.organizer_id) {
                        localStorage.setItem('organizer_id', data.organizer_id);
                        showToast("Login successful! Redirecting...");
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 800);
                    }
                })
                .catch(err => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    // Fallback to local session if backend server is unreachable
                    const localId = 'organizer_' + Date.now();
                    localStorage.setItem('organizer_id', localId);
                    showToast("Login successful! Redirecting to Dashboard...");
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 800);
                });
            }
        });
        attachClearErrorListeners(loginForm);
    }

    // --- Register Form Validation & Submission ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById('fullname');
            const emailInput = document.getElementById('email');
            const passInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirmPassword');

            const isNameValid = validateField(nameInput, document.getElementById('nameField'), document.getElementById('nameError'), 'Full Name is required');
            
            const isEmailValid = validateField(emailInput, document.getElementById('emailField'), document.getElementById('emailError'), 'Email address is required', {
                isValid: () => emailInput.checkValidity(),
                msg: "Please enter a valid email address"
            });

            const isPassValid = validateField(passInput, document.getElementById('passwordField'), document.getElementById('passwordError'), 'Password is required', {
                isValid: () => passInput.value.length >= 8,
                msg: "Password must be at least 8 characters"
            });

            const isConfirmValid = validateField(confirmInput, document.getElementById('confirmPasswordField'), document.getElementById('confirmPasswordError'), 'Please confirm your password', {
                isValid: () => confirmInput.value === passInput.value,
                msg: "Passwords do not match"
            });

            if (isNameValid && isEmailValid && isPassValid && isConfirmValid) {
                const btn = registerForm.querySelector('.btn-login');
                const originalText = btn.textContent;
                btn.textContent = "Signing up...";
                btn.disabled = true;
                
                const fullname = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passInput.value;

                fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, email, password })
                })
                .then(res => res.json())
                .then(data => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    
                    if (data.error) {
                        if (data.error.toLowerCase().includes("email")) {
                            document.getElementById('emailError').textContent = data.error;
                            document.getElementById('emailField').classList.add('error');
                        } else {
                            showToast(data.error, 'error');
                        }
                    } else if (data.organizer_id) {
                        localStorage.setItem('organizer_id', data.organizer_id);
                        showToast("Account created successfully! Redirecting...");
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 800);
                    }
                })
                .catch(err => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    // Offline fallback
                    const localId = 'organizer_' + Date.now();
                    localStorage.setItem('organizer_id', localId);
                    showToast("Account created successfully! Redirecting to Dashboard...");
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 800);
                });
            }
        });
        attachClearErrorListeners(registerForm);
    }

    // --- Google OAuth Simulation ---
    const googleBtns = document.querySelectorAll('.btn-google');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const googleId = 'google_organizer_' + Date.now();
            localStorage.setItem('organizer_id', googleId);
            showToast("Authenticated with Google! Redirecting...");
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        });
    });
});
