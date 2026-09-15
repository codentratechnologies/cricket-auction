import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

app = Flask(__name__)
CORS(app)

# Cloudinary Setup
cloudinary.config( 
  cloud_name = "dgyvfx8zo", 
  api_key = "252678467542317", 
  api_secret = "ieDhWyb9ZLsQze83aqbLKY4wMmM" 
)

# Firebase Setup
FIREBASE_DATABASE_URL = 'https://cricket-auction-9b22a-default-rtdb.asia-southeast1.firebasedatabase.app'
CREDENTIAL_PATH = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

try:
    if os.path.exists(CREDENTIAL_PATH):
        cred = credentials.Certificate(CREDENTIAL_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_DATABASE_URL
        })
        firebase_initialized = True
        print("Firebase Admin SDK initialized successfully.")
    else:
        firebase_initialized = False
        print(f"Warning: '{CREDENTIAL_PATH}' not found. Running with mock data.")
except Exception as e:
    firebase_initialized = False
    print(f"Error initializing Firebase: {e}")

# Local User Database Fallback File
LOCAL_USERS_FILE = os.path.join(os.path.dirname(__file__), 'users_db.json')

def normalize_dict(data):
    """Firebase returns lists if keys are sequential numbers. Normalize back to dict."""
    if isinstance(data, list):
        return {str(i): v for i, v in enumerate(data) if v is not None}
    elif isinstance(data, dict):
        return data
    return {}

