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
        // If not logged in, redirect to login page
        window.location.href = 'index.html';
        return;
    }

    fetch(`http://localhost:5000/api/dashboard/${organizerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Dashboard error:", data.error);
                if(data.error === "Organizer not found") {
                     window.location.href = 'index.html';
                }
                return;
            }
            
            // Update UI with real data
            if (data.user) {
                document.querySelector('.profile-name').textContent = data.user.name;
            }
            
            if (data.insights) {
                document.getElementById('totalAuctionsVal').textContent = data.insights.total_auctions || 0;
                document.getElementById('totalPlayersVal').textContent = data.insights.total_players || 0;
                document.getElementById('totalTeamsVal').textContent = data.insights.total_teams || 0;
                
                // Format Total Spent
                const totalSpent = data.insights.total_spent || 0;
                document.getElementById('totalSpentVal').textContent = '$' + totalSpent.toLocaleString();
            }

            // Render Auctions
            const auctionsWrapper = document.getElementById('auctionsWrapper');
            auctionsWrapper.innerHTML = ''; // Clear previous
            
            // Get carousel controls
            const prevBtn = document.querySelector('.prev-btn');
            const nextBtn = document.querySelector('.next-btn');
            const carouselDots = document.querySelector('.carousel-dots');
            
            // Add scroll logic
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
            
            const auctions = data.auctions ? Object.values(data.auctions) : [];
            
            if (auctions.length === 0) {
                auctionsWrapper.innerHTML = '<div style="text-align:center; padding: 40px; color: #666; width: 100%;">No auctions created yet.</div>';
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                if (carouselDots) carouselDots.style.display = 'none';
            } else {
                if (auctions.length <= 1) {
                    if (prevBtn) prevBtn.style.display = 'none';
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (carouselDots) carouselDots.style.display = 'none';
                } else {
                    if (prevBtn) prevBtn.style.display = 'flex'; // Usually flex for centering icons
                    if (nextBtn) nextBtn.style.display = 'flex';
                    if (carouselDots) carouselDots.style.display = 'flex';
                }

                auctions.forEach(auction => {
                    const isLive = auction.status === 'live';
                    let cardHtml = '';
                    if (isLive) {
                        cardHtml = `
                            <div class="auction-card live-card">
                                <div class="card-bg-stadium"></div>
                                <div class="auction-card-header">
                                    <span class="badge-live"><span class="dot"></span> LIVE</span>
                                    <span class="watching-count"><i class="fa-regular fa-eye"></i> ${auction.watching || 0} watching</span>
                                </div>
                                <div class="auction-info">
                                    <h3>${auction.name || 'Untitled Auction'}</h3>
                                    <div class="auction-meta">
                                        <span>Teams: ${auction.teams || 0}</span> | <span>Players: ${auction.players || 0}</span> | <span>Budget: ${auction.budget || '$0'}</span>
                                    </div>
                                </div>
                                <div class="auction-progress">
                                    <div class="progress-labels">
                                        <span>Progress</span>
                                        <span>${auction.progress || 0}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${auction.progress || 0}%;"></div>
                                    </div>
                                </div>
                                <button class="btn btn-block btn-success">
                                    <i class="fa-solid fa-gavel"></i> Go to Auction
                                </button>
                            </div>
                        `;
                    } else {
                        const startsInText = auction.starts_in ? `STARTS IN ${auction.starts_in.toUpperCase()}` : 'UPCOMING';
                        cardHtml = `
                            <div class="auction-card upcoming-card">
                                <div class="card-bg-stadium"></div>
                                <div class="auction-card-header">
                                    <span class="badge-upcoming"><i class="fa-solid fa-hourglass-half"></i> ${startsInText}</span>
                                </div>
                                <div class="auction-info">
                                    <h3>${auction.name || 'Untitled Auction'}</h3>
                                    <div class="auction-meta">
                                        <span>Teams: ${auction.teams || 0}</span> | <span>Players: ${auction.players || 0}</span> | <span>Budget: ${auction.budget || '$0'}</span>
                                    </div>
                                    <div class="auction-date">
                                        <i class="fa-regular fa-calendar"></i> Starts on ${auction.date || 'TBD'}
                                    </div>
                                </div>
                                <button class="btn btn-block btn-outline-primary">
                                    View Details <i class="fa-solid fa-arrow-right"></i>
                                </button>
                            </div>
                        `;
                    }
                    auctionsWrapper.innerHTML += cardHtml;
                });
            }

            // Render Activities
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '';
            
            const activities = data.activities ? Object.values(data.activities) : [];
            if (activities.length === 0) {
                activityList.innerHTML = '<div style="text-align:center; padding: 20px; color: #666;">No recent activity.</div>';
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

