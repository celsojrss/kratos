using Kratos.Api.Domain.Entities;
using MongoDB.Driver;

namespace Kratos.Api.Infrastructure.Persistence;

public class MongoRepository
{
    private readonly IMongoCollection<User> _users;

    public MongoRepository(IMongoClient client)
    {
        var database = client.GetDatabase("kratos_db");
        _users = database.GetCollection<User>("users");
    }

    public async Task<List<User>> GetAllAsync(string? name)
    {
        if (string.IsNullOrEmpty(name))
            return await _users.Find(_ => true).ToListAsync();

        return await _users.Find(u => u.Name.Contains(name)).ToListAsync();
    }

    public async Task<User?> GetByCpfAsync(string cpf)
    {
        return await _users.Find(u => u.CPF == cpf).FirstOrDefaultAsync();
    }
}