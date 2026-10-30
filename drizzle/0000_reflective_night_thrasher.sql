CREATE TABLE "health_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" varchar(128) NOT NULL,
	"status" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

