"""
migrate_player_ids.py
---------------------
One-time script to rename all player IDs in Firebase from
P001, P002, ... format to 1, 2, 3, ... format.

Run once from the backend folder:
    python migrate_player_ids.py
"""

import os
import firebase_admin
from firebase_admin import credentials, db

FIREBASE_DATABASE_URL = 'https://cricket-auction-9b22a-default-rtdb.asia-southeast1.firebasedatabase.app'
CREDENTIAL_PATH = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

cred = credentials.Certificate(CREDENTIAL_PATH)
firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DATABASE_URL})

def migrate():
    auctions_ref = db.reference('/auctions')
    auctions = auctions_ref.get() or {}

    total_renamed = 0

    for auction_id, auction_data in auctions.items():
        if not isinstance(auction_data, dict):
            continue

        players = auction_data.get('players', {})
        if not players:
            continue

        players_ref = db.reference(f'/auctions/{auction_id}/players')
        updates_to_write = {}
        keys_to_delete = []

        for old_id, player_data in players.items():
            if not isinstance(player_data, dict):
                continue

            # Only migrate P001-style IDs
            if old_id.startswith('P') and old_id[1:].isdigit():
                new_id = str(int(old_id[1:]))  # "P007" → "7"

                # Update the 'id' field inside the player object too
                updated_player = dict(player_data)
                updated_player['id'] = new_id

                updates_to_write[new_id] = updated_player
                keys_to_delete.append(old_id)

        if updates_to_write:
            # Write new numeric-keyed players
            players_ref.update(updates_to_write)
            # Delete old P-prefixed keys
            for old_key in keys_to_delete:
                players_ref.child(old_key).delete()
            print(f"  Auction {auction_id}: renamed {len(keys_to_delete)} players")
            total_renamed += len(keys_to_delete)

    print(f"\nDone! Migration complete. Total players renamed: {total_renamed}")

if __name__ == '__main__':
    print("Starting player ID migration: P001 -> 1, P002 -> 2, ...\n")
    migrate()
