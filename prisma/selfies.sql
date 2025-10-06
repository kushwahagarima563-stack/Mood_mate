-- Create selfies table
create table if not exists public.selfies (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  image_url text not null,
  emotion text not null check (emotion in ('happy','sad','angry','surprised','neutral')),
  date timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.selfies enable row level security;

-- Policies (adjust to your auth model)
-- For demo: allow read to everyone
create policy if not exists "Selfies are viewable by everyone"
  on public.selfies for select
  using (true);

-- Insert/update/delete: only service role (your API uses service role key)
-- In Supabase, service role bypasses RLS. No explicit policy needed.

-- Storage bucket (create via Dashboard or SQL)
-- In Supabase Dashboard > Storage, create a bucket named "selfies" and set it to public.
-- If you prefer SQL:
-- select storage.create_bucket('selfies', public => true);

-- Optional: Add index for faster ordering
create index if not exists selfies_date_idx on public.selfies (date desc);
