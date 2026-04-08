using System.Text.Json.Serialization;

namespace Kratos.Api.Domain.DTOs;

public record UserCreatedV1(
    [property: JsonPropertyName("metadata")] MetadataV1 Metadata,
    [property: JsonPropertyName("payload")] PayloadV1 Payload
);

public record MetadataV1(
    string EventId, 
    string Version, 
    string OccurredAt, 
    string? CorrelationId = null);

public record PayloadV1(
    [property: JsonPropertyName("cpf")] string Cpf,
    [property: JsonPropertyName("first_name")] string Name,
    [property: JsonPropertyName("email")] string Email
);