using MongoDB.Bson.Serialization.Attributes;

namespace Kratos.Api.Domain.Entities;

[BsonIgnoreExtraElements]
public class User
{
    [BsonId]
    public string CPF { get; set; } = string.Empty;

    [BsonElement("first_name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("created_at")]
    public long CreatedAt { get; set; }

    [BsonElement("updated_at")]
    public long UpdatedAt { get; set; }
}