package domain

import "context"

type UserRepository interface {
	Save(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
}

type IdempotencyProvider interface {
	CheckAndSet(ctx context.Context, key string) (bool, error)
}