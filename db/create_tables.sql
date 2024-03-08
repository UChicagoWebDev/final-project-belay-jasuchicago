create table users (
  user_id INTEGER PRIMARY KEY,
  username VARCHAR(40) UNIQUE,
  password VARCHAR(40),
  api_key VARCHAR(40)
);

create table channels (
    channel_id INTEGER PRIMARY KEY,
    channel_name VARCHAR(40) UNIQUE
);

create table messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER,
  is_reply INTEGER,
  user_id INTEGER,
  channel_id INTEGER,
  body TEXT,
  time_entered TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(channel_id) REFERENCES channels(channel_id)
);

create table reactions (
  id INTEGER PRIMARY KEY,
  emoji VARCHAR(40)
  message_id INTEGER,
  user_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(message_id) REFERENCES messages(id)
);

create table last_seen (
  id INTEGER PRIMARY KEY,
  channel_id INTEGER,
  user_id INTEGER,
  exit_time TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(channel_id) REFERENCES channels(channel_id)
);