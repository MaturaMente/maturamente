CREATE TABLE "flagged_user_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"file_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"pinecone_filename" text NOT NULL,
	"file_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"n_pages" integer DEFAULT 1 NOT NULL,
	"storage_path" text NOT NULL,
	"upload_timestamp" timestamp DEFAULT now() NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "notes" RENAME COLUMN "pdf_url" TO "storage_path";--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "slug" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "n_pages" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "flagged_user_files" ADD CONSTRAINT "flagged_user_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flagged_user_files" ADD CONSTRAINT "flagged_user_files_file_id_user_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."user_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_files" ADD CONSTRAINT "user_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_subscription_changes" DROP COLUMN "proration_amount";--> statement-breakpoint
ALTER TABLE "pending_subscription_changes" DROP COLUMN "stripe_schedule_id";