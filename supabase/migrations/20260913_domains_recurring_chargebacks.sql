-- Migration: 20260913_domains_recurring_chargebacks.sql
-- Description: Custom domains, recurring class occurrences, overdue payments, and chargeback tracking

-- 1. DOMAINS TABLE FOR CUSTOM DOMAIN PROVISIONING & DNS VERIFICATION
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  subdomain TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verifying', 'verified', 'failed', 'disabled')),
  verification_token TEXT NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'txt' CHECK (verification_type IN ('txt', 'cname')),
  dns_instructions JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_gym_id ON public.domains(gym_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON public.domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_status ON public.domains(verification_status);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gym staff can view their own domains" ON public.domains;
CREATE POLICY "Gym staff can view their own domains"
  ON public.domains FOR SELECT
  USING (
    gym_id IN (
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Gym admins can manage their own domains" ON public.domains;
CREATE POLICY "Gym admins can manage their own domains"
  ON public.domains FOR ALL
  USING (
    gym_id IN (
      SELECT gym_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'super_admin')
    )
  );

-- 2. ENHANCE CLASSES TABLE FOR TRUE RECURRENCE OCCURRENCES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'recurrence_series_id') THEN
    ALTER TABLE public.classes ADD COLUMN recurrence_series_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'parent_class_id') THEN
    ALTER TABLE public.classes ADD COLUMN parent_class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'occurrence_number') THEN
    ALTER TABLE public.classes ADD COLUMN occurrence_number INTEGER DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classes_series_id ON public.classes(recurrence_series_id);
CREATE INDEX IF NOT EXISTS idx_classes_parent_id ON public.classes(parent_class_id);

-- 3. ENHANCE PAYMENTS TABLE FOR OUTSTANDING / OVERDUE TRACKING
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'due_at') THEN
    ALTER TABLE public.payments ADD COLUMN due_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'amount_due') THEN
    ALTER TABLE public.payments ADD COLUMN amount_due NUMERIC(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'amount_paid') THEN
    ALTER TABLE public.payments ADD COLUMN amount_paid NUMERIC(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'outstanding_amount') THEN
    ALTER TABLE public.payments ADD COLUMN outstanding_amount NUMERIC(10, 2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_due_at ON public.payments(due_at);
CREATE INDEX IF NOT EXISTS idx_payments_status_due ON public.payments(status, due_at);

-- 4. CHARGEBACKS / DISPUTES TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  authorize_net_transaction_id TEXT,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'under_review', 'won', 'lost', 'closed')),
  reason TEXT,
  provider_reference TEXT,
  dispute_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chargebacks_gym_id ON public.chargebacks(gym_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_member_id ON public.chargebacks(member_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_payment_id ON public.chargebacks(payment_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_status ON public.chargebacks(status);

ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gym staff can view their gym chargebacks" ON public.chargebacks;
CREATE POLICY "Gym staff can view their gym chargebacks"
  ON public.chargebacks FOR SELECT
  USING (
    gym_id IN (
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Gym admins can manage chargebacks" ON public.chargebacks;
CREATE POLICY "Gym admins can manage chargebacks"
  ON public.chargebacks FOR ALL
  USING (
    gym_id IN (
      SELECT gym_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'super_admin')
    )
  );
