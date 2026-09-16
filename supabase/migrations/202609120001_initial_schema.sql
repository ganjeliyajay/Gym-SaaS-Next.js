-- ==============================================================================
-- Comprehensive Gym SaaS Database Migration
-- Multi-tenant schema with full entity persistence and Row Level Security (RLS)
-- ==============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. GYMS TABLE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add slug column to gyms if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gyms' AND column_name = 'slug') THEN
    ALTER TABLE public.gyms ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'trainer', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MEMBERS TABLE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  profile_image_url TEXT,
  authorize_net_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'canceled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'authorize_net_customer_id') THEN
    ALTER TABLE public.members ADD COLUMN authorize_net_customer_id TEXT;
  END IF;
END $$;

-- 5. TEAM INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'trainer')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PRODUCTS TABLE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('recurring', 'one-time')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'quarterly', 'yearly')),
  access_type TEXT NOT NULL CHECK (access_type IN ('full', 'visits', 'none')),
  visit_limit INTEGER,
  class_access TEXT NOT NULL CHECK (class_access IN ('all', 'selected', 'none')),
  selected_classes JSONB DEFAULT '[]'::jsonb,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('ongoing', 'limited', 'periodic')),
  duration_value INTEGER,
  duration_unit TEXT,
  period_start_date DATE,
  period_end_date DATE,
  classes_per_period INTEGER,
  period_unit TEXT CHECK (period_unit IN ('week', 'month', 'year') OR period_unit IS NULL),
  discount_enabled BOOLEAN NOT NULL DEFAULT false,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'period_start_date') THEN
    ALTER TABLE public.products ADD COLUMN period_start_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'period_end_date') THEN
    ALTER TABLE public.products ADD COLUMN period_end_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'classes_per_period') THEN
    ALTER TABLE public.products ADD COLUMN classes_per_period INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'period_unit') THEN
    ALTER TABLE public.products ADD COLUMN period_unit TEXT;
  END IF;
END $$;

-- 7. MEMBER MEMBERSHIPS / SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.member_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired', 'suspended')),
  price_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_applied NUMERIC(10, 2) DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  remaining_visits INTEGER,
  classes_used_this_period INTEGER NOT NULL DEFAULT 0,
  period_start_date TIMESTAMPTZ DEFAULT now(),
  period_end_date TIMESTAMPTZ,
  authorize_net_customer_id TEXT,
  authorize_net_subscription_id TEXT,
  authorize_net_transaction_id TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PAYMENTS & AUTHORIZE.NET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed', 'declined', 'refunded')),
  authorize_net_transaction_id TEXT,
  authorize_net_customer_id TEXT,
  authorize_net_subscription_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  failure_reason TEXT,
  refund_amount NUMERIC(10, 2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'membership_id') THEN
    ALTER TABLE public.payments ADD COLUMN membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 9. CLASSES & RECURRING CLASSES
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  room TEXT,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone TEXT DEFAULT 'UTC',
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  recurring BOOLEAN NOT NULL DEFAULT false,
  repeat_rule TEXT,
  repeat_days JSONB DEFAULT '[]'::jsonb,
  recurring_end_date DATE,
  occurrences INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. CLASS BOOKINGS
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'no_show', 'cancelled')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_member_class UNIQUE(class_id, member_id, status)
);

-- 11. CHECKINS
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN ('manual', 'qr', 'gym_door')),
  door_id TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checkins' AND column_name = 'membership_id') THEN
    ALTER TABLE public.checkins ADD COLUMN membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checkins' AND column_name = 'door_id') THEN
    ALTER TABLE public.checkins ADD COLUMN door_id TEXT;
  END IF;
END $$;

