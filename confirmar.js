"use strict";

/* =========================================================
   CONFIRMAÇÃO DE PRESENÇA
   PÁGINA PÚBLICA
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
   CONFIGURAÇÕES
========================================================= */

const MAX_ACOMPANHANTES = 5;


/* =========================================================
   ESTADO
========================================================= */

let convidadosEncontrados = [];

let convidadoEncontrado = null;


/* =========================================================
   ELEMENTOS
========================================================= */

let passo1;
let passo2;
let passo3;
let passoConfirmado;
let passoNaoEncontrado;

let nomeInput;
let acompanhantesInput;
let mensagem;


/* =========================================================
   INICIALIZAR
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciar
);


/* =========================================================
   FUNÇÃO PRINCIPAL
========================================================= */

function iniciar() {

    /* =====================================================
       PASSOS
    ===================================================== */

    passo1 =
        document.getElementById(
            "passo-1"
        );

    passo2 =
        document.getElementById(
            "passo-2"
        );

    passo3 =
        document.getElementById(
            "passo-3"
        );

    passoConfirmado =
        document.getElementById(
            "passo-confirmado"
        );

    passoNaoEncontrado =
        document.getElementById(
            "passo-nao-encontrado"
        );


    /* =====================================================
       CAMPOS
    ===================================================== */

    nomeInput =
        document.getElementById(
            "nome"
        );

    acompanhantesInput =
        document.getElementById(
            "acompanhantes"
        );

    mensagem =
        document.getElementById(
            "mensagem"
        );


    /* =====================================================
       VALIDAR ELEMENTOS
    ===================================================== */

    if (
        !passo1 ||
        !passo2 ||
        !passo3 ||
        !passoConfirmado ||
        !passoNaoEncontrado ||
        !nomeInput
    ) {

        console.error(
            "Elementos obrigatórios da página não foram encontrados."
        );

        return;

    }


    /* =====================================================
       VERIFICAR SUPABASE
    ===================================================== */

    if (
        !window.supabase ||
        !window.supabase.createClient
    ) {

        mostrarMensagem(
            "Não foi possível carregar o sistema.",
            true
        );

        return;

    }


    /* =====================================================
       CRIAR CLIENTE SUPABASE
    ===================================================== */

    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );


    /* =====================================================
       CONFIGURAR BOTÕES
    ===================================================== */

    configurarBotoes();

    configurarEnter();


    /* =====================================================
       ESTADO INICIAL
    ===================================================== */

    mostrarPassoInicial();

}


/* =========================================================
   BOTÕES
========================================================= */

function configurarBotoes() {

    /* =====================================================
       CONTINUAR
    ===================================================== */

    const btnContinuar =
        document.getElementById(
            "btn-continuar"
        );


    if (btnContinuar) {

        btnContinuar.addEventListener(
            "click",
            verificarConvidado
        );

    }


    /* =====================================================
       CONFIRMAR
    ===================================================== */

    const btnConfirmar =
        document.getElementById(
            "btn-confirmar"
        );


    if (btnConfirmar) {

        btnConfirmar.addEventListener(
            "click",
            confirmarPresenca
        );

    }


    /* =====================================================
       VOLTAR
    ===================================================== */

    const btnVoltar =
        document.getElementById(
            "btn-voltar"
        );


    if (btnVoltar) {

        btnVoltar.addEventListener(
            "click",
            voltar
        );

    }


    /* =====================================================
       TENTAR NOVAMENTE
    ===================================================== */

    const btnTentarNovamente =
        document.getElementById(
            "btn-tentar-novamente"
        );


    if (btnTentarNovamente) {

        btnTentarNovamente.addEventListener(
            "click",
            voltar
        );

    }

}


/* =========================================================
   ENTER
========================================================= */

function configurarEnter() {

    if (!nomeInput) {
        return;
    }


    nomeInput.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key === "Enter"
            ) {

                evento.preventDefault();

                verificarConvidado();

            }

        }
    );

}


