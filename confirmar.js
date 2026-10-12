
"use strict";

/* =========================================================
   CONFIRMAÇÃO DE PRESENÇA — 24/10/2026
   Convidados individuais + grupo Amigos Pilates
========================================================= */

const SUPABASE_URL = "https://wiwvpqjlwmtmlexusiyd.supabase.co";
const SUPABASE_KEY = "sb_publishable_LzX0GpaYAK2KNSu2eetEuw_tr5PKqSi";

const MAX_ACOMPANHANTES = 5;
const MIN_CARACTERES = 2;
const NOME_GRUPO = "Amigos Pilates";

let supabaseClient = null;
let listaConvidados = [];
let convidadoSelecionado = null;
let carregando = false;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
    if (!window.supabase?.createClient) {
        mostrarMensagem(
            "Não foi possível carregar o sistema. Atualize a página.",
            true
        );
        return;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    configurarEventos();
    configurarEstadoInicial();
    await carregarConvidados();
}

/* =========================================================
   UTILIDADES
========================================================= */

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function ehConviteDoGrupo(convidado) {
    return normalizar(convidado?.nome) === normalizar(NOME_GRUPO);
}

function nomeDoIntegrante(convidado) {
    const nome = String(convidado?.nome ?? "").trim();
    const sufixo = ` (${NOME_GRUPO})`;

    if (nome.toLowerCase().endsWith(sufixo.toLowerCase())) {
        return nome.slice(0, -sufixo.length).trim();
    }

    return nome;
}

function mostrarMensagem(texto, erro = false) {
    const elemento = $("mensagem");
    if (!elemento) return;

    elemento.textContent = texto;
    elemento.style.color = erro ? "#ff8585" : "#7edc91";
}

function limparMensagem() {
    const elemento = $("mensagem");
    if (elemento) elemento.textContent = "";
}

function formatarAcompanhantes(quantidade) {
    quantidade = Number(quantidade || 0);

    if (quantidade === 0) return "Você irá sozinho.";
    if (quantidade === 1) return "Você irá com 1 acompanhante.";

    return `Você irá com ${quantidade} acompanhantes.`;
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    $("nome")?.addEventListener("input", pesquisarNomes);

    $("nome")?.addEventListener("keydown", (evento) => {
        if (evento.key !== "Enter") return;

        evento.preventDefault();

        const primeiroResultado = $("resultados-nomes")
            ?.querySelector(".opcao-convidado");

        if (primeiroResultado) {
            primeiroResultado.click();
        } else if (convidadoSelecionado) {
            verificarConvidado();
        }
    });

    $("btn-continuar")?.addEventListener(
        "click",
        verificarConvidado
    );

    $("btn-confirmar")?.addEventListener(
        "click",
        confirmarPresenca
    );

    $("btn-voltar")?.addEventListener("click", voltar);
    $("btn-tentar-novamente")?.addEventListener("click", voltar);
}

/* =========================================================
   CARREGAR LISTA DO SUPABASE
========================================================= */

async function carregarConvidados() {
    const resultados = $("resultados-nomes");

    if (resultados) {
        resultados.textContent = "Carregando lista de convidados...";
    }

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .select(
                "id, nome, aniversariante, confirmado, acompanhantes"
            )
            .order("nome", { ascending: true });

        if (error) throw error;

        listaConvidados = data || [];

        if (resultados) {
            resultados.replaceChildren();

            const ajuda = document.createElement("p");
            ajuda.className = "ajuda-resultados";
            ajuda.textContent =
                "Digite pelo menos 2 letras para encontrar seu nome.";

            resultados.appendChild(ajuda);
        }
    } catch (erro) {
        console.error("Erro ao carregar convidados:", erro);

        if (resultados) {
            resultados.textContent =
                "Não foi possível carregar a lista. Atualize a página e tente novamente.";
        }
    }
}

/* =========================================================
   BUSCAR NOMES
========================================================= */

