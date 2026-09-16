-- Waiver management: gym-scoped CRUD policies and indexes.
-- Safe to run after the initial schema migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'signup_forms'
      AND column_name = 'waiver_id'
  ) THEN
    ALTER TABLE public.signup_forms
      ADD COLUMN waiver_id uuid
      REFERENCES public.waivers(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

create table if not exists public.waivers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.waivers enable row level security;

create index if not exists waivers_gym_id_idx
  on public.waivers(gym_id);

create index if not exists waivers_updated_at_idx
  on public.waivers(updated_at desc);

drop policy if exists "waivers_select_own_gym" on public.waivers;
create policy "waivers_select_own_gym"
on public.waivers
for select
to authenticated
using (
  gym_id = (
    select p.gym_id from public.profiles p where p.id = auth.uid()
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

drop policy if exists "waivers_insert_own_gym" on public.waivers;
create policy "waivers_insert_own_gym"
on public.waivers
for insert
to authenticated
with check (
  (
    gym_id = (
      select p.gym_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

drop policy if exists "waivers_update_own_gym" on public.waivers;
create policy "waivers_update_own_gym"
on public.waivers
for update
to authenticated
using (
  (
    gym_id = (
      select p.gym_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
)
with check (
  (
    gym_id = (
      select p.gym_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

drop policy if exists "waivers_delete_own_gym" on public.waivers;
create policy "waivers_delete_own_gym"
on public.waivers
for delete
to authenticated
using (
  (
    gym_id = (
      select p.gym_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);


-- Backfill reusable waiver rows from legacy signup_forms.waiver JSON.
INSERT INTO public.waivers (gym_id, name, content)
SELECT DISTINCT
  sf.gym_id,
  sf.waiver->>'name',
  sf.waiver->>'content'
FROM public.signup_forms sf
WHERE sf.waiver IS NOT NULL
  AND jsonb_typeof(sf.waiver) = 'object'
  AND COALESCE(sf.waiver->>'name', '') <> ''
  AND COALESCE(sf.waiver->>'content', '') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.waivers w
    WHERE w.gym_id = sf.gym_id
      AND w.name = sf.waiver->>'name'
  );

UPDATE public.signup_forms sf
SET waiver_id = w.id
FROM public.waivers w
WHERE sf.waiver_id IS NULL
  AND sf.waiver IS NOT NULL
  AND w.gym_id = sf.gym_id
  AND w.name = sf.waiver->>'name';

CREATE INDEX IF NOT EXISTS signup_forms_waiver_id_idx
  ON public.signup_forms(waiver_id);