/* =========================================================
   NORMALIZAR NOME
========================================================= */

function normalizar(valor) {

    return String(valor ?? "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();

}


/* =========================================================
   VERIFICAR CONVIDADO
========================================================= */

async function verificarConvidado() {

    limparMensagem();


    if (!supabaseClient) {

        mostrarMensagem(
            "Sistema indisponível. Atualize a página.",
            true
        );

        return;

    }


    const nome =
        nomeInput.value.trim();


    /* =====================================================
       VALIDAR
    ===================================================== */

    if (!nome) {

        mostrarMensagem(
            "Digite seu nome completo.",
            true
        );

        nomeInput.focus();

        return;

    }


    /* =====================================================
       BOTÃO
    ===================================================== */

    const botao =
        document.getElementById(
            "btn-continuar"
        );


    if (botao) {

        botao.disabled = true;

        botao.textContent =
            "VERIFICANDO...";

    }


    try {

        /* =================================================
           BUSCAR TODOS OS CONVIDADOS
        ================================================= */

        const {
            data,
            error
        } = await supabaseClient

            .from("convidados")

            .select(
                "id, nome, aniversariante, confirmado, acompanhantes"
            );


        /* =================================================
           ERRO
        ================================================= */

        if (error) {

            console.error(
                "Erro ao consultar convidados:",
                error
            );

            mostrarMensagem(
                "Não foi possível consultar a lista. Tente novamente.",
                true
            );

            return;

        }


        /* =================================================
           NORMALIZAR BUSCA
        ================================================= */

        const busca =
            normalizar(nome);


        /* =================================================
           ENCONTRAR NOMES
        ================================================= */

        const encontrados =
            (data || []).filter(
                convidado => {

                    const nomeBanco =
                        normalizar(
                            convidado.nome
                        );

                    /*
                     * Permite:
                     *
                     * Lucas
                     * Lucas Silva
                     * Ana Lucas
                     *
                     * quando a busca for compatível.
                     */

                    return (
                        nomeBanco === busca ||
                        nomeBanco.includes(busca)
                    );

                }
            );


        convidadosEncontrados =
            encontrados;


        /* =================================================
           NENHUM ENCONTRADO
        ================================================= */

        if (
            encontrados.length === 0
        ) {

            convidadoEncontrado =
                null;

            mostrarPasso(
                "nao-encontrado"
            );

            return;

        }


        /* =================================================
           APENAS UM ENCONTRADO
        ================================================= */

        if (
            encontrados.length === 1
        ) {

            selecionarConvidado(
                encontrados[0]
            );

            return;

        }


        /* =================================================
           MAIS DE UM ENCONTRADO
        ================================================= */

        mostrarOpcoesConvidados(
            encontrados
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        mostrarMensagem(
            "Ocorreu um erro ao verificar seu convite.",
            true
        );

    }

    finally {

        if (botao) {

            botao.disabled =
                false;

            botao.innerHTML =
                `
                    CONTINUAR
                    <span>→</span>
                `;

        }

    }

}


/* =========================================================
   MOSTRAR OPÇÕES
========================================================= */

function mostrarOpcoesConvidados(
    convidados
) {

    /*
     * Primeiro mostramos o passo 2.
     */

    mostrarPasso(
        "confirmar"
    );


    /*
     * Local onde vamos colocar as opções.
     */

    const titulo =
        passo2.querySelector(
            ".titulo-passo h2"
        );

    if (titulo) {

        titulo.textContent =
            "Encontramos mais de um nome";

    }


    const subtitulo =
        passo2.querySelector(
            ".titulo-passo span"
        );

    if (subtitulo) {

        subtitulo.textContent =
            "SELECIONE SEU NOME";

    }


    /*
     * Esconder informações de convite
     * até a pessoa escolher.
     */

    const conviteLocalizado =
        passo2.querySelector(
            ".convite-localizado"
        );

    if (conviteLocalizado) {

        conviteLocalizado.style.display =
            "none";

    }


    /*
     * Esconder texto de confirmação.
     */

    const texto =
        passo2.querySelector(
            ".texto-confirmacao"
        );

    if (texto) {

        texto.style.display =
            "none";

    }


    /*
     * Esconder acompanhantes.
     */

    const campoAcompanhantes =
        passo2.querySelector(
            ".campo-acompanhantes"
        );

    if (campoAcompanhantes) {

        campoAcompanhantes.style.display =
            "none";

    }


    /*
     * Esconder botão confirmar.
     */

    const btnConfirmar =
        document.getElementById(
            "btn-confirmar"
        );

    if (btnConfirmar) {

        btnConfirmar.style.display =
            "none";

    }


    /*
     * Criar lista.
     */

    let lista =
        document.getElementById(
            "lista-opcoes-convidados"
        );


    if (!lista) {

        lista =
            document.createElement(
                "div"
            );

        lista.id =
            "lista-opcoes-convidados";

        lista.className =
            "lista-opcoes-convidados";

    }


    lista.innerHTML =
        "";


    convidados.forEach(
        convidado => {

            const botao =
                document.createElement(
                    "button"
                );

            botao.type =
                "button";

            botao.className =
                "opcao-convidado";


            /*
             * Nome.
             */

            const nome =
                document.createElement(
                    "strong"
                );

            nome.textContent =
                convidado.nome;


            /*
             * Informação adicional.
             */

            const detalhe =
                document.createElement(
                    "small"
                );

            detalhe.textContent =
                "Clique para selecionar";


            botao.appendChild(
                nome
            );

            botao.appendChild(
                detalhe
            );


            /*
             * Selecionar.
             */

            botao.addEventListener(
                "click",
                () => {

                    selecionarConvidado(
                        convidado
                    );

                }
            );


            lista.appendChild(
                botao
            );

        }
    );


    /*
     * Colocar lista antes
     * do botão voltar.
     */

    const btnVoltar =
        document.getElementById(
            "btn-voltar"
        );


    if (btnVoltar) {

        passo2.insertBefore(
            lista,
            btnVoltar
        );

    }
    else {

        passo2.appendChild(
            lista
        );

    }

}


/* =========================================================
   SELECIONAR CONVIDADO
========================================================= */

function selecionarConvidado(
    convidado
) {

    convidadoEncontrado =
        convidado;


    /* =====================================================
       RESTAURAR PASSO 2
    ===================================================== */

    restaurarPasso2();


    /* =====================================================
       JÁ CONFIRMADO
    ===================================================== */

    if (
        convidado.confirmado === true
    ) {

        mostrarDadosJaConfirmado(
            convidado
        );

        return;

    }


    /* =====================================================
       NOME
    ===================================================== */

    const nomeEncontrado =
        document.getElementById(
            "nome-encontrado"
        );


    if (nomeEncontrado) {

        nomeEncontrado.textContent =
            convidado.nome;

    }


    /* =====================================================
       RESETAR ACOMPANHANTES
    ===================================================== */

    if (acompanhantesInput) {

        acompanhantesInput.value =
            "0";

    }


    /* =====================================================
       MOSTRAR CONFIRMAÇÃO
    ===================================================== */

    mostrarPasso(
        "confirmar"
    );

}


/* =========================================================
   RESTAURAR PASSO 2
========================================================= */

function restaurarPasso2() {

    const titulo =
        passo2.querySelector(
            ".titulo-passo h2"
        );

    if (titulo) {

        titulo.textContent =
            "Encontramos seu nome!";

    }


    const subtitulo =
        passo2.querySelector(
            ".titulo-passo span"
        );

    if (subtitulo) {

        subtitulo.textContent =
            "CONVITE LOCALIZADO";

    }


    const conviteLocalizado =
        passo2.querySelector(
            ".convite-localizado"
        );

    if (conviteLocalizado) {

        conviteLocalizado.style.display =
            "";

    }


    const texto =
        passo2.querySelector(
            ".texto-confirmacao"
        );

    if (texto) {

        texto.style.display =
            "";

    }


    const campoAcompanhantes =
        passo2.querySelector(
            ".campo-acompanhantes"
        );

    if (campoAcompanhantes) {

        campoAcompanhantes.style.display =
            "";

    }


    const btnConfirmar =
        document.getElementById(
            "btn-confirmar"
        );

    if (btnConfirmar) {

        btnConfirmar.style.display =
            "";

    }


    const lista =
        document.getElementById(
            "lista-opcoes-convidados"
        );

    if (lista) {

        lista.remove();

    }

}


/* =========================================================
   MOSTRAR JÁ CONFIRMADO
========================================================= */

function mostrarDadosJaConfirmado(
    convidado
) {

    const nomeConfirmado =
        document.getElementById(
            "nome-ja-confirmado"
        );


    if (nomeConfirmado) {

        nomeConfirmado.textContent =
            convidado.nome;

    }


    const acompanhantesConfirmado =
        document.getElementById(
            "acompanhantes-ja-confirmado"
        );


    if (
        acompanhantesConfirmado
    ) {

        const quantidade =
            Number(
                convidado.acompanhantes || 0
            );


        acompanhantesConfirmado.textContent =
            formatarAcompanhantes(
                quantidade
            );

    }


    convidadoEncontrado =
        convidado;


    mostrarPasso(
        "confirmado"
    );

}


/* =========================================================
   CONFIRMAR PRESENÇA
========================================================= */

async function confirmarPresenca() {

    if (!convidadoEncontrado) {

        mostrarMensagem(
            "Nenhum convite selecionado.",
            true
        );

        return;

    }


    if (!supabaseClient) {

        mostrarMensagem(
            "Sistema indisponível. Atualize a página.",
            true
        );

        return;

    }


    const botao =
        document.getElementById(
            "btn-confirmar"
        );


    /* =====================================================
       ACOMPANHANTES
    ===================================================== */

    let acompanhantes =
        0;


    if (acompanhantesInput) {

        acompanhantes =
            Number(
                acompanhantesInput.value || 0
            );

    }


    /* =====================================================
       VALIDAR
    ===================================================== */

    if (
        !Number.isInteger(
            acompanhantes
        )
    ) {

        mostrarMensagem(
            "Selecione uma quantidade válida de acompanhantes.",
            true
        );

        return;

    }


    if (
        acompanhantes < 0 ||
        acompanhantes > MAX_ACOMPANHANTES
    ) {

        mostrarMensagem(
            `A quantidade máxima é de ${MAX_ACOMPANHANTES} acompanhantes.`,
            true
        );

        return;

    }


    /* =====================================================
       BLOQUEAR BOTÃO
    ===================================================== */

    if (botao) {

        botao.disabled =
            true;

        botao.textContent =
            "CONFIRMANDO...";

    }


    try {

        /* =================================================
           ATUALIZAR SUPABASE
        ================================================= */

        const {
            data,
            error
        } = await supabaseClient

            .from("convidados")

            .update({

                confirmado: true,

                acompanhantes:
                    acompanhantes

            })

            .eq(
                "id",
                convidadoEncontrado.id
            )

            .select(
                "id, nome, aniversariante, confirmado, acompanhantes"
            )

            .single();


        /* =================================================
           ERRO
        ================================================= */

        if (error) {

            console.error(
                "Erro ao confirmar presença:",
                error
            );

            mostrarMensagem(
                "Não foi possível confirmar sua presença. Tente novamente.",
                true
            );

            return;

        }


        if (!data) {

            mostrarMensagem(
                "Não foi possível localizar seu convite.",
                true
            );

            return;

        }


        /* =================================================
           ATUALIZAR ESTADO
        ================================================= */

        convidadoEncontrado =
            data;


        /* =================================================
           NOME
        ================================================= */

        const nomeSucesso =
            document.getElementById(
                "nome-sucesso"
            );


        if (nomeSucesso) {

            nomeSucesso.textContent =
                data.nome;

        }


        /* =================================================
           ACOMPANHANTES
        ================================================= */

        const sucessoAcompanhantes =
            document.getElementById(
                "sucesso-acompanhantes"
            );


        if (
            sucessoAcompanhantes
        ) {

            sucessoAcompanhantes.textContent =
                formatarAcompanhantes(
                    Number(
                        data.acompanhantes || 0
                    )
                );

        }


        /* =================================================
           MOSTRAR SUCESSO
        ================================================= */

        mostrarPasso(
            "sucesso"
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        mostrarMensagem(
            "Ocorreu um erro. Tente novamente.",
            true
        );

    }

    finally {

        if (botao) {

            botao.disabled =
                false;

            botao.innerHTML =
                `
                    <span>✓</span>
                    CONFIRMAR MINHA PRESENÇA
                `;

        }

    }

}


/* =========================================================
   FORMATAR ACOMPANHANTES
========================================================= */

function formatarAcompanhantes(
    quantidade
) {

    quantidade =
        Number(
            quantidade || 0
        );


    if (
        quantidade === 0
    ) {

        return "Você irá sozinho.";

    }


    if (
        quantidade === 1
    ) {

        return "Você irá com 1 acompanhante.";

    }


    return `Você irá com ${quantidade} acompanhantes.`;

}


/* =========================================================
   TROCAR PASSO
========================================================= */

function mostrarPasso(
    passo
) {

    /* =====================================================
       ESCONDER TODOS
    ===================================================== */

    [
        passo1,
        passo2,
        passo3,
        passoConfirmado,
        passoNaoEncontrado
    ].forEach(
        elemento => {

            if (elemento) {

                elemento.classList.add(
                    "escondido"
                );

            }

        }
    );


    /* =====================================================
       MOSTRAR
    ===================================================== */

    if (
        passo === "confirmar" &&
        passo2
    ) {

        passo2.classList.remove(
            "escondido"
        );

    }


    if (
        passo === "sucesso" &&
        passo3
    ) {

        passo3.classList.remove(
            "escondido"
        );

    }


    if (
        passo === "confirmado" &&
        passoConfirmado
    ) {

        passoConfirmado.classList.remove(
            "escondido"
        );

    }


    if (
        passo === "nao-encontrado" &&
        passoNaoEncontrado
    ) {

        passoNaoEncontrado.classList.remove(
            "escondido"
        );

    }


    /* =====================================================
       TOPO
    ===================================================== */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   VOLTAR
========================================================= */

function voltar() {

    convidadoEncontrado =
        null;

    convidadosEncontrados =
        [];

    limparMensagem();


    if (nomeInput) {

        nomeInput.value =
            "";

    }


    if (acompanhantesInput) {

        acompanhantesInput.value =
            "0";

    }


    restaurarPasso2();

    mostrarPassoInicial();

}


/* =========================================================
   PASSO INICIAL
========================================================= */

function mostrarPassoInicial() {

    [
        passo2,
        passo3,
        passoConfirmado,
        passoNaoEncontrado
    ].forEach(
        elemento => {

            if (elemento) {

                elemento.classList.add(
                    "escondido"
                );

            }

        }
    );


    if (passo1) {

        passo1.classList.remove(
            "escondido"
        );

    }


    if (acompanhantesInput) {

        acompanhantesInput.value =
            "0";

    }

}


/* =========================================================
   MENSAGEM
========================================================= */

function mostrarMensagem(
    texto,
    erro = false
) {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        texto;


    mensagem.style.color =
        erro
            ? "#ff8585"
            : "#7edc91";

}


/* =========================================================
   LIMPAR MENSAGEM
========================================================= */

function limparMensagem() {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        "";

}


/* =========================================================
   FIM
========================================================= */