function pesquisarNomes() {
    const campo = $("nome");
    const resultados = $("resultados-nomes");
    const botaoContinuar = $("btn-continuar");

    if (!campo || !resultados) return;

    const busca = normalizar(campo.value);

    convidadoSelecionado = null;

    if (botaoContinuar) {
        botaoContinuar.disabled = true;
    }

    $("nome-selecionado")?.classList.add("escondido");
    limparMensagem();
    resultados.replaceChildren();

    if (busca.length < MIN_CARACTERES) {
        adicionarAjuda(
            resultados,
            "Digite pelo menos 2 letras para encontrar seu nome."
        );
        return;
    }

    if (!listaConvidados.length) {
        adicionarAjuda(
            resultados,
            "A lista não está disponível. Tente atualizar a página."
        );
        return;
    }

    const termos = busca.split(" ").filter(Boolean);

    const encontrados = listaConvidados.filter((convidado) => {
        const nome = normalizar(convidado.nome);
        const palavras = nome.split(" ");

        return termos.every((termo) =>
            nome.includes(termo) ||
            palavras.some((palavra) => palavra.startsWith(termo))
        );
    });

    /*
       Quando a busca corresponde exatamente ao grupo,
       mostra o convite original primeiro.
    */

    encontrados.sort((a, b) => {
        const aEhGrupo = ehConviteDoGrupo(a);
        const bEhGrupo = ehConviteDoGrupo(b);

        if (aEhGrupo && !bEhGrupo) return -1;
        if (!aEhGrupo && bEhGrupo) return 1;

        return String(a.nome).localeCompare(
            String(b.nome),
            "pt-BR"
        );
    });

    if (!encontrados.length) {
        adicionarAjuda(
            resultados,
            "Nenhum nome encontrado. Tente outro sobrenome ou confira a digitação."
        );
        return;
    }

    adicionarAjuda(
        resultados,
        encontrados.length === 1
            ? "Encontramos este nome. Selecione para continuar:"
            : `${encontrados.length} resultados. Selecione seu convite:`
    );

    encontrados.slice(0, 30).forEach((convidado) => {
        const opcao = document.createElement("button");

        opcao.type = "button";
        opcao.className = "opcao-convidado";
        opcao.setAttribute("role", "option");
        opcao.setAttribute("aria-selected", "false");

        const nome = document.createElement("strong");
        nome.textContent = convidado.nome || "Nome não informado";

        const detalhe = document.createElement("small");

        if (ehConviteDoGrupo(convidado)) {
            detalhe.textContent =
                "Convite de grupo · selecione para informar seu nome";
        } else if (convidado.confirmado === true) {
            detalhe.textContent = "Presença já confirmada";
        } else {
            detalhe.textContent = "Toque para selecionar";
        }

        opcao.append(nome, detalhe);

        opcao.addEventListener("click", () => {
            selecionarConvidado(convidado, opcao);
        });

        resultados.appendChild(opcao);
    });

    if (encontrados.length > 30) {
        adicionarAjuda(
            resultados,
            "Há muitos resultados. Digite mais algumas letras para refinar a busca."
        );
    }
}

function adicionarAjuda(container, texto) {
    const elemento = document.createElement("p");
    elemento.className = "ajuda-resultados";
    elemento.textContent = texto;
    container.appendChild(elemento);
}

/* =========================================================
   SELECIONAR CONVIDADO OU GRUPO
========================================================= */

function selecionarConvidado(convidado, botaoClicado) {
    convidadoSelecionado = convidado;

    document.querySelectorAll(".opcao-convidado").forEach((botao) => {
        botao.classList.remove("selecionado");
        botao.setAttribute("aria-selected", "false");
    });

    if (botaoClicado) {
        botaoClicado.classList.add("selecionado");
        botaoClicado.setAttribute("aria-selected", "true");
    }

    const nomeEscolhido = $("nome-escolhido");
    const areaSelecionado = $("nome-selecionado");
    const botaoContinuar = $("btn-continuar");

    if (nomeEscolhido) {
        nomeEscolhido.textContent = convidado.nome;
    }

    areaSelecionado?.classList.remove("escondido");

    if (botaoContinuar) {
        botaoContinuar.disabled = false;
        botaoContinuar.innerHTML = "CONTINUAR <span>→</span>";
    }

    mostrarMensagem(
        ehConviteDoGrupo(convidado)
            ? "Grupo selecionado! No próximo passo, informe seu nome."
            : "Nome selecionado! Clique em Continuar para prosseguir.",
        false
    );
}

/* =========================================================
   CONTINUAR PARA A CONFIRMAÇÃO
========================================================= */

