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
    let bidHistoryStack = [];
    let currentLiveState = {
        currentPlayer: null,
        currentBid: { amount: 0, teamId: null, teamName: null, teamLogo: null, teamShortName: null },
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
    const currentPlayerBase = document.getElementById('currentPlayerBase');
    const currentPlayerCat = document.getElementById('currentPlayerCat');
    const playerSpecs = document.getElementById('playerSpecs');
    const playerStatsRow = document.getElementById('playerStatsRow');
    const poolCompletedNotice = document.getElementById('poolCompletedNotice');
    const bringPlayerBlock = document.getElementById('bringPlayerBlock');

    const currentBidEl = document.getElementById('currentBid');
    const editBidBtn = document.getElementById('editBidBtn');
    const undoBidBtn = document.getElementById('undoBidBtn');
    const holdingPill = document.getElementById('holdingPill');
    const holdingText = document.getElementById('holdingText');
    const teamsGrid = document.getElementById('teamsGrid');
    const activityList = document.getElementById('activityList');

    // Modals
    const soldModalBackdrop = document.getElementById('soldModalBackdrop');
    const modalPlayerName = document.getElementById('modalPlayerName');
    const modalTeamName = document.getElementById('modalTeamName');
    const modalSoldPrice = document.getElementById('modalSoldPrice');
    const modalTeamBalance = document.getElementById('modalTeamBalance');
    const confirmSoldBtn = document.getElementById('confirmSoldBtn');
    const cancelSoldBtn = document.getElementById('cancelSoldBtn');

    const unsoldModalBackdrop = document.getElementById('unsoldModalBackdrop');
    const unsoldWarnText = document.getElementById('unsoldWarnText');
    const confirmUnsoldBtn = document.getElementById('confirmUnsoldBtn');
    const cancelUnsoldBtn = document.getElementById('cancelUnsoldBtn');

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

            // Compute current squad counts for each team
            computeTeamSquadCounts();

            // Update Stats
            updateStatsCounters();
            
            // Render Teams
            renderTeams();
            
            // Populate Recent Activity
            if (Array.isArray(historyData)) {
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
                    renderTeams();
                    showToast({
                        title: "Session Restored",
                        message: "Resumed active auction session from server.",
                        type: "info",
                        icon: "fa-rotate-right"
                    });
                }
            } catch (err) {
                console.log("No active live state found to resume or fetch failed.");
            }

        } catch (error) {
            console.error("Error loading auction data:", error);
            showToast({
                title: "Loading Failed",
                message: "Could not load auction data. Please check your connection and refresh the page.",
                type: "error",
                icon: "fa-triangle-exclamation"
            });
        }
    }

    function computeTeamSquadCounts() {
        const counts = {};
        allPlayers.forEach(p => {
            if (p.status && p.status.toLowerCase() === 'sold' && p.sold_to_team) {
                counts[p.sold_to_team] = (counts[p.sold_to_team] || 0) + 1;
            }
        });
        teams.forEach(t => {
            const tid = t.id || t.name;
            t.players_count = counts[tid] || counts[t.name] || t.players_count || 0;
        });
    }

    // Validation 1.4 Helper: IPL / Professional Reserve Purse Rule
    function getMaxAllowedBid(team) {
        const balance = Number(team.balance || 0);
        const maxPlayers = Number(auctionSettings.players_per_team || 15);
        const currentCount = Number(team.players_count || 0);
        const minBid = Number(auctionSettings.min_bid || 0);
        
        // Slots that must still be filled after buying the current player
        const slotsRemainingAfter = maxPlayers - (currentCount + 1);
        if (slotsRemainingAfter > 0 && minBid > 0) {
            const minReserve = slotsRemainingAfter * minBid;
            return Math.max(0, balance - minReserve);
        }
        return Math.max(0, balance);
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

        // Pool completion state
        if (avail === 0 && !currentLiveState.currentPlayer) {
            if (poolCompletedNotice) poolCompletedNotice.style.display = 'block';
            if (bringPlayerBlock) bringPlayerBlock.style.display = 'none';
        } else {
            if (poolCompletedNotice) poolCompletedNotice.style.display = 'none';
            if (bringPlayerBlock) bringPlayerBlock.style.display = 'block';
        }
    }



    // ── Bid History & Undo Stack ──
    function pushBidHistorySnapshot() {
        bidHistoryStack.push({
            amount: currentLiveState.currentBid.amount,
            teamId: currentLiveState.currentBid.teamId,
            teamName: currentLiveState.currentBid.teamName,
            teamLogo: currentLiveState.currentBid.teamLogo,
            teamShortName: currentLiveState.currentBid.teamShortName
        });
        updateUndoButtonState();
    }

    function updateUndoButtonState() {
        if (!undoBidBtn) return;
        undoBidBtn.style.display = bidHistoryStack.length > 0 ? 'inline-flex' : 'none';
    }

    function undoLastBid() {
        if (bidHistoryStack.length === 0) return;
        const prev = bidHistoryStack.pop();
        currentLiveState.currentBid = {
            amount: prev.amount,
            teamId: prev.teamId,
            teamName: prev.teamName,
            teamLogo: prev.teamLogo,
            teamShortName: prev.teamShortName
        };
        updateUndoButtonState();
        updateOrganizerUI();
        renderTeams();
        showToast({
            title: "Bid Reverted",
            message: `Restored previous bid of ₹${prev.amount.toLocaleString('en-IN')}${prev.teamName ? ' held by ' + prev.teamName : ' (Opening base price)'}.`,
            type: "info",
            icon: "fa-rotate-left"
        });
    }

    if (undoBidBtn) {
        undoBidBtn.addEventListener('click', undoLastBid);
    }

    let teamSortMode = 'default';

    function renderTeams() {
        teamsGrid.innerHTML = '';
        if (teams.length === 0) {
            teamsGrid.innerHTML = '<div style="padding: 2rem; color: #9CA3AF; text-align: center;">No teams added yet.</div>';
            return;
        }

        let displayTeams = [...teams];
        if (teamSortMode === 'purse-desc') {
            displayTeams.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        } else if (teamSortMode === 'name-asc') {
            displayTeams.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        const maxPlayers = Number(auctionSettings.players_per_team || 15);
        const currentBidAmount = (currentLiveState.currentBid && currentLiveState.currentBid.amount) || 0;
        const currentHoldingTeamId = currentLiveState.currentBid && currentLiveState.currentBid.teamId;

        displayTeams.forEach(team => {
            const colors = ['#0E48A0', '#2563EB', '#0D9488', '#059669', '#7C3AED', '#D97706', '#E11D48', '#4F46E5'];
            const color = team.theme_color || colors[Math.abs((team.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length];
            
            const tile = document.createElement('div');
            tile.className = 'la-team-tile';
            tile.style.setProperty('--team-color', color);
            tile.dataset.teamId = team.id || team.name;
            tile.dataset.teamName = team.name;

            const isHolding = currentHoldingTeamId === (team.id || team.name);
            if (isHolding) {
                tile.classList.add('la-team-selected', 'la-team-holding');
            }

            const badgeContent = team.logo_url 
                ? `<img class="la-team-badge" src="${team.logo_url}" alt="${team.short_name || team.name}" style="background:${color}; object-fit: cover;">`
                : `<span class="la-team-badge" style="background:${color}">${(team.short_name || team.name || 'T').substring(0,4)}</span>`;

            const balance = team.balance !== undefined ? team.balance : 0;
            const isNegative = balance < 0;
            const currentSquad = Number(team.players_count || 0);
            const isSquadFull = currentSquad >= maxPlayers;
            const maxAllowed = getMaxAllowedBid(team);
            const isUnaffordable = currentLiveState.currentPlayer && (maxAllowed < currentBidAmount);

            if (isSquadFull) {
                tile.classList.add('la-team-full');
            } else if (isUnaffordable && !isHolding) {
                tile.classList.add('la-team-low-purse');
            }

            let statusTagHtml = '';
            if (isSquadFull) {
                statusTagHtml = `<span class="la-team-status-tag tag-full"><i class="fa-solid fa-ban"></i> Squad Full</span>`;
            } else if (isHolding) {
                statusTagHtml = `<span class="la-team-status-tag tag-ready"><i class="fa-solid fa-gavel"></i> Leading Bid</span>`;
            } else if (isUnaffordable) {
                statusTagHtml = `<span class="la-team-status-tag tag-low" title="Reserve purse limit"><i class="fa-solid fa-triangle-exclamation"></i> Max ₹${maxAllowed.toLocaleString('en-IN')}</span>`;
            } else if (currentLiveState.currentPlayer) {
                statusTagHtml = `<span class="la-team-status-tag tag-ready" title="Max allowed bid"><i class="fa-solid fa-check"></i> Max ₹${maxAllowed.toLocaleString('en-IN')}</span>`;
            }

            tile.innerHTML = `
                <span class="la-lead-ribbon">${isHolding ? '👑 LEADING BIDDER' : 'Selected'}</span>
                <div class="la-team-top">
                    ${badgeContent}
                    <span class="la-team-name-label">${team.name}</span>
                </div>
                <div class="la-team-purse">
                    <div class="la-purse-row">
                        <span class="la-p-l">Remaining</span>
                        <span class="la-p-v ${isNegative ? 'la-negative-balance' : ''}">₹${balance.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="la-purse-bar">
                        <div style="width:${isNegative ? '0%' : '100%'}; ${isNegative ? 'background:#EF4444;' : ''}"></div>
                    </div>
                </div>
                <div class="la-team-meta-row">
                    <span class="la-squad-badge"><i class="fa-solid fa-users"></i> ${currentSquad}/${maxPlayers}</span>
                    ${statusTagHtml}
                </div>
            `;
            
            tile.addEventListener('click', () => selectTeam(tile, team));
            teamsGrid.appendChild(tile);
        });
    }

    // Sort button toggle
    const sortBtn = document.querySelector('.la-sort-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            if (teamSortMode === 'default') {
                teamSortMode = 'purse-desc';
                sortBtn.innerHTML = '<i class="fa-solid fa-arrow-down-9-1"></i> Purse';
            } else if (teamSortMode === 'purse-desc') {
                teamSortMode = 'name-asc';
                sortBtn.innerHTML = '<i class="fa-solid fa-arrow-down-a-z"></i> Name';
            } else {
                teamSortMode = 'default';
                sortBtn.innerHTML = '<i class="fa-solid fa-arrow-down-a-z"></i> Sort';
            }
            renderTeams();
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
            showToast({
                title: "Live Screen Sync Issue",
                message: "Could not update the spectator screen. Please verify your connection.",
                type: "warning",
                icon: "fa-tower-broadcast"
            });
        }
    }

    // 3. Organizer Actions
    
    // Bring Up Player (Random)
    document.getElementById('randomBtn').addEventListener('click', () => {
        if (availablePlayers.length === 0) {
            showToast({
                title: "Auction Pool Complete",
                message: "All players have been brought up for bidding. There are no available players remaining.",
                type: "info",
                icon: "fa-check-double"
            });
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
        
        const player = availablePlayers.find(p => 
            p.name.toLowerCase().includes(input.toLowerCase()) || 
            (p.id && p.id.toString() === input)
        );

        if (player) {
            setLivePlayer(player);
            document.getElementById('manualInput').value = '';
            document.getElementById('manualEntry').classList.remove('la-show');
        } else {
            showToast({
                title: "Player Not Found",
                message: `No available player matching "${input}" was found in the pool. Check spelling or check if they were already auctioned.`,
                type: "warning",
                icon: "fa-magnifying-glass"
            });
        }
    });

    function setLivePlayer(player) {
        // Validation 1.3: Prevent bringing up sold player
        if (player.status && player.status.toLowerCase() === 'sold') {
            showToast({
                title: "Player Already Sold",
                message: `${player.name} has already been sold in this tournament and cannot be called again.`,
                type: "warning",
                icon: "fa-user-check"
            });
            return;
        }

        // Reset Undo Stack for new player
        bidHistoryStack = [];
        updateUndoButtonState();

        const baseVal = parseInt(player.base_value) || parseInt(auctionSettings.min_bid || 0) || 1000;

        currentLiveState.currentPlayer = {
            id: player.id,
            name: player.name,
            role: player.player_role || 'Player',
            category: player.category || '',
            image: player.photo_url || '',
            basePrice: baseVal,
            batting_style: player.batting_style || '',
            bowling_style: player.bowling_style || '',
            matches: player.matches || '',
            runs: player.runs || '',
            wickets: player.wickets || ''
        };
        currentLiveState.currentBid = {
            amount: baseVal,
            teamId: null,
            teamName: null,
            teamLogo: null,
            teamShortName: null
        };
        currentLiveState.status = 'active';

        // Update UI
        updateOrganizerUI();
        renderTeams();
        
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
        
        showToast({
            title: "Player on the Block",
            message: `${player.name} is now up for bidding · Base Price: ₹${baseVal.toLocaleString('en-IN')}.`,
            type: "info",
            icon: "fa-cricket-bat-ball"
        });
    }

    // Bid Controls
    document.getElementById('bidUpBtn').addEventListener('click', () => adjustBid(1));
    document.getElementById('bidDownBtn').addEventListener('click', () => adjustBid(-1));

    if (editBidBtn) {
        editBidBtn.addEventListener('click', () => {
            if (!currentLiveState.currentPlayer) {
                showToast({
                    title: "No Player on the Block",
                    message: "Please choose a player from the available list before adjusting bids.",
                    type: "warning",
                    icon: "fa-user-clock"
                });
                return;
            }
            const basePrice = currentLiveState.currentPlayer.basePrice || (auctionSettings.min_bid || 0);
            const input = prompt("Enter new bid amount (₹):", currentLiveState.currentBid.amount);
            if (input !== null) {
                const cleanNum = parseInt(input.replace(/[^0-9]/g, ''));
                if (isNaN(cleanNum) || cleanNum <= 0) {
                    showToast({
                        title: "Invalid Bid Amount",
                        message: "Please enter a valid positive amount in rupees (e.g. 50000).",
                        type: "warning",
                        icon: "fa-circle-exclamation"
                    });
                    return;
                }
                // Validation 1.5: Cannot be less than base price
                if (cleanNum < basePrice) {
                    showToast({
                        title: "Below Starting Price",
                        message: `Starting base price for this player is ₹${basePrice.toLocaleString('en-IN')}. Bids cannot go below base price.`,
                        type: "warning",
                        icon: "fa-arrow-down-wide-short"
                    });
                    return;
                }
                // Validation 1.1 & 1.4: Check holding team capacity
                if (currentLiveState.currentBid.teamId) {
                    const holdingTeam = teams.find(t => (t.id || t.name) === currentLiveState.currentBid.teamId);
                    if (holdingTeam) {
                        const maxAllowed = getMaxAllowedBid(holdingTeam);
                        if (cleanNum > maxAllowed) {
                            showToast({
                                title: "Exceeds Team Budget",
                                message: `${holdingTeam.name} can only bid up to ₹${maxAllowed.toLocaleString('en-IN')}. They cannot afford ₹${cleanNum.toLocaleString('en-IN')}.`,
                                type: "error",
                                icon: "fa-wallet"
                            });
                            return;
                        }
                    }
                }
                pushBidHistorySnapshot();
                currentLiveState.currentBid.amount = cleanNum;
                updateOrganizerUI();
                renderTeams();
                pushToFirebase({ currentBid: currentLiveState.currentBid });
                showToast({
                    title: "Bid Amount Updated",
                    message: `Current bid has been adjusted to ₹${cleanNum.toLocaleString('en-IN')}.`,
                    type: "info",
                    icon: "fa-pen-to-square"
                });
            }
        });
    }

    function adjustBid(direction) {
        if (!currentLiveState.currentPlayer) return;
        
        const basePrice = currentLiveState.currentPlayer.basePrice || (auctionSettings.min_bid || 0);
        const increment = Number(auctionSettings.bid_increase || 100);
        let newAmount = currentLiveState.currentBid.amount + (increment * direction);

        // Validation 1.5: Never decrease below base price
        if (newAmount < basePrice) {
            newAmount = basePrice;
            if (direction < 0) {
                showToast({
                    title: "Cannot Go Below Starting Price",
                    message: `Starting base price for ${currentLiveState.currentPlayer.name} is ₹${basePrice.toLocaleString('en-IN')}. Bids cannot be reduced further.`,
                    type: "warning",
                    icon: "fa-arrow-down-wide-short"
                });
                return;
            }
        }

        // Validation 1.1 & 1.4: If a team is holding bid, check affordability
        if (currentLiveState.currentBid.teamId) {
            const holdingTeam = teams.find(t => (t.id || t.name) === currentLiveState.currentBid.teamId);
            if (holdingTeam) {
                const maxAllowed = getMaxAllowedBid(holdingTeam);
                if (newAmount > maxAllowed) {
                    showToast({
                        title: "Budget Limit Reached",
                        message: `${holdingTeam.name} can only bid up to ₹${maxAllowed.toLocaleString('en-IN')}. They cannot afford ₹${newAmount.toLocaleString('en-IN')}.`,
                        type: "error",
                        icon: "fa-wallet"
                    });
                    return;
                }
            }
        }
        
        pushBidHistorySnapshot();
        currentLiveState.currentBid.amount = newAmount;
        updateOrganizerUI();
        renderTeams();
        pushToFirebase({ currentBid: currentLiveState.currentBid });
    }

    // Select Team (Auctioneer Validations: Self-bidding, Squad limit, Reserve Purse, Concurrency)
    function selectTeam(tile, team) {
        if (!currentLiveState.currentPlayer) {
            showToast({
                title: "No Player on the Block",
                message: "Please choose a player from the list before placing team bids.",
                type: "warning",
                icon: "fa-user-clock"
            });
            return;
        }

        // Auctioneer Rule: A team cannot outbid itself!
        if (currentLiveState.currentBid.teamId === (team.id || team.name)) {
            showToast({
                title: "Already Highest Bidder",
                message: `${team.name} already holds the top bid of ₹${currentLiveState.currentBid.amount.toLocaleString('en-IN')}. Another franchise must counter-bid before they can bid again.`,
                type: "warning",
                icon: "fa-hand"
            });
            return;
        }

        const maxPlayers = Number(auctionSettings.players_per_team || 15);
        const currentSquad = Number(team.players_count || 0);

        // Validation 1.2: Squad limit check
        if (currentSquad >= maxPlayers) {
            showToast({
                title: "Squad Already Full",
                message: `${team.name} already has ${currentSquad} of ${maxPlayers} allowed players. Their squad is complete and cannot buy any more players.`,
                type: "error",
                icon: "fa-users-slash"
            });
            return;
        }

        // Calculate prospective bid
        const increment = Number(auctionSettings.bid_increase || 100);
        let prospectiveBid = currentLiveState.currentBid.amount;
        if (currentLiveState.currentBid.teamId !== null) {
            prospectiveBid += increment;
        }

        // Validation 1.1 & 1.4: Purse balance & Reserve rule check
        const maxAllowed = getMaxAllowedBid(team);
        const balance = team.balance || 0;

        if (prospectiveBid > maxAllowed) {
            if (prospectiveBid > balance) {
                showToast({
                    title: "Not Enough Budget",
                    message: `${team.name} only has ₹${balance.toLocaleString('en-IN')} remaining. They cannot afford a bid of ₹${prospectiveBid.toLocaleString('en-IN')}.`,
                    type: "error",
                    icon: "fa-wallet"
                });
            } else {
                const slotsRemaining = maxPlayers - (currentSquad + 1);
                const minBid = Number(auctionSettings.min_bid || 0);
                const reserveNeeded = slotsRemaining * minBid;
                showToast({
                    title: "Must Save Budget For Next Players",
                    message: `${team.name} can only bid up to ₹${maxAllowed.toLocaleString('en-IN')}. They must save ₹${reserveNeeded.toLocaleString('en-IN')} to buy their remaining ${slotsRemaining} required players.`,
                    type: "warning",
                    icon: "fa-piggy-bank"
                });
            }
            return;
        }

        pushBidHistorySnapshot();

        document.querySelectorAll('.la-team-tile').forEach(t => t.classList.remove('la-team-selected', 'la-team-holding'));
        tile.classList.add('la-team-selected', 'la-team-holding');

        currentLiveState.currentBid.amount = prospectiveBid;
        currentLiveState.currentBid.teamId = team.id || team.name;
        currentLiveState.currentBid.teamName = team.name;
        currentLiveState.currentBid.teamLogo = team.logo_url || null;
        currentLiveState.currentBid.teamShortName = team.short_name || (team.name ? team.name.substring(0, 2).toUpperCase() : 'T');
        
        updateOrganizerUI();
        renderTeams();
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

        showToast({
            title: "New Leading Bid",
            message: `${team.name} placed a bid of ₹${prospectiveBid.toLocaleString('en-IN')}.`,
            type: "sold",
            icon: "fa-gavel"
        });
    }

    // ── Auctioneer Gavel & Sold Modal Flow ──
    let isProcessingSale = false;

    document.getElementById('soldBtn').addEventListener('click', () => {
        if (isProcessingSale) return;

        if (!currentLiveState.currentPlayer) {
            showToast({
                title: "No Player on the Block",
                message: "Please bring up a player from the pool before confirming a sale.",
                type: "warning",
                icon: "fa-user-clock"
            });
            return;
        }
        if (!currentLiveState.currentBid.teamId) {
            showToast({
                title: "Choose Winning Team First",
                message: "Please tap the winning franchise team tile before confirming SOLD.",
                type: "warning",
                icon: "fa-arrow-pointer"
            });
            return;
        }

        const price = currentLiveState.currentBid.amount;
        const tid = currentLiveState.currentBid.teamId;
        const basePrice = currentLiveState.currentPlayer.basePrice || 0;

        // Validation 1.5: Positive price and at least base price
        if (price < basePrice || price <= 0) {
            showToast({
                title: "Below Starting Price",
                message: `Starting base price for this player is ₹${basePrice.toLocaleString('en-IN')}. You cannot sell below base price.`,
                type: "warning",
                icon: "fa-arrow-down-wide-short"
            });
            return;
        }

        // Validation 1.1, 1.2 & 1.4: Pre-check before showing modal
        const winningTeam = teams.find(t => (t.id || t.name) === tid);
        if (winningTeam) {
            const maxPlayers = Number(auctionSettings.players_per_team || 15);
            if ((winningTeam.players_count || 0) >= maxPlayers) {
                showToast({
                    title: "Squad Already Full",
                    message: `Cannot sell to ${winningTeam.name} because their squad has already reached the maximum limit of ${maxPlayers} players.`,
                    type: "error",
                    icon: "fa-users-slash"
                });
                return;
            }
            const maxAllowed = getMaxAllowedBid(winningTeam);
            if (price > maxAllowed) {
                showToast({
                    title: "Budget Limit Exceeded",
                    message: `${winningTeam.name} does not have enough remaining budget to complete this purchase (Max allowed: ₹${maxAllowed.toLocaleString('en-IN')}).`,
                    type: "error",
                    icon: "fa-wallet"
                });
                return;
            }

            const balAfter = (winningTeam.balance || 0) - price;
            modalTeamBalance.textContent = `₹${balAfter.toLocaleString('en-IN')}`;
        } else {
            modalTeamBalance.textContent = "--";
        }

        // Populate and open Gavel Modal
        modalPlayerName.textContent = currentLiveState.currentPlayer.name;
        modalTeamName.textContent = currentLiveState.currentBid.teamName;
        modalSoldPrice.textContent = `₹${price.toLocaleString('en-IN')}`;
        soldModalBackdrop.style.display = 'flex';
    });

    if (cancelSoldBtn) {
        cancelSoldBtn.addEventListener('click', () => {
            soldModalBackdrop.style.display = 'none';
        });
    }

    if (confirmSoldBtn) {
        confirmSoldBtn.addEventListener('click', () => {
            soldModalBackdrop.style.display = 'none';
            executeSale();
        });
    }

    async function executeSale() {
        if (isProcessingSale) return;

        const pid = currentLiveState.currentPlayer.id;
        const price = currentLiveState.currentBid.amount;
        const tid = currentLiveState.currentBid.teamId;
        const winningTeam = teams.find(t => (t.id || t.name) === tid);

        // Lock UI
        isProcessingSale = true;
        const soldBtn = document.getElementById('soldBtn');
        const unsoldBtn = document.getElementById('unsoldBtn');
        soldBtn.disabled = true;
        unsoldBtn.disabled = true;
        soldBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> HAMMERING...';

        try {
            // 1. Mark in Firebase
            currentLiveState.status = 'sold';
            await pushToFirebase({ status: 'sold' });

            // 2. Commit in Backend
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

            const data = await res.json();

            if (res.ok) {
                showToast({
                    title: "Hammer Down · SOLD!",
                    message: `${currentLiveState.currentPlayer.name} has been sold to ${currentLiveState.currentBid.teamName} for ₹${price.toLocaleString('en-IN')}!`,
                    type: "sold",
                    icon: "fa-trophy"
                });
                addActivity(`SOLD: ${currentLiveState.currentPlayer.name} -> ${currentLiveState.currentBid.teamName} (₹${price.toLocaleString('en-IN')})`);
                
                // Update local memory
                if (winningTeam) {
                    winningTeam.balance = data.new_balance !== undefined ? data.new_balance : ((winningTeam.balance || 0) - price);
                    winningTeam.players_count = data.players_count !== undefined ? data.players_count : ((winningTeam.players_count || 0) + 1);
                }
                
                availablePlayers = availablePlayers.filter(p => p.id !== pid);
                updateStatsCounters();
                renderTeams();
                
                // Auto-clear block after 1.5s
                setTimeout(() => {
                    clearBlock();
                    isProcessingSale = false;
                    soldBtn.disabled = false;
                    unsoldBtn.disabled = false;
                    soldBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> SOLD';
                }, 1500);
            } else {
                showToast({
                    title: "Sale Not Allowed",
                    message: data.error || "The sale could not be completed. Please check team limits.",
                    type: "error",
                    icon: "fa-circle-xmark"
                });
                currentLiveState.status = 'active';
                await pushToFirebase({ status: 'active' });
                isProcessingSale = false;
                soldBtn.disabled = false;
                unsoldBtn.disabled = false;
                soldBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> SOLD';
            }
        } catch (e) {
            console.error("Error selling player", e);
            showToast({
                title: "Connection Problem",
                message: "Failed to connect to backend server. Please verify if the server is running.",
                type: "error",
                icon: "fa-wifi"
            });
            currentLiveState.status = 'active';
            await pushToFirebase({ status: 'active' });
            isProcessingSale = false;
            soldBtn.disabled = false;
            unsoldBtn.disabled = false;
            soldBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> SOLD';
        }
    }

    // ── Unsold Flow with Active Bid Warning ──
    document.getElementById('unsoldBtn').addEventListener('click', () => {
        if (isProcessingSale) return;
        if (!currentLiveState.currentPlayer) {
            showToast({
                title: "No Player on the Block",
                message: "Please bring up a player before marking unsold.",
                type: "warning",
                icon: "fa-user-clock"
            });
            return;
        }

        // Active Bid Guard: If a team has bid, warn auctioneer before canceling
        if (currentLiveState.currentBid.teamId !== null) {
            unsoldWarnText.innerHTML = `<strong>${currentLiveState.currentBid.teamName}</strong> is currently winning this player with an active bid of <strong>₹${currentLiveState.currentBid.amount.toLocaleString('en-IN')}</strong>.<br><br>Are you sure you want to pass? Marking UNSOLD will cancel their bid and no team will get this player.`;
            unsoldModalBackdrop.style.display = 'flex';
        } else {
            executeUnsold();
        }
    });

    if (cancelUnsoldBtn) {
        cancelUnsoldBtn.addEventListener('click', () => {
            unsoldModalBackdrop.style.display = 'none';
        });
    }

    if (confirmUnsoldBtn) {
        confirmUnsoldBtn.addEventListener('click', () => {
            unsoldModalBackdrop.style.display = 'none';
            executeUnsold();
        });
    }

    async function executeUnsold() {
        if (isProcessingSale) return;
        const pid = currentLiveState.currentPlayer.id;
        isProcessingSale = true;
        const soldBtn = document.getElementById('soldBtn');
        const unsoldBtn = document.getElementById('unsoldBtn');
        soldBtn.disabled = true;
        unsoldBtn.disabled = true;
        unsoldBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PASSING...';

        currentLiveState.status = 'unsold';
        await pushToFirebase({ status: 'unsold' });
        
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/${pid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Unsold', organizer_id: organizerId })
            });
            if (res.ok) {
                showToast({
                    title: "Player Passed · UNSOLD",
                    message: `${currentLiveState.currentPlayer.name} received no bids and has been moved to the unsold list.`,
                    type: "warning",
                    icon: "fa-ban"
                });
                addActivity(`UNSOLD: ${currentLiveState.currentPlayer.name}`);
                
                availablePlayers = availablePlayers.filter(p => p.id !== pid);
                updateStatsCounters();
                
                setTimeout(() => {
                    clearBlock();
                    isProcessingSale = false;
                    soldBtn.disabled = false;
                    unsoldBtn.disabled = false;
                    unsoldBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> UNSOLD';
                }, 1000);
            } else {
                showToast({
                    title: "Update Failed",
                    message: "Could not mark player as unsold. Please try again.",
                    type: "error",
                    icon: "fa-triangle-exclamation"
                });
                isProcessingSale = false;
                soldBtn.disabled = false;
                unsoldBtn.disabled = false;
                unsoldBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> UNSOLD';
            }
        } catch (e) {
            console.error("Error passing player", e);
            showToast({
                title: "Connection Error",
                message: "Network request failed. Please check your connection.",
                type: "error",
                icon: "fa-wifi"
            });
            isProcessingSale = false;
            soldBtn.disabled = false;
            unsoldBtn.disabled = false;
            unsoldBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> UNSOLD';
        }
    }

    function clearBlock() {
        currentLiveState.currentPlayer = null;
        currentLiveState.currentBid = { amount: 0, teamId: null, teamName: null, teamLogo: null, teamShortName: null };
        currentLiveState.status = 'waiting';
        
        bidHistoryStack = [];
        updateUndoButtonState();

        document.querySelectorAll('.la-team-selected, .la-team-holding').forEach(t => {
            t.classList.remove('la-team-selected', 'la-team-holding');
        });
        updateOrganizerUI();
        renderTeams();
        updateStatsCounters();

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

            // Base price tag
            if (currentPlayerBase) {
                currentPlayerBase.innerHTML = `<i class="fa-solid fa-tag"></i> Base: ₹${(cp.basePrice || 0).toLocaleString('en-IN')}`;
                currentPlayerBase.style.display = 'inline-flex';
            }

            // Category tag
            if (currentPlayerCat) {
                if (cp.category) {
                    currentPlayerCat.innerHTML = `<i class="fa-solid fa-star"></i> ${cp.category}`;
                    currentPlayerCat.style.display = 'inline-flex';
                } else {
                    currentPlayerCat.style.display = 'none';
                }
            }

            // Specs
            if (playerSpecs) {
                const specs = [];
                if (cp.batting_style) specs.push(`🏏 ${cp.batting_style}`);
                if (cp.bowling_style) specs.push(`🎯 ${cp.bowling_style}`);
                if (specs.length > 0) {
                    playerSpecs.innerHTML = specs.join(' • ');
                    playerSpecs.style.display = 'flex';
                } else {
                    playerSpecs.style.display = 'none';
                }
            }

            // Cricket Stats
            if (playerStatsRow) {
                let statsHtml = '';
                if (cp.matches) statsHtml += `<span class="la-stat-pill">${cp.matches} Matches</span>`;
                if (cp.runs) statsHtml += `<span class="la-stat-pill">${cp.runs} Runs</span>`;
                if (cp.wickets) statsHtml += `<span class="la-stat-pill">${cp.wickets} Wickets</span>`;
                if (statsHtml) {
                    playerStatsRow.innerHTML = statsHtml;
                    playerStatsRow.style.display = 'flex';
                } else {
                    playerStatsRow.style.display = 'none';
                }
            }

        } else {
            currentPlayerName.textContent = "Waiting for Player";
            playerRole.textContent = "--";
            playerInitials.textContent = "?";
            playerInitials.style.display = 'block';
            currentPlayerImg.style.display = 'none';
            if (currentPlayerBase) currentPlayerBase.style.display = 'none';
            if (currentPlayerCat) currentPlayerCat.style.display = 'none';
            if (playerSpecs) playerSpecs.style.display = 'none';
            if (playerStatsRow) playerStatsRow.style.display = 'none';
        }

        currentBidEl.textContent = `₹${(currentLiveState.currentBid.amount).toLocaleString('en-IN')}`;

        // Holding Franchise Badge in Console Dock
        if (holdingPill) {
            if (currentLiveState.currentBid.teamId && currentLiveState.currentBid.teamName) {
                holdingPill.style.display = 'inline-flex';
                if (holdingText) {
                    holdingText.textContent = `Leading: ${currentLiveState.currentBid.teamName}`;
                }
            } else {
                holdingPill.style.display = 'none';
            }
        }
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

