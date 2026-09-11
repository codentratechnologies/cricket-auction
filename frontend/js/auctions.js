/* ============================================================
   AUCTIONS PAGE JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Auth Check ----
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    const API_BASE = 'http://127.0.0.1:5000';

    // ---- DOM Refs ----
    const cardsTrack       = document.getElementById('cardsTrack');
    const carouselDots     = document.getElementById('carouselDots');
    const prevBtn          = document.getElementById('prevBtn');
    const nextBtn          = document.getElementById('nextBtn');
    const auctionCountBadge = document.getElementById('auctionCountBadge');
    const emptyState       = document.getElementById('emptyState');
    const statusFilter     = document.getElementById('statusFilter');
    const cardsLoading     = document.getElementById('cardsLoading');

    // ---- Profile ----
    const profileAvatar    = document.getElementById('profileAvatar');
    const profileNameEl    = document.getElementById('profileNameDisplay');
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileDropdown  = document.getElementById('profileDropdown');
    const logoutBtn        = document.getElementById('logoutBtn');

    // ---- Profile dropdown toggle ----
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

    // ---- State ----
    let allAuctions = [];
    let filteredAuctions = [];
    let currentIndex = 0;
    const CARDS_VISIBLE = 2; // how many cards visible at once

    // ---- Fetch Dashboard Data ----
    fetch(`${API_BASE}/api/dashboard/${organizerId}`)
        .then(res => res.json())
        .then(data => {
            // Update profile
            if (data.user) {
                const name = data.user.name || 'Organizer';
                if (profileNameEl) profileNameEl.textContent = name;
                if (profileAvatar) {
                    profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
                }
            }

            // Build auction list
            const raw = data.auctions;
            allAuctions = raw
                ? (Array.isArray(raw) ? raw : Object.values(raw))
                : [];

            applyFilter();
        })
        .catch(err => {
            console.error('Failed to load auctions:', err);
            cardsLoading.innerHTML = `
                <div style="text-align:center; padding: 3rem; color: #6B7280;">
                    <i class="fa-solid fa-wifi" style="font-size:2rem; margin-bottom:1rem; display:block; color:#D1D5DB;"></i>
                    <p style="font-weight:600;">Could not connect to server</p>
                    <p style="font-size:0.85rem; margin-top:0.5rem;">Please make sure the backend is running.</p>
                </div>
            `;
        });

    // ---- Filter ----
    statusFilter.addEventListener('change', applyFilter);

    function applyFilter() {
        const val = statusFilter.value;
        if (val === 'all') {
            filteredAuctions = [...allAuctions];
        } else {
            filteredAuctions = allAuctions.filter(a => a.status === val);
        }
        currentIndex = 0;
        renderCards();
    }

    // ---- Render ----
    function renderCards() {
        cardsTrack.innerHTML = '';

        auctionCountBadge.textContent = `(${filteredAuctions.length})`;

        if (filteredAuctions.length === 0) {
            emptyState.classList.remove('hidden');
            carouselDots.innerHTML = '';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        emptyState.classList.add('hidden');

        filteredAuctions.forEach((auction, idx) => {
            const card = buildCard(auction, idx);
            cardsTrack.appendChild(card);
        });

        updateCarousel();
        buildDots();
    }

    function buildCard(auction, idx) {
        const isLive   = auction.status === 'live';
        const isOwner  = (auction.organizer_id === organizerId) || auction.is_owner;
        const aId      = auction.id || '';
        const name     = auction.name || 'Untitled Auction';
        const teams    = auction.teams || 0;
        const players  = auction.players_count || 0;
        const budget   = auction.budget || '—';
        const date     = auction.date || 'TBD';
        const time     = auction.time || '';
        const venue    = auction.venue || '—';
        const logo     = auction.logo_url || '';
        const code     = auction.auction_code || aId;

        // Status badge
        let statusBadge = '';
        if (isLive) {
            statusBadge = `<span class="badge-live-pill"><span class="live-dot"></span> LIVE</span>`;
        } else {
            statusBadge = `<span class="badge-upcoming-pill"><i class="fa-solid fa-hourglass-half"></i> UPCOMING</span>`;
        }

        // Owner badge
        const ownerBadge = isOwner
            ? `<span class="badge-owner-pill"><i class="fa-solid fa-crown"></i> OWNER</span>`
            : ``;

        // Logo
        const logoHtml = logo
            ? `<img class="card-logo" src="${logo}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="card-logo-placeholder" style="display:none;"><i class="fa-solid fa-trophy"></i></div>`
            : `<div class="card-logo-placeholder"><i class="fa-solid fa-trophy"></i></div>`;

        // Detail cells
        let detailsHtml = '';
        if (isLive) {
            detailsHtml = `
                <div class="detail-cell">
                    <span class="detail-label">Current Price</span>
                    <span class="detail-value green">₹ 8.50L</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Highest Bidder</span>
                    <span class="detail-value blue">Team Strikers</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Next Bid Min</span>
                    <span class="detail-value">₹ 9.00L</span>
                </div>
            `;
        } else {
            const formattedDate = date !== 'TBD'
                ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'TBD';

            detailsHtml = `
                <div class="detail-cell">
                    <span class="detail-label">Start Date</span>
                    <span class="detail-value">${formattedDate}${time ? `<br><span style="font-size:0.75rem; color:#6B7280; font-weight:500;">${formatTime(time)}</span>` : ''}</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Venue</span>
                    <span class="detail-value" style="font-size:0.82rem; line-height:1.4;">${venue}</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Status</span>
                    <span class="detail-value" style="color:#D97706;">Upcoming</span>
                </div>
            `;
        }

        // Action button
        const btnClass = isLive ? 'btn-manage-solid' : 'btn-manage-outline';
        const btnText  = isOwner
            ? (isLive ? '<i class="fa-solid fa-gavel"></i> MANAGE AUCTION' : '<i class="fa-solid fa-gavel"></i> MANAGE AUCTION')
            : '<i class="fa-regular fa-eye"></i> VIEW DETAILS';

        const card = document.createElement('div');
        card.className = 'auction-card';
        card.style.animationDelay = `${idx * 0.07}s`;
        card.innerHTML = `
            <div class="card-top">
                ${logoHtml}
                <div class="card-info">
                    <div class="card-name">${name}</div>
                    <div class="card-badges">
                        <span class="badge-type"><i class="fa-solid fa-cricket-bat-ball"></i> T20 Auction</span>
                        ${statusBadge}
                        ${ownerBadge}
                    </div>
                    <div class="card-meta-row">
                        <div class="card-meta-item">
                            <i class="fa-solid fa-users"></i>
                            <span>${teams} Teams</span>
                        </div>
                        <div class="card-meta-item">
                            <i class="fa-regular fa-user"></i>
                            <span>${players} Players</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-divider"></div>
            <div class="card-details">
                ${detailsHtml}
            </div>
            <div class="card-action">
                <button class="btn-manage ${btnClass}" onclick="window.location.href='auction-dashboard.html?id=${aId}'">
                    ${btnText} <i class="fa-solid fa-arrow-right" style="margin-left:4px;"></i>
                </button>
            </div>
        `;

        return card;
    }

    // ---- Carousel Logic ----
    function updateCarousel() {
        const cardWidth = 440 + 20; // card width + gap
        cardsTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

        const total = filteredAuctions.length;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= total - CARDS_VISIBLE;

        // Update dots
        document.querySelectorAll('.c-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    function buildDots() {
        carouselDots.innerHTML = '';
        const total = filteredAuctions.length;
        if (total <= CARDS_VISIBLE) return;

        for (let i = 0; i < total; i++) {
            const dot = document.createElement('button');
            dot.className = `c-dot${i === 0 ? ' active' : ''}`;
            dot.addEventListener('click', () => {
                currentIndex = Math.min(i, total - CARDS_VISIBLE);
                updateCarousel();
            });
            carouselDots.appendChild(dot);
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < filteredAuctions.length - CARDS_VISIBLE) {
            currentIndex++;
            updateCarousel();
        }
    });

    // ---- Search ----
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', () => {
            const q = globalSearch.value.toLowerCase().trim();
            if (q.length < 1) {
                applyFilter();
                return;
            }
            filteredAuctions = allAuctions.filter(a =>
                (a.name || '').toLowerCase().includes(q) ||
                (a.venue || '').toLowerCase().includes(q) ||
                (a.auction_code || '').toLowerCase().includes(q)
            );
            currentIndex = 0;
            renderCards();
        });
    }

    // ---- Utility ----
    function formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':');
        const hrs = parseInt(h);
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const h12 = hrs % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }
});
