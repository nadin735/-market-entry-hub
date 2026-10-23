-- Run once in Supabase: SQL Editor -> paste -> Run.
-- One row per user. analyses = { "gcc": [...], "europe": [...] } (an older plain array is still accepted). Row Level Security: a user can only ever touch their own row.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  analyses   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint analyses_is_json check (jsonb_typeof(analyses) in ('array', 'object')),
  constraint analyses_size check (pg_column_size(analyses) < 2000000)
);

alter table public.user_data enable row level security;
alter table public.user_data force row level security;

drop policy if exists "own select" on public.user_data;
drop policy if exists "own insert" on public.user_data;
drop policy if exists "own update" on public.user_data;
drop policy if exists "own delete" on public.user_data;
create policy "own select" on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "own insert" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "own update" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.user_data for delete to authenticated using (auth.uid() = user_id);

revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- Account deletion: removes the caller's auth user (cascades to user_data).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
