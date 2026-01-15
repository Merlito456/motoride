
# MotoRide Supabase Schema Setup

Run the following SQL in your Supabase SQL Editor to set up the motorcycle ride-hailing system.

```sql
-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
create type user_role as enum ('passenger', 'rider', 'admin');
create type ride_status as enum ('pending', 'matched', 'accepted', 'arrived', 'started', 'completed', 'cancelled');
create type alert_severity as enum ('high', 'medium', 'low');

-- 3. TABLES

-- Profiles Table (Extends Auth Users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text not null,
  phone text,
  user_type user_role not null default 'passenger',
  balance decimal(12,2) default 0.00,
  is_active boolean default true,
  is_flagged boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rider Details (Specific to Riders)
create table rider_details (
  profile_id uuid references profiles(id) on delete cascade primary key,
  license_number text not null,
  gov_id text not null,
  vehicle_brand text not null,
  vehicle_model text not null,
  plate_number text not null,
  vehicle_type text default 'motorcycle',
  rating decimal(3,2) default 5.0,
  total_rides int default 0,
  is_online boolean default false,
  is_available boolean default true,
  lat float,
  lng float
);

-- Rides Table
create table rides (
  id uuid default uuid_generate_v4() primary key,
  passenger_id uuid references profiles(id) not null,
  rider_id uuid references profiles(id),
  pickup_lat float not null,
  pickup_lng float not null,
  pickup_name text not null,
  dest_lat float not null,
  dest_lng float not null,
  dest_name text not null,
  distance float not null,
  base_fare decimal(12,2) not null,
  admin_fee decimal(12,2) default 5.00,
  total_fare decimal(12,2) not null,
  status ride_status default 'pending',
  bidding_enabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bids Table
create table bids (
  id uuid default uuid_generate_v4() primary key,
  ride_id uuid references rides(id) on delete cascade not null,
  rider_id uuid references profiles(id) not null,
  amount decimal(12,2) not null,
  status text default 'pending', -- 'pending', 'accepted', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions Table
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  type text not null, -- 'ride_payment', 'load_topup', 'admin_fee'
  amount decimal(12,2) not null,
  balance_before decimal(12,2),
  balance_after decimal(12,2),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Load Requests
create table load_requests (
  id uuid default uuid_generate_v4() primary key,
  rider_id uuid references profiles(id) not null,
  amount decimal(12,2) not null,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Saved Locations
create table saved_locations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  label text not null,
  icon_type text default 'other',
  lat float not null,
  lng float not null,
  place_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Emergency Alerts
create table emergency_alerts (
  id uuid default uuid_generate_v4() primary key,
  message text not null,
  severity alert_severity default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RLS (Row Level Security) - Simplified for prototype
alter table profiles enable row level security;
alter table rides enable row level security;
alter table bids enable row level security;
alter table transactions enable row level security;
alter table load_requests enable row level security;
alter table saved_locations enable row level security;
alter table emergency_alerts enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
create policy "Rides are viewable by everyone." on rides for select using (true);
create policy "Riders/Passengers can update rides." on rides for update using (true);
create policy "Everyone can view alerts." on emergency_alerts for select using (true);

-- 5. INITIAL ADMIN DATA (Optional - requires manual Auth user creation for rabanes1994)
-- Since we cannot create auth.users via simple SQL without pg_net, 
-- we will handle the admin check in the frontend code for this specific username.
```
