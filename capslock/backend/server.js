
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORTA = 3000;

// ======================================
// 1. CONFIGURACAO DO SERVIDOR
// ======================================

const pastaFrontend = path.join(__dirname, "../frontend");

app.use(cors());
app.use(express.json());

// Permite abrir HTML, CSS e JavaScript do site.
app.use(express.static(pastaFrontend));

// ======================================
// 2. BANCO DE DADOS
// ======================================

const db = new Database(
    path.join(__dirname, "capslock.db")
);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefone TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tecnicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        especialidade TEXT NOT NULL,
        telefone TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL,
        tipo TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ordens_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        equipamento TEXT DEFAULT '',
        cliente_id INTEGER NOT NULL,
        tecnico_id INTEGER,
        status TEXT NOT NULL DEFAULT 'Aberta'
            CHECK (
                status IN (
                    'Aberta',
                    'Em andamento',
                    'Concluída',
                    'Cancelada'
                )
            ),
        data_criacao TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (cliente_id)
            REFERENCES clientes(id),

        FOREIGN KEY (tecnico_id)
            REFERENCES tecnicos(id)
            ON DELETE SET NULL
    );
`);

// Cria o usuario de teste caso ainda nao exista.
const usuarioExistente = db.prepare(
    "SELECT id FROM usuarios WHERE email = ?"
).get("admin@capslock.com");

if (!usuarioExistente) {
    db.prepare(`
        INSERT INTO usuarios (nome, email, senha, tipo)
        VALUES (?, ?, ?, ?)
    `).run(
        "Administrador",
        "admin@capslock.com",
        "123456",
        "Administrador"
    );
}

// ======================================
// 3. FUNCOES AUXILIARES
// ======================================

const statusPermitidos = [
    "Aberta",
    "Em andamento",
    "Concluída",
    "Cancelada"
];

function camposPreenchidos(dados, campos) {
    return campos.every(campo =>
        typeof dados[campo] === "string" &&
        dados[campo].trim() !== ""
    );
}

function emailValido(email) {
    return typeof email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function enviarErro(res, erro, mensagem) {
    if (erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({
            erro: "Esse email já está cadastrado."
        });
    }

    if (erro.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return res.status(400).json({
            erro: "O cliente ou técnico informado não existe."
        });
    }

    console.error(erro);

    return res.status(500).json({
        erro: mensagem
    });
}

// ======================================
// 4. PAGINA INICIAL E TESTE DA API
// ======================================

// Abre o index.html quando acessar localhost:3000.
app.get("/", (req, res) => {
    res.sendFile(
        path.join(pastaFrontend, "index.html")
    );
});

// Testa se a API esta funcionando.
app.get("/api", (req, res) => {
    res.json({
        mensagem: "API CapsLock funcionando!"
    });
});

// ======================================
// 5. LOGIN
// ======================================

app.post("/api/login", (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: "Informe email e senha."
        });
    }

    const usuario = db.prepare(`
        SELECT id, nome, email, tipo
        FROM usuarios
        WHERE email = ? AND senha = ?
    `).get(email, senha);

    if (!usuario) {
        return res.status(401).json({
            erro: "Email ou senha incorretos."
        });
    }

    res.json({
        mensagem: "Login realizado com sucesso!",
        usuario
    });
});

// ======================================
// 6. DASHBOARD
// ======================================

app.get("/api/dashboard", (req, res) => {
    const totalOS = db.prepare(`
        SELECT COUNT(*) AS total
        FROM ordens_servico
    `).get().total;

    const abertas = db.prepare(`
        SELECT COUNT(*) AS total
        FROM ordens_servico
        WHERE status = 'Aberta'
    `).get().total;

    const andamento = db.prepare(`
        SELECT COUNT(*) AS total
        FROM ordens_servico
        WHERE status = 'Em andamento'
    `).get().total;

    const concluidas = db.prepare(`
        SELECT COUNT(*) AS total
        FROM ordens_servico
        WHERE status = 'Concluída'
    `).get().total;

    res.json({
        totalOS,
        abertas,
        andamento,
        concluidas
    });
});

// ======================================
// 7. CRUD DE CLIENTES
// ======================================

// GET: lista os clientes.
app.get("/api/clientes", (req, res) => {
    const clientes = db.prepare(`
        SELECT * FROM clientes
        ORDER BY id DESC
    `).all();

    res.json(clientes);
});

// GET: consulta um cliente pelo ID.
app.get("/api/clientes/:id", (req, res) => {
    const cliente = db.prepare(`
        SELECT * FROM clientes WHERE id = ?
    `).get(req.params.id);

    if (!cliente) {
        return res.status(404).json({
            erro: "Cliente não encontrado."
        });
    }

    res.json(cliente);
});

// POST: cadastra um cliente.
app.post("/api/clientes", (req, res) => {
    const { nome, email, telefone = "" } = req.body;

    if (!camposPreenchidos(req.body, ["nome", "email"])) {
        return res.status(400).json({
            erro: "Nome e email são obrigatórios."
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({
            erro: "Informe um email válido."
        });
    }

    try {
        const resultado = db.prepare(`
            INSERT INTO clientes (nome, email, telefone)
            VALUES (?, ?, ?)
        `).run(nome.trim(), email.trim(), telefone);

        res.status(201).json({
            id: resultado.lastInsertRowid,
            nome: nome.trim(),
            email: email.trim(),
            telefone
        });
    } catch (erro) {
        enviarErro(res, erro, "Erro ao cadastrar cliente.");
    }
});

// PUT: edita um cliente.
app.put("/api/clientes/:id", (req, res) => {
    const { nome, email, telefone = "" } = req.body;

    if (!camposPreenchidos(req.body, ["nome", "email"])) {
        return res.status(400).json({
            erro: "Nome e email são obrigatórios."
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({
            erro: "Informe um email válido."
        });
    }

    try {
        const resultado = db.prepare(`
            UPDATE clientes
            SET nome = ?, email = ?, telefone = ?
            WHERE id = ?
        `).run(nome.trim(), email.trim(), telefone, req.params.id);

        if (resultado.changes === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado."
            });
        }

        res.json({
            mensagem: "Cliente atualizado com sucesso."
        });
    } catch (erro) {
        enviarErro(res, erro, "Erro ao atualizar cliente.");
    }
});

// DELETE: exclui um cliente.
app.delete("/api/clientes/:id", (req, res) => {
    const cliente = db.prepare(`
        SELECT id FROM clientes WHERE id = ?
    `).get(req.params.id);

    if (!cliente) {
        return res.status(404).json({
            erro: "Cliente não encontrado."
        });
    }

    const possuiOS = db.prepare(`
        SELECT id FROM ordens_servico
        WHERE cliente_id = ?
    `).get(req.params.id);

    if (possuiOS) {
        return res.status(400).json({
            erro: "Este cliente possui OS vinculadas e não pode ser excluído."
        });
    }

    db.prepare(`
        DELETE FROM clientes WHERE id = ?
    `).run(req.params.id);

    res.json({
        mensagem: "Cliente excluído com sucesso."
    });
});

// ======================================
// 8. CRUD DE TECNICOS
// ======================================

// GET: lista os técnicos.
app.get("/api/tecnicos", (req, res) => {
    const tecnicos = db.prepare(`
        SELECT * FROM tecnicos
        ORDER BY id DESC
    `).all();

    res.json(tecnicos);
});

// GET: consulta um técnico.
app.get("/api/tecnicos/:id", (req, res) => {
    const tecnico = db.prepare(`
        SELECT * FROM tecnicos WHERE id = ?
    `).get(req.params.id);

    if (!tecnico) {
        return res.status(404).json({
            erro: "Técnico não encontrado."
        });
    }

    res.json(tecnico);
});

// POST: cadastra um técnico.
app.post("/api/tecnicos", (req, res) => {
    const {
        nome,
        email,
        especialidade,
        telefone = ""
    } = req.body;

    if (!camposPreenchidos(req.body, [
        "nome", "email", "especialidade"
    ])) {
        return res.status(400).json({
            erro: "Nome, email e especialidade são obrigatórios."
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({
            erro: "Informe um email válido."
        });
    }

    try {
        const resultado = db.prepare(`
            INSERT INTO tecnicos
                (nome, email, especialidade, telefone)
            VALUES (?, ?, ?, ?)
        `).run(
            nome.trim(),
            email.trim(),
            especialidade.trim(),
            telefone
        );

        res.status(201).json({
            id: resultado.lastInsertRowid,
            nome: nome.trim(),
            email: email.trim(),
            especialidade: especialidade.trim(),
            telefone
        });
    } catch (erro) {
        enviarErro(res, erro, "Erro ao cadastrar técnico.");
    }
});

// PUT: edita um técnico.
app.put("/api/tecnicos/:id", (req, res) => {
    const {
        nome,
        email,
        especialidade,
        telefone = ""
    } = req.body;

    if (!camposPreenchidos(req.body, [
        "nome", "email", "especialidade"
    ])) {
        return res.status(400).json({
            erro: "Nome, email e especialidade são obrigatórios."
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({
            erro: "Informe um email válido."
        });
    }

    try {
        const resultado = db.prepare(`
            UPDATE tecnicos
            SET nome = ?, email = ?, especialidade = ?, telefone = ?
            WHERE id = ?
        `).run(
            nome.trim(),
            email.trim(),
            especialidade.trim(),
            telefone,
            req.params.id
        );

        if (resultado.changes === 0) {
            return res.status(404).json({
                erro: "Técnico não encontrado."
            });
        }

        res.json({
            mensagem: "Técnico atualizado com sucesso."
        });
    } catch (erro) {
        enviarErro(res, erro, "Erro ao atualizar técnico.");
    }
});

// DELETE: exclui um técnico.
app.delete("/api/tecnicos/:id", (req, res) => {
    const tecnico = db.prepare(`
        SELECT id FROM tecnicos WHERE id = ?
    `).get(req.params.id);

    if (!tecnico) {
        return res.status(404).json({
            erro: "Técnico não encontrado."
        });
    }

    // A OS continua existindo, mas fica sem técnico.
    db.prepare(`
        UPDATE ordens_servico
        SET tecnico_id = NULL
        WHERE tecnico_id = ?
    `).run(req.params.id);

    db.prepare(`
        DELETE FROM tecnicos WHERE id = ?
    `).run(req.params.id);

    res.json({
        mensagem: "Técnico excluído com sucesso."
    });
});

// ======================================
// 9. CRUD DE ORDENS DE SERVICO
// ======================================

const consultaOS = `
    SELECT
        os.*,
        clientes.nome AS cliente_nome,
        tecnicos.nome AS tecnico_nome
    FROM ordens_servico AS os
    JOIN clientes ON clientes.id = os.cliente_id
    LEFT JOIN tecnicos ON tecnicos.id = os.tecnico_id
