package domain

type User struct {
    CPF       string `json:"cpf" bson:"_id"` 
    FirstName string `json:"first_name" bson:"first_name"`
    Email     string `json:"email" bson:"email"`
    CreatedAt int64  `json:"created_at" bson:"created_at"`
    UpdatedAt int64  `json:"updated_at" bson:"updated_at"`
}