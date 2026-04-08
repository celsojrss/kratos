using Kratos.Api.Domain.Entities;
using Kratos.Api.Domain.DTOs;
using Kratos.Api.Infrastructure.Persistence;
using Kratos.Api.Infrastructure.Mapping;
using MongoDB.Driver;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using AutoMapper;
using StackExchange.Redis;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using HealthChecks.UI.Client;
using RabbitMQ.Client;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("KratosPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var mongoUrl = Environment.GetEnvironmentVariable("MONGO_URL") ?? "mongodb://root:example@localhost:27017";
var redisUrl = Environment.GetEnvironmentVariable("REDIS_URL") ?? "localhost:6379";
var rabbitUrl = Environment.GetEnvironmentVariable("RABBIT_URL") ?? "amqp://guest:guest@localhost:5672";

builder.Services.AddSingleton<IConnection>(sp =>
{
    var factory = new ConnectionFactory { Uri = new Uri(rabbitUrl) };
    return factory.CreateConnectionAsync().GetAwaiter().GetResult();
});

builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());
builder.Services.AddSingleton<IMongoClient>(new MongoClient(mongoUrl));
builder.Services.AddSingleton<RabbitMqProducer>();
builder.Services.AddScoped<MongoRepository>();

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.ConfigurationOptions = new ConfigurationOptions
    {
        EndPoints = { redisUrl },
        ConnectTimeout = 1000,
        SyncTimeout = 1000,
        AbortOnConnectFail = false
    };
    options.InstanceName = "Kratos:";
});

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    
    .AddMongoDb(name: "mongodb", tags: ["ready", "db"])
    .AddRedis($"{redisUrl},abortConnect=false", name: "redis", tags: ["ready", "cache"])
    .AddRabbitMQ(name: "rabbitmq", tags: ["ready", "messaging"]);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(new RenderedCompactJsonFormatter())
    .WriteTo.Seq("http://localhost:12345")
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "kratos-api")
    .CreateLogger();

builder.Host.UseSerilog();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.UseCors("KratosPolicy");

app.MapPost("/users", async (UserCreateRequest request, RabbitMqProducer producer, IMapper mapper) =>
{
    if (string.IsNullOrEmpty(request.CPF)) 
        return Results.BadRequest(new { error = "CPF é obrigatório" });
    
    try 
    {
        var user = mapper.Map<User>(request);
        await producer.PublishAsync(user);
        return Results.Accepted($"/users/{user.CPF}", new { status = "Mensagem enviada", cpf = user.CPF });
    }
    catch (Exception)
    {
        return Results.Problem("Erro ao processar solicitação", statusCode: 500);
    }
});

app.MapGet("/users", async (string? name, MongoRepository repo, IMapper mapper, ILogger<Program> logger) =>
{
    try 
    {
        var users = await repo.GetAllAsync(name);
        return Results.Ok(mapper.Map<IEnumerable<UserResponse>>(users));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Falha ao listar usuários");
        return Results.Problem("Erro interno no banco de dados", statusCode: 500);
    }
});

app.MapGet("/users/{cpf}", async (string cpf, MongoRepository repo, IDistributedCache cache, IMapper mapper, ILogger<Program> logger) =>
{
    string cacheKey = $"user:{cpf}";
    string? cachedData = null;

    try 
    {
        cachedData = await cache.GetStringAsync(cacheKey);
    }
    catch (Exception ex)
    {
        logger.LogWarning("Redis Offline: {Msg}", ex.Message);
    }

    if (!string.IsNullOrEmpty(cachedData))
    {
        return Results.Ok(JsonSerializer.Deserialize<UserResponse>(cachedData));
    }

    try 
    {
        var user = await repo.GetByCpfAsync(cpf);
        if (user == null) return Results.NotFound(new { error = "Usuário não encontrado" });

        var response = mapper.Map<UserResponse>(user);

        try 
        {
            await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(response), 
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) });
        }
        catch { /* Falha silenciosa no cache para não quebrar a resposta */ }

        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro no MongoDB ao buscar CPF: {CPF}", cpf);
        return Results.Problem("Serviço de dados indisponível", statusCode: 503);
    }
});

app.Run();