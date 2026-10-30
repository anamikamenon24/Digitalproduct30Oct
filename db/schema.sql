-- Pixelora schema. Safe to run repeatedly: every object is created only if it doesn't exist.
-- Money is stored as integer cents everywhere so there is never a rounding half-cent.

create table if not exists users (
  id            integer generated always as identity primary key,
  email         text not null unique check (email = lower(email)),
  password_hash text not null,
  full_name     text not null,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create table if not exists categories (
  id   integer generated always as identity primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists products (
  id                integer generated always as identity primary key,
  category_id       integer not null references categories(id) on delete restrict,
  title             text not null,
  slug              text not null unique,
  short_description text not null,
  description       text not null,
  price_cents       integer not null check (price_cents > 0),
  cover_url         text,
  file_path         text not null,
  file_format       text not null,
  file_size_mb      numeric(10, 2) not null check (file_size_mb >= 0),
  is_featured       boolean not null default false,
  created_at        timestamptz not null default now(),
  -- Extra fields the existing design needs (generated cover art, creator name, "What's included" list).
  creator           text not null default 'Pixelora Studio',
  includes          jsonb not null default '[]'::jsonb,
  cover_style       jsonb not null default '{}'::jsonb
);
create index if not exists products_category_idx on products (category_id);
create index if not exists products_featured_idx on products (is_featured) where is_featured;

create table if not exists reviews (
  id            integer generated always as identity primary key,
  product_id    integer not null references products(id) on delete cascade,
  -- Seeded sample reviews have no account (user_id null) and use reviewer_name instead.
  user_id       integer references users(id) on delete cascade,
  reviewer_name text not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists reviews_product_idx on reviews (product_id);
-- One review per buyer per product (multiple NULL user_ids are allowed for seeded reviews).
create unique index if not exists reviews_one_per_user on reviews (product_id, user_id);

create table if not exists discount_codes (
  id          integer generated always as identity primary key,
  code        text not null unique check (code = upper(code)),
  percent_off integer not null check (percent_off between 1 and 100),
  active      boolean not null default true
);

create table if not exists orders (
  id                integer generated always as identity primary key,
  user_id           integer not null references users(id) on delete cascade,
  order_number      text not null unique,
  status            text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  subtotal_cents    integer not null check (subtotal_cents >= 0),
  discount_cents    integer not null default 0 check (discount_cents >= 0),
  total_cents       integer not null check (total_cents >= 0),
  discount_code     text,
  stripe_session_id text unique,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  check (discount_cents <= subtotal_cents),
  check (total_cents = subtotal_cents - discount_cents)
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);

create table if not exists order_items (
  id          integer generated always as identity primary key,
  order_id    integer not null references orders(id) on delete cascade,
  product_id  integer not null references products(id) on delete restrict,
  price_cents integer not null check (price_cents > 0),
  quantity    integer not null default 1 check (quantity between 1 and 10)
);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_product_idx on order_items (product_id);

create table if not exists newsletter_subscribers (
  id         integer generated always as identity primary key,
  email      text not null unique check (email = lower(email)),
  created_at timestamptz not null default now()
);
