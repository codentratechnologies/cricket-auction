document.addEventListener('DOMContentLoaded', () => {
    // Utility for time formatting
    function formatAMPM(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${minutes} ${ampm}`;
    }

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

    let allTeams = [];
    let allPlayers = [];
    let auctionDefaultBudget = 0;
    let isOwner = false;

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
    fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Error fetching auction:", data.error);
                return;
            }

            isOwner = (data.organizer_id === organizerId);
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
            const liveLinkUrl = `${window.location.origin}/live.html?code=${auctionId}`;
            auctionLiveLinkEl.textContent = liveLinkUrl;

            // Attach copy listeners
            copyCodeBtn.addEventListener('click', () => copyToClipboard(data.auction_code, 'Auction code copied!'));
            copyLinkBtn.addEventListener('click', () => copyToClipboard(liveLinkUrl, 'Live link copied!'));

            if (isOwner) {
                const teamsCount = 3;
                if (teamsCount === 0 || (data.players_count || 0) === 0) {
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
                        window.location.href = `live-auction.html?auction_id=${auctionId}`;
                    });
                }
            }

            viewAuctionBtn.addEventListener('click', () => {
                window.open(`live.html?code=${auctionId}`, '_blank');
            });

            // Populate Links Tab
            const origin = window.location.origin;
            const liveLink = `${origin}/live.html?code=${auctionId}`;
            const registerLink = `${origin}/player-register.html?auction=${auctionId}`;
            const overlayLink = `${origin}/overlay.html?code=${auctionId}`;
            
            const linkLiveViewEl = document.getElementById('linkLiveView');
            const linkPlayerRegEl = document.getElementById('linkPlayerReg');
            const linkOverlayEl = document.getElementById('linkOverlay');
            if (linkLiveViewEl) linkLiveViewEl.value = liveLink;
            if (linkPlayerRegEl) linkPlayerRegEl.value = registerLink;
            if (linkOverlayEl) linkOverlayEl.value = overlayLink;
            
            // Populate About Tab
            let cachedAuctionData = data;
            const setAbout = (d) => {
                const fmt = (v) => v || '—';
                const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
                const fmtTime = (v) => v ? formatAMPM(v) : '—';
                
                document.getElementById('aboutName').textContent = fmt(d.name);
                document.getElementById('aboutVenue').textContent = fmt(d.venue);
                document.getElementById('aboutDate').textContent = fmtDate(d.date);
                document.getElementById('aboutTime').textContent = fmtTime(d.time);
                document.getElementById('aboutBudget').textContent = d.budget || '—';
                document.getElementById('aboutPlayersPerTeam').textContent = d.players_per_team ? `${d.players_per_team} Players` : '—';
                document.getElementById('aboutMinBid').textContent = d.min_bid ? `₹${Number(d.min_bid).toLocaleString('en-IN')}` : '—';
                document.getElementById('aboutBidIncrease').textContent = d.bid_increase ? `₹${Number(d.bid_increase).toLocaleString('en-IN')}` : '—';
                document.getElementById('aboutOrganizer').textContent = fmt(d.organizer_name);
                document.getElementById('aboutStatus').textContent = d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : '—';
                document.getElementById('aboutVisibility').textContent = d.visibility ? d.visibility.charAt(0).toUpperCase() + d.visibility.slice(1) : '—';
                document.getElementById('aboutCode').textContent = fmt(d.auction_code);
                document.getElementById('aboutViews').textContent = fmt(d.views);
            };
            setAbout(data);

            // Show edit button only for owner
            if (isOwner) {
                const aboutEditBtnWrapper = document.getElementById('aboutEditBtnWrapper');
                if (aboutEditBtnWrapper) aboutEditBtnWrapper.style.display = 'flex';
            }

            // Edit Auction Modal Logic
            const editAuctionModal = document.getElementById('editAuctionModal');
            const editAuctionForm = document.getElementById('editAuctionForm');
            const saveEditAuctionBtn = document.getElementById('saveEditAuctionBtn');

            const openEditAuction = () => {
                const d = cachedAuctionData;
                document.getElementById('editAuctionName').value = d.name || '';
                document.getElementById('editAuctionVenue').value = d.venue || '';
                document.getElementById('editAuctionDate').value = d.date || '';
                document.getElementById('editAuctionTime').value = d.time || '';
                // Extract raw number from budget string like "₹1,00,000"
                const rawBudget = d.budget ? d.budget.replace(/[^0-9]/g, '') : '';
                document.getElementById('editAuctionBudget').value = rawBudget;
                document.getElementById('editAuctionPlayersPerTeam').value = d.players_per_team || '';
                document.getElementById('editAuctionMinBid').value = d.min_bid || '';
                document.getElementById('editAuctionBidIncrease').value = d.bid_increase || '';
                document.getElementById('editAuctionVisibility').value = d.visibility || 'public';
                editAuctionModal.classList.remove('hidden');
            };

            const closeEditAuction = () => editAuctionModal.classList.add('hidden');

            document.getElementById('editAuctionBtn') && document.getElementById('editAuctionBtn').addEventListener('click', openEditAuction);
            document.getElementById('closeEditAuctionModal') && document.getElementById('closeEditAuctionModal').addEventListener('click', closeEditAuction);
            document.getElementById('cancelEditAuctionModal') && document.getElementById('cancelEditAuctionModal').addEventListener('click', closeEditAuction);
            editAuctionModal && editAuctionModal.addEventListener('click', e => { if (e.target === editAuctionModal) closeEditAuction(); });

            editAuctionForm && editAuctionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                saveEditAuctionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                saveEditAuctionBtn.disabled = true;

                const payload = {
                    organizer_id: organizerId,
                    name: document.getElementById('editAuctionName').value.trim(),
                    venue: document.getElementById('editAuctionVenue').value.trim(),
                    date: document.getElementById('editAuctionDate').value,
                    time: document.getElementById('editAuctionTime').value,
                    budget: document.getElementById('editAuctionBudget').value,
                    players_per_team: document.getElementById('editAuctionPlayersPerTeam').value,
                    min_bid: document.getElementById('editAuctionMinBid').value,
                    bid_increase: document.getElementById('editAuctionBidIncrease').value,
                    visibility: document.getElementById('editAuctionVisibility').value,
                };

                try {
                    const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error('Failed to update auction');
                    
                    // Update cached data & refresh the About tab display
                    cachedAuctionData = { ...cachedAuctionData, ...payload, budget: payload.budget ? `₹${Number(payload.budget).toLocaleString('en-IN')}` : cachedAuctionData.budget };
                    setAbout(cachedAuctionData);
                    // Also update the header auction name
                    if (auctionNameEl) auctionNameEl.textContent = payload.name;
                    closeEditAuction();
                    showToast('Auction details updated successfully!');
                } catch (err) {
                    console.error(err);
                    showToast('Error saving changes. Please try again.', true);
                } finally {
                    saveEditAuctionBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Save Changes';
                    saveEditAuctionBtn.disabled = false;
                }
            });

            // Now that we know if this user is the owner, load the tables
            loadTeams();
            loadPlayers();
            loadSponsors();
            
        })
        .catch(err => {
            console.error("Error connecting to server:", err);
            auctionNameEl.textContent = "Error loading data";
        });


    // =============================================
    // TEAMS MODULE
    // =============================================

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
        fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/teams`)
            .then(r => r.json())
            .then(teams => {
                allTeams = Array.isArray(teams) ? teams : [];
                renderTeamsTable(allTeams);
                const el = document.getElementById('aboutTeamsCount');
                if (el) el.textContent = allTeams.length;
            })
            .catch(() => {
                allTeams = [];
                renderTeamsTable([]);
            });
    }

    function loadPlayers() {
        fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players`)
            .then(r => r.json())
            .then(players => {
                allPlayers = Array.isArray(players) ? players : [];
                // Sort by numeric ID
                allPlayers.sort((a, b) => {
                    const numA = parseInt(a.id) || 0;
                    const numB = parseInt(b.id) || 0;
                    return numA - numB;
                });
                renderPlayersTable(allPlayers);
                const el = document.getElementById('aboutPlayersCount');
                if (el) el.textContent = allPlayers.length;
            })
            .catch(() => {
                allPlayers = [];
                renderPlayersTable([]);
            });
    }

    // Player Pagination State
    let playersCurrentPage = 1;
    const playersPerPage = 10;

    function renderPlayersTable(players) {
        const tbody = document.getElementById('playersTableBody');
        const countSpan = document.getElementById('playersCount');
        
        if (players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:#9CA3AF;">
                <i class="fa-solid fa-users-slash" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                No players added yet. Click <strong>Add Player</strong> to get started.
            </td></tr>`;
            countSpan.textContent = `(0)`;
            document.getElementById('pPageTotal').textContent = '0';
            document.getElementById('pPageStart').textContent = '0';
            document.getElementById('pPageEnd').textContent = '0';
            renderPlayerPaginationControls(0);
            return;
        }

        const totalItems = players.length;
        const totalPages = Math.ceil(totalItems / playersPerPage);
        if (playersCurrentPage > totalPages) playersCurrentPage = totalPages || 1;

        const startIdx = (playersCurrentPage - 1) * playersPerPage;
        const endIdx = Math.min(startIdx + playersPerPage, totalItems);
        const displayPlayers = players.slice(startIdx, endIdx);

        countSpan.textContent = `(${players.length})`;
        document.getElementById('pPageTotal').textContent = totalItems;
        document.getElementById('pPageStart').textContent = startIdx + 1;
        document.getElementById('pPageEnd').textContent = endIdx;

        tbody.innerHTML = displayPlayers.map((p, i) => {
            const img = p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=F3F4F6&color=374151`;
            
            let catClass = '';
            if (p.category === 'Batsman') catClass = 'cat-batsman';
            else if (p.category === 'Bowler') catClass = 'cat-bowler';
            else if (p.category === 'All-Rounder') catClass = 'cat-allrounder';

            return `
                <tr>
                    <td style="font-weight:700; color:var(--text-secondary);">${p.id}</td>
                    <td>
                        <div class="player-cell" style="display:flex; align-items:center; gap:10px; font-weight:600;">
                            <img src="${img}" alt="${p.name}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                            ${p.name}
                        </div>
                    </td>
                    <td><span class="badge-category ${catClass}">${p.category}</span></td>
                    <td>${p.age}</td>
                    <td>${p.phone}</td>
                    <td class="actions-cell">
                        <button class="btn-icon-only view" title="View" onclick="openViewPlayer('${p.id}')"><i class="fa-regular fa-eye"></i></button>
                        ${isOwner ? `
                        <button class="btn-icon-only edit" title="Edit" onclick="openEditPlayer('${p.id}')"><i class="fa-regular fa-pen-to-square"></i></button>
                        <button class="btn-icon-only delete" title="Delete" onclick="openDeletePlayer('${p.id}', '${p.name.replace(/'/g, "\\'")}')"><i class="fa-regular fa-trash-can"></i></button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        
        renderPlayerPaginationControls(totalPages);
    }

    function renderPlayerPaginationControls(totalPages) {
        const controlsContainer = document.querySelector('#playersPagination .page-controls');
        if (!controlsContainer) return;
        
        if (totalPages <= 1) {
            controlsContainer.innerHTML = `
                <button class="page-btn active">1</button>
            `;
            return;
        }

        let html = `<button class="page-btn" ${playersCurrentPage === 1 ? 'disabled' : ''} onclick="changePlayerPage(${playersCurrentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${playersCurrentPage === i ? 'active' : ''}" onclick="changePlayerPage(${i})">${i}</button>`;
        }

        html += `<button class="page-btn" ${playersCurrentPage === totalPages ? 'disabled' : ''} onclick="changePlayerPage(${playersCurrentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
        
        controlsContainer.innerHTML = html;
    }

    window.changePlayerPage = function(page) {
        playersCurrentPage = page;
        renderPlayersTable(allPlayers);
    };

    // Initial data is loaded inside the auction fetch promise above to prevent race conditions.

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
            ? `http://127.0.0.1:5000/api/auctions/${auctionId}/teams/${teamId}`
            : `http://127.0.0.1:5000/api/auctions/${auctionId}/teams`;
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

    // ---- Player Redirects ----
    document.getElementById('addPlayerBtn') && document.getElementById('addPlayerBtn').addEventListener('click', () => {
        window.location.href = `add-player.html?auction_id=${auctionId}`;
    });

    window.openEditPlayer = function(playerId) {
        window.location.href = `add-player.html?auction_id=${auctionId}&player_id=${playerId}`;
    };

    window.openViewPlayer = function(playerId) {
        window.location.href = `view-player.html?auction_id=${auctionId}&player_id=${playerId}`;
    };

    // ---- Modal: Delete ----
    const deleteModal = document.getElementById('deleteModal');
    let deleteTargetId = null;
    let deleteTargetType = null;

    window.openDeleteTeam = function(teamId, teamName) {
        deleteTargetId = teamId;
        deleteTargetType = 'team';
        document.getElementById('deleteModalTitle').innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#EF4444;"></i> Delete Team';
        document.getElementById('deleteTargetName').textContent = teamName;
        deleteModal.classList.remove('hidden');
    };

    window.openDeletePlayer = function(playerId, playerName) {
        deleteTargetId = playerId;
        deleteTargetType = 'player';
        document.getElementById('deleteModalTitle').innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#EF4444;"></i> Delete Player';
        document.getElementById('deleteTargetName').textContent = playerName;
        deleteModal.classList.remove('hidden');
    };

    document.getElementById('closeDeleteModal') && document.getElementById('closeDeleteModal').addEventListener('click', () => deleteModal.classList.add('hidden'));
    document.getElementById('cancelDeleteModal') && document.getElementById('cancelDeleteModal').addEventListener('click', () => deleteModal.classList.add('hidden'));

    document.getElementById('confirmDeleteBtn') && document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (!deleteTargetId || !deleteTargetType) return;
        const btn = document.getElementById('confirmDeleteBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        btn.disabled = true;
        
        let url = '';
        const API_BASE = 'http://127.0.0.1:5000';
        if (deleteTargetType === 'team') {
            url = `${API_BASE}/api/auctions/${auctionId}/teams/${deleteTargetId}?organizer_id=${organizerId}`;
        } else if (deleteTargetType === 'player') {
            url = `${API_BASE}/api/auctions/${auctionId}/players/${deleteTargetId}?organizer_id=${organizerId}`;
        } else if (deleteTargetType === 'sponsor') {
            url = `${API_BASE}/api/auctions/${auctionId}/sponsors/${deleteTargetId}?organizer_id=${organizerId}`;
        }

        try {
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                deleteModal.classList.add('hidden');
                if (deleteTargetType === 'team') loadTeams();
                else if (deleteTargetType === 'player') loadPlayers();
                else if (deleteTargetType === 'sponsor') loadSponsors();
                
                showToast(`${deleteTargetType === 'team' ? 'Team' : deleteTargetType === 'player' ? 'Player' : 'Sponsor'} deleted successfully!`);
            } else {
                const d = await res.json();
                showToast(d.error || 'Failed to delete', true);
            }
        } catch {
            showToast('Network error. Please try again.', true);
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
            btn.disabled = false;
            deleteTargetId = null;
            deleteTargetType = null;
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

    // ==========================================
    // SPONSORS LOGIC
    // ==========================================
    let allSponsors = [];
    let sponsorsCurrentPage = 1;
    const sponsorsPerPage = 10;
    
    // Modal Elements
    const sponsorModal = document.getElementById('sponsorModal');
    const sponsorForm = document.getElementById('sponsorForm');
    const sponsorNameInput = document.getElementById('sponsorName');
    const sponsorTypeInput = document.getElementById('sponsorType');
    const sponsorLogoFile = document.getElementById('sponsorLogoFile');
    const sponsorLogoPreviewArea = document.getElementById('sponsorLogoPreviewArea');
    const sponsorModalTitle = document.getElementById('sponsorModalTitle');
    const saveSponsorBtn = document.getElementById('saveSponsorBtn');
    
    // Buttons
    const addSponsorBtn = document.getElementById('addSponsorBtn');
    const closeSponsorModalBtn = document.getElementById('closeSponsorModal');
    const cancelSponsorModalBtn = document.getElementById('cancelSponsorModal');
    
    let currentEditSponsorId = null;
    let existingSponsorLogo = '';
    let croppedSponsorBlob = null;
    let cropperInstance = null;

    // Cropper Elements
    const cropperModal = document.getElementById('cropperModal');
    const cropperImage = document.getElementById('cropperImage');
    const closeCropperBtn = document.getElementById('closeCropperBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const saveCropBtn = document.getElementById('saveCropBtn');

    // Open Add Modal
    if (addSponsorBtn) {
        addSponsorBtn.addEventListener('click', () => {
            currentEditSponsorId = null;
            existingSponsorLogo = '';
            sponsorModalTitle.textContent = 'Add New Sponsor';
            sponsorForm.reset();
            sponsorLogoPreviewArea.innerHTML = `
                <div style="width: 48px; height: 48px; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #2563EB;">
                    <i class="fa-solid fa-camera" style="font-size: 20px;"></i>
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #2563EB; margin-bottom: 4px;">Click to upload logo</div>
                <div style="font-size: 12px; color: #6B7280;">JPG, PNG (Max 2MB)</div>
            `;
            sponsorModal.classList.remove('hidden');
        });
    }

    // View Sponsor Modal Logic
    const viewSponsorModal = document.getElementById('viewSponsorModal');
    const closeViewSponsorModal = document.getElementById('closeViewSponsorModal');
    const viewSponsorLogo = document.getElementById('viewSponsorLogo');
    const viewSponsorLogoPlaceholder = document.getElementById('viewSponsorLogoPlaceholder');
    const viewSponsorName = document.getElementById('viewSponsorName');
    const viewSponsorType = document.getElementById('viewSponsorType');

    if (closeViewSponsorModal) {
        closeViewSponsorModal.addEventListener('click', () => {
            viewSponsorModal.classList.add('hidden');
        });
    }

    if (viewSponsorModal) {
        viewSponsorModal.addEventListener('click', e => {
            if (e.target === viewSponsorModal) viewSponsorModal.classList.add('hidden');
        });
    }

    window.openViewSponsor = function(id) {
        const sponsor = allSponsors.find(s => s.id === id);
        if (!sponsor) return;
        
        viewSponsorName.textContent = sponsor.name || 'Unknown Sponsor';
        viewSponsorType.textContent = sponsor.type || 'Sponsor';
        
        if (sponsor.logo) {
            viewSponsorLogo.src = sponsor.logo;
            viewSponsorLogo.style.display = 'block';
            viewSponsorLogoPlaceholder.style.display = 'none';
        } else {
            viewSponsorLogo.style.display = 'none';
            viewSponsorLogoPlaceholder.style.display = 'block';
        }
        
        viewSponsorModal.classList.remove('hidden');
    };

    // Close Modal
    function closeSponsorModal() {
        sponsorModal.classList.remove('hidden');
        currentEditSponsorId = null;
        existingSponsorLogo = '';
        croppedSponsorBlob = null;
        sponsorForm.reset();
        sponsorModal.classList.add('hidden');
    }
    if (closeSponsorModalBtn) closeSponsorModalBtn.addEventListener('click', closeSponsorModal);
    if (cancelSponsorModalBtn) cancelSponsorModalBtn.addEventListener('click', closeSponsorModal);
    if (sponsorModal) sponsorModal.addEventListener('click', e => { if (e.target === sponsorModal) closeSponsorModal(); });
    
    if (sponsorLogoFile) {
        sponsorLogoFile.addEventListener('change', () => {
            const file = sponsorLogoFile.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    // Show Cropper Modal
                    cropperModal.style.display = 'block';
                    cropperImage.src = e.target.result;
                    
                    if (cropperInstance) cropperInstance.destroy();
                    cropperInstance = new Cropper(cropperImage, {
                        viewMode: 1,
                        background: false,
                        zoomable: true
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function closeCropper() {
        cropperModal.style.display = 'none';
        if (cropperInstance) cropperInstance.destroy();
        cropperInstance = null;
        sponsorLogoFile.value = ''; // Reset file input if they cancel
    }

    if (closeCropperBtn) closeCropperBtn.addEventListener('click', closeCropper);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeCropper);

    if (saveCropBtn) {
        saveCropBtn.addEventListener('click', () => {
            if (!cropperInstance) return;
            
            // Get cropped canvas
            const canvas = cropperInstance.getCroppedCanvas({
                maxWidth: 800,
                maxHeight: 800
            });
            
            // Show preview in the Add Sponsor modal
            sponsorLogoPreviewArea.innerHTML = `<img src="${canvas.toDataURL()}" alt="Preview" style="max-height: 80px; max-width: 100%; object-fit: contain; border-radius: 8px;">`;
            
            // Generate Blob to send to server
            canvas.toBlob((blob) => {
                croppedSponsorBlob = blob;
                // Close modal
                cropperModal.style.display = 'none';
                cropperInstance.destroy();
                cropperInstance = null;
            }, 'image/png');
        });
    }

    // Save Sponsor
    if (sponsorForm) {
        sponsorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            saveSponsorBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SAVING...';
            saveSponsorBtn.disabled = true;
            
            const formData = new FormData();
            formData.append('organizer_id', organizerId);
            formData.append('name', sponsorNameInput.value.trim());
            formData.append('type', sponsorTypeInput.value.trim());
            
            if (croppedSponsorBlob) {
                // Use the cropped blob, give it a filename so the backend accepts it as a file upload
                formData.append('logo', croppedSponsorBlob, 'sponsor_logo.png');
            } else if (sponsorLogoFile.files[0] && !existingSponsorLogo) {
                // Fallback in case cropper failed/was bypassed
                formData.append('logo', sponsorLogoFile.files[0]);
            }

            try {
                let url = `http://127.0.0.1:5000/api/auctions/${auctionId}/sponsors`;
                let method = 'POST';
                
                if (currentEditSponsorId) {
                    url += `/${currentEditSponsorId}`;
                    method = 'PUT';
                }

                const res = await fetch(url, {
                    method: method,
                    body: formData
                });

                if (!res.ok) throw new Error('Failed to save sponsor');
                
                showToast(`Sponsor ${currentEditSponsorId ? 'updated' : 'added'} successfully`);
                closeSponsorModal();
                loadSponsors();
            } catch (err) {
                console.error(err);
                showToast('Error saving sponsor. Please try again.', true);
            } finally {
                saveSponsorBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> SAVE SPONSOR';
                saveSponsorBtn.disabled = false;
            }
        });
    }

    async function loadSponsors() {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/sponsors`);
            if (res.ok) {
                allSponsors = await res.json();
                renderSponsorsTable();
            } else {
                allSponsors = [];
                renderSponsorsTable();
            }
            const el = document.getElementById('aboutSponsorsCount');
            if (el) el.textContent = allSponsors.length;
        } catch (err) {
            console.error('Failed to load sponsors:', err);
            allSponsors = [];
            renderSponsorsTable();
        }
    }

    function renderSponsorsTable() {
        const tbody = document.getElementById('sponsorsTableBody');
        const countSpan = document.getElementById('sponsorsCount');
        
        if (!tbody) return;

        if (allSponsors.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:3rem;color:#9CA3AF;">
                <i class="fa-solid fa-award" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                No sponsors added yet. Click <strong>Add Sponsor</strong> to get started.
            </td></tr>`;
            if (countSpan) countSpan.textContent = `(0)`;
            document.getElementById('sPageTotal').textContent = '0';
            document.getElementById('sPageStart').textContent = '0';
            document.getElementById('sPageEnd').textContent = '0';
            renderSponsorPaginationControls(0);
            return;
        }

        const totalItems = allSponsors.length;
        const totalPages = Math.ceil(totalItems / sponsorsPerPage);
        if (sponsorsCurrentPage > totalPages) sponsorsCurrentPage = totalPages || 1;

        const startIdx = (sponsorsCurrentPage - 1) * sponsorsPerPage;
        const endIdx = Math.min(startIdx + sponsorsPerPage, totalItems);
        const displaySponsors = allSponsors.slice(startIdx, endIdx);

        if (countSpan) countSpan.textContent = `(${allSponsors.length})`;
        document.getElementById('sPageTotal').textContent = totalItems;
        document.getElementById('sPageStart').textContent = startIdx + 1;
        document.getElementById('sPageEnd').textContent = endIdx;

        tbody.innerHTML = displaySponsors.map((s, i) => {
            const actualIndex = startIdx + i + 1;
            const logoHtml = s.logo 
                ? `<img src="${s.logo}" alt="${s.name}">`
                : `<i class="fa-solid fa-image" style="color:#9CA3AF;"></i>`;
            
            // Determine Badge Class
            let typeLower = (s.type || '').toLowerCase();
            let badgeClass = 'sponsor-default';
            if (typeLower.includes('title')) badgeClass = 'sponsor-title';
            else if (typeLower.includes('beverage')) badgeClass = 'sponsor-beverage';
            else if (typeLower.includes('kit') || typeLower.includes('apparel')) badgeClass = 'sponsor-kit';
            else if (typeLower.includes('digital') || typeLower.includes('tech')) badgeClass = 'sponsor-digital';

            return `
                <tr>
                    <td style="font-weight:600; color:#4B5563;">${actualIndex}</td>
                    <td>
                        <div class="sponsor-cell">
                            <div class="sponsor-logo-box">
                                ${logoHtml}
                            </div>
                            ${s.name}
                        </div>
                    </td>
                    <td><span class="badge-sponsor ${badgeClass}">${s.type || 'Sponsor'}</span></td>
                    <td class="actions-cell">
                        ${isOwner ? `
                        <button class="btn-icon-only view" title="View" onclick="openViewSponsor('${s.id}')"><i class="fa-regular fa-eye"></i></button>
                        <button class="btn-icon-only edit" title="Edit" onclick="openEditSponsor('${s.id}')"><i class="fa-regular fa-pen-to-square"></i></button>
                        <button class="btn-icon-only delete" title="Delete" onclick="openDeleteSponsor('${s.id}', '${s.name.replace(/'/g, "\\'")}')"><i class="fa-regular fa-trash-can"></i></button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        
        renderSponsorPaginationControls(totalPages);
    }

    function renderSponsorPaginationControls(totalPages) {
        const controlsContainer = document.querySelector('#sponsorsPagination .page-controls');
        if (!controlsContainer) return;
        
        if (totalPages <= 1) {
            controlsContainer.innerHTML = `
                <button class="page-btn active">1</button>
            `;
            return;
        }

        let html = `<button class="page-btn" ${sponsorsCurrentPage === 1 ? 'disabled' : ''} onclick="changeSponsorPage(${sponsorsCurrentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${sponsorsCurrentPage === i ? 'active' : ''}" onclick="changeSponsorPage(${i})">${i}</button>`;
        }

        html += `<button class="page-btn" ${sponsorsCurrentPage === totalPages ? 'disabled' : ''} onclick="changeSponsorPage(${sponsorsCurrentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
        
        controlsContainer.innerHTML = html;
    }

    window.changeSponsorPage = function(page) {
        sponsorsCurrentPage = page;
        renderSponsorsTable();
    };

    window.openEditSponsor = function(id) {
        const sponsor = allSponsors.find(s => s.id === id);
        if (!sponsor) return;
        
        currentEditSponsorId = id;
        sponsorModalTitle.textContent = 'Edit Sponsor';
        sponsorNameInput.value = sponsor.name || '';
        sponsorTypeInput.value = sponsor.type || '';
        
        if (sponsor.logo) {
            existingSponsorLogo = sponsor.logo;
            sponsorLogoPreviewArea.innerHTML = `<img src="${sponsor.logo}" alt="Preview" style="max-height: 80px; max-width: 100%; object-fit: contain; border-radius: 8px;">`;
        } else {
            existingSponsorLogo = '';
            sponsorLogoPreviewArea.innerHTML = `
                <div style="width: 48px; height: 48px; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #2563EB;">
                    <i class="fa-solid fa-camera" style="font-size: 20px;"></i>
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #2563EB; margin-bottom: 4px;">Click to upload logo</div>
                <div style="font-size: 12px; color: #6B7280;">JPG, PNG (Max 2MB)</div>
            `;
        }
        sponsorModal.classList.remove('hidden');
    };

    let sponsorToDelete = null;
    window.openDeleteSponsor = function(id, name) {
        sponsorToDelete = id;
        deleteTargetId = id;
        deleteTargetType = 'sponsor';
        document.getElementById('deleteModalTitle').innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#EF4444;"></i> Delete Sponsor';
        document.getElementById('deleteTargetName').textContent = name;
        document.getElementById('deleteModal').classList.remove('hidden');
    };
    
});

// Copy Link helper for the Links tab
function copyLink(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> COPIED!';
        btn.style.background = '#F0FDF4';
        btn.style.borderColor = '#86EFAC';
        btn.style.color = '#16A34A';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        btn.innerHTML = '<i class="fa-solid fa-xmark"></i> FAILED';
        setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> COPY LINK'; }, 2000);
    });
}

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
