-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: Transactions
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  date date not null,
  payment_method text,
  description text,
  installment_current int,
  installment_total int,
  parent_transaction_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: Investments
create table if not exists investments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  ticker text not null,
  category text not null,
  purchase_date date,
  total_invested numeric default 0,
  current_value numeric default 0,
  history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: Goals
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  reason text,
  linked_investment_ids jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: Categories (Config)
create table if not exists category_configs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  config jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table transactions enable row level security;
alter table investments enable row level security;
alter table goals enable row level security;
alter table category_configs enable row level security;

-- Policies (Permissive for Authenticated Users)
create policy "Users can all transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users can all investments" on investments for all using (auth.uid() = user_id);
create policy "Users can all goals" on goals for all using (auth.uid() = user_id);
create policy "Users can all configs" on category_configs for all using (auth.uid() = user_id);