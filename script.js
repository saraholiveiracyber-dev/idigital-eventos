
"use strict";

/* =========================================================
   LISTA DE CONVIDADOS — 24/10/2026
   S7 SYSTEMS — CONTROLE DE PRESENÇAS
   Sem limite fixo de convidados
========================================================= */

/* =========================
   CONFIGURAÇÕES
========================= */

const SENHA_CORRETA = "222530";
const CHAVE_SESSAO = "lista_autorizada";

const SUPABASE_URL =
    "https://wiwvpqjlwmtmlexusiyd.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_LzX0GpaYAK2KNSu2eetEuw_tr5PKqSi";

const ANIVERSARIANTES = {
    sarah: "Sarah",
    jeice: "Jeice",
    ione: "Ione"
};

let supabaseClient = null;
let sistemaInicializado = false;
let aniversarianteAtual = "sarah";
let convidados = [];
let timerMensagem = null;
const operacoesEmAndamento = new Set();

/* =========================
   UTILIDADES
========================= */

function obterCampo(id) {
    return document.getElementById(id);
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obterAcompanhantes(convidado) {
    const quantidade = Number(convidado?.acompanhantes ?? 0);

    if (!Number.isFinite(quantidade) || quantidade < 0) {
        return 0;
    }

    return Math.floor(quantidade);
}

function textoAcompanhantes(quantidade) {
    quantidade = Number(quantidade || 0);

    if (quantidade === 0) return "Sem acompanhantes";
    if (quantidade === 1) return "1 acompanhante";

    return `${quantidade} acompanhantes`;
}

function mostrarMensagem(texto, tipo = "") {
    const elemento = obterCampo("mensagem");

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

function definirOperacao(id, ativa) {
    const chave = String(id);

    if (ativa) {
        operacoesEmAndamento.add(chave);
    } else {
        operacoesEmAndamento.delete(chave);
    }

    document.querySelectorAll("[data-id]").forEach((botao) => {
        if (String(botao.dataset.id) === chave) {
            botao.disabled = ativa;
        }
    });

    const botaoSalvar = obterCampo("btn-salvar");

    if (botaoSalvar) {
        botaoSalvar.disabled = Boolean(
            botaoSalvar.dataset.salvando === "true"
        );
    }
}

function atualizarListaLocal(dado) {
    const indice = convidados.findIndex((item) => {
        return String(item.id) === String(dado.id);
    });

    if (indice >= 0) {
        convidados[indice] = dado;
    } else {
        convidados.push(dado);
    }
}

/* =========================
   PROTEÇÃO POR SENHA
========================= */

function configurarProtecao() {
    const telaSenha = obterCampo("tela-senha");
    const formularioSenha = obterCampo("form-senha");
    const campoSenha = obterCampo("senha-acesso");
    const erroSenha = obterCampo("erro-senha");

    if (!telaSenha || !formularioSenha) {
        liberarSistema();
        return;
    }

    if (sessionStorage.getItem(CHAVE_SESSAO) === "true") {
        liberarSistema();
        return;
    }

    formularioSenha.addEventListener("submit", (evento) => {
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
                erroSenha.textContent =
                    "Senha incorreta. Tente novamente.";
            }

            if (campoSenha) {
                campoSenha.value = "";
                campoSenha.focus();
            }
        }
    });
}

function liberarSistema() {
    const telaSenha = obterCampo("tela-senha");
    const aplicativo = obterCampo("app");

    if (telaSenha) {
        telaSenha.hidden = true;
        telaSenha.remove();
    }

    if (aplicativo) {
        aplicativo.hidden = false;
    }

    iniciarSistema();
}

/* =========================
   INICIALIZAR SUPABASE
========================= */

function iniciarSupabase() {
    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        mostrarMensagem(
            "A biblioteca do Supabase não carregou. Verifique o HTML.",
            "erro"
        );

        console.error("Biblioteca Supabase indisponível.");
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
            "Não foi possível conectar ao banco de dados.",
            "erro"
        );

        return false;
    }
}

function iniciarSistema() {
    if (sistemaInicializado) return;

    sistemaInicializado = true;

    configurarEventos();

    if (!iniciarSupabase()) return;

    selecionarAniversariante("sarah");
    carregarConvidados();
}

