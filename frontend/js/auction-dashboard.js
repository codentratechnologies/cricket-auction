document.addEventListener('DOMContentLoaded', () => {
    // Authentication
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    // Get Auction ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('id');

    if (!auctionId) {
        // If no ID is provided, go back to dashboard
        window.location.href = 'dashboard.html';
        return;
    }

    let auctionDefaultBudget = 0;

    // UI Elements
    const auctionNameEl = document.getElementById('auctionName');
    const auctionStatusEl = document.getElementById('auctionStatus');
    const auctionLogoEl = document.getElementById('auctionLogo');
    const auctionCodeEl = document.getElementById('auctionCode');
    const auctionDateTimeEl = document.getElementById('auctionDateTime');
    const auctionPlayersPerTeamEl = document.getElementById('auctionPlayersPerTeam');
    const auctionPlanEl = document.getElementById('auctionPlan');
    const auctionViewsEl = document.getElementById('auctionViews');
    const auctionLiveLinkEl = document.getElementById('auctionLiveLink');
    
    const startAuctionBtn = document.getElementById('startAuctionBtn');
    const startWarning = document.getElementById('startWarning');
    const viewAuctionBtn = document.getElementById('viewAuctionBtn');
    
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    // Fetch Auction Data
    fetch(`http://localhost:5000/api/auctions/${auctionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Error fetching auction:", data.error);
                return;
            }

            const isOwner = (data.organizer_id === organizerId);
            const creatorName = data.organizer_name || 'Organizer';
            
            // Extract raw budget number from "$1,000,000" string
            if (data.budget) {
                auctionDefaultBudget = Number(data.budget.replace(/[^0-9.-]+/g, ""));
            }

            // Populate Header
            auctionNameEl.textContent = data.name || 'Untitled Auction';
            const statusLabel = data.status === 'upcoming' ? 'Upcoming' : data.status.toUpperCase();
            
            auctionStatusEl.textContent = statusLabel;
            const ownerBadgeEl = document.getElementById('auctionOwnerBadge');
            if (ownerBadgeEl) {
                ownerBadgeEl.style.display = 'inline-flex';
                ownerBadgeEl.style.alignItems = 'center';
                ownerBadgeEl.style.gap = '0.3rem';
                if (isOwner) {
                    ownerBadgeEl.innerHTML = `<i class="fa-solid fa-crown"></i> OWNER`;
                } else {
                    ownerBadgeEl.innerHTML = `<i class="fa-solid fa-eye"></i> VIEW MODE`;
                    // Override badge colour for view mode
                    ownerBadgeEl.style.background = 'linear-gradient(135deg,#F3F4F6,#E5E7EB)';
                    ownerBadgeEl.style.color = '#4B5563';
                    ownerBadgeEl.style.borderColor = '#D1D5DB';
                }
            }

            if (!isOwner) {
                // Render Spectator Notice Banner
                const headerCard = document.querySelector('.auction-header-card');
                if (headerCard && !document.getElementById('spectatorBanner')) {
                    const banner = document.createElement('div');
                    banner.id = 'spectatorBanner';
                    banner.style.cssText = `
                        background: #EFF6FF;
                        border: 1px solid #BFDBFE;
                        color: #1E40AF;
                        padding: 12px 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        font-weight: 600;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    `;
                    banner.innerHTML = `<i class="fa-solid fa-circle-info" style="font-size: 18px; color: #2563EB;"></i> You are viewing this auction in <strong>Spectator Mode</strong> (Organizer: <strong>${creatorName}</strong>). Management and editing controls are restricted to the owner.`;
                    headerCard.parentNode.insertBefore(banner, headerCard);
                }

                // Hide Owner Start Auction controls & edit action buttons
                if (startAuctionBtn) startAuctionBtn.style.display = 'none';
                if (startWarning) startWarning.style.display = 'none';

                // Hide Add Team / Add Player buttons
                document.querySelectorAll('.pane-actions .btn-primary').forEach(btn => btn.style.display = 'none');

                // Hide edit/delete actions in data tables
                document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => btn.style.display = 'none');
            }
            
            if (data.logo_url) {
                auctionLogoEl.src = data.logo_url;
            } else {
                auctionLogoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Auction')}&background=0E48A0&color=fff`;
            }

            // Format Date and Time
            const dateStr = data.date ? new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD';
            const timeStr = data.time ? formatAMPM(data.time) : '';
            auctionDateTimeEl.textContent = `${dateStr}, ${timeStr}`;

            auctionPlayersPerTeamEl.textContent = `${data.players_per_team || 0} Players`;
            auctionCodeEl.textContent = data.auction_code;
            auctionPlanEl.textContent = data.plan || 'Free Plan';
            auctionViewsEl.textContent = data.views || '0';
            
            // Build live link
            const liveLinkUrl = `${window.location.origin}/live.html?code=${data.auction_code}`;
            auctionLiveLinkEl.textContent = `auction.com/${data.auction_code}`;

            // Attach copy listeners
            copyCodeBtn.addEventListener('click', () => copyToClipboard(data.auction_code, 'Auction code copied!'));
            copyLinkBtn.addEventListener('click', () => copyToClipboard(liveLinkUrl, 'Live link copied!'));

            if (isOwner) {
                const teamsCount = 3;
                if (teamsCount === 0 || data.players === 0) {
                    startAuctionBtn.classList.replace('btn-success', 'btn-outline');
                    startAuctionBtn.style.opacity = '0.5';
                    startAuctionBtn.style.cursor = 'not-allowed';
                    if (startWarning) {
                        startWarning.classList.remove('hidden');
                    }
                    
                    startAuctionBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        showToast('Cannot start: Add teams and players first!', true);
                    });
                } else {
                    startAuctionBtn.addEventListener('click', () => {
                        window.location.href = `live-dashboard.html?id=${auctionId}`;
                    });
                }
            }

            viewAuctionBtn.addEventListener('click', () => {
                window.open(`live.html?code=${data.auction_code}`, '_blank');
            });
            
        })
        .catch(err => {
            console.error("Error connecting to server:", err);
            auctionNameEl.textContent = "Error loading data";
        });


    // =============================================
    // TEAMS MODULE
    // =============================================
    let allTeams = [];

    function formatBalance(val) {
        if (!val && val !== 0) return '—';
        return '₹' + Number(val).toLocaleString();
    }

    function renderTeamsTable(teams) {
        const tbody = document.getElementById('teamsTableBody');
        const countEl = document.getElementById('teamsCount');
        if (!tbody) return;
        countEl && (countEl.textContent = `(${teams.length})`);

        if (teams.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:#9CA3AF;">
                <i class="fa-solid fa-users-slash" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                No teams added yet. Click <strong>Add Team</strong> to get started.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = teams.map((t, i) => {
            const logoUrl = t.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.short_name)}&background=0E48A0&color=fff&size=64`;
            return `<tr>
                <td>${i + 1}</td>
                <td>
                    <div class="team-name-cell">
                        <img src="${logoUrl}" alt="${t.short_name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(t.short_name)}&background=6366F1&color=fff'">
                        ${t.name}
                    </div>
                </td>
                <td><span class="badge-gray">${t.short_name}</span></td>
                <td class="text-green-bold">${formatBalance(t.balance)}</td>
                <td>${t.players_count || 0}</td>
                <td class="actions-cell">
                    <button class="btn-action btn-view" onclick="openViewTeam('${t.id}')"><i class="fa-regular fa-eye"></i> View</button>
                    <button class="btn-action btn-edit" onclick="openEditTeam('${t.id}')"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
                    <button class="btn-action btn-delete" onclick="openDeleteTeam('${t.id}', '${t.name.replace(/'/g, "\\'")}')"><i class="fa-regular fa-trash-can"></i> Delete</button>
                </td>
            </tr>`;
        }).join('');
    }

    function loadTeams() {
        fetch(`http://localhost:5000/api/auctions/${auctionId}/teams`)
            .then(r => r.json())
            .then(teams => {
                allTeams = Array.isArray(teams) ? teams : [];
                renderTeamsTable(allTeams);
            })
            .catch(() => {
                allTeams = [];
                renderTeamsTable([]);
            });
    }

    // Load teams on page load
    loadTeams();

    // Search filter
    const teamSearchInput = document.getElementById('teamSearchInput');
    teamSearchInput && teamSearchInput.addEventListener('input', () => {
        const q = teamSearchInput.value.toLowerCase();
        const filtered = allTeams.filter(t => t.name.toLowerCase().includes(q) || t.short_name.toLowerCase().includes(q));
        renderTeamsTable(filtered);
    });

    // ---- Modal: Add / Edit ----
    const teamModal = document.getElementById('teamModal');
    const teamForm = document.getElementById('teamForm');
    const teamModalTitle = document.getElementById('teamModalTitle');
    const editTeamIdInput = document.getElementById('editTeamId');
    const teamNameInput = document.getElementById('teamName');
    const teamShortInput = document.getElementById('teamShortName');
    const teamBalanceInput = document.getElementById('teamBalance');
    const teamLogoInput = document.getElementById('teamLogoInput');
    const logoPreview = document.getElementById('logoPreview');

    function openAddTeam() {
        teamModalTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Team';
        editTeamIdInput.value = '';
        teamForm.reset();
        if (auctionDefaultBudget) {
            teamBalanceInput.value = auctionDefaultBudget;
        }
        logoPreview.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        teamModal.classList.remove('hidden');
    }

    window.openViewTeam = function(teamId) {
        window.location.href = `team-dashboard.html?auction_id=${auctionId}&team_id=${teamId}`;
    };

    window.openEditTeam = function(teamId) {
        const t = allTeams.find(x => x.id === teamId);
        if (!t) return;
        teamModalTitle.innerHTML = '<i class="fa-regular fa-pen-to-square"></i> Edit Team';
        editTeamIdInput.value = t.id;
        teamNameInput.value = t.name;
        teamShortInput.value = t.short_name;
        teamBalanceInput.value = t.balance || '';
        if (t.logo_url) {
            logoPreview.innerHTML = `<img src="${t.logo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        } else {
            logoPreview.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        }
        teamModal.classList.remove('hidden');
    };

    document.getElementById('addTeamBtn') && document.getElementById('addTeamBtn').addEventListener('click', openAddTeam);
    document.getElementById('closeTeamModal') && document.getElementById('closeTeamModal').addEventListener('click', () => teamModal.classList.add('hidden'));
    document.getElementById('cancelTeamModal') && document.getElementById('cancelTeamModal').addEventListener('click', () => teamModal.classList.add('hidden'));

    teamLogoInput && teamLogoInput.addEventListener('change', () => {
        const file = teamLogoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => { logoPreview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`; };
            reader.readAsDataURL(file);
        }
    });

    teamForm && teamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveTeamBtn');
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        const teamId = editTeamIdInput.value;
        const formData = new FormData();
        formData.append('organizer_id', organizerId);
        formData.append('name', teamNameInput.value.trim());
        formData.append('short_name', teamShortInput.value.trim().toUpperCase());
        formData.append('balance', teamBalanceInput.value || 0);
        if (teamLogoInput.files[0]) formData.append('logo', teamLogoInput.files[0]);

        const url = teamId
            ? `http://localhost:5000/api/auctions/${auctionId}/teams/${teamId}`
            : `http://localhost:5000/api/auctions/${auctionId}/teams`;
        const method = teamId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, body: formData });
            const data = await res.json();
            if (res.ok) {
                teamModal.classList.add('hidden');
                loadTeams();
                showToast(teamId ? 'Team updated successfully!' : 'Team added successfully!');
            } else {
                showToast(data.error || 'Failed to save team', true);
            }
        } catch {
            showToast('Network error. Please try again.', true);
        } finally {
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Team';
            saveBtn.disabled = false;
        }
    });

    // ---- Modal: Delete ----
    const deleteModal = document.getElementById('deleteModal');
    let deleteTargetId = null;

    window.openDeleteTeam = function(teamId, teamName) {
        deleteTargetId = teamId;
        document.getElementById('deleteTeamName').textContent = teamName;
        deleteModal.classList.remove('hidden');
    };

    document.getElementById('closeDeleteModal') && document.getElementById('closeDeleteModal').addEventListener('click', () => deleteModal.classList.add('hidden'));
    document.getElementById('cancelDeleteModal') && document.getElementById('cancelDeleteModal').addEventListener('click', () => deleteModal.classList.add('hidden'));

    document.getElementById('confirmDeleteBtn') && document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (!deleteTargetId) return;
        const btn = document.getElementById('confirmDeleteBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        btn.disabled = true;
        try {
            const res = await fetch(`http://localhost:5000/api/auctions/${auctionId}/teams/${deleteTargetId}?organizer_id=${organizerId}`, { method: 'DELETE' });
            if (res.ok) {
                deleteModal.classList.add('hidden');
                loadTeams();
                showToast('Team deleted successfully!');
            } else {
                const d = await res.json();
                showToast(d.error || 'Failed to delete team', true);
            }
        } catch {
            showToast('Network error. Please try again.', true);
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
            btn.disabled = false;
            deleteTargetId = null;
        }
    });

    // Close modals on overlay click
    [teamModal, deleteModal].forEach(m => {
        m && m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
    });

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab') + '-tab';
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Helper Functions
    function formatAMPM(time24) {
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return `${hours}:${minutes} ${ampm}`;
    }

    function copyToClipboard(text, msg) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(msg);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy', true);
        });
    }

    function showToast(message, isError = false) {
        toastMsg.textContent = message;
        if (isError) {
            toast.querySelector('i').classList.replace('fa-circle-check', 'fa-circle-xmark');
            toast.querySelector('i').style.color = '#EF4444';
        } else {
            toast.querySelector('i').classList.replace('fa-circle-xmark', 'fa-circle-check');
            toast.querySelector('i').style.color = '#34D399';
        }
        
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

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

