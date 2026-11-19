-- Despertador do Supabase: uma gravação de verdade no banco, chamada pelo GitHub duas vezes
-- por semana (.github/workflows/despertador-supabase.yml), para o plano gratuito não pausar
-- o projeto. Só uma leitura não bastou: o projeto pausou em 30/10 mesmo com as leituras.
--
-- A tabela tem uma linha só, com a hora da última vez que o despertador tocou. Ninguém lê
-- nem escreve nela direto: a única porta é a função acordar(), que só atualiza essa hora.

create table if not exists public.despertador (
  id smallint primary key default 1 check (id = 1),
  acordado_em timestamptz not null default now()
);

alter table public.despertador enable row level security;

create or replace function public.acordar()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.despertador (id, acordado_em) values (1, now())
  on conflict (id) do update set acordado_em = excluded.acordado_em
  returning acordado_em;
$$;

revoke all on function public.acordar() from public;
grant execute on function public.acordar() to anon, authenticated;
