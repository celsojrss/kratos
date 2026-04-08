package rabbitmq

import (
	"context"
	"encoding/json"
	"kratos/internal/domain"
	"kratos/internal/usecase"
	"kratos/pkg/logger"
	"os"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	uc      *usecase.UserUseCase
}

func NewConsumer(url string, uc *usecase.UserUseCase) *Consumer {
	conn, err := amqp.Dial(url)
	if err != nil {
		logger.Error("❌ Erro fatal: Não foi possível conectar ao RabbitMQ", err)
		os.Exit(1)
	}

	ch, err := conn.Channel()
	if err != nil {
		logger.Error("❌ Erro fatal: Não foi possível abrir o canal no RabbitMQ", err)
		os.Exit(1)
	}

	ch.ExchangeDeclare("user_dlx", "direct", true, false, false, false, nil)
	ch.QueueDeclare("user_queue_errors", true, false, false, false, nil)
	ch.QueueBind("user_queue_errors", "error_key", "user_dlx", false, nil)

	args := amqp.Table{
		"x-dead-letter-exchange":    "user_dlx",
		"x-dead-letter-routing-key": "error_key",
	}
	ch.QueueDeclare("user_queue", true, false, false, false, args)

	return &Consumer{conn: conn, channel: ch, uc: uc}
}

func (c *Consumer) Start(ctx context.Context, workerCount int) {
	msgs, err := c.channel.Consume(
		"user_queue", 
		"",    // consumer tag
		false, // auto-ack (false para termos controle manual)
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)

	if err != nil {
		logger.Error("❌ Erro ao registrar consumidor na fila", err)
		return
	}

	var wg sync.WaitGroup

	for i := 1; i <= workerCount; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			
			for {
				select {
				case <-ctx.Done():
					logger.Info("🛑 Worker recebendo sinal de desligamento", "workerID", workerID)
					return
				case d, ok := <-msgs:
					if !ok {
						logger.Warn("⚠️ Canal de mensagens fechado para o Worker", "workerID", workerID)
						return
					}

					var envelope struct {
						Metadata struct {
							EventID       string `json:"eventId"`
							Version       string `json:"version"`
							CorrelationID string `json:"correlationId"`
						} `json:"metadata"`
					}

					if err := json.Unmarshal(d.Body, &envelope); err != nil {
						logger.Error("⚠️ Payload inválido. Enviando para DLX.", err)
						d.Nack(false, false)
						continue
					}

					switch envelope.Metadata.Version {
					case "1.0":
						var event domain.UserCreatedEventV1
						if err := json.Unmarshal(d.Body, &event); err != nil {
							logger.Error("⚠️ Falha ao decodificar contrato v1.0", err)
							d.Nack(false, false)
							continue
						}

						user := domain.User{
							CPF:       event.Payload.Cpf,
							FirstName: event.Payload.FirstName,
							Email:     event.Payload.Email,
							CreatedAt: time.Now().Unix(),
							UpdatedAt: time.Now().Unix(),
						}

						if err := c.uc.Execute(ctx, user, envelope.Metadata.EventID); err != nil {
							logger.Error("❌ Erro ao processar UseCase", err, "eventId", envelope.Metadata.EventID)
							d.Nack(false, true)
						} else {
							logger.Info("✅ Evento processado com sucesso", 
								"eventId", envelope.Metadata.EventID, 
								"cpf", user.CPF)
							d.Ack(false)
						}

					default:
						logger.Warn("❓ Versão de contrato desconhecida", "version", envelope.Metadata.Version)
						d.Nack(false, false)
					}
				}
			}
		}(i)
	}

	<-ctx.Done()
	logger.Info("⏳ Aguardando workers finalizarem processamento atual...")
	wg.Wait()
}