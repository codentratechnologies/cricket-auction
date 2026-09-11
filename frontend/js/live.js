// live.js - Handles fetching and displaying real-time live auction data using Firebase REST API with SSE

document.addEventListener('DOMContentLoaded', () => {
    // 1. Extract Auction ID from URL params (e.g., ?code=PL-2026-A00)
    const urlParams = new URLSearchParams(window.location.search);
    const auctionCode = urlParams.get('code') || urlParams.get('auction_id');

    const notLiveMsg = document.getElementById('notLiveMessage');
    const playerCard = document.getElementById('livePlayerCard');
    const bidCard = document.getElementById('liveBidCard');
    const titleEl = document.getElementById('auctionTitle');

    if (!auctionCode) {
        console.warn('No auction code provided in URL.');
        titleEl.textContent = 'AUCTION PREVIEW MODE';
        showNotLive();
        return;
    }

    console.log('Live View initialized for Auction Code:', auctionCode);
    
    // Fetch initial auction details to set the tournament name and logo
    fetch(`http://127.0.0.1:5000/api/auctions/${auctionCode}`)
        .then(res => res.json())
        .then(auction => {
            if (!auction.error) {
                titleEl.textContent = (auction.name || auctionCode).toUpperCase();
                
                if (auction.logo_url) {
                    const logoEl = document.getElementById('auctionLogo');
                    logoEl.src = auction.logo_url;
                    logoEl.style.display = 'block';
                    // Initialize Sponsors if they exist
                    if (auction.sponsors) {
                        setupSponsors(auction.sponsors);
                    } else {
                        document.querySelector('.sponsors-container').style.display = 'none';
                    }
                }
            } else {
                titleEl.textContent = `LIVE AUCTION: ${auctionCode}`;
                document.querySelector('.sponsors-container').style.display = 'none';
            }
        })
        .catch(err => {
            console.error("Error fetching auction details:", err);
            titleEl.textContent = `LIVE AUCTION: ${auctionCode}`;
            document.querySelector('.sponsors-container').style.display = 'none';
        });

    let sponsorInterval = null;
    function setupSponsors(sponsorsObj) {
        const marquee = document.querySelector('.sponsors-marquee');
        if (!marquee) return;

        marquee.innerHTML = '';
        const sponsors = Object.values(sponsorsObj);
        
        if (sponsors.length === 0) {
            document.querySelector('.sponsors-container').style.display = 'none';
            return;
        }
        document.querySelector('.sponsors-container').style.display = 'flex';
        
        let html = '';
        sponsors.forEach(sp => {
            html += `
            <div class="sponsor-card">
                <div class="sponsor-logo" style="background-color: #fff;">
                    <img src="${sp.logo}" alt="${sp.name}">
                </div>
                <div class="sponsor-text">${sp.name} - ${sp.type}</div>
            </div>`;
        });

        if (sponsors.length > 1) {
            const first = sponsors[0];
            html += `
            <div class="sponsor-card">
                <div class="sponsor-logo" style="background-color: #fff;">
                    <img src="${first.logo}" alt="${first.name}">
                </div>
                <div class="sponsor-text">${first.name} - ${first.type}</div>
            </div>`;
        }

        marquee.innerHTML = html;
        const totalCards = sponsors.length > 1 ? sponsors.length + 1 : 1;
        marquee.style.width = `${totalCards * 180}px`;
        marquee.style.transform = `translateX(0)`;
        
        if (sponsorInterval) clearInterval(sponsorInterval);

        if (sponsors.length > 1) {
            let currentIndex = 0;
            marquee.style.transition = 'transform 0.5s cubic-bezier(0.8, 0, 0.2, 1)';
            
            sponsorInterval = setInterval(() => {
                currentIndex++;
                marquee.style.transition = 'transform 0.5s cubic-bezier(0.8, 0, 0.2, 1)';
                marquee.style.transform = `translateX(-${currentIndex * 180}px)`;
                
                if (currentIndex === sponsors.length) {
                    setTimeout(() => {
                        marquee.style.transition = 'none';
                        marquee.style.transform = `translateX(0)`;
                        currentIndex = 0;
                    }, 500); // Wait for transition to finish
                }
            }, 2500); // 2 seconds pause + 0.5s slide
        }
    }

    // 2. Connect to Firebase Realtime Database via Server-Sent Events (SSE)
    const firebaseUrl = `https://cricket-auction-9b22a-default-rtdb.asia-southeast1.firebasedatabase.app/live_auctions/${auctionCode}.json`;
    const eventSource = new EventSource(firebaseUrl);

    eventSource.addEventListener('put', function(e) {
        try {
            const payload = JSON.parse(e.data);
            console.log("Firebase live data received:", payload);
            
            // The first event usually has path "/" and data is the whole object.
            // Subsequent updates might have specific paths.
            // For simplicity, we can fetch the whole state on any update if the payload path is nested.
            fetchFullLiveState();
        } catch (err) {
            console.error("Error parsing firebase SSE data:", err);
        }
    });

    eventSource.addEventListener('keep-alive', function(e) {
        // Just heartbeat
    });

    eventSource.onerror = function(err) {
        console.error("EventSource failed:", err);
        // Might show overlay if connection fails completely, but let's keep it robust.
    };

    // Helper to fetch the full state whenever an update occurs to ensure UI is completely in sync
    async function fetchFullLiveState() {
        try {
            const response = await fetch(firebaseUrl);
            const liveData = await response.json();
            
            if (!liveData || liveData.status === 'waiting' || !liveData.currentPlayer) {
                // If there's no data or it's just "waiting", show the message
                showNotLive();
                return;
            }

            // Auction is live!
            showLive();
            updateLiveUI(liveData);
            
        } catch (error) {
            console.error("Error fetching full live state:", error);
        }
    }

    function showNotLive() {
        notLiveMsg.style.display = 'flex';
        playerCard.style.display = 'none';
        bidCard.style.display = 'none';
    }

    function showLive() {
        notLiveMsg.style.display = 'none';
        playerCard.style.display = 'flex';
        bidCard.style.display = 'flex';
    }

    // Initial fetch to paint the screen immediately
    fetchFullLiveState();

    // Setup Tab Switching
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active from all
            navBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');
            
            const tabName = btn.dataset.tab;
            console.log("Switched to tab:", tabName);
            // Future logic to show/hide respective sections (teams, players, etc.)
        });
    });

    // 3. UI Update Logic
    function updateLiveUI(data) {
        // Player Info
        if (data.currentPlayer) {
            document.getElementById('playerName').textContent = (data.currentPlayer.name || 'UNKNOWN').toUpperCase();
            document.getElementById('playerIdDisplay').textContent = data.currentPlayer.id || '--';
            document.getElementById('playerRole').textContent = data.currentPlayer.role || 'Player';
            
            if (data.currentPlayer.image) {
                document.getElementById('playerPhoto').src = data.currentPlayer.image;
            } else {
                document.getElementById('playerPhoto').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.currentPlayer.name || 'P')}&background=b8d4f0&color=1e3a8a&size=300`;
            }
            document.getElementById('playerPhoto').style.display = 'block';
        }

        // Bid Info
        if (data.currentBid) {
            document.getElementById('bidAmount').textContent = formatCurrency(data.currentBid.amount || 0);
            
            if (data.currentBid.teamId && data.currentBid.teamName) {
                document.getElementById('teamName').textContent = data.currentBid.teamName.toUpperCase();
                // Optionally update logo if you pass teamLogo in Firebase
                const teamLogo = document.getElementById('teamLogo');
                teamLogo.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.currentBid.teamName)}&background=0f3a8a&color=fff&size=130`;
                teamLogo.style.display = 'block';
            } else {
                document.getElementById('teamName').textContent = "WAITING FOR BIDS";
                document.getElementById('teamLogo').style.display = 'none';
            }
        }

        // Stats (Optional, could be fetched from backend or pushed to Firebase)
        if (data.stats) {
            if (data.stats.sold !== undefined) document.getElementById('soldCount').textContent = data.stats.sold;
            if (data.stats.unsold !== undefined) document.getElementById('unsoldCount').textContent = data.stats.unsold;
            if (data.stats.available !== undefined) document.getElementById('availableCount').textContent = data.stats.available;
        }

        // Handle Sold/Unsold Overlays or Ribbons
        const bidRibbon = document.querySelector('.bid-ribbon');
        if (data.status === 'sold') {
            bidRibbon.textContent = "SOLD!";
            bidRibbon.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
        } else if (data.status === 'unsold') {
            bidRibbon.textContent = "UNSOLD";
            bidRibbon.style.background = "linear-gradient(135deg, #dc2626, #991b1b)";
        } else {
            bidRibbon.textContent = "CURRENT HIGHEST BID";
            bidRibbon.style.background = "linear-gradient(135deg, #2563eb, #1e3a8a)";
        }
    }

    function formatCurrency(amount) {
        return amount.toLocaleString('en-IN'); // Format as Indian Rupees easily
    }

});
