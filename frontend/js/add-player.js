document.addEventListener('DOMContentLoaded', () => {
    // Authentication
    const organizerId = localStorage.getItem('organizer_id');
    if (!organizerId) {
        window.location.href = 'index.html';
        return;
    }

    // Get Auction ID & Player ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auction_id');
    const playerId = urlParams.get('player_id');

    if (!auctionId) {
        window.location.href = 'dashboard.html';
        return;
    }

    const backBtn = document.getElementById('backToAuctionBtn');
    if (backBtn) {
        backBtn.href = `auction-dashboard.html?id=${auctionId}`;
    }

    // UI Elements
    const form = document.getElementById('addPlayerForm');
    const pageTitle = document.getElementById('pageTitle');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const editPlayerId = document.getElementById('editPlayerId');
    
    // Add via Link logic
    const addViaLinkBtn = document.getElementById('addViaLinkBtn');
    if (addViaLinkBtn) {
        addViaLinkBtn.addEventListener('click', () => {
            const link = `${window.location.origin}/player-register.html?auction=${auctionId}`;
            navigator.clipboard.writeText(link).then(() => {
                const originalHtml = addViaLinkBtn.innerHTML;
                addViaLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                addViaLinkBtn.style.background = '#F0FDF4';
                addViaLinkBtn.style.borderColor = '#86EFAC';
                addViaLinkBtn.style.color = '#16A34A';
                setTimeout(() => {
                    addViaLinkBtn.innerHTML = originalHtml;
                    addViaLinkBtn.style.background = '';
                    addViaLinkBtn.style.borderColor = '';
                    addViaLinkBtn.style.color = '';
                }, 2000);
            }).catch(() => {
                showToast('Failed to copy link', true);
            });
        });
    }
    // Photo upload logic
    const photoUploadBox = document.getElementById('photoUploadBox');
    const playerPhotoInput = document.getElementById('playerPhoto');
    const photoPreview = document.getElementById('photoPreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');

    photoUploadBox.addEventListener('click', () => {
        playerPhotoInput.click();
    });

    playerPhotoInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                photoPreview.src = ev.target.result;
                photoPreview.classList.remove('hidden');
                uploadPlaceholder.classList.add('hidden');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Character counter for textarea
    const extraDetails = document.getElementById('extraDetails');
    const charCount = document.getElementById('charCount');
    if (extraDetails) {
        extraDetails.addEventListener('input', () => {
            charCount.textContent = `${extraDetails.value.length}/500`;
        });
    }

    // If Editing, Fetch and populate data
    if (playerId) {
        pageTitle.textContent = 'Edit Player';
        editPlayerId.value = playerId;
        saveBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> UPDATE PLAYER';

        fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players`)
            .then(res => res.json())
            .then(players => {
                const player = players.find(p => p.id === playerId);
                if (player) {
                    document.getElementById('playerName').value = player.name || '';
                    document.getElementById('playerPhone').value = player.phone || '';
                    document.getElementById('playerAge').value = player.age || '';
                    document.getElementById('playerCategory').value = player.category || '';
                    document.getElementById('battingStyle').value = player.batting_style || '';
                    document.getElementById('bowlingStyle').value = player.bowling_style || '';
                    document.getElementById('playerRole').value = player.player_role || '';
                    document.getElementById('baseValue').value = player.base_value || '';
                    document.getElementById('jerseySize').value = player.jersey_size || '';
                    document.getElementById('trouserSize').value = player.trouser_size || '';
                    document.getElementById('jerseyName').value = player.jersey_name || '';
                    document.getElementById('jerseyNumber').value = player.jersey_number || '';
                    document.getElementById('matches').value = player.matches || '';
                    document.getElementById('runs').value = player.runs || '';
                    document.getElementById('wickets').value = player.wickets || '';
                    document.getElementById('status').value = player.status || 'Available';
                    document.getElementById('extraDetails').value = player.extra_details || '';
                    
                    if (extraDetails) {
                        charCount.textContent = `${extraDetails.value.length}/500`;
                    }

                    if (player.photo_url) {
                        photoPreview.src = player.photo_url;
                        photoPreview.classList.remove('hidden');
                        uploadPlaceholder.classList.add('hidden');
                    }
                }
            })
            .catch(err => console.error("Error fetching player:", err));
    }

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Strict Validation
        const playerName = document.getElementById('playerName').value.trim();
        const playerPhone = document.getElementById('playerPhone').value.trim();
        const playerAge = document.getElementById('playerAge').value.trim();
        const playerCategory = document.getElementById('playerCategory').value;
        const baseValue = document.getElementById('baseValue').value.trim();
        const status = document.getElementById('status').value;

        if (!playerName) return showToast('Full Name is required', true);
        if (!playerPhone) return showToast('Mobile No is required', true);
        if (!playerAge) return showToast('Age is required', true);
        if (!playerCategory) return showToast('Category is required', true);
        if (!baseValue) return showToast('Base Value is required', true);
        if (!status) return showToast('Status is required', true);

        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SAVING...';
        saveBtn.disabled = true;

        const pId = editPlayerId.value;
        const formData = new FormData();
        
        formData.append('organizer_id', organizerId);
        formData.append('name', playerName);
        formData.append('phone', document.getElementById('playerPhone').value);
        formData.append('age', document.getElementById('playerAge').value);
        formData.append('category', document.getElementById('playerCategory').value);
        formData.append('batting_style', document.getElementById('battingStyle').value || '');
        formData.append('bowling_style', document.getElementById('bowlingStyle').value || '');
        formData.append('player_role', document.getElementById('playerRole').value || '');
        formData.append('base_value', document.getElementById('baseValue').value || '');
        formData.append('jersey_size', document.getElementById('jerseySize').value || '');
        formData.append('trouser_size', document.getElementById('trouserSize').value || '');
        formData.append('jersey_name', document.getElementById('jerseyName').value || '');
        formData.append('jersey_number', document.getElementById('jerseyNumber').value || '');
        formData.append('matches', document.getElementById('matches').value || '');
        formData.append('runs', document.getElementById('runs').value || '');
        formData.append('wickets', document.getElementById('wickets').value || '');
        formData.append('status', document.getElementById('status').value || 'Available');
        formData.append('extra_details', document.getElementById('extraDetails').value || '');

        if (playerPhotoInput.files[0]) {
            formData.append('photo', playerPhotoInput.files[0]);
        }

        const url = pId
            ? `http://127.0.0.1:5000/api/auctions/${auctionId}/players/${pId}`
            : `http://127.0.0.1:5000/api/auctions/${auctionId}/players`;
        const method = pId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, body: formData });
            const data = await res.json();
            if (res.ok) {
                showToast(pId ? 'Player updated successfully!' : 'Player added successfully!');
                setTimeout(() => {
                    window.location.href = `auction-dashboard.html?id=${auctionId}`;
                }, 1000);
            } else {
                showToast(data.error || 'Failed to save player', true);
                saveBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> SAVE PLAYER';
                saveBtn.disabled = false;
            }
        } catch {
            showToast('Network error. Please try again.', true);
            saveBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> SAVE PLAYER';
            saveBtn.disabled = false;
        }
    });

    cancelBtn.addEventListener('click', () => {
        window.location.href = `auction-dashboard.html?id=${auctionId}`;
    });

    // Profile Dropdown Logic (shared logic)
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
    
    // Toast logic
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
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

    // ---- Customize Fields Logic ----
    let hiddenFields = [];
    
    // 1. Fetch preferences on load
    fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.hidden_fields) {
                hiddenFields = data.hidden_fields;
                applyHiddenFields();
            }
        })
        .catch(err => console.error("Error fetching preferences:", err));

    function applyHiddenFields() {
        // First show everything
        const allWrappers = document.querySelectorAll('[id^="wrapper-"]');
        allWrappers.forEach(w => w.style.display = '');

        // Then hide the ones in the array
        hiddenFields.forEach(fieldId => {
            const el = document.getElementById(`wrapper-${fieldId}`);
            if (el) el.style.display = 'none';
        });
    }

    // 2. Modal UI configuration
    const defaultFieldsConfig = [
        { id: 'playerPhoto', label: 'Player Photo', locked: false },
        { id: 'playerName', label: 'Full Name', locked: true },
        { id: 'playerPhone', label: 'Mobile No', locked: true },
        { id: 'playerAge', label: 'Age', locked: true },
        { id: 'playerCategory', label: 'Category', locked: true },
        { id: 'battingStyle', label: 'Batting Spec (Spec 1)', locked: false },
        { id: 'bowlingStyle', label: 'Bowling Spec (Spec 2)', locked: false },
        { id: 'playerRole', label: 'Player Role (Spec 3)', locked: false },
        { id: 'baseValue', label: 'Base Value', locked: true },
        { id: 'jerseySize', label: 'Jersey Size', locked: false },
        { id: 'trouserSize', label: 'Trouser Size', locked: false },
        { id: 'jerseyName', label: 'Jersey Name', locked: false },
        { id: 'jerseyNumber', label: 'Jersey Number', locked: false },
        { id: 'matches', label: 'Match', locked: false },
        { id: 'runs', label: 'Run', locked: false },
        { id: 'wickets', label: 'Wickets', locked: false }
    ];

    const otherFieldsConfig = [
        { id: 'status', label: 'Status', locked: true },
        { id: 'extraDetails', label: 'Extra Details', locked: false }
    ];

    const customizeModal = document.getElementById('customizeModal');
    const openCustomizeModal = document.getElementById('openCustomizeModal');
    const closeCustomizeModal = document.getElementById('closeCustomizeModal');
    const cancelCustomizeBtn = document.getElementById('cancelCustomizeBtn');
    const savePreferencesBtn = document.getElementById('savePreferencesBtn');
    const resetPreferencesBtn = document.getElementById('resetPreferencesBtn');
    
    const gridDefault = document.querySelector('.customize-grid');
    const gridOther = document.querySelector('.customize-grid-other');

    function renderCheckboxes() {
        gridDefault.innerHTML = '';
        gridOther.innerHTML = '';

        const createCheckbox = (f) => {
            const isChecked = !hiddenFields.includes(f.id);
            const disabledAttr = f.locked ? 'disabled' : '';
            const checkedAttr = (f.locked || isChecked) ? 'checked' : '';
            const lockIcon = f.locked ? '<i class="fa-solid fa-lock"></i>' : '';
            const classDisabled = f.locked ? 'disabled' : '';

            return `
                <label class="customize-item ${classDisabled}">
                    <input type="checkbox" value="${f.id}" ${checkedAttr} ${disabledAttr}>
                    <span class="field-name">${f.label}</span>
                    ${lockIcon}
                </label>
            `;
        };

        defaultFieldsConfig.forEach(f => gridDefault.innerHTML += createCheckbox(f));
        otherFieldsConfig.forEach(f => gridOther.innerHTML += createCheckbox(f));
    }

    openCustomizeModal.addEventListener('click', () => {
        renderCheckboxes();
        customizeModal.classList.remove('hidden');
    });

    const closeModal = () => customizeModal.classList.add('hidden');
    closeCustomizeModal.addEventListener('click', closeModal);
    cancelCustomizeBtn.addEventListener('click', closeModal);
    customizeModal.addEventListener('click', e => {
        if (e.target === customizeModal) closeModal();
    });

    savePreferencesBtn.addEventListener('click', async () => {
        savePreferencesBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SAVING...';
        savePreferencesBtn.disabled = true;

        const allCheckboxes = document.querySelectorAll('#customizeModal input[type="checkbox"]');
        const newHiddenFields = [];
        
        allCheckboxes.forEach(cb => {
            if (!cb.checked && !cb.disabled) {
                newHiddenFields.push(cb.value);
            }
        });

        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizer_id: organizerId, hidden_fields: newHiddenFields })
            });

            if (res.ok) {
                hiddenFields = newHiddenFields;
                applyHiddenFields();
                closeModal();
                showToast('Preferences saved successfully');
            } else {
                showToast('Failed to save preferences', true);
            }
        } catch (err) {
            showToast('Network error while saving preferences', true);
        } finally {
            savePreferencesBtn.innerHTML = 'SAVE PREFERENCES';
            savePreferencesBtn.disabled = false;
        }
    });

    resetPreferencesBtn.addEventListener('click', () => {
        const allCheckboxes = document.querySelectorAll('#customizeModal input[type="checkbox"]');
        allCheckboxes.forEach(cb => {
            if (!cb.disabled) cb.checked = true;
        });
    });

    // ---- Bulk Upload Logic ----
    const bulkUploadBtn = document.getElementById('bulkUploadBtn');
    const bulkUploadModal = document.getElementById('bulkUploadModal');
    const closeBulkModal = document.getElementById('closeBulkModal');
    const cancelBulkBtn = document.getElementById('cancelBulkBtn');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    const browseFileBtn = document.getElementById('browseFileBtn');
    const bulkFileInput = document.getElementById('bulkFileInput');
    const dragDropZone = document.getElementById('dragDropZone');
    const selectedFileName = document.getElementById('selectedFileName');
    const confirmBulkBtn = document.getElementById('confirmBulkBtn');

    let bulkPlayersData = [];

    const openBulkModal = () => {
        bulkUploadModal.classList.remove('hidden');
        bulkPlayersData = [];
        selectedFileName.textContent = '';
        selectedFileName.classList.add('hidden');
        bulkFileInput.value = '';
    };
    const closeBulkModalFunc = () => bulkUploadModal.classList.add('hidden');

    bulkUploadBtn?.addEventListener('click', openBulkModal);
    closeBulkModal?.addEventListener('click', closeBulkModalFunc);
    cancelBulkBtn?.addEventListener('click', closeBulkModalFunc);
    bulkUploadModal?.addEventListener('click', e => {
        if (e.target === bulkUploadModal) closeBulkModalFunc();
    });

    // 1. Download Template
    downloadTemplateBtn?.addEventListener('click', () => {
        if (typeof XLSX === 'undefined') {
            showToast('Excel library not loaded yet', true);
            return;
        }
        const headers = ["Full Name", "Mobile No", "Age", "Category", "Batting Spec (Spec 1)", "Bowling Spec (Spec 2)", "Player Role (Spec 3)", "Base Value", "Jersey Size", "Trouser Size", "Jersey Name", "Jersey Number", "Match", "Run", "Wickets", "Status", "Extra Details", "Photo URL"];
        const demoData = [
            ["Virat Kohli", "9876543210", "35", "Batsman", "Right Hand", "None", "Captain", "20000", "L", "32", "VIRAT", "18", "250", "12000", "4", "Available", "Legend", "https://example.com/virat.jpg"],
            ["Jasprit Bumrah", "9876543211", "30", "Bowler", "Right Hand", "Right Arm Fast", "Bowler", "20000", "L", "34", "BUMRAH", "93", "120", "200", "150", "Available", "Yorker King", "https://example.com/bumrah.jpg"]
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...demoData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Players Template");
        XLSX.writeFile(wb, "cricket_auction_template.xlsx");
    });

    // 2. Drag and Drop / Browse Logic
    browseFileBtn?.addEventListener('click', () => bulkFileInput.click());

    const handleFile = (file) => {
        if (!file) return;
        selectedFileName.textContent = file.name;
        selectedFileName.classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            if (json.length > 1) {
                const headers = json[0];
                bulkPlayersData = json.slice(1).map(row => {
                    return {
                        name: row[headers.indexOf("Full Name")],
                        phone: row[headers.indexOf("Mobile No")],
                        age: row[headers.indexOf("Age")],
                        category: row[headers.indexOf("Category")],
                        batting_style: row[headers.indexOf("Batting Spec (Spec 1)")],
                        bowling_style: row[headers.indexOf("Bowling Spec (Spec 2)")],
                        player_role: row[headers.indexOf("Player Role (Spec 3)")],
                        base_value: row[headers.indexOf("Base Value")],
                        jersey_size: row[headers.indexOf("Jersey Size")],
                        trouser_size: row[headers.indexOf("Trouser Size")],
                        jersey_name: row[headers.indexOf("Jersey Name")],
                        jersey_number: row[headers.indexOf("Jersey Number")],
                        matches: row[headers.indexOf("Match")],
                        runs: row[headers.indexOf("Run")],
                        wickets: row[headers.indexOf("Wickets")],
                        status: row[headers.indexOf("Status")],
                        extra_details: row[headers.indexOf("Extra Details")],
                        photo_url: row[headers.indexOf("Photo URL")]
                    };
                }).filter(p => p.name); // Filter out empty rows
            }
        };
        reader.readAsArrayBuffer(file);
    };

    bulkFileInput?.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    dragDropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropZone.classList.add('dragover');
    });
    dragDropZone?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragDropZone.classList.remove('dragover');
    });
    dragDropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    // 3. Submit logic
    confirmBulkBtn?.addEventListener('click', async () => {
        if (!bulkPlayersData.length) {
            showToast('Please upload a valid Excel file first', true);
            return;
        }

        confirmBulkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> UPLOADING...';
        confirmBulkBtn.disabled = true;

        try {
            const res = await fetch(`http://127.0.0.1:5000/api/auctions/${auctionId}/players/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizer_id: organizerId, players: bulkPlayersData })
            });

            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Players added successfully!');
                setTimeout(() => {
                    window.location.href = `auction-dashboard.html?id=${auctionId}`;
                }, 1500);
            } else {
                showToast(data.error || 'Failed to upload players', true);
            }
        } catch (err) {
            showToast('Network error during upload', true);
        } finally {
            confirmBulkBtn.innerHTML = '<i class="fa-solid fa-upload"></i> ADD PLAYERS';
            confirmBulkBtn.disabled = false;
        }
    });

});
