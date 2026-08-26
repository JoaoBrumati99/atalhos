-- ==========================================================================
-- Cadastro de Equipamentos e Periféricos
-- Script idempotente: pode ser executado quantas vezes for necessário
-- no SQL Editor do seu projeto Supabase.
-- ==========================================================================

-- ==========================================================================
-- Tabela: equipamentos
-- ==========================================================================
create table if not exists public.equipamentos (
  id                    uuid primary key default gen_random_uuid(),
  tipo_equipamento      text not null default 'Notebook' check (tipo_equipamento in ('Notebook', 'Desktop', 'Celular', 'Tablet')),
  marca                 text not null,
  modelo                text not null,
  patrimonio            text not null unique,
  numero_serie          text,
  imei                  text,
  setor_responsavel     text not null,
  pessoa_responsavel    text not null,
  email                 text,
  processador           text,
  ram_instalada         numeric,
  slots_ram_livres      integer,
  armazenamento         integer,
  tipo_armazenamento    text,
  placa_video           text,
  sistema_operacional   text,
  versao_windows        text,
  situacao              text not null check (situacao in ('Em uso', 'Disponível', 'Em manutenção', 'Descartado', 'Extraviado', 'Outro')),
  observacoes           text,
  created_at            timestamptz not null default now()
);

-- ---- Migração para bancos criados com a versão anterior do script ----
-- (idempotente: pode rodar em bancos novos ou já existentes sem erro)
alter table public.equipamentos add column if not exists tipo_equipamento text not null default 'Notebook';
alter table public.equipamentos add column if not exists imei text;
alter table public.equipamentos alter column numero_serie drop not null;
alter table public.equipamentos alter column ram_instalada drop not null;
alter table public.equipamentos alter column armazenamento drop not null;
alter table public.equipamentos alter column sistema_operacional drop not null;

alter table public.equipamentos drop constraint if exists equipamentos_tipo_equipamento_check;
alter table public.equipamentos add constraint equipamentos_tipo_equipamento_check
  check (tipo_equipamento in ('Notebook', 'Desktop', 'Celular', 'Tablet'));

alter table public.equipamentos enable row level security;

drop policy if exists "Permitir tudo (uso interno)" on public.equipamentos;

create policy "Permitir tudo (uso interno)"
  on public.equipamentos
  for all
  using (true)
  with check (true);

-- Índice para acelerar a busca por marca/modelo/patrimônio/responsável na tela de consulta.
create index if not exists equipamentos_busca_idx
  on public.equipamentos using gin (
    to_tsvector('portuguese', marca || ' ' || modelo || ' ' || patrimonio || ' ' || pessoa_responsavel)
  );

-- ==========================================================================
-- Tabela: perifericos
-- ==========================================================================
create table if not exists public.perifericos (
  id            uuid primary key default gen_random_uuid(),
  marca         text not null,
  modelo        text not null,
  patrimonio    text not null,
  tipo_cabo     text,
  situacao      text not null check (situacao in ('Em uso', 'Disponível', 'Em manutenção', 'Descartado', 'Extraviado', 'Outro')),
  observacoes   text,
  created_at    timestamptz not null default now()
);

alter table public.perifericos enable row level security;

drop policy if exists "Permitir tudo (uso interno)" on public.perifericos;

create policy "Permitir tudo (uso interno)"
  on public.perifericos
  for all
  using (true)
  with check (true);

create index if not exists perifericos_busca_idx
  on public.perifericos using gin (
    to_tsvector('portuguese', marca || ' ' || modelo || ' ' || patrimonio)
  );
