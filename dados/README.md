# Cadastro de Equipamentos — Supabase

Formulário de cadastro de equipamentos e periféricos, com tela de consulta, usando Supabase (Postgres) como banco de dados.

## Estrutura de arquivos

```
cadastro-equipamentos/
├── index.html      → estrutura da página (telas de Cadastrar e Consultar)
├── style.css        → toda a estilização
├── script.js        → lógica dos formulários, da consulta e conexão com o Supabase
└── schema.sql        → script para criar as tabelas no Supabase
```

Mantenha os quatro arquivos na mesma pasta — o `index.html` referencia `style.css` e `script.js` diretamente, sem subpastas.

## Passo a passo para configurar

1. **Crie um projeto no Supabase** (se ainda não tiver): https://supabase.com

2. **Crie as tabelas**: abra o *SQL Editor* do seu projeto e execute o conteúdo de `schema.sql`. Isso cria as tabelas `equipamentos` e `perifericos`, habilita RLS e libera acesso via API (policy permissiva de uso interno). O script pode ser executado mais de uma vez sem erro.

3. **Pegue suas credenciais**: em *Project Settings → Data API*, copie:
   - `Project URL`
   - `anon public key`

4. **Edite `script.js`** e substitua:
   ```js
   const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
   const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-PUBLICA-AQUI';
   ```
   pelos valores reais do seu projeto.

5. **Abra `index.html`** no navegador (ou hospede em qualquer servidor estático).

## Telas

1. **📦 Cadastrar** — primeiro escolha o **tipo de equipamento**: Notebook, Desktop, Celular ou Tablet.
   - **Notebook / Desktop**: mantém todos os campos originais (processador, RAM, armazenamento, placa de vídeo, sistema operacional, número de série, etc.) e a opção de expandir e cadastrar também um periférico.
   - **Celular / Tablet**: mostra apenas Marca, Modelo, Patrimônio, **Número de IMEI**, Setor Responsável, Pessoa Responsável, E-mail Cadastrado e Observações. Os campos técnicos de PC ficam ocultos e não são enviados, e a opção de periféricos fica desabilitada (não se aplica a esses tipos).
2. **🔍 Consultar** — lista tudo o que já foi cadastrado, com:
   - Sub-abas para alternar entre **Notebooks**, **Desktops**, **Celulares**, **Tablets** e **Periféricos**.
   - Em cada aba de equipamento, uma barra mostra quantos itens estão **🟢 Em uso** e quantos estão **🔵 Disponíveis** dentro daquele tipo.
   - Busca por marca, modelo, patrimônio, número de série/IMEI, responsável (conforme o tipo).
   - Filtro por situação (Em uso, Disponível, Em manutenção, Descartado, Extraviado, Outro).
   - Botão de atualizar (🔄) para recarregar os dados do Supabase.
   - Botão **Excluir** em cada item, com confirmação.

## Observações importantes

- A chave `anon` é pública por natureza (fica visível no navegador). A segurança de quem pode inserir/ler/excluir dados é controlada pelas **políticas de RLS**, já incluídas em `schema.sql`. Ajuste-as conforme sua necessidade (por exemplo, exigir login de usuário em vez de acesso público).
- O campo `patrimonio` da tabela `equipamentos` é único (não permite dois cadastros com o mesmo número). O de `perifericos` não tem essa restrição. Ajuste no SQL se não for o comportamento desejado.
- **Se você já tinha o banco criado antes desta versão**, basta rodar `schema.sql` novamente no SQL Editor — o script inclui os comandos de migração (`add column if not exists`, `drop not null`, etc.) que adicionam as colunas `tipo_equipamento` e `imei` e tornam os campos técnicos de PC opcionais, sem apagar nada.
- A tela de Consulta ainda não tem edição de registros — apenas visualizar, buscar, filtrar e excluir. Se precisar de edição, é só pedir.
