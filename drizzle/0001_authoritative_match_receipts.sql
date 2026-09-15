CREATE TABLE `consumed_match_receipts` (
  `receipt_id` text PRIMARY KEY NOT NULL,
  `nonce` text NOT NULL UNIQUE,
  `match_id` text NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`account_id`),
  `mode` text NOT NULL CHECK (`mode` IN ('normal', 'ranked', 'history', 'practice')),
  `signature` text NOT NULL,
  `issued_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `consumed_at` text NOT NULL,
  `resulting_experience` integer NOT NULL CHECK (`resulting_experience` >= 0),
  `resulting_level` integer NOT NULL CHECK (`resulting_level` BETWEEN 1 AND 30),
  UNIQUE (`account_id`, `match_id`)
);

CREATE TABLE `match_history` (
  `history_id` text PRIMARY KEY NOT NULL,
  `match_id` text NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`account_id`),
  `mode` text NOT NULL,
  `placement` integer NOT NULL CHECK (`placement` >= 1),
  `match_score` integer NOT NULL CHECK (`match_score` >= 0),
  `performance_score` integer NOT NULL CHECK (`performance_score` >= 0),
  `balance_version` text NOT NULL,
  `game_core_version` text NOT NULL,
  `result_json` text NOT NULL,
  `played_at` text NOT NULL,
  UNIQUE (`account_id`, `match_id`)
);

CREATE TABLE `progression_events` (
  `event_id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL REFERENCES `accounts`(`account_id`),
  `source_type` text NOT NULL,
  `source_id` text NOT NULL,
  `experience_delta` integer NOT NULL,
  `payload_json` text NOT NULL,
  `created_at` text NOT NULL,
  UNIQUE (`source_type`, `source_id`)
);

CREATE INDEX `consumed_match_receipts_account_idx` ON `consumed_match_receipts` (`account_id`, `consumed_at`);
CREATE INDEX `match_history_account_played_idx` ON `match_history` (`account_id`, `played_at`);
CREATE INDEX `progression_events_account_created_idx` ON `progression_events` (`account_id`, `created_at`);
PRAGMA optimize;
