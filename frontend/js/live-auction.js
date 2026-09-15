// live-auction.js

document.addEventListener('DOMContentLoaded', () => {
    // Auth check
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auction_id');

    if (!auctionId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // State
    let auctionSettings = {};
    let allPlayers = [];
    let availablePlayers = [];
    let teams = [];
    let currentLiveState = {
        currentPlayer: null,
        currentBid: { amount: 0, teamId: null, teamName: null },
        status: 'waiting',
        stats: { sold: 0, unsold: 0, available: 0, teams: 0 }
    };

    const firebaseUrl = `https://cricket-auction-9b22a-default-rtdb.asia-southeast1.firebasedatabase.app/live_auctions/${auctionId}.json`;

    // Elements
    const timerEl = document.getElementById('auctionTimer');
    const playerAvatar = document.getElementById('playerAvatar');
    const currentPlayerImg = document.getElementById('currentPlayerImg');
    const playerInitials = document.getElementById('playerInitials');
    const currentPlayerNum = document.getElementById('currentPlayerNum');
    const currentPlayerName = document.getElementById('currentPlayerName');
    const playerRole = document.getElementById('playerRole');
    const currentBidEl = document.getElementById('currentBid');
    const teamsGrid = document.getElementById('teamsGrid');
    const activityList = document.getElementById('activityList');

    // 1. Initial Load
    async function loadAuctionData() {
        try {
            const [auctionRes, playersRes, teamsRes, historyRes] = await Promise.all([
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}`),
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players`),
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/teams`),
                fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/history`)
            ]);

            const auction = await auctionRes.json();
            const playersData = await playersRes.json();
            const teamsData = await teamsRes.json();
            const historyData = await historyRes.json();

            if (auction.error) {
                console.error("Auction not found");
                return;
            }

            auctionSettings = auction;
            document.getElementById('liveTournamentName').textContent = auction.name || 'Cricket Auction';
            document.title = `Live: ${auction.name} - Cricket Auction`;
            
            // Back button
            document.getElementById('backToManageBtn').addEventListener('click', () => {
                window.location.href = `auction-dashboard.html?id=${auctionId}`;
            });

            // Parse Players
            allPlayers = Array.isArray(playersData) ? playersData : Object.values(playersData);
            availablePlayers = allPlayers.filter(p => !p.status || p.status.toLowerCase() === 'available');
            
            // Parse Teams
            teams = Array.isArray(teamsData) ? teamsData : Object.values(teamsData);

            // Update Stats
            updateStatsCounters();
            
            // Render Teams
            renderTeams();
            
            // Populate Recent Activity
            if (Array.isArray(historyData)) {
                // historyData is newest first. We reverse it so `addActivity` (which prepends) puts newest at the top.
                historyData.reverse().forEach(record => {
                    if (record.message) {
                        addActivity(record.message);
                    }
                });
            }

            // Check if there is an active session to resume from Firebase
            try {
                const liveRes = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/live`, { cache: 'no-store' });
                const liveData = await liveRes.json();
                if (liveData && liveData.currentPlayer && liveData.status === 'active') {
                    currentLiveState = liveData;
                    updateOrganizerUI();
                    
                    // Visually highlight the team currently holding the bid
                    if (currentLiveState.currentBid && currentLiveState.currentBid.teamId) {
                        const tile = document.querySelector(`.la-team-tile[data-team-id="${currentLiveState.currentBid.teamId}"]`);
                        if (tile) tile.classList.add('la-team-selected');
                    }
                    showToast("Restored active auction session", "sold");
                }
            } catch (err) {
                console.log("No active live state found to resume or fetch failed.");
            }

        } catch (error) {
            console.error("Error loading auction data:", error);
            showToast("Error loading data", "error");
        }
    }

    function updateStatsCounters() {
        const sold = allPlayers.filter(p => p.status && p.status.toLowerCase() === 'sold').length;
        const unsold = allPlayers.filter(p => p.status && p.status.toLowerCase() === 'unsold').length;
        const avail = availablePlayers.length;

        document.getElementById('statSold').textContent = sold;
        document.getElementById('statUnsold').textContent = unsold;
        document.getElementById('statAvail').textContent = avail;
        document.getElementById('statTeams').textContent = teams.length;

        currentLiveState.stats = { sold, unsold, available: avail, teams: teams.length };
    }

    function renderTeams() {
        teamsGrid.innerHTML = '';
        if (teams.length === 0) {
            teamsGrid.innerHTML = '<div style="padding: 2rem; color: #9CA3AF; text-align: center;">No teams added yet.</div>';
            return;
        }

        teams.forEach(team => {
            const colors = ['#C9A227', '#2E86C1', '#1B2A4A', '#5B3E8F', '#1C3F94', '#B4552E', '#B14E93', '#8C1D1D'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const tile = document.createElement('div');
            tile.className = 'la-team-tile';
            tile.style.setProperty('--team-color', color);
            tile.dataset.teamId = team.id || team.name;
            tile.dataset.teamName = team.name;

            const badgeContent = team.logo_url 
                ? `<img class="la-team-badge" src="${team.logo_url}" alt="${team.short_name || team.name}" style="background:${color}; object-fit: cover;">`
                : `<span class="la-team-badge" style="background:${color}">${(team.short_name || team.name).substring(0,4)}</span>`;

            tile.innerHTML = `
                <span class="la-lead-ribbon">Selected</span>
                <div class="la-team-top">
                    ${badgeContent}
                    <span class="la-team-name-label" style="font-size: 13px;">${team.name}</span>
                </div>
                <div class="la-team-purse">
                    <div class="la-purse-row"><span class="la-p-l">Remaining</span><span class="la-p-v">₹${(team.balance || 0).toLocaleString('en-IN')}</span></div>
                    <div class="la-purse-bar"><div style="width:100%"></div></div>
                </div>
            `;
            
            tile.addEventListener('click', () => selectTeam(tile, team));
            teamsGrid.appendChild(tile);
        });
    }

    // 2. Firebase Push Helper (Routed through Backend to bypass rules)
    async function pushToFirebase(patchData) {
        try {
            const payload = { ...patchData, organizer_id: localStorage.getItem('organizer_id') };
            await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/live`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error("Firebase update failed:", error);
            showToast("Failed to sync with live view", "error");
        }
    }

    // 3. Organizer Actions
    
    // Bring Up Player (Random)
    document.getElementById('randomBtn').addEventListener('click', () => {
        if (availablePlayers.length === 0) {
            showToast("No available players left!", "error");
            return;
        }
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const player = availablePlayers[randomIndex];
        setLivePlayer(player);
    });

    // Bring Up Player (Manual)
    document.getElementById('manualSubmitBtn').addEventListener('click', () => {
        const input = document.getElementById('manualInput').value.trim();
        if (!input) return;
        
        // Try finding by name or ID
        const player = availablePlayers.find(p => 
            p.name.toLowerCase().includes(input.toLowerCase()) || 
            (p.id && p.id.toString() === input)
        );

        if (player) {
            setLivePlayer(player);
            document.getElementById('manualInput').value = '';
            document.getElementById('manualEntry').classList.remove('la-show');
        } else {
            showToast("Player not found in available pool", "error");
        }
    });

    function setLivePlayer(player) {
        currentLiveState.currentPlayer = {
            id: player.id,
            name: player.name,
            role: player.player_role || 'Player',
            image: player.photo_url || '',
            basePrice: parseInt(player.base_value) || (auctionSettings.min_bid || 0)
        };
        currentLiveState.currentBid = {
            amount: currentLiveState.currentPlayer.basePrice,
            teamId: null,
            teamName: null
        };
        currentLiveState.status = 'active';

        // Update UI
        updateOrganizerUI();
        
        // Push to Firebase
        pushToFirebase({
            currentPlayer: currentLiveState.currentPlayer,
            currentBid: currentLiveState.currentBid,
            status: currentLiveState.status,
            stats: currentLiveState.stats
        });
        
        // Initialize history node for this player
        const initHistoryUrl = `http://127.0.0.1:5000/api/auctions/${auctionId}/history/${currentLiveState.currentPlayer.id}`;
        fetch(initHistoryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organizer_id: localStorage.getItem('organizer_id'),
                init_only: true,
                player_name: currentLiveState.currentPlayer.name,
                base_price: currentLiveState.currentPlayer.basePrice
            })
        }).catch(err => console.error("Failed to init history", err));
        
        showToast(`${player.name} is on the block!`, "sold");
    }

    // Bid Controls
    document.getElementById('bidUpBtn').addEventListener('click', () => adjustBid(1));
    document.getElementById('bidDownBtn').addEventListener('click', () => adjustBid(-1));

    function adjustBid(direction) {
        if (!currentLiveState.currentPlayer) return;
        
        const increment = auctionSettings.bid_increase || 100;
        let newAmount = currentLiveState.currentBid.amount + (increment * direction);
        if (newAmount < currentLiveState.currentPlayer.basePrice) {
            newAmount = currentLiveState.currentPlayer.basePrice;
        }
        
        currentLiveState.currentBid.amount = newAmount;
        updateOrganizerUI();
        pushToFirebase({ currentBid: currentLiveState.currentBid });
    }

    // Select Team
    function selectTeam(tile, team) {
        if (!currentLiveState.currentPlayer) return;
        
        document.querySelectorAll('.la-team-tile').forEach(t => t.classList.remove('la-team-selected'));
        tile.classList.add('la-team-selected');

        // If there is already an opening bid placed, subsequent taps increment the bid
        if (currentLiveState.currentBid.teamId !== null) {
            const increment = auctionSettings.bid_increase || 100;
            currentLiveState.currentBid.amount += increment;
        }

        currentLiveState.currentBid.teamId = team.id || team.name;
        currentLiveState.currentBid.teamName = team.name;
        currentLiveState.currentBid.teamLogo = team.logo_url || null;
        currentLiveState.currentBid.teamShortName = team.short_name || (team.name ? team.name.substring(0, 2).toUpperCase() : 'T');
        
        updateOrganizerUI();
        pushToFirebase({ currentBid: currentLiveState.currentBid });
        
        // Log to bid history under player's ID via Backend
        const historyUrl = `http://127.0.0.1:5000/api/auctions/${auctionId}/history/${currentLiveState.currentPlayer.id}`;
        fetch(historyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organizer_id: localStorage.getItem('organizer_id'),
                team_short_name: team.short_name || team.name,
                amount: currentLiveState.currentBid.amount
            })
        }).catch(err => console.error("Failed to log bid history", err));
    }

    // Sell / Unsold Actions
    document.getElementById('soldBtn').addEventListener('click', async () => {
        if (!currentLiveState.currentPlayer) return;
        if (!currentLiveState.currentBid.teamId) {
            showToast("Select a team to sell!", "error");
            return;
        }

        const pid = currentLiveState.currentPlayer.id;
        const price = currentLiveState.currentBid.amount;
        const tid = currentLiveState.currentBid.teamId;

        // 1. Mark in Firebase
        currentLiveState.status = 'sold';
        await pushToFirebase({ status: 'sold' });
        
        // 2. Save in Backend
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizer_id: organizerId,
                    player_id: pid,
                    team_id: tid,
                    sold_price: price
                })
            });
            if(res.ok) {
                showToast(`Sold to ${currentLiveState.currentBid.teamName} for ₹${price.toLocaleString()}`, "sold");
                addActivity(`SOLD: ${currentLiveState.currentPlayer.name} -> ${currentLiveState.currentBid.teamName} (₹${price.toLocaleString()})`);
                
                // Remove from available and update stats locally
                availablePlayers = availablePlayers.filter(p => p.id !== pid);
                updateStatsCounters();
                
                // Auto-clear block after 1.5s (faster process)
                setTimeout(() => clearBlock(), 1500);
            }
        } catch (e) {
            console.error("Error selling player", e);
            showToast("Failed to sell player in DB", "error");
        }
    });

    document.getElementById('unsoldBtn').addEventListener('click', async () => {
        if (!currentLiveState.currentPlayer) return;

        const pid = currentLiveState.currentPlayer.id;

        currentLiveState.status = 'unsold';
        await pushToFirebase({ status: 'unsold' });
        
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/${pid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Unsold' })
            });
            if(res.ok) {
                showToast("Player passed (Unsold)", "error");
                addActivity(`UNSOLD: ${currentLiveState.currentPlayer.name}`);
                
                availablePlayers = availablePlayers.filter(p => p.id !== pid);
                updateStatsCounters();
                
                // Auto-clear block after 1s (faster process)
                setTimeout(() => clearBlock(), 1000);
            }
        } catch (e) {
            console.error("Error passing player", e);
        }
    });

    function clearBlock() {
        currentLiveState.currentPlayer = null;
        currentLiveState.currentBid = { amount: 0, teamId: null, teamName: null };
        currentLiveState.status = 'waiting';
        
        document.querySelectorAll('.la-team-selected').forEach(t => t.classList.remove('la-team-selected'));
        updateOrganizerUI();
        pushToFirebase({ 
            currentPlayer: null, 
            currentBid: currentLiveState.currentBid, 
            status: 'waiting',
            stats: currentLiveState.stats
        });
    }

    function updateOrganizerUI() {
        if (currentLiveState.currentPlayer) {
            const cp = currentLiveState.currentPlayer;
            currentPlayerName.textContent = cp.name;
            playerRole.textContent = cp.role;
            if (cp.image) {
                currentPlayerImg.src = cp.image;
                currentPlayerImg.style.display = 'block';
                playerInitials.style.display = 'none';
            } else {
                playerInitials.textContent = cp.name.substring(0, 2).toUpperCase();
                playerInitials.style.display = 'block';
                currentPlayerImg.style.display = 'none';
            }
        } else {
            currentPlayerName.textContent = "Waiting for Player";
            playerRole.textContent = "--";
            playerInitials.textContent = "?";
            playerInitials.style.display = 'block';
            currentPlayerImg.style.display = 'none';
        }

        currentBidEl.textContent = `₹${(currentLiveState.currentBid.amount).toLocaleString('en-IN')}`;
    }

    function addActivity(text) {
        const item = document.createElement('div');
        item.className = 'la-activity-item';
        item.style.padding = '10px';
        item.style.borderBottom = '1px solid #E5E7EB';
        item.style.fontSize = '0.85rem';
        item.innerHTML = `<i class="fa-solid fa-clock" style="color:#9CA3AF; margin-right:6px;"></i> ${text}`;
        
        const empty = activityList.querySelector('.la-activity-empty');
        if (empty) empty.remove();
        
        activityList.prepend(item);
    }

    // Toggle manual entry
    document.getElementById('manualBtn').addEventListener('click', function () {
        const entry = document.getElementById('manualEntry');
        if (entry.style.display === 'flex') {
            entry.style.display = 'none';
        } else {
            entry.style.display = 'flex';
            document.getElementById('manualInput').focus();
        }
    });

    // Start
    loadAuctionData();

});

function showToast(msg, kind) {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'la-toast';
    if (kind === 'sold') el.classList.add('la-toast-sold');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('la-toast-show'));
    setTimeout(() => { el.classList.remove('la-toast-show'); setTimeout(() => el.remove(), 300); }, 3200);
}
