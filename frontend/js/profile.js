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
    
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    const customLogoutModal = document.getElementById('customLogoutModal');
    const modalCancelLogout = document.getElementById('modalCancelLogout');
    const modalConfirmLogout = document.getElementById('modalConfirmLogout');
    
    const handleLogout = (e) => {
        e.preventDefault();
        if (customLogoutModal) {
            customLogoutModal.classList.add('show');
        }
    };
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    if (modalCancelLogout) {
        modalCancelLogout.addEventListener('click', () => {
            customLogoutModal.classList.remove('show');
        });
    }

    if (modalConfirmLogout) {
        modalConfirmLogout.addEventListener('click', () => {
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

    fetch(`http://127.0.0.1:5000/api/dashboard/${organizerId}`)
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
                const userRole = data.user.role || 'Organizer';
                
                // Update Nav Profile
                const profileNameDisplay = document.getElementById('profileNameDisplay');
                if (profileNameDisplay) profileNameDisplay.textContent = userName;
                
                const mobileProfileName = document.getElementById('mobileProfileName');
                if (mobileProfileName) mobileProfileName.textContent = userName;
                
                const profileAvatar = document.getElementById('profileAvatar');
                const mobileProfileAvatar = document.getElementById('mobileProfileAvatar');
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;
                
                if (profileAvatar) profileAvatar.src = avatarUrl;
                if (mobileProfileAvatar) mobileProfileAvatar.src = avatarUrl;
                
                // Update Role
                const profileRoleBadge = document.getElementById('profileRoleBadge');
                if (profileRoleBadge) profileRoleBadge.textContent = userRole;
                
                document.querySelectorAll('.profile-role, .mobile-profile-role').forEach(el => {
                    if (el) el.textContent = userRole;
                });
                
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

            // Populate Insights
            if (data.insights) {
                const statAuctions = document.getElementById('statAuctions');
                const statTeams = document.getElementById('statTeams');
                const statPlayers = document.getElementById('statPlayers');
                
                if (statAuctions) statAuctions.textContent = data.insights.total_auctions || 0;
                if (statTeams) statTeams.textContent = data.insights.total_teams || 0;
                if (statPlayers) statPlayers.textContent = data.insights.total_players || 0;
            }
            // Edit Profile Logic
            const editBtn = document.getElementById('editProfileBtn');
            const saveBtn = document.getElementById('saveProfileBtn');
            const cancelBtn = document.getElementById('cancelProfileBtn');
            const logoutProfileBtn = document.getElementById('logoutBtn');
            const nameInput = document.getElementById('userFullName');
            const emailInput = document.getElementById('userEmail');

            let originalName = '';
            let originalEmail = '';

            if (editBtn && saveBtn && cancelBtn) {
                editBtn.addEventListener('click', () => {
                    originalName = nameInput.value;
                    originalEmail = emailInput.value;

                    nameInput.removeAttribute('readonly');
                    emailInput.removeAttribute('readonly');
                    nameInput.focus();
                    
                    // Styling to indicate edit mode
                    nameInput.style.borderBottom = "2px solid var(--primary-blue)";
                    emailInput.style.borderBottom = "2px solid var(--primary-blue)";
                    
                    editBtn.style.display = 'none';
                    if (logoutProfileBtn) logoutProfileBtn.style.display = 'none';
                    
                    saveBtn.style.display = 'inline-flex';
                    cancelBtn.style.display = 'inline-flex';
                });

                cancelBtn.addEventListener('click', () => {
                    // Revert values
                    nameInput.value = originalName;
                    emailInput.value = originalEmail;

                    // Reset UI
                    nameInput.setAttribute('readonly', true);
                    emailInput.setAttribute('readonly', true);
                    nameInput.style.borderBottom = "none";
                    emailInput.style.borderBottom = "none";
                    
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                    
                    editBtn.style.display = 'inline-flex';
                    if (logoutProfileBtn) logoutProfileBtn.style.display = 'inline-flex';
                });

                saveBtn.addEventListener('click', () => {
                    const newName = nameInput.value.trim();
                    const newEmail = emailInput.value.trim();

                    if (!newName) {
                        alert("Name cannot be empty");
                        return;
                    }

                    saveBtn.textContent = 'Saving...';
                    saveBtn.disabled = true;
                    cancelBtn.disabled = true;

                    fetch(`http://127.0.0.1:5000/api/profile/${organizerId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fullname: newName,
                            email: newEmail
                        })
                    })
                    .then(res => res.json())
                    .then(response => {
                        if (response.error) {
                            alert(response.error);
                            saveBtn.textContent = 'Save Profile';
                            saveBtn.disabled = false;
                            cancelBtn.disabled = false;
                        } else {
                            // Update originals
                            originalName = newName;
                            originalEmail = newEmail;

                            // Reset UI
                            nameInput.setAttribute('readonly', true);
                            emailInput.setAttribute('readonly', true);
                            nameInput.style.borderBottom = "none";
                            emailInput.style.borderBottom = "none";
                            
                            saveBtn.style.display = 'none';
                            cancelBtn.style.display = 'none';
                            
                            editBtn.style.display = 'inline-flex';
                            if (logoutProfileBtn) logoutProfileBtn.style.display = 'inline-flex';

                            saveBtn.textContent = 'Save Profile';
                            saveBtn.disabled = false;
                            cancelBtn.disabled = false;

                            // Update Display Elements
                            document.getElementById('userNameDisplay').textContent = newName;
                            document.getElementById('profileNameDisplay').textContent = newName;
                            
                            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=0D8ABC&color=fff`;
                            document.getElementById('profileAvatar').src = avatarUrl;
                            document.getElementById('largeAvatar').src = `${avatarUrl}&size=128`;
                            
                            alert('Profile updated successfully!');
                        }
                    })
                    .catch(err => {
                        console.error('Error updating profile:', err);
                        alert('Error updating profile.');
                        saveBtn.textContent = 'Save Profile';
                        saveBtn.disabled = false;
                        cancelBtn.disabled = false;
                    });
                });
            }
        })
        .catch(err => {
            console.error("Error fetching profile data:", err);
            document.getElementById('userNameDisplay').textContent = "Error loading profile";
        });
});
