document.addEventListener('DOMContentLoaded', () => {
    // Shared Dropdown and Logout logic
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

    // Fetch user data for profile page
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'login.html';
        return;
    }

    fetch(`http://localhost:5000/api/dashboard/${organizerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Profile fetch error:", data.error);
                if(data.error === "Organizer not found") {
                     window.location.href = 'login.html';
                }
                return;
            }
            
            if (data.user) {
                const userName = data.user.name || 'Organizer';
                const userEmail = data.user.email || 'organizer@example.com';
                
                // Update Nav Profile
                const profileNameDisplay = document.getElementById('profileNameDisplay');
                if (profileNameDisplay) profileNameDisplay.textContent = userName;
                
                const profileAvatar = document.getElementById('profileAvatar');
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;
                if (profileAvatar) profileAvatar.src = avatarUrl;
                
                // Update Main Profile Section
                const largeAvatar = document.getElementById('largeAvatar');
                if (largeAvatar) largeAvatar.src = `${avatarUrl}&size=128`;
                
                const userNameDisplay = document.getElementById('userNameDisplay');
                if (userNameDisplay) userNameDisplay.textContent = userName;
                
                const userFullNameInput = document.getElementById('userFullName');
                if (userFullNameInput) userFullNameInput.value = userName;
                
                const userEmailInput = document.getElementById('userEmail');
                if (userEmailInput) userEmailInput.value = userEmail;
            }
        })
        .catch(err => {
            console.error("Error fetching profile data:", err);
            document.getElementById('userNameDisplay').textContent = "Error loading profile";
        });
});
