/* =========================================================
   LISTA DE CONVIDADOS
   ANIVERSÁRIO — 24/10/2026
   S7 SYSTEMS — CONTROLE DE PRESENÇAS
========================================================= */

"use strict";

/* =========================================================
   PROTEÇÃO VISUAL POR SENHA
========================================================= */

const SENHA_CORRETA = "222530";
const CHAVE_SESSAO = "lista_autorizada";

let sistemaInicializado = false;

function configurarProtecao() {
    const telaSenha = document.getElementById("tela-senha");
    const formularioSenha = document.getElementById("form-senha");
    const campoSenha = document.getElementById("senha-acesso");
    const erroSenha = document.getElementById("erro-senha");

    if (!telaSenha || !formularioSenha) {
        liberarSistema();
        return;
    }

    if (sessionStorage.getItem(CHAVE_SESSAO) === "true") {
        liberarSistema();
        return;
    }

    formularioSenha.addEventListener("submit", function (evento) {
        evento.preventDefault();

        const senha = campoSenha?.value.trim() ?? "";

        if (senha === SENHA_CORRETA) {
            sessionStorage.setItem(CHAVE_SESSAO, "true");

            if (erroSenha) {
                erroSenha.textContent = "";
            }

            liberarSistema();
        } else {
            if (erroSenha) {
                erroSenha.textContent = "Senha incorreta. Tente novamente.";
            }

            if (campoSenha) {
                campoSenha.value = "";
                campoSenha.focus();
            }
        }
    });
}

function liberarSistema() {
    const telaSenha = document.getElementById("tela-senha");
    const aplicativo = document.getElementById("app");

    if (telaSenha) {
        telaSenha.hidden = true;
        telaSenha.remove();
    }

    if (aplicativo) {
        aplicativo.hidden = false;
    }

    iniciarSistema();
}

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://wiwvpqjlwmtmlexusiyd.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_LzX0GpaYAK2KNSu2eetEuw_tr5PKqSi";

let supabaseClient = null;

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

/*
   Não existe mais LIMITE de convidados.

   Sarah, Jeice e Ione são suportadas.
   Para visualizar cada lista, o HTML precisa ter
   um botão .tab com data-aniversariante correspondente.
*/

const ANIVERSARIANTES = {
    sarah: "Sarah",
    jeice: "Jeice",
    ione: "Ione"
};

/* =========================================================
   ESTADO
========================================================= */

let aniversarianteAtual = "sarah";
let convidados = [];
let timerMensagem = null;

/* =========================================================
   INICIALIZAR SISTEMA
========================================================= */

function iniciarSistema() {
    if (sistemaInicializado) return;

    sistemaInicializado = true;

    configurarEventos();

    const supabaseOK = iniciarSupabase();

    if (!supabaseOK) return;

    selecionarAniversariante("sarah");
    carregarConvidados();
}

/* =========================================================
   INICIALIZAR SUPABASE
========================================================= */

function iniciarSupabase() {
    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        mostrarMensagem(
            "A biblioteca do Supabase não foi carregada. Verifique o HTML.",
            "erro"
        );

        console.error("Supabase JS não está disponível.");
        return false;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

        return true;
    } catch (erro) {
        console.error("Erro ao inicializar Supabase:", erro);

        mostrarMensagem(
            "Não foi possível iniciar a conexão com o banco de dados.",
            "erro"
        );

        return false;
    }
}

