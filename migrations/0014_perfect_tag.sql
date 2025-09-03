ALTER TABLE "ai_budget_balance" DROP CONSTRAINT "ai_budget_balance_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_budget_balance" DROP CONSTRAINT "ai_budget_balance_subscription_id_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_subscription_id_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_budget_balance" ADD CONSTRAINT "ai_budget_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budget_balance" ADD CONSTRAINT "ai_budget_balance_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;