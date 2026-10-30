# CapsLock — Sistema de Gerenciamento de Ordens de Serviço

## 1. Sobre o projeto

O CapsLock é um sistema web desenvolvido para uma empresa de manutenção de equipamentos. Seu objetivo é facilitar o gerenciamento de Ordens de Serviço (OS), clientes e técnicos, substituindo controles manuais por uma plataforma digital.

## 2. Objetivo

Desenvolver um sistema que permita cadastrar, consultar e gerenciar Ordens de Serviço, acompanhar o andamento dos serviços e organizar as informações da empresa.

## 3. Funcionalidades

- Tela de login.
- Dashboard inicial.
- Cadastro de Ordens de Serviço.
- Consulta de Ordens de Serviço.
- Visualização dos detalhes das OS.
- Gerenciamento de técnicos.
- Gerenciamento de clientes.
- Atualização do status das OS.
- Área de consulta do cliente.

## 4. Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| HTML5 | Estrutura das páginas |
| CSS3 | Estilização das telas |
| JavaScript | Funcionalidades e interatividade |
| Node.js | Desenvolvimento do back-end |
| Express.js | Criação da API |
| SQLite | Banco de dados |
| Git e GitHub | Controle de versão |

## 5. Estrutura do projeto

```text
CapsLock/
│
├── frontend/
│   ├── páginas HTML
│   ├── style.css
│   └── arquivos JavaScript
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── config/
│   └── package.json
│
└── README.md
```

## 6. Como executar o projeto

**Pré-requisitos:**
- Node.js instalado.
- Visual Studio Code.

**Instalação das dependências:**

```bash
cd backend
npm install
```

**Inicialização do servidor:**

```bash
node server.js
```
http://localhost:3000

## 7. Documentação da API

A API REST é responsável pela comunicação entre o front-end e o back-end, permitindo o gerenciamento das informações do sistema.

### 7.1. Endpoints

| Endpoint | Descrição |
|---|---|
| `/api/login` | Autenticação de usuários |
| `/api/clientes` | Gerenciamento de clientes |
| `/api/tecnicos` | Gerenciamento de técnicos |
| `/api/os` | Gerenciamento de Ordens de Serviço |
| `/api/dashboard` | Informações do painel inicial |

### 7.2. Métodos HTTP

| Método | Descrição |
|---|---|
| GET | Consultar informações |
| POST | Cadastrar informações |
| PUT | Atualizar informações |
| DELETE | Excluir informações |

### 7.3. Parâmetros

Os parâmetros são utilizados para identificar registros e enviar informações à API.

Exemplos:
- ID: identifica um registro específico.
- Nome: identifica o cliente ou técnico.
- E-mail e senha: utilizados na autenticação.
- Descrição: apresenta informações sobre o serviço.
- Status: indica a situação da Ordem de Serviço.

### 7.4. Respostas

A API retorna respostas conforme o resultado das requisições.

| Código HTTP | Significado |
|---|---|
| 200 | Requisição realizada com sucesso |
| 201 | Registro criado com sucesso |
| 400 | Dados inválidos |
| 404 | Registro ou rota não encontrada |
| 500 | Erro interno do servidor |

## 8. Banco de dados

O banco de dados é responsável por armazenar as informações do sistema, incluindo clientes, técnicos, usuários e Ordens de Serviço.

## 9. Desenvolvimento por Sprints

- **Sprint 1:** planejamento, levantamento de requisitos e prototipação.
- **Sprint 2:** desenvolvimento das interfaces, back-end, API e banco de dados.
- **Sprint 3:** integração, testes, correções e finalização do sistema.

## 10. Equipe

**Projeto:** CapsLock  
**Curso:** Desenvolvimento de Sistemas

**Integrantes:**
Talita Verissimo
Giovanna Carvalho
Rafaella Carvalho
Bruna Carvalho 