document.addEventListener('DOMContentLoaded', () => {

    const API_BASE = 'http://127.0.0.1:5000';

    // ================================================================
    //  AUTH CHECK
    // ================================================================
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    // ================================================================
    //  TAB / VIEW SWITCHING  (SPA — navbar never reloads)
    // ================================================================
    const navLinks   = document.querySelectorAll('.nav-link[data-view]');
    const pageViews  = document.querySelectorAll('.page-view');
    let auctionsViewLoaded = false;

    function switchView(targetViewId) {
        // Update nav active state
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === targetViewId);
        });

        // Show / hide views
        pageViews.forEach(view => {
            view.classList.toggle('active', view.id === targetViewId);
        });

        // Toggle global background
        if (targetViewId === 'auctions-view') {
            document.body.classList.add('no-bg');
        } else {
            document.body.classList.remove('no-bg');
        }

        // Lazy-load auctions view the first time it is opened
        if (targetViewId === 'auctions-view' && !auctionsViewLoaded) {
            auctionsViewLoaded = true;
            loadAuctionsView();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });

    // "VIEW AUCTIONS" button on Dashboard also switches tab
    const viewAuctionsBtn = document.getElementById('viewAuctionsBtn');
    if (viewAuctionsBtn) {
        viewAuctionsBtn.addEventListener('click', () => switchView('auctions-view'));
    }

    // ================================================================
    //  PROFILE DROPDOWN
    // ================================================================
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileDropdown   = document.getElementById('profileDropdown');
    const logoutBtn         = document.getElementById('logoutBtn');

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

    // ================================================================
    //  DASHBOARD VIEW — CHARTS
    // ================================================================
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
            line:  { tension: 0.4, borderWidth: 2 }
        },
        layout: { padding: 0 }
    };

    new Chart(document.getElementById('chartAuctions').getContext('2d'), {
        type: 'line',
        data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ data: [10,15,13,20,18,25], borderColor: '#2F80ED', backgroundColor: 'rgba(47,128,237,0.1)', fill: true }] },
        options: commonOptions
    });

    new Chart(document.getElementById('chartPlayers').getContext('2d'), {
        type: 'line',
        data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ data: [150,200,180,300,350,450], borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.1)', fill: true }] },
        options: commonOptions
    });

    new Chart(document.getElementById('chartTeams').getContext('2d'), {
        type: 'line',
        data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ data: [8,12,10,18,15,24], borderColor: '#9B51E0', backgroundColor: 'rgba(155,81,224,0.1)', fill: true }] },
        options: commonOptions
    });

    new Chart(document.getElementById('chartSpent').getContext('2d'), {
        type: 'line',
        data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ data: [0.5,0.7,0.6,0.9,1.0,1.2], borderColor: '#F2994A', backgroundColor: 'rgba(242,153,74,0.1)', fill: true }] },
        options: commonOptions
    });

    // ================================================================
    //  DASHBOARD VIEW — FETCH DATA
    // ================================================================
    fetch(`${API_BASE}/api/dashboard/${organizerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error('Dashboard error:', data.error);
                if (data.error === 'Organizer not found') window.location.href = 'index.html';
                return;
            }

            // Profile
            if (data.user) {
                const name = data.user.name || 'Organizer';
                document.querySelectorAll('.profile-name, #profileNameDisplay').forEach(el => el.textContent = name);
                const h1 = document.querySelector('#dashboard-view .header-text h1');
                if (h1) {
                h1.innerHTML = `<span class="gradient-text">Welcome back, ${name}!</span> 👋`;
                h1.style.animation = 'none';
                h1.offsetHeight; // trigger reflow
                h1.style.animation = 'titleEntrance 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
            }
                const avatar = document.getElementById('profileAvatar');
                if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
            }

            // Insights
            if (data.insights) {
                document.getElementById('totalAuctionsVal').textContent = data.insights.total_auctions || 0;
                document.getElementById('totalPlayersVal').textContent  = data.insights.total_players || 0;
                document.getElementById('totalTeamsVal').textContent    = data.insights.total_teams || 0;
                const spent = data.insights.total_spent || 0;
                document.getElementById('totalSpentVal').textContent = typeof spent === 'number' ? '₹' + spent.toLocaleString() : spent;
            }

            // Dashboard Auctions carousel
            renderDashboardAuctions(data.auctions || [], organizerId);

            // Activity
            renderActivities(data.activities || []);
        })
        .catch(err => console.error('Dashboard fetch error:', err));

    // ================================================================
    //  DASHBOARD VIEW — AUCTIONS CAROUSEL
    // ================================================================
    function renderDashboardAuctions(rawAuctions, orgId) {
        const wrapper   = document.getElementById('auctionsWrapper');
        const prevBtn   = document.querySelector('#dashboard-view .prev-btn');
        const nextBtn   = document.querySelector('#dashboard-view .next-btn');
        const dotsEl    = document.querySelector('#dashboard-view .carousel-dots');

        wrapper.innerHTML = '';

        const auctions = Array.isArray(rawAuctions) ? rawAuctions : Object.values(rawAuctions);

        if (auctions.length === 0) {
            wrapper.innerHTML = '<div style="text-align:center;padding:40px;color:#64748B;width:100%;font-weight:500;">No auctions yet. Click "Create Auction" to start!</div>';
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsEl)  dotsEl.style.display  = 'none';
            return;
        }

        const showNav = auctions.length > 1;
        if (prevBtn) prevBtn.style.display = showNav ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = showNav ? 'flex' : 'none';
        if (dotsEl)  dotsEl.style.display  = showNav ? 'flex' : 'none';

        auctions.forEach(auction => {
            const isLive    = auction.status === 'live';
            const aId       = auction.id || '';
            const isOwner   = auction.is_owner || (auction.organizer_id === orgId);
            const creatorName = auction.organizer_name || 'Organizer';
            const bgUrl     = auction.logo_url || '../assets/images/stadium-bg.png';

            const ownerBadge = isOwner
                ? `<span style="background:#FEF3C7;color:#D97706;border:1px solid #FCD34D;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;"><i class="fa-solid fa-crown"></i> OWNER</span>`
                : `<span style="background:#F3F4F6;color:#4B5563;border:1px solid #E5E7EB;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;"><i class="fa-solid fa-eye"></i> VIEW ONLY</span>`;

            let cardHtml = '';
            if (isLive) {
                const btn = isOwner
                    ? `<button class="btn btn-block btn-success" style="padding:0.6rem;font-size:0.85rem;" onclick="window.location.href='auction-dashboard.html?id=${aId}'">Manage Live Auction <i class="fa-solid fa-arrow-right" style="margin-left:8px;"></i></button>`
                    : `<button class="btn btn-block btn-success" style="padding:0.6rem;font-size:0.85rem;" onclick="window.location.href='auction-dashboard.html?id=${aId}'">Go to Auction <i class="fa-solid fa-arrow-right" style="margin-left:8px;"></i></button>`;

                cardHtml = `
                    <div class="auction-card live-card">
                        <div class="card-bg-stadium" style="background-image:url('${bgUrl}');"></div>
                        <div class="auction-card-header" style="z-index:10;position:absolute;top:1.25rem;left:1.25rem;right:1.25rem;">
                            <div style="display:flex;gap:0.5rem;align-items:center;">
                                <span class="badge-live"><span class="dot"></span> LIVE</span>
                                ${ownerBadge}
                            </div>
                            <span class="watching-count"><i class="fa-regular fa-eye"></i> ${auction.watching || 0} watching</span>
                        </div>
                        <div class="card-main-content" style="z-index:1;margin-left:170px;display:flex;flex-direction:column;gap:0.8rem;margin-top:2.5rem;flex:1;">
                            <h3 style="margin:0;font-size:1.25rem;color:#111827;">${auction.name || 'Untitled'}</h3>
                            <div class="auction-meta" style="font-weight:600;color:#4B5563;"><i class="fa-solid fa-user-tie text-blue"></i> ${creatorName}</div>
                            <div class="auction-meta" style="font-size:0.75rem;color:#6B7280;display:flex;gap:0.3rem;">
                                <span>Teams: ${auction.teams || 0}</span> | <span>Players: ${auction.players_count || 0}</span> | <span>Budget: ${auction.budget || '$0'}</span>
                            </div>
                            <div class="auction-progress" style="margin-top:0.2rem;">
                                <div class="progress-labels" style="font-size:0.75rem;margin-bottom:0.25rem;"><span>Progress</span><span>${auction.progress || 0}%</span></div>
                                <div class="progress-bar" style="height:6px;"><div class="progress-fill" style="width:${auction.progress || 0}%;"></div></div>
                            </div>
                            <div style="margin-top:auto;padding-top:0.5rem;">${btn}</div>
                        </div>
                    </div>`;
            } else {
                const startsIn = auction.starts_in ? `STARTS IN ${String(auction.starts_in).toUpperCase()}` : 'UPCOMING';
                const btn = isOwner
                    ? `<button class="btn btn-block btn-outline-primary" style="padding:0.6rem;font-size:0.85rem;display:flex;justify-content:center;align-items:center;gap:8px;" onclick="window.location.href='auction-dashboard.html?id=${aId}'">Manage Auction <i class="fa-solid fa-arrow-right"></i></button>`
                    : `<button class="btn btn-block btn-outline-primary" style="padding:0.6rem;font-size:0.85rem;display:flex;justify-content:center;align-items:center;gap:8px;" onclick="window.location.href='auction-dashboard.html?id=${aId}'">View Details <i class="fa-solid fa-arrow-right"></i></button>`;

                cardHtml = `
                    <div class="auction-card upcoming-card">
                        <div class="card-bg-stadium" style="background-image:url('${bgUrl}');"></div>
                        <div class="auction-card-header" style="z-index:10;position:absolute;top:1.25rem;left:1.25rem;right:1.25rem;">
                            <div style="display:flex;gap:0.5rem;align-items:center;">
                                <span class="badge-upcoming"><i class="fa-solid fa-hourglass-half"></i> ${startsIn}</span>
                                ${ownerBadge}
                            </div>
                        </div>
                        <div class="card-main-content" style="z-index:1;margin-left:170px;display:flex;flex-direction:column;gap:0.8rem;margin-top:2.5rem;flex:1;">
                            <h3 style="margin:0;font-size:1.25rem;color:#111827;">${auction.name || 'Untitled'}</h3>
                            <div class="auction-meta" style="font-weight:600;color:#4B5563;"><i class="fa-solid fa-user-tie text-blue"></i> ${creatorName}</div>
                            <div class="auction-meta" style="font-size:0.75rem;color:#6B7280;display:flex;gap:0.3rem;">
                                <span>Teams: ${auction.teams || 0}</span> | <span>Players: ${auction.players_count || 0}</span>
                            </div>
                            <div class="auction-date"><i class="fa-regular fa-calendar"></i> Starts on ${auction.date || 'TBD'}</div>
                            <div style="margin-top:auto;padding-top:0.5rem;">${btn}</div>
                        </div>
                    </div>`;
            }

            wrapper.innerHTML += cardHtml;
        });

        // Carousel nav
        if (prevBtn) prevBtn.onclick = () => wrapper.scrollBy({ left: -520, behavior: 'smooth' });
        if (nextBtn) nextBtn.onclick = () => wrapper.scrollBy({ left: 520, behavior: 'smooth' });
    }

    // ================================================================
    //  DASHBOARD VIEW — ACTIVITY
    // ================================================================
    function renderActivities(rawActivities) {
        const list = document.getElementById('activityList');
        list.innerHTML = '';
        const activities = Array.isArray(rawActivities) ? rawActivities : Object.values(rawActivities);

        if (activities.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#64748B;">No recent activity logged yet.</div>';
            return;
        }

        activities.forEach(activity => {
            let iconHtml = '';
            if      (activity.type === 'player_sold')      iconHtml = '<div class="activity-icon-container green-bg"><i class="fa-regular fa-user green-text"></i></div>';
            else if (activity.type === 'team_registered')  iconHtml = '<div class="activity-icon-container blue-bg"><i class="fa-solid fa-shield-halved blue-text"></i></div>';
            else if (activity.type === 'auction_created')  iconHtml = '<div class="activity-icon-container orange-bg"><i class="fa-solid fa-gavel orange-text"></i></div>';
            else                                           iconHtml = '<div class="activity-icon-container purple-bg"><i class="fa-solid fa-users purple-text"></i></div>';

            list.innerHTML += `
                <div class="activity-item">
                    ${iconHtml}
                    <div class="activity-content"><p>${activity.text}</p></div>
                    <div class="activity-time">${activity.time || 'Just now'}</div>
                </div>`;
        });
    }

    // ================================================================
    //  AUCTIONS VIEW — LAZY LOAD
    // ================================================================
    let aucAllAuctions  = [];
    let aucFiltered     = [];
    let aucCurrentIdx   = 0;
    const AUC_VISIBLE   = 2;   // cards shown at once

    function loadAuctionsView() {
        fetch(`${API_BASE}/api/dashboard/${organizerId}`)
            .then(res => res.json())
            .then(data => {
                const raw = data.auctions;
                aucAllAuctions = raw ? (Array.isArray(raw) ? raw : Object.values(raw)) : [];
                aucApplyFilter();
            })
            .catch(err => {
                const track = document.getElementById('auctionsCardsTrack');
                if (track) track.innerHTML = `<div class="auctions-cards-loading"><i class="fa-solid fa-wifi" style="font-size:2rem;color:#D1D5DB;"></i><p>Could not connect to server.</p></div>`;
            });
    }

    // Filter
    const statusFilter = document.getElementById('auctionStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', aucApplyFilter);
    }

    function aucApplyFilter() {
        const val = statusFilter ? statusFilter.value : 'all';
        aucFiltered = val === 'all' ? [...aucAllAuctions] : aucAllAuctions.filter(a => a.status === val);
        aucCurrentIdx = 0;
        aucRenderCards();
    }

    function aucRenderCards() {
        const track     = document.getElementById('auctionsCardsTrack');
        const dotsRow   = document.getElementById('auctionsDotsRow');
        const prevBtn   = document.getElementById('auctionsPrevBtn');
        const nextBtn   = document.getElementById('auctionsNextBtn');
        const emptyEl   = document.getElementById('auctionsEmpty');
        const countBadge = document.getElementById('auctionCountBadge');

        if (!track) return;
        track.innerHTML = '';
        if (dotsRow)    dotsRow.innerHTML = '';
        if (countBadge) countBadge.textContent = `(${aucFiltered.length})`;

        if (aucFiltered.length === 0) {
            if (emptyEl)  emptyEl.classList.remove('hidden');
            if (prevBtn)  prevBtn.disabled = true;
            if (nextBtn)  nextBtn.disabled = true;
            return;
        }

        if (emptyEl) emptyEl.classList.add('hidden');

        aucFiltered.forEach((auction, idx) => {
            const card = aucBuildCard(auction, idx);
            track.appendChild(card);
        });

        aucUpdateCarousel();
        aucBuildDots();
    }

    function aucBuildCard(auction, idx) {
        const isLive  = auction.status === 'live';
        const isOwner = (auction.organizer_id === organizerId) || auction.is_owner;
        const aId     = auction.id || '';
        const name    = auction.name || 'Untitled Auction';
        const teams   = auction.teams || 0;
        const players = auction.players_count || 0;
        const date    = auction.date || 'TBD';
        const time    = auction.time || '';
        const venue   = auction.venue || '—';
        const logo    = auction.logo_url || '';

        const statusBadge = isLive
            ? `<span class="auc-badge-live"><span class="auc-live-dot"></span> LIVE</span>`
            : `<span class="auc-badge-upcoming"><i class="fa-solid fa-hourglass-half"></i> UPCOMING</span>`;

        const ownerBadge = isOwner
            ? `<span class="auc-badge-owner"><i class="fa-solid fa-crown"></i> OWNER</span>` : '';

        const logoHtml = logo
            ? `<img class="auc-logo" src="${logo}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="auc-logo-placeholder" style="display:none;"><i class="fa-solid fa-trophy"></i></div>`
            : `<div class="auc-logo-placeholder"><i class="fa-solid fa-trophy"></i></div>`;

        let detailsHtml = '';
        if (isLive) {
            detailsHtml = `
                <div class="auc-detail-cell"><span class="auc-detail-label">Current Price</span><span class="auc-detail-value green">₹ 8.50L</span></div>
                <div class="auc-detail-cell"><span class="auc-detail-label">Highest Bidder</span><span class="auc-detail-value blue">Team Strikers</span></div>
                <div class="auc-detail-cell"><span class="auc-detail-label">Next Bid Min</span><span class="auc-detail-value">₹ 9.00L</span></div>`;
        } else {
            const fmtDate = date !== 'TBD'
                ? new Date(date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
                : 'TBD';
            const fmtTime = aucFmtTime(time);
            detailsHtml = `
                <div class="auc-detail-cell">
                    <span class="auc-detail-label">Start Date</span>
                    <span class="auc-detail-value">${fmtDate}${fmtTime ? `<br><span style="font-size:0.72rem;color:#6B7280;font-weight:500;">${fmtTime}</span>` : ''}</span>
                </div>
                <div class="auc-detail-cell">
                    <span class="auc-detail-label">Venue</span>
                    <span class="auc-detail-value" style="font-size:0.8rem;">${venue}</span>
                </div>
                <div class="auc-detail-cell">
                    <span class="auc-detail-label">Status</span>
                    <span class="auc-detail-value amber">Upcoming</span>
                </div>`;
        }

        let btnLabel = 'MANAGE AUCTION';
        let btnUrl = `auction-dashboard.html?id=${aId}`;
        let btnIcon = '<i class="fa-solid fa-gavel"></i>';

        if (!isOwner) {
            btnLabel = isLive ? 'VIEW LIVE AUCTION' : 'VIEW AUCTION';
            btnUrl = `live.html?id=${aId}`;
            btnIcon = '<i class="fa-regular fa-eye"></i>';
        }

        const btnClass = isLive ? 'auc-btn-solid' : 'auc-btn-outline';

        const card = document.createElement('div');
        card.className = 'auc-card';
        card.style.animationDelay = `${idx * 0.06}s`;
        card.innerHTML = `
            <div class="auc-card-top">
                ${logoHtml}
                <div class="auc-info">
                    <div class="auc-name">${name}</div>
                    <div class="auc-badges">
                        <span class="auc-badge-type"><i class="fa-solid fa-cricket-bat-ball"></i> T20 Auction</span>
                        ${statusBadge}
                        ${ownerBadge}
                    </div>
                    <div class="auc-meta-row">
                        <div class="auc-meta-item"><i class="fa-solid fa-users"></i> <span>${teams} Teams</span></div>
                        <div class="auc-meta-item"><i class="fa-regular fa-user"></i> <span>${players} Players</span></div>
                    </div>
                </div>
            </div>
            <div class="auc-divider"></div>
            <div class="auc-details">${detailsHtml}</div>
            <div class="auc-action">
                <button class="auc-btn ${btnClass}" onclick="window.location.href='${btnUrl}'">
                    ${btnIcon} ${btnLabel} <i class="fa-solid fa-arrow-right" style="margin-left:4px;"></i>
                </button>
            </div>`;

        return card;
    }

    function aucUpdateCarousel() {
        const track   = document.getElementById('auctionsCardsTrack');
        const prevBtn = document.getElementById('auctionsPrevBtn');
        const nextBtn = document.getElementById('auctionsNextBtn');
        if (!track) return;

        const cardW = 440 + 20; // card width + gap
        track.style.transform = `translateX(-${aucCurrentIdx * cardW}px)`;

        const total = aucFiltered.length;
        if (prevBtn) prevBtn.disabled = aucCurrentIdx === 0;
        if (nextBtn) nextBtn.disabled = aucCurrentIdx >= total - AUC_VISIBLE;

        document.querySelectorAll('.auc-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === aucCurrentIdx);
        });
    }

    function aucBuildDots() {
        const dotsRow = document.getElementById('auctionsDotsRow');
        if (!dotsRow) return;
        dotsRow.innerHTML = '';
        const total = aucFiltered.length;
        if (total <= AUC_VISIBLE) return;

        for (let i = 0; i < total; i++) {
            const btn = document.createElement('button');
            btn.className = `auc-dot${i === 0 ? ' active' : ''}`;
            btn.addEventListener('click', () => {
                aucCurrentIdx = Math.min(i, total - AUC_VISIBLE);
                aucUpdateCarousel();
            });
            dotsRow.appendChild(btn);
        }
    }

    // Prev / Next
    const aucPrevBtn = document.getElementById('auctionsPrevBtn');
    const aucNextBtn = document.getElementById('auctionsNextBtn');
    if (aucPrevBtn) aucPrevBtn.addEventListener('click', () => { if (aucCurrentIdx > 0) { aucCurrentIdx--; aucUpdateCarousel(); } });
    if (aucNextBtn) aucNextBtn.addEventListener('click', () => { if (aucCurrentIdx < aucFiltered.length - AUC_VISIBLE) { aucCurrentIdx++; aucUpdateCarousel(); } });

    // Utility
    function aucFmtTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':');
        const hrs = parseInt(h);
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        return `${hrs % 12 || 12}:${m} ${ampm}`;
    }

});