function verificarConvidado() {
    limparMensagem();

    if (!convidadoSelecionado) {
        mostrarMensagem(
            "Primeiro, selecione seu nome na lista.",
            true
        );
        $("nome")?.focus();
        return;
    }

    const convidado = convidadoSelecionado;

    /*
       O convite do grupo é apenas a entrada para o cadastro.
       Não confirmamos o registro coletivo.
    */

    if (ehConviteDoGrupo(convidado)) {
        restaurarPasso2();

        const titulo = $("passo-2")?.querySelector(
            ".titulo-passo h2"
        );
        const subtitulo = $("passo-2")?.querySelector(
            ".titulo-passo span"
        );
        const nomeEncontrado = $("nome-encontrado");
        const campoGrupo = $("campo-integrante-grupo");
        const inputIntegrante = $("nome-integrante-grupo");
        const acompanhantes = $("acompanhantes");

        if (titulo) {
            titulo.textContent = "Quem está confirmando?";
        }

        if (subtitulo) {
            subtitulo.textContent = "GRUPO AMIGOS PILATES";
        }

        if (nomeEncontrado) {
            nomeEncontrado.textContent = NOME_GRUPO;
        }

        campoGrupo?.classList.remove("escondido");

        if (inputIntegrante) {
            inputIntegrante.value = "";
            inputIntegrante.required = true;
        }

        if (acompanhantes) {
            acompanhantes.value = "0";
        }

        mostrarPasso("confirmar");
        inputIntegrante?.focus();
        return;
    }

    if (convidado.confirmado === true) {
        mostrarDadosJaConfirmado(convidado);
        return;
    }

    restaurarPasso2();

    $("campo-integrante-grupo")?.classList.add("escondido");

    if ($("nome-integrante-grupo")) {
        $("nome-integrante-grupo").value = "";
        $("nome-integrante-grupo").required = false;
    }

    if ($("nome-encontrado")) {
        $("nome-encontrado").textContent = convidado.nome;
    }

    if ($("acompanhantes")) {
        $("acompanhantes").value = "0";
    }

    mostrarPasso("confirmar");
}

/* =========================================================
   PRESENÇA JÁ CONFIRMADA
========================================================= */

function mostrarDadosJaConfirmado(convidado) {
    if ($("nome-ja-confirmado")) {
        $("nome-ja-confirmado").textContent =
            nomeDoIntegrante(convidado);
    }

    if ($("acompanhantes-ja-confirmado")) {
        $("acompanhantes-ja-confirmado").textContent =
            formatarAcompanhantes(
                Number(convidado.acompanhantes || 0)
            );
    }

    mostrarPasso("confirmado");
}

/* =========================================================
   RESTAURAR PASSO 2
========================================================= */

function restaurarPasso2() {
    const titulo = $("passo-2")?.querySelector(
        ".titulo-passo h2"
    );
    const subtitulo = $("passo-2")?.querySelector(
        ".titulo-passo span"
    );

    if (titulo) titulo.textContent = "Encontramos seu nome!";
    if (subtitulo) subtitulo.textContent = "CONVITE LOCALIZADO";

    const convite = document.querySelector(
        "#passo-2 .convite-localizado"
    );
    const texto = document.querySelector(
        "#passo-2 .texto-confirmacao"
    );
    const campoAcompanhantes = $("passo-2")?.querySelector(
        ".campo-acompanhantes"
    );
    const btnConfirmar = $("btn-confirmar");

    if (convite) convite.style.display = "";
    if (texto) texto.style.display = "";
    if (campoAcompanhantes) campoAcompanhantes.style.display = "";
    if (btnConfirmar) btnConfirmar.style.display = "";

    $("campo-integrante-grupo")?.classList.add("escondido");
}

/* =========================================================
   CONFIRMAR INTEGRANTE DO GRUPO
========================================================= */

async function confirmarIntegranteGrupo(quantidade) {
    const campo = $("nome-integrante-grupo");
    const nomeDigitado = String(campo?.value ?? "")
        .replace(/\s+/g, " ")
        .trim();

    if (!nomeDigitado) {
        mostrarMensagem("Digite seu nome completo.", true);
        campo?.focus();
        return;
    }

    if (nomeDigitado.length < 2) {
        mostrarMensagem("Digite um nome válido.", true);
        campo?.focus();
        return;
    }

    /*
       Salvamos o grupo no final do nome para identificar
       a qual convite o integrante pertence sem exigir
       uma nova coluna na tabela.
    */

    const nomeBanco = `${nomeDigitado} (${NOME_GRUPO})`;
    const nomeNormalizado = normalizar(nomeBanco);

    const existente = listaConvidados.find((item) =>
        normalizar(item.nome) === nomeNormalizado
    );

    if (existente) {
        convidadoSelecionado = existente;
        mostrarDadosJaConfirmado(existente);

        mostrarMensagem(
            "Encontramos uma confirmação anterior para esse nome.",
            false
        );
        return;
    }

    const conviteGrupo = convidadoSelecionado;

    const { data, error } = await supabaseClient
        .from("convidados")
        .insert({
            nome: nomeBanco,
            aniversariante: conviteGrupo.aniversariante,
            confirmado: true,
            acompanhantes: quantidade
        })
        .select(
            "id, nome, aniversariante, confirmado, acompanhantes"
        )
        .single();

    if (error) throw error;

    listaConvidados.push(data);
    convidadoSelecionado = data;

    if ($("nome-sucesso")) {
        $("nome-sucesso").textContent = nomeDigitado;
    }

    if ($("sucesso-acompanhantes")) {
        $("sucesso-acompanhantes").textContent =
            formatarAcompanhantes(quantidade);
    }

    mostrarPasso("sucesso");
}

/* =========================================================
   CONFIRMAR PRESENÇA
========================================================= */

