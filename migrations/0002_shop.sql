create table product (
  id text primary key,
  name text not null,
  priceCents integer not null,
  blurb text not null
);
create table cart_item (
  userId text not null references "user"(id) on delete cascade,
  productId text not null references product(id),
  qty integer not null check (qty > 0),
  updatedAt integer not null,
  primary key (userId, productId)
);
create table "order" (
  id text primary key,
  userId text not null references "user"(id),
  stripeSessionId text not null unique,
  amountCents integer not null,
  status text not null,
  createdAt integer not null
);
create table order_item (
  orderId text not null references "order"(id) on delete cascade,
  productId text not null references product(id),
  qty integer not null,
  priceCents integer not null
);
create table upload (
  key text primary key,
  userId text not null references "user"(id) on delete cascade,
  name text not null,
  size integer not null,
  type text not null,
  createdAt integer not null
);
