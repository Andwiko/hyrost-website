-- Hyrost Database Seed Example
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@hyrost.com', 'hashed_password', 'admin'),
('user1', 'user1@hyrost.com', 'hashed_password', 'user');

INSERT INTO threads (title, content, category, user_id) VALUES
('Welcome to Hyrost!', 'This is the first thread in the forum.', 'general', 1);
