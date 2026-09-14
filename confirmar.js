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
   ANIVERSARIANTES
========================================================= */

const ANIVERSARIANTES = {
    sarah: "Sarah",
    jeice: "Jeice",
    ione: "Ione"
};


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const MAX_ACOMPANHANTES = 5;


/* =========================================================
   ESTADO
========================================================= */

let aniversarianteSelecionada = "sarah";

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
       CONFIGURAÇÕES
    ===================================================== */

    configurarAniversariantes();

    configurarBotoes();

    configurarEnter();

    /* =====================================================
       ESTADO INICIAL
    ===================================================== */

    mostrarPassoInicial();

}


/* =========================================================
   ANIVERSARIANTES
========================================================= */

function configurarAniversariantes() {

    const botoes =
        document.querySelectorAll(
            ".aniversariante"
        );


    botoes.forEach(
        botao => {

            botao.addEventListener(
                "click",
                () => {

                    const aniversariante =
                        botao.dataset.aniversariante;


                    if (
                        !ANIVERSARIANTES[
                            aniversariante
                        ]
                    ) {

                        return;

                    }


                    aniversarianteSelecionada =
                        aniversariante;


                    botoes.forEach(
                        item => {

                            item.classList.toggle(
                                "ativo",
                                item === botao
                            );

                        }
                    );


                    limparMensagem();

                }
            );

        }
    );

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
       VALIDAR NOME
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
           BUSCAR CONVIDADOS
        ================================================= */

        const {
            data,
            error
        } = await supabaseClient

            .from("convidados")

            .select(
                "id, nome, aniversariante, confirmado, acompanhantes"
            )

            .eq(
                "aniversariante",
                aniversarianteSelecionada
            );


        /* =================================================
           ERRO SUPABASE
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
           PROCURAR PELO NOME
        ================================================= */

        const nomeNormalizado =
            normalizar(nome);


        const encontrado =
            (data || []).find(
                convidado =>
                    normalizar(
                        convidado.nome
                    ) ===
                    nomeNormalizado
            );


        /* =================================================
           NÃO ENCONTROU
        ================================================= */

        if (!encontrado) {

            convidadoEncontrado =
                null;

            mostrarPasso(
                "nao-encontrado"
            );

            return;

        }


        /* =================================================
           JÁ CONFIRMADO
        ================================================= */

        if (
            encontrado.confirmado === true
        ) {

            mostrarDadosJaConfirmado(
                encontrado
            );

            return;

        }


        /* =================================================
           GUARDAR CONVIDADO
        ================================================= */

        convidadoEncontrado =
            encontrado;


        /* =================================================
           NOME
        ================================================= */

        const nomeEncontrado =
            document.getElementById(
                "nome-encontrado"
            );


        if (nomeEncontrado) {

            nomeEncontrado.textContent =
                encontrado.nome;

        }


        /* =================================================
           ANIVERSARIANTE
        ================================================= */

        const aniversarianteEncontrada =
            document.getElementById(
                "aniversariante-encontrada"
            );


        if (
            aniversarianteEncontrada
        ) {

            aniversarianteEncontrada.textContent =
                `Aniversário de ${
                    ANIVERSARIANTES[
                        encontrado.aniversariante
                    ] || encontrado.aniversariante
                }`;

        }


        /* =================================================
           RESETAR ACOMPANHANTES
        ================================================= */

        if (acompanhantesInput) {

            acompanhantesInput.value =
                "0";

        }


        /* =================================================
           MOSTRAR CONFIRMAÇÃO
        ================================================= */

        mostrarPasso(
            "confirmar"
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


    const aniversarianteConfirmado =
        document.getElementById(
            "aniversariante-ja-confirmado"
        );


    if (
        aniversarianteConfirmado
    ) {

        aniversarianteConfirmado.textContent =
            ANIVERSARIANTES[
                convidado.aniversariante
            ] ||
            convidado.aniversariante;

    }


    /* =====================================================
       ACOMPANHANTES
    ===================================================== */

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
       PEGAR ACOMPANHANTES
    ===================================================== */

    let acompanhantes = 0;


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
        acompanhantes < 0
    ) {

        mostrarMensagem(
            "A quantidade de acompanhantes não pode ser negativa.",
            true
        );

        return;

    }


    if (
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
           ANIVERSARIANTE
        ================================================= */

        const sucessoAniversariante =
            document.getElementById(
                "sucesso-aniversariante"
            );


        if (
            sucessoAniversariante
        ) {

            sucessoAniversariante.textContent =
                ANIVERSARIANTES[
                    data.aniversariante
                ] ||
                data.aniversariante;

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
                    ✓
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

    if (passo1) {

        passo1.classList.add(
            "escondido"
        );

    }


    if (passo2) {

        passo2.classList.add(
            "escondido"
        );

    }


    if (passo3) {

        passo3.classList.add(
            "escondido"
        );

    }


    if (passoConfirmado) {

        passoConfirmado.classList.add(
            "escondido"
        );

    }


    if (passoNaoEncontrado) {

        passoNaoEncontrado.classList.add(
            "escondido"
        );

    }


    /* =====================================================
       CONFIRMAR
    ===================================================== */

    if (
        passo === "confirmar" &&
        passo2
    ) {

        passo2.classList.remove(
            "escondido"
        );

    }


    /* =====================================================
       SUCESSO
    ===================================================== */

    if (
        passo === "sucesso" &&
        passo3
    ) {

        passo3.classList.remove(
            "escondido"
        );

    }


    /* =====================================================
       JÁ CONFIRMADO
    ===================================================== */

    if (
        passo === "confirmado" &&
        passoConfirmado
    ) {

        passoConfirmado.classList.remove(
            "escondido"
        );

    }


    /* =====================================================
       NÃO ENCONTRADO
    ===================================================== */

    if (
        passo === "nao-encontrado" &&
        passoNaoEncontrado
    ) {

        passoNaoEncontrado.classList.remove(
            "escondido"
        );

    }


    /* =====================================================
       TOPO DA PÁGINA
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


    limparMensagem();


    if (nomeInput) {

        nomeInput.value =
            "";

    }


    if (acompanhantesInput) {

        acompanhantesInput.value =
            "0";

    }


    mostrarPassoInicial();

}


/* =========================================================
   VOLTAR PARA PRIMEIRO PASSO
========================================================= */

function mostrarPassoInicial() {

    if (passo2) {

        passo2.classList.add(
            "escondido"
        );

    }


    if (passo3) {

        passo3.classList.add(
            "escondido"
        );

    }


    if (passoConfirmado) {

        passoConfirmado.classList.add(
            "escondido"
        );

    }


    if (passoNaoEncontrado) {

        passoNaoEncontrado.classList.add(
            "escondido"
        );

    }


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