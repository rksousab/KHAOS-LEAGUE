/* ============================================================
 * Khaos League Championship - CFO
 * Copyright (c) 2026 Ronie Khaos Sousa Barbosa. Todos os direitos reservados.
 * telas.js — o HTML de cada aba (funções que devolvem texto)
 * ============================================================ */
(function () {
  "use strict";

  var K = window.KLC, S = K.S, esc = K.esc, BANCO = K.banco, IC = K.IC;
  var T = K.telas = {};
  var POR_PAGINA = 10;

  K.url = function (nome, params) {
    var partes = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v !== undefined && v !== null && v !== "") partes.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    return "#/" + nome + (partes.length ? "?" + partes.join("&") : "");
  };

  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  /* barra de progresso: trilho e preenchimento na mesma família de cor */
  function medidor(valor, total, rotulo) {
    var p = total ? Math.max(0, Math.min(100, 100 * valor / total)) : 0;
    return '<div class="medidor" role="img" aria-label="' + esc(rotulo || (valor + " de " + total)) + '"><span style="width:' + p.toFixed(1) + '%"></span></div>';
  }

  /* ============================================================
   * QUESTÃO
   * ============================================================ */
  var SELOS = {
    primeira: ["selo-certo", "Acertou de primeira"],
    segunda: ["selo-certo", "Acertou na 2ª tentativa"],
    acerto: ["selo-certo", "Acertou no treino"],
    chance: ["selo-erro", "Errou, resta 1 tentativa"],
    erro: ["selo-erro", "Errou"],
    anulada: ["selo-neutro", "Anulada pela banca"]
  };

  function seloDe(sit) {
    var s = SELOS[sit];
    if (!s) return "";
    var icone = s[0] === "selo-certo" ? IC.certo : s[0] === "selo-erro" ? IC.errado : "";
    return '<span class="selo ' + s[0] + '">' + icone + esc(s[1]) + "</span>";
  }

  function blocoTexto(q, aberto) {
    if (!q.texto) return "";
    var t = BANCO.textos[q.texto];
    if (!t) return "";
    return '<details class="texto-base"' + (aberto ? " open" : "") + ">" +
      "<summary>" + IC.livro + "<span>Texto-base das questões " + t.de + " a " + t.ate + (t.titulo ? ": " + esc(t.titulo) : "") + "</span>" + IC.seta + "</summary>" +
      '<div class="texto-base-corpo">' + (t.titulo ? '<p class="texto-base-titulo">' + esc(t.titulo) + "</p>" : "") + t.html + "</div></details>";
  }

  /* cfg: { habilitado, sel, riscadas{}, travada (letra), marca{letra: certa|errada}, tag{letra: texto} } */
  function alternativas(q, cfg) {
    var html = '<fieldset class="alternativas"><legend class="sr">Alternativas da questão ' + q.n + "</legend>";
    "ABCDE".split("").forEach(function (L, i) {
      var cls = ["alt"], marca = cfg.marca && cfg.marca[L], tag = cfg.tag && cfg.tag[L];
      var riscada = !!(cfg.riscadas && cfg.riscadas[L]) || cfg.travada === L;
      var desab = !cfg.habilitado || cfg.travada === L;
      if (marca) cls.push("alt-" + marca);
      if (riscada && cfg.habilitado) cls.push("alt-riscada");
      if (cfg.sel === L) cls.push("alt-marcada");
      if (desab) cls.push("alt-travada");
      html += '<div class="' + cls.join(" ") + '">' +
        '<label class="alt-rotulo">' +
        '<input type="radio" name="alt-' + q.id + '" value="' + L + '"' + (cfg.sel === L ? " checked" : "") + (desab ? " disabled" : "") + ' data-muda="marcar">' +
        '<span class="alt-letra" aria-hidden="true">' + (marca === "certa" ? IC.certo : marca === "errada" ? IC.errado : L) + "</span>" +
        '<span class="alt-texto"><span class="sr">Alternativa ' + L + ". </span>" + q.alt[i] +
        (tag ? ' <span class="alt-tag">' + esc(tag) + "</span>" : "") + "</span>" +
        "</label>" +
        (cfg.habilitado && cfg.travada !== L
          ? '<button type="button" class="alt-riscar" data-acao="riscar" data-letra="' + L + '" aria-pressed="' + (riscada ? "true" : "false") + '" title="Riscar a alternativa ' + L + '"><span class="sr">Riscar a alternativa ' + L + "</span>" + IC.riscar + "</button>"
          : "") +
        "</div>";
    });
    return html + "</fieldset>";
  }

  function topoQuestao(q, extra) {
    var pv = K.PROVA[q.prova];
    return '<header class="questao-topo">' +
      '<span class="questao-num" aria-hidden="true">' + K.doisDigitos(q.n) + "</span>" +
      '<div class="questao-meta"><h3 class="questao-titulo">Questão ' + q.n + '</h3><p class="questao-origem">' + esc(pv.nome) + " <span>" + esc(q.disc) + "</span></p></div>" +
      (extra || "") + "</header>";
  }

  /* ---- modo prática (aba Questões) ---- */
  K.cartaoPratica = function (q, opcoes) {
    opcoes = opcoes || {};
    var r = K.respostas()[q.id];
    var ui = S.ui[q.id] || (S.ui[q.id] = {});
    var sit = K.situacao(q.id);
    var fav = !!K.favoritas()[q.id];
    var aberto = !q.anulada && (!r || !!ui.refazendo);
    var segunda = aberto && r && sit === "chance";

    var cfg = { habilitado: aberto, sel: null, riscadas: ui.riscadas || {}, marca: {}, tag: {} };
    if (aberto) {
      cfg.sel = ui.sel || null;
      if (segunda) { cfg.travada = r.r; cfg.tag[r.r] = "Sua 1ª resposta"; }
    } else if (r) {
      cfg.sel = r.r;
      if (r.ok) { cfg.marca[r.r] = "certa"; cfg.tag[r.r] = "Sua resposta"; }
      else {
        if (r.r && r.r !== "-") { cfg.marca[r.r] = "errada"; cfg.tag[r.r] = "Sua resposta"; }
        if (r.g) { cfg.marca[q.gab] = "certa"; cfg.tag[q.gab] = "Gabarito"; }
      }
    }

    var pe = "";
    if (q.anulada) {
      pe = '<p class="retorno retorno-neutro">Questão anulada pela banca. Não entra na pontuação da liga.</p>';
    } else if (aberto) {
      var nota = "";
      if (segunda) nota = '<p class="retorno retorno-neutro">Segunda tentativa: vale ' + K.PONTOS.segunda + " pontos.</p>";
      else if (r) nota = '<p class="retorno retorno-neutro">Treino: esta questão não muda mais a sua pontuação.</p>';
      pe = nota + '<div class="questao-acoes">' +
        '<button type="button" class="btn btn-primario" data-acao="responder"' + (cfg.sel ? "" : " disabled") + ">Responder</button>" +
        (r ? '<button type="button" class="btn btn-texto" data-acao="cancelar-refazer">Cancelar</button>' : "") +
        "</div>";
    } else {
      var msg = "", botoes = "";
      if (sit === "primeira") msg = ["certo", "Resposta correta. Você ganhou " + K.PONTOS.primeira + " pontos."];
      else if (sit === "segunda") msg = ["certo", "Resposta correta na segunda tentativa. Você ganhou " + K.PONTOS.segunda + " pontos."];
      else if (sit === "acerto") msg = ["certo", "Resposta correta. Esta questão já não pontuava mais."];
      else if (sit === "chance") msg = ["erro", "Resposta incorreta. Você ainda tem uma tentativa, valendo " + K.PONTOS.segunda + " pontos."];
      else msg = ["erro", r.r === "-" ? "Você deixou esta questão em branco no simulado. Gabarito: alternativa " + q.gab + "." : "Resposta incorreta. Gabarito: alternativa " + q.gab + "."];
      if (sit === "chance") {
        botoes = '<button type="button" class="btn btn-primario" data-acao="refazer">Tentar de novo</button>' +
          '<button type="button" class="btn btn-fantasma" data-acao="ver-gabarito">Ver gabarito</button>';
      } else {
        botoes = '<button type="button" class="btn btn-fantasma" data-acao="refazer">Refazer como treino</button>';
      }
      pe = '<p class="retorno retorno-' + msg[0] + '" role="status">' + (msg[0] === "certo" ? IC.certo : IC.errado) + "<span>" + esc(msg[1]) + "</span></p>" +
        '<div class="questao-acoes">' + botoes + "</div>";
    }

    var topo = topoQuestao(q,
      seloDe(sit) +
      '<button type="button" class="btn-icone favorito" data-acao="favoritar" aria-pressed="' + (fav ? "true" : "false") + '" title="' + (fav ? "Tirar das favoritas" : "Guardar nas favoritas") + '">' +
      '<span class="sr">' + (fav ? "Tirar das favoritas" : "Guardar nas favoritas") + "</span>" + IC.estrela + "</button>");

    return '<article class="questao' + (q.anulada ? " questao-anulada" : "") + '" id="q-' + q.id + '" data-qid="' + q.id + '" data-modo="pratica">' +
      topo + blocoTexto(q, opcoes.textoAberto) +
      '<div class="enunciado">' + q.enun + "</div>" +
      alternativas(q, cfg) +
      '<footer class="questao-pe">' + pe + "</footer></article>";
  };

  /* ---- modo simulado (uma questão por vez, sem gabarito) ---- */
  K.cartaoSimulado = function (q, opcoes) {
    opcoes = opcoes || {};
    var sim = S.sim, ui = S.ui["sim:" + q.id] || (S.ui["sim:" + q.id] = {});
    var cfg = { habilitado: !q.anulada, sel: sim.resp[q.id] || null, riscadas: ui.riscadas || {} };
    var marcada = !!sim.marc[q.id];
    var pos = sim.qids.indexOf(q.id), ultimo = pos === sim.qids.length - 1;
    var topo = topoQuestao(q, '<span class="questao-ordem">' + (pos + 1) + " de " + sim.qids.length + "</span>");
    return '<article class="questao" id="q-' + q.id + '" data-qid="' + q.id + '" data-modo="simulado">' +
      topo + blocoTexto(q, opcoes.textoAberto) +
      '<div class="enunciado">' + q.enun + "</div>" +
      alternativas(q, cfg) +
      (q.anulada ? '<p class="retorno retorno-neutro">Questão anulada pela banca: o ponto é de todos os candidatos. Siga para a próxima.</p>' : "") +
      '<footer class="questao-pe"><div class="questao-acoes questao-acoes-sim">' +
      '<button type="button" class="btn btn-fantasma" data-acao="sim-anterior"' + (pos === 0 ? " disabled" : "") + ">Anterior</button>" +
      '<button type="button" class="btn btn-texto' + (marcada ? " ativo" : "") + '" data-acao="sim-marcar" aria-pressed="' + (marcada ? "true" : "false") + '">' + IC.bandeira + (marcada ? "Marcada para revisão" : "Marcar para revisão") + "</button>" +
      (sim.resp[q.id] ? '<button type="button" class="btn btn-texto" data-acao="sim-limpar">Limpar resposta</button>' : "") +
      (ultimo
        ? '<button type="button" class="btn btn-destaque empurra" data-acao="sim-finalizar">Finalizar e corrigir</button>'
        : '<button type="button" class="btn btn-primario empurra" data-acao="sim-proxima">Próxima</button>') +
      "</div></footer></article>";
  };

  /* ---- modo correção (resultado do simulado) ---- */
  function cartaoCorrecao(q, letra) {
    var cfg = { habilitado: false, sel: letra && letra !== "-" ? letra : null, marca: {}, tag: {} };
    if (!q.anulada) {
      if (letra && letra !== "-") {
        cfg.marca[letra] = letra === q.gab ? "certa" : "errada";
        cfg.tag[letra] = "Sua resposta";
      }
      cfg.marca[q.gab] = "certa";
      if (letra !== q.gab) cfg.tag[q.gab] = "Gabarito";
    }
    return '<div class="questao questao-correcao">' + blocoTexto(q, false) +
      '<div class="enunciado">' + q.enun + "</div>" + alternativas(q, cfg) + "</div>";
  }

  /* ============================================================
   * INÍCIO
   * ============================================================ */
  function escada(pontos, logado) {
    var atual = logado ? K.patenteDe(pontos).nivel : -1;
    var itens = K.PATENTES.map(function (p) {
      var cls = p.nivel < atual ? "feito" : p.nivel === atual ? "atual" : "";
      return '<li class="' + cls + '"' + (p.nivel === atual ? ' aria-current="step"' : "") + ">" +
        '<span class="escada-ins">' + K.insignia(p.nivel, 22) + "</span>" +
        '<span class="escada-nome">' + esc(p.nome) + "</span>" +
        '<span class="escada-min">' + (p.min ? fmtNum(p.min) + " pts" : "início") + "</span></li>";
    }).join("");
    return '<ol class="escada" aria-label="Patentes da liga, da primeira à última">' + itens + "</ol>";
  }

  function cartaoProva(pv, est) {
    var linhas = pv.disciplinas.map(function (d) {
      return "<tr><th scope=\"row\"><a href=\"" + K.url("questoes", { prova: pv.id, disc: d.nome }) + "\">" + esc(d.nome) + "</a></th>" +
        "<td>" + d.de + " a " + d.ate + '</td><td class="num">' + d.total + "</td></tr>";
    }).join("");
    var prog = "";
    if (est) {
      var e = est.porProva[pv.id];
      prog = '<div class="prova-prog"><div class="prova-prog-topo"><span>Seu avanço</span><span>' + e.resp + " de " + e.total + " respondidas</span></div>" +
        medidor(e.resp, e.total, "Você respondeu " + e.resp + " de " + e.total + " questões desta prova") + "</div>";
    }
    return '<article class="prova">' +
      "<header><h3>" + esc(pv.nome) + "</h3>" +
      "<p>" + esc(pv.orgao) + ". Banca " + esc(pv.banca) + ". " + pv.total + " questões objetivas" +
      (pv.anuladas.length ? ", " + K.plural(pv.anuladas.length, "anulada", "anuladas") : "") + ".</p></header>" +
      '<table class="tabela tabela-compacta"><thead><tr><th scope="col">Disciplina</th><th scope="col">Questões</th><th scope="col" class="num">Total</th></tr></thead><tbody>' + linhas + "</tbody></table>" +
      prog +
      '<footer><a class="btn btn-primario" href="' + K.url("questoes", { prova: pv.id }) + '">Resolver questões</a>' +
      '<a class="btn btn-fantasma" href="' + K.url("simulados") + '">Fazer simulado</a></footer></article>';
  }

  T.inicio = function () {
    var logado = !!S.usuario, est = logado ? K.estatisticas() : null, topo;

    if (logado) {
      var prox = est.proxima, base = est.patente.min;
      var faltam = prox ? prox.min - est.pontos : 0;
      topo = '<section class="heroi heroi-logado"><div class="contem">' +
        '<div class="campanha">' +
        '<div class="campanha-quem">' + K.insignia(est.patente.nivel, 44) +
        '<div><p class="campanha-ola">' + esc(S.usuario.nome) + '</p><h1 class="campanha-patente">' + esc(est.patente.nome) + "</h1></div></div>" +
        '<div class="campanha-pontos"><span class="campanha-num">' + fmtNum(est.pontos) + "</span><span>" + (est.pontos === 1 ? "ponto" : "pontos") + " na liga</span></div>" +
        '<div class="campanha-meta">' +
        (prox
          ? "<p>Faltam <b>" + fmtNum(faltam) + " pontos</b> para " + esc(prox.nome) + ".</p>" + medidor(est.pontos - base, prox.min - base, "Avanço até " + prox.nome)
          : "<p>Você chegou à última patente da liga.</p>" + medidor(1, 1, "Patente máxima")) +
        "</div>" +
        '<div class="heroi-acoes">' +
        '<a class="btn btn-destaque btn-g" href="' + K.url("questoes", { sit: "novas" }) + '">Continuar resolvendo</a>' +
        (est.pendentes ? '<a class="btn btn-claro btn-g" href="' + K.url("questoes", { sit: "erros" }) + '">Rever ' + K.plural(est.pendentes, "erro", "erros") + "</a>" : '<a class="btn btn-claro btn-g" href="' + K.url("simulados") + '">Fazer simulado</a>') +
        "</div></div>" + escada(est.pontos, true) + "</div></section>";
    } else {
      topo = '<section class="heroi"><div class="contem">' +
        '<div class="heroi-grade"><div class="heroi-texto">' +
        '<h1 class="marca-grande"><span class="marca-linha">Khaos League</span><span class="marca-linha">Championship</span><span class="marca-cfo">CFO</span></h1>' +
        '<p class="heroi-sub">As provas do Curso de Formação de Oficiais da PMBA e do CBMBA, questão por questão. Cada acerto vale pontos, e os pontos definem a sua patente na liga.</p>' +
        '<div class="heroi-acoes">' +
        '<a class="btn btn-destaque btn-g" href="' + K.url("cadastro") + '">Criar conta</a>' +
        '<a class="btn btn-claro btn-g" href="' + K.url("entrar") + '">Já tenho conta</a>' +
        "</div></div>" +
        '<div class="heroi-emblema">' + K.emblema("emblema emblema-g") + "</div></div>" +
        escada(0, false) + "</div></section>";
    }

    var provas = '<section class="contem bloco"><h2>Provas no banco</h2>' +
      '<p class="sub">' + BANCO.questoes.length + " questões objetivas com gabarito, tiradas dos cadernos das duas provas.</p>" +
      '<div class="provas">' + BANCO.provas.map(function (pv) { return cartaoProva(pv, est); }).join("") + "</div></section>";

    var regras = '<section class="contem bloco duas-colunas">' +
      "<div><h2>Como a liga pontua</h2>" +
      '<table class="tabela"><tbody>' +
      '<tr><th scope="row">Acertou na primeira tentativa</th><td class="num forte">' + K.PONTOS.primeira + " pontos</td></tr>" +
      '<tr><th scope="row">Errou e acertou na segunda, sem ver o gabarito</th><td class="num forte">' + K.PONTOS.segunda + " pontos</td></tr>" +
      '<tr><th scope="row">Errou as duas, ou pediu o gabarito</th><td class="num">0</td></tr>' +
      '<tr><th scope="row">Questão anulada pela banca</th><td class="num">não pontua</td></tr>' +
      "</tbody></table>" +
      '<p class="nota">Cada questão pontua uma vez só. Depois disso ela continua disponível para treino. No simulado, questão em branco conta como erro.</p></div>' +
      "<div><h2>O que dá para fazer aqui</h2>" +
      '<ul class="lista-simples">' +
      '<li><a href="' + K.url("questoes") + '">Questões</a><span>Resolva uma a uma, filtre por prova e disciplina e monte o seu caderno de erros.</span></li>' +
      '<li><a href="' + K.url("simulados") + '">Simulados</a><span>Faça a prova inteira com relógio, ou um simulado só das disciplinas que você escolher.</span></li>' +
      '<li><a href="' + K.url("redacao") + '">Redação</a><span>Os dois temas da prova, as regras de correção e uma folha para treinar.</span></li>' +
      '<li><a href="' + K.url("ranking") + '">Classificação</a><span>Veja quem está na frente e qual é a patente de cada competidor.</span></li>' +
      '<li><a href="' + K.url("desempenho") + '">Desempenho</a><span>Seu aproveitamento por disciplina e o histórico dos simulados.</span></li>' +
      "</ul></div></section>";

    return topo + provas + regras;
  };

  /* ============================================================
   * ENTRAR / CRIAR CONTA
   * ============================================================ */
  T.entrar = function (rota) {
    var cadastro = rota.nome === "cadastro";
    var online = S.backend.modo === "firebase";
    var google = online && K.cfg.loginComGoogle !== false;
    var volta = rota.params.volta || "";
    var gmail = K.cfg.somenteGmail !== false;
    var minimo = K.cfg.senhaMinima || 8;

    var abas = '<nav class="segmentos" aria-label="Entrar ou criar conta">' +
      '<a class="' + (!cadastro ? "ativo" : "") + '"' + (!cadastro ? ' aria-current="page"' : "") + ' href="' + K.url("entrar", { volta: volta }) + '">Entrar</a>' +
      '<a class="' + (cadastro ? "ativo" : "") + '"' + (cadastro ? ' aria-current="page"' : "") + ' href="' + K.url("cadastro", { volta: volta }) + '">Criar conta</a></nav>';

    var campoSenha = function (nome, rotulo, auto, dica) {
      return '<label class="campo"><span class="campo-rotulo">' + rotulo + "</span>" +
        '<span class="campo-senha"><input type="password" name="' + nome + '" autocomplete="' + auto + '" required minlength="' + (auto === "current-password" ? 1 : minimo) + '">' +
        '<button type="button" class="btn-icone" data-acao="mostrar-senha" aria-pressed="false" title="Mostrar a senha"><span class="sr">Mostrar a senha</span>' + IC.olho + "</button></span>" +
        (dica ? '<span class="campo-dica">' + dica + "</span>" : "") + "</label>";
    };

    var form;
    if (cadastro) {
      form = '<form class="form" data-form="cadastro" novalidate>' +
        "<h1>Criar conta</h1>" +
        '<label class="campo"><span class="campo-rotulo">Nome de guerra</span><input type="text" name="nome" autocomplete="nickname" maxlength="40" required><span class="campo-dica">É o nome que aparece na classificação.</span></label>' +
        '<label class="campo"><span class="campo-rotulo">' + (gmail ? "Seu Gmail" : "E-mail") + '</span><input type="email" name="email" autocomplete="email" inputmode="email" placeholder="' + (gmail ? "voce@gmail.com" : "voce@email.com") + '" required>' +
        (gmail ? '<span class="campo-dica">Só contas do Gmail (@gmail.com).</span>' : "") + "</label>" +
        campoSenha("senha", "Crie uma senha", "new-password", "Pelo menos " + minimo + " caracteres.") +
        campoSenha("senha2", "Repita a senha", "new-password") +
        '<p class="form-erro" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-primario btn-g btn-bloco">Criar conta</button>' +
        "</form>";
    } else {
      form = '<form class="form" data-form="entrar" novalidate>' +
        "<h1>Entrar</h1>" +
        '<label class="campo"><span class="campo-rotulo">E-mail</span><input type="email" name="email" autocomplete="email" inputmode="email" required></label>' +
        campoSenha("senha", "Senha", "current-password") +
        '<p class="form-erro" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-primario btn-g btn-bloco">Entrar</button>' +
        '<button type="button" class="btn btn-texto btn-bloco" data-acao="esqueci-senha">Esqueci minha senha</button>' +
        "</form>";
    }

    var extra = "";
    if (google) {
      extra = '<div class="ou"><span>ou</span></div>' +
        '<button type="button" class="btn btn-google btn-g btn-bloco" data-acao="entrar-google">' + IC.google + "<span>" + (cadastro ? "Criar conta com o Google" : "Entrar com o Google") + "</span></button>";
    }
    if (!online) {
      extra += '<p class="nota nota-caixa">Modo demonstração: a conta fica guardada só neste navegador. O banco de dados online é ligado no arquivo de configuração (veja o README).</p>';
    }

    return '<section class="acesso"><div class="acesso-lado">' + K.emblema("emblema emblema-m") +
      '<p class="acesso-marca">Khaos League Championship</p>' +
      '<ul class="acesso-pontos"><li>' + BANCO.questoes.length + " questões das provas de CFO da PMBA e do CBMBA</li><li>Simulados com relógio e correção por disciplina</li><li>Classificação com patentes, de Aluno-a-Oficial a Coronel</li></ul></div>" +
      '<div class="acesso-form">' + abas + form + extra + "</div></section>";
  };
  T.cadastro = T.entrar;

  /* ============================================================
   * QUESTÕES
   * ============================================================ */
  var SITUACOES = [
    ["", "Todas"],
    ["novas", "Ainda não respondi"],
    ["feitas", "Já respondi"],
    ["acertos", "Acertei"],
    ["erros", "Errei (caderno de erros)"],
    ["favoritas", "Favoritas"]
  ];

  function casaSituacao(q, sit) {
    if (!sit) return true;
    var r = K.respostas()[q.id];
    if (sit === "favoritas") return !!K.favoritas()[q.id];
    if (q.anulada) return false;
    if (sit === "novas") return !r;
    if (sit === "feitas") return !!r;
    if (sit === "acertos") return !!r && !!r.ok;
    if (sit === "erros") return !!r && !r.ok;
    return true;
  }

  K.filtrarQuestoes = function (f) {
    var termo = K.semAcento((f.q || "").trim());
    return BANCO.questoes.filter(function (q) {
      if (f.prova && q.prova !== f.prova) return false;
      if (f.disc && q.disc !== f.disc) return false;
      if (!casaSituacao(q, f.sit)) return false;
      if (termo && K.textoDeBusca(q).indexOf(termo) < 0) return false;
      return true;
    });
  };

  function paginacao(pag, total, params) {
    if (total <= 1) return "";
    var html = '<nav class="paginacao" aria-label="Páginas">';
    function link(p, rotulo, cls, desab) {
      var par = {}; Object.keys(params).forEach(function (k) { par[k] = params[k]; });
      par.p = p > 1 ? p : "";
      if (desab) return '<span class="pag ' + (cls || "") + ' desab" aria-disabled="true">' + rotulo + "</span>";
      return '<a class="pag ' + (cls || "") + (p === pag && !cls ? " atual" : "") + '" href="' + K.url("questoes", par) + '"' + (p === pag && !cls ? ' aria-current="page"' : "") + ">" + rotulo + "</a>";
    }
    html += link(pag - 1, "Anterior", "pag-seta", pag <= 1);
    var vistos = {};
    [1, 2, pag - 1, pag, pag + 1, total - 1, total].forEach(function (p) { if (p >= 1 && p <= total) vistos[p] = 1; });
    var ant = 0;
    Object.keys(vistos).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) {
      if (p - ant > 1) html += '<span class="pag pag-salto" aria-hidden="true">…</span>';
      html += link(p, String(p));
      ant = p;
    });
    html += link(pag + 1, "Próxima", "pag-seta", pag >= total);
    return html + "</nav>";
  }

  K.htmlPlacar = function (est) {
    var prox = est.proxima;
    return '<div class="placar" id="placar">' +
      '<div class="placar-patente">' + K.insignia(est.patente.nivel, 24) + "<span>" + esc(est.patente.nome) + "</span></div>" +
      '<dl class="placar-nums"><div><dt>Pontos</dt><dd>' + fmtNum(est.pontos) + "</dd></div>" +
      "<div><dt>Respondidas</dt><dd>" + est.respondidas + "<small> de " + est.total + "</small></dd></div>" +
      "<div><dt>De primeira</dt><dd>" + est.aproveitamento + "%</dd></div></dl>" +
      (prox
        ? medidor(est.pontos - est.patente.min, prox.min - est.patente.min, "Avanço até " + prox.nome) + '<p class="placar-falta">Faltam ' + fmtNum(prox.min - est.pontos) + " pontos para " + esc(prox.nome) + ".</p>"
        : '<p class="placar-falta">Última patente da liga.</p>') +
      "</div>";
  };

  T.questoes = function (rota) {
    var f = { prova: rota.params.prova || "", disc: rota.params.disc || "", sit: rota.params.sit || "", q: rota.params.q || "" };
    if (f.prova && !K.PROVA[f.prova]) f.prova = "";
    var discs = f.prova ? K.PROVA[f.prova].disciplinas.map(function (d) { return d.nome; }) : K.DISCIPLINAS;
    if (f.disc && discs.indexOf(f.disc) < 0) f.disc = "";
    var lista = K.filtrarQuestoes(f);
    var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    var pag = Math.min(paginas, Math.max(1, parseInt(rota.params.p, 10) || 1));
    var fatia = lista.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);
    var est = K.estatisticas();
    var temFiltro = !!(f.prova || f.disc || f.sit || f.q);

    var provaOpc = [["", "Todas"]].concat(BANCO.provas.map(function (p) { return [p.id, p.sigla]; }));
    var filtros = '<form class="filtros" data-form="filtros" role="search" aria-label="Filtrar questões">' +
      '<fieldset class="campo"><legend class="campo-rotulo">Prova</legend><div class="segmentos segmentos-p">' +
      provaOpc.map(function (o) {
        return '<label class="' + (f.prova === o[0] ? "ativo" : "") + '"><input type="radio" class="sr" name="prova" value="' + o[0] + '"' + (f.prova === o[0] ? " checked" : "") + ' data-muda="filtrar">' + esc(o[1]) + "</label>";
      }).join("") + "</div></fieldset>" +
      '<label class="campo"><span class="campo-rotulo">Disciplina</span><select name="disc" data-muda="filtrar"><option value="">Todas</option>' +
      discs.map(function (d) { return '<option value="' + esc(d) + '"' + (f.disc === d ? " selected" : "") + ">" + esc(d) + "</option>"; }).join("") + "</select></label>" +
      '<label class="campo"><span class="campo-rotulo">Situação</span><select name="sit" data-muda="filtrar">' +
      SITUACOES.map(function (s) { return '<option value="' + s[0] + '"' + (f.sit === s[0] ? " selected" : "") + ">" + esc(s[1]) + "</option>"; }).join("") + "</select></label>" +
      '<label class="campo"><span class="campo-rotulo">Buscar no enunciado</span><span class="campo-busca"><input type="search" name="q" value="' + esc(f.q) + '" placeholder="ex.: crase"><button type="submit" class="btn btn-primario">Buscar</button></span></label>' +
      (temFiltro ? '<a class="btn btn-texto" href="' + K.url("questoes") + '">Limpar filtros</a>' : "") +
      "</form>";

    var resumo = K.htmlPlacar(est);

    var corpo;
    if (!fatia.length) {
      var vazio = f.sit === "erros" && !f.q ? "Nenhum erro pendente por aqui. Quando você errar uma questão, ela aparece nesta lista até ser acertada."
        : f.sit === "favoritas" && !f.q ? "Você ainda não guardou nenhuma questão. Use a estrela no canto da questão para montar a sua lista."
          : f.sit === "novas" && !f.q ? "Você já respondeu todas as questões deste filtro."
            : "Nenhuma questão combina com esses filtros.";
      corpo = '<div class="vazio"><p>' + vazio + '</p><a class="btn btn-primario" href="' + K.url("questoes") + '">Ver todas as questões</a></div>';
    } else {
      var textoAnterior = null;
      corpo = fatia.map(function (q) {
        var abre = !!q.texto && q.texto !== textoAnterior;
        textoAnterior = q.texto || null;
        return K.cartaoPratica(q, { textoAberto: abre });
      }).join("");
    }

    var ini = lista.length ? (pag - 1) * POR_PAGINA + 1 : 0, fim = Math.min(lista.length, pag * POR_PAGINA);
    var params = { prova: f.prova, disc: f.disc, sit: f.sit, q: f.q };
    return '<section class="contem bloco pagina-questoes">' +
      '<div class="cabeca"><h1>Questões</h1><p class="sub" id="contagem" aria-live="polite">' +
      (lista.length ? "Mostrando " + ini + " a " + fim + " de " + K.plural(lista.length, "questão", "questões") : "Nenhuma questão encontrada") + ".</p></div>" +
      '<div class="questoes-grade"><div class="questoes-lista">' + corpo + paginacao(pag, paginas, params) + "</div>" +
      '<aside class="questoes-lado">' + resumo +
      '<details class="filtros-caixa" open><summary>Filtros' + IC.seta + "</summary>" + filtros + "</details></aside></div></section>";
  };

  /* ============================================================
   * SIMULADOS
   * ============================================================ */
  var TEMPOS = [[0, "Sem limite de tempo"], [1800, "30 minutos"], [3600, "1 hora"], [7200, "2 horas"], [10800, "3 horas"], [14400, "4 horas"], [18000, "5 horas"]];

  function seletorTempo(nome, padrao) {
    return '<select name="' + nome + '">' + TEMPOS.map(function (t) {
      return '<option value="' + t[0] + '"' + (t[0] === padrao ? " selected" : "") + ">" + t[1] + "</option>";
    }).join("") + "</select>";
  }

  T.simulados = function () {
    var andamento = "";
    if (S.sim) {
      var feitas = Object.keys(S.sim.resp).length;
      andamento = '<div class="destaque-caixa"><div><h2>Simulado em andamento</h2><p>' + esc(S.sim.titulo) + ". " + feitas + " de " + S.sim.qids.length + " respondidas, " + K.fmtDuracao(S.sim.decorrido || 0) + " de prova.</p></div>" +
        '<div class="destaque-acoes"><a class="btn btn-destaque" href="' + K.url("simulado") + '">Continuar</a><button type="button" class="btn btn-texto" data-acao="sim-descartar">Descartar</button></div></div>';
    }

    var completas = BANCO.provas.map(function (pv) {
      return '<form class="sim-opcao" data-form="sim-prova"><input type="hidden" name="prova" value="' + pv.id + '">' +
        "<h3>" + esc(pv.nome) + "</h3>" +
        "<p>" + pv.total + " questões na ordem do caderno: " + pv.disciplinas.map(function (d) { return esc(d.nome) + " (" + d.total + ")"; }).join(", ") + ".</p>" +
        '<label class="campo"><span class="campo-rotulo">Tempo de prova</span>' + seletorTempo("tempo", 14400) + "</label>" +
        '<button type="submit" class="btn btn-primario">Começar a prova</button></form>';
    }).join("");

    var personalizado = '<form class="sim-opcao sim-opcao-larga" data-form="sim-livre">' +
      "<h3>Simulado do seu jeito</h3><p>Escolha de onde vêm as questões. Elas são sorteadas a cada simulado.</p>" +
      '<div class="form-grade">' +
      '<fieldset class="campo"><legend class="campo-rotulo">Prova</legend><div class="segmentos segmentos-p">' +
      [["", "Todas"]].concat(BANCO.provas.map(function (p) { return [p.id, p.sigla]; })).map(function (o, i) {
        return '<label class="' + (i === 0 ? "ativo" : "") + '"><input type="radio" class="sr" name="prova" value="' + o[0] + '"' + (i === 0 ? " checked" : "") + ' data-muda="sim-contar">' + esc(o[1]) + "</label>";
      }).join("") + "</div></fieldset>" +
      '<label class="campo"><span class="campo-rotulo">Quais questões</span><select name="origem" data-muda="sim-contar"><option value="">Todas</option><option value="novas">Só as que ainda não respondi</option><option value="erros">Só as que errei</option><option value="favoritas">Só as favoritas</option></select></label>' +
      '<label class="campo"><span class="campo-rotulo">Quantidade</span><select name="qtd" data-muda="sim-contar"><option value="10">10 questões</option><option value="20" selected>20 questões</option><option value="30">30 questões</option><option value="40">40 questões</option><option value="0">Todas as disponíveis</option></select></label>' +
      '<label class="campo"><span class="campo-rotulo">Tempo</span>' + seletorTempo("tempo", 3600) + "</label></div>" +
      '<fieldset class="campo"><legend class="campo-rotulo">Disciplinas</legend><div class="marcadores">' +
      K.DISCIPLINAS.map(function (d) {
        return '<label class="marcador"><input type="checkbox" name="disc" value="' + esc(d) + '" checked data-muda="sim-contar"><span>' + esc(d) + "</span></label>";
      }).join("") + "</div></fieldset>" +
      '<p class="nota" id="sim-disponiveis" aria-live="polite"></p>' +
      '<button type="submit" class="btn btn-primario">Montar simulado</button></form>';

    var hist = K.simulados(), historico;
    if (!hist.length) {
      historico = '<p class="nota">Nenhum simulado concluído ainda. O resultado de cada um fica guardado aqui, com a correção questão por questão.</p>';
    } else {
      historico = '<div class="tabela-rolagem"><table class="tabela"><thead><tr><th scope="col">Data</th><th scope="col">Simulado</th><th scope="col" class="num col-extra">Acertos</th><th scope="col" class="num">Nota</th><th scope="col" class="num col-extra">Tempo</th><th scope="col"><span class="sr">Ações</span></th></tr></thead><tbody>' +
        hist.map(function (s) {
          return "<tr><td>" + K.fmtDia(s.t) + "</td><td>" + esc(s.titulo) + '</td><td class="num col-extra">' + s.ac + " de " + s.total + '</td><td class="num forte">' + K.pct(s.ac, s.total) + '%</td><td class="num col-extra">' + K.fmtDuracao(s.dur || 0) + "</td>" +
            '<td class="acoes-celula"><a class="btn btn-fantasma btn-p" href="' + K.url("resultado", { id: s.id }) + '">Ver correção</a></td></tr>';
        }).join("") + "</tbody></table></div>";
    }

    return '<section class="contem bloco"><div class="cabeca"><h1>Simulados</h1>' +
      '<p class="sub">O relógio só corre enquanto o simulado está aberto na tela. Ao finalizar, as respostas entram na sua pontuação da liga.</p></div>' +
      andamento +
      "<h2>Prova completa</h2>" + '<div class="sim-opcoes">' + completas + "</div>" +
      "<h2>Personalizado</h2>" + personalizado +
      "<h2>Simulados concluídos</h2>" + historico + "</section>";
  };

  K.mapaSimulado = function () {
    var sim = S.sim;
    return sim.qids.map(function (qid, i) {
      var q = K.Q[qid], cls = ["mapa-item"];
      if (i === sim.pos) cls.push("atual");
      if (q.anulada) cls.push("anulada");
      else if (sim.resp[qid]) cls.push("feita");
      if (sim.marc[qid]) cls.push("marcada");
      var estado = q.anulada ? "anulada" : sim.resp[qid] ? "respondida" : "em branco";
      return '<li><button type="button" class="' + cls.join(" ") + '" data-acao="sim-ir" data-pos="' + i + '"' + (i === sim.pos ? ' aria-current="true"' : "") +
        ' title="Questão ' + (i + 1) + ": " + estado + (sim.marc[qid] ? ", marcada para revisão" : "") + '">' + (i + 1) + "</button></li>";
    }).join("");
  };

  T.simulado = function () {
    var sim = S.sim;
    if (!sim) {
      return '<section class="contem bloco"><div class="vazio"><p>Não há simulado em andamento.</p><a class="btn btn-primario" href="' + K.url("simulados") + '">Escolher um simulado</a></div></section>';
    }
    var q = K.Q[sim.qids[sim.pos]];
    var feitas = Object.keys(sim.resp).length;
    return '<div class="sim">' +
      '<div class="sim-barra"><div class="contem sim-barra-dentro">' +
      '<p class="sim-nome">' + esc(sim.titulo) + "</p>" +
      '<p class="sim-relogio" id="sim-relogio">' + IC.relogio + '<span id="sim-tempo" role="timer">--:--:--</span><span class="sim-relogio-rotulo">' + (sim.limite ? "restantes" : "de prova") + "</span></p>" +
      '<p class="sim-prog"><b id="sim-feitas">' + feitas + "</b> de " + sim.qids.length + " respondidas</p>" +
      '<button type="button" class="btn btn-destaque" data-acao="sim-finalizar">Finalizar e corrigir</button>' +
      "</div></div>" +
      '<div class="contem sim-grade">' +
      '<div class="sim-questao" id="sim-questao">' + K.cartaoSimulado(q) + "</div>" +
      '<aside class="sim-lado"><h2>Mapa da prova</h2>' +
      '<ol class="mapa" id="sim-mapa">' + K.mapaSimulado() + "</ol>" +
      '<ul class="mapa-legenda"><li><span class="mapa-item feita"></span>Respondida</li><li><span class="mapa-item"></span>Em branco</li><li><span class="mapa-item marcada"></span>Para revisão</li></ul>' +
      '<div class="sim-lado-acoes"><a class="btn btn-fantasma btn-bloco" href="' + K.url("simulados") + '">Sair e continuar depois</a>' +
      '<button type="button" class="btn btn-texto btn-bloco" data-acao="sim-descartar">Descartar simulado</button></div>' +
      "</aside></div></div>";
  };

  T.resultado = function (rota) {
    var s = K.simulado(rota.params.id);
    if (!s || !s.total) {
      return '<section class="contem bloco"><div class="vazio"><p>Este resultado não existe mais.</p><a class="btn btn-primario" href="' + K.url("simulados") + '">Voltar aos simulados</a></div></section>';
    }
    var so = rota.params.ver === "erros";
    var porDisc = {}, ordem = [];
    s.qids.forEach(function (qid) {
      var q = K.Q[qid];
      if (!q) return;
      if (!porDisc[q.disc]) { porDisc[q.disc] = { total: 0, ac: 0 }; ordem.push(q.disc); }
      porDisc[q.disc].total++;
      if (q.anulada || s.resp[qid] === q.gab) porDisc[q.disc].ac++;
    });
    var brancos = s.qids.filter(function (qid) { var q = K.Q[qid]; return q && !q.anulada && (!s.resp[qid] || s.resp[qid] === "-"); }).length;
    var nota = K.pct(s.ac, s.total);

    var linhas = ordem.map(function (d) {
      var e = porDisc[d], p = K.pct(e.ac, e.total);
      return '<tr><th scope="row">' + esc(d) + '</th><td class="num">' + e.ac + " de " + e.total + '</td><td class="barra-celula"><div class="barra"><span style="width:' + p + '%"></span></div><span class="barra-valor">' + p + "%</span></td></tr>";
    }).join("");

    var itens = s.qids.map(function (qid, i) {
      var q = K.Q[qid];
      if (!q) return "";
      var letra = s.resp[qid] || "-";
      var estado = q.anulada ? "anulada" : letra === q.gab ? "certa" : letra === "-" ? "branco" : "errada";
      if (so && (estado === "certa" || estado === "anulada")) return "";
      var rot = estado === "certa" ? ["selo-certo", IC.certo, "Certa"] : estado === "errada" ? ["selo-erro", IC.errado, "Errada"] : estado === "branco" ? ["selo-erro", IC.errado, "Em branco"] : ["selo-neutro", "", "Anulada"];
      return '<details class="correcao"><summary><span class="correcao-num">' + (i + 1) + "</span>" +
        '<span class="correcao-disc">' + esc(K.PROVA[q.prova].sigla) + " " + q.n + ", " + esc(q.disc) + "</span>" +
        '<span class="correcao-resp">' + (q.anulada ? "" : "Você: <b>" + (letra === "-" ? "em branco" : esc(letra)) + "</b>, gabarito: <b>" + q.gab + "</b>") + "</span>" +
        '<span class="selo ' + rot[0] + '">' + rot[1] + rot[2] + "</span>" + IC.seta + "</summary>" + cartaoCorrecao(q, letra) + "</details>";
    }).join("");

    return '<section class="contem bloco">' +
      '<div class="cabeca"><h1>Resultado do simulado</h1><p class="sub">' + esc(s.titulo) + ". Concluído em " + K.fmtData(s.t) + ", em " + K.fmtDuracao(s.dur || 0) + ".</p></div>" +
      '<div class="cifras">' +
      '<div class="cifra"><span class="cifra-rotulo">Acertos</span><span class="cifra-valor">' + s.ac + '<small> de ' + s.total + '</small></span><span class="cifra-nota">' + (s.anul ? "inclui " + K.plural(s.anul, "anulada", "anuladas") : "nenhuma anulada") + "</span></div>" +
      '<div class="cifra"><span class="cifra-rotulo">Nota</span><span class="cifra-valor">' + nota + '%</span><span class="cifra-nota">' + (brancos ? K.plural(brancos, "questão em branco", "questões em branco") : "nenhuma em branco") + "</span></div>" +
      '<div class="cifra"><span class="cifra-rotulo">Pontos na liga</span><span class="cifra-valor">+' + (s.pts || 0) + '</span><span class="cifra-nota">ganhos neste simulado</span></div>' +
      '<div class="cifra"><span class="cifra-rotulo">Tempo de prova</span><span class="cifra-valor cifra-valor-m">' + K.fmtDuracao(s.dur || 0) + '</span><span class="cifra-nota">' + (s.limite ? "limite de " + K.fmtDuracao(s.limite) : "sem limite") + "</span></div>" +
      "</div>" +
      "<h2>Acertos por disciplina</h2>" +
      '<div class="tabela-rolagem"><table class="tabela tabela-barras"><thead><tr><th scope="col">Disciplina</th><th scope="col" class="num">Acertos</th><th scope="col">Aproveitamento</th></tr></thead><tbody>' + linhas + "</tbody></table></div>" +
      '<div class="cabeca-linha"><h2>Correção</h2><nav class="segmentos segmentos-p" aria-label="Quais questões mostrar">' +
      '<a class="' + (so ? "" : "ativo") + '"' + (so ? "" : ' aria-current="true"') + ' href="' + K.url("resultado", { id: s.id }) + '">Todas</a>' +
      '<a class="' + (so ? "ativo" : "") + '"' + (so ? ' aria-current="true"' : "") + ' href="' + K.url("resultado", { id: s.id, ver: "erros" }) + '">Só erros e brancos</a></nav></div>' +
      (itens ? '<div class="correcoes">' + itens + "</div>" : '<p class="nota">Nada para rever aqui: você acertou tudo.</p>') +
      '<div class="rodape-acoes"><a class="btn btn-primario" href="' + K.url("simulados") + '">Novo simulado</a>' +
      '<button type="button" class="btn btn-texto" data-acao="sim-excluir" data-id="' + esc(s.id) + '">Excluir este resultado</button></div>' +
      "</section>";
  };

  /* ============================================================
   * REDAÇÃO
   * ============================================================ */
  T.redacao = function (rota) {
    var R = BANCO.redacao;
    var id = rota.params.tema === "B" ? "B" : "A";
    var tema = R.temas.filter(function (t) { return t.id === id; })[0];
    var rascunho = K.lerLocal("redacao:" + S.usuario.uid + ":" + id, "");

    var textos = tema.textos.map(function (t) {
      return "<li><h4>" + esc(t.rotulo) + ": " + esc(t.titulo) + "</h4><p>" + esc(t.resumo) + '</p><a href="' + esc(t.fonte) + '" target="_blank" rel="noopener noreferrer">Abrir a fonte original</a></li>';
    }).join("");

    return '<section class="contem bloco pagina-redacao">' +
      '<div class="cabeca"><h1>Redação</h1><p class="sub">' + esc(R.aviso) + " Escolha um tema e treine na folha abaixo.</p></div>" +
      '<nav class="segmentos" aria-label="Temas da redação">' +
      R.temas.map(function (t) {
        return '<a class="' + (t.id === id ? "ativo" : "") + '"' + (t.id === id ? ' aria-current="page"' : "") + ' href="' + K.url("redacao", { tema: t.id }) + '">Tema ' + t.id + "</a>";
      }).join("") + "</nav>" +
      '<div class="redacao-grade"><div class="redacao-principal">' +
      '<div class="tema"><p class="tema-rotulo">Tema ' + tema.id + '</p><h2 class="tema-titulo">' + esc(tema.titulo) + "</h2><p>" + esc(tema.comando) + "</p></div>" +
      '<div class="folha-caixa">' +
      '<div class="folha-topo"><label for="folha">Sua redação</label><p class="folha-conta" id="folha-conta" aria-live="polite"></p></div>' +
      '<div class="folha"><textarea id="folha" data-tema="' + id + '" data-muda="redigir" spellcheck="true" placeholder="Escreva aqui. O rascunho fica guardado neste aparelho.">' + esc(rascunho) + "</textarea></div>" +
      '<div class="folha-medidor" id="folha-medidor" aria-hidden="true"></div>' +
      '<div class="questao-acoes"><button type="button" class="btn btn-fantasma" data-acao="redacao-copiar">Copiar o texto</button>' +
      '<button type="button" class="btn btn-texto" data-acao="redacao-limpar">Apagar o rascunho</button></div>' +
      '<p class="nota">A contagem de linhas é uma estimativa para letra de tamanho médio numa folha de 30 linhas. Na prova, o que vale é a folha manuscrita.</p></div>' +
      "</div>" +
      '<aside class="redacao-lado">' +
      "<h3>Textos motivadores</h3><p class=\"nota\">Resumo de cada texto de apoio, com o link da fonte. O texto completo está no caderno de prova.</p>" +
      '<ol class="motivadores">' + textos + "</ol>" +
      "<h3>Regras da prova</h3><ul class=\"lista-pontos\">" + R.regras.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" +
      "<h3>O que a banca avalia</h3><dl class=\"criterios\">" + R.criterios.map(function (c) { return "<dt>" + esc(c.nome) + "</dt><dd>" + esc(c.desc) + "</dd>"; }).join("") + "</dl>" +
      "<details class=\"dobra\"><summary>Quando a redação leva nota zero" + IC.seta + "</summary><p>Leva nota zero a redação que:</p><ul class=\"lista-pontos\">" + R.zero.map(function (z) { return "<li>" + esc(z) + "</li>"; }).join("") + "</ul></details>" +
      "</aside></div></section>";
  };

  /* ============================================================
   * CLASSIFICAÇÃO
   * ============================================================ */
  T.ranking = function () {
    return '<section class="contem bloco pagina-ranking">' +
      '<div class="cabeca cabeca-linha"><div><h1>Classificação da liga</h1>' +
      '<p class="sub">Vale a soma dos pontos. No empate, fica na frente quem tem mais acertos de primeira.</p></div>' +
      '<button type="button" class="btn btn-fantasma" data-acao="ranking-atualizar">Atualizar</button></div>' +
      (S.backend.modo === "local" ? '<p class="nota nota-caixa">Modo demonstração: aqui só aparecem as contas criadas neste navegador. Com o banco de dados online ligado, a classificação junta todo mundo.</p>' : "") +
      '<div id="ranking-corpo"><p class="carregando">Carregando a classificação…</p></div></section>';
  };

  K.htmlRanking = function (lista) {
    if (!lista.length) {
      return '<div class="vazio"><p>Ninguém pontuou ainda. Responda a primeira questão e assuma a liderança.</p><a class="btn btn-primario" href="' + K.url("questoes") + '">Ir para as questões</a></div>';
    }
    var eu = S.usuario ? S.usuario.uid : null;
    var podio = "";
    lista = lista.map(K.arrumarEntrada);
    if (lista.length >= 3) {
      podio = '<ol class="podio">' + [1, 0, 2].map(function (i) {
        var e = lista[i], pat = K.patenteDe(e.pontos);
        return '<li class="podio-' + (i + 1) + (e.uid === eu ? " eu" : "") + '"><span class="podio-pos">' + (i + 1) + "º</span>" +
          K.insignia(pat.nivel, 24) +
          '<span class="podio-nome">' + esc(e.nome || "Competidor") + "</span>" +
          '<span class="podio-pat">' + esc(pat.nome) + "</span>" +
          '<span class="podio-pts">' + fmtNum(e.pontos || 0) + " pts</span></li>";
      }).join("") + "</ol>";
    }
    var linhas = lista.map(function (e, i) {
      var pat = K.patenteDe(e.pontos);
      return '<tr class="' + (e.uid === eu ? "eu" : "") + '"><td class="num pos">' + (i + 1) + "º</td>" +
        '<th scope="row"><span class="rk-nome">' + esc(e.nome || "Competidor") + (e.uid === eu ? ' <span class="selo selo-neutro">você</span>' : "") + "</span>" +
        '<span class="rk-pat-movel">' + K.insignia(pat.nivel, 15) + esc(pat.nome) + "</span></th>" +
        '<td class="rk-pat col-pat">' + K.insignia(pat.nivel, 18) + "<span>" + esc(pat.nome) + "</span></td>" +
        '<td class="num forte">' + fmtNum(e.pontos || 0) + "</td>" +
        '<td class="num col-extra">' + (e.resp || 0) + "</td>" +
        '<td class="num col-extra">' + K.pct(e.ac || 0, e.resp || 0) + "%</td>" +
        '<td class="num col-extra">' + (typeof e.sim === "number" ? e.sim + "%" : "sem prova") + "</td></tr>";
    }).join("");
    return podio + '<div class="tabela-rolagem"><table class="tabela tabela-ranking"><thead><tr>' +
      '<th scope="col" class="num">Posição</th><th scope="col">Competidor</th><th scope="col" class="col-pat">Patente</th><th scope="col" class="num">Pontos</th>' +
      '<th scope="col" class="num col-extra">Respondidas</th><th scope="col" class="num col-extra">De primeira</th><th scope="col" class="num col-extra">Melhor prova</th>' +
      "</tr></thead><tbody>" + linhas + "</tbody></table></div>";
  };

  /* ============================================================
   * DESEMPENHO
   * ============================================================ */
  T.desempenho = function () {
    var e = K.estatisticas(), prox = e.proxima;
    var cifras = '<div class="cifras">' +
      '<div class="cifra"><span class="cifra-rotulo">Pontos na liga</span><span class="cifra-valor">' + fmtNum(e.pontos) + '</span><span class="cifra-nota">de ' + fmtNum(K.MAX_PONTOS) + " possíveis</span></div>" +
      '<div class="cifra"><span class="cifra-rotulo">Questões respondidas</span><span class="cifra-valor">' + e.respondidas + "<small> de " + e.total + '</small></span><span class="cifra-nota">' + (e.total - e.respondidas) + " ainda por fazer</span></div>" +
      '<div class="cifra"><span class="cifra-rotulo">Acertos de primeira</span><span class="cifra-valor">' + (e.respondidas ? e.aproveitamento + "%" : "0%") + '</span><span class="cifra-nota">' + e.primeira + " de " + e.respondidas + " respondidas</span></div>" +
      '<div class="cifra"><span class="cifra-rotulo">Erros para rever</span><span class="cifra-valor">' + e.pendentes + '</span><span class="cifra-nota">' +
      (e.pendentes ? '<a href="' + K.url("questoes", { sit: "erros" }) + '">Abrir o caderno de erros</a>' : "nenhum pendente") + "</span></div></div>";

    var patente = '<div class="patente-painel">' + K.insignia(e.patente.nivel, 40) +
      '<div class="patente-painel-texto"><p class="patente-painel-nome">' + esc(e.patente.nome) + "</p>" +
      (prox
        ? "<p>Faltam " + fmtNum(prox.min - e.pontos) + " pontos para " + esc(prox.nome) + ".</p>" + medidor(e.pontos - e.patente.min, prox.min - e.patente.min, "Avanço até " + prox.nome)
        : "<p>Última patente da liga.</p>" + medidor(1, 1, "Patente máxima")) +
      "</div></div>";

    var linhas = K.DISCIPLINAS.map(function (d) {
      var x = e.porDisc[d], p = K.pct(x.primeira, x.resp);
      return '<tr><th scope="row"><a href="' + K.url("questoes", { disc: d }) + '">' + esc(d) + "</a></th>" +
        '<td class="num">' + x.resp + " de " + x.total + '</td><td class="num col-extra">' + x.primeira + '</td><td class="num col-extra">' +
        (x.pendentes ? '<a href="' + K.url("questoes", { disc: d, sit: "erros" }) + '">' + x.pendentes + "</a>" : "0") + "</td>" +
        '<td class="barra-celula">' + (x.resp ? '<div class="barra"><span style="width:' + p + '%"></span></div><span class="barra-valor">' + p + "%</span>" : '<span class="barra-vazia">sem respostas</span>') + "</td></tr>";
    }).join("");

    var provas = BANCO.provas.map(function (pv) {
      var x = e.porProva[pv.id];
      return '<div class="avanco"><div class="avanco-topo"><h3>' + esc(pv.nome) + "</h3><span>" + x.resp + " de " + x.total + " respondidas, " + K.pct(x.primeira, x.resp) + "% de primeira</span></div>" +
        medidor(x.resp, x.total, x.resp + " de " + x.total + " questões respondidas") + "</div>";
    }).join("");

    var hist = K.simulados(), sims;
    if (!hist.length) {
      sims = '<p class="nota">Você ainda não concluiu nenhum simulado. <a href="' + K.url("simulados") + '">Fazer o primeiro</a>.</p>';
    } else {
      sims = '<div class="tabela-rolagem"><table class="tabela"><thead><tr><th scope="col">Data</th><th scope="col">Simulado</th><th scope="col" class="num">Acertos</th><th scope="col" class="num">Nota</th><th scope="col"><span class="sr">Ações</span></th></tr></thead><tbody>' +
        hist.slice(0, 8).map(function (s) {
          return "<tr><td>" + K.fmtDia(s.t) + "</td><td>" + esc(s.titulo) + '</td><td class="num">' + s.ac + " de " + s.total + '</td><td class="num forte">' + K.pct(s.ac, s.total) + '%</td><td class="acoes-celula"><a href="' + K.url("resultado", { id: s.id }) + '">Ver correção</a></td></tr>';
        }).join("") + "</tbody></table></div>";
    }

    return '<section class="contem bloco pagina-desempenho">' +
      '<div class="cabeca"><h1>Desempenho</h1><p class="sub">Os números contam só as ' + e.total + " questões válidas. As anuladas ficam de fora.</p></div>" +
      cifras + patente +
      "<h2>Aproveitamento por disciplina</h2>" +
      '<div class="tabela-rolagem"><table class="tabela tabela-barras"><thead><tr><th scope="col">Disciplina</th><th scope="col" class="num">Respondidas</th><th scope="col" class="num col-extra">De primeira</th><th scope="col" class="num col-extra">Erros pendentes</th><th scope="col">Acertos de primeira</th></tr></thead><tbody>' + linhas + "</tbody></table></div>" +
      "<h2>Avanço por prova</h2>" + '<div class="avancos">' + provas + "</div>" +
      "<h2>Últimos simulados</h2>" + sims + "</section>";
  };

  /* ============================================================
   * PERFIL
   * ============================================================ */
  T.perfil = function () {
    var u = S.usuario, online = S.backend.modo === "firebase";
    var e = K.estatisticas();
    var verificacao = "";
    if (online && u.provedor === "senha" && !u.emailVerificado) {
      verificacao = '<div class="destaque-caixa destaque-aviso"><div><h2>Confirme o seu e-mail</h2><p>Enviamos um link para ' + esc(u.email) + ". Abra a mensagem e clique no link para confirmar que o Gmail é seu.</p></div>" +
        '<div class="destaque-acoes"><button type="button" class="btn btn-primario" data-acao="verificacao-conferir">Já confirmei</button><button type="button" class="btn btn-texto" data-acao="verificacao-reenviar">Reenviar o e-mail</button></div></div>';
    }
    var senha;
    if (u.provedor === "google") {
      senha = '<section class="painel"><h2>Senha</h2><p class="nota">Você entra com a sua Conta Google. A senha é a do Google e se troca lá.</p></section>';
    } else {
      senha = '<section class="painel"><h2>Trocar a senha</h2><form class="form" data-form="senha" novalidate>' +
        '<label class="campo"><span class="campo-rotulo">Senha atual</span><input type="password" name="atual" autocomplete="current-password" required></label>' +
        '<label class="campo"><span class="campo-rotulo">Nova senha</span><input type="password" name="nova" autocomplete="new-password" required minlength="' + (K.cfg.senhaMinima || 8) + '"><span class="campo-dica">Pelo menos ' + (K.cfg.senhaMinima || 8) + " caracteres.</span></label>" +
        '<label class="campo"><span class="campo-rotulo">Repita a nova senha</span><input type="password" name="nova2" autocomplete="new-password" required></label>' +
        '<p class="form-erro" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-primario">Trocar a senha</button></form></section>';
    }
    return '<section class="contem bloco pagina-perfil">' +
      '<div class="cabeca"><h1>Perfil</h1></div>' + verificacao +
      '<div class="perfil-grade">' +
      '<section class="painel"><h2>Seus dados</h2>' +
      '<div class="perfil-patente">' + K.insignia(e.patente.nivel, 34) + "<div><p class=\"perfil-patente-nome\">" + esc(e.patente.nome) + "</p><p>" + fmtNum(e.pontos) + " pontos na liga</p></div></div>" +
      '<form class="form" data-form="nome" novalidate>' +
      '<label class="campo"><span class="campo-rotulo">Nome de guerra</span><input type="text" name="nome" maxlength="40" required value="' + esc(u.nome) + '"><span class="campo-dica">É o nome que aparece na classificação.</span></label>' +
      '<label class="campo"><span class="campo-rotulo">E-mail</span><input type="email" value="' + esc(u.email) + '" readonly></label>' +
      '<p class="form-erro" role="alert" hidden></p>' +
      '<button type="submit" class="btn btn-primario">Salvar o nome</button></form></section>' +
      senha +
      '<section class="painel"><h2>Progresso</h2><p>Você respondeu ' + e.respondidas + " de " + e.total + " questões e concluiu " + K.plural(K.simulados().length, "simulado", "simulados") + ".</p>" +
      '<button type="button" class="btn btn-fantasma" data-acao="zerar-progresso">Zerar meu progresso</button>' +
      '<p class="nota">Apaga respostas, favoritas e simulados, e leva a sua pontuação a zero. Não dá para desfazer.</p></section>' +
      '<section class="painel"><h2>Conta</h2>' +
      '<div class="questao-acoes"><button type="button" class="btn btn-fantasma" data-acao="sair">Sair da conta</button>' +
      '<button type="button" class="btn btn-texto btn-perigo" data-acao="excluir-conta">Excluir minha conta</button></div></section>' +
      "</div></section>";
  };

  /* ============================================================
   * SOBRE
   * ============================================================ */
  T.sobre = function () {
    var linhas = K.PATENTES.map(function (p) {
      return "<tr><td>" + K.insignia(p.nivel, 20) + '</td><th scope="row">' + esc(p.nome) + '</th><td class="num">' + (p.min ? "a partir de " + fmtNum(p.min) + " pontos" : "ponto de partida") + "</td></tr>";
    }).join("");
    return '<section class="contem bloco pagina-sobre"><div class="cabeca"><h1>Sobre a liga</h1></div>' +
      '<div class="duas-colunas"><div class="prosa">' +
      "<h2>O que é</h2>" +
      "<p>A Khaos League Championship é um campeonato de resolução de questões para quem se prepara para o Curso de Formação de Oficiais da Polícia Militar e do Corpo de Bombeiros Militar da Bahia.</p>" +
      "<p>O banco reúne as " + BANCO.questoes.length + " questões objetivas das provas de CFO da PMBA e do CBMBA de 2025, aplicadas pela UNEB, com o gabarito que consta nos cadernos. As questões anuladas pela banca aparecem marcadas e não pontuam.</p>" +
      "<h2>Pontuação</h2>" +
      "<p>Acertar na primeira tentativa vale " + K.PONTOS.primeira + " pontos. Quem erra pode tentar mais uma vez sem ver o gabarito, valendo " + K.PONTOS.segunda + ". Cada questão pontua uma única vez; depois, vira treino. No simulado, as respostas entram na pontuação quando você finaliza, e questão em branco conta como erro.</p>" +
      "<h2>Seus dados</h2>" +
      (S.backend.modo === "firebase"
        ? "<p>A conta é criada com o seu e-mail e uma senha, guardados pelo serviço de autenticação do Google Firebase. O site guarda o seu nome de guerra, as respostas e os resultados dos simulados. Na classificação aparecem só o nome de guerra e os números; o e-mail nunca é mostrado. Você pode apagar tudo no Perfil.</p>"
        : "<p>O site está em modo demonstração: contas e respostas ficam guardadas só neste navegador, sem envio para servidor nenhum. Limpar os dados do navegador apaga tudo.</p>") +
      "<h2>Aviso</h2>" +
      "<p>Site independente de estudos, sem vínculo com a Polícia Militar da Bahia, o Corpo de Bombeiros Militar da Bahia ou a UNEB. Os textos usados nas questões pertencem aos seus autores e aparecem com a fonte indicada na prova.</p>" +
      "<h2>Direitos autorais</h2>" +
      "<p>© 2026 Ronie Khaos Sousa Barbosa. Todos os direitos reservados. O código, o visual, os textos da interface e o emblema deste site não podem ser copiados, modificados ou redistribuídos sem autorização por escrito do titular.</p>" +
      "<p>As questões e os textos das provas pertencem aos respectivos titulares. O site usa a biblioteca Firebase, do Google (licença Apache 2.0), e as fontes Big Shoulders e Public Sans (licença SIL Open Font 1.1).</p>" +
      "</div><div><h2>Patentes da liga</h2>" +
      '<table class="tabela tabela-patentes"><tbody>' + linhas + "</tbody></table>" +
      '<p class="nota">O total possível hoje é de ' + fmtNum(K.MAX_PONTOS) + " pontos (" + K.VALIDAS.length + " questões válidas).</p></div></div></section>";
  };

  T.carregando = function () {
    return '<section class="contem bloco"><p class="carregando">Carregando…</p></section>';
  };

  T.falha = function (mensagem) {
    return '<section class="contem bloco"><div class="vazio"><p>' + esc(mensagem) + '</p><button type="button" class="btn btn-primario" data-acao="recarregar">Tentar de novo</button></div></section>';
  };

  K.fmtNum = fmtNum;
  K.POR_PAGINA = POR_PAGINA;
})();