-- 12. WAIVERS TABLE
CREATE TABLE IF NOT EXISTS public.waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. SIGNUP FORMS
CREATE TABLE IF NOT EXISTS public.signup_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  selected_products JSONB DEFAULT '[]'::jsonb,
  customer_fields JSONB DEFAULT '[]'::jsonb,
  waiver JSONB,
  waiver_id UUID REFERENCES public.waivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. SIGNUP SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.signup_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_form_id UUID REFERENCES public.signup_forms(id) ON DELETE SET NULL,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  customer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_product TEXT,
  waiver_accepted BOOLEAN NOT NULL DEFAULT false,
  waiver_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. SIGNED WAIVERS IMMUTABLE SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.signed_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  waiver_id UUID REFERENCES public.waivers(id) ON DELETE SET NULL,
  signup_submission_id UUID REFERENCES public.signup_submissions(id) ON DELETE SET NULL,
  waiver_name TEXT NOT NULL,
  resolved_content TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_data TEXT,
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. GYM SETTINGS & BRANDING
CREATE TABLE IF NOT EXISTS public.gym_settings (
  gym_id UUID PRIMARY KEY REFERENCES public.gyms(id) ON DELETE CASCADE,
  business_type TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  time_format TEXT DEFAULT '12h',
  business_hours JSONB,
  allow_online_booking BOOLEAN DEFAULT true,
  allow_same_day_booking BOOLEAN DEFAULT true,
  allow_class_cancellation BOOLEAN DEFAULT true,
  allow_waitlist BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gym_branding (
  gym_id UUID PRIMARY KEY REFERENCES public.gyms(id) ON DELETE CASCADE,
  brand_name TEXT,
  primary_color TEXT DEFAULT '#0f172a',
  secondary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#10b981',
  custom_domain TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  message TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. NOTIFICATION SETTINGS & LOGS
CREATE TABLE IF NOT EXISTS public.notification_settings (
  gym_id UUID PRIMARY KEY REFERENCES public.gyms(id) ON DELETE CASCADE,
  email BOOLEAN DEFAULT true,
  sms BOOLEAN DEFAULT true,
  in_app BOOLEAN DEFAULT true,
  new_member BOOLEAN DEFAULT true,
  class_booking BOOLEAN DEFAULT true,
  class_reminder BOOLEAN DEFAULT true,
  membership_renewal BOOLEAN DEFAULT true,
  payment_failed BOOLEAN DEFAULT true,
  membership_expired BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  weekly_summary BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '07:00',
  retry_failed_messages BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  recipient TEXT,
  title TEXT,
  subject TEXT,
  content TEXT,
  type TEXT CHECK (type IN ('email', 'sms', 'in_app')),
  audience TEXT,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. MEMBER NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.member_notification_preferences (
  member_id UUID PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  email_reminders BOOLEAN NOT NULL DEFAULT true,
  sms_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. AUDIT & IMPERSONATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE & MULTI-TENANT ISOLATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_gym_role ON public.profiles(gym_id, role);
CREATE INDEX IF NOT EXISTS idx_members_gym ON public.members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_auth_customer ON public.members(authorize_net_customer_id);
CREATE INDEX IF NOT EXISTS idx_products_gym_active ON public.products(gym_id, active);
CREATE INDEX IF NOT EXISTS idx_memberships_member_status ON public.member_memberships(member_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_gym ON public.member_memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_member ON public.payments(gym_id, member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_classes_gym_start ON public.classes(gym_id, start_at);
CREATE INDEX IF NOT EXISTS idx_class_bookings_class ON public.class_bookings(class_id, status);
CREATE INDEX IF NOT EXISTS idx_class_bookings_member ON public.class_bookings(member_id, status);
CREATE INDEX IF NOT EXISTS idx_checkins_member ON public.checkins(member_id, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_checkins_gym_date ON public.checkins(gym_id, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_signup_forms_slug ON public.signup_forms(slug);
CREATE INDEX IF NOT EXISTS idx_signed_waivers_member ON public.signed_waivers(member_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_gym ON public.team_invitations(gym_id, status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security function: get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper security function: get current user gym_id
CREATE OR REPLACE FUNCTION public.current_user_gym_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT gym_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper function: is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- Drop previous policies to avoid duplicates on re-run
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- PROFILES POLICIES
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() = 'admin')
    OR public.is_super_admin()
  );

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() = 'admin' AND id <> auth.uid())
    OR public.is_super_admin()
  );

-- GYMS POLICIES
CREATE POLICY "gyms_select_policy" ON public.gyms
  FOR SELECT USING (
    id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "gyms_update_policy" ON public.gyms
  FOR UPDATE USING (
    (id = public.current_user_gym_id() AND public.current_user_role() IN ('admin'))
    OR public.is_super_admin()
  );

-- MEMBERS POLICIES
CREATE POLICY "members_select_policy" ON public.members
  FOR SELECT USING (
    id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR public.is_super_admin()
  );

CREATE POLICY "members_modify_policy" ON public.members
  FOR ALL USING (
    id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- PRODUCTS POLICIES
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "products_modify_policy" ON public.products
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- MEMBER MEMBERSHIPS POLICIES
CREATE POLICY "memberships_select_policy" ON public.member_memberships
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR public.is_super_admin()
  );

CREATE POLICY "memberships_modify_policy" ON public.member_memberships
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- PAYMENTS POLICIES
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "payments_modify_policy" ON public.payments
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- CLASSES POLICIES
CREATE POLICY "classes_select_policy" ON public.classes
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "classes_modify_policy" ON public.classes
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() = 'trainer' AND trainer_id = auth.uid())
    OR public.is_super_admin()
  );

-- CLASS BOOKINGS POLICIES
CREATE POLICY "bookings_select_policy" ON public.class_bookings
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR public.is_super_admin()
  );

CREATE POLICY "bookings_insert_policy" ON public.class_bookings
  FOR INSERT WITH CHECK (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "bookings_update_policy" ON public.class_bookings
  FOR UPDATE USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR public.is_super_admin()
  );

CREATE POLICY "bookings_delete_policy" ON public.class_bookings
  FOR DELETE USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- CHECKINS POLICIES
CREATE POLICY "checkins_select_policy" ON public.checkins
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR public.is_super_admin()
  );

CREATE POLICY "checkins_insert_policy" ON public.checkins
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager', 'trainer'))
    OR member_id = auth.uid()
    OR public.is_super_admin()
  );

-- SIGNUP FORMS POLICIES
CREATE POLICY "signup_forms_select_policy" ON public.signup_forms
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "signup_forms_modify_policy" ON public.signup_forms
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- SIGNUP SUBMISSIONS POLICIES
CREATE POLICY "signup_submissions_insert_policy" ON public.signup_submissions
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR member_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "signup_submissions_select_policy" ON public.signup_submissions
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "signup_submissions_modify_policy" ON public.signup_submissions
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- WAIVERS & SIGNED WAIVERS POLICIES
CREATE POLICY "waivers_select_policy" ON public.waivers
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "waivers_modify_policy" ON public.waivers
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- SIGNED WAIVERS POLICIES
CREATE POLICY "signed_waivers_select_policy" ON public.signed_waivers
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "signed_waivers_insert_policy" ON public.signed_waivers
  FOR INSERT WITH CHECK (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- TEAM INVITATIONS POLICIES
CREATE POLICY "team_invitations_select_policy" ON public.team_invitations
  FOR SELECT USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() = 'admin')
    OR public.is_super_admin()
  );

CREATE POLICY "team_invitations_modify_policy" ON public.team_invitations
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() = 'admin')
    OR public.is_super_admin()
  );