def load_local_users():
    import json
    if os.path.exists(LOCAL_USERS_FILE):
        try:
            with open(LOCAL_USERS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    demo_users = {
        "demo-organizer-id-001": {
            "name": "Demo Organizer",
            "email": "demo@cricsquad.com",
            "password": generate_password_hash("password123"),
            "role": "Super Admin"
        }
    }
    save_local_users(demo_users)
    return demo_users

def save_local_users(users_data):
    import json
    try:
        with open(LOCAL_USERS_FILE, 'w') as f:
            json.dump(users_data, f, indent=2)
    except Exception as e:
        print(f"Error saving local users: {e}")

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json or {}
    fullname = data.get('fullname')
    email = data.get('email')
    password = data.get('password')

    if not fullname or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    email_clean = email.strip().lower()

    if firebase_initialized:
        try:
            users_ref = db.reference('/users')
            users = users_ref.get() or {}
            for uid, user_data in users.items():
                if user_data.get('email', '').lower() == email_clean:
                    return jsonify({"error": "Email already exists"}), 400

            new_uuid = str(uuid.uuid4())
            hashed_password = generate_password_hash(password)
            
            users_ref.child(new_uuid).set({
                "name": fullname,
                "email": email_clean,
                "password": hashed_password,
                "role": "Organizer"
            })
            
            db.reference(f'/insights/{new_uuid}').set({
                "total_auctions": 0, "total_players": 0, "total_teams": 0, "total_spent": 0
            })
            
            return jsonify({"message": "Registration successful", "organizer_id": new_uuid, "name": fullname}), 201

        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        users = load_local_users()
        for uid, udata in users.items():
            if udata.get('email', '').lower() == email_clean:
                return jsonify({"error": "Email already exists"}), 400

        new_uuid = str(uuid.uuid4())
        hashed_password = generate_password_hash(password)

        users[new_uuid] = {
            "name": fullname,
            "email": email_clean,
            "password": hashed_password,
            "role": "Organizer",
            "created_at": datetime.now().isoformat()
        }
        save_local_users(users)
        return jsonify({"message": "Registration successful", "organizer_id": new_uuid, "name": fullname}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and Password are required"}), 400

    email_clean = email.strip().lower()

    if firebase_initialized:
        try:
            users_ref = db.reference('/users')
            users = users_ref.get() or {}
            
            user_id = None
            user_info = None
            
            for uid, user_data in users.items():
                if user_data.get('email', '').lower() == email_clean:
                    user_id = uid
                    user_info = user_data
                    break
                    
            if not user_id:
                return jsonify({"error": "No account found with this email"}), 404
                
            if not check_password_hash(user_info.get('password', ''), password):
                return jsonify({"error": "Incorrect password"}), 401
                
            return jsonify({"message": "Login successful", "organizer_id": user_id, "name": user_info.get('name', 'Organizer')}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        users = load_local_users()
        user_id = None
        user_info = None

        for uid, udata in users.items():
            if udata.get('email', '').lower() == email_clean:
                user_id = uid
                user_info = udata
                break

        if not user_id:
            return jsonify({"error": "No account found with this email"}), 404

        stored_pw = user_info.get('password', '')
        is_correct = False
        try:
            is_correct = check_password_hash(stored_pw, password)
        except Exception:
            is_correct = (stored_pw == password)

        if not is_correct:
            return jsonify({"error": "Incorrect password"}), 401

        return jsonify({"message": "Login successful", "organizer_id": user_id, "name": user_info.get('name', 'Organizer')}), 200

@app.route('/api/dashboard/<organizer_id>', methods=['GET'])
def get_dashboard_data(organizer_id):
    """
    Returns complete dashboard data for a given organizer from Firebase Realtime Database.
    Returns ALL live & upcoming auctions on the platform with is_owner boolean and organizer_name tags.
    """
    if firebase_initialized:
        try:
            all_users = db.reference('/users').get() or {}
            user_data = all_users.get(organizer_id)
            
            if not user_data:
                local_users = load_local_users()
                if organizer_id in local_users:
                    user_data = local_users[organizer_id]
                else:
                    return jsonify({"error": "Organizer not found"}), 404
                
            all_auctions = db.reference('/auctions').get() or {}
            auctions_list = []
            my_auctions_count = 0
            my_teams_count = 0
            my_players_count = 0

            if isinstance(all_auctions, dict):
                for aid, adata in all_auctions.items():
                    if isinstance(adata, dict):
                        adata['id'] = aid
                        is_owner = (adata.get('organizer_id') == organizer_id)
                        adata['is_owner'] = is_owner
                        
                        creator_info = all_users.get(adata.get('organizer_id'), {})
                        adata['organizer_name'] = creator_info.get('name', 'Organizer')
                        
                        if is_owner:
                            my_auctions_count += 1
                            my_teams_count += adata.get('teams', 0)
                            
                            p_val = adata.get('players_count', 0)
                            if not p_val:
                                p_data = adata.get('players', 0)
                                if isinstance(p_data, dict):
                                    p_val = len(p_data)
                                elif isinstance(p_data, int):
                                    p_val = p_data
                            my_players_count += p_val
                            
                        auctions_list.append(adata)

            auctions_list.sort(key=lambda x: (0 if x.get('status') == 'live' else 1, x.get('created_at', '')), reverse=False)

            insights_node = db.reference(f'/insights/{organizer_id}').get() or {}
            total_spent_val = insights_node.get('total_spent', 0)

            insights_data = {
                "total_auctions": my_auctions_count,
                "total_players": my_players_count,
                "total_teams": my_teams_count,
                "total_spent": total_spent_val
            }
            
            raw_activities = db.reference(f'/activities/{organizer_id}').get() or {}
            activities_list = []
            if isinstance(raw_activities, dict):
                for act_id, act_data in raw_activities.items():
                    if isinstance(act_data, dict):
                        act_data['id'] = act_id
                        activities_list.append(act_data)
            activities_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return jsonify({
                "user": user_data,
                "insights": insights_data,
                "auctions": auctions_list,
                "activities": activities_list
            }), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    else:
        local_users = load_local_users()
        user_info = local_users.get(organizer_id, {})
        user_name = user_info.get('name', 'Organizer')
        user_email = user_info.get('email', 'organizer@cricsquad.com')

        mock_data = {
            "user": {
                "name": user_name,
                "email": user_email,
                "role": "Super Admin"
            },
            "insights": {
                "total_auctions": 2,
                "total_players": 150,
                "total_teams": 12,
                "total_spent": 1200000
            },
            "auctions": [
                {
                    "id": "mock-1",
                    "name": "Premier League 2026",
                    "organizer_id": organizer_id,
                    "organizer_name": user_name,
                    "is_owner": True,
                    "teams": 8, "players": 120, "budget": "₹2.5M",
                    "status": "live", "progress": 65, "watching": 128
                },
                {
                    "id": "mock-2",
                    "name": "Super Cup T20",
                    "organizer_id": "other-organizer-id",
                    "organizer_name": "Meet Gajera",
                    "is_owner": False,
                    "teams": 6, "players": 90, "budget": "₹1.2M",
                    "status": "upcoming", "starts_in": "2H 30M",
                    "date": "2026-09-15"
                }
            ],
            "activities": [
                {"type": "player_sold", "text": "Player 'Virat K.' sold to 'Mumbai Indians' for ₹100,000.", "time": "2 mins ago"},
                {"type": "team_registered", "text": "New team 'Chennai Super Kings' registered for Premier League 2026.", "time": "15 mins ago"}
            ]
        }
        return jsonify(mock_data), 200

@app.route('/api/auctions', methods=['POST'])
def create_auction():
    organizer_id = request.form.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized - Missing organizer_id"}), 401

    auction_name = request.form.get('auctionName')
    venue = request.form.get('venue')
    auction_date = request.form.get('auctionDate')
    auction_time = request.form.get('auctionTime')
    balance = request.form.get('balancePerTeam', type=float) or 0.0
    players = request.form.get('playersPerTeam', type=int) or 15
    min_bid = request.form.get('minBid', type=float) or 1000.0
    bid_increase = request.form.get('bidIncrease', type=float) or 500.0
    visibility = request.form.get('visibility', 'public')

    if not auction_name or not venue or not auction_date or not auction_time:
        return jsonify({"error": "Missing required fields"}), 400

    if balance > 0 and min_bid > balance:
        return jsonify({"error": "Minimum bid cannot exceed balance per team"}), 400

    logo_url = ""
    if 'tournamentLogo' in request.files:
        logo_file = request.files['tournamentLogo']
        if logo_file and logo_file.filename != '':
            try:
                upload_result = cloudinary.uploader.upload(logo_file)
                logo_url = upload_result.get('secure_url')
            except Exception as e:
                print(f"Cloudinary upload warning: {e}")
                logo_url = f"https://ui-avatars.com/api/?name={auction_name.replace(' ', '+')}&background=0E48A0&color=fff"

    if firebase_initialized:
        try:
            auctions_ref = db.reference('/auctions')
            all_auctions = auctions_ref.get() or {}
            max_num = 0
            for aid in all_auctions.keys():
                if aid.startswith('A') and aid[1:].isdigit():
                    num = int(aid[1:])
                    if num > max_num:
                        max_num = num
            new_id = f"A{max_num + 1:03d}"
        except Exception as e:
            print(f"Error generating ID: {e}")
            new_id = f"A{int(datetime.now().timestamp())}"
    else:
        new_id = f"A001"

    # Generate Auction Code from Initials (e.g., "Gokuldham Premier League" -> "GPL-2026-A01")
    words = auction_name.split()
    initials = "".join([w[0].upper() for w in words if w[0].isalpha()])
    if not initials:
        initials = "AUC"
    current_year = datetime.now().year
    auction_code = f"{initials}-{current_year}-{new_id[-3:]}"

    auction_data = {
        "id": new_id,
        "organizer_id": organizer_id,
        "name": auction_name,
        "venue": venue,
        "date": auction_date,
        "time": auction_time,
        "budget": f"₹{balance:,.0f}",
        "teams": 0,
        "players": 0,
        "players_per_team": players,
        "min_bid": min_bid,
        "bid_increase": bid_increase,
        "visibility": visibility,
        "logo_url": logo_url,
        "status": "upcoming",
        "progress": 0,
        "watching": 0,
        "auction_code": auction_code,
        "created_at": datetime.now().isoformat()
    }
    
    if firebase_initialized:
        try:
            db.reference(f'/auctions/{new_id}').set(auction_data)
            
            insights_ref = db.reference(f'/insights/{organizer_id}')
            insights = insights_ref.get() or {
                "total_auctions": 0, "total_players": 0, "total_teams": 0, "total_spent": 0
            }
            insights["total_auctions"] = insights.get("total_auctions", 0) + 1
            insights_ref.set(insights)
            
            activities_ref = db.reference(f'/activities/{organizer_id}')
            new_activity_id = str(uuid.uuid4())
            activities_ref.child(new_activity_id).set({
                "type": "auction_created",
                "text": f"Auction '{auction_name}' has been created successfully.",
                "time": "Just now",
                "timestamp": datetime.now().isoformat()
            })
            
            return jsonify({"message": "Auction created successfully", "auction_id": new_id}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"message": "Auction created locally", "auction_id": new_id}), 201

@app.route('/api/auctions/<auction_id>', methods=['PUT'])
def update_auction(auction_id):
    try:
        data = request.json or {}
        organizer_id = data.get('organizer_id')
        if not organizer_id:
            return jsonify({'error': 'Unauthorized'}), 401

        if not firebase_initialized:
            return jsonify({'message': 'Auction updated (local)'}), 200

        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({'error': 'Auction not found or unauthorized'}), 404

        update_fields = {}
        if 'name' in data: update_fields['name'] = data['name']
        if 'venue' in data: update_fields['venue'] = data['venue']
        if 'date' in data: update_fields['date'] = data['date']
        if 'time' in data: update_fields['time'] = data['time']
        if 'budget' in data: update_fields['budget'] = f"₹{int(data['budget']):,}"
        if 'players_per_team' in data: update_fields['players_per_team'] = int(data['players_per_team'])
        if 'min_bid' in data: update_fields['min_bid'] = int(data['min_bid'])
        if 'bid_increase' in data: update_fields['bid_increase'] = int(data['bid_increase'])
        if 'visibility' in data: update_fields['visibility'] = data['visibility']

        auction_ref.update(update_fields)
        return jsonify({'message': 'Auction updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auctions/<auction_id>', methods=['GET'])
def get_auction(auction_id):
    if not firebase_initialized:
        mock_auction = {
            "id": auction_id,
            "name": "Premier League 2026",
            "organizer_id": "demo-organizer-id-001",
            "organizer_name": "Demo Organizer",
            "venue": "City Stadium",
            "date": "2026-10-15",
            "time": "10:00",
            "budget": "₹100,000",
            "teams": 8,
            "players": 0,
            "players_per_team": 15,
            "min_bid": 500,
            "bid_increase": 100,
            "visibility": "public",
            "logo_url": "https://ui-avatars.com/api/?name=PL&background=0D8ABC&color=fff",
            "status": "upcoming",
            "progress": 0,
            "watching": 1200,
            "auction_code": f"PL-2026-{auction_id[-3:].upper()}" if len(auction_id) >= 3 else "PL-2026-X8F",
            "views": "1.2K",
            "plan": "Free Plan",
            "hidden_fields": []
        }
        return jsonify(mock_auction), 200
        
    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction_data = auction_ref.get()
        if not auction_data:
            return jsonify({"error": "Auction not found"}), 404
            
        auction_data["id"] = auction_id
        
        # Strip heavy nested data — players and teams are fetched separately
        auction_data.pop("players", None)
        auction_data.pop("teamList", None)

        all_users = db.reference('/users').get() or {}
        creator_info = all_users.get(auction_data.get('organizer_id'), {})
        auction_data['organizer_name'] = creator_info.get('name', 'Organizer')

        if "auction_code" not in auction_data:
            auction_name = auction_data.get('name', 'Auction')
            words = auction_name.split()
            initials = "".join([w[0].upper() for w in words if w[0].isalpha()])
            if not initials:
                initials = "AUC"
            auction_data["auction_code"] = f"{initials}-2026-{auction_id[-3:].upper()}"
        if "views" not in auction_data:
            auction_data["views"] = "1.2K"
        if "plan" not in auction_data:
            auction_data["plan"] = "Free Plan"
            
        return jsonify(auction_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/profile/<organizer_id>', methods=['POST'])
def update_profile(organizer_id):
    data = request.json or {}
    fullname = data.get('fullname')
    email = data.get('email')

    if not fullname:
        return jsonify({"error": "Full Name is required"}), 400

    if firebase_initialized:
        try:
            ref = db.reference(f'/users/{organizer_id}')
            user_data = ref.get() or {}
            user_data['name'] = fullname
            if email:
                user_data['email'] = email
            ref.set(user_data)
            return jsonify({"message": "Profile updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        users = load_local_users()
        if organizer_id in users:
            users[organizer_id]['name'] = fullname
            if email:
                users[organizer_id]['email'] = email
            save_local_users(users)
            return jsonify({"message": "Profile updated successfully"}), 200
        return jsonify({"error": "Organizer not found"}), 404

@app.route('/api/auctions/<auction_id>/players', methods=['GET'])
def get_auction_players(auction_id):
    if not firebase_initialized:
        return jsonify([]), 200
    try:
        players_ref = db.reference(f'/auctions/{auction_id}/players')
        players_data = normalize_dict(players_ref.get())
        players_list = []
        for pid, pdata in players_data.items():
            if isinstance(pdata, dict):
                pdata['id'] = str(pid)
                players_list.append(pdata)
        # For now, if the database is empty, we return an empty list. 
        # The frontend will render mock data if the list is completely empty to match the design.
        return jsonify(players_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/preferences', methods=['PUT'])
def update_auction_preferences(auction_id):
    organizer_id = request.json.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    hidden_fields = request.json.get('hidden_fields', [])

    if not firebase_initialized:
        return jsonify({"message": "Preferences updated (local)", "hidden_fields": hidden_fields}), 200

    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({"error": "Auction not found or unauthorized"}), 404
            
        auction_ref.update({"hidden_fields": hidden_fields})
        return jsonify({"message": "Preferences updated successfully", "hidden_fields": hidden_fields}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/players/bulk', methods=['POST'])
def add_players_bulk(auction_id):
    organizer_id = request.json.get('organizer_id')
    players_data = request.json.get('players', [])
    
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not players_data or not isinstance(players_data, list):
        return jsonify({"error": "Invalid data format"}), 400

    if not firebase_initialized:
        return jsonify({"message": f"{len(players_data)} players added (local)"}), 201

    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({"error": "Auction not found or unauthorized"}), 404

        players_ref = db.reference(f'/auctions/{auction_id}/players')
        all_players = players_ref.get() or {}
        
        max_num = 0
        for pid in all_players.keys():
            if pid.startswith('P') and pid[1:].isdigit():
                num = int(pid[1:])
                if num > max_num:
                    max_num = num

        updates = {}
        added_count = 0
        
        for player in players_data:
            name = str(player.get('name', '')).strip()
            if not name:
                continue
                
            max_num += 1
            player_id = str(max_num)
            
            player_obj = {
                "name": name,
                "category": str(player.get('category', 'Uncategorized')).strip(),
                "age": str(player.get('age', '')),
                "phone": str(player.get('phone', '')),
                "photo_url": "",
                "batting_style": str(player.get('batting_style', '')),
                "bowling_style": str(player.get('bowling_style', '')),
                "player_role": str(player.get('player_role', '')),
                "base_value": str(player.get('base_value', '')),
                "jersey_size": str(player.get('jersey_size', '')),
                "trouser_size": str(player.get('trouser_size', '')),
                "jersey_name": str(player.get('jersey_name', '')),
                "jersey_number": str(player.get('jersey_number', '')),
                "matches": str(player.get('matches', '')),
                "runs": str(player.get('runs', '')),
                "wickets": str(player.get('wickets', '')),
                "status": str(player.get('status', 'Available')),
                "extra_details": str(player.get('extra_details', '')),
                "created_at": datetime.now().isoformat()
            }
            updates[player_id] = player_obj
            added_count += 1
            
        if updates:
            players_ref.update(updates)
            
            # Update players_count
            current_count = auction.get('players_count', 0)
            auction_ref.update({"players_count": current_count + added_count})
            
        return jsonify({"message": f"{added_count} players added successfully"}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/register', methods=['POST'])
def public_register_player(auction_id):
    """Public endpoint — no login required. Players self-register for an auction."""
    try:
        # Verify auction exists and is public
        if firebase_initialized:
            auction_ref = db.reference(f'/auctions/{auction_id}')
            auction_data = auction_ref.get()
            if not auction_data:
                return jsonify({'error': 'Auction not found'}), 404

        if request.is_json:
            data = request.json or {}
        else:
            data = request.form

        name = str(data.get('name', '')).strip()
        category = str(data.get('category', '')).strip()
        if not name or not category:
            return jsonify({'error': 'Name and category are required'}), 400

        photo_url = ''
        if 'photo' in request.files:
            photo_file = request.files['photo']
            if photo_file and photo_file.filename != '':
                try:
                    upload_result = cloudinary.uploader.upload(photo_file, folder="cricket-auction/players")
                    photo_url = upload_result.get('secure_url', '')
                except Exception as e:
                    print(f"Photo upload warning: {e}")

        player_obj = {
            'name': name,
            'category': category,
            'age': str(data.get('age', '')),
            'phone': str(data.get('phone', '')),
            'photo_url': photo_url,
            'batting_style': str(data.get('batting_style', '')),
            'bowling_style': str(data.get('bowling_style', '')),
            'player_role': str(data.get('player_role', '')),
            'base_value': str(data.get('base_value', '')),
            'jersey_size': str(data.get('jersey_size', '')),
            'trouser_size': str(data.get('trouser_size', '')),
            'jersey_name': str(data.get('jersey_name', '')),
            'jersey_number': str(data.get('jersey_number', '')),
            'matches': str(data.get('matches', '')),
            'runs': str(data.get('runs', '')),
            'wickets': str(data.get('wickets', '')),
            'extra_details': str(data.get('extra_details', '')),
            'status': 'Available',
            'registered_via': 'public_form',
            'created_at': datetime.now().isoformat()
        }

        if firebase_initialized:
            players_ref = db.reference(f'/auctions/{auction_id}/players')
            existing = normalize_dict(players_ref.get())
            max_num = 0
            for pid in existing.keys():
                # Support both old P001 format and new numeric format
                if pid.startswith('P') and pid[1:].isdigit():
                    max_num = max(max_num, int(pid[1:]))
                elif pid.isdigit():
                    max_num = max(max_num, int(pid))
            player_id = str(max_num + 1)
            while player_id in existing:
                max_num += 1
                player_id = str(max_num)
            players_ref.child(player_id).set(player_obj)
            return jsonify({'message': 'Registration successful! You have been added to the auction.', 'id': player_id}), 201
        else:
            return jsonify({'message': 'Registration successful! (local mode)'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auctions/<auction_id>/players', methods=['POST'])
def add_player(auction_id):
    organizer_id = request.form.get('organizer_id') or (request.json or {}).get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if request.is_json:
        data = request.json or {}
        name = data.get('name', '').strip()
        category = data.get('category', '').strip()
        age = data.get('age', '')
        phone = data.get('phone', '')
        photo_url = data.get('photo_url', '')
        batting_style = data.get('batting_style', '')
        bowling_style = data.get('bowling_style', '')
        player_role = data.get('player_role', '')
        base_value = data.get('base_value', '')
        jersey_size = data.get('jersey_size', '')
        trouser_size = data.get('trouser_size', '')
        jersey_name = data.get('jersey_name', '')
        jersey_number = data.get('jersey_number', '')
        matches = data.get('matches', '')
        runs = data.get('runs', '')
        wickets = data.get('wickets', '')
        status = data.get('status', 'Available')
        extra_details = data.get('extra_details', '')
    else:
        name = (request.form.get('name') or '').strip()
        category = (request.form.get('category') or '').strip()
        age = request.form.get('age') or ''
        phone = request.form.get('phone') or ''
        photo_url = ''
        batting_style = request.form.get('batting_style', '')
        bowling_style = request.form.get('bowling_style', '')
        player_role = request.form.get('player_role', '')
        base_value = request.form.get('base_value', '')
        jersey_size = request.form.get('jersey_size', '')
        trouser_size = request.form.get('trouser_size', '')
        jersey_name = request.form.get('jersey_name', '')
        jersey_number = request.form.get('jersey_number', '')
        matches = request.form.get('matches', '')
        runs = request.form.get('runs', '')
        wickets = request.form.get('wickets', '')
        status = request.form.get('status', 'Available')
        extra_details = request.form.get('extra_details', '')

    if not name or not category:
        return jsonify({"error": "Name and category are required"}), 400

    if 'photo' in request.files:
        photo_file = request.files['photo']
        if photo_file and photo_file.filename != '':
            try:
                upload_result = cloudinary.uploader.upload(photo_file, folder="cricket-auction/players")
                photo_url = upload_result.get('secure_url', '')
            except Exception as e:
                return jsonify({"error": f"Failed to upload photo. Please ensure it's a valid JPG/PNG under 2MB. Error: {str(e)}"}), 400

    if firebase_initialized:
        try:
            players_ref = db.reference(f'/auctions/{auction_id}/players')
            all_players = normalize_dict(players_ref.get())
            max_num = 0
            for pid in all_players.keys():
                # Support both old P001 format and new numeric format
                if pid.startswith('P') and pid[1:].isdigit():
                    num = int(pid[1:])
                    if num > max_num:
                        max_num = num
                elif pid.isdigit():
                    num = int(pid)
                    if num > max_num:
                        max_num = num
            player_id = str(max_num + 1)
        except Exception as e:
            player_id = str(int(datetime.now().timestamp()))
    else:
        player_id = "1"

    player_data = {
        "id": player_id,
        "name": name,
        "category": category,
        "age": age,
        "phone": phone,
        "photo_url": photo_url,
        "batting_style": batting_style,
        "bowling_style": bowling_style,
        "player_role": player_role,
        "base_value": base_value,
        "jersey_size": jersey_size,
        "trouser_size": trouser_size,
        "jersey_name": jersey_name,
        "jersey_number": jersey_number,
        "matches": matches,
        "runs": runs,
        "wickets": wickets,
        "status": status,
        "extra_details": extra_details,
        "auction_id": auction_id,
        "organizer_id": organizer_id,
        "created_at": datetime.now().isoformat()
    }

    if not firebase_initialized:
        return jsonify({"message": "Player added (local)", "player": player_data}), 201

    try:
        db.reference(f'/auctions/{auction_id}/players/{player_id}').set(player_data)
        
        # Increment player count on auction
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get() or {}
        current_count = auction.get('players_count', 0)
        auction_ref.update({'players_count': current_count + 1})
        
        return jsonify({"message": "Player added successfully", "player": player_data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/players/<player_id>', methods=['GET'])
def get_player(auction_id, player_id):
    if not firebase_initialized:
        return jsonify({
            "id": player_id, "name": "Mock Player", "category": "Batsman", 
            "age": "25", "status": "Available", "base_value": 50000
        }), 200
        
    try:
        player_ref = db.reference(f'/auctions/{auction_id}/players/{player_id}')
        player_data = player_ref.get()
        if not player_data:
            return jsonify({"error": "Player not found"}), 404
            
        player_data['id'] = player_id
        
        # If player is sold, fetch team name and logo
        if player_data.get('status') == 'Sold' and player_data.get('sold_to_team'):
            team_id = player_data.get('sold_to_team')
            team_ref = db.reference(f'/auctions/{auction_id}/teamList/{team_id}')
            team_data = team_ref.get()
            if team_data:
                player_data['sold_to_team_name'] = team_data.get('name')
                player_data['sold_to_team_logo'] = team_data.get('logo_url')

        return jsonify(player_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/players/<player_id>', methods=['PUT'])
def update_player(auction_id, player_id):
    organizer_id = request.form.get('organizer_id') or (request.json or {}).get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if request.is_json:
        data = request.json or {}
    else:
        data = request.form.to_dict()

    updates = {}
    
    fields = [
        'name', 'category', 'age', 'phone', 
        'batting_style', 'bowling_style', 'player_role', 'base_value',
        'jersey_size', 'trouser_size', 'jersey_name', 'jersey_number',
        'matches', 'runs', 'wickets', 'status', 'extra_details'
    ]
    for field in fields:
        if field in data:
            if isinstance(data[field], str):
                updates[field] = data[field].strip()
            else:
                updates[field] = data[field]

    if 'photo' in request.files:
        photo_file = request.files['photo']
        if photo_file and photo_file.filename != '':
            try:
                upload_result = cloudinary.uploader.upload(photo_file, folder="cricket-auction/players")
                updates['photo_url'] = upload_result.get('secure_url', '')
            except Exception as e:
                return jsonify({"error": f"Failed to upload photo. Please ensure it's a valid JPG/PNG under 2MB. Error: {str(e)}"}), 400

    if not firebase_initialized:
        return jsonify({"message": "Player updated (local)"}), 200

    try:
        db.reference(f'/auctions/{auction_id}/players/{player_id}').update(updates)
        
        # Log UNSOLD history
        if updates.get('status') == 'Unsold':
            try:
                history_ref = db.reference(f'/auctions/{auction_id}/history/{player_id}')
                history_ref.update({
                    'status': 'Unsold'
                })
            except Exception as e:
                print(f"Error logging unsold history: {e}")

        return jsonify({"message": "Player updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/sell', methods=['POST'])
def sell_player(auction_id):
    organizer_id = request.json.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    player_id = request.json.get('player_id')
    team_id = request.json.get('team_id')
    sold_price = request.json.get('sold_price')

    if not player_id or not team_id or sold_price is None:
        return jsonify({"error": "Missing required fields"}), 400

    if not firebase_initialized:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        # Atomic-like update using update() across multiple paths if possible, 
        # or just sequential updates since it's a simple app.
        
        # 1. Get current team balance
        team_ref = db.reference(f'/auctions/{auction_id}/teamList/{team_id}')
        team_data = team_ref.get()
        if not team_data:
            return jsonify({"error": "Team not found"}), 404
            
        current_balance = int(team_data.get('balance', 0))
        sold_price = int(sold_price)
        
        # 2. Update player
        db.reference(f'/auctions/{auction_id}/players/{player_id}').update({
            'status': 'Sold',
            'sold_to_team': team_id,
            'sold_price': sold_price
        })
        
        # 3. Update team balance
        team_ref.update({
            'balance': current_balance - sold_price
        })
        
        # 4. Add to history
        try:
            player_ref = db.reference(f'/auctions/{auction_id}/players/{player_id}')
            player_data = player_ref.get() or {}
            player_name = player_data.get('name', 'Player')
            team_name = team_data.get('name', 'Team')
            team_short_name = team_data.get('short_name') or team_name
            
            history_ref = db.reference(f'/auctions/{auction_id}/history/{player_id}')
            
            # Update top-level history metadata
            history_ref.update({
                'sold_team_name': team_short_name,
                'status': 'Sold'
            })
            
            # Push the final sold bid record
            history_ref.push({
                'team_short_name': team_short_name,
                'amount': sold_price,
                'type': 'SOLD',
                'timestamp': datetime.utcnow().isoformat()
            })
        except Exception as e:
            print(f"Error logging sold history: {e}")
        
        return jsonify({"message": "Player sold successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/players/<player_id>', methods=['DELETE'])
def delete_player(auction_id, player_id):
    organizer_id = request.args.get('organizer_id') or (request.json or {}).get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not firebase_initialized:
        return jsonify({"message": "Player deleted (local)"}), 200

    try:
        db.reference(f'/auctions/{auction_id}/players/{player_id}').delete()
        
        # Decrement player count on auction
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get() or {}
        new_count = max(0, auction.get('players_count', 1) - 1)
        auction_ref.update({'players_count': new_count})
        
        return jsonify({"message": "Player deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/live', methods=['GET', 'PATCH'])
def live_state(auction_id):
    if request.method == 'GET':
        if not firebase_initialized:
            return jsonify({}), 200
        try:
            live_ref = db.reference(f'/live_auctions/{auction_id}')
            data = live_ref.get()
            return jsonify(data or {}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # PATCH logic
    organizer_id = request.json.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not firebase_initialized:
        return jsonify({"message": "Live state updated (local)"}), 200

    data = request.json
    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({"error": "Auction not found or unauthorized"}), 404

        # Remove organizer_id from data before saving to Firebase
        payload = {k: v for k, v in data.items() if k != 'organizer_id'}
        
        live_ref = db.reference(f'/live_auctions/{auction_id}')
        live_ref.update(payload)
        
        return jsonify({"message": "Live state updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/teams', methods=['GET'])
def get_teams(auction_id):
    if not firebase_initialized:
        return jsonify([
            {"id": "t1", "name": "Mumbai Indians", "short_name": "MI", "balance": 1000000, "logo_url": ""},
            {"id": "t2", "name": "Chennai Super Kings", "short_name": "CSK", "balance": 1000000, "logo_url": ""},
        ]), 200
    try:
        teams_ref = db.reference(f'/auctions/{auction_id}/teamList')
        teams_data = teams_ref.get() or {}
        teams_list = []
        if isinstance(teams_data, dict):
            for tid, tdata in teams_data.items():
                if isinstance(tdata, dict):
                    tdata['id'] = tid
                    teams_list.append(tdata)
        teams_list.sort(key=lambda x: x.get('created_at', ''))
        return jsonify(teams_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/teams', methods=['POST'])
def add_team(auction_id):
    organizer_id = request.form.get('organizer_id') or (request.json or {}).get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    # Support both JSON and form data
    if request.is_json:
        data = request.json or {}
        name = data.get('name', '').strip()
        short_name = data.get('short_name', '').strip().upper()
        balance = float(data.get('balance', 0))
        logo_url = data.get('logo_url', '')
    else:
        name = (request.form.get('name') or '').strip()
        short_name = (request.form.get('short_name') or '').strip().upper()
        balance = float(request.form.get('balance', 0) or 0)
        logo_url = ''

    if not name or not short_name:
        return jsonify({"error": "Team name and short name are required"}), 400

    # Upload logo if provided
    if 'logo' in request.files:
        logo_file = request.files['logo']
        if logo_file and logo_file.filename != '':
            try:
                upload_result = cloudinary.uploader.upload(logo_file, folder="cricket-auction/teams")
                logo_url = upload_result.get('secure_url', '')
            except Exception as e:
                print(f"Logo upload warning: {e}")

    if firebase_initialized:
        try:
            teams_ref = db.reference(f'/auctions/{auction_id}/teamList')
            all_teams = teams_ref.get() or {}
            max_num = 0
            for tid in all_teams.keys():
                if tid.startswith('T') and tid[1:].isdigit():
                    num = int(tid[1:])
                    if num > max_num:
                        max_num = num
            team_id = f"T{max_num + 1:03d}"
        except Exception as e:
            print(f"Error generating team ID: {e}")
            team_id = f"T{int(datetime.now().timestamp())}"
    else:
        team_id = f"T001"

    team_data = {
        "id": team_id,
        "name": name,
        "short_name": short_name,
        "balance": balance,
        "original_balance": balance,
        "logo_url": logo_url,
        "players_count": 0,
        "auction_id": auction_id,
        "organizer_id": organizer_id,
        "created_at": datetime.now().isoformat()
    }

    if not firebase_initialized:
        return jsonify({"message": "Team added (local)", "team": team_data}), 201

    try:
        db.reference(f'/auctions/{auction_id}/teamList/{team_id}').set(team_data)
        # Update teams count on auction
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get() or {}
        auction['teams'] = auction.get('teams', 0) + 1
        auction_ref.update({'teams': auction['teams']})
        return jsonify({"message": "Team added successfully", "team": team_data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/teams/<team_id>', methods=['GET'])
def get_team(auction_id, team_id):
    if not firebase_initialized:
        return jsonify({"id": team_id, "name": "Local Team", "short_name": "LT", "balance": 100000, "original_balance": 100000}), 200
    try:
        team_ref = db.reference(f'/auctions/{auction_id}/teamList/{team_id}')
        team_data = team_ref.get()
        if team_data:
            return jsonify(team_data), 200
        return jsonify({"error": "Team not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/teams/<team_id>/players', methods=['GET'])
def get_team_players(auction_id, team_id):
    if not firebase_initialized:
        return jsonify([]), 200
    try:
        # Currently, there are no players module, so we return an empty list
        # Eventually, players will be stored under /auctions/{auction_id}/players and we can filter by team_id
        # or under /auctions/{auction_id}/teamList/{team_id}/players.
        # For now, we return empty list.
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/teams/<team_id>', methods=['PUT'])
def update_team(auction_id, team_id):
    if request.is_json:
        data = request.json or {}
    else:
        data = request.form.to_dict()

    organizer_id = data.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    updates = {}
    if 'name' in data and data['name']:
        updates['name'] = data['name'].strip()
    if 'short_name' in data and data['short_name']:
        updates['short_name'] = data['short_name'].strip().upper()
    if 'balance' in data:
        updates['balance'] = float(data['balance'])

    # Upload logo if provided
    if 'logo' in request.files:
        logo_file = request.files['logo']
        if logo_file and logo_file.filename != '':
            try:
                upload_result = cloudinary.uploader.upload(logo_file, folder="cricket-auction/teams")
                updates['logo_url'] = upload_result.get('secure_url', '')
            except Exception as e:
                print(f"Logo upload warning: {e}")

    if not firebase_initialized:
        return jsonify({"message": "Team updated (local)"}), 200

    try:
        db.reference(f'/auctions/{auction_id}/teamList/{team_id}').update(updates)
        return jsonify({"message": "Team updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/teams/<team_id>', methods=['DELETE'])
def delete_team(auction_id, team_id):
    organizer_id = request.args.get('organizer_id') or (request.json or {}).get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not firebase_initialized:
        return jsonify({"message": "Team deleted (local)"}), 200

    try:
        db.reference(f'/auctions/{auction_id}/teamList/{team_id}').delete()
        # Decrement teams count on auction
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get() or {}
        new_count = max(0, auction.get('teams', 1) - 1)
        auction_ref.update({'teams': new_count})
        return jsonify({"message": "Team deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# HISTORY ROUTES
# ==========================================

@app.route('/api/auctions/<auction_id>/history', methods=['GET'])
def get_auction_history(auction_id):
    if not firebase_initialized:
        return jsonify([]), 200
    try:
        history_ref = db.reference(f'/auctions/{auction_id}/history')
        history_data = history_ref.get() or {}
        history_list = []
        if isinstance(history_data, dict):
            for player_id, player_data in history_data.items():
                if isinstance(player_data, dict):
                    player_name = player_data.get('player_name', f'Player {player_id}')
                    # Loop through individual push records inside the player's history
                    for push_id, record in player_data.items():
                        if isinstance(record, dict) and 'timestamp' in record:
                            record['id'] = push_id
                            record['player_id'] = player_id
                            record['player_name'] = player_name
                            
                            # Format message for UI if not present
                            if 'message' not in record:
                                amount = record.get('amount', 0)
                                team = record.get('team_short_name', '')
                                if record.get('type') == 'SOLD':
                                    record['message'] = f"SOLD: {player_name} -> {team} (₹{amount:,})"
                                elif record.get('type') == 'UNSOLD':
                                    record['message'] = f"UNSOLD: {player_name}"
                                else:
                                    record['message'] = f"{player_name} -> {team} (₹{amount:,})"
                            
                            history_list.append(record)
                            
        # Sort by timestamp descending (newest first)
        history_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(history_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/history', methods=['POST'])
def add_auction_history(auction_id):
    organizer_id = request.json.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not firebase_initialized:
        return jsonify({"message": "History added (local)"}), 201

    data = request.json
    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({"error": "Auction not found or unauthorized"}), 404

        history_ref = db.reference(f'/auctions/{auction_id}/history')
        history_id = f"H{int(datetime.now().timestamp() * 1000)}"
        
        history_item = {
            'id': history_id,
            'type': data.get('type', 'INFO'),
            'message': data.get('message', ''),
            'player_id': data.get('player_id', ''),
            'team_id': data.get('team_id', ''),
            'amount': data.get('amount', 0),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        history_ref.child(history_id).set(history_item)
        return jsonify({"message": "History added successfully", "history": history_item}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/history/<player_id>', methods=['POST'])
def add_player_history(auction_id, player_id):
    organizer_id = request.json.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not firebase_initialized:
        return jsonify({"message": "History added (local)"}), 201

    data = request.json
    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({"error": "Auction not found or unauthorized"}), 404

        history_ref = db.reference(f'/auctions/{auction_id}/history/{player_id}')
        
        if data.get('init_only'):
            history_ref.update({
                'player_name': data.get('player_name', ''),
                'base_price': data.get('base_price', 0)
            })
            return jsonify({"message": "History initialized"}), 200

        history_item = {
            'team_short_name': data.get('team_short_name', ''),
            'amount': data.get('amount', 0),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        history_ref.push(history_item)
        return jsonify({"message": "Bid logged successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>/history/<history_id>', methods=['DELETE'])
def delete_auction_history(auction_id, history_id):
    organizer_id = request.args.get('organizer_id') or (request.json or {}).get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not firebase_initialized:
        return jsonify({"message": "History deleted (local)"}), 200

    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction = auction_ref.get()
        if not auction or auction.get('organizer_id') != organizer_id:
            return jsonify({"error": "Auction not found or unauthorized"}), 404

        db.reference(f'/auctions/{auction_id}/history/{history_id}').delete()
        return jsonify({"message": "History deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ==========================================
# SPONSORS ROUTES
# ==========================================

@app.route('/api/auctions/<auction_id>/sponsors', methods=['GET'])
def get_sponsors(auction_id):
    try:
        sponsors_ref = db.reference(f'auctions/{auction_id}/sponsors')
        sponsors_data = sponsors_ref.get()
        
        sponsors_list = []
        if sponsors_data:
            for s_id, s_info in sponsors_data.items():
                s_info['id'] = s_id
                sponsors_list.append(s_info)
                
        return jsonify(sponsors_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auctions/<auction_id>/sponsors', methods=['POST'])
def add_sponsor(auction_id):
    try:
        organizer_id = request.form.get('organizer_id') or (request.json or {}).get('organizer_id')
        
        # Verify ownership
        auction_ref = db.reference(f'auctions/{auction_id}')
        auction_data = auction_ref.get()
        if not auction_data or auction_data.get('organizer_id') != organizer_id:
            return jsonify({'error': 'Unauthorized'}), 401
            
        if request.is_json:
            data = request.json or {}
            name = data.get('name', '')
            sponsor_type = data.get('type', '')
            logo_url = data.get('logo', '')
        else:
            name = request.form.get('name', '')
            sponsor_type = request.form.get('type', '')
            logo_url = request.form.get('logo_url', '')

        if 'logo' in request.files:
            logo_file = request.files['logo']
            if logo_file and logo_file.filename != '':
                try:
                    upload_result = cloudinary.uploader.upload(logo_file, folder="cricket-auction/sponsors")
                    logo_url = upload_result.get('secure_url', '')
                except Exception as e:
                    print(f"Logo upload warning: {e}")
                    
        sponsor_data = {
            'name': name,
            'type': sponsor_type,
            'logo': logo_url,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Use simple IDs like SP01, SP02...
        sponsors_ref = db.reference(f'auctions/{auction_id}/sponsors')
        existing = sponsors_ref.get() or {}
        next_num = len(existing) + 1
        sponsor_id = f"SP{next_num:02d}"
        
        # Ensure ID doesn't already exist
        while sponsor_id in existing:
            next_num += 1
            sponsor_id = f"SP{next_num:02d}"
            
        sponsors_ref.child(sponsor_id).set(sponsor_data)
        return jsonify({'message': 'Sponsor added successfully', 'id': sponsor_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auctions/<auction_id>/sponsors/<sponsor_id>', methods=['PUT'])
def update_sponsor(auction_id, sponsor_id):
    try:
        organizer_id = request.form.get('organizer_id') or (request.json or {}).get('organizer_id')
        
        # Verify ownership
        auction_ref = db.reference(f'auctions/{auction_id}')
        auction_data = auction_ref.get()
        if not auction_data or auction_data.get('organizer_id') != organizer_id:
            return jsonify({'error': 'Unauthorized'}), 401
            
        sponsors_ref = db.reference(f'auctions/{auction_id}/sponsors/{sponsor_id}')
        existing_sponsor = sponsors_ref.get()
        if not existing_sponsor:
            return jsonify({'error': 'Sponsor not found'}), 404
            
        if request.is_json:
            data = request.json or {}
            name = data.get('name', existing_sponsor.get('name'))
            sponsor_type = data.get('type', existing_sponsor.get('type'))
            logo_url = data.get('logo', existing_sponsor.get('logo'))
        else:
            name = request.form.get('name', existing_sponsor.get('name'))
            sponsor_type = request.form.get('type', existing_sponsor.get('type'))
            logo_url = request.form.get('logo_url', existing_sponsor.get('logo'))
            
        if 'logo' in request.files:
            logo_file = request.files['logo']
            if logo_file and logo_file.filename != '':
                try:
                    upload_result = cloudinary.uploader.upload(logo_file, folder="cricket-auction/sponsors")
                    logo_url = upload_result.get('secure_url', '')
                except Exception as e:
                    print(f"Logo upload warning: {e}")
                    
        existing_sponsor.update({
            'name': name,
            'type': sponsor_type,
            'logo': logo_url,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        sponsors_ref.update(existing_sponsor)
        return jsonify({'message': 'Sponsor updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auctions/<auction_id>/sponsors/<sponsor_id>', methods=['DELETE'])
def delete_sponsor(auction_id, sponsor_id):
    try:
        organizer_id = request.args.get('organizer_id')
        
        # Verify ownership
        auction_ref = db.reference(f'auctions/{auction_id}')
        auction_data = auction_ref.get()
        if not auction_data or auction_data.get('organizer_id') != organizer_id:
            return jsonify({'error': 'Unauthorized'}), 401
            
        sponsor_ref = db.reference(f'auctions/{auction_id}/sponsors/{sponsor_id}')
        if not sponsor_ref.get():
            return jsonify({'error': 'Sponsor not found'}), 404
            
        sponsor_ref.delete()
        return jsonify({'message': 'Sponsor deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
