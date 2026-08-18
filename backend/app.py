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
# Note: You need to download 'serviceAccountKey.json' from your Firebase Project Settings
# and place it in the same directory as this file.
FIREBASE_DATABASE_URL = 'https://cricket-auction-9b22a-default-rtdb.asia-southeast1.firebasedatabase.app'
CREDENTIAL_PATH = 'serviceAccountKey.json'

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

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    fullname = data.get('fullname')
    email = data.get('email')
    password = data.get('password')

    if not fullname or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if not firebase_initialized:
        return jsonify({"error": "Database not connected"}), 500

    try:
        # Check if email exists
        users_ref = db.reference('/users')
        users = users_ref.get() or {}
        for uid, user_data in users.items():
            if user_data.get('email') == email:
                return jsonify({"error": "Email already exists"}), 400

        # Create new user
        new_uuid = str(uuid.uuid4())
        hashed_password = generate_password_hash(password)
        
        users_ref.child(new_uuid).set({
            "name": fullname,
            "email": email,
            "password": hashed_password,
            "role": "Organizer"
        })
        
        # Initialize default empty dashboard data
        db.reference(f'/insights/{new_uuid}').set({
            "total_auctions": 0, "total_players": 0, "total_teams": 0, "total_spent": 0
        })
        
        return jsonify({"message": "Registration successful", "organizer_id": new_uuid}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if not firebase_initialized:
        return jsonify({"error": "Database not connected"}), 500

    try:
        users_ref = db.reference('/users')
        users = users_ref.get() or {}
        
        user_id = None
        user_info = None
        
        for uid, user_data in users.items():
            if user_data.get('email') == email:
                user_id = uid
                user_info = user_data
                break
                
        if not user_id:
            return jsonify({"error": "No account found with this email"}), 404
            
        if not check_password_hash(user_info.get('password', ''), password):
            return jsonify({"error": "Incorrect password"}), 401
            
        return jsonify({"message": "Login successful", "organizer_id": user_id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/<organizer_id>', methods=['GET'])
def get_dashboard_data(organizer_id):
    """
    Returns the complete dashboard data for a given organizer.
    If Firebase is not initialized, it returns mock data matching the UI design.
    """
    if firebase_initialized:
        try:
            # Fetch data from Firebase Realtime Database
            ref = db.reference(f'/users/{organizer_id}')
            user_data = ref.get()
            
            if not user_data:
                return jsonify({"error": "Organizer not found"}), 404
                
            insights_ref = db.reference(f'/insights/{organizer_id}').get() or {}
            all_auctions = db.reference('/auctions').get() or {}
            auctions_ref = {k: v for k, v in all_auctions.items() if v.get('organizer_id') == organizer_id}
            activities_ref = db.reference(f'/activities/{organizer_id}').get() or {}
            
            return jsonify({
                "user": user_data,
                "insights": insights_ref,
                "auctions": auctions_ref,
                "activities": activities_ref
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    else:
        # Fallback Mock Data matching the UI
        mock_data = {
            "user": {
                "name": "Organizer",
                "role": "Super Admin"
            },
            "insights": {
                "total_auctions": {"value": 12, "trend": "+20%"},
                "total_players": {"value": 450, "trend": "+18%"},
                "total_teams": {"value": 24, "trend": "+14%"},
                "total_spent": {"value": "$1.2M", "trend": "+25%"}
            },
            "auctions": {
                "live": [
                    {
                        "name": "Premier League 2026",
                        "teams": 8, "players": 120, "budget": "$2.5M",
                        "progress": 65, "watching": 128
                    }
                ],
                "upcoming": [
                    {
                        "name": "Super Cup T20",
                        "teams": 6, "players": 90, "budget": "$1.2M",
                        "starts_in": "2H 30M",
                        "date": "25 May 2025, 02:00 PM"
                    }
                ]
            },
            "activities": [
                {"type": "player_sold", "text": "Player 'Virat K.' sold to 'Mumbai Indians' for $100,000.", "time": "2 mins ago"},
                {"type": "team_registered", "text": "New team 'Chennai Super Kings' registered for Premier League 2026.", "time": "15 mins ago"},
                {"type": "auction_created", "text": "Auction 'Mega Bash 2026' has been created successfully.", "time": "1 hour ago"},
                {"type": "player_added", "text": "Player 'Rohit Sharma' added to auction pool in 'Super Cup T20'.", "time": "2 hours ago"}
            ]
        }
        return jsonify(mock_data)

@app.route('/api/auctions', methods=['POST'])
def create_auction():
    if not firebase_initialized:
        return jsonify({"error": "Database not connected"}), 500

    organizer_id = request.form.get('organizer_id')
    if not organizer_id:
        return jsonify({"error": "Unauthorized"}), 401

    auction_name = request.form.get('auctionName')
    venue = request.form.get('venue')
    auction_date = request.form.get('auctionDate')
    auction_time = request.form.get('auctionTime')
    balance = request.form.get('balancePerTeam', type=float)
    players = request.form.get('playersPerTeam', type=int)
    min_bid = request.form.get('minBid', type=float)
    bid_increase = request.form.get('bidIncrease', type=float)
    visibility = request.form.get('visibility')

    # Basic backend validations
    if not all([auction_name, venue, auction_date, auction_time, balance, players, min_bid, bid_increase, visibility]):
        return jsonify({"error": "Missing required fields"}), 400

    if min_bid > balance:
        return jsonify({"error": "Minimum bid cannot exceed balance per team"}), 400

    # Image Upload
    logo_url = ""
    if 'tournamentLogo' in request.files:
        logo_file = request.files['tournamentLogo']
        if logo_file.filename != '':
            try:
                upload_result = cloudinary.uploader.upload(logo_file)
                logo_url = upload_result.get('secure_url')
            except Exception as e:
                return jsonify({"error": f"Failed to upload image: {str(e)}"}), 500

    new_uuid = str(uuid.uuid4())
    
    # Save to auctions
    auction_data = {
        "organizer_id": organizer_id,
        "name": auction_name,
        "venue": venue,
        "date": auction_date,
        "time": auction_time,
        "budget": f"${balance:,.0f}", # Format nicely for dashboard
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
    
    try:
        db.reference(f'/auctions/{new_uuid}').set(auction_data)
        
        # Update insights
        insights_ref = db.reference(f'/insights/{organizer_id}')
        insights = insights_ref.get() or {
            "total_auctions": 0, "total_players": 0, "total_teams": 0, "total_spent": 0
        }
        insights["total_auctions"] = insights.get("total_auctions", 0) + 1
        insights_ref.set(insights)
        
        # Add Activity
        activities_ref = db.reference(f'/activities/{organizer_id}')
        new_activity_id = str(uuid.uuid4())
        activities_ref.child(new_activity_id).set({
            "type": "auction_created",
            "text": f"Auction '{auction_name}' has been created successfully.",
            "time": "Just now",
            "timestamp": datetime.now().isoformat()
        })
        
        return jsonify({"message": "Auction created successfully", "auction_id": new_uuid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auctions/<auction_id>', methods=['GET'])
def get_auction(auction_id):
    if not firebase_initialized:
        # Return mock data if no db
        mock_auction = {
            "name": "Premier League 2026",
            "venue": "City Stadium",
            "date": "2026-10-15",
            "time": "10:00",
            "budget": "$100,000",
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
        return jsonify(mock_auction)
        
    try:
        auction_ref = db.reference(f'/auctions/{auction_id}')
        auction_data = auction_ref.get()
        if not auction_data:
            return jsonify({"error": "Auction not found"}), 404
            
        # Add some extra display fields that might not be in db yet
        if "auction_code" not in auction_data:
            auction_data["auction_code"] = f"PL-2026-{auction_id[:3].upper()}"
        if "views" not in auction_data:
            auction_data["views"] = "1.2K"
        if "plan" not in auction_data:
            auction_data["plan"] = "Free Plan"
            
        return jsonify(auction_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
