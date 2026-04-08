package main

import (
	"context"
	"kratos/internal/infra/mongodb"
	"kratos/internal/infra/rabbitmq"
	"kratos/internal/infra/redis"
	"kratos/internal/usecase"
	"kratos/pkg/logger"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	logger.Init()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	mongoURL  := getEnv("MONGO_URL", "mongodb://root:example@localhost:27017")
	redisURL  := getEnv("REDIS_URL", "localhost:6379")
	rabbitURL := getEnv("RABBIT_URL", "amqp://guest:guest@localhost:5672")

	redisProv := redis.NewIdempotencyProvider(redisURL)
	mongoRepo := mongodb.NewUserRepository(mongoURL, "kratos_db", "users", redisProv.GetClient())
	
	userUC := usecase.NewUserUseCase(mongoRepo, redisProv)
	consumer := rabbitmq.NewConsumer(rabbitURL, userUC)

	go func() {
		logger.Info("⚔️ KRATOS: Iniciando processamento de alta performance", "workers", 50)
		consumer.Start(ctx, 50)
	}()

	<-ctx.Done()
	
	logger.Info("⚔️ KRATOS: Desligando... finalizando workers pendentes.")
	time.Sleep(2 * time.Second)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}