`;

// GET: lista as ordens de serviço.
app.get("/api/os", (req, res) => {
    const ordens = db.prepare(`
        ${consultaOS}
        ORDER BY os.id DESC
    `).all();

    res.json(ordens);
});

// GET: consulta uma ordem de serviço.
app.get("/api/os/:id", (req, res) => {
    const os = db.prepare(`
        ${consultaOS}
        WHERE os.id = ?
    `).get(req.params.id);

    if (!os) {
        return res.status(404).json({
            erro: "Ordem de serviço não encontrada."
        });
    }

    res.json(os);
});

// POST: cadastra uma OS.
app.post("/api/os", (req, res) => {
    const {
        titulo,
        descricao,
        equipamento = "",
        cliente_id,
        tecnico_id = null,
        status = "Aberta"
    } = req.body;

    if (!camposPreenchidos(req.body, ["titulo", "descricao"])) {
        return res.status(400).json({
            erro: "Título e descrição são obrigatórios."
        });
    }

    if (!Number.isInteger(Number(cliente_id)) ||
        Number(cliente_id) <= 0) {
        return res.status(400).json({
            erro: "Selecione um cliente válido."
        });
    }

    if (!statusPermitidos.includes(status)) {
        return res.status(400).json({
            erro: "Status inválido."
        });
    }

    const cliente = db.prepare(`
        SELECT id FROM clientes WHERE id = ?
    `).get(cliente_id);

    if (!cliente) {
        return res.status(400).json({
            erro: "O cliente selecionado não existe."
        });
    }

    let tecnicoIdFinal = null;

    if (tecnico_id !== null && tecnico_id !== "") {
        if (!Number.isInteger(Number(tecnico_id)) ||
            Number(tecnico_id) <= 0) {
            return res.status(400).json({
                erro: "Técnico inválido."
            });
        }

        const tecnico = db.prepare(`
            SELECT id FROM tecnicos WHERE id = ?
        `).get(tecnico_id);

        if (!tecnico) {
            return res.status(400).json({
                erro: "O técnico selecionado não existe."
            });
        }

        tecnicoIdFinal = Number(tecnico_id);
    }

    const resultado = db.prepare(`
        INSERT INTO ordens_servico
            (titulo, descricao, equipamento, cliente_id, tecnico_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        titulo.trim(),
        descricao.trim(),
        equipamento,
        Number(cliente_id),
        tecnicoIdFinal,
        status
    );

    res.status(201).json({
        id: resultado.lastInsertRowid,
        mensagem: "Ordem de serviço cadastrada com sucesso."
    });
});

