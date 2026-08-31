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
                            my_players_count += adata.get('players', 0)
                            
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
            "auction_code": f"PL-2026-{auction_id[:3].upper()}" if len(auction_id) >= 3 else "PL-2026-X8F",
            "views": "1.2K",
            "plan": "Free Plan"
        }
        return jsonify(mock_auction), 200
        
    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction_data = auction_ref.get()
        if not auction_data:
            return jsonify({"error": "Auction not found"}), 404
            
        auction_data["id"] = auction_id
        
        all_users = db.reference('/users').get() or {}
        creator_info = all_users.get(auction_data.get('organizer_id'), {})
        auction_data['organizer_name'] = creator_info.get('name', 'Organizer')

        if "auction_code" not in auction_data:
            auction_data["auction_code"] = f"PL-2026-{auction_id[:3].upper()}"
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
