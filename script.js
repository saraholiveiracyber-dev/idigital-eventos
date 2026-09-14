"use strict";


/* =========================================================
   LISTA DE CONVIDADOS
   ANIVERSÁRIO — 24/10/2026
========================================================= */


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

const LIMITE = 30;


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


/* =========================================================
   INICIALIZAR SUPABASE
========================================================= */

function iniciarSupabase() {

    if (
        !window.supabase ||
        !window.supabase.createClient
    ) {

        mostrarMensagem(
            "A biblioteca do Supabase ainda não foi carregada.",
            "erro"
        );

        return false;

    }


    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );


    return true;

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


/* =========================================================
   OBTER QUANTIDADE DE ACOMPANHANTES
========================================================= */

function obterAcompanhantes(convidado) {

    const quantidade =
        Number(
            convidado?.acompanhantes ?? 0
        );


    if (
        Number.isNaN(quantidade) ||
        quantidade < 0
    ) {

        return 0;

    }


    return quantidade;

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escaparHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   MENSAGEM
========================================================= */

let timerMensagem = null;


function mostrarMensagem(
    texto,
    tipo = ""
) {

    const elemento =
        document.getElementById(
            "mensagem"
        );


    if (!elemento) {

        return;

    }


    clearTimeout(
        timerMensagem
    );


    elemento.textContent =
        texto;


    elemento.className =
        "mensagem";


    if (tipo) {

        elemento.classList.add(
            tipo
        );

    }


    if (texto) {

        timerMensagem =
            setTimeout(() => {

                elemento.textContent =
                    "";

                elemento.className =
                    "mensagem";

            }, 4000);

    }

}


/* =========================================================
   OBTER CONVIDADOS DA ANIVERSARIANTE
========================================================= */

function convidadosDaAniversariante(
    aniversariante
) {

    return convidados.filter(
        convidado =>
            normalizar(
                convidado.aniversariante
            ) ===
            normalizar(
                aniversariante
            )
    );

}


/* =========================================================
   ORDENAR
========================================================= */

function ordenarConvidados(
    lista
) {

    return [...lista].sort(
        (a, b) => {

            return Number(a.id) -
                   Number(b.id);

        }
    );

}


/* =========================================================
   SELECIONAR ANIVERSARIANTE
========================================================= */

function selecionarAniversariante(
    aniversariante
) {

    const chave =
        normalizar(
            aniversariante
        );


    if (
        !ANIVERSARIANTES[chave]
    ) {

        return;

    }


    aniversarianteAtual =
        chave;


    document
        .querySelectorAll(".tab")
        .forEach(
            botao => {

                botao.classList.toggle(
                    "ativo",
                    botao.dataset.aniversariante ===
                    aniversarianteAtual
                );

            }
        );


    const nomeAniversariante =
        document.getElementById(
            "nome-aniversariante"
        );


    if (nomeAniversariante) {

        nomeAniversariante.textContent =
            ANIVERSARIANTES[
                aniversarianteAtual
            ];

    }


    const input =
        document.getElementById(
            "nome"
        );


    if (input) {

        input.value = "";

        input.focus();

    }


    renderizar();

}


/* =========================================================
   CARREGAR DADOS
========================================================= */

async function carregarConvidados() {

    if (!supabaseClient) {

        return;

    }


    mostrarMensagem(
        "Carregando lista..."
    );


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("convidados")

            .select(`
                id,
                nome,
                aniversariante,
                confirmado,
                acompanhantes,
                created_at
            `)

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                error
            );


            mostrarMensagem(
                "Não foi possível carregar os convidados.",
                "erro"
            );


            return;

        }


        convidados =
            Array.isArray(data)
                ? data
                : [];


        renderizar();


    } catch (erro) {

        console.error(
            erro
        );


        mostrarMensagem(
            "Erro ao conectar com o banco de dados.",
            "erro"
        );

    }

}


/* =========================================================
   RENDERIZAR TUDO
========================================================= */

