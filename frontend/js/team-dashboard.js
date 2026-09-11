document.addEventListener('DOMContentLoaded', () => {
    // Authentication
    const organizerId = localStorage.getItem('organizer_id');
    const organizerName = localStorage.getItem('organizer_name');
    
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    if (organizerName) {
        document.getElementById('profileNameDisplay').textContent = organizerName;
        document.getElementById('profileAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(organizerName)}&background=0D8ABC&color=fff`;
    }

    // Get Auction ID and Team ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auction_id');
    const teamId = urlParams.get('team_id');

    if (!auctionId || !teamId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Nav setup
    document.getElementById('backToTeamList').href = `auction-dashboard.html?id=${auctionId}`;
    document.getElementById('navAuctions').href = `auction-dashboard.html?id=${auctionId}`;
    document.getElementById('navTeams').href = `auction-dashboard.html?id=${auctionId}`;

    // UI Elements
    const teamLogoEl = document.getElementById('teamLogo');
    const teamNameEl = document.getElementById('teamName');
    const teamShortNameEl = document.getElementById('teamShortName');
    const teamNameContextEl = document.getElementById('teamNameContext');
    
    const kpiTotalPoints = document.getElementById('kpiTotalPoints');
    const kpiUsedPoints = document.getElementById('kpiUsedPoints');
    const kpiAvailablePoints = document.getElementById('kpiAvailablePoints');
    const kpiMaxBidPoints = document.getElementById('kpiMaxBidPoints');
    const kpiTotalPlayers = document.getElementById('kpiTotalPlayers');

    let auctionData = null;
    let teamData = null;
    let soldPlayers = [];

    // Fetch Data
    async function loadData() {
        try {
            const [auctionRes, teamRes, playersRes] = await Promise.all([
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}`),
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/teams/${teamId}`),
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/teams/${teamId}/players`)
            ]);

            auctionData = await auctionRes.json();
            teamData = await teamRes.json();
            soldPlayers = await playersRes.json();

            if (teamData.error) {
                showToast("Team not found");
                setTimeout(() => window.location.href = `auction-dashboard.html?id=${auctionId}`, 1500);
                return;
            }

            renderUI();
        } catch (e) {
            console.error("Error loading team data:", e);
        }
    }

    function formatNumber(num) {
        return Number(num).toLocaleString();
    }

    function renderUI() {
        // Render Header
        teamNameEl.textContent = teamData.name || 'Unknown Team';
        teamShortNameEl.textContent = teamData.short_name || '--';
        teamNameContextEl.textContent = teamData.name;
        
        if (teamData.logo_url) {
            teamLogoEl.src = teamData.logo_url;
        } else {
            teamLogoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teamData.name || 'Team')}&background=0E48A0&color=fff`;
        }

        // Calculate KPIs
        const maxPlayers = auctionData.players_per_team || 15;
        const minBid = auctionData.min_bid || 0;
        
        const originalBalance = teamData.original_balance || 0;
        const currentBalance = teamData.balance || 0;
        const usedPoints = originalBalance - currentBalance;
        const playersCount = teamData.players_count || 0;
        
        // Max Bid Logic: Available balance minus minimum bids needed to fill remaining mandatory squad slots
        // Assuming maxPlayers is mandatory. If you only have 1 slot left, you can use all money. 
        // If 2 slots, you need to save minBid for 1 slot, so max_bid = current - (1 * minBid).
        const remainingSlots = maxPlayers - playersCount;
        let maxBid = currentBalance;
        if (remainingSlots > 1) {
            maxBid = currentBalance - ((remainingSlots - 1) * minBid);
        }
        if (maxBid < 0) maxBid = 0;
        if (remainingSlots <= 0) maxBid = 0;

        // Render KPIs
        kpiTotalPoints.textContent = formatNumber(originalBalance);
        kpiUsedPoints.textContent = formatNumber(usedPoints);
        kpiAvailablePoints.textContent = formatNumber(currentBalance);
        kpiMaxBidPoints.textContent = formatNumber(maxBid);
        kpiTotalPlayers.textContent = `${playersCount} / ${maxPlayers}`;

        // Render Table
        renderPlayersTable();
    }

    function renderPlayersTable() {
        const tbody = document.getElementById('playersTableBody');
        const countSpan = document.getElementById('soldPlayersCount');
        
        countSpan.textContent = soldPlayers.length;
        document.getElementById('pageTotal').textContent = soldPlayers.length;
        document.getElementById('pageStart').textContent = soldPlayers.length ? 1 : 0;
        document.getElementById('pageEnd').textContent = soldPlayers.length;

        if (soldPlayers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #6B7280; padding: 2rem;">No players have been purchased yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = soldPlayers.map((p, i) => {
            const img = p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=F3F4F6&color=374151`;
            return `
                <tr>
                    <td>${i + 1}</td>
                    <td>
                        <div class="player-cell">
                            <img src="${img}" alt="${p.name}">
                            ${p.name}
                        </div>
                    </td>
                    <td>${p.phone || '--'}</td>
                    <td class="amount-cell">₹${formatNumber(p.sold_amount || 0)}</td>
                </tr>
            `;
        }).join('');
    }

    // Tabs logic
    const tabs = document.querySelectorAll('.team-tab');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Profile Dropdown
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileDropdown = document.getElementById('profileDropdown');
    profileMenuToggle.addEventListener('click', (e) => {
        profileDropdown.classList.toggle('show');
        e.stopPropagation();
    });
    document.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('organizer_id');
            localStorage.removeItem('organizer_name');
            window.location.href = 'index.html';
        });
    }

    // Toast function
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    function showToast(msg) {
        toastMsg.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Load initial data
    loadData();
});
