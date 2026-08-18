CREATE SCHEMA "foodrepo";
--> statement-breakpoint
CREATE TYPE "foodrepo"."audit_status" AS ENUM('pending', 'completed', 'failed', 'partial_success');--> statement-breakpoint
CREATE TYPE "foodrepo"."source_type" AS ENUM('api', 'scraper');--> statement-breakpoint
CREATE TABLE "foodrepo"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"tag" varchar NOT NULL,
	"status" "foodrepo"."audit_status" DEFAULT 'pending',
	"initiated_by" varchar DEFAULT 'system',
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"stack" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"aliases" text[],
	"country" text[],
	"cuisine" text[],
	"region" text[],
	"flavor_profile" text[],
	"dietary_flags" text[],
	"provenance" text DEFAULT 'MISSING',
	"comment" text,
	"pronunciation" text,
	"last_modified" timestamp DEFAULT now(),
	"embedding" vector(3072),
	"image" jsonb DEFAULT '{"missing":true}'::jsonb,
	"part_of" text[],
	"derivatives" text[],
	"varieties" text[],
	"used_in" text[],
	"substitutes" text[],
	"pairs_with" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"matched_ingredients" uuid[],
	"confidence" real,
	"method" text DEFAULT 'manual',
	"notes" text,
	"meta" jsonb,
	"source_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."price_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"price" double precision NOT NULL,
	"currency" varchar(3) DEFAULT 'LKR',
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."price_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"logo" text,
	"base_url" text,
	"type" "foodrepo"."source_type" DEFAULT 'api',
	"last_fetch" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"source_id" uuid NOT NULL,
	"brand" text,
	"unit" text,
	"quantity" real DEFAULT 1,
	"price" double precision NOT NULL,
	"currency" varchar(3) DEFAULT 'LKR',
	"last_fetched" timestamp DEFAULT now(),
	"url" text,
	"external_id" text,
	"department_code" text,
	"stock_in_hand" real,
	"average_sale" real,
	"max_qty" real,
	"category_path" text[],
	"sub_department_code" text,
	"is_promotion_applied" boolean,
	"promotion_discount_value" double precision,
	"sku" text,
	"raw" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."query_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "query_embeddings_query_unique" UNIQUE("query")
);
--> statement-breakpoint
CREATE TABLE "foodrepo"."stock_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"stock" real NOT NULL,
	"average_daily_sales" real,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foodrepo"."mappings" ADD CONSTRAINT "mappings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "foodrepo"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foodrepo"."mappings" ADD CONSTRAINT "mappings_source_id_price_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "foodrepo"."price_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foodrepo"."price_histories" ADD CONSTRAINT "price_histories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "foodrepo"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foodrepo"."products" ADD CONSTRAINT "products_source_id_price_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "foodrepo"."price_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foodrepo"."stock_histories" ADD CONSTRAINT "stock_histories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "foodrepo"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_type_idx" ON "foodrepo"."audit_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "audit_tag_idx" ON "foodrepo"."audit_logs" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "audit_status_idx" ON "foodrepo"."audit_logs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "mapping_product_source_idx" ON "foodrepo"."mappings" USING btree ("product_id","source_id");--> statement-breakpoint
CREATE INDEX "price_hist_prod_time_idx" ON "foodrepo"."price_histories" USING btree ("product_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "product_external_source_idx" ON "foodrepo"."products" USING btree ("external_id","source_id");--> statement-breakpoint
CREATE INDEX "product_sku_idx" ON "foodrepo"."products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "stock_hist_prod_time_idx" ON "foodrepo"."stock_histories" USING btree ("product_id","timestamp");