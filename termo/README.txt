# Termo de Equipamento - Amalfis

Abra o arquivo index.html no navegador.
Mantenha todos os arquivos na MESMA pasta.

## Estrutura
- index.html .......... marcacao das 3 telas (Inicio, Formulario, Consulta) + as 3 paginas do PDF
- styles.css .......... todo o estilo (telas + folhas A4)
- app.js .............. toda a logica (telas, cadastro de termos, mascara de CPF, fotos, PDF)
- logo.js ............. a logo em base64, injetada nas paginas pelo app.js
- supabase-config.js .. onde voce cola a URL e a chave do seu projeto Supabase
- supabase-setup.sql .. script para criar a tabela "termos" no Supabase (roda uma vez)

A logo continua em base64 de proposito: assim o PDF e gerado corretamente
mesmo abrindo o index.html direto do disco (file://), sem erro de CORS/canvas.

## Configurando o Supabase (obrigatório para salvar os termos)
1. Crie uma conta e um projeto gratuito em https://supabase.com.
2. No projeto, vá em "Project Settings" > "Data API" e copie a "Project URL"
   e a chave "anon" / "publishable".
3. Abra o supabase-config.js e cole os dois valores nos lugares indicados.
4. No painel do Supabase, abra o "SQL Editor", cole o conteúdo do arquivo
   supabase-setup.sql e execute. Isso cria a tabela "termos" com as colunas
   usadas pelo app, o bucket "termos-fotos" no Storage (para as fotos), e
   libera acesso via API (RLS habilitado com uma policy permissiva de uso
   interno). Se você já tinha rodado uma versão anterior deste script, pode
   rodar de novo sem problema — ele só adiciona o que estiver faltando.
5. Salve tudo, abra (ou recarregue) o index.html. A tela inicial mostra um
   aviso amarelo se algo ainda não estiver configurado corretamente.

## Evitar pausa por inatividade no plano gratuito
O repositorio inclui um GitHub Actions que faz diariamente uma consulta
somente de leitura (seleciona no maximo um ID da tabela "termos"). Para
ativa-lo:
1. No GitHub, abra **Settings > Secrets and variables > Actions** e crie os
   secrets `SUPABASE_PROJECT_URL` (Project URL) e `SUPABASE_ANON_KEY`
   (chave anon/publishable do projeto).
2. Envie o workflow `.github/workflows/supabase-keepalive.yml` para a branch
   padrao do repositorio. Na aba **Actions**, habilite os workflows se o
   GitHub solicitar.
3. A tarefa roda diariamente às 06:17 UTC e tambem pode ser executada
   manualmente pela aba **Actions**.

O workflow nao usa a service role key, nao grava dados e descarta a resposta
da consulta. O GitHub pode atrasar execucoes agendadas, portanto isso reduz
o risco de pausa por inatividade, mas nao e uma garantia do Supabase.

## Novos campos: E-mail e Celular
O formulário agora pede o e-mail cadastrado e o número de celular da pessoa.
Esses dois campos ficam salvos no banco e aparecem apenas na tela de
Consulta (junto com nome/CPF) — eles NÃO entram no PDF do termo gerado.
Se você já tinha rodado o supabase-setup.sql antes, rode-o de novo: ele
adiciona as colunas "email" e "celular" que estavam faltando, sem apagar
nada do que já existia.

### Sobre segurança e dados sensíveis (CPF)
Este app roda inteiramente no navegador: a chave "anon" do Supabase fica
visível em supabase-config.js e no código-fonte da página. A policy do SQL
libera leitura e escrita para qualquer pessoa que tenha essa chave (ou seja,
qualquer pessoa com acesso aos arquivos do app). Isso é adequado para uso
interno entre uma equipe de confiança, mas não é o mesmo que ter login por
usuário. Se depois quiser exigir que cada pessoa faça login antes de acessar
os termos (recomendável, já que há CPF armazenado), é possível habilitar o
Supabase Auth e trocar a policy do SQL para checar auth.uid() — nesse caso,
é só avisar.

## Telas
1. **Inicio** - menu com 3 opcoes e um resumo (quantos termos ativos/encerrados).
2. **Criar Termo** - o formulario original: preenche os dados, adiciona fotos e
   gera o PDF de 3 paginas. Ao gerar o PDF, o termo tambem e cadastrado no
   sistema com status "Ativo".
3. **Inserir Termo** - cadastra no sistema um termo que ja existe fisicamente
   em papel (nao gera PDF). Pede a data de entrega, permite marcar a
   situacao atual como Ativo ou ja Encerrado (com a data de devolucao), e
   agora tambem aceita fotos do equipamento (opcional), que sao enviadas
   para o Supabase Storage e ficam visiveis na tela de Consulta.
4. **Consultar Termos** - lista todos os termos cadastrados (criados pelo
   app ou inseridos manualmente), com busca por nome/CPF/patrimonio e
   filtro por status. Cada card destaca (eleva/sombra) ao passar o mouse
   e mostra sempre nome, tipo/aparelho/modelo, CPF, IMEI, patrimonio,
   e-mail e celular (avisando em vermelho quando e-mail ou celular nao
   foram informados). Em cada termo e possivel:
   - Editar os dados cadastrados (nome, CPF, e-mail, celular, tipo,
     aparelho, modelo, IMEI, patrimonio e itens incluidos) - util para
     completar termos antigos aos quais faltou preencher e-mail/celular.
   - Marcar como devolvido (informando a data) -> vira "Encerrado".
   - Reabrir um termo encerrado -> volta para "Ativo".
   - Excluir o cadastro.

## Onde os termos ficam guardados
Os cadastros (nome, CPF, aparelho, datas e status) sao salvos na tabela
"termos" do seu projeto Supabase (veja a secao de configuracao acima). Isso
significa que:
- Os dados ficam disponiveis em qualquer computador/navegador que abra o
  index.html com o mesmo supabase-config.js.
- As fotos adicionadas em "Criar Termo" ou "Inserir Termo" sao enviadas para
  o bucket "termos-fotos" no Supabase Storage (criado pelo supabase-setup.sql)
  e o link de cada foto e salvo junto do termo. Elas aparecem como
  miniaturas clicaveis na tela de Consulta.

## Ajustes de layout do PDF (herdados da versao anterior)
- Assinaturas ancoradas na base da folha (classe .signs), acima do rodape.
- Para mover as assinaturas para cima ou para baixo, altere apenas
  --assinaturas-base no :root do styles.css (padrao: 120px).

## Geracao do PDF
- As fotos sao reduzidas automaticamente antes da geracao.
- O PDF e criado uma pagina por vez, com indicacao de progresso.
- Em caso de erro, uma mensagem e exibida em vez de travar em "Gerando PDF".
