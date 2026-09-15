CREATE TABLE `accounts` (
  `account_id` text PRIMARY KEY NOT NULL,
  `display_name` text NOT NULL,
  `email` text,
  `level` integer DEFAULT 1 NOT NULL CHECK (`level` >= 1),
  `experience` integer DEFAULT 0 NOT NULL CHECK (`experience` >= 0),
  `selected_hero_id` text DEFAULT 'fire-ember' NOT NULL CHECK (`selected_hero_id` IN ('fire-ember', 'water-tide', 'earth-bastion', 'air-gale')),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE INDEX `accounts_updated_at_idx` ON `accounts` (`updated_at`);
