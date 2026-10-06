/* ============================================================
 * Khaos League Championship - CFO
 * CONFIGURAÇÃO DO SITE  (este é o único arquivo que você precisa editar)
 * ============================================================
 *
 * BANCO DE DADOS ONLINE (Firebase)
 * --------------------------------
 * Enquanto os campos abaixo estiverem vazios, o site roda em MODO DEMONSTRAÇÃO:
 * as contas e o progresso ficam salvos só no navegador de quem está usando.
 *
 * Para ligar o banco de dados de verdade (contas, senhas, progresso e ranking
 * compartilhados entre todos), crie um projeto gratuito em
 * https://console.firebase.google.com e cole aqui os dados do "app da Web".
 * O passo a passo completo está no arquivo README.md.
 */
window.KLC_CONFIG = {

  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  /* true  = o cadastro só aceita e-mails @gmail.com
   * false = aceita qualquer e-mail */
  somenteGmail: true,

  /* true = mostra o botão "Entrar com Google" (só funciona com o Firebase ligado
   * e com o provedor Google ativado em Authentication > Sign-in method) */
  loginComGoogle: true,

  /* Tamanho mínimo da senha criada no cadastro */
  senhaMinima: 8,

  /* Quantas pessoas aparecem na classificação */
  tamanhoDoRanking: 100
};
