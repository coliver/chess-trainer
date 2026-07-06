create table if not exists openings (
  id bigserial primary key,
  eco text not null,
  name text not null,
  epd text null,

  -- keep the source fields, useful for display
  pgn text null,
  uci_moves text null,

  created_at timestamptz not null default now(),

  -- avoid duplicates across multiple imports
  unique (eco, name)
);

create index if not exists openings_eco_idx on openings (eco);
