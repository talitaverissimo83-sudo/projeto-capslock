
const API = "/api";

// Faz uma solicitação para a API.
async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(API + url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro na solicitação.");
    }

    return dados;
}

// Mostra mensagens nas páginas.
function mostrarMensagem(texto, tipo = "erro") {
    const caixa = document.getElementById("mensagem");

    if (!caixa) return;

    caixa.textContent = texto;
    caixa.className = "mensagem " + tipo;
}

// Trata textos cadastrados como texto, não como HTML.
function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, letra => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[letra]);
}

// Inicia as funções da página atual.
document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");
    const formOS = document.getElementById("formOS");
    const formTecnico = document.getElementById("formTecnico");
    const formCliente = document.getElementById("formCliente");

    if (formLogin) {
        formLogin.addEventListener("submit", entrar);
    }

    if (document.getElementById("totalOS")) {
        carregarDashboard();
    }

    if (formOS) {
        prepararFormularioOS(formOS);
    }

    if (document.getElementById("listaOS")) {
        carregarOS();
    }

    if (document.getElementById("detalhesOS")) {
        carregarDetalhesOS();
    }

    if (formTecnico) {
        formTecnico.addEventListener("submit", salvarTecnico);
        carregarTecnicos();
    }

    if (formCliente) {
        formCliente.addEventListener("submit", salvarCliente);
        carregarClientes();
    }
});

// ============================
// LOGIN
// ============================

