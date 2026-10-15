// live-auction.js

// ── Web Audio API Acoustic Engine (100% Offline & Pure Synthesis) ──
const AuctionAudio = (() => {
    let audioCtx = null;
    let isMuted = localStorage.getItem('cricsquad_audio_muted') === 'true';

    function getContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function toggleMute() {
        isMuted = !isMuted;
        localStorage.setItem('cricsquad_audio_muted', isMuted);
        updateSoundButtonUI();
        return isMuted;
    }

    function getMuted() {
        return isMuted;
    }

    function updateSoundButtonUI() {
        const btn = document.getElementById('soundToggleBtn');
        if (!btn) return;
        if (isMuted) {
            btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            btn.classList.add('is-muted');
            btn.title = "Audio Effects Muted (Click to Unmute)";
        } else {
            btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            btn.classList.remove('is-muted');
            btn.title = "Audio Effects Enabled (Click to Mute)";
        }
    }

    // 1. Realistic Mahogany Gavel Strike (Deep resonant thump + wood transient)
    function playHammer() {
        if (isMuted) return;
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Wooden body resonance
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.22);
        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);

        // Acoustic wood snap (noise burst)
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1300;
        filter.Q.value = 2.0;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        // Sounding block slap echo
        const osc2 = ctx.createOscillator();
        const osc2Gain = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(85, now + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        osc2Gain.gain.setValueAtTime(0.5, now + 0.04);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(osc2Gain);
        osc2Gain.connect(ctx.destination);
        osc2.start(now + 0.04);
        osc2.stop(now + 0.35);
    }

    // 2. Crystal Bid Ping (Dual sine bells)
    function playBidPing() {
        if (isMuted) return;
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        [880, 1760].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(idx === 0 ? 0.3 : 0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (idx === 0 ? 0.32 : 0.18));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        });
    }

    // 3. Countdown Clock Tick
    function playTick(isUrgent = false) {
        if (isMuted) return;
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isUrgent ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(isUrgent ? 988 : 660, now);
        gain.gain.setValueAtTime(isUrgent ? 0.22 : 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // 4. Gavel Calling Warning Stage Chime (1st, 2nd, Final Call)
    function playCall(stage = 1) {
        if (isMuted) return;
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const freqs = stage === 1 ? [440, 554] : stage === 2 ? [554, 659] : [659, 880];
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0.28, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.35);
        });
    }

    // 5. Unsold Buzzer
    function playUnsold() {
        if (isMuted) return;
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        [160, 215].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        });
    }

    return {
        playHammer,
        playBidPing,
        playTick,
        playCall,
        playUnsold,
        toggleMute,
        getMuted,
        updateSoundButtonUI
    };
})();

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
    let lastSoldRecord = null; // Mission-critical for Undo Last Sale
    let countdownSeconds = 30;
    let isTimerRunning = false;
    let timerInterval = null;
    let currentGavelStage = 0; // 0: None, 1: 1st Call, 2: 2nd Call, 3: Final Call

    let currentLiveState = {
        currentPlayer: null,
        currentBid: { amount: 0, teamId: null, teamName: null, teamLogo: null, teamShortName: null },
        status: 'waiting',
        stats: { sold: 0, unsold: 0, available: 0, teams: 0 },
        gavelStage: null
    };

    const firebaseUrl = `https://cricket-auction-9b22a-default-rtdb.asia-southeast1.firebasedatabase.app/live_auctions/${auctionId}.json`;

    // Elements
    const timerEl = document.getElementById('auctionTimer');
    const countdownWrap = document.getElementById('countdownWrap');
    const bidCountdownEl = document.getElementById('bidCountdown');
    const toggleTimerBtn = document.getElementById('toggleTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const hotkeysModalBtn = document.getElementById('hotkeysModalBtn');
    const unsoldPoolBtn = document.getElementById('unsoldPoolBtn');
    const unsoldPoolCount = document.getElementById('unsoldPoolCount');
    const undoSaleBtn = document.getElementById('undoSaleBtn');

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
    const poolOpenUnsoldBtn = document.getElementById('poolOpenUnsoldBtn');
    const bringPlayerBlock = document.getElementById('bringPlayerBlock');
    const statUnsoldTile = document.getElementById('statUnsoldTile');

    const currentBidEl = document.getElementById('currentBid');
    const editBidBtn = document.getElementById('editBidBtn');
    const undoBidBtn = document.getElementById('undoBidBtn');
    const holdingPill = document.getElementById('holdingPill');
    const holdingText = document.getElementById('holdingText');
    const gavelStep1 = document.getElementById('gavelStep1');
    const gavelStep2 = document.getElementById('gavelStep2');
    const gavelStep3 = document.getElementById('gavelStep3');
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

    // Undo Sale Modal Elements
    const undoSaleModalBackdrop = document.getElementById('undoSaleModalBackdrop');
    const undoPlayerName = document.getElementById('undoPlayerName');
    const undoTeamName = document.getElementById('undoTeamName');
    const undoSoldPrice = document.getElementById('undoSoldPrice');
    const cancelUndoSaleBtn = document.getElementById('cancelUndoSaleBtn');
    const confirmUndoSaleBtn = document.getElementById('confirmUndoSaleBtn');

    // Unsold Pool Modal Elements
    const unsoldPoolModalBackdrop = document.getElementById('unsoldPoolModalBackdrop');
    const closeUnsoldPoolBtn = document.getElementById('closeUnsoldPoolBtn');
    const unsoldSearchInput = document.getElementById('unsoldSearchInput');
    const bulkResetUnsoldBtn = document.getElementById('bulkResetUnsoldBtn');
    const unsoldDiscountSelect = document.getElementById('unsoldDiscountSelect');
    const unsoldPlayersList = document.getElementById('unsoldPlayersList');

    // Shortcuts Modal Elements
    const shortcutsModalBackdrop = document.getElementById('shortcutsModalBackdrop');
    const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

    // Initialize sound button
    AuctionAudio.updateSoundButtonUI();
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            const muted = AuctionAudio.toggleMute();
            showToast(
                muted ? "Audio Muted" : "Audio Enabled",
                muted ? "Sound effects are now muted." : "Gavel strike, bid pings, and timers are now audible.",
                "info",
                muted ? "fa-volume-xmark" : "fa-volume-high"
            );
        });
    }

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

            // Check for last sold player to enable Undo Last Sale button
            const soldList = allPlayers.filter(p => p.status && p.status.toLowerCase() === 'sold');
            if (soldList.length > 0) {
                const lastP = soldList[soldList.length - 1];
                const team = teams.find(t => (t.id || t.name) === lastP.sold_to_team || t.name === lastP.sold_to_team);
                lastSoldRecord = {
                    playerId: lastP.id,
                    playerName: lastP.name,
                    teamId: lastP.sold_to_team,
                    teamName: team ? team.name : (lastP.sold_to_team || 'Team'),
                    soldPrice: Number(lastP.sold_price || 0)
                };
                updateUndoSaleButtonState();
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

        if (unsoldPoolCount) {
            unsoldPoolCount.textContent = unsold;
        }

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
        resetGavelStage();
        resetCountdown(true);
        AuctionAudio.playBidPing();
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
            // Check if player is in allPlayers and currently Unsold (Round 2 support)
            const unsoldPlayer = allPlayers.find(p => 
                (p.name && p.name.toLowerCase().includes(input.toLowerCase())) || 
                (p.id && p.id.toString() === input)
            );
            if (unsoldPlayer && unsoldPlayer.status && unsoldPlayer.status.toLowerCase() === 'unsold') {
                showToast({
                    title: "Unsold Player (Round 2)",
                    message: `${unsoldPlayer.name} was marked Unsold. Bringing them back onto the block for Round 2!`,
                    type: "sold",
                    icon: "fa-rotate-right"
                });
                bringUnsoldToBlock(unsoldPlayer.id, unsoldPlayer.base_value || 0);
                document.getElementById('manualInput').value = '';
                document.getElementById('manualEntry').classList.remove('la-show');
                return;
            }

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

        // Reset Gavel Stage & Countdown Timer
        resetGavelStage();
        resetCountdown(true);
        AuctionAudio.playBidPing();

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
            stats: currentLiveState.stats,
            gavelStage: null
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
                resetGavelStage();
                resetCountdown(true);
                AuctionAudio.playBidPing();
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
        resetGavelStage();
        resetCountdown(true);
        AuctionAudio.playBidPing();
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
        
        resetGavelStage();
        resetCountdown(true);
        AuctionAudio.playBidPing();

        updateOrganizerUI();
        renderTeams();
        pushToFirebase({ currentBid: currentLiveState.currentBid, gavelStage: null });
        
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
                    final_price: price
                })
            });
            const data = await res.json();

            if (res.ok) {
                AuctionAudio.playHammer();
                pauseCountdown();
                resetGavelStage();

                lastSoldRecord = {
                    playerId: pid,
                    playerName: currentLiveState.currentPlayer.name,
                    teamId: tid,
                    teamName: currentLiveState.currentBid.teamName,
                    soldPrice: price
                };
                updateUndoSaleButtonState();

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
                    soldBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> SOLD <span class="la-kbd-badge la-kbd-green">S</span>';
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
                soldBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> SOLD <span class="la-kbd-badge la-kbd-green">S</span>';
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
            soldBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> SOLD <span class="la-kbd-badge la-kbd-green">S</span>';
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
        await pushToFirebase({ status: 'unsold', gavelStage: null });
        
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/${pid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Unsold', organizer_id: organizerId })
            });
            if (res.ok) {
                AuctionAudio.playUnsold();
                pauseCountdown();
                resetGavelStage();

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
                    unsoldBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> UNSOLD <span class="la-kbd-badge la-kbd-red">U</span>';
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
                unsoldBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> UNSOLD <span class="la-kbd-badge la-kbd-red">U</span>';
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
            unsoldBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> UNSOLD <span class="la-kbd-badge la-kbd-red">U</span>';
        }
    }

    function clearBlock() {
        pauseCountdown();
        resetGavelStage();

        currentLiveState.currentPlayer = null;
        currentLiveState.currentBid = { amount: 0, teamId: null, teamName: null, teamLogo: null, teamShortName: null };
        currentLiveState.status = 'waiting';
        currentLiveState.gavelStage = null;
        
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
            stats: currentLiveState.stats,
            gavelStage: null
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

    // ═══════════════════════════════════════════════
    // 1. ACTIVE BID COUNTDOWN TIMER ENGINE (Item 1.3)
    // ═══════════════════════════════════════════════
    function updateTimerDisplay() {
        if (bidCountdownEl) {
            bidCountdownEl.textContent = `${countdownSeconds}s`;
        }
        if (countdownWrap) {
            if (countdownSeconds <= 5 && isTimerRunning) {
                countdownWrap.classList.add('la-countdown-urgent');
            } else {
                countdownWrap.classList.remove('la-countdown-urgent');
            }
        }
        if (toggleTimerBtn) {
            toggleTimerBtn.innerHTML = isTimerRunning 
                ? '<i class="fa-solid fa-pause"></i>' 
                : '<i class="fa-solid fa-play"></i>';
        }
    }

    function startCountdown() {
        if (isTimerRunning) return;
        if (countdownSeconds <= 0) countdownSeconds = 30;
        isTimerRunning = true;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            if (countdownSeconds > 0) {
                countdownSeconds--;
                if (countdownSeconds <= 5 && countdownSeconds > 0) {
                    AuctionAudio.playTick(true);
                }
                updateTimerDisplay();

                if (countdownSeconds === 0) {
                    pauseCountdown();
                    AuctionAudio.playUnsold();
                    showToast({
                        title: "Time's Up!",
                        message: "Bidding countdown expired. Call final warning or hammer down.",
                        type: "warning",
                        icon: "fa-stopwatch"
                    });
                }
            }
        }, 1000);
    }

    function pauseCountdown() {
        isTimerRunning = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        updateTimerDisplay();
    }

    function toggleCountdown() {
        if (isTimerRunning) {
            pauseCountdown();
        } else {
            startCountdown();
        }
    }

    function resetCountdown(autoStart = false) {
        pauseCountdown();
        countdownSeconds = 30;
        updateTimerDisplay();
        if (autoStart && currentLiveState.currentPlayer) {
            startCountdown();
        }
    }

    if (toggleTimerBtn) toggleTimerBtn.addEventListener('click', toggleCountdown);
    if (resetTimerBtn) resetTimerBtn.addEventListener('click', () => resetCountdown(false));

    // ═══════════════════════════════════════════════
    // 2. 3-STAGE GAVEL WARNING STEPPER (Item 1.3)
    // ═══════════════════════════════════════════════
    function setGavelStage(stage) {
        if (!currentLiveState.currentPlayer) {
            showToast("No Player on the Block", "Bring up a player before calling gavel stages.", "warning", "fa-user-clock");
            return;
        }
        currentGavelStage = stage;

        [gavelStep1, gavelStep2, gavelStep3].forEach(btn => {
            if (btn) btn.classList.remove('active', 'active-final');
        });

        if (stage === 1) {
            if (gavelStep1) gavelStep1.classList.add('active');
            AuctionAudio.playCall(1);
            showToast({
                title: "Going Once...",
                message: `${currentLiveState.currentBid.teamName || 'Opening bid'} at ₹${currentLiveState.currentBid.amount.toLocaleString('en-IN')}`,
                type: "info",
                icon: "fa-gavel"
            });
        } else if (stage === 2) {
            if (gavelStep1) gavelStep1.classList.add('active');
            if (gavelStep2) gavelStep2.classList.add('active');
            AuctionAudio.playCall(2);
            showToast({
                title: "Going Twice...",
                message: `Fair warning! Any counter-bid against ₹${currentLiveState.currentBid.amount.toLocaleString('en-IN')}?`,
                type: "warning",
                icon: "fa-gavel"
            });
        } else if (stage === 3) {
            if (gavelStep1) gavelStep1.classList.add('active');
            if (gavelStep2) gavelStep2.classList.add('active');
            if (gavelStep3) gavelStep3.classList.add('active-final');
            AuctionAudio.playCall(3);
            showToast({
                title: "Final Call!",
                message: "Last chance before the hammer falls! Any higher bid?",
                type: "sold",
                icon: "fa-gavel"
            });
        }

        // Sync to live overlay
        pushToFirebase({
            gavelStage: stage === 1 ? '1st Call' : stage === 2 ? '2nd Call' : stage === 3 ? 'Final Call' : null
        });
    }

    function advanceGavelStage() {
        if (currentGavelStage < 3) {
            setGavelStage(currentGavelStage + 1);
        } else {
            // At Final Call: open SOLD modal directly
            const soldBtn = document.getElementById('soldBtn');
            if (soldBtn) soldBtn.click();
        }
    }

    function resetGavelStage() {
        currentGavelStage = 0;
        [gavelStep1, gavelStep2, gavelStep3].forEach(btn => {
            if (btn) btn.classList.remove('active', 'active-final');
        });
    }

    if (gavelStep1) gavelStep1.addEventListener('click', () => setGavelStage(1));
    if (gavelStep2) gavelStep2.addEventListener('click', () => setGavelStage(2));
    if (gavelStep3) gavelStep3.addEventListener('click', () => setGavelStage(3));

    // ═══════════════════════════════════════════════
    // 3. UNDO LAST SALE (EMERGENCY ROLLBACK - Item 1.1)
    // ═══════════════════════════════════════════════
    function updateUndoSaleButtonState() {
        if (!undoSaleBtn) return;
        undoSaleBtn.style.display = lastSoldRecord ? 'inline-flex' : 'none';
    }

    function openUndoSaleModal() {
        if (!lastSoldRecord) {
            showToast("No Sale to Revert", "There is no completed sale to undo.", "info", "fa-circle-info");
            return;
        }
        if (undoPlayerName) undoPlayerName.textContent = lastSoldRecord.playerName || 'Player';
        if (undoTeamName) undoTeamName.textContent = lastSoldRecord.teamName || 'Team';
        if (undoSoldPrice) undoSoldPrice.textContent = `₹${(lastSoldRecord.soldPrice || 0).toLocaleString('en-IN')}`;
        if (undoSaleModalBackdrop) undoSaleModalBackdrop.style.display = 'flex';
    }

    if (undoSaleBtn) undoSaleBtn.addEventListener('click', openUndoSaleModal);
    if (cancelUndoSaleBtn) cancelUndoSaleBtn.addEventListener('click', () => {
        if (undoSaleModalBackdrop) undoSaleModalBackdrop.style.display = 'none';
    });

    if (confirmUndoSaleBtn) {
        confirmUndoSaleBtn.addEventListener('click', async () => {
            if (undoSaleModalBackdrop) undoSaleModalBackdrop.style.display = 'none';
            if (!lastSoldRecord) return;

            confirmUndoSaleBtn.disabled = true;
            confirmUndoSaleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reverting...';

            try {
                const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/revert-sale`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizer_id: organizerId,
                        player_id: lastSoldRecord.playerId
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    AuctionAudio.playBidPing();
                    showToast({
                        title: "Sale Reverted Successfully",
                        message: `Restored ${lastSoldRecord.playerName} to Available. Refunded ₹${lastSoldRecord.soldPrice.toLocaleString('en-IN')} to ${lastSoldRecord.teamName}.`,
                        type: "sold",
                        icon: "fa-rotate-left"
                    });
                    addActivity(`REVERTED: ${lastSoldRecord.playerName} sale to ${lastSoldRecord.teamName} undone.`);

                    // Refund team in memory
                    const team = teams.find(t => (t.id || t.name) === lastSoldRecord.teamId || t.name === lastSoldRecord.teamName);
                    if (team) {
                        team.balance = data.new_balance !== undefined ? data.new_balance : ((team.balance || 0) + lastSoldRecord.soldPrice);
                        team.players_count = data.new_squad_count !== undefined ? data.new_squad_count : Math.max(0, (team.players_count || 1) - 1);
                    }

                    // Restore player in memory
                    const pObj = allPlayers.find(p => p.id === lastSoldRecord.playerId);
                    if (pObj) {
                        pObj.status = 'Available';
                        delete pObj.sold_to_team;
                        delete pObj.sold_price;
                        if (!availablePlayers.some(p => p.id === pObj.id)) {
                            availablePlayers.push(pObj);
                        }
                        // Put back on block immediately
                        setLivePlayer(pObj);
                    }

                    lastSoldRecord = null;
                    updateUndoSaleButtonState();
                    updateStatsCounters();
                    renderTeams();
                } else {
                    showToast("Revert Failed", data.error || "Could not revert sale.", "error", "fa-circle-exclamation");
                }
            } catch (err) {
                console.error("Error reverting sale:", err);
                showToast("Connection Error", "Network request failed while reverting sale.", "error", "fa-wifi");
            } finally {
                confirmUndoSaleBtn.disabled = false;
                confirmUndoSaleBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Confirm Revert & Refund';
            }
        });
    }

    // ═══════════════════════════════════════════════
    // 4. ROUND 2 / UNSOLD POOL MODAL (Item 1.2)
    // ═══════════════════════════════════════════════
    function renderUnsoldPoolModal() {
        const unsoldList = allPlayers.filter(p => p.status && p.status.toLowerCase() === 'unsold');
        if (unsoldPoolCount) unsoldPoolCount.textContent = unsoldList.length;

        if (!unsoldPlayersList) return;
        const filter = (unsoldSearchInput ? unsoldSearchInput.value : '').trim().toLowerCase();

        const displayList = filter 
            ? unsoldList.filter(p => (p.name && p.name.toLowerCase().includes(filter)) || (p.player_role && p.player_role.toLowerCase().includes(filter)) || (p.category && p.category.toLowerCase().includes(filter)))
            : unsoldList;

        if (displayList.length === 0) {
            unsoldPlayersList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94A3B8;">
                    <i class="fa-solid fa-users" style="font-size: 28px; margin-bottom: 10px; display: block;"></i>
                    <p style="font-weight: 600;">No unsold players ${filter ? 'matching search' : 'in the pool'}.</p>
                </div>
            `;
            return;
        }

        unsoldPlayersList.innerHTML = displayList.map(p => {
            const baseVal = parseInt(p.base_value) || parseInt(auctionSettings.min_bid || 0) || 1000;
            const img = p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=E2E8F0&color=475569`;
            return `
                <div class="la-unsold-item">
                    <div class="la-unsold-item-left">
                        <img src="${img}" alt="${p.name}" class="la-unsold-avatar">
                        <div class="la-unsold-info">
                            <h5>${p.name} <span style="font-size:11px; font-weight:600; color:#64748B;">(#${p.id})</span></h5>
                            <p>${p.player_role || p.category || 'Player'} · Base: ₹${baseVal.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div class="la-unsold-actions">
                        <button type="button" class="la-btn-bring-block" onclick="bringUnsoldToBlock('${p.id}', ${baseVal})">
                            <i class="fa-solid fa-play"></i> Call to Block
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.bringUnsoldToBlock = function(playerId, basePrice) {
        const player = allPlayers.find(p => p.id === playerId);
        if (!player) return;

        player.status = 'Available';
        if (!availablePlayers.some(p => p.id === player.id)) {
            availablePlayers.push(player);
        }
        updateStatsCounters();

        fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/${playerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Available', organizer_id: organizerId })
        }).catch(err => console.error("Error setting player available:", err));

        if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'none';
        setLivePlayer(player);
    };

    if (unsoldPoolBtn) unsoldPoolBtn.addEventListener('click', () => {
        renderUnsoldPoolModal();
        if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'flex';
    });
    if (statUnsoldTile) statUnsoldTile.addEventListener('click', () => {
        renderUnsoldPoolModal();
        if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'flex';
    });
    if (poolOpenUnsoldBtn) poolOpenUnsoldBtn.addEventListener('click', () => {
        renderUnsoldPoolModal();
        if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'flex';
    });
    if (closeUnsoldPoolBtn) closeUnsoldPoolBtn.addEventListener('click', () => {
        if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'none';
    });
    if (unsoldSearchInput) unsoldSearchInput.addEventListener('input', renderUnsoldPoolModal);

    if (bulkResetUnsoldBtn) {
        bulkResetUnsoldBtn.addEventListener('click', async () => {
            const discount = parseFloat(unsoldDiscountSelect ? unsoldDiscountSelect.value : 0) || 0;
            const msg = discount > 0 
                ? `Reset all Unsold players to Available with a ${discount}% base price discount for Round 2?`
                : "Reset all Unsold players to Available at their original base price for Round 2?";
            if (!confirm(msg)) return;

            bulkResetUnsoldBtn.disabled = true;
            bulkResetUnsoldBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';

            try {
                const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/reset-unsold`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizer_id: organizerId,
                        discount_percent: discount
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast({
                        title: "Round 2 Started!",
                        message: data.message || "All unsold players restored to the active pool.",
                        type: "sold",
                        icon: "fa-rotate-right"
                    });
                    if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'none';
                    await loadAuctionData();
                } else {
                    showToast("Failed to Reset", data.error || "Could not reset unsold players.", "error", "fa-circle-exclamation");
                }
            } catch (e) {
                console.error(e);
                showToast("Connection Error", "Network request failed.", "error", "fa-wifi");
            } finally {
                bulkResetUnsoldBtn.disabled = false;
                bulkResetUnsoldBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Reset All for Round 2';
            }
        });
    }

    // ═══════════════════════════════════════════════
    // 5. KEYBOARD SPEED SHORTCUTS (Item 1.5)
    // ═══════════════════════════════════════════════
    if (hotkeysModalBtn) hotkeysModalBtn.addEventListener('click', () => {
        if (shortcutsModalBackdrop) shortcutsModalBackdrop.style.display = 'flex';
    });
    if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', () => {
        if (shortcutsModalBackdrop) shortcutsModalBackdrop.style.display = 'none';
    });

    window.addEventListener('keydown', (e) => {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        // Escape closes any modal or unfocuses
        if (e.key === 'Escape') {
            if (shortcutsModalBackdrop) shortcutsModalBackdrop.style.display = 'none';
            if (unsoldPoolModalBackdrop) unsoldPoolModalBackdrop.style.display = 'none';
            if (soldModalBackdrop) soldModalBackdrop.style.display = 'none';
            if (unsoldModalBackdrop) unsoldModalBackdrop.style.display = 'none';
            if (undoSaleModalBackdrop) undoSaleModalBackdrop.style.display = 'none';
            if (isInput) document.activeElement.blur();
            return;
        }

        // Do not trigger hotkeys if typing in text fields
        if (isInput) return;

        // Ctrl + Z: Undo Last Sale
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            openUndoSaleModal();
            return;
        }

        // Spacebar: Toggle Countdown Timer
        if (e.code === 'Space') {
            e.preventDefault();
            toggleCountdown();
            return;
        }

        // 1-9: Select Team Paddle
        if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1;
            const tiles = document.querySelectorAll('.la-team-tile');
            if (tiles[idx]) {
                e.preventDefault();
                tiles[idx].click();
            }
            return;
        }

        // Arrow Up / +: Bid Up
        if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
            e.preventDefault();
            const btn = document.getElementById('bidUpBtn');
            if (btn) btn.click();
            return;
        }

        // Arrow Down / -: Bid Down
        if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
            e.preventDefault();
            const btn = document.getElementById('bidDownBtn');
            if (btn) btn.click();
            return;
        }

        // S or Enter: Sold (Confirm Sale)
        if (e.key === 's' || e.key === 'S' || (e.key === 'Enter' && soldModalBackdrop && soldModalBackdrop.style.display === 'none')) {
            e.preventDefault();
            const btn = document.getElementById('soldBtn');
            if (btn) btn.click();
            return;
        }

        // U: Unsold
        if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            const btn = document.getElementById('unsoldBtn');
            if (btn) btn.click();
            return;
        }

        // C: Advance Gavel Stage
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            advanceGavelStage();
            return;
        }

        // Z (without Ctrl): Undo Last Bid
        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            undoLastBid();
            return;
        }

        // R: Random Player
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            const btn = document.getElementById('randomBtn');
            if (btn) btn.click();
            return;
        }

        // M: Manual Search
        if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            const manualBtn = document.getElementById('manualBtn');
            const manualEntry = document.getElementById('manualEntry');
            if (manualEntry && manualEntry.style.display !== 'flex') {
                if (manualBtn) manualBtn.click();
            }
            const mInput = document.getElementById('manualInput');
            if (mInput) mInput.focus();
            return;
        }

        // ?: Shortcuts modal
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
            e.preventDefault();
            if (shortcutsModalBackdrop) {
                shortcutsModalBackdrop.style.display = shortcutsModalBackdrop.style.display === 'flex' ? 'none' : 'flex';
            }
            return;
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