/* =========================================================
   UTILIDADES
========================================================= */

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function obterAcompanhantes(convidado) {
    const quantidade = Number(convidado?.acompanhantes ?? 0);

    if (!Number.isFinite(quantidade) || quantidade < 0) {
        return 0;
    }

    return Math.floor(quantidade);
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function mostrarMensagem(texto, tipo = "") {
    const elemento = document.getElementById("mensagem");

    if (!elemento) return;

    clearTimeout(timerMensagem);

    elemento.textContent = texto;
    elemento.className = "mensagem";

    if (tipo) {
        elemento.classList.add(tipo);
    }

    if (texto) {
        timerMensagem = setTimeout(() => {
            elemento.textContent = "";
            elemento.className = "mensagem";
        }, 4500);
    }
}

function obterCampo(id) {
    return document.getElementById(id);
}

function obterTextoSeguro(valor) {
    return escaparHTML(valor);
}

/* =========================================================
   FILTRAR CONVIDADOS POR ANIVERSARIANTE
========================================================= */

function convidadosDaAniversariante(aniversariante) {
    return convidados.filter((convidado) => {
        return (
            normalizar(convidado.aniversariante) ===
            normalizar(aniversariante)
        );
    });
}

/* =========================================================
   ORDENAR CONVIDADOS
========================================================= */

function ordenarConvidados(lista) {
    return [...lista].sort((a, b) => {
        const dataA = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

        const dataB = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

        if (dataA && dataB && dataA !== dataB) {
            return dataA - dataB;
        }

        return Number(a.id) - Number(b.id);
    });
}

/* =========================================================
   SELECIONAR ANIVERSARIANTE
========================================================= */

function selecionarAniversariante(aniversariante) {
    const chave = normalizar(aniversariante);

    if (!Object.prototype.hasOwnProperty.call(ANIVERSARIANTES, chave)) {
        return;
    }

    aniversarianteAtual = chave;

    document.querySelectorAll(".tab").forEach((botao) => {
        botao.classList.toggle(
            "ativo",
            normalizar(botao.dataset.aniversariante) === chave
        );
    });

    const titulo = obterCampo("nome-aniversariante");

    if (titulo) {
        titulo.textContent = ANIVERSARIANTES[chave];
    }

    const input = obterCampo("nome");

    if (input) {
        input.value = "";
        input.disabled = false;
        input.placeholder = "Digite o nome completo";
    }

    const botaoSalvar = obterCampo("btn-salvar");

    if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "SALVAR CONVIDADO";
    }

    renderizar();
}

/* =========================================================
   CARREGAR CONVIDADOS DO SUPABASE
========================================================= */

async function carregarConvidados() {
    if (!supabaseClient) return;

    mostrarMensagem("Carregando lista...");

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .select(`
                id,
                nome,
                aniversariante,
                confirmado,
                acompanhantes,
                created_at
            `)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Erro ao carregar convidados:", error);

            mostrarMensagem(
                "Não foi possível carregar os convidados. Verifique as políticas RLS do Supabase.",
                "erro"
            );

            return;
        }

        convidados = Array.isArray(data) ? data : [];

        renderizar();

        mostrarMensagem("Lista atualizada.", "sucesso");
    } catch (erro) {
        console.error("Erro de conexão:", erro);

        mostrarMensagem(
            "Erro de conexão com o banco de dados.",
            "erro"
        );
    }
}

/* =========================================================
   RENDERIZAR CONTADORES E LISTAS
========================================================= */

function renderizar() {
    const lista = ordenarConvidados(
        convidadosDaAniversariante(aniversarianteAtual)
    );

    const confirmados = lista.filter(
        (convidado) => convidado.confirmado === true
    );

    const pendentes = lista.filter(
        (convidado) => convidado.confirmado !== true
    );

    const total = lista.length;

    const totalAcompanhantes = confirmados.reduce(
        (soma, convidado) => soma + obterAcompanhantes(convidado),
        0
    );

    const totalEvento = confirmados.length + totalAcompanhantes;

    /*
       SEM LIMITE DE CADASTRO.
       O indicador de vagas fica como infinito.
    */

    const vagas = "∞";

    const contadores = {
        contador: total,
        total: total,
        "total-confirmados": confirmados.length,
        "total-acompanhantes": totalAcompanhantes,
        "total-evento": totalEvento,
        "total-pendentes": pendentes.length,
        "total-vagas": vagas
    };

    Object.entries(contadores).forEach(([id, valor]) => {
        const elemento = obterCampo(id);

        if (elemento) {
            elemento.textContent = String(valor);
        }
    });

    renderizarListaCompleta(lista);
    renderizarListaConfirmados(confirmados);

    /*
       Cadastro sempre habilitado.
       Não existe bloqueio por quantidade de convidados.
    */

    const input = obterCampo("nome");
    const botao = obterCampo("btn-salvar");

    if (input) {
        input.disabled = false;
        input.placeholder = "Digite o nome completo";
    }

    if (botao) {
        botao.disabled = false;
    }
}

/* =========================================================
   RENDERIZAR LISTA COMPLETA
========================================================= */

