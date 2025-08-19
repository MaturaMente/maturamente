CREATE TABLE "pending_subscription_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" uuid NOT NULL,
	"change_type" text NOT NULL,
	"timing" text NOT NULL,
	"new_subject_ids" jsonb,
	"new_subject_count" integer,
	"new_price" numeric(10, 2),
	"proration_amount" numeric(10, 2),
	"stripe_schedule_id" text,
	"scheduled_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_subscription_changes" ADD CONSTRAINT "pending_subscription_changes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_subscription_changes" ADD CONSTRAINT "pending_subscription_changes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;