# Kratos

Plataforma distribuida para cadastro e consulta de usuarios, com processamento assincrono orientado a eventos.

## Visao Geral

O `Kratos` e um monorepo com tres componentes principais:

- `kratos-front`: interface web (React + Vite)
- `kratos-api`: API HTTP em .NET (ingestao e consulta)
- `kratos-worker`: processador assincro em Go (consumo de fila e persistencia)

A arquitetura usa RabbitMQ para desacoplamento, MongoDB para persistencia e Redis para cache/idempotencia.

## Arquitetura

```mermaid
flowchart LR
    U["Usuario"] --> F["Kratos Frontend<br/>React + Vite + Nginx"]
    F -->|"HTTP POST /users"| A["Kratos API<br/>.NET 10 Minimal API"]
    F -->|"HTTP GET /users e GET /users/:cpf"| A

    A -->|"Publish"| Q[("RabbitMQ<br/>queue: user_queue")]
    W["Kratos Worker<br/>Go 1.22"] -->|"Consume"| Q

    W -->|"Persist"| M[("MongoDB<br/>db: kratos_db<br/>collection: users")]
    A -->|Read| M

    A -->|"Cache read/write"| R[("Redis")]
    W -->|"Idempotency key by message id"| R

    Q -->|"DLX route on failure"| QE[("user_queue_errors")]
```

### Fluxo de negocio

1. Frontend envia `POST /users` para API.
2. API valida payload e publica evento na fila `user_queue`.
3. Worker consome mensagens com concorrencia (50 workers), aplica idempotencia no Redis e persiste no MongoDB.
4. Consultas `GET /users` e `GET /users/{cpf}` sao respondidas pela API; consulta por CPF usa cache Redis.
5. Mensagens com erro podem ser roteadas para `user_queue_errors` (DLX).

## Stack Tecnologica

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind, Nginx |
| API | .NET 10, Minimal API, AutoMapper, MongoDB.Driver, RabbitMQ.Client, Redis Cache |
| Worker | Go 1.22, amqp091-go, MongoDB driver, Redis |
| Mensageria | RabbitMQ (com DLX) |
| Dados | MongoDB |
| Cache/Idempotencia | Redis |
| Containers | Docker, Docker Compose |

## Estrutura do Repositorio

```text
.
|-- docker-compose.yml
|-- kratos-api/
|   `-- src/Kratos.Api
|-- kratos-front/
`-- kratos-worker/
```

## Requisitos

- Docker 24+
- Docker Compose v2+

Opcional (execucao local sem containers):

- .NET SDK 10
- Go 1.22+
- Node.js 22+

## Execucao Rapida (Docker)

```bash
docker compose up --build
```

Servicos:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API (apos ajuste de porta): [http://localhost:5007/users](http://localhost:5007/users)
- RabbitMQ Management: [http://localhost:15672](http://localhost:15672)
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

## Endpoints

### `POST /users`

Cria usuario de forma assincrona (publica mensagem na fila).

Exemplo:

```bash
curl -X POST http://localhost:5007/users \
  -H "Content-Type: application/json" \
  -d '{"cpf":"12345678901","name":"Kratos","email":"kratos@example.com"}'
```

Resposta esperada: `202 Accepted`

### `GET /users`

Lista usuarios persistidos. Suporta filtro por nome:

- `GET /users?name=joao`

### `GET /users/{cpf}`

Retorna usuario por CPF (com tentativa de leitura em cache antes do banco).

## Variaveis de Ambiente

### API

- `MONGO_URL` (default: `mongodb://root:example@localhost:27017`)
- `REDIS_URL` (default: `localhost:6379`)
- `RABBIT_URL` (default no codigo: `localhost`)

### Worker

- `MONGO_URL` (default: `mongodb://root:example@localhost:27017`)
- `REDIS_URL` (default: `localhost:6379`)
- `RABBIT_URL` (default: `amqp://guest:guest@localhost:5672`)

## Execucao Local (Sem Docker)

### API

```bash
cd kratos-api/src/Kratos.Api
dotnet restore
dotnet run
```

### Worker

```bash
cd kratos-worker
go mod download
go run ./cmd/worker/main.go
```

### Frontend

```bash
cd kratos-front
npm install
npm run dev
```

## Qualidade e Operacao

- Processamento assincrono para reduzir acoplamento entre escrita e persistencia.
- Idempotencia no worker para evitar duplicidade por reentrega de mensagem.
- Cache Redis para reduzir latencia nas consultas por CPF.
- Fila de erro (`user_queue_errors`) para suporte a diagnostico e retentativa.

## Roadmap Sugerido

- Incluir testes automatizados (unitarios e integracao).

## Licença
Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
