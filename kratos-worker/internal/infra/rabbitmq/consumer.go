package rabbitmq

import (
	"context"
	"encoding/json"
	"kratos/internal/domain"
	"kratos/internal/usecase"
	"sync"
	amqp "github.com/rabbitmq/amqp091-go"
)

type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	uc      *usecase.UserUseCase
}

func NewConsumer(url string, uc *usecase.UserUseCase) *Consumer {
	conn, _ := amqp.Dial(url)
	ch, _ := conn.Channel()

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
	msgs, _ := c.channel.Consume("user_queue", "", false, false, false, false, nil)
	var wg sync.WaitGroup

	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case d, ok := <-msgs:
					if !ok { return }
					var user domain.User
					if err := json.Unmarshal(d.Body, &user); err != nil {
						d.Nack(false, false)
						continue
					}
					if err := c.uc.Execute(ctx, user, d.MessageId); err != nil {
						d.Nack(false, true)
					} else {
						d.Ack(false)
					}
				}
			}
		}()
	}
	wg.Wait()
}