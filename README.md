# Khaos League Championship - CFO

Site de questões das provas do CFO da PMBA e do CBMBA (UNEB, 2025), com cadastro e login, simulados com relógio, classificação com patentes, desempenho por disciplina e treino de redação.

São 160 questões objetivas (80 de cada prova) com o gabarito dos cadernos. As 5 questões anuladas pela banca aparecem marcadas e não pontuam.

## 1. Testar no seu computador

Dê dois cliques em `index.html`. O site abre em **modo demonstração**: tudo funciona, mas as contas e as respostas ficam guardadas só naquele navegador. Serve para conhecer o site antes de publicar.

## 2. Publicar no GitHub Pages

1. Entre em <https://github.com> e clique em **New repository**.
2. Dê um nome (por exemplo `khaos-league-cfo`), deixe **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste para a janela **tudo o que está dentro desta pasta** (`index.html`, a pasta `assets`, `README.md`, `LICENSE`, `firestore.rules` e `.nojekyll`). Arraste o conteúdo, não a pasta em si.
5. Clique em **Commit changes**.
6. Abra **Settings > Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, branch **main**, pasta **/(root)**, e clique em **Save**.
7. Espere um ou dois minutos. O endereço aparece no topo da mesma página, no formato `https://SEU-USUARIO.github.io/khaos-league-cfo/`.

Nesse ponto o site já está no ar, ainda em modo demonstração.

## 3. Ligar o banco de dados (contas de verdade e ranking de todos)

O GitHub Pages só hospeda arquivos; ele não roda PHP nem banco de dados. Por isso as contas e o progresso ficam no **Firebase**, do Google, que tem plano gratuito e funciona direto do navegador. Leva uns dez minutos e só precisa ser feito uma vez.

### 3.1 Criar o projeto

1. Abra <https://console.firebase.google.com> com a sua conta Google e clique em **Criar um projeto**.
2. Dê um nome (por exemplo `khaos-league-cfo`). O Google Analytics pode ficar desligado.

### 3.2 Registrar o site e copiar a configuração

1. Na página inicial do projeto, clique no ícone **`</>`** (Web).
2. Dê um apelido ao app e clique em **Registrar app**. Não precisa marcar o Firebase Hosting.
3. Vai aparecer um bloco `firebaseConfig` com `apiKey`, `authDomain`, `projectId` e outros. Copie esses valores.
4. Abra `assets/js/config.js` e cole cada valor no campo de mesmo nome:

```js
firebase: {
  apiKey: "AIza...",
  authDomain: "khaos-league-cfo.firebaseapp.com",
  projectId: "khaos-league-cfo",
  storageBucket: "khaos-league-cfo.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
},
```

Essa `apiKey` pode ficar pública; em sites é assim mesmo. Quem protege os dados são as regras do passo 3.4 e a lista de domínios do passo 3.5.

### 3.3 Ativar o login

1. No menu do Firebase, abra **Criação > Authentication** e clique em **Vamos começar**.
2. Na aba **Método de login**, ative **E-mail/senha**.
3. Ative também **Google** (ele pede um e-mail de suporte; use o seu). Se não quiser o botão "Entrar com o Google", deixe desativado e mude `loginComGoogle` para `false` no `config.js`.
4. Opcional: em **Modelos**, troque o idioma dos e-mails para português.

### 3.4 Criar o banco e colar as regras

1. Abra **Criação > Firestore Database** e clique em **Criar banco de dados**.
2. Escolha o local `southamerica-east1 (São Paulo)` e o **modo de produção**.
3. Com o banco criado, abra a aba **Regras**, apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` e clique em **Publicar**.

Sem esse passo o site não consegue gravar nada e mostra o aviso "O banco de dados recusou o acesso".

### 3.5 Autorizar o endereço do site

Em **Authentication > Configurações > Domínios autorizados**, clique em **Adicionar domínio** e informe `SEU-USUARIO.github.io` (só o domínio, sem `https://` e sem o nome do repositório).

### 3.6 Enviar o `config.js` para o GitHub

No repositório, abra `assets/js/config.js`, clique no lápis, cole a versão preenchida e confirme em **Commit changes**. Em um ou dois minutos a faixa "Modo demonstração" some do topo do site e o cadastro passa a valer para todo mundo.

## 4. Onde ver as contas cadastradas

No console do Firebase:

- **Authentication > Usuários**: lista de contas, com e-mail, data de criação e último acesso. Dá para desativar ou excluir uma conta ali.
- **Firestore Database > Dados**: a coleção `usuarios` guarda o progresso de cada pessoa e a coleção `ranking` guarda as linhas da classificação.

As senhas ficam com o serviço de autenticação do Firebase. Nem você nem o site têm acesso a elas.

## 5. Ajustes rápidos (`assets/js/config.js`)

| Opção | O que faz |
|---|---|
| `somenteGmail` | `true` aceita só e-mails `@gmail.com` no cadastro; `false` aceita qualquer e-mail |
| `loginComGoogle` | mostra ou esconde o botão "Entrar com o Google" |
| `senhaMinima` | tamanho mínimo da senha criada no cadastro |
| `tamanhoDoRanking` | quantas pessoas aparecem na classificação |

## 6. Como a liga pontua