/* =========================
   SELECIONAR ANIVERSARIANTE
========================= */

function selecionarAniversariante(aniversariante) {
    const chave = normalizar(aniversariante);

    if (!Object.prototype.hasOwnProperty.call(
        ANIVERSARIANTES,
        chave
    )) {
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
        botaoSalvar.dataset.salvando = "false";
        botaoSalvar.textContent = "SALVAR CONVIDADO";
    }

    renderizar();
}

/* =========================
   CARREGAR CONVIDADOS
========================= */

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
                "Não foi possível carregar a lista. Confira as permissões RLS do Supabase.",
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

/* =========================
   FILTRAR E ORDENAR
========================= */

function convidadosDaAniversariante(aniversariante) {
    return convidados.filter((convidado) => {
        return normalizar(convidado.aniversariante) ===
            normalizar(aniversariante);
    });
}

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

function encontrarConvidado(id) {
    return convidados.find((convidado) => {
        return String(convidado.id) === String(id);
    });
}

/* =========================
   CONTADORES E RENDERIZAÇÃO
========================= */

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

    const totalAcompanhantes = confirmados.reduce(
        (soma, convidado) => {
            return soma + obterAcompanhantes(convidado);
        },
        0
    );

    const contadores = {
        contador: lista.length,
        total: lista.length,
        "total-confirmados": confirmados.length,
        "total-acompanhantes": totalAcompanhantes,
        "total-evento": confirmados.length + totalAcompanhantes,
        "total-pendentes": pendentes.length,
        "total-vagas": "∞"
    };

    Object.entries(contadores).forEach(([id, valor]) => {
        const elemento = obterCampo(id);

        if (elemento) {
            elemento.textContent = String(valor);
        }
    });

    renderizarListaCompleta(lista);
    renderizarListaConfirmados(confirmados);

    const input = obterCampo("nome");
    const botao = obterCampo("btn-salvar");

    if (input) {
        input.disabled = false;
        input.placeholder = "Digite o nome completo";
    }

    if (botao && botao.dataset.salvando !== "true") {
        botao.disabled = false;
    }
}

function criarEstadoVazio(titulo, descricao) {
    return `
        <div class="lista-vazia">
            <span>${escaparHTML(titulo)}</span>
            <small>${escaparHTML(descricao)}</small>
        </div>
    `;
}

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

/* =========================
   LINHA DA LISTA COMPLETA
========================= */

function criarLinhaConvidado(convidado, numero) {
    const confirmado = convidado.confirmado === true;
    const acompanhantes = obterAcompanhantes(convidado);
    const nomeSeguro = escaparHTML(convidado.nome);
    const idSeguro = escaparHTML(convidado.id);

    const status = confirmado
        ? `<span class="status status-confirmado-row">✓ CONFIRMADO</span>`
        : `<span class="status status-pendente-row">PENDENTE</span>`;

    const badgeAcompanhantes =
        confirmado && acompanhantes > 0
            ? `<span class="status status-acompanhante-row">+ ${escaparHTML(textoAcompanhantes(acompanhantes))}</span>`
            : "";

    const botoes = confirmado
        ? `
            <button
                type="button"
                class="btn-editar"
                data-acao="editar"
                data-id="${idSeguro}"
            >EDITAR</button>

            <button
                type="button"
                class="btn-desconfirmar"
                data-acao="desconfirmar"
                data-id="${idSeguro}"
            >DESCONFIRMAR</button>
        `
        : `
            <button
                type="button"
                class="btn-confirmar"
                data-acao="confirmar"
                data-id="${idSeguro}"
            >CONFIRMAR PRESENÇA</button>
        `;

    return `
        <article class="convidado">
            <div class="convidado-info">
                <span class="numero">
                    ${String(numero).padStart(2, "0")}
                </span>

                <div>
                    <strong class="nome-convidado">${nomeSeguro}</strong>
                    ${
                        confirmado && acompanhantes > 0
                            ? `<small style="display:block;margin-top:5px;color:#d4af37;font-size:10px;font-weight:600">+ ${escaparHTML(textoAcompanhantes(acompanhantes))}</small>`
                            : ""
                    }
                </div>
            </div>

            <div class="acoes">
                ${status}
                ${badgeAcompanhantes}
                ${botoes}

                <button
                    type="button"
                    class="btn-remover"
                    data-acao="remover"
                    data-id="${idSeguro}"
                    title="Remover convidado"
                    aria-label="Remover convidado"
                >×</button>
            </div>
        </article>
    `;
}

