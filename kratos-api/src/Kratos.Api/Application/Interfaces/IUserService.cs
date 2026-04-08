using Kratos.Api.Domain.Entities;

namespace Kratos.Api.Application.Interfaces;

public interface IUserService
{
    Task<bool> EnqueueUserAsync(User user);
    Task<IEnumerable<User>> GetAllAsync(string? name);
}