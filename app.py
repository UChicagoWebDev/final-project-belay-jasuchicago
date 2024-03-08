import string
import random
from datetime import datetime
from flask import *
from functools import wraps
import sqlite3


app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


# Function to establish a connection to the SQLite database
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect('db/belay.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db


# Function to execute a query on the database
def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None


# Function to close the database connection at the end of the request
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


# Route for the main page
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/channels')
@app.route('/threads')
def index(chat_id=None):
    return app.send_static_file('index.html')


# Error handler for 404 not found errors
@app.errorhandler(404)
def page_not_found(e):
    return "404 Not Found", 404


# Function to generate a new user
def new_user():
    name = "User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('INSERT INTO users (username, password, api_key) VALUES (?, ?, ?) RETURNING user_id, username, password, api_key',
                 (name, password, api_key), one=True)
    return u


# Route to handle user signup
@app.route('/api/', methods=["POST"])
def signup():
    u = new_user()
    user_dict = {
        "user_api": u["api_key"],
        "user_name": u["username"],
        "user_id": u["user_id"]
    }
    return jsonify([user_dict])


# Route to handle user login
@app.route('/api/login', methods=["POST"])
def login():
    username = request.headers.get('username')
    password = request.headers.get('password')
    user = query_db("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], one=True)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    user_dict = {
        "user_id": user["user_id"].decode('utf-8') if isinstance(user["user_id"], bytes) else user["user_id"],
        "user_api_key": user["api_key"].decode('utf-8') if isinstance(user["api_key"], bytes) else user["api_key"]
    }
    return jsonify(user_dict)


# Route to update user profile
@app.route('/api/profile', methods=["PUT"])
def update_profile():
    api_key = request.headers.get('auth-key')
    username = request.headers.get('username')
    update_type = request.headers.get('update-type')

    if update_type == "username":
        db = get_db()
        db.execute("UPDATE users SET username = ? WHERE api_key = ?", [username, api_key])
        db.commit()
        return jsonify({"message": "Username updated successfully"})
    elif update_type == "password":
        new_password = request.headers.get('new-password')
        db = get_db()
        db.execute("UPDATE users SET password = ? WHERE api_key = ? AND username = ?", [new_password, api_key, username])
        db.commit()
        return jsonify({"message": "Password updated successfully"})


# Route to handle when a user exits a channel
@app.route('/api/exit_channel', methods=["POST"])
def exit_channel():
    channel_id = request.headers.get('channel-id')
    user_id = request.headers.get('user-id')
    update_exit_time(channel_id, user_id)
    return jsonify({"message": "Exit time updated successfully"})


# Route to handle channels and messages
@app.route('/api/channels', methods=["POST", "GET"])
def handle_channels():
    if request.method == "POST":
        post_type = request.headers.get('post-type')

        if post_type == "channel":
            new_channel = request.headers.get('new-name')
            create_channel(new_channel)
            return jsonify({"message": "Channel created successfully"})
        
        elif post_type == "message":
            create_message()
            return jsonify({"message": "Message created successfully"})
        
        elif post_type == "reaction":
            create_reaction()
            return jsonify({"message": "Reaction created successfully"})

    elif request.method == "GET":
        get_type = request.headers.get("get-type")

        if get_type == "list-channels":
            return jsonify(list_channels())
        
        elif get_type == "list-messages":
            return jsonify(list_messages())
        
# Route to handle threads and messages
@app.route('/api/threads', methods=["POST", "GET"])
def handle_threads():
    if request.method == "POST":
        post_type = request.headers.get('post-type')

        if post_type == "channel":
            new_channel = request.headers.get('new-name')
            create_channel(new_channel)
            return jsonify({"message": "Channel created successfully"})
        
        elif post_type == "message":
            create_message()
            return jsonify({"message": "Thread message created successfully"})
        
        elif post_type == "reaction":
            create_reaction()
            return jsonify({"message": "Thread reaction created successfully"})
        
        elif post_type == "reply":
            create_reply()
            return jsonify({"message": "Thread message reply created successfully"})
        
    elif request.method == "GET":
        get_type = request.headers.get("get-type")

        if get_type == "list-channels":
            return jsonify(list_channels())
        
        elif get_type == "list-messages":
            return jsonify(list_messages())
        
        elif get_type == "list-threads":
            return jsonify(list_threads())
        
        elif get_type == "header_message":
            return jsonify(header_message())


# Helper functions
# Function to update exit time when a user exits a channel
def update_exit_time(channel_id, user_id):
    exit_time = datetime.now().isoformat()
    db = get_db()
    db.execute("INSERT OR REPLACE INTO last_seen (channel_id, user_id, exit_time) VALUES (?, ?, ?)", (channel_id, user_id, exit_time))
    db.commit()

# Function to create a new channel
def create_channel(channel_name):
    db = get_db()
    db.execute("INSERT INTO channels (channel_name) VALUES (?)", [channel_name])
    db.commit()

# Function to create a new message
def create_message():
    user_id = request.headers.get('user-id')
    channel_id = request.headers.get('channel-id')
    time_entered = str(datetime.now().isoformat())
    body_text = request.data.decode("utf-8")[1:-1]
    db = get_db()
    db.execute("INSERT INTO messages (is_reply, user_id, channel_id, body, time_entered) VALUES (?, ?, ?, ?, ?)", [0, user_id, channel_id, body_text, time_entered])
    db.commit()

