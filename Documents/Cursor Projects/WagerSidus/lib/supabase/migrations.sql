-- Create memory_entries table
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wager', 'interaction', 'agent')),
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain_id INTEGER NOT NULL DEFAULT 56,
  participants TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_memory_entries_address ON memory_entries(address);
CREATE INDEX IF NOT EXISTS idx_memory_entries_type ON memory_entries(type);
CREATE INDEX IF NOT EXISTS idx_memory_entries_chain_id ON memory_entries(chain_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_participants ON memory_entries USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_memory_entries_timestamp ON memory_entries(timestamp DESC);

-- Create wagers table for easier wager queries
CREATE TABLE IF NOT EXISTS wagers (
  id TEXT PRIMARY KEY,
  contract_address TEXT,
  creator_address TEXT NOT NULL,
  participants TEXT[] NOT NULL,
  amount TEXT NOT NULL,
  condition TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'resolved', 'cancelled')),
  winner TEXT,
  chain_id INTEGER NOT NULL DEFAULT 56,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for wagers
CREATE INDEX IF NOT EXISTS idx_wagers_creator ON wagers(creator_address);
CREATE INDEX IF NOT EXISTS idx_wagers_participants ON wagers USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_wagers_status ON wagers(status);
CREATE INDEX IF NOT EXISTS idx_wagers_chain_id ON wagers(chain_id);
CREATE INDEX IF NOT EXISTS idx_wagers_created_at ON wagers(created_at DESC);

-- Create agent_connections table for agent interoperability
CREATE TABLE IF NOT EXISTS agent_connections (
  id TEXT PRIMARY KEY,
  agent_address TEXT NOT NULL,
  connected_agent_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 56,
  shared_memory_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_address, connected_agent_address, chain_id)
);

-- Create index for agent connections
CREATE INDEX IF NOT EXISTS idx_agent_connections_agent ON agent_connections(agent_address);
CREATE INDEX IF NOT EXISTS idx_agent_connections_connected ON agent_connections(connected_agent_address);

-- Enable Row Level Security (RLS)
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for memory_entries (users can only access their own memories)
CREATE POLICY "Users can view their own memories"
  ON memory_entries FOR SELECT
  USING (auth.uid()::text = address OR address = current_setting('app.current_user_address', true));

CREATE POLICY "Users can insert their own memories"
  ON memory_entries FOR INSERT
  WITH CHECK (auth.uid()::text = address OR address = current_setting('app.current_user_address', true));

CREATE POLICY "Users can update their own memories"
  ON memory_entries FOR UPDATE
  USING (auth.uid()::text = address OR address = current_setting('app.current_user_address', true));

-- Create policies for wagers (users can view wagers they're part of)
CREATE POLICY "Users can view their wagers"
  ON wagers FOR SELECT
  USING (
    creator_address = current_setting('app.current_user_address', true) OR
    current_setting('app.current_user_address', true) = ANY(participants)
  );

CREATE POLICY "Users can create wagers"
  ON wagers FOR INSERT
  WITH CHECK (creator_address = current_setting('app.current_user_address', true));

CREATE POLICY "Users can update their wagers"
  ON wagers FOR UPDATE
  USING (
    creator_address = current_setting('app.current_user_address', true) OR
    current_setting('app.current_user_address', true) = ANY(participants)
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_memory_entries_updated_at BEFORE UPDATE ON memory_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wagers_updated_at BEFORE UPDATE ON wagers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_connections_updated_at BEFORE UPDATE ON agent_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