/* =========================
   LINHA DA LISTA CONFIRMADOS
========================= */

function criarLinhaConfirmado(convidado, numero) {
    const acompanhantes = obterAcompanhantes(convidado);
    const nomeSeguro = escaparHTML(convidado.nome);
    const idSeguro = escaparHTML(convidado.id);

    return `
        <article class="convidado">
            <div class="convidado-info">
                <span class="numero">
                    ${String(numero).padStart(2, "0")}
                </span>

                <div>
                    <strong class="nome-convidado">${nomeSeguro}</strong>

                    <small style="display:block;margin-top:5px;color:#d4af37;font-size:10px;font-weight:600">
                        ${escaparHTML(textoAcompanhantes(acompanhantes))}
                    </small>
                </div>
            </div>

            <div class="acoes">
                <span class="status status-confirmado-row">
                    ✓ CONFIRMADO
                </span>

                <button
                    type="button"
                    class="btn-editar"
                    data-acao="editar"
                    data-id="${idSeguro}"
                >EDITAR</button>

                <button
                    type="button"
                    class="btn-desconfirmar"
                    data-acao="desconfirmar"
                    data-id="${idSeguro}"
                >DESCONFIRMAR</button>
            </div>
        </article>
    `;
}

/* =========================
   SALVAR CONVIDADO
========================= */

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

    if (nomeLimpo.length > 150) {
        mostrarMensagem(
            "O nome deve ter no máximo 150 caracteres.",
            "erro"
        );
        return;
    }

    const lista = convidadosDaAniversariante(
        aniversarianteAtual
    );

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
        botao.dataset.salvando = "true";
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
                "Não foi possível salvar. Verifique as permissões do Supabase.",
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

        if (input) input.focus();
    } catch (erro) {
        console.error("Erro ao salvar:", erro);

        mostrarMensagem(
            "Ocorreu um erro ao salvar o convidado.",
            "erro"
        );
    } finally {
        if (botao) {
            botao.dataset.salvando = "false";
            botao.textContent = textoOriginal || "SALVAR CONVIDADO";
            botao.disabled = false;
        }
    }
}

/* =========================
   EDITAR CONVIDADO CONFIRMADO
========================= */

async function editarConvidado(id) {
    if (!supabaseClient) {
        mostrarMensagem("Supabase não inicializado.", "erro");
        return;
    }

    const convidado = encontrarConvidado(id);

    if (!convidado) {
        mostrarMensagem("Convidado não encontrado.", "erro");
        return;
    }

    if (convidado.confirmado !== true) {
        mostrarMensagem(
            "A edição está disponível para convidados confirmados.",
            "erro"
        );
        return;
    }

    const nomeDigitado = window.prompt(
        "Edite o nome do convidado:",
        convidado.nome
    );

    if (nomeDigitado === null) return;

    const novoNome = nomeDigitado.trim();

    if (!novoNome) {
        mostrarMensagem("O nome não pode ficar vazio.", "erro");
        return;
    }

    if (novoNome.length > 150) {
        mostrarMensagem(
            "O nome deve ter no máximo 150 caracteres.",
            "erro"
        );
        return;
    }

    const duplicado = convidadosDaAniversariante(
        convidado.aniversariante
    ).some((item) => {
        return (
            String(item.id) !== String(id) &&
            normalizar(item.nome) === normalizar(novoNome)
        );
    });

    if (duplicado) {
        mostrarMensagem(
            "Já existe outro convidado com esse nome nesta lista.",
            "erro"
        );
        return;
    }

    const acompanhantesDigitados = window.prompt(
        "Quantos acompanhantes? Digite um número inteiro a partir de 0:",
        String(obterAcompanhantes(convidado))
    );

    if (acompanhantesDigitados === null) return;

    const valorAcompanhantes = acompanhantesDigitados.trim();

    if (!/^\d+$/.test(valorAcompanhantes)) {
        mostrarMensagem(
            "Informe a quantidade de acompanhantes usando um número inteiro.",
            "erro"
        );
        return;
    }

    const quantidade = Number(valorAcompanhantes);

    if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
        mostrarMensagem(
            "A quantidade de acompanhantes é inválida.",
            "erro"
        );
        return;
    }

    if (operacoesEmAndamento.has(String(id))) return;

    definirOperacao(id, true);
    mostrarMensagem("Salvando alterações...");

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .update({
                nome: novoNome,
                acompanhantes: quantidade
            })
            .eq("id", id)
            .eq("confirmado", true)
            .select(`
                id,
                nome,
                aniversariante,
                confirmado,
                acompanhantes,
                created_at
            `)
            .maybeSingle();

        if (error) {
            console.error("Erro ao editar convidado:", error);

            mostrarMensagem(
                "Não foi possível editar. Verifique as permissões UPDATE do Supabase.",
                "erro"
            );
            return;
        }

        if (!data) {
            mostrarMensagem(
                "Nenhuma alteração foi salva. Confira se o convidado ainda está confirmado e se as permissões permitem a edição.",
                "erro"
            );
            await carregarConvidados();
            return;
        }

        atualizarListaLocal(data);
        renderizar();

        mostrarMensagem(
            `Os dados de ${data.nome} foram atualizados.`,
            "sucesso"
        );
    } catch (erro) {
        console.error("Erro ao editar:", erro);

        mostrarMensagem(
            "Ocorreu um erro ao editar o convidado.",
            "erro"
        );
    } finally {
        definirOperacao(id, false);
        renderizar();
    }
}