-- SETTINGS & BRANDING POLICIES
CREATE POLICY "gym_settings_policy" ON public.gym_settings
  FOR ALL USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "gym_branding_select_policy" ON public.gym_branding
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

CREATE POLICY "gym_branding_modify_policy" ON public.gym_branding
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin'))
    OR public.is_super_admin()
  );

-- NOTIFICATIONS POLICIES
CREATE POLICY "notification_templates_policy" ON public.notification_templates
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "notification_settings_policy" ON public.notification_settings
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "notification_logs_policy" ON public.notification_logs
  FOR ALL USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "member_notif_prefs_select_policy" ON public.member_notification_preferences
  FOR SELECT USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

CREATE POLICY "member_notif_prefs_modify_policy" ON public.member_notification_preferences
  FOR ALL USING (
    member_id = auth.uid()
    OR (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- AUDIT LOGS POLICIES
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() = 'admin')
    OR public.is_super_admin()
  );

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

-- ============================================================================== 
-- SAAS PLATFORM BILLING TABLES
-- These tables power the Gym SaaS owner subscription page.
-- Member payments are processed server-side through the configured payment gateway.
-- ============================================================================== 

CREATE TABLE IF NOT EXISTS public.saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (yearly_price >= 0),
  popular BOOLEAN NOT NULL DEFAULT false,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gym_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL UNIQUE REFERENCES public.gyms(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  next_billing_date DATE,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  payment_method_expiry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gym_subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.gym_subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'paid', 'open', 'void', 'uncollectible')),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_active_price ON public.saas_plans(active, monthly_price);
