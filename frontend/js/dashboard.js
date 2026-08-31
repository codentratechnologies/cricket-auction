document.addEventListener('DOMContentLoaded', () => {
    // Shared chart options for the mini sparkline charts
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: { display: false, min: 0 }
        },
        elements: {
            point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
            line: { tension: 0.4, borderWidth: 2 }
        },
        layout: { padding: 0 }
    };

    // 1. Total Auctions Chart (Blue)
    const ctxAuctions = document.getElementById('chartAuctions').getContext('2d');
    new Chart(ctxAuctions, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                data: [10, 15, 13, 20, 18, 25],
                borderColor: '#2F80ED',
                backgroundColor: 'rgba(47, 128, 237, 0.1)',
                fill: true
            }]
        },
        options: commonOptions
    });

    // 2. Total Players Chart (Green)
    const ctxPlayers = document.getElementById('chartPlayers').getContext('2d');
    new Chart(ctxPlayers, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                data: [150, 200, 180, 300, 350, 450],
                borderColor: '#27AE60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                fill: true
            }]
        },
        options: commonOptions
    });

    // 3. Total Teams Chart (Purple)
    const ctxTeams = document.getElementById('chartTeams').getContext('2d');
    new Chart(ctxTeams, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                data: [8, 12, 10, 18, 15, 24],
                borderColor: '#9B51E0',
                backgroundColor: 'rgba(155, 81, 224, 0.1)',
                fill: true
            }]
        },
        options: commonOptions
    });

    // 4. Total Spent Chart (Orange)
    const ctxSpent = document.getElementById('chartSpent').getContext('2d');
    new Chart(ctxSpent, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                data: [0.5, 0.7, 0.6, 0.9, 1.0, 1.2],
                borderColor: '#F2994A',
                backgroundColor: 'rgba(242, 153, 74, 0.1)',
                fill: true
            }]
        },
        options: commonOptions
    });

    // Fetch data from Python backend
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    fetch(`http://localhost:5000/api/dashboard/${organizerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Dashboard error:", data.error);
                if (data.error === "Organizer not found") {
                     window.location.href = 'index.html';
                }
                return;
            }
            
            // Update UI with real Firebase user data
            if (data.user) {
                const userName = data.user.name || 'Organizer';
                
                const profileNameEls = document.querySelectorAll('.profile-name, #profileNameDisplay');
                profileNameEls.forEach(el => el.textContent = userName);

                const headerTitle = document.querySelector('.header-text h1');
                if (headerTitle) {
                    headerTitle.innerHTML = `Welcome back, ${userName}! 👋`;
                }
                
                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar) {
                    profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;
                }
            }
            
            if (data.insights) {
                document.getElementById('totalAuctionsVal').textContent = data.insights.total_auctions || 0;
                document.getElementById('totalPlayersVal').textContent = data.insights.total_players || 0;
                document.getElementById('totalTeamsVal').textContent = data.insights.total_teams || 0;
                
                const totalSpent = data.insights.total_spent || 0;
                document.getElementById('totalSpentVal').textContent = typeof totalSpent === 'number' ? '₹' + totalSpent.toLocaleString() : totalSpent;
            }

            // Render Auctions
            const auctionsWrapper = document.getElementById('auctionsWrapper');
            auctionsWrapper.innerHTML = '';
            
            const prevBtn = document.querySelector('.prev-btn');
            const nextBtn = document.querySelector('.next-btn');
            const carouselDots = document.querySelector('.carousel-dots');
            
            if (prevBtn) {
                prevBtn.onclick = () => {
                    auctionsWrapper.scrollBy({ left: -366, behavior: 'smooth' });
                };
            }
            if (nextBtn) {
                nextBtn.onclick = () => {
                    auctionsWrapper.scrollBy({ left: 366, behavior: 'smooth' });
                };
            }
            
            const auctions = data.auctions ? (Array.isArray(data.auctions) ? data.auctions : Object.values(data.auctions)) : [];
            
            if (auctions.length === 0) {
                auctionsWrapper.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748B; width: 100%; font-weight: 500;">No auctions created yet. Click "Create Auction" above to start!</div>';
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                if (carouselDots) carouselDots.style.display = 'none';
            } else {
                if (auctions.length <= 1) {
                    if (prevBtn) prevBtn.style.display = 'none';
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (carouselDots) carouselDots.style.display = 'none';
                } else {
                    if (prevBtn) prevBtn.style.display = 'flex';
                    if (nextBtn) nextBtn.style.display = 'flex';
                    if (carouselDots) carouselDots.style.display = 'flex';
                }

                auctions.forEach(auction => {
                    const isLive = auction.status === 'live';
                    const auctionId = auction.id || '';
                    const isOwner = auction.is_owner || (auction.organizer_id === organizerId);
                    const creatorName = auction.organizer_name || 'Organizer';

                    const ownerBadge = isOwner 
                        ? `<span class="badge-owner" style="background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-crown"></i> OWNER</span>`
                        : `<span class="badge-guest" style="background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;"><i class="fa-solid fa-eye"></i> VIEW ONLY</span>`;

                    const bgImageUrl = auction.logo_url ? auction.logo_url : '../assets/images/stadium-bg.png';
                    
                    let cardHtml = '';
                    if (isLive) {
                        const actionBtn = isOwner 
                            ? `<button class="btn btn-block btn-success" style="padding: 0.6rem; font-size: 0.85rem;" onclick="window.location.href='auction-dashboard.html?id=${auctionId}'">Manage Live Auction <i class="fa-solid fa-arrow-right" style="margin-left: 8px;"></i></button>`
                            : `<button class="btn btn-block btn-success" style="padding: 0.6rem; font-size: 0.85rem;" onclick="window.location.href='auction-dashboard.html?id=${auctionId}'">Go to Auction <i class="fa-solid fa-arrow-right" style="margin-left: 8px;"></i></button>`;

                        cardHtml = `
                            <div class="auction-card live-card">
                                <div class="card-bg-stadium" style="background-image: url('${bgImageUrl}');"></div>
                                <div class="auction-card-header" style="z-index: 10; position: absolute; top: 1.25rem; left: 1.25rem; right: 1.25rem;">
                                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                                        <span class="badge-live"><span class="dot"></span> LIVE</span>
                                        ${ownerBadge}
                                    </div>
                                    <span class="watching-count" style="align-self: flex-start;"><i class="fa-regular fa-eye"></i> ${auction.watching || 0} watching</span>
                                </div>
                                <div class="card-main-content" style="z-index: 1; margin-left: 170px; display: flex; flex-direction: column; gap: 0.8rem; margin-top: 2.5rem; flex: 1;">
                                    <h3 style="margin: 0; font-size: 1.25rem; color: #111827;">${auction.name || 'Untitled Auction'}</h3>
                                    <div class="auction-meta" style="font-weight: 600; color: #4B5563;">
                                        <i class="fa-solid fa-user-tie text-blue"></i> ${creatorName}
                                    </div>

                                    <div class="auction-meta" style="font-size: 0.75rem; color: #6B7280; display: flex; gap: 0.3rem; white-space: nowrap;">
                                        <span>Teams: ${auction.teams || 0}</span> | <span>Players: ${auction.players || 0}</span> | <span>Budget: ${auction.budget || '$0'}</span>
                                    </div>
                                    <div class="auction-progress" style="margin-top: 0.2rem;">
                                        <div class="progress-labels" style="font-size: 0.75rem; margin-bottom: 0.25rem;">
                                            <span>Progress</span>
                                            <span>${auction.progress || 0}%</span>
                                        </div>
                                        <div class="progress-bar" style="height: 6px;">
                                            <div class="progress-fill" style="width: ${auction.progress || 0}%;"></div>
                                        </div>
                                    </div>
                                    <div style="margin-top: auto; padding-top: 0.5rem;">
                                        ${actionBtn}
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        const startsInText = auction.starts_in ? `STARTS IN ${auction.starts_in.toUpperCase()}` : 'UPCOMING';
                        const actionBtn = isOwner 
                            ? `<button class="btn btn-block btn-outline-primary" style="padding: 0.6rem; font-size: 0.85rem; display: flex; justify-content: center; align-items: center; gap: 8px;" onclick="window.location.href='auction-dashboard.html?id=${auctionId}'">Manage Auction <i class="fa-solid fa-arrow-right"></i></button>`
                            : `<button class="btn btn-block btn-outline-primary" style="padding: 0.6rem; font-size: 0.85rem; display: flex; justify-content: center; align-items: center; gap: 8px;" onclick="window.location.href='auction-dashboard.html?id=${auctionId}'">View Details <i class="fa-solid fa-arrow-right"></i></button>`;

                        cardHtml = `
                            <div class="auction-card upcoming-card">
                                <div class="card-bg-stadium" style="background-image: url('${bgImageUrl}');"></div>
                                <div class="auction-card-header" style="z-index: 10; position: absolute; top: 1.25rem; left: 1.25rem; right: 1.25rem;">
                                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                                        <span class="badge-upcoming"><i class="fa-solid fa-hourglass-half"></i> ${startsInText}</span>
                                        ${ownerBadge}
                                    </div>
                                </div>
                                <div class="card-main-content" style="z-index: 1; margin-left: 170px; display: flex; flex-direction: column; gap: 0.8rem; margin-top: 2.5rem; flex: 1;">
                                    <h3 style="margin: 0; font-size: 1.25rem; color: #111827;">${auction.name || 'Untitled Auction'}</h3>
                                    <div class="auction-meta" style="font-weight: 600; color: #4B5563;">
                                        <i class="fa-solid fa-user-tie text-blue"></i> ${creatorName}
                                    </div>
                                    <div class="auction-meta" style="font-size: 0.75rem; color: #6B7280; display: flex; gap: 0.3rem; white-space: nowrap;">
                                        <span>Teams: ${auction.teams || 0}</span> | <span>Players: ${auction.players || 0}</span> | <span>Budget: ${auction.budget || '$0'}</span>
                                    </div>
                                    <div class="auction-date" style="font-size: 0.75rem; color: #6B7280; display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem;">
                                        <i class="fa-regular fa-calendar"></i> Starts on ${auction.date || 'TBD'}
                                    </div>
                                    <div style="margin-top: auto; padding-top: 0.5rem;">
                                        ${actionBtn}
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    auctionsWrapper.innerHTML += cardHtml;
                });
            }

            // Render Activities
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '';
            
            const activities = data.activities ? (Array.isArray(data.activities) ? data.activities : Object.values(data.activities)) : [];
            if (activities.length === 0) {
                activityList.innerHTML = '<div style="text-align:center; padding: 20px; color: #64748B;">No recent activity logged yet.</div>';
            } else {
                activities.forEach(activity => {
                    let iconHtml = '';
                    if (activity.type === 'player_sold') {
                        iconHtml = '<div class="activity-icon-container green-bg"><i class="fa-regular fa-user green-text"></i></div>';
                    } else if (activity.type === 'team_registered') {
                        iconHtml = '<div class="activity-icon-container blue-bg"><i class="fa-solid fa-shield-halved blue-text"></i></div>';
                    } else if (activity.type === 'auction_created') {
                        iconHtml = '<div class="activity-icon-container orange-bg"><i class="fa-solid fa-gavel orange-text"></i></div>';
                    } else {
                        iconHtml = '<div class="activity-icon-container purple-bg"><i class="fa-solid fa-users purple-text"></i></div>';
                    }

                    activityList.innerHTML += `
                        <div class="activity-item">
                            ${iconHtml}
                            <div class="activity-content">
                                <p>${activity.text}</p>
                            </div>
                            <div class="activity-time">${activity.time || 'Just now'}</div>
                        </div>
                    `;
                });
            }
        })
        .catch(err => {
            console.error("Error fetching dashboard data:", err);
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

