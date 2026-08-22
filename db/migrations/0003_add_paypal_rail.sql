-- PayPal Orders v2 joins the rail enum.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on older
-- Postgres, and is not reversible: there is no DROP VALUE.
ALTER TYPE "payment_rail" ADD VALUE IF NOT EXISTS 'paypal';
