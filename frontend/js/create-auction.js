document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    const form = document.getElementById('createAuctionForm');
    const logoInput = document.getElementById('tournamentLogo');
    const logoPreview = document.getElementById('logoPreview');
    const logoImg = document.getElementById('logoImg');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const uploadDropzone = document.querySelector('.upload-dropzone');
    const submitBtn = document.getElementById('submitBtn');
    const globalError = document.getElementById('formGlobalError');
    const toast = document.getElementById('toast');

    // Logo preview logic
    logoInput.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            // Validate file type and size
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showGlobalError("Invalid image format. Please upload JPG, PNG, or WebP.");
                this.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                showGlobalError("Image size must be less than 5MB.");
                this.value = '';
                return;
            }

            hideGlobalError();
            const reader = new FileReader();
            reader.onload = function(e) {
                logoImg.src = e.target.result;
                logoPreview.classList.remove('hidden');
                uploadDropzone.classList.add('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    removeLogoBtn.addEventListener('click', () => {
        logoInput.value = '';
        logoPreview.classList.add('hidden');
        uploadDropzone.classList.remove('hidden');
    });

    // Error handling utilities
    function showError(fieldId, message) {
        document.getElementById(`err-${fieldId}`).textContent = message;
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
        hideGlobalError();
    }

    function showGlobalError(message) {
        globalError.textContent = message;
        globalError.classList.remove('hidden');
    }

    function hideGlobalError() {
        globalError.classList.add('hidden');
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        // Gather data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        let isValid = true;

        // Validations
        // Date and Time
        const now = new Date();
        const selectedDate = new Date(data.auctionDate);
        // Reset time part for date comparison
        const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (selectedDate < todayDateOnly) {
            showError('auctionDate', 'Auction Date cannot be in the past.');
            isValid = false;
        } else if (selectedDate.getTime() === todayDateOnly.getTime()) {
            // Check time if date is today
            const [hours, minutes] = data.auctionTime.split(':');
            const selectedTime = new Date();
            selectedTime.setHours(hours, minutes, 0, 0);
            
            if (selectedTime <= now) {
                showError('auctionTime', 'Auction Time must be in the future.');
                isValid = false;
            }
        }

        // Numeric validations
        const numericFields = ['balancePerTeam', 'playersPerTeam', 'minBid', 'bidIncrease'];
        numericFields.forEach(field => {
            const val = parseFloat(data[field]);
            if (isNaN(val) || val <= 0) {
                showError(field, 'Must be a positive number greater than 0.');
                isValid = false;
            }
        });

        // Financial rule: Min bid <= Balance
        if (isValid) {
            const minBid = parseFloat(data.minBid);
            const balance = parseFloat(data.balancePerTeam);
            if (minBid > balance) {
                showError('minBid', 'Minimum Bid cannot be greater than Balance Per Team.');
                isValid = false;
            }
        }

        if (!isValid) return;

        // Submit via API
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CREATING...';

        try {
            // Append organizerId
            formData.append('organizer_id', organizerId);

            const response = await fetch('http://localhost:5000/api/auctions', {
                method: 'POST',
                body: formData // Sending as multipart/form-data because of the image
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create auction');
            }

            // Success
            toast.classList.remove('hidden');
            setTimeout(() => {
                window.location.href = `auction-dashboard.html?id=${result.auction_id}`;
            }, 2000);

        } catch (error) {
            console.error("Error creating auction:", error);
            showGlobalError(error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> CREATE AUCTION';
        }
    });
});

// Profile Dropdown Logic
document.addEventListener('DOMContentLoaded', () => {
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (profileMenuToggle && profileDropdown) {
        profileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!profileMenuToggle.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('organizer_id');
            window.location.href = 'index.html';
        });
    }
});