function renderizar() {

    const lista =
        ordenarConvidados(
            convidadosDaAniversariante(
                aniversarianteAtual
            )
        );


    /* =====================================================
       CONFIRMADOS
    ====================================================== */

    const confirmados =
        lista.filter(
            convidado =>
                convidado.confirmado === true
        );


    /* =====================================================
       PENDENTES
    ====================================================== */

    const pendentes =
        lista.filter(
            convidado =>
                convidado.confirmado !== true
        );


    /* =====================================================
       TOTAL DE CONVIDADOS CADASTRADOS
    ====================================================== */

    const total =
        lista.length;


    /* =====================================================
       TOTAL DE ACOMPANHANTES

       SOMENTE CONFIRMADOS
    ====================================================== */

    const totalAcompanhantes =
        confirmados.reduce(
            (total, convidado) => {

                return (
                    total +
                    obterAcompanhantes(
                        convidado
                    )
                );

            },
            0
        );


    /* =====================================================
       TOTAL REAL DE PESSOAS NO EVENTO

       CONFIRMADOS
       +
       ACOMPANHANTES
    ====================================================== */

    const totalEvento =
        confirmados.length +
        totalAcompanhantes;


    /* =====================================================
       VAGAS DISPONÍVEIS

       IMPORTANTE:

       Agora as vagas consideram também
       os acompanhantes.

       Exemplo:

       1 confirmado
       + 1 acompanhante
       = 2 pessoas

       30 - 2 = 28 vagas
    ====================================================== */

    const vagas =
        Math.max(
            LIMITE - totalEvento,
            0
        );


    /* =====================================================
       CONTADORES
    ====================================================== */

    const contador =
        document.getElementById(
            "contador"
        );


    const totalElemento =
        document.getElementById(
            "total"
        );


    const confirmadosElemento =
        document.getElementById(
            "total-confirmados"
        );


    const acompanhantesElemento =
        document.getElementById(
            "total-acompanhantes"
        );


    const totalEventoElemento =
        document.getElementById(
            "total-evento"
        );


    const pendentesElemento =
        document.getElementById(
            "total-pendentes"
        );


    const vagasElemento =
        document.getElementById(
            "total-vagas"
        );


    if (contador) {

        contador.textContent =
            total;

    }


    if (totalElemento) {

        totalElemento.textContent =
            total;

    }


    if (confirmadosElemento) {

        confirmadosElemento.textContent =
            confirmados.length;

    }


    if (acompanhantesElemento) {

        acompanhantesElemento.textContent =
            totalAcompanhantes;

    }


    if (totalEventoElemento) {

        totalEventoElemento.textContent =
            totalEvento;

    }


    if (pendentesElemento) {

        pendentesElemento.textContent =
            pendentes.length;

    }


    if (vagasElemento) {

        vagasElemento.textContent =
            vagas;

    }


    /* =====================================================
       LISTA COMPLETA
    ====================================================== */

    const listaElemento =
        document.getElementById(
            "lista-convidados"
        );


    if (listaElemento) {

        if (lista.length === 0) {

            listaElemento.innerHTML =
                criarEstadoVazio(
                    "Nenhum convidado cadastrado.",
                    "Adicione o primeiro convidado acima."
                );

        } else {

            listaElemento.innerHTML =
                lista
                    .map(
                        (convidado, index) =>
                            criarLinhaConvidado(
                                convidado,
                                index + 1
                            )
                    )
                    .join("");

        }

    }


    /* =====================================================
       LISTA DE CONFIRMADOS
    ====================================================== */

    const confirmadosElementoLista =
        document.getElementById(
            "lista-confirmados"
        );


    if (confirmadosElementoLista) {

        if (confirmados.length === 0) {

            confirmadosElementoLista.innerHTML =
                criarEstadoVazio(
                    "Nenhuma presença confirmada.",
                    "Os convidados confirmados aparecerão aqui."
                );

        } else {

            confirmadosElementoLista.innerHTML =
                confirmados
                    .map(
                        (convidado, index) =>
                            criarLinhaConfirmado(
                                convidado,
                                index + 1
                            )
                    )
                    .join("");

        }

    }


    /* =====================================================
       BLOQUEAR NOVOS CONVIDADOS

       O cadastro continua limitado a 30 convidados.

       Mas o cálculo de vagas do evento considera
       convidados confirmados + acompanhantes.
    ====================================================== */

    const input =
        document.getElementById(
            "nome"
        );


    const botao =
        document.getElementById(
            "btn-salvar"
        );


    if (input && botao) {

        const limiteCadastroAtingido =
            total >= LIMITE;


        input.disabled =
            limiteCadastroAtingido;


        botao.disabled =
            limiteCadastroAtingido;


        if (limiteCadastroAtingido) {

            input.placeholder =
                "Limite de 30 convidados atingido";

        } else {

            input.placeholder =
                "Digite o nome completo";

        }

    }

}


