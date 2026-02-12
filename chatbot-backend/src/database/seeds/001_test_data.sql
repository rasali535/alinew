-- Seed data for testing (optional)
-- This file can be used to populate the database with test data

-- Insert a test session
INSERT INTO sessions (id, user_id, session_token, metadata)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'test-user-1', 'test-session-token-1', '{"source": "seed"}'),
    ('550e8400-e29b-41d4-a716-446655440001', 'test-user-2', 'test-session-token-2', '{"source": "seed"}')
ON CONFLICT (id) DO NOTHING;

-- Insert test messages
INSERT INTO messages (session_id, role, content, tokens_used)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'user', 'Hello, how are you?', 15),
    ('550e8400-e29b-41d4-a716-446655440000', 'assistant', 'I''m doing great! How can I help you today?', 25),
    ('550e8400-e29b-41d4-a716-446655440000', 'user', 'Tell me about AI', 12),
    ('550e8400-e29b-41d4-a716-446655440000', 'assistant', 'AI, or Artificial Intelligence, is the simulation of human intelligence by machines...', 45)
ON CONFLICT DO NOTHING;

-- Note: This is optional seed data for development/testing
-- Remove or modify as needed for your use case
