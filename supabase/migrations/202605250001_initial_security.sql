create extension if not exists pg_trgm;

create table if not exists public.allowed_users (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.allowed_users (email)
values ('ltrlambrecht@gmail.com')
on conflict (email) do nothing;

alter table public.allowed_users enable row level security;

create policy "allowed users can read themselves"
on public.allowed_users
for select
to authenticated
using (email = auth.jwt() ->> 'email');

create table if not exists public.custom_clients (
  id bigint generated always as identity primary key,
  holder_name text not null,
  receiver_phone text,
  detail_address text not null,
  city text,
  province text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_clients_holder_name_idx on public.custom_clients using gin (holder_name gin_trgm_ops);
create index if not exists custom_clients_detail_address_idx on public.custom_clients using gin (detail_address gin_trgm_ops);

alter table public.custom_clients enable row level security;

create policy "allowed users can read custom clients"
on public.custom_clients
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "allowed users can insert custom clients"
on public.custom_clients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "allowed users can update custom clients"
on public.custom_clients
for update
to authenticated
using (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "allowed users can delete custom clients"
on public.custom_clients
for delete
to authenticated
using (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);