/* =========================================================
   ESTADO VAZIO
========================================================= */

function criarEstadoVazio(
    titulo,
    descricao
) {

    return `

        <div class="lista-vazia">

            <span>
                ${escaparHTML(titulo)}
            </span>

            <small>
                ${escaparHTML(descricao)}
            </small>

        </div>

    `;

}


/* =========================================================
   TEXTO DE ACOMPANHANTES
========================================================= */

function textoAcompanhantes(
    quantidade
) {

    quantidade =
        Number(
            quantidade || 0
        );


    if (quantidade === 0) {

        return "";

    }


    if (quantidade === 1) {

        return "1 acompanhante";

    }


    return `${quantidade} acompanhantes`;

}


/* =========================================================
   LINHA — LISTA COMPLETA
========================================================= */

function criarLinhaConvidado(
    convidado,
    numero
) {

    const confirmado =
        convidado.confirmado === true;


    const quantidadeAcompanhantes =
        obterAcompanhantes(
            convidado
        );


    const acompanhantesTexto =
        textoAcompanhantes(
            quantidadeAcompanhantes
        );


    const status =
        confirmado

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
        confirmado &&
        quantidadeAcompanhantes > 0

            ? `
                <span class="status status-acompanhante-row">
                    + ${escaparHTML(
                        acompanhantesTexto
                    )}
                </span>
            `

            : "";


    const botao =
        confirmado

            ? `
                <button
                    type="button"
                    class="btn-desconfirmar"
                    data-acao="desconfirmar"
                    data-id="${escaparHTML(
                        convidado.id
                    )}"
                >
                    DESCONFIRMAR
                </button>
            `

            : `
                <button
                    type="button"
                    class="btn-confirmar"
                    data-acao="confirmar"
                    data-id="${escaparHTML(
                        convidado.id
                    )}"
                >
                    CONFIRMAR PRESENÇA
                </button>
            `;


    return `

        <article
            class="convidado"
        >

            <div class="convidado-info">

                <span class="numero">
                    ${String(numero).padStart(2, "0")}
                </span>

                <div>

                    <strong class="nome-convidado">
                        ${escaparHTML(
                            convidado.nome
                        )}
                    </strong>

                    ${
                        confirmado &&
                        quantidadeAcompanhantes > 0

                            ? `
                                <small
                                    style="
                                        display:block;
                                        margin-top:5px;
                                        color:#d4af37;
                                        font-size:10px;
                                        font-weight:600;
                                    "
                                >
                                    + ${escaparHTML(
                                        acompanhantesTexto
                                    )}
                                </small>
                            `

                            : ""
                    }

                </div>

            </div>


            <div class="acoes">

                ${status}

                ${acompanhanteBadge}

                ${botao}

                <button
                    type="button"
                    class="btn-remover"
                    data-acao="remover"
                    data-id="${escaparHTML(
                        convidado.id
                    )}"
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

function criarLinhaConfirmado(
    convidado,
    numero
) {

    const quantidadeAcompanhantes =
        obterAcompanhantes(
            convidado
        );


    const acompanhantesTexto =
        textoAcompanhantes(
            quantidadeAcompanhantes
        );


    return `

        <article
            class="convidado"
        >

            <div class="convidado-info">

                <span class="numero">
                    ${String(numero).padStart(2, "0")}
                </span>


                <div>

                    <strong class="nome-convidado">
                        ${escaparHTML(
                            convidado.nome
                        )}
                    </strong>


                    <small
                        style="
                            display:block;
                            margin-top:5px;
                            color:#d4af37;
                            font-size:10px;
                            font-weight:600;
                        "
                    >

                        ${
                            quantidadeAcompanhantes === 0

                                ? "Sem acompanhantes"

                                : `+ ${escaparHTML(
                                    acompanhantesTexto
                                )}`
                        }

                    </small>

                </div>

            </div>


            <div class="acoes">

                <span class="status status-confirmado-row">
                    ✓ CONFIRMADO
                </span>


                ${
                    quantidadeAcompanhantes > 0

                        ? `
                            <span class="status status-acompanhante-row">
                                + ${escaparHTML(
                                    acompanhantesTexto
                                )}
                            </span>
                        `

                        : ""
                }


                <button
                    type="button"
                    class="btn-desconfirmar"
                    data-acao="desconfirmar"
                    data-id="${escaparHTML(
                        convidado.id
                    )}"
                >
                    DESCONFIRMAR
                </button>

            </div>

        </article>

    `;

}


/* =========================================================
   SALVAR CONVIDADO
========================================================= */

async function salvarConvidado(
    nome
) {

    if (!supabaseClient) {

        mostrarMensagem(
            "Supabase não inicializado.",
            "erro"
        );

        return;

    }


    const nomeLimpo =
        String(nome ?? "")
            .trim();


    if (!nomeLimpo) {

        mostrarMensagem(
            "Digite o nome do convidado.",
            "erro"
        );

        return;

    }


    const lista =
        convidadosDaAniversariante(
            aniversarianteAtual
        );


    /* =====================================================
       LIMITE DE CADASTROS
    ====================================================== */

    if (
        lista.length >= LIMITE
    ) {

        mostrarMensagem(
            "Esta lista já atingiu o limite de 30 convidados.",
            "erro"
        );

        return;

    }


    /* =====================================================
       DUPLICADO
    ====================================================== */

    const duplicado =
        lista.some(
            convidado =>
                normalizar(
                    convidado.nome
                ) ===
                normalizar(
                    nomeLimpo
                )
        );


    if (duplicado) {

        mostrarMensagem(
            "Este convidado já está cadastrado.",
            "erro"
        );

        return;

    }


    const botao =
        document.getElementById(
            "btn-salvar"
        );


    if (botao) {

        botao.disabled =
            true;

        botao.textContent =
            "SALVANDO...";

    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("convidados")

            .insert({

                nome:
                    nomeLimpo,

                aniversariante:
                    aniversarianteAtual,

                confirmado:
                    false,

                acompanhantes:
                    0

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

            console.error(
                error
            );


            mostrarMensagem(
                "Não foi possível salvar o convidado.",
                "erro"
            );


            return;

        }


        convidados.push(
            data
        );


        const input =
            document.getElementById(
                "nome"
            );


        if (input) {

            input.value =
                "";

            input.focus();

        }


        renderizar();


        mostrarMensagem(
            `${nomeLimpo} foi adicionado à lista.`,
            "sucesso"
        );


    } catch (erro) {

        console.error(
            erro
        );


        mostrarMensagem(
            "Ocorreu um erro ao salvar.",
            "erro"
        );

    } finally {

        if (botao) {

            botao.textContent =
                "SALVAR CONVIDADO";

        }


        renderizar();

    }

}


/* =========================================================
   CONFIRMAR
========================================================= */

async function confirmarPresenca(
    id
) {

    const convidado =
        encontrarConvidado(
            id
        );


    if (!convidado) {

        mostrarMensagem(
            "Convidado não encontrado.",
            "erro"
        );

        return;

    }


    const desejaConfirmar =
        window.confirm(
            `Confirmar a presença de ${convidado.nome}?`
        );


    if (!desejaConfirmar) {

        return;

    }


    await atualizarConfirmacao(
        id,
        true
    );

}


/* =========================================================
   DESCONFIRMAR
========================================================= */

async function desconfirmarPresenca(
    id
) {

    const convidado =
        encontrarConvidado(
            id
        );


    if (!convidado) {

        mostrarMensagem(
            "Convidado não encontrado.",
            "erro"
        );

        return;

    }


    const desejaDesconfirmar =
        window.confirm(
            `Retirar a confirmação de ${convidado.nome}?`
        );


    if (!desejaDesconfirmar) {

        return;

    }


    await atualizarConfirmacao(
        id,
        false
    );

}


/* =========================================================
   ATUALIZAR CONFIRMAÇÃO
========================================================= */

async function atualizarConfirmacao(
    id,
    confirmado
) {

    try {

        /*
         * NÃO apagamos acompanhantes.
         *
         * Exemplo:
         *
         * Isabela
         * acompanhantes = 1
         *
         * Ao confirmar:
         * confirmado = true
         * acompanhantes = 1
         *
         * Total no evento = 2
         *
         * Ao desconfirmar:
         * confirmado = false
         *
         * O acompanhante continua salvo,
         * mas NÃO entra no cálculo das vagas
         * enquanto a pessoa estiver pendente.
         */


        const {
            data,
            error
        } = await supabaseClient

            .from("convidados")

            .update({

                confirmado:
                    confirmado

            })

            .eq(
                "id",
                id
            )

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

            console.error(
                error
            );


            mostrarMensagem(
                confirmado
                    ? "Não foi possível confirmar a presença."
                    : "Não foi possível retirar a confirmação.",
                "erro"
            );


            return;

        }


        const indice =
            convidados.findIndex(
                convidado =>
                    String(
                        convidado.id
                    ) ===
                    String(id)
            );


        if (indice !== -1) {

            convidados[indice] =
                data;

        }


        renderizar();


        mostrarMensagem(
            confirmado
                ? `${data.nome} confirmou presença.`
                : `${data.nome} voltou para pendentes.`,
            "sucesso"
        );


    } catch (erro) {

        console.error(
            erro
        );


        mostrarMensagem(
            "Erro ao atualizar a confirmação.",
            "erro"
        );

    }

}


/* =========================================================
   REMOVER
========================================================= */

async function removerConvidado(
    id
) {

    const convidado =
        encontrarConvidado(
            id
        );


    if (!convidado) {

        mostrarMensagem(
            "Convidado não encontrado.",
            "erro"
        );

        return;

    }


    const desejaRemover =
        window.confirm(
            `Deseja remover ${convidado.nome} da lista?`
        );


    if (!desejaRemover) {

        return;

    }


    try {

        const {
            error
        } = await supabaseClient

            .from("convidados")

            .delete()

            .eq(
                "id",
                id
            );


        if (error) {

            console.error(
                error
            );


            mostrarMensagem(
                "Não foi possível remover o convidado.",
                "erro"
            );


            return;

        }


        convidados =
            convidados.filter(
                item =>
                    String(item.id) !==
                    String(id)
            );


        renderizar();


        mostrarMensagem(
            `${convidado.nome} foi removido.`,
            "sucesso"
        );


    } catch (erro) {

        console.error(
            erro
        );


        mostrarMensagem(
            "Erro ao remover o convidado.",
            "erro"
        );

    }

}


/* =========================================================
   ENCONTRAR CONVIDADO
========================================================= */

function encontrarConvidado(
    id
) {

    return convidados.find(
        convidado =>
            String(
                convidado.id
            ) ===
            String(id)
    );

}


/* =========================================================
   EVENTOS DOS BOTÕES
========================================================= */

function configurarEventos() {


    /* =====================================================
       TABS
    ====================================================== */

    document
        .querySelectorAll(".tab")
        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        selecionarAniversariante(
                            botao.dataset.aniversariante
                        );

                    }
                );

            }
        );


    /* =====================================================
       FORMULÁRIO
    ====================================================== */

    const formulario =
        document.getElementById(
            "form-convidado"
        );


    if (formulario) {

        formulario.addEventListener(
            "submit",
            evento => {

                evento.preventDefault();


                const input =
                    document.getElementById(
                        "nome"
                    );


                if (!input) {

                    return;

                }


                salvarConvidado(
                    input.value
                );

            }
        );

    }


    /* =====================================================
       CLIQUES NAS LISTAS
    ====================================================== */

    document.addEventListener(
        "click",
        evento => {

            const botao =
                evento.target.closest(
                    "[data-acao]"
                );


            if (!botao) {

                return;

            }


            const acao =
                botao.dataset.acao;


            const id =
                botao.dataset.id;


            if (acao === "confirmar") {

                confirmarPresenca(
                    id
                );

            }


            if (acao === "desconfirmar") {

                desconfirmarPresenca(
                    id
                );

            }


            if (acao === "remover") {

                removerConvidado(
                    id
                );

            }

        }
    );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const supabaseOK =
            iniciarSupabase();


        if (!supabaseOK) {

            return;

        }


        configurarEventos();


        selecionarAniversariante(
            "sarah"
        );


        await carregarConvidados();

    }
);