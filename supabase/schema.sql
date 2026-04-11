-- =============================================
-- GuideHub: Database Schema
-- Target: Supabase (PostgreSQL 15+)
-- =============================================

-- 1. USERS (extends auth.users)
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  username text not null unique,
  avatar_url text,
  bio text,
  social_links jsonb not null default '{}',
  is_self_employed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles linked to Supabase auth.users';

-- 2. GUIDES
-- =============================================
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  slug text not null,
  cover_image text,
  accent_color text not null default '#6366f1',
  template text not null default 'minimal',
  price numeric(10,2) not null default 0,
  show_preview boolean not null default true,
  preview_sections text[] not null default '{}',
  is_course boolean not null default false,
  status text not null default 'draft',
  views int not null default 0,
  sales int not null default 0,
  revenue numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique(author_id, slug)
);

comment on table public.guides is 'Published or draft guides created by authors';

create index if not exists idx_guides_author_id on public.guides(author_id);
create index if not exists idx_guides_status on public.guides(status);
create index if not exists idx_guides_slug on public.guides(slug);

-- 3. GUIDE SECTIONS
-- =============================================
create table if not exists public.guide_sections (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  title text not null default '',
  content jsonb not null default '{}',
  section_order int not null default 0,
  hidden_until_payment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guide_sections is 'Content sections within a guide (headings, paragraphs, media, etc.)';

create index if not exists idx_sections_guide_id on public.guide_sections(guide_id);

-- 4. ORDERS
-- =============================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  buyer_email text not null,
  buyer_name text,
  amount numeric(10,2) not null,
  currency text not null default 'RUB',
  status text not null default 'pending',
  payment_method text not null default 'card',
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orders is 'Purchase records for guides';

create index if not exists idx_orders_guide_id on public.orders(guide_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_buyer_email on public.orders(buyer_email);

-- 5. ANALYTICS EVENTS
-- =============================================
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Page views, checkout starts, purchases for conversion tracking';

create index if not exists idx_analytics_guide_id on public.analytics_events(guide_id);
create index if not exists idx_analytics_type on public.analytics_events(event_type);
create index if not exists idx_analytics_created on public.analytics_events(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

enable row level security on public.profiles;
enable row level security on public.guides;
enable row level security on public.guide_sections;
enable row level security on public.orders;
enable row level security on public.analytics_events;

-- PROFILES RLS
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- GUIDES RLS
create policy "Published guides are viewable by everyone"
  on public.guides for select
  using (status = 'published');

create policy "Authors can view their own guides"
  on public.guides for select
  using (auth.uid() = author_id);

create policy "Authors can insert own guides"
  on public.guides for insert
  with check (auth.uid() = author_id);

create policy "Authors can update own guides"
  on public.guides for update
  using (auth.uid() = author_id);

create policy "Authors can delete own guides"
  on public.guides for delete
  using (auth.uid() = author_id);

-- GUIDE SECTIONS RLS
create policy "Sections are viewable if guide is published or owned by author"
  on public.guide_sections for select
  using (
    exists (
      select 1 from public.guides g
      where g.id = guide_sections.guide_id
      and (g.status = 'published' or g.author_id = auth.uid())
    )
  );

create policy "Authors can manage own guide sections"
  on public.guide_sections for all
  using (
    exists (
      select 1 from public.guides g
      where g.id = guide_sections.guide_id
      and g.author_id = auth.uid()
    )
  );

-- ORDERS RLS
create policy "Authors can view orders for their guides"
  on public.orders for select
  using (
    exists (
      select 1 from public.guides g
      where g.id = orders.guide_id
      and g.author_id = auth.uid()
    )
  );

create policy "Anyone can insert orders (checkout)"
  on public.orders for insert
  with check (true);

create policy "Authors can update orders for their guides"
  on public.orders for update
  using (
    exists (
      select 1 from public.guides g
      where g.id = orders.guide_id
      and g.author_id = auth.uid()
    )
  );

-- ANALYTICS RLS
create policy "Analytics are insertable by anyone (page view tracking)"
  on public.analytics_events for insert
  with check (true);

create policy "Authors can view analytics for their guides"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.guides g
      where g.id = analytics_events.guide_id
      and g.author_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g')))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at_guides
  before update on public.guides
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at_sections
  before update on public.guide_sections
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row
  execute function public.handle_updated_at();

-- =============================================
-- STORAGE BUCKETS (for covers, images)
-- =============================================

-- Create storage bucket for guide assets
insert into storage.buckets (id, name, public)
values ('guide-assets', 'guide-assets', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload guide assets"
  on storage.objects for insert
  with check (
    bucket_id = 'guide-assets'
    and auth.role() = 'authenticated'
  );

-- Public can view guide assets
create policy "Anyone can view guide assets"
  on storage.objects for select
  using (bucket_id = 'guide-assets');

-- Users can update/delete their own assets
create policy "Users can update own guide assets"
  on storage.objects for update
  using (
    bucket_id = 'guide-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own guide assets"
  on storage.objects for delete
  using (
    bucket_id = 'guide-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Increment guide views
create or replace function public.increment_guide_view(p_guide_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.guides
  set views = views + 1,
      updated_at = now()
  where id = p_guide_id;
end;
$$;

-- Record a completed sale
create or replace function public.record_guide_sale(
  p_guide_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update public.guides
  set sales = sales + 1,
      revenue = revenue + p_amount,
      updated_at = now()
  where id = p_guide_id;
end;
$$;

-- Check if a user has purchased a guide
create or replace function public.has_purchased_guide(
  p_guide_id uuid,
  p_buyer_email text
)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.orders
    where guide_id = p_guide_id
    and buyer_email = p_buyer_email
    and status = 'paid'
  );
$$;
