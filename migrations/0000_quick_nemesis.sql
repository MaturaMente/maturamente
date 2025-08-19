CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"given_name" text NOT NULL,
	"email" text NOT NULL,
	"profile_picture" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