// ── Human-Friendly Toast Notification System ──
function showToast(arg1, arg2, arg3, arg4) {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;

    let title = '';
    let message = '';
    let type = 'info'; // 'error' | 'warning' | 'sold' | 'info'
    let icon = '';

    if (typeof arg1 === 'object' && arg1 !== null) {
        title = arg1.title || '';
        message = arg1.message || arg1.desc || '';
        type = arg1.type || 'info';
        icon = arg1.icon || '';
    } else if (typeof arg1 === 'string' && typeof arg2 === 'string' && arg3 !== undefined) {
        title = arg1;
        message = arg2;
        type = arg3 || 'info';
        icon = arg4 || '';
    } else {
        // Fallback for single-string or legacy showToast(msg, kind)
        const rawMsg = String(arg1 || '');
        const kind = String(arg2 || 'info');
        type = (kind === 'sold' || kind === 'success') ? 'sold' : (kind === 'error' ? 'error' : 'info');

        // Strip leading emojis and symbols from raw messages
        const cleaned = rawMsg.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⛔❌⚠️🎉🏏↩️\s]+/u, '').trim();

        const lower = cleaned.toLowerCase();
        if (lower.includes('reserve') || lower.includes('save budget') || lower.includes('remaining slots')) {
            title = 'Must Save Budget For Next Players';
            type = 'warning';
            icon = 'fa-piggy-bank';
            message = cleaned;
        } else if (lower.includes('budget') || lower.includes('purse') || lower.includes('afford') || lower.includes('insufficient')) {
            title = 'Not Enough Budget';
            type = 'error';
            icon = 'fa-wallet';
            message = cleaned;
        } else if (lower.includes('squad') && (lower.includes('full') || lower.includes('limit'))) {
            title = 'Squad Already Full';
            type = 'error';
            icon = 'fa-users-slash';
            message = cleaned;
        } else if (lower.includes('counter-bid') || lower.includes('already holds') || lower.includes('winning bid')) {
            title = 'Already Highest Bidder';
            type = 'warning';
            icon = 'fa-hand';
            message = cleaned;
        } else if (lower.includes('base price') || lower.includes('starting price')) {
            title = 'Cannot Go Below Starting Price';
            type = 'warning';
            icon = 'fa-arrow-down-wide-short';
            message = cleaned;
        } else if (lower.includes('sold to') || lower.includes('sold!')) {
            title = 'Hammer Down · SOLD!';
            type = 'sold';
            icon = 'fa-trophy';
            message = cleaned;
        } else if (lower.includes('revert') || lower.includes('undo')) {
            title = 'Bid Reverted';
            type = 'info';
            icon = 'fa-rotate-left';
            message = cleaned;
        } else if (lower.includes('unsold') || lower.includes('passed')) {
            title = 'Player Passed · UNSOLD';
            type = 'warning';
            icon = 'fa-ban';
            message = cleaned;
        } else if (type === 'error') {
            title = 'Action Not Allowed';
            icon = 'fa-circle-exclamation';
            message = cleaned;
        } else if (type === 'sold') {
            title = 'Action Successful';
            icon = 'fa-circle-check';
            message = cleaned;
        } else {
            title = 'Notice';
            icon = 'fa-circle-info';
            message = cleaned;
        }
    }

    // Default icon fallback by type
    if (!icon) {
        if (type === 'sold' || type === 'success') icon = 'fa-trophy';
        else if (type === 'error') icon = 'fa-circle-exclamation';
        else if (type === 'warning') icon = 'fa-triangle-exclamation';
        else icon = 'fa-circle-info';
    }

    // Ensure icon has FontAwesome fa- prefix
    if (!icon.includes('fa-')) {
        icon = `fa-solid ${icon}`;
    } else if (!icon.startsWith('fa-solid ') && !icon.startsWith('fa-regular ') && !icon.startsWith('fa-brands ')) {
        icon = `fa-solid ${icon}`;
    }

    const el = document.createElement('div');
    el.className = `la-toast la-toast-${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
        <div class="la-toast-icon-wrap">
            <i class="${icon}"></i>
        </div>
        <div class="la-toast-content">
            <h4 class="la-toast-title">${title}</h4>
            <p class="la-toast-desc">${message}</p>
        </div>
        <button type="button" class="la-toast-close" title="Dismiss" aria-label="Dismiss notification">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="la-toast-progress">
            <div class="la-toast-bar"></div>
        </div>
    `;

    // Dismiss handling
    let isDismissed = false;
    const dismissToast = () => {
        if (isDismissed) return;
        isDismissed = true;
        el.classList.remove('la-toast-show');
        el.classList.add('la-toast-hide');
        setTimeout(() => el.remove(), 260);
    };

    const closeBtn = el.querySelector('.la-toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dismissToast();
        });
    }

    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('la-toast-show'));

    // Auto-dismiss after 4.5s
    setTimeout(dismissToast, 4500);
}
