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

	logger.Info("⚔️ KRATOS: Carregando configurações de ambiente...")

	mongoURL := getEnv("MONGO_URL", "mongodb://root:example@localhost:27017")
	redisURL := getEnv("REDIS_URL", "localhost:6379")
	rabbitURL := getEnv("RABBIT_URL", "amqp://guest:guest@localhost:5672")

	redisProv := redis.NewIdempotencyProvider(redisURL)

	mongoRepo := mongodb.NewUserRepository(mongoURL, "kratos_db", "users", redisProv.GetClient())
	
	userUC := usecase.NewUserUseCase(mongoRepo, redisProv)
	
	consumer := rabbitmq.NewConsumer(rabbitURL, userUC)

	logger.Info("⚔️ KRATOS: Worker pronto para processar", "workers", 50)

	consumer.Start(ctx, 50)

	logger.Info("⚔️ KRATOS: Desligamento detectado. Finalizando workers...")
	
	time.Sleep(1 * time.Second)
	logger.Info("⚔️ KRATOS: Sistema desligado com sucesso.")
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}