CREATE TABLE "user_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"pinecone_file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"n_pages" integer NOT NULL,
	"upload_timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "flagged_user_files" CASCADE;--> statement-breakpoint
DROP TABLE "user_files" CASCADE;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;