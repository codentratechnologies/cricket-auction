document.addEventListener('DOMContentLoaded', () => {
    // Auth check
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auction_id');
    const playerId = urlParams.get('player_id');

    if (!auctionId || !playerId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Back Button setup
    document.getElementById('backBtn').href = `auction-dashboard.html?id=${auctionId}`;

    // Load Organizer Info (from dashboard API or local storage, here we use dashboard api for accuracy)
    fetch(`http://127.0.0.1:5000/api/dashboard/${organizerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                const userName = data.user.name || 'Organizer';
                document.querySelectorAll('.profile-name').forEach(el => el.textContent = userName);
                const avatar = document.getElementById('profileAvatar');
                if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;
            }
        }).catch(err => console.error("Error fetching user data:", err));

    // Load Player Data
    fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/${playerId}`)
        .then(res => res.json())
        .then(player => {
            if (player.error) {
                alert("Player not found!");
                window.location.href = `auction-dashboard.html?id=${auctionId}`;
                return;
            }
            populatePlayerDetails(player);
        })
        .catch(err => {
            console.error("Error loading player details:", err);
            document.getElementById('loadingState').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red"></i> Error loading player details.';
        });

    function populatePlayerDetails(p) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('playerProfileContent').classList.remove('hidden');

        // Main Card
        const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=F3F4F6&color=374151&size=200`;
        document.getElementById('playerPhoto').src = p.photo_url || fallbackImg;
        document.getElementById('playerName').textContent = p.name;
        document.getElementById('playerPhone').textContent = p.phone || 'N/A';
        document.getElementById('playerAge').textContent = p.age ? `${p.age} Years` : 'N/A';
        document.getElementById('playerCategory').textContent = p.category || 'N/A';

        // Status Badge
        const statusBadge = document.getElementById('playerStatusBadge');
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('playerStatusText');
        const status = p.status || 'Available';
        
        statusBadge.textContent = status;
        statusText.textContent = status;
        
        if (status.toLowerCase() === 'sold') {
            statusBadge.className = 'status-badge sold';
            statusDot.className = 'pulse-dot';
        } else {
            statusBadge.className = 'status-badge unsold';
            statusDot.className = 'pulse-dot unsold';
        }

        // Auction Information
        document.getElementById('infoBaseValue').textContent = `₹${Number(p.base_value || 0).toLocaleString()}`;
        
        const soldPriceRow = document.getElementById('soldPriceRow');
        const soldToRow = document.getElementById('soldToRow');
        
        if (status.toLowerCase() === 'sold') {
            soldPriceRow.classList.remove('hidden');
            soldToRow.classList.remove('hidden');
            document.getElementById('infoSoldPrice').textContent = `₹${Number(p.sold_amount || 0).toLocaleString()}`;
            
            if (p.sold_to_team_name) {
                document.getElementById('teamName').textContent = p.sold_to_team_name;
                const teamLogo = document.getElementById('teamLogo');
                teamLogo.classList.remove('hidden');
                teamLogo.src = p.sold_to_team_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.sold_to_team_name)}&background=0D8ABC&color=fff`;
            } else {
                document.getElementById('teamName').textContent = "Unknown Team";
            }
        } else {
            soldPriceRow.classList.add('hidden');
            soldToRow.classList.add('hidden');
        }

        // Sequence ID - we don't strictly have sequence yet in DB, show ID instead
        document.getElementById('infoSequence').textContent = `#${p.id}`;

        // Specifications
        document.getElementById('specBatting').textContent = p.batting_style || 'N/A';
        document.getElementById('specBowling').textContent = p.bowling_style || 'N/A';
        document.getElementById('specRole').textContent = p.player_role || 'N/A';

        // Sizing
        document.getElementById('sizeJerseyName').textContent = p.jersey_name || 'N/A';
        document.getElementById('sizeJerseyNumber').textContent = p.jersey_number || 'N/A';
        document.getElementById('sizeJersey').textContent = p.jersey_size || 'N/A';
        document.getElementById('sizeTrouser').textContent = p.trouser_size || 'N/A';

        // Performance
        document.getElementById('statMatches').textContent = p.matches || '0';
        document.getElementById('statRuns').textContent = Number(p.runs || 0).toLocaleString();
        document.getElementById('statWickets').textContent = p.wickets || '0';

        // Extra Details
        const extraDesc = p.extra_details ? p.extra_details : "No extra details provided.";
        document.getElementById('extraDetailsText').textContent = extraDesc;

        // Availability Card
        const availCard = document.getElementById('availabilityCard');
        const availHeading = document.getElementById('availabilityStatusHeading');
        const availDesc = document.getElementById('availabilityStatusDesc');

        if (status.toLowerCase() === 'sold') {
            availHeading.textContent = 'Sold';
            availHeading.style.color = '#EF4444'; // red text for sold
            availDesc.textContent = 'This player has been sold in the auction.';
        } else if (status.toLowerCase() === 'unsold') {
            availHeading.textContent = 'Unsold';
            availHeading.style.color = '#EF4444';
            availDesc.textContent = 'This player went unsold in the auction.';
        } else {
            availHeading.textContent = 'Available';
            availHeading.style.color = '#10B981'; // green for available
            availDesc.textContent = 'This player is available and waiting for the auction to begin.';
        }

        // Footer Dates
        const addedDate = p.created_at ? new Date(p.created_at).toLocaleString() : new Date().toLocaleString();
        document.getElementById('addedDate').textContent = addedDate;
        document.getElementById('updatedDate').textContent = addedDate; // Update with modified date if stored

        // Action Buttons Setup
        const actionsContainer = document.getElementById('playerActions');
        actionsContainer.innerHTML = ''; // Clear just in case
        
        // We need to check if the current user is the owner of the auction
        // Let's assume they are the owner since they clicked through from the dashboard
        // We'll render the buttons
        actionsContainer.innerHTML = `
            <button class="btn btn-outline-primary" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="window.location.href='add-player.html?auction_id=${auctionId}&player_id=${playerId}'">
                <i class="fa-regular fa-pen-to-square"></i> Edit Player
            </button>
            <button class="btn btn-danger" style="padding: 0.5rem 1rem; border-radius: 8px; background-color: #EF4444; color: #fff; border: none;" id="openDeleteBtn">
                <i class="fa-regular fa-trash-can"></i> Delete
            </button>
        `;

        document.getElementById('openDeleteBtn').addEventListener('click', () => {
            document.getElementById('deletePlayerName').textContent = p.name;
            document.getElementById('deleteModal').classList.remove('hidden');
        });
    }

    // Modal close events
    document.getElementById('closeDeleteModal') && document.getElementById('closeDeleteModal').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });
    document.getElementById('cancelDeleteModal') && document.getElementById('cancelDeleteModal').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });

    // Handle Delete API Call
    document.getElementById('confirmDeleteBtn') && document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        const btn = document.getElementById('confirmDeleteBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        btn.disabled = true;

        fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/${playerId}?organizer_id=${organizerId}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            showToast('Player deleted successfully!');
            setTimeout(() => {
                window.location.href = `auction-dashboard.html?id=${auctionId}`;
            }, 1000);
        })
        .catch(err => {
            alert('Error deleting player: ' + err.message);
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
            btn.disabled = false;
        });
    });

    function showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('i');
        document.getElementById('toastMsg').textContent = msg;
        
        toast.className = 'toast show';
        if (isError) {
            toast.style.background = '#FEE2E2';
            toast.style.color = '#EF4444';
            icon.className = 'fa-solid fa-circle-exclamation';
        } else {
            toast.style.background = '#ECFDF5';
            toast.style.color = '#10B981';
            icon.className = 'fa-solid fa-circle-check';
        }
        
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hidden');
        }, 3000);
    }
});
