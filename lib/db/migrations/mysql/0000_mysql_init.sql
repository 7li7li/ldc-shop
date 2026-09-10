CREATE TABLE `admin_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_type` varchar(64) NOT NULL,
	`target_value` varchar(500),
	`title` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`sender` varchar(255),
	`created_at` bigint,
	CONSTRAINT `admin_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcast_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`sender` varchar(255),
	`created_at` bigint,
	CONSTRAINT `broadcast_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcast_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`created_at` bigint,
	CONSTRAINT `broadcast_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `broadcast_reads_message_user_uq` UNIQUE(`message_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`card_key` text NOT NULL,
	`is_used` boolean DEFAULT false,
	`reserved_order_id` varchar(255),
	`reserved_at` bigint,
	`expires_at` bigint,
	`used_at` bigint,
	`created_at` bigint,
	CONSTRAINT `cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` text,
	`sort_order` int DEFAULT 0,
	`created_at` bigint,
	`updated_at` bigint,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `daily_checkins_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`created_at` bigint,
	CONSTRAINT `daily_checkins_v2_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_users` (
	`user_id` varchar(255) NOT NULL,
	`username` varchar(255),
	`email` varchar(500),
	`points` int NOT NULL DEFAULT 0,
	`is_blocked` boolean DEFAULT false,
	`desktop_notifications_enabled` boolean DEFAULT false,
	`created_at` bigint,
	`last_login_at` bigint,
	`last_checkin_at` bigint,
	`consecutive_days` int DEFAULT 0,
	CONSTRAINT `login_users_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`order_id` varchar(255) NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`product_name` varchar(500) NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`email` varchar(500),
	`status` varchar(32) DEFAULT 'pending',
	`trade_no` varchar(255),
	`card_key` text,
	`card_ids` text,
	`paid_at` bigint,
	`delivered_at` bigint,
	`user_id` varchar(255),
	`username` varchar(255),
	`payee` varchar(255),
	`points_used` int DEFAULT 0,
	`quantity` int NOT NULL DEFAULT 1,
	`current_payment_id` varchar(255),
	`created_at` bigint,
	CONSTRAINT `orders_order_id` PRIMARY KEY(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(255) NOT NULL,
	`name` varchar(500) NOT NULL,
	`description` text,
	`price` decimal(18,2) NOT NULL,
	`compare_at_price` decimal(18,2),
	`category` varchar(255),
	`image` text,
	`product_images` text,
	`is_hot` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`is_shared` boolean DEFAULT false,
	`sort_order` int DEFAULT 0,
	`purchase_limit` int,
	`purchase_warning` text,
	`purchase_url` text,
	`visibility_level` int DEFAULT -1,
	`stock_count` int DEFAULT 0,
	`locked_count` int DEFAULT 0,
	`sold_count` int DEFAULT 0,
	`rating` double DEFAULT 0,
	`review_count` int DEFAULT 0,
	`created_at` bigint,
	`variant_group_id` varchar(255),
	`variant_label` varchar(255),
	`purchase_questions` text,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`user_id` varchar(255),
	`username` varchar(255),
	`reason` text,
	`status` varchar(32) DEFAULT 'pending',
	`admin_username` varchar(255),
	`admin_note` text,
	`created_at` bigint,
	`updated_at` bigint,
	`processed_at` bigint,
	CONSTRAINT `refund_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`comment` text NOT NULL,
	`created_at` bigint,
	CONSTRAINT `review_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`created_at` bigint,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(191) NOT NULL,
	`value` text,
	`updated_at` bigint,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `user_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`username` varchar(255),
	`title` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` bigint,
	CONSTRAINT `user_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`type` varchar(64) NOT NULL,
	`title_key` varchar(255) NOT NULL,
	`content_key` varchar(255) NOT NULL,
	`data` text,
	`is_read` boolean DEFAULT false,
	`created_at` bigint,
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`user_id` varchar(255),
	`username` varchar(255),
	`created_at` bigint,
	CONSTRAINT `wishlist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlist_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`created_at` bigint,
	CONSTRAINT `wishlist_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `wishlist_votes_item_user_uq` UNIQUE(`item_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `broadcast_reads` ADD CONSTRAINT `broadcast_reads_message_id_broadcast_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `broadcast_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcast_reads` ADD CONSTRAINT `broadcast_reads_user_id_login_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `login_users`(`user_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cards` ADD CONSTRAINT `cards_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_checkins_v2` ADD CONSTRAINT `daily_checkins_v2_user_id_login_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `login_users`(`user_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_replies` ADD CONSTRAINT `review_replies_review_id_reviews_id_fk` FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_messages` ADD CONSTRAINT `user_messages_user_id_login_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `login_users`(`user_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_user_id_login_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `login_users`(`user_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_votes` ADD CONSTRAINT `wishlist_votes_item_id_wishlist_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `wishlist_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_votes` ADD CONSTRAINT `wishlist_votes_user_id_login_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `login_users`(`user_id`) ON DELETE cascade ON UPDATE no action;