function renderizarListaCompleta(lista) {
    const elemento = obterCampo("lista-convidados");

    if (!elemento) return;

    if (lista.length === 0) {
        elemento.innerHTML = criarEstadoVazio(
            "Nenhum convidado cadastrado.",
            "Adicione o primeiro convidado acima."
        );

        return;
    }

    elemento.innerHTML = lista
        .map((convidado, indice) => {
            return criarLinhaConvidado(convidado, indice + 1);
        })
        .join("");
}

/* =========================================================
   RENDERIZAR LISTA DE CONFIRMADOS
========================================================= */

function renderizarListaConfirmados(confirmados) {
    const elemento = obterCampo("lista-confirmados");

    if (!elemento) return;

    if (confirmados.length === 0) {
        elemento.innerHTML = criarEstadoVazio(
            "Nenhuma presença confirmada.",
            "Os convidados confirmados aparecerão aqui."
        );

        return;
    }

    elemento.innerHTML = confirmados
        .map((convidado, indice) => {
            return criarLinhaConfirmado(convidado, indice + 1);
        })
        .join("");
}

/* =========================================================
   ESTADO VAZIO
========================================================= */

function criarEstadoVazio(titulo, descricao) {
    return `
        <div class="lista-vazia">
            <span>${escaparHTML(titulo)}</span>
            <small>${escaparHTML(descricao)}</small>
        </div>
    `;
}

/* =========================================================
   TEXTO DE ACOMPANHANTES
========================================================= */

function textoAcompanhantes(quantidade) {
    quantidade = Number(quantidade || 0);

    if (quantidade === 0) return "";
    if (quantidade === 1) return "1 acompanhante";

    return `${quantidade} acompanhantes`;
}

/* =========================================================
   LINHA — LISTA COMPLETA
========================================================= */

function criarLinhaConvidado(convidado, numero) {
    const confirmado = convidado.confirmado === true;

    const quantidadeAcompanhantes = obterAcompanhantes(convidado);

    const acompanhantesTexto = textoAcompanhantes(
        quantidadeAcompanhantes
    );

    const status = confirmado
        ? `
            <span class="status status-confirmado-row">
                ✓ CONFIRMADO
            </span>
        `
        : `
            <span class="status status-pendente-row">
                PENDENTE
            </span>
        `;

    const acompanhanteBadge =
        confirmado && quantidadeAcompanhantes > 0
            ? `
                <span class="status status-acompanhante-row">
                    + ${escaparHTML(acompanhantesTexto)}
                </span>
            `
            : "";

    const botaoConfirmacao = confirmado
        ? `
            <button
                type="button"
                class="btn-desconfirmar"
                data-acao="desconfirmar"
                data-id="${escaparHTML(convidado.id)}"
            >
                DESCONFIRMAR
            </button>
        `
        : `
            <button
                type="button"
                class="btn-confirmar"
                data-acao="confirmar"
                data-id="${escaparHTML(convidado.id)}"
            >
                CONFIRMAR PRESENÇA
            </button>
        `;

    const textoAcompanhante =
        confirmado && quantidadeAcompanhantes > 0
            ? `
                <small style="
                    display:block;
                    margin-top:5px;
                    color:#d4af37;
                    font-size:10px;
                    font-weight:600;
                ">
                    + ${escaparHTML(acompanhantesTexto)}
                </small>
            `
            : "";

    return `
        <article class="convidado">
            <div class="convidado-info">
                <span class="numero">
                    ${String(numero).padStart(2, "0")}
                </span>

                <div>
                    <strong class="nome-convidado">
                        ${escaparHTML(convidado.nome)}
                    </strong>

                    ${textoAcompanhante}
                </div>
            </div>

            <div class="acoes">
                ${status}
                ${acompanhanteBadge}
                ${botaoConfirmacao}

                <button
                    type="button"
                    class="btn-remover"
                    data-acao="remover"
                    data-id="${escaparHTML(convidado.id)}"
                    title="Remover convidado"
                    aria-label="Remover convidado"
                >
                    ×
                </button>
            </div>
        </article>
    `;
}

/* =========================================================
   LINHA — CONFIRMADOS
========================================================= */

