-- ==============================================================================
-- Production Hardening, Webhook Idempotency, and Check-in Atomic Procedures
-- Migration Date: 2026-09-13
-- ==============================================================================

-- 1. Webhook Events Table (Authorize.Net and Provider Webhook Idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'authorizenet',
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON public.webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON public.webhook_events(event_type);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_superadmin_policy" ON public.webhook_events
  FOR ALL USING (public.is_super_admin());

-- 2. Atomic Membership Visit Decrement Procedure
CREATE OR REPLACE FUNCTION public.decrement_membership_visits(
  p_membership_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  UPDATE public.member_memberships
  SET remaining_visits = remaining_visits - 1,
      updated_at = now()
  WHERE id = p_membership_id
    AND remaining_visits > 0
  RETURNING remaining_visits INTO v_remaining;

  IF NOT FOUND THEN
    RETURN -1; -- No remaining visits or invalid membership
  END IF;

  RETURN v_remaining;
END;
$$;

-- 3. Atomic Unified Check-in Procedure
CREATE OR REPLACE FUNCTION public.process_gym_checkin(
  p_gym_id UUID,
  p_member_id UUID,
  p_membership_id UUID,
  p_method TEXT,
  p_door_id TEXT DEFAULT NULL,
  p_is_visit_based BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  checkin_id UUID,
  remaining_visits INTEGER,
  checked_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_visits INTEGER := NULL;
  v_checkin_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- If visit-based plan, atomically decrement visits
  IF p_is_visit_based AND p_membership_id IS NOT NULL THEN
    UPDATE public.member_memberships
    SET remaining_visits = remaining_visits - 1,
        updated_at = v_now
    WHERE id = p_membership_id
      AND remaining_visits > 0
    RETURNING member_memberships.remaining_visits INTO v_new_visits;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'VISIT_LIMIT_EXCEEDED';
    END IF;
  END IF;

  -- Create check-in record
  INSERT INTO public.checkins (
    gym_id,
    member_id,
    membership_id,
    method,
    door_id,
    checked_in_at
  )
  VALUES (
    p_gym_id,
    p_member_id,
    p_membership_id,
    p_method,
    p_door_id,
    v_now
  )
  RETURNING id INTO v_checkin_id;

  RETURN QUERY SELECT v_checkin_id, v_new_visits, v_now;
END;
$$;

-- 4. HARDEN ROW LEVEL SECURITY (RLS) POLICIES
-- Drop potentially insecure or unrestricted policies
DROP POLICY IF EXISTS "gyms_select_policy" ON public.gyms;
CREATE POLICY "gyms_select_policy" ON public.gyms
  FOR SELECT USING (
    id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "products_select_policy" ON public.products;
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "waivers_select_policy" ON public.waivers;
CREATE POLICY "waivers_select_policy" ON public.waivers
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "signed_waivers_insert_policy" ON public.signed_waivers;
CREATE POLICY "signed_waivers_insert_policy" ON public.signed_waivers
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR member_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "signup_submissions_insert_policy" ON public.signup_submissions;
CREATE POLICY "signup_submissions_insert_policy" ON public.signup_submissions
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR member_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "checkins_insert_policy" ON public.checkins;
CREATE POLICY "checkins_insert_policy" ON public.checkins
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "members_modify_policy" ON public.members;
CREATE POLICY "members_update_policy" ON public.members
  FOR UPDATE USING (
    id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "members_insert_policy" ON public.members
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "members_delete_policy" ON public.members
  FOR DELETE USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );
