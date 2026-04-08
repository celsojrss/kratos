package usecase

import (
	"context"
	"kratos/internal/domain"
	"kratos/pkg/logger"
)

type UserUseCase struct {
	repo        domain.UserRepository
	idempotency domain.IdempotencyProvider
}

func NewUserUseCase(r domain.UserRepository, i domain.IdempotencyProvider) *UserUseCase {
	return &UserUseCase{repo: r, idempotency: i}
}

func (u *UserUseCase) Execute(ctx context.Context, user domain.User, msgID string) error {

	isNew, err := u.idempotency.CheckAndSet(ctx, msgID)
	if err != nil {
		return err
	}

	if !isNew {
    	logger.Warn("[Idempotency] Mensagem duplicada ignorada", 
        "eventId", msgID, 
        "cpf", user.CPF)
    return nil
}

	return u.repo.Save(ctx, &user)
}