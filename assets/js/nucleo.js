/* ============================================================
 * Khaos League Championship - CFO
 * Copyright (c) 2026 Ronie Khaos Sousa Barbosa. Todos os direitos reservados.
 * nucleo.js — utilidades, estado, pontuação, patentes, avisos
 * ============================================================ */
(function () {
  "use strict";

  var K = window.KLC = window.KLC || {};
  var CFG = K.cfg = window.KLC_CONFIG || {};
  var BANCO = K.banco = window.KLC_BANCO;

  /* ---------- utilidades ---------- */
  K.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  K.$ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  K.$$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };
  K.semAcento = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  K.pct = function (a, b) { return b ? Math.round(100 * a / b) : 0; };
  K.plural = function (n, um, muitos) { return n + " " + (n === 1 ? um : muitos); };
  K.doisDigitos = function (n) { return (n < 10 ? "0" : "") + n; };
  K.fmtData = function (ts) {
    if (!ts) return "";
    var d = new Date(ts), z = K.doisDigitos;
    return z(d.getDate()) + "/" + z(d.getMonth() + 1) + "/" + d.getFullYear() + " às " + z(d.getHours()) + ":" + z(d.getMinutes());
  };
  K.fmtDia = function (ts) {
    if (!ts) return "";
    var d = new Date(ts), z = K.doisDigitos;
    return z(d.getDate()) + "/" + z(d.getMonth() + 1) + "/" + d.getFullYear();
  };
  K.fmtRelogio = function (seg) {
    seg = Math.max(0, Math.floor(seg));
    var z = K.doisDigitos;
    return z(Math.floor(seg / 3600)) + ":" + z(Math.floor(seg % 3600 / 60)) + ":" + z(seg % 60);
  };
  K.fmtDuracao = function (seg) {
    seg = Math.max(0, Math.round(seg));
    var h = Math.floor(seg / 3600), m = Math.floor(seg % 3600 / 60);
    if (h) return h + " h " + K.doisDigitos(m) + " min";
    if (m) return m + " min";
    return seg + " s";
  };
  K.embaralhar = function (lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  K.semTags = function (html) { return String(html).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); };

  /* ---------- índices do banco ---------- */
  K.Q = {};
  BANCO.questoes.forEach(function (q) { K.Q[q.id] = q; });
  K.PROVA = {};
  BANCO.provas.forEach(function (p) { K.PROVA[p.id] = p; });
  K.VALIDAS = BANCO.questoes.filter(function (q) { return !q.anulada; });
  K.MAX_PONTOS = K.VALIDAS.length * 10;
  K.DISCIPLINAS = [];
  BANCO.provas.forEach(function (p) {
    p.disciplinas.forEach(function (d) { if (K.DISCIPLINAS.indexOf(d.nome) < 0) K.DISCIPLINAS.push(d.nome); });
  });
  /* ordem de leitura: Português, Inglês, Humanas..., como no caderno */
  (function () {
    var ordem = ["Língua Portuguesa", "Língua Inglesa", "Ciências Humanas", "Ciências Humanas e Naturais", "Matemática", "Informática", "Direito"];
    K.DISCIPLINAS.sort(function (a, b) {
      var ia = ordem.indexOf(a), ib = ordem.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  })();

  var buscaCache = {};
  K.textoDeBusca = function (q) {
    if (!buscaCache[q.id]) buscaCache[q.id] = K.semAcento(K.semTags(q.enun + " " + q.alt.join(" ")));
    return buscaCache[q.id];
  };

  /* ---------- regras da liga ---------- */
  K.PONTOS = { primeira: 10, segunda: 5 };

  K.PATENTES = [
    { nome: "Aluno-a-Oficial", pct: 0 },
    { nome: "Aspirante", pct: 8 },
    { nome: "2º Tenente", pct: 18 },
    { nome: "1º Tenente", pct: 30 },
    { nome: "Capitão", pct: 44 },
    { nome: "Major", pct: 58 },
    { nome: "Tenente-Coronel", pct: 72 },
    { nome: "Coronel", pct: 86 }
  ].map(function (p, i) {
    p.nivel = i;
    p.min = Math.round(K.MAX_PONTOS * p.pct / 1000) * 10;
    return p;
  });

  K.patenteDe = function (pontos) {
    var atual = K.PATENTES[0];
    K.PATENTES.forEach(function (p) { if ((pontos || 0) >= p.min) atual = p; });
    return atual;
  };
  K.proximaPatente = function (pontos) {
    var p = K.patenteDe(pontos);
    return K.PATENTES[p.nivel + 1] || null;
  };

  /* ---------- desenho das insígnias (estrelas) ---------- */
  function estrela(cx, cy, R) {
    var pts = [], r = R * 0.42;
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5, raio = i % 2 ? r : R;
      pts.push((cx + raio * Math.cos(ang)).toFixed(2) + "," + (cy + raio * Math.sin(ang)).toFixed(2));
    }
    return pts.join(" ");
  }
  /* nível 0: barra · 1: estrela vazada · 2-4: 1 a 3 estrelas · 5-7: estrelas com aro (oficial superior) */
  K.insignia = function (nivel, tam) {
    tam = tam || 28;
    var itens = [];
    if (nivel === 0) itens = [{ t: "barra" }];
    else if (nivel === 1) itens = [{ t: "vazada" }];
    else if (nivel <= 4) for (var i = 0; i < nivel - 1; i++) itens.push({ t: "cheia" });
    else {
      var aros = nivel - 4;
      for (var a = 0; a < aros; a++) itens.push({ t: "aro" });
      for (var s = 0; s < 3 - aros; s++) itens.push({ t: "cheia" });
    }
    var passo = 22, larg = Math.max(24, itens.length * passo + 2), svg = "";
    itens.forEach(function (it, idx) {
      var cx = larg / 2 + (idx - (itens.length - 1) / 2) * passo, cy = 12;
      if (it.t === "barra") svg += '<rect x="' + (cx - 8) + '" y="9.5" width="16" height="5" rx="1" class="ins-cheia"/>';
      else if (it.t === "vazada") svg += '<polygon points="' + estrela(cx, cy, 8.5) + '" class="ins-vazada"/>';
      else if (it.t === "cheia") svg += '<polygon points="' + estrela(cx, cy, 9) + '" class="ins-cheia"/>';
      else svg += '<circle cx="' + cx + '" cy="' + cy + '" r="10" class="ins-aro"/><polygon points="' + estrela(cx, cy, 6.6) + '" class="ins-cheia"/>';
    });
    return '<svg class="insignia" viewBox="0 0 ' + larg + ' 24" height="' + tam + '" width="' + (tam * larg / 24).toFixed(1) + '" aria-hidden="true" focusable="false">' + svg + "</svg>";
  };

  K.emblema = function (classe) {
    return '<svg class="' + (classe || "emblema") + '" viewBox="0 0 64 72" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="klc-escudo"><path d="M32 4l26 8.5V36c0 16.5-12 27-26 32C18 63 6 52.5 6 36V12.5z"/></clipPath></defs>' +
      '<path d="M32 2l28 9v25c0 18-13 29-28 34C17 65 4 54 4 36V11z" class="emb-fundo"/>' +
      '<g clip-path="url(#klc-escudo)">' +
      '<path d="M8 49l24-18 24 18" class="emb-divisa-1"/>' +
      '<path d="M8 62l24-18 24 18" class="emb-divisa-2"/>' +
      "</g>" +
      '<polygon points="' + estrela(32, 18, 8) + '" class="emb-estrela"/>' +
      '<path d="M32 2l28 9v25c0 18-13 29-28 34C17 65 4 54 4 36V11z" class="emb-borda"/>' +
      "</svg>";
  };

  /* ---------- ícones (traço) ---------- */
  function ic(d, extra) {
    return '<svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + (extra || "") + ">" + d + "</svg>";
  }
  K.IC = {
    certo: ic('<path d="M5 12.5l5 5L19 7"/>'),
    errado: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    estrela: ic('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    riscar: ic('<path d="M4 12h16"/><path d="M8 7.5C8 6 9.5 5 12 5s4 1 4 2.5M16 16.5c0 1.5-1.5 2.5-4 2.5s-4-1-4-2.5"/>'),
    relogio: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    bandeira: ic('<path d="M6 21V4h11l-2 4 2 4H6"/>'),
    seta: ic('<path d="M6 9l6 6 6-6"/>'),
    menu: ic('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    sair: ic('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9"/>'),
    olho: ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    livro: ic('<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>'),
    google: '<svg class="ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
      '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>' +
      '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
      '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>' +
      '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>'
  };

  /* ---------- estado ---------- */
  var S = K.S = {
    backend: null,
    usuario: null,
    dados: null,          // documento do usuário: { respostas, favoritas, simulados, ... }
    carregando: true,
    falhaDados: null,
    ui: {},               // estado de tela por questão (seleção, riscadas...), não é salvo
    sim: null,            // simulado em andamento (salvo só neste aparelho)
    ranking: null,
    rankingEm: 0
  };

  K.respostas = function () { return (S.dados && S.dados.respostas) || {}; };
  K.favoritas = function () { return (S.dados && S.dados.favoritas) || {}; };
  /* Os resultados vêm do banco: garante os tipos antes de mostrar na tela */
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function arrumarSimulado(id, s) {
    if (!s || typeof s !== "object") return null;
    var qids = (Array.isArray(s.qids) ? s.qids : []).filter(function (q) { return typeof q === "string" && K.Q[q]; });
    var resp = {};
    qids.forEach(function (q) { var l = s.resp && s.resp[q]; resp[q] = /^[A-E]$/.test(l) ? l : "-"; });
    return {
      id: String(id), tipo: s.tipo === "prova" ? "prova" : "livre", prova: K.PROVA[s.prova] ? s.prova : "",
      titulo: String(s.titulo || "Simulado").slice(0, 80), t: num(s.t), dur: num(s.dur), limite: num(s.limite),
      total: qids.length, ac: Math.min(qids.length, Math.max(0, Math.round(num(s.ac)))), anul: Math.max(0, Math.round(num(s.anul))),
      pts: Math.max(0, Math.round(num(s.pts))), qids: qids, resp: resp
    };
  }
  K.simulado = function (id) {
    var m = (S.dados && S.dados.simulados) || {};
    return Object.prototype.hasOwnProperty.call(m, id) ? arrumarSimulado(id, m[id]) : null;
  };
  K.simulados = function () {
    var m = (S.dados && S.dados.simulados) || {};
    return Object.keys(m).map(function (id) { return arrumarSimulado(id, m[id]); })
      .filter(function (s) { return s && s.total; })
      .sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
  };

  /* situação de uma questão para o usuário */
  K.situacao = function (qid) {
    var q = K.Q[qid], r = K.respostas()[qid];
    if (q.anulada) return "anulada";
    if (!r) return "nova";
    if (r.ok) return r.p === K.PONTOS.primeira ? "primeira" : (r.p === K.PONTOS.segunda ? "segunda" : "acerto");
    if (r.n === 1 && !r.g) return "chance";     // errou a 1ª e ainda não viu o gabarito
    return "erro";
  };

  K.estatisticas = function () {
    var resp = K.respostas();
    var e = { respondidas: 0, primeira: 0, pontuadas: 0, pendentes: 0, pontos: 0, total: K.VALIDAS.length, porDisc: {}, porProva: {} };
    K.DISCIPLINAS.forEach(function (d) { e.porDisc[d] = { total: 0, resp: 0, primeira: 0, pendentes: 0 }; });
    BANCO.provas.forEach(function (p) { e.porProva[p.id] = { total: 0, resp: 0, primeira: 0, pendentes: 0 }; });
    K.VALIDAS.forEach(function (q) {
      var d = e.porDisc[q.disc], pv = e.porProva[q.prova], r = resp[q.id];
      d.total++; pv.total++;
      if (!r) return;
      e.respondidas++; d.resp++; pv.resp++;
      e.pontos += r.p || 0;
      if (r.p > 0) e.pontuadas++;
      if (r.p === K.PONTOS.primeira) { e.primeira++; d.primeira++; pv.primeira++; }
      if (!r.ok) { e.pendentes++; d.pendentes++; pv.pendentes++; }
    });
    e.aproveitamento = K.pct(e.primeira, e.respondidas);
    e.patente = K.patenteDe(e.pontos);
    e.proxima = K.proximaPatente(e.pontos);
    return e;
  };

  /* linha da classificação vinda do banco: só texto e números */
  K.arrumarEntrada = function (e) {
    e = e || {};
    var resp = Math.max(0, Math.round(num(e.resp)));
    return {
      uid: String(e.uid || ""), nome: String(e.nome || "Competidor").slice(0, 40),
      pontos: Math.max(0, Math.round(num(e.pontos))), resp: resp, ac: Math.min(resp, Math.max(0, Math.round(num(e.ac)))),
      sim: typeof e.sim === "number" && isFinite(e.sim) ? Math.max(0, Math.min(100, Math.round(e.sim))) : null, t: num(e.t)
    };
  };

  K.melhorSimulado = function () {
    var melhor = null;
    K.simulados().forEach(function (s) {
      if (s.tipo !== "prova" || !s.total) return;
      var p = K.pct(s.ac, s.total);
      if (melhor === null || p > melhor) melhor = p;
    });
    return melhor;
  };

  /* ---------- gravação ---------- */
  function mesclar(alvo, parcial) {
    Object.keys(parcial).forEach(function (k) {
      var v = parcial[k];
      if (v === null) { delete alvo[k]; return; }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        if (!alvo[k] || typeof alvo[k] !== "object" || Array.isArray(alvo[k])) alvo[k] = {};
        mesclar(alvo[k], v);
      } else alvo[k] = v;
    });
  }

  /* tira mapas vazios: num "merge" do Firestore, {} apagaria o que já está gravado naquele campo */
  function semVazios(obj) {
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        semVazios(v);
        if (!Object.keys(v).length) delete obj[k];
      }
    });
    return obj;
  }

  K.salvar = function (parcial) {
    if (!S.dados) S.dados = {};
    semVazios(parcial);
    if (!Object.keys(parcial).length) return Promise.resolve();
    mesclar(S.dados, parcial);
    return S.backend.salvarDados(parcial).catch(function (e) {
      K.aviso("Não deu para salvar agora: " + e.message, "erro");
    });
  };

  var relogioRanking = null;
  K.entradaRanking = function () {
    var e = K.estatisticas(), entrada = {
      nome: S.usuario ? S.usuario.nome : "",
      pontos: e.pontos,
      resp: e.respondidas,
      ac: e.primeira,
      t: Date.now()
    };
    var sim = K.melhorSimulado();
    if (sim !== null) entrada.sim = sim;
    return entrada;
  };
  K.publicarRanking = function () {
    clearTimeout(relogioRanking);
    relogioRanking = null;
    if (!S.usuario || !S.dados) return Promise.resolve();
    S.rankingEm = 0;                       // força nova leitura na próxima visita ao ranking
    return S.backend.publicarRanking(K.entradaRanking()).catch(function (e) { console.warn("ranking:", e.message); });
  };
  K.agendarRanking = function () {
    clearTimeout(relogioRanking);
    relogioRanking = setTimeout(K.publicarRanking, 1500);
  };
  K.temRankingPendente = function () { return relogioRanking !== null; };

  /* ---------- registro de uma resposta ----------
   * 1ª tentativa certa: 10 pontos.
   * Errou a 1ª e acertou a 2ª sem ver o gabarito: 5 pontos.
   * Depois disso a questão não pontua mais (vira treino).
   * opcoes.revela = true quando o gabarito fica visível depois (ex.: correção do simulado). */
  K.computarResposta = function (qid, letra, opcoes) {
    opcoes = opcoes || {};
    var q = K.Q[qid], antes = K.respostas()[qid];
    if (!q || q.anulada) return null;
    var ok = letra === q.gab ? 1 : 0;
    var reg, ganhou = 0;
    if (!antes) {
      ganhou = ok ? K.PONTOS.primeira : 0;
      reg = { r: letra, ok: ok, p: ganhou, n: 1, t: Date.now() };
      if (ok || opcoes.revela) reg.g = 1;
    } else {
      reg = { r: letra, ok: ok, p: antes.p || 0, n: (antes.n || 1) + 1, t: Date.now(), g: 1 };
      if (antes.n === 1 && !antes.p && !antes.g && ok) { ganhou = K.PONTOS.segunda; reg.p = ganhou; }
    }
    return { reg: reg, ganhou: ganhou, ok: !!ok, antes: antes || null };
  };

  K.responder = function (qid, letra) {
    var res = K.computarResposta(qid, letra);
    if (!res) return null;
    var parcial = { respostas: {} };
    parcial.respostas[qid] = res.reg;
    K.salvar(parcial);
    K.agendarRanking();
    return res;
  };

  K.revelarGabarito = function (qid) {
    var r = K.respostas()[qid];
    if (!r || r.g) return;
    var parcial = { respostas: {} };
    parcial.respostas[qid] = { g: 1 };
    K.salvar(parcial);
  };

  /* ---------- simulado em andamento (fica neste aparelho) ---------- */
  function chaveSim() { return "klc:sim:" + (S.usuario ? S.usuario.uid : "anon"); }
  K.lerSimLocal = function () {
    try { var b = localStorage.getItem(chaveSim()); S.sim = b ? JSON.parse(b) : null; } catch (e) { S.sim = null; }
    if (S.sim && (!Array.isArray(S.sim.qids) || S.sim.qids.some(function (id) { return !K.Q[id]; }))) S.sim = null;
    return S.sim;
  };
  K.gravarSimLocal = function () {
    try {
      if (S.sim) localStorage.setItem(chaveSim(), JSON.stringify(S.sim));
      else localStorage.removeItem(chaveSim());
    } catch (e) { /* sem armazenamento: o simulado vale só até fechar a aba */ }
  };

  K.lerLocal = function (chave, padrao) {
    try { var b = localStorage.getItem("klc:" + chave); return b === null ? padrao : JSON.parse(b); } catch (e) { return padrao; }
  };
  K.gravarLocal = function (chave, valor) {
    try { if (valor === null) localStorage.removeItem("klc:" + chave); else localStorage.setItem("klc:" + chave, JSON.stringify(valor)); } catch (e) { /* ignora */ }
  };

  /* ---------- avisos rápidos ---------- */
  K.aviso = function (texto, tipo) {
    var caixa = K.$("#avisos");
    if (!caixa) return;
    var el = document.createElement("div");
    el.className = "aviso" + (tipo ? " aviso-" + tipo : "");
    el.setAttribute("role", tipo === "erro" ? "alert" : "status");
    el.innerHTML = (tipo === "erro" ? K.IC.errado : tipo === "ok" ? K.IC.certo : "") + "<span>" + K.esc(texto) + "</span>";
    caixa.appendChild(el);
    while (caixa.children.length > 3) caixa.removeChild(caixa.firstChild);
    setTimeout(function () { el.classList.add("saindo"); }, tipo === "erro" ? 6500 : 3800);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, tipo === "erro" ? 7000 : 4300);
  };

  /* ---------- caixa de confirmação ----------
   * K.confirmar({ titulo, texto, ok, perigo, senha }) -> Promise<{ sim: bool, senha }> */
  K.confirmar = function (o) {
    return new Promise(function (resolver) {
      var dlg = K.$("#dialogo");
      dlg.innerHTML =
        '<form method="dialog" class="dialogo-form">' +
        "<h2>" + K.esc(o.titulo) + "</h2>" +
        (o.texto ? "<p>" + K.esc(o.texto) + "</p>" : "") +
        (o.senha ? '<label class="campo"><span class="campo-rotulo">Sua senha</span><input type="password" name="senha" autocomplete="current-password" required></label>' : "") +
        '<div class="dialogo-acoes">' +
        '<button type="button" class="btn btn-fantasma" value="nao" data-fechar>Cancelar</button>' +
        '<button type="submit" class="btn ' + (o.perigo ? "btn-destaque" : "btn-primario") + '" value="sim">' + K.esc(o.ok || "Confirmar") + "</button>" +
        "</div></form>";
      var form = dlg.querySelector("form");
      var decidido = false;
      function fim(sim) {
        if (decidido) return;
        decidido = true;
        var senha = form.elements.senha ? form.elements.senha.value : "";
        if (dlg.open) dlg.close();
        resolver({ sim: sim, senha: senha });
      }
      dlg.querySelector("[data-fechar]").addEventListener("click", function () { fim(false); });
      form.addEventListener("submit", function (ev) { ev.preventDefault(); fim(true); });
      dlg.addEventListener("close", function aoFechar() { dlg.removeEventListener("close", aoFechar); fim(false); });
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    });
  };
})();
