document.addEventListener('DOMContentLoaded', () => {
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
    fetch(`http://localhost:5000/api/auctions/${auctionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Error fetching auction:", data.error);
                return;
            }

            // Populate Header
            auctionNameEl.textContent = data.name || 'Untitled Auction';
            auctionStatusEl.textContent = data.status === 'upcoming' ? 'Upcoming' : data.status.toUpperCase();
            
            if (data.logo_url) {
                auctionLogoEl.src = data.logo_url;
            } else {
                auctionLogoEl.src = `https://ui-avatars.com/api/?name=${data.name}&background=0E48A0&color=fff`;
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
            const liveLinkUrl = `${window.location.origin}/live.html?code=${data.auction_code}`;
            // Display simplified version
            auctionLiveLinkEl.textContent = `auction.com/${data.auction_code}`;

            // Attach copy listeners to existing HTML elements
            copyCodeBtn.addEventListener('click', () => copyToClipboard(data.auction_code, 'Auction code copied!'));
            copyLinkBtn.addEventListener('click', () => copyToClipboard(liveLinkUrl, 'Live link copied!'));

            // Validation: Disable Start if no teams/players
            // For now, checking mock teams logic. Since we haven't implemented team adding fully, 
            // we will simulate the check. In real app, check data.teams > 0
            const teamsCount = 3; // Using mock 3 from UI
            if (teamsCount === 0 || data.players === 0) {
                startAuctionBtn.classList.replace('btn-success', 'btn-outline');
                startAuctionBtn.style.opacity = '0.5';
                startAuctionBtn.style.cursor = 'not-allowed';
                startWarning.classList.remove('hidden');
                
                startAuctionBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showToast('Cannot start: Add teams and players first!', true);
                });
            } else {
                startAuctionBtn.addEventListener('click', () => {
                    window.location.href = `live-dashboard.html?id=${auctionId}`;
                });
            }

            viewAuctionBtn.addEventListener('click', () => {
                window.open(`live.html?code=${data.auction_code}`, '_blank');
            });
            
        })
        .catch(err => {
            console.error("Error connecting to server:", err);
            auctionNameEl.textContent = "Error loading data";
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

    // Helper Functions
    function formatAMPM(time24) {
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return `${hours}:${minutes} ${ampm}`;
    }

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