CREATE INDEX IF NOT EXISTS idx_gym_subscriptions_gym ON public.gym_subscriptions(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_subscription_invoices_gym_date ON public.gym_subscription_invoices(gym_id, invoice_date DESC);

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saas_plans_select_policy" ON public.saas_plans;
CREATE POLICY "saas_plans_select_policy" ON public.saas_plans
  FOR SELECT USING (active = true OR public.is_super_admin());

DROP POLICY IF EXISTS "saas_plans_superadmin_modify_policy" ON public.saas_plans;
CREATE POLICY "saas_plans_superadmin_modify_policy" ON public.saas_plans
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "gym_subscriptions_select_policy" ON public.gym_subscriptions;
CREATE POLICY "gym_subscriptions_select_policy" ON public.gym_subscriptions
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "gym_subscriptions_modify_policy" ON public.gym_subscriptions;
CREATE POLICY "gym_subscriptions_modify_policy" ON public.gym_subscriptions
  FOR UPDATE USING (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  ) WITH CHECK (
    (gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('admin', 'manager'))
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "gym_subscription_invoices_select_policy" ON public.gym_subscription_invoices;
CREATE POLICY "gym_subscription_invoices_select_policy" ON public.gym_subscription_invoices
  FOR SELECT USING (
    gym_id = public.current_user_gym_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "gym_subscription_invoices_superadmin_modify_policy" ON public.gym_subscription_invoices;
CREATE POLICY "gym_subscription_invoices_superadmin_modify_policy" ON public.gym_subscription_invoices
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Default platform plans for a fresh deployment.
INSERT INTO public.saas_plans (name, description, monthly_price, yearly_price, popular, features)
VALUES
  ('Starter', 'Everything you need to run a single gym.', 49, 490, false,
    '["Dashboard", "Member management", "Class scheduling", "Check-ins"]'::jsonb),
  ('Professional', 'Advanced tools for growing gyms.', 99, 990, true,
    '["Everything in Starter", "Billing & reports", "Team management", "Notifications"]'::jsonb),
  ('Enterprise', 'Advanced controls for larger operations.', 199, 1990, false,
    '["Everything in Professional", "Custom domains", "Advanced access control", "Priority support"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  popular = EXCLUDED.popular,
  features = EXCLUDED.features,
  active = true,
  updated_at = now();

-- Gym registration helper. It creates the tenant and a default SaaS subscription.
CREATE OR REPLACE FUNCTION public.create_gym(
  gym_name TEXT,
  gym_email TEXT
)
RETURNS public.gyms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gym public.gyms;
  starter_plan UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(trim(gym_name), '') IS NULL THEN
    RAISE EXCEPTION 'Gym name is required';
  END IF;

  INSERT INTO public.gyms (name, email)
  VALUES (trim(gym_name), NULLIF(trim(gym_email), ''))
  RETURNING * INTO new_gym;

  SELECT id INTO starter_plan
  FROM public.saas_plans
  WHERE name = 'Starter' AND active = true
  LIMIT 1;

  IF starter_plan IS NOT NULL THEN
    INSERT INTO public.gym_subscriptions (
      gym_id, plan_id, billing_cycle, status, next_billing_date
    )
    VALUES (
      new_gym.id, starter_plan, 'monthly', 'active', CURRENT_DATE + 30
    );
  END IF;

  RETURN new_gym;
END;
$$;

REVOKE ALL ON FUNCTION public.create_gym(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_gym(TEXT, TEXT) TO authenticated;