function criarLinhaConfirmado(convidado, numero) {
    const quantidadeAcompanhantes = obterAcompanhantes(convidado);

    const acompanhantesTexto = textoAcompanhantes(
        quantidadeAcompanhantes
    );

    const textoAcompanhantesHTML =
        quantidadeAcompanhantes === 0
            ? "Sem acompanhantes"
            : `+ ${escaparHTML(acompanhantesTexto)}`;

    const acompanhanteBadge =
        quantidadeAcompanhantes > 0
            ? `
                <span class="status status-acompanhante-row">
                    + ${escaparHTML(acompanhantesTexto)}
                </span>
            `
            : "";

    return `
        <article class="convidado">
            <div class="convidado-info">
                <span class="numero">
                    ${String(numero).padStart(2, "0")}
                </span>

                <div>
                    <strong class="nome-convidado">
                        ${escaparHTML(convidado.nome)}
                    </strong>

                    <small style="
                        display:block;
                        margin-top:5px;
                        color:#d4af37;
                        font-size:10px;
                        font-weight:600;
                    ">
                        ${textoAcompanhantesHTML}
                    </small>
                </div>
            </div>

            <div class="acoes">
                <span class="status status-confirmado-row">
                    ✓ CONFIRMADO
                </span>

                ${acompanhanteBadge}

                <button
                    type="button"
                    class="btn-desconfirmar"
                    data-acao="desconfirmar"
                    data-id="${escaparHTML(convidado.id)}"
                >
                    DESCONFIRMAR
                </button>
            </div>
        </article>
    `;
}

/* =========================================================
   SALVAR CONVIDADO — SEM LIMITE
========================================================= */

async function salvarConvidado(nome) {
    if (!supabaseClient) {
        mostrarMensagem("Supabase não inicializado.", "erro");
        return;
    }

    const nomeLimpo = String(nome ?? "").trim();

    if (!nomeLimpo) {
        mostrarMensagem("Digite o nome do convidado.", "erro");
        return;
    }

    const lista = convidadosDaAniversariante(
        aniversarianteAtual
    );

    /*
       Não há verificação de LIMITE.
       O cadastro pode continuar independentemente
       da quantidade de pessoas na lista.
    */

    const duplicado = lista.some((convidado) => {
        return normalizar(convidado.nome) === normalizar(nomeLimpo);
    });

    if (duplicado) {
        mostrarMensagem(
            "Este convidado já está cadastrado nesta lista.",
            "erro"
        );

        return;
    }

    const botao = obterCampo("btn-salvar");
    const textoOriginal = botao?.textContent;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "SALVANDO...";
    }

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .insert({
                nome: nomeLimpo,
                aniversariante: aniversarianteAtual,
                confirmado: false,
                acompanhantes: 0
            })
            .select(`
                id,
                nome,
                aniversariante,
                confirmado,
                acompanhantes,
                created_at
            `)
            .single();

        if (error) {
            console.error("Erro ao salvar convidado:", error);

            mostrarMensagem(
                "Não foi possível salvar. Verifique a conexão e as permissões do Supabase.",
                "erro"
            );

            return;
        }

        convidados.push(data);

        const input = obterCampo("nome");

        if (input) {
            input.value = "";
        }

        renderizar();

        mostrarMensagem(
            `${nomeLimpo} foi adicionado à lista.`,
            "sucesso"
        );

        if (input) {
            input.focus();
        }
    } catch (erro) {
        console.error("Erro ao salvar:", erro);

        mostrarMensagem(
            "Ocorreu um erro ao salvar o convidado.",
            "erro"
        );
    } finally {
        if (botao) {
            botao.textContent = textoOriginal || "SALVAR CONVIDADO";
        }

        renderizar();
    }
}

/* =========================================================
   CONFIRMAR PRESENÇA
========================================================= */

async function confirmarPresenca(id) {
    const convidado = encontrarConvidado(id);

    if (!convidado) {
        mostrarMensagem("Convidado não encontrado.", "erro");
        return;
    }

    const desejaConfirmar = window.confirm(
        `Confirmar a presença de ${convidado.nome}?`
    );

    if (!desejaConfirmar) return;

    await atualizarConfirmacao(id, true);
}

/* =========================================================
   DESCONFIRMAR PRESENÇA
========================================================= */