// PUT: atualiza uma OS, incluindo o status.
app.put("/api/os/:id", (req, res) => {
    const {
        titulo,
        descricao,
        equipamento = "",
        cliente_id,
        tecnico_id = null,
        status
    } = req.body;

    if (!camposPreenchidos(req.body, ["titulo", "descricao"])) {
        return res.status(400).json({
            erro: "Título e descrição são obrigatórios."
        });
    }

    if (!statusPermitidos.includes(status)) {
        return res.status(400).json({
            erro: "Status inválido."
        });
    }

    const osExistente = db.prepare(`
        SELECT id FROM ordens_servico WHERE id = ?
    `).get(req.params.id);

    if (!osExistente) {
        return res.status(404).json({
            erro: "Ordem de serviço não encontrada."
        });
    }

    const cliente = db.prepare(`
        SELECT id FROM clientes WHERE id = ?
    `).get(cliente_id);

    if (!cliente) {
        return res.status(400).json({
            erro: "O cliente selecionado não existe."
        });
    }

    let tecnicoIdFinal = null;

    if (tecnico_id !== null && tecnico_id !== "") {
        const tecnico = db.prepare(`
            SELECT id FROM tecnicos WHERE id = ?
        `).get(tecnico_id);

        if (!tecnico) {
            return res.status(400).json({
                erro: "O técnico selecionado não existe."
            });
        }

        tecnicoIdFinal = Number(tecnico_id);
    }

    db.prepare(`
        UPDATE ordens_servico
        SET titulo = ?,
            descricao = ?,
            equipamento = ?,
            cliente_id = ?,
            tecnico_id = ?,
            status = ?
        WHERE id = ?
    `).run(
        titulo.trim(),
        descricao.trim(),
        equipamento,
        Number(cliente_id),
        tecnicoIdFinal,
        status,
        req.params.id
    );

    res.json({
        mensagem: "Ordem de serviço atualizada com sucesso."
    });
});

// DELETE: exclui uma OS.
app.delete("/api/os/:id", (req, res) => {
    const resultado = db.prepare(`
        DELETE FROM ordens_servico WHERE id = ?
    `).run(req.params.id);

    if (resultado.changes === 0) {
        return res.status(404).json({
            erro: "Ordem de serviço não encontrada."
        });
    }

    res.json({
        mensagem: "Ordem de serviço excluída com sucesso."
    });
});

// ======================================
// 10. ROTAS NAO ENCONTRADAS
// ======================================

app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada."
    });
});

// ======================================
// 11. TRATAMENTO DE ERROS
// ======================================

app.use((erro, req, res, next) => {
    console.error(erro);

    if (res.headersSent) {
        return next(erro);
    }

    res.status(500).json({
        erro: "Erro interno do servidor."
    });
});

// ======================================
// 12. INICIAR O SERVIDOR
// ======================================

app.listen(PORTA, () => {
    console.log(
        `Servidor CapsLock rodando em http://localhost:${PORTA}`
    );
});