# Function to create a new thread message
def create_reaction():
    emoji = request.headers.get('emoji')
    user = request.headers.get('user-id')
    message_id = request.headers.get('message-id')
    db = get_db()
    db.execute("INSERT INTO reactions (emoji, message_id, user_id) VALUES (?, ?, ?)", [emoji, message_id, user])
    db.commit()

# Function to create a new thread message reply
def create_reply():
    user_id = request.headers.get('user-id')
    channel_id = request.headers.get('channel-id')
    chat_id = request.headers.get('message-id')
    time_entered = str(datetime.now().isoformat())
    body_with_quotations = request.data.decode("utf-8")
    body_text = body_with_quotations[1:len(body_with_quotations)-1]
    db = get_db()
    db.execute("INSERT INTO messages (chat_id, is_reply, user_id, channel_id, body, time_entered) VALUES (?, ?, ?, ?, ?, ?)", [chat_id, 1, user_id, channel_id, body_text, time_entered])
    db.commit()

# Function to list all channels
def list_channels():
    current_channel = request.headers.get("current-channel")
    user_id = request.headers.get("user-id")
    channels_list = query_db("SELECT * FROM channels")
    
    if not channels_list:
        return []

    list_of_channels = []
    for row in channels_list:
        channel_id = row["channel_id"].decode('utf-8') if isinstance(row["channel_id"], bytes) else row["channel_id"]
        channel_name = row["channel_name"].decode('utf-8') if isinstance(row["channel_name"], bytes) else row["channel_name"]
        
        # Calculate unread messages for each channel
        unread = 0 if channel_id == current_channel else num_messages_unread(channel_id, user_id, current_channel)
        
        row_dict = {
            "channel_id": channel_id,
            "channel_name": channel_name,
            "unread": unread
        }
        list_of_channels.append(row_dict)
    return list_of_channels

# Function to list all messages
def list_messages():
    channel_id = request.headers.get("channel-id")
    messages_rows = query_db("SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=?", [channel_id, 0])
    
    if not messages_rows:
        return []

    list_of_messages = []
    for row in messages_rows:
        row_dict = create_message_dict(row)
        list_of_messages.append(row_dict)

    return list_of_messages

# Function to list all thread messages
def list_threads():
    channel_id = request.headers.get("channel-id")
    chat_id = request.headers.get("chat-id")
    messages_rows = query_db("SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=? and messages.chat_id =?", [channel_id, 1, chat_id])
    
    if not messages_rows:
        return []

    list_of_threads = []
    for row in messages_rows:
        row_dict = create_message_dict(row)
        list_of_threads.append(row_dict)

    return list_of_threads

# Function to list all thread header messages
def header_message():
    channel_id = request.headers.get("channel-id")
    id = request.headers.get("chat-id")
    messages_rows = query_db("SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=? and messages.id =?", [channel_id, 0, id])
    
    if not messages_rows:
        return []

    list_of_messages = []
    for row in messages_rows:
        row_dict = create_message_dict(row)
        list_of_messages.append(row_dict)

    return list_of_messages

# Function to create a message dictionary
def create_message_dict(row):
    row_dict = {}
    message_id = row["id"].decode('utf-8') if isinstance(row["id"], bytes) else row["id"]
    username = row["username"].decode('utf-8') if isinstance(row["username"], bytes) else row["username"]
    body = row["body"].decode('utf-8') if isinstance(row["body"], bytes) else row["body"]
    
    reaction_dictionary = create_reaction_dictionary(message_id)
    
    row_dict["author"] = username
    row_dict["message_id"] = message_id
    row_dict["body"] = body
    row_dict.update(reaction_dictionary) 
    
    return row_dict

# Function to create a reaction dictionary for a message
def create_reaction_dictionary(message_id):
    reaction_dictionary = {
        "hearts": 0,
        "thumbsup": 0,
        "happyface": 0,
        "laughing": 0,
        "star": 0,
        "thumbsdown": 0
    }
    message_reactions = query_db("SELECT * FROM reactions WHERE message_id = ?", [message_id])
    if message_reactions:
        for reaction in message_reactions:
            emoji = reaction["emoji"]
            reaction_dictionary[emoji] += 1
    return reaction_dictionary

# Function to get the number of unread messages in a channel for the user
def num_messages_unread(channel_id, user_id, current_channel):
    if channel_id == current_channel:
        return 0  # No unread messages in the current channel

    exit_time_row = query_db("SELECT exit_time FROM last_seen WHERE channel_id = ? AND user_id = ?", (current_channel, user_id), one=True)
    
    if exit_time_row:
        exit_time = datetime.fromisoformat(exit_time_row["exit_time"])
    else:
        # If the user hasn't exited the current channel yet, consider all messages as unread
        exit_time = datetime.min

    unread_messages_count = query_db("SELECT COUNT(*) FROM messages WHERE channel_id = ? AND time_entered > ?", (channel_id, exit_time.isoformat())).fetchone()[0]
    return unread_messages_count

if __name__ == '__main__':
    app.run()