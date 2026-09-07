-- Backfill MenuItem.order from existing createdAt order, per category,
-- so pre-existing menus don't change their visible item order after the
-- "order" column was introduced (it defaulted to 0 for all existing rows).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "MenuItem"
)
UPDATE "MenuItem"
SET "order" = ranked.rn
FROM ranked
WHERE "MenuItem".id = ranked.id;
