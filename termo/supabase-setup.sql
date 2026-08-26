-- ==========================================================================
-- Termo de Equipamento - Amalfis
-- Rode este script UMA VEZ no SQL Editor do seu projeto Supabase.
-- ==========================================================================

create table if not exists public.termos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  cpf             text not null,
  tipo            text,
  aparelho        text,
  modelo          text,
  imei            text,
  patrimonio      text,
  email           text,
  celular         text,
  incluidos       text[] default '{}',
  fotos           text[] default '{}',
  data_criacao    text,
  status          text not null default 'ativo' check (status in ('ativo', 'encerrado')),
  data_devolucao  text,
  origem          text,
  created_at      timestamptz not null default now()
);

-- Se a tabela já existia de uma versão anterior sem a coluna "fotos":
alter table public.termos add column if not exists fotos text[] default '{}';

-- Se a tabela já existia de uma versão anterior sem as colunas de contato:
alter table public.termos add column if not exists email text;
alter table public.termos add column if not exists celular text;

-- Habilita Row Level Security (obrigatório para a API funcionar com policies).
alter table public.termos enable row level security;

-- Policy simples liberando leitura e escrita para quem tiver a anon key.
-- Atenção: como o app roda 100% no navegador, a anon key fica visível no
-- código-fonte. Esta policy é adequada para uso interno/confiança entre a
-- equipe. Se quiser restringir por login, troque esta policy por uma que
-- use auth.uid() depois de configurar o Supabase Auth.
create policy "Permitir tudo (uso interno)"
  on public.termos
  for all
  using (true)
  with check (true);

-- Índice para acelerar busca por nome/patrimônio na tela de consulta.
create index if not exists termos_nome_idx on public.termos using gin (to_tsvector('portuguese', nome));

-- ==========================================================================
-- Bucket de armazenamento para as fotos dos equipamentos
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('termos-fotos', 'termos-fotos', true)
on conflict (id) do nothing;

-- Mesma lógica de uso interno: libera upload/leitura/exclusão para quem
-- tiver a anon key. Necessário para o app enviar as fotos direto do navegador.
create policy "Permitir tudo em termos-fotos (uso interno)"
  on storage.objects
  for all
  using (bucket_id = 'termos-fotos')
  with check (bucket_id = 'termos-fotos');
