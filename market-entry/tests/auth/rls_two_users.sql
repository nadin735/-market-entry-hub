\set A '\'aaaaaaaa-0000-0000-0000-000000000001\''
\set B '\'bbbbbbbb-0000-0000-0000-000000000002\''
\echo '--- A writes own row'
set role authenticated; select set_config('request.jwt.claim.sub', :A, false);
insert into user_data(user_id,analyses) values (:A, '[{"id":1,"company":"A-Corp"}]');
\echo '--- B writes own row, then tries to read/alter/forge A'
select set_config('request.jwt.claim.sub', :B, false);
insert into user_data(user_id,analyses) values (:B, '[{"id":2,"company":"B-Corp"}]');
\echo 'B sees (expect only B row):'
select user_id, analyses from user_data;
\echo 'B update A row (expect UPDATE 0):'
update user_data set analyses='[]' where user_id=:A;
\echo 'B delete A row (expect DELETE 0):'
delete from user_data where user_id=:A;
\echo 'B insert row as A (expect ERROR rls):'
insert into user_data(user_id,analyses) values (:A,'[]') on conflict (user_id) do update set analyses='[]';
\echo '--- anon sees nothing / is refused'
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select count(*) from user_data;
reset role;
\echo '--- A row intact (expect A-Corp):'
select analyses from user_data where user_id=:A;
\echo '--- B deletes own account via RPC; A unaffected'
set role authenticated; select set_config('request.jwt.claim.sub', :B, false);
select delete_my_account();
reset role; select (select count(*) from auth.users) users, (select count(*) from user_data) rows;
\echo '--- unauthenticated RPC (expect error)'
set role authenticated; select set_config('request.jwt.claim.sub','',false); select delete_my_account();
