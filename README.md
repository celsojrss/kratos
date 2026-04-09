# Kratos

Plataforma distribuida para cadastro e consulta de usuarios, com processamento assincrono orientado a eventos.

## Visao Geral

O projeto e um monorepo com tres aplicacoes:

- `kratos-front`: frontend web (React + Vite)
- `kratos-api`: API HTTP em .NET (entrada e consultas)
- `kratos-worker`: processamento assincro em Go (consumo de eventos e persistencia)

Infraestrutura de suporte:

- RabbitMQ para mensageria
- MongoDB para persistencia
- Redis para cache e idempotencia

## Arquitetura

```mermaid
flowchart LR
    U["Usuario"] --> F["Kratos Frontend<br/>React + Vite + Nginx"]
    F -->|"POST /users"| A["Kratos API<br/>.NET 10 Minimal API"]
    F -->|"GET /users e GET /users/:cpf"| A

    A -->|"Publica evento"| Q[("RabbitMQ<br/>user_queue")]
    Q -->|"Consumo concorrente"| W["Kratos Worker<br/>Go 1.22"]

    W -->|"Upsert e invalidacao de cache"| M[("MongoDB<br/>kratos_db.users")]
    A -->|"Leitura"| M

    A -->|"Cache de consulta por CPF"| R[("Redis")]
    W -->|"Idempotencia por eventId"| R

    Q -->|"Dead letter"| QE[("user_queue_errors")]
```

## Stack Tecnologica

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind, Nginx |
| API | .NET 10, Minimal API, AutoMapper, MongoDB.Driver, RabbitMQ.Client, HealthChecks, Serilog |
| Worker | Go 1.22, amqp091-go, MongoDB Driver, redis/go-redis |
| Mensageria | RabbitMQ + DLX |
| Dados | MongoDB |
| Cache/Idempotencia | Redis |
| Orquestracao | Docker Compose |

## Estrutura do Repositorio

```text
.
|-- contracts/
|   `-- user-created-v1.json
|-- docker-compose.yml
|-- docker-compose.debug.yml
|-- kratos-api/
|   `-- src/Kratos.Api/
|-- kratos-front/
`-- kratos-worker/
```

## Execucao Rapida

### Requisitos

- Docker
- Docker Compose v2+

### Subir stack principal

```bash
docker compose up --build
```

Servicos:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:5007](http://localhost:5007)
- RabbitMQ Management: [http://localhost:15672](http://localhost:15672)
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

## Observabilidade e Debug

O repositorio inclui `docker-compose.debug.yml` com:

- Seq (`kratos-logs`): [http://localhost:5341](http://localhost:5341)
- HealthChecks UI (`kratos-monitor`): [http://localhost:5008](http://localhost:5008)

Execucao sugerida para ambiente de debug:

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up --build
```

Health endpoints da API:

- `GET /health/live`
- `GET /health/ready`

## API HTTP

### `POST /users`

Cria um usuario de forma assincrona (publica evento no RabbitMQ).

Exemplo:

```bash
curl -X POST http://localhost:5007/users \
  -H "Content-Type: application/json" \
  -d '{"cpf":"12345678901","name":"Kratos","email":"kratos@example.com"}'
```

Resposta esperada: `202 Accepted`.

### `GET /users`

Lista usuarios salvos no MongoDB. Suporta filtro por nome:

- `GET /users?name=joao`

### `GET /users/{cpf}`

Busca um usuario por CPF (com tentativa de leitura em cache Redis antes do banco).

## Evento Publicado

Fila: `user_queue`  
Versao de contrato no evento: `1.0`

Formato enviado pela API (implementacao atual):

```json
{
  "metadata": {
    "eventId": "uuid",
    "version": "1.0",
    "occurredAt": "2026-01-01T00:00:00.0000000Z",
    "correlationId": null
  },
  "payload": {
    "cpf": "12345678901",
    "first_name": "Kratos",
    "email": "kratos@example.com"
  }
}
```

Referencia de schema versionado no repositorio:

- `contracts/user-created-v1.json`

## Variaveis de Ambiente

### API

- `MONGO_URL` (default: `mongodb://root:example@localhost:27017`)
- `REDIS_URL` (default: `localhost:6379`)
- `RABBIT_URL` (default: `amqp://guest:guest@localhost:5672`)

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

## Licenca

Este projeto esta sob a licenca MIT. Veja [LICENSE](LICENSE).
