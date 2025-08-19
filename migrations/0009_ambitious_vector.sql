ALTER TABLE "subscriptions" ALTER COLUMN "subject_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "custom_price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "plan_type";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "materia_limit";