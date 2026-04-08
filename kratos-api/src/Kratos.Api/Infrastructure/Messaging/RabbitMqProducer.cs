using System.Text;
using System.Text.Json;
using Kratos.Api.Domain.Entities;
using Polly;
using RabbitMQ.Client;

namespace Kratos.Api.Infrastructure.Messaging;

public class RabbitMqProducer
{
    private readonly ConnectionFactory _factory;
    private readonly IAsyncPolicy _policy;
    private readonly string _queueName = "user_queue";

    public RabbitMqProducer()
    {
        var host = Environment.GetEnvironmentVariable("RABBIT_URL") ?? "localhost";
        _factory = new ConnectionFactory { HostName = host };

        _policy = Policy.Handle<Exception>()
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }

    public async Task PublishAsync(User user)
    {
        await _policy.ExecuteAsync(async () =>
        {
            using var connection = await _factory.CreateConnectionAsync();
            using var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(_queueName, durable: true, exclusive: false, autoDelete: false);

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(user));
            var properties = new BasicProperties
            {
                MessageId = Guid.NewGuid().ToString(),
                Persistent = true
            };

            await channel.BasicPublishAsync(string.Empty, _queueName, mandatory: true, basicProperties: properties, body: body);
        });
    }
}