async function entrar(evento) {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    try {
        const dados = await requisicao("/login", {
            method: "POST",
            body: JSON.stringify({ email, senha })
        });

        localStorage.setItem(
            "capslockUsuario",
            JSON.stringify(dados.usuario)
        );

        window.location.href = "dashboard.html";
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// ============================
// DASHBOARD
// ============================

async function carregarDashboard() {
    try {
        const dados = await requisicao("/dashboard");

        document.getElementById("totalOS").textContent = dados.totalOS;
        document.getElementById("abertas").textContent = dados.abertas;
        document.getElementById("andamento").textContent = dados.andamento;
        document.getElementById("concluidas").textContent = dados.concluidas;
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// ============================
// OPÇÕES DE CLIENTES E TÉCNICOS
// ============================

async function preencherClientes() {
    const clientes = await requisicao("/clientes");
    const select = document.getElementById("cliente_id");

    select.innerHTML = '<option value="">Selecione um cliente</option>';

    clientes.forEach(cliente => {
        select.innerHTML += `
            <option value="${cliente.id}">
                ${escapar(cliente.nome)}
            </option>
        `;
    });
}

async function preencherTecnicos() {
    const tecnicos = await requisicao("/tecnicos");
    const select = document.getElementById("tecnico_id");

    select.innerHTML = '<option value="">Sem técnico designado</option>';

    tecnicos.forEach(tecnico => {
        select.innerHTML += `
            <option value="${tecnico.id}">
                ${escapar(tecnico.nome)}
            </option>
        `;
    });
}

// ============================
// CADASTRO DE OS
// ============================

async function prepararFormularioOS(formulario) {
    try {
        await preencherClientes();
        await preencherTecnicos();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const dados = {
            titulo: document.getElementById("titulo").value.trim(),
            descricao: document.getElementById("descricao").value.trim(),
            equipamento: document.getElementById("equipamento").value.trim(),
            cliente_id: document.getElementById("cliente_id").value,
            tecnico_id: document.getElementById("tecnico_id").value || null,
            status: document.getElementById("status").value
        };

        try {
            const resultado = await requisicao("/os", {
                method: "POST",
                body: JSON.stringify(dados)
            });

            mostrarMensagem(
                "OS número " + resultado.id + " cadastrada com sucesso!",
                "sucesso"
            );

            formulario.reset();
        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    });
}

// ============================
// CONSULTA E EXCLUSÃO DE OS
// ============================

async function carregarOS() {
    const lista = document.getElementById("listaOS");

    try {
        const ordens = await requisicao("/os");

        if (ordens.length === 0) {
            lista.textContent = "Nenhuma ordem de serviço cadastrada.";
            return;
        }

        lista.innerHTML = `
            <div class="tabela-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Título</th>
                            <th>Cliente</th>
                            <th>Técnico</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordens.map(os => `
                            <tr>
                                <td>${os.id}</td>
                                <td>${escapar(os.titulo)}</td>
                                <td>${escapar(os.cliente_nome)}</td>
                                <td>${escapar(os.tecnico_nome || "Não designado")}</td>
                                <td><span class="status">${escapar(os.status)}</span></td>
                                <td>
                                    <div class="acoes">
                                        <a class="botao"
                                           href="detalhes-os.html?id=${os.id}">
                                            Detalhes
                                        </a>
                                        <button class="botao-perigo"
                                            onclick="excluirOS(${os.id})">
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function excluirOS(id) {
    if (!confirm("Deseja realmente excluir esta OS?")) return;

    try {
        await requisicao("/os/" + id, {
            method: "DELETE"
        });

        mostrarMensagem("OS excluída com sucesso.", "sucesso");
        carregarOS();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// ============================
// DETALHES E EDIÇÃO DE STATUS
// ============================

async function carregarDetalhesOS() {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");
    const area = document.getElementById("detalhesOS");

    if (!id) {
        area.textContent = "Selecione uma OS na página de consulta.";
        return;
    }

    try {
        const os = await requisicao("/os/" + id);

        area.innerHTML = `
            <section class="painel">
                <h2>OS #${os.id} — ${escapar(os.titulo)}</h2>
                <p><b>Descrição:</b> ${escapar(os.descricao)}</p>
                <p><b>Equipamento:</b> ${escapar(os.equipamento || "-")}</p>
                <p><b>Cliente:</b> ${escapar(os.cliente_nome)}</p>
                <p><b>Técnico:</b> ${escapar(os.tecnico_nome || "Não designado")}</p>
                <p><b>Data de criação:</b> ${escapar(os.data_criacao)}</p>

                <form id="formStatus">
                    <div class="campo">
                        <label for="status">Status da OS</label>
                        <select id="status">
                            <option value="Aberta">Aberta</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluída">Concluída</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                    </div>
                    <button type="submit">Atualizar status</button>
                </form>
            </section>
        `;

        document.getElementById("status").value = os.status;

        document.getElementById("formStatus").addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                const novoStatus = document.getElementById("status").value;

                try {
                    await requisicao("/os/" + id, {
                        method: "PUT",
                        body: JSON.stringify({
                            titulo: os.titulo,
                            descricao: os.descricao,
                            equipamento: os.equipamento || "",
                            cliente_id: os.cliente_id,
                            tecnico_id: os.tecnico_id,
                            status: novoStatus
                        })
                    });

                    mostrarMensagem(
                        "Status atualizado com sucesso!",
                        "sucesso"
                    );

                    carregarDetalhesOS();
                } catch (erro) {
                    mostrarMensagem(erro.message);
                }
            }
        );
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// ============================
// TÉCNICOS
// ============================

async function carregarTecnicos() {
    const lista = document.getElementById("listaTecnicos");

    try {
        const tecnicos = await requisicao("/tecnicos");

        if (tecnicos.length === 0) {
            lista.textContent = "Nenhum técnico cadastrado.";
            return;
        }

        lista.innerHTML = `
            <div class="tabela-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Especialidade</th>
                            <th>Telefone</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tecnicos.map(tecnico => `
                            <tr>
                                <td>${escapar(tecnico.nome)}</td>
                                <td>${escapar(tecnico.email)}</td>
                                <td>${escapar(tecnico.especialidade)}</td>
                                <td>${escapar(tecnico.telefone)}</td>
                                <td>
                                    <div class="acoes">
                                        <button onclick="editarTecnico(${tecnico.id})">
                                            Editar
                                        </button>
                                        <button class="botao-perigo"
                                            onclick="excluirTecnico(${tecnico.id})">
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function salvarTecnico(evento) {
    evento.preventDefault();

    const id = document.getElementById("tecnicoId").value;

    const dados = {
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim(),
        especialidade: document.getElementById("especialidade").value.trim(),
        telefone: document.getElementById("telefone").value.trim()
    };

    try {
        await requisicao(
            "/tecnicos" + (id ? "/" + id : ""),
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(dados)
            }
        );

        evento.target.reset();
        document.getElementById("tecnicoId").value = "";

        document.getElementById("salvarTecnico").textContent =
            "Cadastrar técnico";

        mostrarMensagem("Técnico salvo com sucesso!", "sucesso");
        carregarTecnicos();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function editarTecnico(id) {
    try {
        const tecnico = await requisicao("/tecnicos/" + id);

        document.getElementById("tecnicoId").value = tecnico.id;
        document.getElementById("nome").value = tecnico.nome;
        document.getElementById("email").value = tecnico.email;
        document.getElementById("especialidade").value = tecnico.especialidade;
        document.getElementById("telefone").value = tecnico.telefone || "";

        document.getElementById("salvarTecnico").textContent =
            "Salvar alterações";

        window.scrollTo(0, 0);
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function excluirTecnico(id) {
    if (!confirm("Deseja excluir este técnico?")) return;

    try {
        await requisicao("/tecnicos/" + id, {
            method: "DELETE"
        });

        mostrarMensagem("Técnico excluído com sucesso!", "sucesso");
        carregarTecnicos();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// ============================
// CLIENTES
// ============================

async function carregarClientes() {
    const lista = document.getElementById("listaClientes");

    try {
        const clientes = await requisicao("/clientes");

        if (clientes.length === 0) {
            lista.textContent = "Nenhum cliente cadastrado.";
            return;
        }

        lista.innerHTML = `
            <div class="tabela-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientes.map(cliente => `
                            <tr>
                                <td>${escapar(cliente.nome)}</td>
                                <td>${escapar(cliente.email)}</td>
                                <td>${escapar(cliente.telefone)}</td>
                                <td>
                                    <div class="acoes">
                                        <button onclick="editarCliente(${cliente.id})">
                                            Editar
                                        </button>
                                        <button class="botao-perigo"
                                            onclick="excluirCliente(${cliente.id})">
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function salvarCliente(evento) {
    evento.preventDefault();

    const id = document.getElementById("clienteId").value;

    const dados = {
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim(),
        telefone: document.getElementById("telefone").value.trim()
    };

    try {
        await requisicao(
            "/clientes" + (id ? "/" + id : ""),
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(dados)
            }
        );

        evento.target.reset();
        document.getElementById("clienteId").value = "";

        document.getElementById("salvarCliente").textContent =
            "Cadastrar cliente";

        mostrarMensagem("Cliente salvo com sucesso!", "sucesso");
        carregarClientes();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function editarCliente(id) {
    try {
        const cliente = await requisicao("/clientes/" + id);

        document.getElementById("clienteId").value = cliente.id;
        document.getElementById("nome").value = cliente.nome;
        document.getElementById("email").value = cliente.email;
        document.getElementById("telefone").value = cliente.telefone || "";

        document.getElementById("salvarCliente").textContent =
            "Salvar alterações";

        window.scrollTo(0, 0);
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function excluirCliente(id) {
    if (!confirm("Deseja excluir este cliente?")) return;

    try {
        await requisicao("/clientes/" + id, {
            method: "DELETE"
        });

        mostrarMensagem("Cliente excluído com sucesso!", "sucesso");
        carregarClientes();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}
