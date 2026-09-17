alter table plu_private.users
  add column is_system_admin boolean not null default false;

create unique index one_system_admin
  on plu_private.users (is_system_admin)
  where is_system_admin;
