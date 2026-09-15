CREATE TABLE `client_journey` (
	`account_id` text PRIMARY KEY NOT NULL,
	`tutorial_step` integer DEFAULT 0 NOT NULL,
	`talents_json` text DEFAULT '[]' NOT NULL,
	`runes_json` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`account_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "client_journey_step_range" CHECK("client_journey"."tutorial_step" BETWEEN 0 AND 4)
);
