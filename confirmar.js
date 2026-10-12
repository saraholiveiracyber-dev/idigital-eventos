
"use strict";

/* =========================================================
   CONFIRMAÇÃO DE PRESENÇA — 24/10/2026
   Busca de nomes + seleção + confirmação + acompanhantes
========================================================= */

const SUPABASE_URL = "https://wiwvpqjlwmtmlexusiyd.supabase.co";
const SUPABASE_KEY = "sb_publishable_LzX0GpaYAK2KNSu2eetEuw_tr5PKqSi";

const MAX_ACOMPANHANTES = 5;
const MIN_CARACTERES = 2;

let supabaseClient = null;
let listaConvidados = [];
let convidadoSelecionado = null;
let carregando = false;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
    if (!window.supabase?.createClient) {
        mostrarMensagem("Não foi possível carregar o sistema. Atualize a página.", true);
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
   EVENTOS
========================================================= */

function configurarEventos() {
    $("nome")?.addEventListener("input", pesquisarNomes);

    $("nome")?.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
            evento.preventDefault();

            const primeiroResultado = $("resultados-nomes")
                ?.querySelector(".opcao-convidado");

            if (primeiroResultado) {
                primeiroResultado.click();
            } else if (convidadoSelecionado) {
                verificarConvidado();
            }
        }
    });

    $("btn-continuar")?.addEventListener("click", verificarConvidado);
    $("btn-confirmar")?.addEventListener("click", confirmarPresenca);
    $("btn-voltar")?.addEventListener("click", voltar);
    $("btn-tentar-novamente")?.addEventListener("click", voltar);
}

/* =========================================================
   CARREGAR LISTA
========================================================= */

