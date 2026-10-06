/* ============================================================
 * Khaos League Championship - CFO
 * Copyright (c) 2026 Ronie Khaos Sousa Barbosa. Todos os direitos reservados.
 * app.js — navegação entre as abas, cliques, formulários e simulado
 * ============================================================ */
(function () {
  "use strict";

  var K = window.KLC, S = K.S, T = K.telas, esc = K.esc, $ = K.$, $$ = K.$$, BANCO = K.banco;
  var NOME_SITE = "Khaos League Championship - CFO";

  var ROTAS = {
    inicio: { titulo: "Início", livre: true },
    entrar: { titulo: "Entrar", livre: true, visitante: true },
    cadastro: { titulo: "Criar conta", livre: true, visitante: true },
    questoes: { titulo: "Questões" },
    simulados: { titulo: "Simulados" },
    simulado: { titulo: "Simulado em andamento", menu: "simulados" },
    resultado: { titulo: "Resultado do simulado", menu: "simulados" },
    redacao: { titulo: "Redação" },
    ranking: { titulo: "Classificação" },
    desempenho: { titulo: "Desempenho" },
    perfil: { titulo: "Perfil" },
    sobre: { titulo: "Sobre a liga", livre: true }
  };
  var MENU = [["inicio", "Início"], ["questoes", "Questões"], ["simulados", "Simulados"], ["redacao", "Redação"], ["ranking", "Classificação"], ["desempenho", "Desempenho"]];

  /* ---------- rotas (ficam depois do # no endereço) ---------- */
  function decodificar(s) { try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch (e) { return s; } }

  function lerRota() {
    var h = location.hash.replace(/^#\/?/, "");
    var corte = h.indexOf("?");
    var nome = corte < 0 ? h : h.slice(0, corte);
    var params = {};
    (corte < 0 ? "" : h.slice(corte + 1)).split("&").forEach(function (par) {
      if (!par) return;
      var i = par.indexOf("=");
      params[decodificar(i < 0 ? par : par.slice(0, i))] = i < 0 ? "" : decodificar(par.slice(i + 1));
    });
    if (!ROTAS[nome]) nome = "inicio";
    return { nome: nome, params: params };
  }

  K.ir = function (nome, params) {
    var destino = K.url(nome, params);
    if (location.hash === destino) renderizar(); else location.hash = destino;
  };

  /* ---------- topo ---------- */
  function pintarTopo(rota) {
    var ativo = (ROTAS[rota.nome] && ROTAS[rota.nome].menu) || rota.nome;
    $("#nav").innerHTML = MENU.map(function (m) {
      return '<a href="' + K.url(m[0]) + '"' + (m[0] === ativo ? ' aria-current="page"' : "") + ">" + m[1] + "</a>";
    }).join("") + (S.usuario && !S.carregando
      ? '<span class="nav-separa" aria-hidden="true"></span><a class="nav-extra" href="' + K.url("perfil") + '"' + (rota.nome === "perfil" ? ' aria-current="page"' : "") + '>Perfil</a>' +
        '<button type="button" class="nav-extra" data-acao="sair">Sair da conta</button>'
      : "");
    var conta = $("#topo-conta");
    if (S.carregando) { conta.innerHTML = ""; }
    else if (S.usuario) {
      var pat = K.patenteDe(S.dados ? K.estatisticas().pontos : 0);
      conta.innerHTML = '<a class="conta" href="' + K.url("perfil") + '"' + (rota.nome === "perfil" ? ' aria-current="page"' : "") + ' title="Perfil: ' + esc(pat.nome) + '">' +
        K.insignia(pat.nivel, 18) + '<span class="conta-nome">' + esc(S.usuario.nome) + "</span></a>" +
        '<button type="button" class="btn-icone btn-icone-claro" data-acao="sair" title="Sair da conta"><span class="sr">Sair da conta</span>' + K.IC.sair + "</button>";
    } else {
      conta.innerHTML = '<a class="btn btn-claro btn-p" href="' + K.url("entrar") + '">Entrar</a>' +
        '<a class="btn btn-destaque btn-p" href="' + K.url("cadastro") + '">Criar conta</a>';
    }
    var demo = $("#faixa-demo");
    if (demo) demo.hidden = !(S.backend && S.backend.modo === "local");
    fecharMenu();
  }

  function fecharMenu() {
    var topo = $(".topo"), botao = $(".topo-menu");
    if (topo) topo.classList.remove("menu-aberto");
    if (botao) botao.setAttribute("aria-expanded", "false");
  }

  /* ---------- desenhar a aba atual ---------- */
  var ultimaRota = "";

  function renderizar() {
    var rota = lerRota(), def = ROTAS[rota.nome], main = $("#conteudo");
    pararRelogio();
    if (S.carregando || !S.backend) {
      main.innerHTML = T.carregando();
      pintarTopo(rota);
      return;
    }
    if (!def.livre && !S.usuario) {
      location.replace(K.url("entrar", { volta: rota.nome === "simulado" || rota.nome === "resultado" ? "simulados" : rota.nome }));
      return;
    }
    if (def.visitante && S.usuario) {
      var volta = rota.params.volta;
      location.replace(K.url(ROTAS[volta] && !ROTAS[volta].visitante ? volta : "inicio"));
      return;
    }
    if (S.falhaDados && S.usuario && !def.livre) {
      main.innerHTML = T.falha("Não deu para carregar o seu progresso: " + S.falhaDados);
      pintarTopo(rota);
      return;
    }
    main.innerHTML = T[rota.nome](rota);
    document.title = (rota.nome === "inicio" ? "" : def.titulo + " | ") + NOME_SITE;
    pintarTopo(rota);
    document.body.setAttribute("data-rota", rota.nome);

    var chave = rota.nome + "?" + JSON.stringify(rota.params);
    if (chave !== ultimaRota) window.scrollTo(0, 0);
    ultimaRota = chave;

    if (rota.nome === "simulado" && S.sim) iniciarRelogio();
    if (rota.nome === "simulados") contarDisponiveis();
    if (rota.nome === "redacao") contarLinhas();
    if (rota.nome === "ranking") carregarRanking(false);
    if (rota.nome === "questoes") {
      var caixa = $(".filtros-caixa");
      if (caixa && window.matchMedia("(max-width: 899px)").matches && !focoFiltro) caixa.open = false;
      if (focoFiltro) {
        var campo = main.querySelector('.filtros [name="' + focoFiltro + '"]:checked') || main.querySelector('.filtros [name="' + focoFiltro + '"]');
        focoFiltro = "";
        if (campo) campo.focus({ preventScroll: true });
      }
    }
  }

  /* espera uma promessa, mas no máximo "ms" */
  function semDemora(promessa, ms) {
    return Promise.race([promessa, new Promise(function (ok) { setTimeout(ok, ms); })]);
  }

  /* ---------- questões (aba Questões) ---------- */
  function cartaoDe(el) { return el.closest(".questao"); }

  function repintar(qid) {
    var antigo = document.getElementById("q-" + qid);
    if (!antigo) return null;
    var det = antigo.querySelector(".texto-base");
    var opc = { textoAberto: det ? det.open : false };
    var html = antigo.getAttribute("data-modo") === "simulado" ? K.cartaoSimulado(K.Q[qid], opc) : K.cartaoPratica(K.Q[qid], opc);
    antigo.outerHTML = html;
    return document.getElementById("q-" + qid);
  }

  function pintarPlacar() {
    var caixa = $("#placar");
    if (caixa) caixa.outerHTML = K.htmlPlacar(K.estatisticas());
  }

  function chaveUi(cartao) {
    var qid = cartao.getAttribute("data-qid");
    return cartao.getAttribute("data-modo") === "simulado" ? "sim:" + qid : qid;
  }

  var acoes = {
    menu: function (el) {
      var topo = $(".topo"), aberto = topo.classList.toggle("menu-aberto");
      el.setAttribute("aria-expanded", aberto ? "true" : "false");
    },

    sair: function () {
      semDemora(K.temRankingPendente() ? K.publicarRanking() : Promise.resolve(), 1200).then(function () {
        return S.backend.sair();
      }).then(function () {
        K.aviso("Você saiu da conta.");
        K.ir("inicio");
      }, function (e) { K.aviso(e.message, "erro"); });
    },

    recarregar: function () { location.reload(); },

    "mostrar-senha": function (el) {
      var campo = el.parentNode.querySelector("input");
      var mostrar = campo.type === "password";
      campo.type = mostrar ? "text" : "password";
      el.setAttribute("aria-pressed", mostrar ? "true" : "false");
      el.title = mostrar ? "Esconder a senha" : "Mostrar a senha";
    },

    "esqueci-senha": function (el) {
      var form = el.closest("form"), email = form.elements.email.value.trim();
      if (!email) { erroForm(form, "Digite o seu e-mail no campo acima e clique de novo em “Esqueci minha senha”."); form.elements.email.focus(); return; }
      erroForm(form, "");
      el.disabled = true;
      S.backend.recuperarSenha(email).then(function () {
        K.aviso("Se existir uma conta com esse e-mail, o link para criar uma nova senha chega em instantes.", "ok");
      }, function (e) { erroForm(form, e.message); }).then(function () { el.disabled = false; });
    },

    "entrar-google": function (el) {
      el.disabled = true;
      S.backend.entrarGoogle().then(function () {
        K.aviso("Login feito com o Google.", "ok");
      }, function (e) { K.aviso(e.message, "erro"); }).then(function () { el.disabled = false; });
    },

    riscar: function (el) {
      var cartao = cartaoDe(el), chave = chaveUi(cartao), letra = el.getAttribute("data-letra");
      var ui = S.ui[chave] || (S.ui[chave] = {});
      ui.riscadas = ui.riscadas || {};
      ui.riscadas[letra] = !ui.riscadas[letra];
      el.setAttribute("aria-pressed", ui.riscadas[letra] ? "true" : "false");
      el.closest(".alt").classList.toggle("alt-riscada", !!ui.riscadas[letra]);
    },

    responder: function (el) {
      var cartao = cartaoDe(el), qid = cartao.getAttribute("data-qid");
      var ui = S.ui[qid] || {};
      var marcado = cartao.querySelector('input[type="radio"]:checked');
      var letra = marcado ? marcado.value : ui.sel;
      if (!letra) return;
      var antes = K.estatisticas();
      var res = K.responder(qid, letra);
      if (!res) return;
      S.ui[qid] = {};
      var novo = repintar(qid);
      pintarPlacar();
      var depois = K.estatisticas();
      if (depois.patente.nivel > antes.patente.nivel) {
        K.aviso("Promoção: agora você é " + depois.patente.nome + ".", "ok");
        pintarTopo(lerRota());
      } else if (res.ganhou) {
        K.aviso("+" + res.ganhou + " pontos na liga.", "ok");
      }
      if (novo) { var alvo = novo.querySelector(".questao-acoes .btn"); if (alvo) alvo.focus({ preventScroll: true }); }
    },

    refazer: function (el) {
      var qid = cartaoDe(el).getAttribute("data-qid");
      S.ui[qid] = { refazendo: true };
      var novo = repintar(qid);
      var primeiro = novo && novo.querySelector('input[type="radio"]:not(:disabled)');
      if (primeiro) primeiro.focus({ preventScroll: true });
    },

    "cancelar-refazer": function (el) {
      var qid = cartaoDe(el).getAttribute("data-qid");
      S.ui[qid] = {};
      repintar(qid);
    },

    "ver-gabarito": function (el) {
      var qid = cartaoDe(el).getAttribute("data-qid");
      K.revelarGabarito(qid);
      repintar(qid);
    },

    favoritar: function (el) {
      var qid = cartaoDe(el).getAttribute("data-qid");
      var agora = !K.favoritas()[qid];
      var parcial = { favoritas: {} };
      parcial.favoritas[qid] = agora ? 1 : null;
      K.salvar(parcial);
      el.setAttribute("aria-pressed", agora ? "true" : "false");
      el.title = agora ? "Tirar das favoritas" : "Guardar nas favoritas";
      el.querySelector(".sr").textContent = el.title;
    },

    /* ----- simulado ----- */
    "sim-ir": function (el) { irParaQuestao(parseInt(el.getAttribute("data-pos"), 10)); },
    "sim-anterior": function () { irParaQuestao(S.sim.pos - 1); },
    "sim-proxima": function () { irParaQuestao(S.sim.pos + 1); },
    "sim-marcar": function () {
      var qid = S.sim.qids[S.sim.pos];
      if (S.sim.marc[qid]) delete S.sim.marc[qid]; else S.sim.marc[qid] = 1;
      K.gravarSimLocal();
      repintar(qid);
      pintarMapa();
      var b = $('[data-acao="sim-marcar"]'); if (b) b.focus({ preventScroll: true });
    },
    "sim-limpar": function () {
      var qid = S.sim.qids[S.sim.pos];
      delete S.sim.resp[qid];
      K.gravarSimLocal();
      repintar(qid);
      pintarMapa();
    },
    "sim-finalizar": function () {
      var sim = S.sim;
      if (!sim) return;
      var respondiveis = sim.qids.filter(function (id) { return !K.Q[id].anulada; });
      var brancos = respondiveis.filter(function (id) { return !sim.resp[id]; }).length;
      K.confirmar({
        titulo: "Finalizar o simulado?",
        texto: brancos
          ? "Você deixou " + K.plural(brancos, "questão em branco", "questões em branco") + ". Em branco conta como erro e não dá para voltar depois de corrigir."
          : "Você respondeu todas as questões. Depois de corrigir não dá para mudar as respostas.",
        ok: "Finalizar e corrigir"
      }).then(function (r) { if (r.sim) finalizarSimulado(false); });
    },
    "sim-descartar": function () {
      K.confirmar({ titulo: "Descartar o simulado?", texto: "As respostas marcadas até aqui serão apagadas e nada entra na sua pontuação.", ok: "Descartar", perigo: true })
        .then(function (r) {
          if (!r.sim) return;
          pararRelogio();
          S.sim = null;
          K.gravarSimLocal();
          K.aviso("Simulado descartado.");
          K.ir("simulados");
        });
    },
    "sim-excluir": function (el) {
      var id = el.getAttribute("data-id");
      K.confirmar({ titulo: "Excluir este resultado?", texto: "Some do histórico. Os pontos que você ganhou neste simulado continuam valendo.", ok: "Excluir", perigo: true })
        .then(function (r) {
          if (!r.sim) return;
          var parcial = { simulados: {} };
          parcial.simulados[id] = null;
          K.salvar(parcial);
          K.agendarRanking();
          K.ir("simulados");
        });
    },

    /* ----- classificação ----- */
    "ranking-atualizar": function () { carregarRanking(true); },

    /* ----- redação ----- */
    "redacao-copiar": function () {
      var ta = $("#folha");
      if (!ta.value.trim()) { K.aviso("A folha está em branco."); return; }
      var feito = function () { K.aviso("Texto copiado.", "ok"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(feito, function () { ta.select(); document.execCommand("copy"); feito(); });
      } else { ta.select(); document.execCommand("copy"); feito(); }
    },
    "redacao-limpar": function () {
      var ta = $("#folha");
      if (!ta.value) return;
      K.confirmar({ titulo: "Apagar o rascunho?", texto: "O texto desta folha será apagado deste aparelho.", ok: "Apagar", perigo: true }).then(function (r) {
        if (!r.sim) return;
        ta.value = "";
        K.gravarLocal("redacao:" + S.usuario.uid + ":" + ta.getAttribute("data-tema"), null);
        contarLinhas();
      });
    },

    /* ----- perfil ----- */
    "verificacao-reenviar": function (el) {
      el.disabled = true;
      S.backend.reenviarVerificacao().then(function () {
        K.aviso("E-mail de confirmação reenviado. Olhe também a caixa de spam.", "ok");
      }, function (e) { K.aviso(e.message, "erro"); }).then(function () { el.disabled = false; });
    },
    "verificacao-conferir": function () {
      S.backend.recarregarUsuario().then(function (u) {
        if (u && u.emailVerificado) K.aviso("E-mail confirmado.", "ok");
        else K.aviso("Ainda não consta a confirmação. Abra o link que chegou no seu Gmail e tente de novo.");
      }, function (e) { K.aviso(e.message, "erro"); });
    },
    "zerar-progresso": function () {
      K.confirmar({ titulo: "Zerar o seu progresso?", texto: "Respostas, favoritas e simulados serão apagados e a sua pontuação volta a zero. Não dá para desfazer.", ok: "Zerar tudo", perigo: true })
        .then(function (r) {
          if (!r.sim) return;
          K.salvar({ respostas: null, favoritas: null, simulados: null });
          S.sim = null; K.gravarSimLocal();
          S.ui = {};
          K.publicarRanking();
          K.aviso("Progresso zerado.", "ok");
          renderizar();
        });
    },
    "excluir-conta": function () {
      var google = S.usuario.provedor === "google";
      K.confirmar({
        titulo: "Excluir a sua conta?",
        texto: "A conta, as respostas e a sua posição na classificação serão apagadas para sempre." + (google ? " O Google vai pedir que você confirme a conta." : ""),
        ok: "Excluir a conta", perigo: true, senha: !google
      }).then(function (r) {
        if (!r.sim) return;
        var uid = S.usuario.uid;
        S.backend.excluirConta(r.senha).then(function () {
          try { localStorage.removeItem("klc:sim:" + uid); localStorage.removeItem("klc:redacao:" + uid + ":A"); localStorage.removeItem("klc:redacao:" + uid + ":B"); } catch (e) { /* ignora */ }
          K.aviso("Conta excluída.", "ok");
          K.ir("inicio");
        }, function (e) { K.aviso(e.message, "erro"); });
      });
    }
  };

  /* ---------- mudanças em campos ---------- */
  function marcarSegmento(el) {
    var grupo = el.closest(".segmentos");
    if (!grupo) return;
    $$("label", grupo).forEach(function (l) { l.classList.toggle("ativo", l.contains(el)); });
  }

  var mudancas = {
    marcar: function (el) {
      var cartao = cartaoDe(el), qid = cartao.getAttribute("data-qid");
      if (cartao.getAttribute("data-modo") === "simulado") {
        S.sim.resp[qid] = el.value;
        K.gravarSimLocal();
        var novo = repintar(qid);
        pintarMapa();
        var marcado = novo && novo.querySelector('input[type="radio"]:checked');
        if (marcado) marcado.focus({ preventScroll: true });
        return;
      }
      var ui = S.ui[qid] || (S.ui[qid] = {});
      ui.sel = el.value;
      $$(".alt", cartao).forEach(function (a) { a.classList.toggle("alt-marcada", a.contains(el)); });
      var botao = cartao.querySelector('[data-acao="responder"]');
      if (botao) botao.disabled = false;
    },

    filtrar: function (el) {
      var form = el.closest("form");
      focoFiltro = el.name || "";
      var prova = (form.querySelector('input[name="prova"]:checked') || {}).value || "";
      var disc = form.elements.disc.value;
      if (el.name === "prova" && prova && disc) {
        var tem = K.PROVA[prova].disciplinas.some(function (d) { return d.nome === disc; });
        if (!tem) disc = "";
      }
      K.ir("questoes", { prova: prova, disc: disc, sit: form.elements.sit.value, q: form.elements.q.value.trim() });
    },

    "sim-contar": function (el) { marcarSegmento(el); contarDisponiveis(); },

    redigir: function (el) {
      contarLinhas();
      clearTimeout(redigindo);
      redigindo = setTimeout(function () {
        K.gravarLocal("redacao:" + S.usuario.uid + ":" + el.getAttribute("data-tema"), el.value || null);
      }, 400);
    }
  };
  var redigindo = null, focoFiltro = "";

  /* ---------- formulários ---------- */
  function erroForm(form, texto) {
    var p = form.querySelector(".form-erro");
    if (!p) { if (texto) K.aviso(texto, "erro"); return; }
    p.textContent = texto || "";
    p.hidden = !texto;
  }

  function ocupado(form, sim, rotulo) {
    var b = form.querySelector('button[type="submit"]');
    if (!b) return;
    if (sim) { b.setAttribute("data-rotulo", b.textContent); b.textContent = rotulo; b.disabled = true; }
    else { b.textContent = b.getAttribute("data-rotulo") || b.textContent; b.disabled = false; }
  }

  var formularios = {
    entrar: function (form) {
      var email = form.elements.email.value.trim(), senha = form.elements.senha.value;
      if (!email || !senha) { erroForm(form, "Preencha o e-mail e a senha."); return; }
      erroForm(form, "");
      ocupado(form, true, "Entrando…");
      S.backend.entrar({ email: email, senha: senha }).then(function () {
        K.aviso("Bem-vindo de volta.", "ok");
      }, function (e) { ocupado(form, false); erroForm(form, e.message); });
    },

    cadastro: function (form) {
      var d = { nome: form.elements.nome.value, email: form.elements.email.value, senha: form.elements.senha.value };
      if (d.senha !== form.elements.senha2.value) { erroForm(form, "As duas senhas não são iguais."); form.elements.senha2.focus(); return; }
      erroForm(form, "");
      ocupado(form, true, "Criando a conta…");
      S.backend.registrar(d).then(function () {
        K.aviso(S.backend.modo === "firebase" ? "Conta criada. Enviamos um e-mail para você confirmar o endereço." : "Conta criada.", "ok");
      }, function (e) { ocupado(form, false); erroForm(form, e.message); });
    },

    filtros: function (form) { mudancas.filtrar(form.elements.q); },

    "sim-prova": function (form) {
      var pv = K.PROVA[form.elements.prova.value];
      var qids = BANCO.questoes.filter(function (q) { return q.prova === pv.id; }).sort(function (a, b) { return a.n - b.n; }).map(function (q) { return q.id; });
      comecarSimulado({ tipo: "prova", prova: pv.id, titulo: pv.nome + ", prova completa", qids: qids, limite: parseInt(form.elements.tempo.value, 10) || 0 });
    },

    "sim-livre": function (form) {
      var base = questoesDoFormLivre(form);
      if (!base.length) { K.aviso("Nenhuma questão disponível com essas escolhas.", "erro"); return; }
      var qtd = parseInt(form.elements.qtd.value, 10) || base.length;
      var sorteio = K.embaralhar(base).slice(0, Math.min(qtd, base.length));
      sorteio.sort(function (a, b) {
        return (K.DISCIPLINAS.indexOf(a.disc) - K.DISCIPLINAS.indexOf(b.disc)) || (a.prova < b.prova ? -1 : a.prova > b.prova ? 1 : 0) || (a.n - b.n);
      });
      var prova = (form.querySelector('input[name="prova"]:checked') || {}).value || "";
      comecarSimulado({
        tipo: "livre", prova: prova,
        titulo: "Personalizado, " + K.plural(sorteio.length, "questão", "questões") + (prova ? " da " + K.PROVA[prova].sigla : ""),
        qids: sorteio.map(function (q) { return q.id; }),
        limite: parseInt(form.elements.tempo.value, 10) || 0
      });
    },

    nome: function (form) {
      erroForm(form, "");
      ocupado(form, true, "Salvando…");
      S.backend.alterarNome(form.elements.nome.value).then(function () {
        K.publicarRanking();
        K.aviso("Nome atualizado.", "ok");
      }, function (e) { ocupado(form, false); erroForm(form, e.message); });
    },

    senha: function (form) {
      var nova = form.elements.nova.value;
      if (nova !== form.elements.nova2.value) { erroForm(form, "As duas senhas novas não são iguais."); return; }
      erroForm(form, "");
      ocupado(form, true, "Trocando…");
      S.backend.alterarSenha(form.elements.atual.value, nova).then(function () {
        form.reset();
        ocupado(form, false);
        K.aviso("Senha trocada.", "ok");
      }, function (e) { ocupado(form, false); erroForm(form, e.message); });
    }
  };

  /* ---------- simulado ---------- */
  function questoesDoFormLivre(form) {
    var prova = (form.querySelector('input[name="prova"]:checked') || {}).value || "";
    var origem = form.elements.origem.value;
    var discs = $$('input[name="disc"]:checked', form).map(function (i) { return i.value; });
    var resp = K.respostas(), fav = K.favoritas();
    return BANCO.questoes.filter(function (q) {
      if (q.anulada) return false;
      if (prova && q.prova !== prova) return false;
      if (discs.indexOf(q.disc) < 0) return false;
      var r = resp[q.id];
      if (origem === "novas" && r) return false;
      if (origem === "erros" && (!r || r.ok)) return false;
      if (origem === "favoritas" && !fav[q.id]) return false;
      return true;
    });
  }

  function contarDisponiveis() {
    var form = $('form[data-form="sim-livre"]'), p = $("#sim-disponiveis");
    if (!form || !p) return;
    var n = questoesDoFormLivre(form).length;
    var qtd = parseInt(form.elements.qtd.value, 10) || n;
    p.textContent = n === 0 ? "Nenhuma questão disponível com essas escolhas."
      : n < qtd ? "Só há " + K.plural(n, "questão disponível", "questões disponíveis") + " com essas escolhas; o simulado terá " + n + "."
        : K.plural(n, "questão disponível", "questões disponíveis") + " com essas escolhas.";
  }

  function comecarSimulado(cfg) {
    var criar = function () {
      S.sim = { id: "s" + Date.now().toString(36), tipo: cfg.tipo, prova: cfg.prova || "", titulo: cfg.titulo, qids: cfg.qids, resp: {}, marc: {}, pos: 0, decorrido: 0, limite: cfg.limite || 0 };
      K.gravarSimLocal();
      Object.keys(S.ui).forEach(function (k) { if (k.indexOf("sim:") === 0) delete S.ui[k]; });
      K.ir("simulado");
    };
    if (!S.sim) { criar(); return; }
    K.confirmar({ titulo: "Trocar de simulado?", texto: "Você tem um simulado em andamento. Começar outro apaga as respostas marcadas nele.", ok: "Começar o novo", perigo: true })
      .then(function (r) { if (r.sim) criar(); });
  }

  function pintarMapa() {
    var mapa = $("#sim-mapa");
    if (mapa) mapa.innerHTML = K.mapaSimulado();
    var feitas = $("#sim-feitas");
    if (feitas) feitas.textContent = Object.keys(S.sim.resp).length;
  }

  function irParaQuestao(pos) {
    var sim = S.sim;
    if (!sim || pos < 0 || pos >= sim.qids.length) return;
    sim.pos = pos;
    K.gravarSimLocal();
    var caixa = $("#sim-questao");
    var q = K.Q[sim.qids[pos]];
    caixa.innerHTML = K.cartaoSimulado(q, { textoAberto: false });
    pintarMapa();
    var topo = caixa.getBoundingClientRect().top + window.pageYOffset - 84;
    if (window.pageYOffset > topo) window.scrollTo(0, Math.max(0, topo));
    var titulo = caixa.querySelector(".questao-titulo");
    if (titulo) { titulo.setAttribute("tabindex", "-1"); titulo.focus({ preventScroll: true }); }
  }

  var relogio = null, ultimoTique = 0, tiques = 0;

  function pintarRelogio() {
    var sim = S.sim, el = $("#sim-tempo");
    if (!sim || !el) return;
    var seg = sim.limite ? Math.max(0, sim.limite - sim.decorrido) : sim.decorrido;
    el.textContent = K.fmtRelogio(seg);
    var caixa = $("#sim-relogio");
    if (caixa) caixa.classList.toggle("acabando", !!sim.limite && seg <= 300);
  }

  function iniciarRelogio() {
    pararRelogio();
    ultimoTique = Date.now();
    pintarRelogio();
    relogio = setInterval(function () {
      if (!S.sim) { pararRelogio(); return; }
      var agora = Date.now();
      var delta = (agora - ultimoTique) / 1000;
      ultimoTique = agora;
      if (document.hidden || delta > 5) return;        // o tempo só corre com o simulado na tela
      S.sim.decorrido += delta;
      if (++tiques % 5 === 0) K.gravarSimLocal();
      pintarRelogio();
      if (S.sim.limite && S.sim.decorrido >= S.sim.limite) {
        K.aviso("Tempo esgotado. O simulado foi finalizado.", "erro");
        finalizarSimulado(true);
      }
    }, 1000);
  }

  function pararRelogio() {
    if (relogio) { clearInterval(relogio); relogio = null; if (S.sim) K.gravarSimLocal(); }
  }

  function finalizarSimulado() {
    var sim = S.sim;
    if (!sim) return;
    pararRelogio();
    var dlg = $("#dialogo");
    if (dlg && dlg.open) dlg.close();
    var ac = 0, anul = 0, pts = 0, final = {};
    var parcial = { respostas: {}, simulados: {} };
    sim.qids.forEach(function (qid) {
      var q = K.Q[qid], letra = sim.resp[qid] || "-";
      final[qid] = letra;
      if (q.anulada) { ac++; anul++; return; }
      if (letra === q.gab) ac++;
      var res = K.computarResposta(qid, letra, { revela: true });
      parcial.respostas[qid] = res.reg;
      pts += res.ganhou;
    });
    var registro = {
      id: sim.id, tipo: sim.tipo, prova: sim.prova || "", titulo: sim.titulo, t: Date.now(),
      dur: Math.round(sim.decorrido), limite: sim.limite || 0,
      total: sim.qids.length, ac: ac, anul: anul, pts: pts, qids: sim.qids, resp: final
    };
    parcial.simulados[sim.id] = registro;
    K.simulados().slice(14).forEach(function (velho) { parcial.simulados[velho.id] = null; });   // guarda os 15 mais recentes
    K.salvar(parcial);
    S.sim = null;
    K.gravarSimLocal();
    K.publicarRanking();
    K.ir("resultado", { id: registro.id });
  }

  /* ---------- classificação ---------- */
  function ordenarRanking(lista) {
    return lista.sort(function (a, b) {
      return ((b.pontos || 0) - (a.pontos || 0)) || ((b.ac || 0) - (a.ac || 0)) || ((a.t || 0) - (b.t || 0));
    });
  }

  function carregarRanking(forcar) {
    var corpo = $("#ranking-corpo");
    if (!corpo) return;
    var fresco = S.ranking && Date.now() - S.rankingEm < 90000;
    var espera;
    if (!forcar && fresco) espera = Promise.resolve(S.ranking);
    else {
      corpo.innerHTML = '<p class="carregando">Carregando a classificação…</p>';
      espera = semDemora(K.temRankingPendente() ? K.publicarRanking() : Promise.resolve(), 1500)
        .then(function () { return S.backend.lerRanking(K.cfg.tamanhoDoRanking || 100); })
        .then(function (lista) {
          S.ranking = ordenarRanking(lista.map(K.arrumarEntrada));
          S.rankingEm = Date.now();
          return S.ranking;
        });
    }
    espera.then(function (lista) {
      var alvo = $("#ranking-corpo");
      if (alvo) alvo.innerHTML = K.htmlRanking(lista);
    }, function (e) {
      var alvo = $("#ranking-corpo");
      if (alvo) alvo.innerHTML = '<div class="vazio"><p>Não deu para carregar a classificação: ' + esc(e.message) + '</p><button type="button" class="btn btn-primario" data-acao="ranking-atualizar">Tentar de novo</button></div>';
    });
  }

  /* ---------- redação: contagem de linhas ---------- */
  var ALTURA_LINHA = 30;
  function contarLinhas() {
    var ta = $("#folha"), med = $("#folha-medidor"), conta = $("#folha-conta");
    if (!ta || !med || !conta) return;
    var texto = ta.value;
    med.textContent = texto.replace(/\n$/, "\n ");
    var linhas = texto.trim() ? Math.max(1, Math.round(med.getBoundingClientRect().height / ALTURA_LINHA)) : 0;
    var estado = "", msg;
    if (!linhas) msg = "Folha em branco. A prova pede de 20 a 30 linhas.";
    else if (linhas < 20) { msg = K.plural(linhas, "linha", "linhas") + ". Faltam " + (20 - linhas) + " para o mínimo de 20."; estado = "falta"; }
    else if (linhas <= 30) { msg = linhas + " linhas. Dentro do limite de 20 a 30."; estado = "certo"; }
    else { msg = linhas + " linhas. Passou do limite: corte " + (linhas - 30) + "."; estado = "passou"; }
    conta.textContent = msg;
    conta.className = "folha-conta" + (estado ? " folha-conta-" + estado : "");
  }

  /* ---------- sessão ---------- */
  function aoMudarUsuario(u) {
    var trocou = (u && u.uid) !== (S.usuario && S.usuario.uid);
    S.usuario = u;
    if (!u) {
      pararRelogio();
      S.dados = null; S.sim = null; S.ui = {}; S.ranking = null; S.falhaDados = null; S.carregando = false;
      renderizar();
      return;
    }
    if (!trocou && S.dados) { renderizar(); return; }
    S.carregando = true;
    S.ui = {}; S.ranking = null;
    renderizar();
    S.backend.carregarDados().then(function (d) {
      S.dados = d || {};
      S.falhaDados = null;
    }, function (e) {
      S.dados = {};
      S.falhaDados = e.message;
    }).then(function () {
      S.carregando = false;
      K.lerSimLocal();
      renderizar();
      if (!S.falhaDados) K.publicarRanking();
    });
  }

  /* ---------- partida ---------- */
  function ligarEventos() {
    document.addEventListener("click", function (ev) {
      var el = ev.target.closest ? ev.target.closest("[data-acao]") : null;
      if (!el || el.disabled) return;
      var fn = acoes[el.getAttribute("data-acao")];
      if (!fn) return;
      ev.preventDefault();
      fn(el, ev);
    });
    document.addEventListener("change", function (ev) {
      var el = ev.target;
      if (!el.getAttribute) return;
      var nome = el.getAttribute("data-muda");
      if (!nome || nome === "redigir" || !mudancas[nome]) return;
      if (el.type === "radio" && el.closest(".segmentos")) marcarSegmento(el);
      mudancas[nome](el, ev);
    });
    document.addEventListener("input", function (ev) {
      var el = ev.target;
      if (el.getAttribute && el.getAttribute("data-muda") === "redigir") mudancas.redigir(el, ev);
    });
    document.addEventListener("submit", function (ev) {
      var form = ev.target;
      var nome = form.getAttribute && form.getAttribute("data-form");
      if (!nome || !formularios[nome]) return;
      ev.preventDefault();
      formularios[nome](form, ev);
    });
    window.addEventListener("hashchange", renderizar);
    window.addEventListener("pagehide", function () {
      if (S.sim) K.gravarSimLocal();
      if (K.temRankingPendente()) K.publicarRanking();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && K.temRankingPendente()) K.publicarRanking();
    });
    window.addEventListener("offline", function () {
      if (S.backend && S.backend.modo === "firebase" && S.usuario) K.aviso("Sem internet. Deixe esta aba aberta: as respostas são enviadas quando a conexão voltar.", "erro");
    });
    window.addEventListener("online", function () {
      if (S.backend && S.backend.modo === "firebase" && S.usuario) K.aviso("Conexão de volta.", "ok");
    });
  }

  function partir() {
    ligarEventos();
    renderizar();
    window.KLC_Backend.iniciar(K.cfg).then(function (backend) {
      S.backend = backend;
      backend.aoMudarUsuario(aoMudarUsuario);
    }).catch(function (e) {
      console.error(e);
      $("#conteudo").innerHTML = T.falha("Não foi possível ligar o banco de dados: " + (e && e.message ? e.message : e) + ". Confira o arquivo assets/js/config.js.");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", partir); else partir();
})();
