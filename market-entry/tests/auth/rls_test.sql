create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
insert into auth.users(id,email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@x'),('bbbbbbbb-0000-0000-0000-000000000002','b@x');
\i schema.sql