/* =========================
   CONFIRMAR PRESENÇA
========================= */

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

/* =========================
   DESCONFIRMAR PRESENÇA
========================= */

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

/* =========================
   ATUALIZAR CONFIRMAÇÃO
========================= */

async function atualizarConfirmacao(id, confirmado) {
    if (!supabaseClient) {
        mostrarMensagem("Supabase não inicializado.", "erro");
        return;
    }

    if (operacoesEmAndamento.has(String(id))) return;

    definirOperacao(id, true);

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .update({
                confirmado,
                ...(confirmado ? {} : { acompanhantes: 0 })
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

        atualizarListaLocal(data);
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
    } finally {
        definirOperacao(id, false);
        renderizar();
    }
}

/* =========================
   REMOVER CONVIDADO
========================= */

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
        `Deseja remover ${convidado.nome} da lista? Esta ação não pode ser desfeita.`
    );

    if (!desejaRemover) return;

    if (operacoesEmAndamento.has(String(id))) return;

    definirOperacao(id, true);

    try {
        const { data, error } = await supabaseClient
            .from("convidados")
            .delete()
            .eq("id", id)
            .select("id");

        if (error) {
            console.error("Erro ao remover:", error);

            mostrarMensagem(
                "Não foi possível remover. Verifique as permissões DELETE do Supabase.",
                "erro"
            );
            return;
        }

        if (!data || data.length === 0) {
            mostrarMensagem(
                "O convidado não foi removido. Verifique as permissões do Supabase.",
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
    } finally {
        definirOperacao(id, false);
        renderizar();
    }
}

/* =========================
   EVENTOS DA PÁGINA
========================= */

function configurarEventos() {
    document.querySelectorAll(".tab").forEach((botao) => {
        botao.addEventListener("click", () => {
            selecionarAniversariante(
                botao.dataset.aniversariante
            );
        });
    });

    const formulario = obterCampo("form-convidado");

    if (formulario) {
        formulario.addEventListener("submit", (evento) => {
            evento.preventDefault();

            const input = obterCampo("nome");

            if (!input) return;

            salvarConvidado(input.value);
        });
    }

    document.addEventListener("click", (evento) => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        const botao = alvo.closest("[data-acao]");

        if (!botao || botao.disabled) return;

        const acao = botao.dataset.acao;
        const id = botao.dataset.id;

        if (!id) return;

        if (acao === "confirmar") {
            confirmarPresenca(id);
        } else if (acao === "desconfirmar") {
            desconfirmarPresenca(id);
        } else if (acao === "editar") {
            editarConvidado(id);
        } else if (acao === "remover") {
            removerConvidado(id);
        }
    });
}

/* =========================
   INICIALIZAÇÃO
========================= */

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