async function confirmarPresenca() {
    if (carregando) return;

    if (!convidadoSelecionado) {
        mostrarMensagem(
            "Selecione seu nome antes de confirmar.",
            true
        );
        return;
    }

    const quantidade = Number(
        $("acompanhantes")?.value ?? 0
    );

    if (
        !Number.isInteger(quantidade) ||
        quantidade < 0 ||
        quantidade > MAX_ACOMPANHANTES
    ) {
        mostrarMensagem(
            `Escolha de 0 a ${MAX_ACOMPANHANTES} acompanhantes.`,
            true
        );
        return;
    }

    const botao = $("btn-confirmar");

    carregando = true;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "CONFIRMANDO...";
    }

    try {
        /*
           Fluxo exclusivo do grupo:
           cria um registro individual já confirmado.
        */

        if (ehConviteDoGrupo(convidadoSelecionado)) {
            await confirmarIntegranteGrupo(quantidade);
            return;
        }

        const convidado = convidadoSelecionado;

        if (convidado.confirmado === true) {
            mostrarDadosJaConfirmado(convidado);
            return;
        }

        const { data, error } = await supabaseClient
            .from("convidados")
            .update({
                confirmado: true,
                acompanhantes: quantidade
            })
            .eq("id", convidado.id)
            .eq("confirmado", false)
            .select(
                "id, nome, aniversariante, confirmado, acompanhantes"
            )
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            const { data: atual, error: erroConsulta } =
                await supabaseClient
                    .from("convidados")
                    .select(
                        "id, nome, aniversariante, confirmado, acompanhantes"
                    )
                    .eq("id", convidado.id)
                    .maybeSingle();

            if (erroConsulta) throw erroConsulta;

            if (atual?.confirmado === true) {
                convidadoSelecionado = atual;
                mostrarDadosJaConfirmado(atual);
                return;
            }

            throw new Error(
                "A confirmação não foi registrada."
            );
        }

        convidadoSelecionado = data;

        if ($("nome-sucesso")) {
            $("nome-sucesso").textContent = data.nome;
        }

        if ($("sucesso-acompanhantes")) {
            $("sucesso-acompanhantes").textContent =
                formatarAcompanhantes(
                    Number(data.acompanhantes || 0)
                );
        }

        const indice = listaConvidados.findIndex(
            (item) => String(item.id) === String(data.id)
        );

        if (indice !== -1) {
            listaConvidados[indice] = data;
        }

        mostrarPasso("sucesso");
    } catch (erro) {
        console.error("Erro ao confirmar presença:", erro);

        mostrarMensagem(
            "Não foi possível confirmar sua presença. Verifique a conexão e tente novamente.",
            true
        );
    } finally {
        carregando = false;

        if (botao) {
            botao.disabled = false;
            botao.innerHTML =
                "<span>✓</span> CONFIRMAR MINHA PRESENÇA";
        }
    }
}

/* =========================================================
   MOSTRAR ETAPAS
========================================================= */

function mostrarPasso(passo) {
    const etapas = {
        inicial: $("passo-1"),
        confirmar: $("passo-2"),
        sucesso: $("passo-3"),
        confirmado: $("passo-confirmado"),
        "nao-encontrado": $("passo-nao-encontrado")
    };

    Object.values(etapas).forEach((elemento) => {
        elemento?.classList.add("escondido");
    });

    etapas[passo]?.classList.remove("escondido");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   VOLTAR À BUSCA
========================================================= */

function voltar() {
    convidadoSelecionado = null;

    if ($("nome")) $("nome").value = "";
    if ($("acompanhantes")) $("acompanhantes").value = "0";
    if ($("nome-integrante-grupo")) {
        $("nome-integrante-grupo").value = "";
    }

    const resultados = $("resultados-nomes");

    if (resultados) {
        resultados.replaceChildren();

        adicionarAjuda(
            resultados,
            "Digite pelo menos 2 letras para encontrar seu nome."
        );
    }

    $("nome-selecionado")?.classList.add("escondido");

    if ($("btn-continuar")) {
        $("btn-continuar").disabled = true;
        $("btn-continuar").innerHTML =
            "CONTINUAR <span>→</span>";
    }

    restaurarPasso2();
    limparMensagem();
    mostrarPasso("inicial");
    $("nome")?.focus();
}

/* =========================================================
   ESTADO INICIAL
========================================================= */

function configurarEstadoInicial() {
    if ($("btn-continuar")) {
        $("btn-continuar").disabled = true;
    }

    if ($("acompanhantes")) {
        $("acompanhantes").value = "0";
    }

    if ($("nome-integrante-grupo")) {
        $("nome-integrante-grupo").required = false;
    }

    restaurarPasso2();
    mostrarPasso("inicial");
}
