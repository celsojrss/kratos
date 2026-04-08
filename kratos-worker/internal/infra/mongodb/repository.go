package mongodb

import (
	"context"
	"time"
	"kratos/internal/domain"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoRepo struct {
	collection *mongo.Collection
	redis      *redis.Client
}

func NewUserRepository(uri, dbName, collName string, rdb *redis.Client) *MongoRepo {
	client, _ := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	coll := client.Database(dbName).Collection(collName)
	return &MongoRepo{
		collection: coll,
		redis:      rdb,
	}
}

func (r *MongoRepo) Save(ctx context.Context, user *domain.User) error {
	filter := map[string]interface{}{"_id": user.CPF}
	now := time.Now().Unix()

	update := map[string]interface{}{
		"$set": map[string]interface{}{
			"first_name": user.FirstName,
			"email":      user.Email,
			"updated_at": now,
		},
		"$setOnInsert": map[string]interface{}{
			"created_at": now,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, filter, update, opts)

	if err == nil {
		r.redis.Del(ctx, "user:"+user.CPF)
	}

	return err
}