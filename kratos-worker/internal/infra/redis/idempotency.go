package redis

import (
	"context"
	"time"
	"github.com/redis/go-redis/v9"
)

type RedisIdempotency struct {
	client *redis.Client
}

func NewIdempotencyProvider(addr string) *RedisIdempotency {
	rdb := redis.NewClient(&redis.Options{
		Addr: addr,
	})
	return &RedisIdempotency{client: rdb}
}

func (r *RedisIdempotency) CheckAndSet(ctx context.Context, key string) (bool, error) {

	success, err := r.client.SetNX(ctx, "kratos:msg:"+key, "processed", 24*time.Hour).Result()
	if err != nil {
		return false, err
	}
	return success, nil
}