- Acertou na primeira tentativa: 10 pontos.
- Errou e acertou na segunda, sem ver o gabarito: 5 pontos.
- Cada questão pontua uma vez só. Depois vira treino.
- No simulado, as respostas entram na pontuação ao finalizar; questão em branco conta como erro.
- As patentes vão de Aluno-a-Oficial a Coronel e sobem conforme os pontos (a tabela está na aba "Sobre a liga").

A pontuação é calculada no navegador de cada pessoa. As regras do banco impedem que alguém mexa na linha de outro competidor, mas não impedem que alguém com conhecimento técnico altere a própria. Para uma liga entre conhecidos isso costuma bastar.

## 7. Acrescentar questões

As questões ficam em `assets/js/banco-questoes.js`. Cada uma é uma linha neste formato:

```js
{"id":"pmba-01","prova":"pmba","n":1,"disc":"Língua Portuguesa","enun":"<p>Enunciado...</p>","alt":["texto da A","texto da B","texto da C","texto da D","texto da E"],"gab":"E","texto":"pmba-t1"}
```

- `id` precisa ser único. `prova` é o `id` de uma das provas listadas em `provas`, no começo do arquivo.
- `gab` é a letra correta. Em questão anulada, use `"gab":null,"anulada":true`.
- `texto` é opcional e aponta para um texto-base da lista `textos`.
- Para uma prova nova, acrescente também um item em `provas`, com as disciplinas e os intervalos de questões.

Os pontos necessários para cada patente se ajustam sozinhos ao total de questões.

## 8. O que tem em cada arquivo

```
index.html                  página única do site
firestore.rules             regras de segurança do banco (passo 3.4)
LICENSE                     aviso de direitos autorais e termos de uso do código
assets/css/estilo.css       cores, fontes e layout
assets/js/config.js         configuração (o único arquivo que você edita)
assets/js/banco-questoes.js questões, textos-base e temas de redação
assets/js/backend.js        contas e banco de dados (Firebase ou modo demonstração)
assets/js/nucleo.js         pontuação, patentes e estado
assets/js/telas.js          o conteúdo de cada aba
assets/js/app.js            navegação, cliques e simulado
assets/vendor/              biblioteca do Firebase (Google, licença Apache 2.0)
assets/fonts/               fontes Big Shoulders e Public Sans (licença OFL)
```

## 9. Limites do plano gratuito do Firebase

O plano gratuito cobre com folga uma liga pequena: cerca de 50 mil leituras e 20 mil gravações por dia no banco. Cada resposta usa duas gravações (o progresso e a linha do ranking) e cada visita à classificação lê até 100 linhas. Se um dia o limite for atingido, o site avisa e volta ao normal no dia seguinte.

## 10. Direitos autorais

© 2026 Ronie Khaos Sousa Barbosa. Todos os direitos reservados.

O código, o projeto visual, os textos da interface e o emblema do site pertencem ao titular e não podem ser copiados, modificados ou redistribuídos sem autorização por escrito. Os termos completos estão no arquivo `LICENSE`. O repositório é público só para a hospedagem no GitHub Pages; isso não libera o código para reuso.

Ficam fora dessa titularidade: as questões e os textos das provas (pertencem aos respectivos titulares), a biblioteca Firebase (Google, licença Apache 2.0) e as fontes Big Shoulders e Public Sans (licença SIL OFL 1.1).

### Como funciona para pessoa física

- No Brasil o direito autoral nasce com a criação e **não depende de registro** (Lei 9.610/1998, art. 18; Lei 9.609/1998, art. 2º, § 3º). Não é preciso ter empresa nem CNPJ.
- O autor se identifica pelo nome civil, completo ou abreviado, ou por pseudônimo (Lei 9.610, art. 12), e quem aparece identificado na obra é presumido autor até prova em contrário (art. 13). Por isso o aviso usa o nome completo.
- O ano do aviso é o da primeira publicação. Quando o site for atualizado em outro ano, use um intervalo, por exemplo `2026-2027`.
- O aviso aparece no rodapé (`index.html`), na aba "Sobre a liga" (`assets/js/telas.js`), no `LICENSE` e no cabeçalho dos arquivos de código. Para trocar o nome ou o ano, altere nesses lugares.

### Registro formal (opcional)

O registro não cria o direito, mas serve de prova de autoria e de data. Para o código do site ele é feito no INPI, como "programa de computador", e pode ser pedido por pessoa física:

1. Cadastro no e-INPI.
2. Emissão e pagamento da GRU do serviço 730 (R$ 185,00 na tabela do INPI consultada em outubro de 2026; confira o valor ao emitir).
3. Geração do resumo *hash* do código-fonte e assinatura da Declaração de Veracidade com certificado digital ICP-Brasil (a assinatura do gov.br não é aceita).
4. Envio do formulário no sistema e-Software. O INPI informa prazo de até 10 dias para a publicação do registro.

O guia oficial está em <https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/guia-basico>.

O **nome** do site não é protegido por direito autoral (Lei 9.610, art. 8º, VI). Para ter exclusividade sobre "Khaos League Championship", o caminho é o registro de marca, também no INPI, que é outro pedido.

## Aviso

Site independente de estudos, sem vínculo com a Polícia Militar da Bahia, o Corpo de Bombeiros Militar da Bahia ou a UNEB. Os textos usados nas questões pertencem aos seus autores e aparecem com a fonte indicada na prova.
