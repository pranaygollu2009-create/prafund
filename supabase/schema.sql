-- Prafund cloud schema — paste this into Supabase → SQL Editor → Run.
--
-- Creates the per-player save used for cross-device progress, plus a helper that
-- lets a signed-in player delete their own account from the browser.

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "players read their own save" on public.saves;
create policy "players read their own save"
  on public.saves for select
  using (auth.uid() = user_id);

drop policy if exists "players write their own save" on public.saves;
create policy "players write their own save"
  on public.saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "players update their own save" on public.saves;
create policy "players update their own save"
  on public.saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "players delete their own save" on public.saves;
create policy "players delete their own save"
  on public.saves for delete
  using (auth.uid() = user_id);

-- Lets the browser delete the caller's own auth user (anon key can't do this
-- directly). Cascades to public.saves through the foreign key above.
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
