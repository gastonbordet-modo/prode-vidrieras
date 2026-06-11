CREATE TABLE "bet_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"bet_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"side" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"match_id" integer NOT NULL,
	"pick" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bet_entries" ADD CONSTRAINT "bet_entries_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_entries" ADD CONSTRAINT "bet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bet_entries_bet_user_unique" ON "bet_entries" USING btree ("bet_id","user_id");--> statement-breakpoint
CREATE INDEX "bet_entries_user_id_idx" ON "bet_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bets_match_id_idx" ON "bets" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "bets_status_idx" ON "bets" USING btree ("status");