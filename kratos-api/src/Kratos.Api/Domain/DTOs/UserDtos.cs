namespace Kratos.Api.Domain.DTOs;

public record UserCreateRequest(
    string CPF,
    string Name,
    string Email
);

public record UserResponse
{
    public string CPF { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string CreatedAt { get; init; } = string.Empty;
}