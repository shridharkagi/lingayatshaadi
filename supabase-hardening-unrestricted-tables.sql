-- Harden tables currently shown as UNRESTRICTED in Supabase Table Editor.
-- Run after your other schema migrations on TEST first, then PROD.

-- ---------------------------------------------------------------------------
-- Helper: superadmin check based on profiles.role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'superadmin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Internal/admin tables: enable RLS + superadmin manage policy
-- ---------------------------------------------------------------------------

-- admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_logs_superadmin_all" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_superadmin_all"
ON public.admin_audit_logs
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- manual_payment_receipts
ALTER TABLE public.manual_payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manual_payment_receipts_superadmin_all" ON public.manual_payment_receipts;
CREATE POLICY "manual_payment_receipts_superadmin_all"
ON public.manual_payment_receipts
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_transactions_superadmin_all" ON public.payment_transactions;
CREATE POLICY "payment_transactions_superadmin_all"
ON public.payment_transactions
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- profile_deletion_requests
ALTER TABLE public.profile_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_deletion_requests_superadmin_all" ON public.profile_deletion_requests;
CREATE POLICY "profile_deletion_requests_superadmin_all"
ON public.profile_deletion_requests
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- profile_kyc_documents
ALTER TABLE public.profile_kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_kyc_documents_superadmin_all" ON public.profile_kyc_documents;
CREATE POLICY "profile_kyc_documents_superadmin_all"
ON public.profile_kyc_documents
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- profile_moderation_events
ALTER TABLE public.profile_moderation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_moderation_events_superadmin_all" ON public.profile_moderation_events;
CREATE POLICY "profile_moderation_events_superadmin_all"
ON public.profile_moderation_events
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- profile_trash
ALTER TABLE public.profile_trash ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_trash_superadmin_all" ON public.profile_trash;
CREATE POLICY "profile_trash_superadmin_all"
ON public.profile_trash
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- subscription_notification_logs
ALTER TABLE public.subscription_notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_notification_logs_superadmin_all" ON public.subscription_notification_logs;
CREATE POLICY "subscription_notification_logs_superadmin_all"
ON public.subscription_notification_logs
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- subscription_upgrade_requests
ALTER TABLE public.subscription_upgrade_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_upgrade_requests_superadmin_all" ON public.subscription_upgrade_requests;
CREATE POLICY "subscription_upgrade_requests_superadmin_all"
ON public.subscription_upgrade_requests
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- user_account_codes
ALTER TABLE public.user_account_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_account_codes_superadmin_all" ON public.user_account_codes;
CREATE POLICY "user_account_codes_superadmin_all"
ON public.user_account_codes
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- whatsapp_lead_events
ALTER TABLE public.whatsapp_lead_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_lead_events_superadmin_all" ON public.whatsapp_lead_events;
CREATE POLICY "whatsapp_lead_events_superadmin_all"
ON public.whatsapp_lead_events
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- whatsapp_leads
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_leads_superadmin_all" ON public.whatsapp_leads;
CREATE POLICY "whatsapp_leads_superadmin_all"
ON public.whatsapp_leads
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- ---------------------------------------------------------------------------
-- subscription_plans: public read, superadmin write
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_superadmin_manage" ON public.subscription_plans;

CREATE POLICY "subscription_plans_public_read"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "subscription_plans_superadmin_manage"
ON public.subscription_plans
FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());