async function desconfirmarPresenca(id) {
    const convidado = encontrarConvidado(id);

    if (!convidado) {
        mostrarMensagem("Convidado não encontrado.", "erro");
        return;
    }

    const desejaDesconfirmar = window.confirm(
        `Retirar a confirmação de ${convidado.nome}?`
    );

    if (!desejaDesconfirmar) return;

    await atualizarConfirmacao(id, false);
}

/* =========================================================
   ATUALIZAR CONFIRMAÇÃO
========================================================= */

async function atualizarConfirmacao(id, confirmado) {
    if (!supabaseClient) {
        mostrarMensagem("Supabase não inicializado.", "erro");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .update({
                confirmado: confirmado
            })
            .eq("id", id)
            .select(`
                id,
                nome,
                aniversariante,
                confirmado,
                acompanhantes,
                created_at
            `)
            .single();

        if (error) {
            console.error("Erro ao atualizar confirmação:", error);

            mostrarMensagem(
                confirmado
                    ? "Não foi possível confirmar a presença."
                    : "Não foi possível retirar a confirmação.",
                "erro"
            );

            return;
        }

        const indice = convidados.findIndex((item) => {
            return String(item.id) === String(id);
        });

        if (indice !== -1) {
            convidados[indice] = data;
        }

        renderizar();

        mostrarMensagem(
            confirmado
                ? `${data.nome} confirmou presença.`
                : `${data.nome} voltou para pendentes.`,
            "sucesso"
        );
    } catch (erro) {
        console.error("Erro na confirmação:", erro);

        mostrarMensagem(
            "Erro ao atualizar a confirmação.",
            "erro"
        );
    }
}

/* =========================================================
   REMOVER CONVIDADO
========================================================= */

async function removerConvidado(id) {
    if (!supabaseClient) {
        mostrarMensagem("Supabase não inicializado.", "erro");
        return;
    }

    const convidado = encontrarConvidado(id);

    if (!convidado) {
        mostrarMensagem("Convidado não encontrado.", "erro");
        return;
    }

    const desejaRemover = window.confirm(
        `Deseja remover ${convidado.nome} da lista?`
    );

    if (!desejaRemover) return;

    try {
        const { error } = await supabaseClient
            .from("convidados")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Erro ao remover:", error);

            mostrarMensagem(
                "Não foi possível remover o convidado.",
                "erro"
            );

            return;
        }

        convidados = convidados.filter((item) => {
            return String(item.id) !== String(id);
        });

        renderizar();

        mostrarMensagem(
            `${convidado.nome} foi removido.`,
            "sucesso"
        );
    } catch (erro) {
        console.error("Erro ao remover convidado:", erro);

        mostrarMensagem(
            "Erro ao remover o convidado.",
            "erro"
        );
    }
}

/* =========================================================
   ENCONTRAR CONVIDADO
========================================================= */

function encontrarConvidado(id) {
    return convidados.find((convidado) => {
        return String(convidado.id) === String(id);
    });
}

/* =========================================================
   CONFIGURAR EVENTOS
========================================================= */

function configurarEventos() {
    /* Abas dos aniversariantes */

    document.querySelectorAll(".tab").forEach((botao) => {
        botao.addEventListener("click", () => {
            selecionarAniversariante(
                botao.dataset.aniversariante
            );
        });
    });

    /* Formulário de cadastro */

    const formulario = obterCampo("form-convidado");

    if (formulario) {
        formulario.addEventListener("submit", (evento) => {
            evento.preventDefault();

            const input = obterCampo("nome");

            if (!input) return;

            salvarConvidado(input.value);
        });
    }

    /* Ações das listas */

    document.addEventListener("click", (evento) => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        const botao = alvo.closest("[data-acao]");

        if (!botao) return;

        if (botao.disabled) return;

        const acao = botao.dataset.acao;
        const id = botao.dataset.id;

        if (!id) return;

        if (acao === "confirmar") {
            confirmarPresenca(id);
        } else if (acao === "desconfirmar") {
            desconfirmarPresenca(id);
        } else if (acao === "remover") {
            removerConvidado(id);
        }
    });
}

/* =========================================================
   INICIALIZAÇÃO DA PÁGINA
========================================================= */

function inicializarPagina() {
    configurarProtecao();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarPagina,
        { once: true }
    );
} else {
    inicializarPagina();
}
