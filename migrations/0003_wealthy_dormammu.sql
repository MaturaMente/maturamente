ALTER TABLE "exercises" DROP CONSTRAINT "exercises_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "subtopic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "topic_id";