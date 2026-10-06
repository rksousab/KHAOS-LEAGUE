/* ============================================================
 * Khaos League Championship - CFO
 * Copyright (c) 2026 Ronie Khaos Sousa Barbosa. Todos os direitos reservados.
 * backend.js — contas e banco de dados
 *
 * Dois modos, com a mesma interface:
 *   - "firebase": Firebase Authentication + Cloud Firestore (banco online)
 *   - "local":    demonstração, tudo salvo no navegador (localStorage)
 *
 * O modo é escolhido sozinho: se config.js tiver a apiKey do Firebase,
 * usa o Firebase; senão, usa o modo local.
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- erros com mensagem em português ---------- */
  function erro(codigo, mensagem) {
    var e = new Error(mensagem);
    e.codigo = codigo;
    return e;
  }

  var MENSAGENS = {
    "auth/email-already-in-use": "Já existe uma conta com este e-mail. Entre com a sua senha ou use “Esqueci minha senha”.",
    "auth/invalid-email": "Este e-mail não é válido.",
    "auth/weak-password": "A senha é fraca demais. Use pelo menos 8 caracteres.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
    "auth/missing-password": "Digite a senha.",
    "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem conexão com o servidor. Confira a internet e tente de novo.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o login.",
    "auth/cancelled-popup-request": "A janela do Google foi fechada antes de concluir o login.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere os pop-ups deste site ou entre com e-mail e senha.",
    "auth/unauthorized-domain": "Este endereço ainda não foi autorizado no Firebase (Authentication > Settings > Authorized domains).",
    "auth/operation-not-allowed": "Este tipo de login não está ativado no Firebase (Authentication > Sign-in method).",
    "auth/requires-recent-login": "Por segurança, saia, entre de novo e repita a operação.",
    "auth/user-disabled": "Esta conta foi desativada pelo administrador.",
    "auth/account-exists-with-different-credential": "Já existe uma conta com este e-mail, criada com outro tipo de login.",
    "auth/user-mismatch": "A conta escolhida não é a mesma que está conectada.",
    "auth/internal-error": "O serviço de login não respondeu. Confira a internet (ou um bloqueador de anúncios) e tente de novo; se preferir, entre com e-mail e senha.",
    "auth/web-storage-unsupported": "O navegador está bloqueando os dados do site. Libere os cookies deste endereço e tente de novo.",
    "permission-denied": "O banco de dados recusou o acesso. Confira as regras do Firestore (veja o README).",
    "unavailable": "Banco de dados fora do ar ou sem internet. Tente de novo em instantes.",
    "failed-precondition": "O banco de dados ainda não foi criado no Firebase (Firestore Database > Criar banco de dados).",
    "not-found": "O banco de dados Firestore ainda não foi criado neste projeto do Firebase (Firestore Database > Criar banco de dados).",
    "unauthenticated": "A sessão expirou. Saia e entre de novo.",
    "resource-exhausted": "O limite gratuito de uso do banco de dados foi atingido por hoje. Tente de novo amanhã."
  };

  function traduzir(e) {
    if (e && e.codigo) return e;                       // já é um erro nosso
    var cod = (e && e.code) || "desconhecido";
    var msg = MENSAGENS[cod] || MENSAGENS[String(cod).replace(/^firestore\//, "")];
    return erro(cod, msg || ("Não foi possível concluir a operação (" + cod + ")."));
  }

  function validarEmail(email, somenteGmail) {
    email = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw erro("email-invalido", "Digite um e-mail válido.");
    if (somenteGmail && !/@gmail\.com$/.test(email)) throw erro("email-nao-gmail", "Use um e-mail do Gmail (termina em @gmail.com).");
    return email;
  }

  function validarNome(nome) {
    nome = String(nome || "").replace(/\s+/g, " ").trim();
    if (nome.length < 2) throw erro("nome-curto", "Digite o nome que vai aparecer na classificação.");
    if (nome.length > 40) throw erro("nome-longo", "O nome pode ter no máximo 40 caracteres.");
    return nome;
  }

  function validarSenha(senha, minimo) {
    senha = String(senha || "");
    if (senha.length < minimo) throw erro("senha-curta", "A senha precisa ter pelo menos " + minimo + " caracteres.");
    return senha;
  }

  /* ---------- mescla profunda: null apaga a chave ---------- */
  function mesclar(alvo, parcial) {
    Object.keys(parcial).forEach(function (k) {
      var v = parcial[k];
      if (v === null) { delete alvo[k]; return; }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        if (!alvo[k] || typeof alvo[k] !== "object" || Array.isArray(alvo[k])) alvo[k] = {};
        mesclar(alvo[k], v);
      } else {
        alvo[k] = v;
      }
    });
    return alvo;
  }

  /* ---------- SHA-256 (usado só no modo local, para não guardar a senha em texto puro) ---------- */
  var sha256 = (function () {
    var K = [], H0 = [];
    (function () {
      function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
      var n = 2, c = 0;
      while (c < 64) {
        var primo = true;
        for (var f = 2; f * f <= n; f++) if (n % f === 0) { primo = false; break; }
        if (primo) {
          if (c < 8) H0[c] = frac(Math.pow(n, 1 / 2));
          K[c++] = frac(Math.pow(n, 1 / 3));
        }
        n++;
      }
    })();
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    return function (texto) {
      var bytes = new TextEncoder().encode(texto);
      var l = bytes.length, total = ((l + 9 + 63) >> 6) << 6;
      var m = new Uint8Array(total);
      m.set(bytes); m[l] = 0x80;
      var dv = new DataView(m.buffer);
      dv.setUint32(total - 8, Math.floor(l / 536870912), false);
      dv.setUint32(total - 4, (l * 8) >>> 0, false);
      var h = H0.slice(), w = new Int32Array(64), i;
      for (var off = 0; off < total; off += 64) {
        for (i = 0; i < 16; i++) w[i] = dv.getInt32(off + i * 4, false);
        for (i = 16; i < 64; i++) {
          var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
        for (i = 0; i < 64; i++) {
          var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
          var ch = (e & f) ^ (~e & g);
          var t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
          var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
          var maj = (a & b) ^ (a & c) ^ (b & c);
          var t2 = (S0 + maj) | 0;
          hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
        h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
      }
      return h.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
    };
  })();

  function resumoDaSenha(senha, sal) {
    var h = sha256(sal + ":" + senha);
    for (var i = 0; i < 1500; i++) h = sha256(h + sal);
    return h;
  }

  function aleatorio(n) {
    var a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  /* ============================================================
   * MODO LOCAL (demonstração)
   * ============================================================ */
  function criarLocal(cfg) {
    var P = "klc:";
    var memoria = {};
    var temStorage = (function () {
      try { localStorage.setItem(P + "teste", "1"); localStorage.removeItem(P + "teste"); return true; }
      catch (e) { return false; }
    })();

    function ler(chave, padrao) {
      try {
        var bruto = temStorage ? localStorage.getItem(P + chave) : memoria[chave];
        return bruto ? JSON.parse(bruto) : padrao;
      } catch (e) { return padrao; }
    }
    function gravar(chave, valor) {
      var bruto = JSON.stringify(valor);
      if (temStorage) localStorage.setItem(P + chave, bruto); else memoria[chave] = bruto;
    }
    function apagar(chave) {
      if (temStorage) localStorage.removeItem(P + chave); else delete memoria[chave];
    }

    var ouvintes = [];
    var atual = null;

    function publico(conta) {
      return conta ? { uid: conta.uid, nome: conta.nome, email: conta.email, emailVerificado: true, provedor: "local" } : null;
    }
    function contaDaSessao() {
      var uid = ler("sessao", null);
      if (!uid) return null;
      var contas = ler("contas", {});
      for (var k in contas) if (contas[k].uid === uid) return contas[k];
      return null;
    }
    function avisar() {
      var u = atual;
      ouvintes.forEach(function (cb) { try { cb(u); } catch (e) { console.error(e); } });
    }
    function exigirSessao() {
      if (!atual) throw erro("sem-sessao", "Entre na sua conta para continuar.");
      return atual;
    }
    /* grava na hora (para nada se perder se a página for fechada em seguida) e devolve uma Promise */
    function promessa(fn) {
      try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(traduzir(e)); }
    }

    atual = publico(contaDaSessao());

    return {
      modo: "local",
      persistente: temStorage,
      pronto: Promise.resolve(),
      usuario: function () { return atual; },
      aoMudarUsuario: function (cb) { ouvintes.push(cb); setTimeout(function () { cb(atual); }, 0); },

      registrar: function (d) {
        return promessa(function () {
          var nome = validarNome(d.nome);
          var email = validarEmail(d.email, cfg.somenteGmail);
          var senha = validarSenha(d.senha, cfg.senhaMinima);
          var contas = ler("contas", {});
          if (contas[email]) throw erro("auth/email-already-in-use", MENSAGENS["auth/email-already-in-use"]);
          var sal = aleatorio(16);
          var conta = { uid: "u" + aleatorio(10), nome: nome, email: email, sal: sal, resumo: resumoDaSenha(senha, sal), criadoEm: Date.now() };
          contas[email] = conta;
          gravar("contas", contas);
          gravar("dados:" + conta.uid, { nome: nome, email: email, criadoEm: conta.criadoEm });
          gravar("sessao", conta.uid);
          atual = publico(conta);
          avisar();
          return atual;
        });
      },

      entrar: function (d) {
        return promessa(function () {
          var email = String(d.email || "").trim().toLowerCase();
          var conta = ler("contas", {})[email];
          if (!conta || conta.resumo !== resumoDaSenha(String(d.senha || ""), conta.sal)) {
            throw erro("auth/invalid-credential", MENSAGENS["auth/invalid-credential"]);
          }
          gravar("sessao", conta.uid);
          atual = publico(conta);
          avisar();
          return atual;
        });
      },

      entrarGoogle: function () {
        return Promise.reject(erro("indisponivel", "O login com Google só funciona com o banco de dados online ligado."));
      },

      sair: function () {
        return promessa(function () { apagar("sessao"); atual = null; avisar(); });
      },

      recuperarSenha: function () {
        return Promise.reject(erro("indisponivel", "No modo demonstração não há envio de e-mail. Crie outra conta para testar; com o banco online ligado, o link de redefinição chega no Gmail."));
      },

      reenviarVerificacao: function () { return Promise.resolve(); },
      recarregarUsuario: function () { return Promise.resolve(atual); },

      alterarSenha: function (senhaAtual, novaSenha) {
        return promessa(function () {
          var u = exigirSessao();
          var contas = ler("contas", {});
          var conta = contas[u.email];
          if (!conta || conta.resumo !== resumoDaSenha(String(senhaAtual || ""), conta.sal)) throw erro("auth/wrong-password", "A senha atual não confere.");
          validarSenha(novaSenha, cfg.senhaMinima);
          conta.sal = aleatorio(16);
          conta.resumo = resumoDaSenha(novaSenha, conta.sal);
          gravar("contas", contas);
        });
      },

      alterarNome: function (nome) {
        return promessa(function () {
          var u = exigirSessao();
          nome = validarNome(nome);
          var contas = ler("contas", {});
          contas[u.email].nome = nome;
          gravar("contas", contas);
          var dados = ler("dados:" + u.uid, {});
          dados.nome = nome;
          gravar("dados:" + u.uid, dados);
          atual = publico(contas[u.email]);
          avisar();
          return atual;
        });
      },

      excluirConta: function (senhaAtual) {
        return promessa(function () {
          var u = exigirSessao();
          var contas = ler("contas", {});
          var conta = contas[u.email];
          if (!conta || conta.resumo !== resumoDaSenha(String(senhaAtual || ""), conta.sal)) throw erro("auth/wrong-password", "A senha não confere.");
          delete contas[u.email];
          gravar("contas", contas);
          apagar("dados:" + u.uid);
          var rk = ler("ranking", {});
          delete rk[u.uid];
          gravar("ranking", rk);
          apagar("sessao");
          atual = null;
          avisar();
        });
      },

      carregarDados: function () {
        return promessa(function () { return ler("dados:" + exigirSessao().uid, {}); });
      },

      salvarDados: function (parcial) {
        return promessa(function () {
          var u = exigirSessao();
          var dados = ler("dados:" + u.uid, {});
          mesclar(dados, parcial);
          gravar("dados:" + u.uid, dados);
        });
      },

      publicarRanking: function (entrada) {
        return promessa(function () {
          var u = exigirSessao();
          var rk = ler("ranking", {});
          rk[u.uid] = entrada;
          gravar("ranking", rk);
        });
      },

      lerRanking: function (limite) {
        return promessa(function () {
          var rk = ler("ranking", {});
          return Object.keys(rk).map(function (uid) { var e = rk[uid]; e.uid = uid; return e; })
            .sort(function (a, b) { return (b.pontos || 0) - (a.pontos || 0); })
            .slice(0, limite || 100);
        });
      }
    };
  }

  /* ============================================================
   * MODO FIREBASE (banco de dados online)
   *   Authentication  -> contas (e-mail + senha, Google)
   *   Firestore       -> usuarios/{uid}  (progresso; só o dono lê e grava)
   *                      ranking/{uid}   (placar; todos os logados leem)
   * ============================================================ */
  function criarFirebase(cfg) {
    var fb = window.firebase;
    if (!(fb.apps && fb.apps.length)) fb.initializeApp(cfg.firebase);
    var auth = fb.auth();
    var db = fb.firestore();
    try { auth.languageCode = "pt-BR"; } catch (e) { /* segue no idioma padrão */ }

    /* Usado só em testes automatizados (emuladores do Firebase) */
    if (cfg.emuladores) {
      if (cfg.emuladores.auth) auth.useEmulator(cfg.emuladores.auth, { disableWarnings: true });
      if (cfg.emuladores.firestore) db.useEmulator(cfg.emuladores.firestore[0], cfg.emuladores.firestore[1]);
    }

    var ouvintes = [];
    var atual = null;
    var resolvido = false;
    var soltarPronto;
    var pronto = new Promise(function (ok) { soltarPronto = ok; });

    function publico(u) {
      if (!u) return null;
      var provedores = (u.providerData || []).map(function (p) { return p && p.providerId; });
      var soGoogle = provedores.indexOf("google.com") >= 0 && provedores.indexOf("password") < 0;
      return {
        uid: u.uid,
        nome: u.displayName || String(u.email || "Competidor").split("@")[0],
        email: u.email || "",
        emailVerificado: !!u.emailVerified,
        provedor: soGoogle ? "google" : "senha"
      };
    }
    function avisar() {
      atual = publico(auth.currentUser);
      var u = atual;
      ouvintes.forEach(function (cb) { try { cb(u); } catch (e) { console.error(e); } });
    }
    function exigirSessao() {
      if (!auth.currentUser) throw erro("sem-sessao", "Entre na sua conta para continuar.");
      return auth.currentUser;
    }
    function docUsuario(uid) { return db.collection("usuarios").doc(uid); }
    function docRanking(uid) { return db.collection("ranking").doc(uid); }
    function falha(e) { throw traduzir(e); }

    /* Gravações: se a internet cair, o Firestore guarda o pedido e reenvia sozinho quando ela volta.
       Por isso a tela não fica esperando mais que "ms"; um erro de verdade (ex.: regras) chega antes disso. */
    function semTravar(promessa, ms) {
      var q = promessa.catch(falha);
      q.catch(function () { /* erro tardio: já foi tratado ou será reenviado */ });
      return Promise.race([q, new Promise(function (ok) { setTimeout(ok, ms || 4000); })]);
    }
    /* Leituras: desiste com mensagem clara se o banco não responder */
    function comPrazo(promessa, ms) {
      return new Promise(function (ok, falhou) {
        var t = setTimeout(function () { falhou(erro("unavailable", MENSAGENS.unavailable)); }, ms || 20000);
        promessa.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); falhou(traduzir(e)); });
      });
    }

    /* null -> FieldValue.delete() (para usar com set(..., {merge:true})) */
    function paraFirestore(obj) {
      var saida = {};
      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        if (v === null) saida[k] = fb.firestore.FieldValue.delete();
        else if (v && typeof v === "object" && !Array.isArray(v)) saida[k] = paraFirestore(v);
        else if (v !== undefined) saida[k] = v;
      });
      return saida;
    }

    var registrando = false;
    auth.onAuthStateChanged(function () {
      if (!resolvido) { resolvido = true; soltarPronto(); }
      if (registrando) return;        // o cadastro avisa quando o nome já estiver gravado
      avisar();
    });

    function reautenticar(u, senhaAtual) {
      var ehGoogle = u.providerData.some(function (p) { return p.providerId === "google.com"; }) &&
        !u.providerData.some(function (p) { return p.providerId === "password"; });
      if (ehGoogle) return u.reauthenticateWithPopup(new fb.auth.GoogleAuthProvider());
      return u.reauthenticateWithCredential(fb.auth.EmailAuthProvider.credential(u.email, String(senhaAtual || "")));
    }

    return {
      modo: "firebase",
      persistente: true,
      pronto: pronto,
      usuario: function () { return atual; },
      aoMudarUsuario: function (cb) {
        ouvintes.push(cb);
        if (resolvido) setTimeout(function () { cb(atual); }, 0);
      },

      registrar: function (d) {
        var nome, email, senha;
        try {
          nome = validarNome(d.nome);
          email = validarEmail(d.email, cfg.somenteGmail);
          senha = validarSenha(d.senha, cfg.senhaMinima);
        } catch (e) { return Promise.reject(e); }
        registrando = true;
        return auth.createUserWithEmailAndPassword(email, senha).then(function (cred) {
          var u = cred.user;
          return u.updateProfile({ displayName: nome }).then(function () {
            u.sendEmailVerification().catch(function () { /* o usuário pode reenviar pelo perfil */ });
            docUsuario(u.uid).set({ nome: nome, email: email, criadoEm: Date.now() }, { merge: true })
              .catch(function (e) { console.warn("Conta criada, mas o perfil não foi gravado no Firestore:", e); });
          });
        }).then(function () {
          registrando = false;
          avisar();
          return atual;
        }, function (e) {
          registrando = false;
          if (auth.currentUser) avisar();
          falha(e);
        });
      },

      entrar: function (d) {
        return auth.signInWithEmailAndPassword(String(d.email || "").trim(), String(d.senha || ""))
          .then(function () { return publico(auth.currentUser); }, falha);
      },

      entrarGoogle: function () {
        var provedor = new fb.auth.GoogleAuthProvider();
        provedor.setCustomParameters({ prompt: "select_account" });
        return auth.signInWithPopup(provedor).then(function (cred) {
          var u = cred.user;
          if (cred.additionalUserInfo && cred.additionalUserInfo.isNewUser) {
            docUsuario(u.uid).set({ nome: u.displayName || "", email: u.email || "", criadoEm: Date.now() }, { merge: true })
              .catch(function (e) { console.warn(e); });
          }
          return publico(u);
        }, falha);
      },

      sair: function () { return auth.signOut().catch(falha); },

      recuperarSenha: function (email) {
        try { email = validarEmail(email, false); } catch (e) { return Promise.reject(e); }
        return auth.sendPasswordResetEmail(email).catch(function (e) {
          // Não revela se o e-mail existe ou não
          if (e && (e.code === "auth/user-not-found")) return;
          falha(e);
        });
      },

      reenviarVerificacao: function () {
        try { return exigirSessao().sendEmailVerification().catch(falha); } catch (e) { return Promise.reject(e); }
      },

      recarregarUsuario: function () {
        if (!auth.currentUser) return Promise.resolve(null);
        return auth.currentUser.reload().then(function () { avisar(); return atual; }, falha);
      },

      alterarSenha: function (senhaAtual, novaSenha) {
        var u;
        try { u = exigirSessao(); validarSenha(novaSenha, cfg.senhaMinima); } catch (e) { return Promise.reject(e); }
        return reautenticar(u, senhaAtual).then(function () { return u.updatePassword(novaSenha); })
          .catch(function (e) {
            if (e && (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")) throw erro(e.code, "A senha atual não confere.");
            falha(e);
          });
      },

      alterarNome: function (nome) {
        var u;
        try { u = exigirSessao(); nome = validarNome(nome); } catch (e) { return Promise.reject(e); }
        return u.updateProfile({ displayName: nome }).then(function () {
          docUsuario(u.uid).set({ nome: nome }, { merge: true }).catch(function (e) { console.warn(e); });
          avisar();
          return atual;
        }, falha);
      },

      excluirConta: function (senhaAtual) {
        var u;
        try { u = exigirSessao(); } catch (e) { return Promise.reject(e); }
        return reautenticar(u, senhaAtual).then(function () {
          return semTravar(Promise.all([
            docRanking(u.uid).delete().catch(function () {}),
            docUsuario(u.uid).delete().catch(function () {})
          ]), 5000);
        }).then(function () { return u.delete(); })
          .catch(function (e) {
            if (e && (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")) throw erro(e.code, "A senha não confere.");
            falha(e);
          });
      },

      carregarDados: function () {
        var u;
        try { u = exigirSessao(); } catch (e) { return Promise.reject(e); }
        return comPrazo(docUsuario(u.uid).get(), 20000).then(function (snap) { return (snap.exists && snap.data()) || {}; });
      },

      salvarDados: function (parcial) {
        var u;
        try { u = exigirSessao(); } catch (e) { return Promise.reject(e); }
        return semTravar(docUsuario(u.uid).set(paraFirestore(parcial), { merge: true }), 4000);
      },

      publicarRanking: function (entrada) {
        var u;
        try { u = exigirSessao(); } catch (e) { return Promise.reject(e); }
        return semTravar(docRanking(u.uid).set(entrada), 4000);
      },

      lerRanking: function (limite) {
        return comPrazo(db.collection("ranking").orderBy("pontos", "desc").limit(limite || 100).get(), 20000).then(function (snap) {
          return snap.docs.map(function (d) { var e = d.data(); e.uid = d.id; return e; });
        });
      }
    };
  }

  /* ---------- carrega os arquivos do Firebase só quando for usar ---------- */
  function carregarScript(src) {
    return new Promise(function (ok, falha) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = function () { falha(erro("script", "Não foi possível carregar " + src)); };
      document.head.appendChild(s);
    });
  }

  function firebaseConfigurado(cfg) {
    var f = cfg && cfg.firebase;
    return !!(f && f.apiKey && f.projectId && f.appId);
  }

  /* Devolve uma Promise com o backend pronto para uso */
  function iniciar(cfg) {
    cfg = cfg || {};
    cfg.senhaMinima = cfg.senhaMinima || 8;
    if (!firebaseConfigurado(cfg)) return Promise.resolve(criarLocal(cfg));
    var base = "assets/vendor/";
    var jaTem = window.firebase && window.firebase.auth && window.firebase.firestore;
    var carga = jaTem ? Promise.resolve() :
      carregarScript(base + "firebase-app-compat.js")
        .then(function () { return carregarScript(base + "firebase-auth-compat.js"); })
        .then(function () { return carregarScript(base + "firebase-firestore-compat.js"); });
    return carga.then(function () { return criarFirebase(cfg); });
  }

  window.KLC_Backend = {
    iniciar: iniciar,
    firebaseConfigurado: firebaseConfigurado,
    _interno: { sha256: sha256, mesclar: mesclar, validarEmail: validarEmail, traduzir: traduzir }
  };
})();