async function carregarConvidados() {
    const resultados = $("resultados-nomes");

    if (resultados) {
        resultados.textContent = "Carregando lista de convidados...";
    }

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .select("id, nome, aniversariante, confirmado, acompanhantes")
            .order("nome", { ascending: true });

        if (error) throw error;

        listaConvidados = data || [];

        if (resultados) {
            resultados.innerHTML = "";

            const ajuda = document.createElement("p");
            ajuda.className = "ajuda-resultados";
            ajuda.textContent = "Digite pelo menos 2 letras para encontrar seu nome.";
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
   NORMALIZAR TEXTO
   Ignora acentos, maiúsculas e espaços extras
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

/* =========================================================
   PESQUISAR NOMES ENQUANTO DIGITA
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

    resultados.innerHTML = "";

    if (busca.length < MIN_CARACTERES) {
        const ajuda = document.createElement("p");
        ajuda.className = "ajuda-resultados";
        ajuda.textContent = "Digite pelo menos 2 letras para encontrar seu nome.";
        resultados.appendChild(ajuda);
        return;
    }

    if (!listaConvidados.length) {
        const aviso = document.createElement("p");
        aviso.className = "ajuda-resultados";
        aviso.textContent = "A lista não está disponível. Tente atualizar a página.";
        resultados.appendChild(aviso);
        return;
    }

    const termos = busca.split(" ").filter(Boolean);

    const encontrados = listaConvidados.filter((convidado) => {
        const nome = normalizar(convidado.nome);
        const palavrasNome = nome.split(" ");

        return termos.every((termo) =>
            nome.includes(termo) ||
            palavrasNome.some((palavra) => palavra.startsWith(termo))
        );
    });

    if (!encontrados.length) {
        const aviso = document.createElement("p");
        aviso.className = "ajuda-resultados";
        aviso.textContent = "Nenhum nome encontrado. Tente outro sobrenome ou confira a digitação.";
        resultados.appendChild(aviso);
        return;
    }

    const titulo = document.createElement("p");
    titulo.className = "ajuda-resultados";
    titulo.textContent = encontrados.length === 1
        ? "Encontramos este nome. Selecione para continuar:"
        : `${encontrados.length} nomes encontrados. Selecione o seu:`;

    resultados.appendChild(titulo);

    encontrados.slice(0, 30).forEach((convidado) => {
        const opcao = document.createElement("button");

        opcao.type = "button";
        opcao.className = "opcao-convidado";
        opcao.setAttribute("role", "option");

        const nome = document.createElement("strong");
        nome.textContent = convidado.nome || "Nome não informado";

        const detalhe = document.createElement("small");
        detalhe.textContent = convidado.confirmado === true
            ? "Presença já confirmada"
            : "Toque para selecionar";

        opcao.append(nome, detalhe);

        opcao.addEventListener("click", () => {
            selecionarConvidado(convidado, opcao);
        });

        resultados.appendChild(opcao);
    });

    if (encontrados.length > 30) {
        const aviso = document.createElement("p");
        aviso.className = "ajuda-resultados";
        aviso.textContent = "Há muitos resultados. Digite mais algumas letras para refinar a busca.";
        resultados.appendChild(aviso);
    }
}

/* =========================================================
   SELECIONAR CONVIDADO
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

    mostrarMensagem("Nome selecionado! Clique em Continuar para prosseguir.", false);
}

/* =========================================================
   CONTINUAR
========================================================= */

function verificarConvidado() {
    limparMensagem();

    if (!convidadoSelecionado) {
        mostrarMensagem("Primeiro, selecione seu nome na lista.", true);
        $("nome")?.focus();
        return;
    }

    const convidado = convidadoSelecionado;

    if (convidado.confirmado === true) {
        mostrarDadosJaConfirmado(convidado);
        return;
    }

    restaurarPasso2();

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
        $("nome-ja-confirmado").textContent = convidado.nome;
    }

    if ($("acompanhantes-ja-confirmado")) {
        $("acompanhantes-ja-confirmado").textContent =
            formatarAcompanhantes(Number(convidado.acompanhantes || 0));
    }

    mostrarPasso("confirmado");
}

/* =========================================================
   RESTAURAR PASSO 2
========================================================= */

function restaurarPasso2() {
    const titulo = $("passo-2")?.querySelector(".titulo-passo h2");
    const subtitulo = $("passo-2")?.querySelector(".titulo-passo span");

    if (titulo) titulo.textContent = "Encontramos seu nome!";
    if (subtitulo) subtitulo.textContent = "CONVITE LOCALIZADO";

    const convite = document.querySelector("#passo-2 .convite-localizado");
    const texto = document.querySelector("#passo-2 .texto-confirmacao");
    const campoAcompanhantes = $("passo-2")?.querySelector(".campo-acompanhantes");
    const btnConfirmar = $("btn-confirmar");

    if (convite) convite.style.display = "";
    if (texto) texto.style.display = "";
    if (campoAcompanhantes) campoAcompanhantes.style.display = "";
    if (btnConfirmar) btnConfirmar.style.display = "";
}

/* =========================================================
   CONFIRMAR PRESENÇA NO SUPABASE
========================================================= */

async function confirmarPresenca() {
    if (carregando) return;

    if (!convidadoSelecionado) {
        mostrarMensagem("Selecione seu nome antes de confirmar.", true);
        return;
    }

    const convidado = convidadoSelecionado;

    if (convidado.confirmado === true) {
        mostrarDadosJaConfirmado(convidado);
        return;
    }

    const quantidade = Number($("acompanhantes")?.value ?? 0);

    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > MAX_ACOMPANHANTES) {
        mostrarMensagem(`Escolha de 0 a ${MAX_ACOMPANHANTES} acompanhantes.`, true);
        return;
    }

    const botao = $("btn-confirmar");
    carregando = true;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "CONFIRMANDO...";
    }

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .update({
                confirmado: true,
                acompanhantes: quantidade
            })
            .eq("id", convidado.id)
            .eq("confirmado", false)
            .select("id, nome, aniversariante, confirmado, acompanhantes")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            // Evita sobrescrever uma confirmação feita em outra sessão.
            const { data: atual, error: erroConsulta } = await supabaseClient
                .from("convidados")
                .select("id, nome, aniversariante, confirmado, acompanhantes")
                .eq("id", convidado.id)
                .maybeSingle();

            if (erroConsulta) throw erroConsulta;

            if (atual?.confirmado === true) {
                convidadoSelecionado = atual;
                mostrarDadosJaConfirmado(atual);
                return;
            }

            throw new Error("A confirmação não foi registrada.");
        }

        convidadoSelecionado = data;

        if ($("nome-sucesso")) {
            $("nome-sucesso").textContent = data.nome;
        }

        if ($("sucesso-acompanhantes")) {
            $("sucesso-acompanhantes").textContent =
                formatarAcompanhantes(Number(data.acompanhantes || 0));
        }

        const indice = listaConvidados.findIndex((item) => item.id === data.id);
        if (indice !== -1) listaConvidados[indice] = data;

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
            botao.innerHTML = "<span>✓</span> CONFIRMAR MINHA PRESENÇA";
        }
    }
}

/* =========================================================
   ACOMPANHANTES
========================================================= */

function formatarAcompanhantes(quantidade) {
    quantidade = Number(quantidade || 0);

    if (quantidade === 0) return "Você irá sozinho.";
    if (quantidade === 1) return "Você irá com 1 acompanhante.";

    return `Você irá com ${quantidade} acompanhantes.`;
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

    if ($("resultados-nomes")) {
        $("resultados-nomes").innerHTML = "";

        const ajuda = document.createElement("p");
        ajuda.className = "ajuda-resultados";
        ajuda.textContent = "Digite pelo menos 2 letras para encontrar seu nome.";
        $("resultados-nomes").appendChild(ajuda);
    }

    $("nome-selecionado")?.classList.add("escondido");

    if ($("btn-continuar")) {
        $("btn-continuar").disabled = true;
        $("btn-continuar").innerHTML = "CONTINUAR <span>→</span>";
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
    if ($("btn-continuar")) $("btn-continuar").disabled = true;
    if ($("acompanhantes")) $("acompanhantes").value = "0";

    mostrarPasso("inicial");
}

/* =========================================================
   MENSAGENS
========================================================= */

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
