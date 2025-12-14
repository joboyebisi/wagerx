-- ================================
-- ADD MISSING COLUMNS TO EXISTING WAGERS TABLE
-- Run this if you get "column does not exist" error
-- ================================

-- Add wager_id_onchain column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wagers' AND column_name = 'wager_id_onchain'
  ) THEN
    ALTER TABLE wagers ADD COLUMN wager_id_onchain TEXT;
    RAISE NOTICE 'Added column wager_id_onchain to wagers table';
  ELSE
    RAISE NOTICE 'Column wager_id_onchain already exists';
  END IF;
END $$;

-- Add tx_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wagers' AND column_name = 'tx_hash'
  ) THEN
    ALTER TABLE wagers ADD COLUMN tx_hash TEXT;
    RAISE NOTICE 'Added column tx_hash to wagers table';
  ELSE
    RAISE NOTICE 'Column tx_hash already exists';
  END IF;
END $$;

-- Create index for wager_id_onchain if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_wagers_wager_id_onchain ON wagers(wager_id_onchain);

-- Success message
SELECT '✅ Missing columns added successfully!' as message;

