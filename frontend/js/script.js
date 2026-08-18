document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggles (handles multiple on register page)
    const togglePasswords = document.querySelectorAll('.toggle-password');
    togglePasswords.forEach(toggle => {
        toggle.addEventListener('click', function () {
            // Find the input field relative to the clicked icon
            const inputField = this.previousElementSibling;
            
            if (inputField) {
                // Toggle the type attribute
                const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
                inputField.setAttribute('type', type);

                // Toggle the eye icon
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });

    // Helper to validate a single field
    function validateField(input, field, errorSpan, requiredMsg, customCheck = null) {
        if (!input.value) {
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
                const errorText = field.nextElementSibling;
                if (field.classList.contains('error')) {
                    field.classList.remove('error');
                    if (errorText && errorText.classList.contains('error-text')) {
                        errorText.textContent = "";
                    }
                }
            });
        });
    }

    // --- Login Form Validation ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            let isValid = true;
            
            const email = document.getElementById('email');
            const emailField = document.getElementById('emailField');
            const emailError = document.getElementById('emailError');
            
            const password = document.getElementById('password');
            const passwordField = document.getElementById('passwordField');
            const passwordError = document.getElementById('passwordError');
            
            isValid &= validateField(email, emailField, emailError, "Email address is required", {
                isValid: () => email.checkValidity(),
                msg: "Please enter a valid email address"
            });
            
            isValid &= validateField(password, passwordField, passwordError, "Password is required", {
                isValid: () => password.value.length >= 8,
                msg: "Password must be at least 8 characters"
            });
            
            if (isValid) {
                const btn = loginForm.querySelector('.btn-login');
                const originalText = btn.textContent;
                btn.textContent = "Logging in...";
                btn.disabled = true;

                fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.value, password: password.value })
                })
                .then(res => res.json())
                .then(data => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    
                    if (data.error) {
                        if (data.error.includes("Email") || data.error.includes("account found")) {
                            emailError.textContent = data.error;
                            emailField.classList.add('error');
                        } else if (data.error.includes("password") || data.error.includes("Password")) {
                            passwordError.textContent = data.error;
                            passwordField.classList.add('error');
                        } else {
                            alert(data.error);
                        }
                    } else if (data.organizer_id) {
                        localStorage.setItem('organizer_id', data.organizer_id);
                        window.location.href = 'dashboard.html';
                    }
                })
                .catch(err => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    alert("Error connecting to server.");
                });
            }
        });
        attachClearErrorListeners(loginForm);
    }

    // --- Register Form Validation ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            let isValid = true;
            
            const fields = [
                { id: 'fullname', fieldId: 'nameField', errorId: 'nameError', msg: 'Full Name is required' },
                { id: 'email', fieldId: 'emailField', errorId: 'emailError', msg: 'Email is required',
                  custom: { isValid: () => document.getElementById('email').checkValidity(), msg: "Please enter a valid email address" } },
                { id: 'password', fieldId: 'passwordField', errorId: 'passwordError', msg: 'Password is required',
                  custom: { isValid: () => document.getElementById('password').value.length >= 8, msg: "Password must be at least 8 characters" } },
                { id: 'confirmPassword', fieldId: 'confirmPasswordField', errorId: 'confirmPasswordError', msg: 'Please confirm your password',
                  custom: { isValid: () => document.getElementById('confirmPassword').value === document.getElementById('password').value, msg: "Passwords do not match" } }
            ];

            fields.forEach(f => {
                const input = document.getElementById(f.id);
                const field = document.getElementById(f.fieldId);
                const error = document.getElementById(f.errorId);
                const valid = validateField(input, field, error, f.msg, f.custom);
                if (!valid) isValid = false;
            });
            
            if (isValid) {
                const btn = registerForm.querySelector('.btn-login');
                const originalText = btn.textContent;
                btn.textContent = "Signing up...";
                btn.disabled = true;
                
                const fullname = document.getElementById('fullname').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

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
                        if (data.error.includes("Email")) {
                            document.getElementById('emailError').textContent = data.error;
                            document.getElementById('emailField').classList.add('error');
                        } else {
                            alert(data.error);
                        }
                    } else if (data.organizer_id) {
                        alert("Registration successful! Please login.");
                        window.location.href = 'login.html';
                    }
                })
                .catch(err => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    alert("Error connecting to server.");
                });
            }
        });
        attachClearErrorListeners(registerForm);
    }

    // --- Google Button Activation ---
    const googleBtns = document.querySelectorAll('.btn-google');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert("Redirecting to Google OAuth...");
        });
    });
});
