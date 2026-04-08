using System.Text;
using System.Text.Json;
using Kratos.Api.Domain.DTOs;
using Kratos.Api.Domain.Entities;
using Polly;
using RabbitMQ.Client;

public class RabbitMqProducer
{
    private readonly IConnection _connection;
    private readonly IAsyncPolicy _policy;
    private readonly string _queueName = "user_queue";

    public RabbitMqProducer(IConnection connection)
    {
        _connection = connection;

        _policy = Policy.Handle<Exception>()
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }

    public async Task PublishAsync(User user, string? correlationId = null)
    {
        await _policy.ExecuteAsync(async () =>
        {
            using var channel = await _connection.CreateChannelAsync();

            var eventMessage = new UserCreatedV1(
                Metadata: new MetadataV1(
                    EventId: Guid.NewGuid().ToString(),
                    Version: "1.0",
                    OccurredAt: DateTime.UtcNow.ToString("O"),
                    CorrelationId: correlationId
                ),
                Payload: new PayloadV1(
                    Cpf: user.CPF,
                    Name: user.Name,
                    Email: user.Email
                )
            );

            var arguments = new Dictionary<string, object?>
            {
                { "x-dead-letter-exchange", "user_dlx" },
                { "x-dead-letter-routing-key", "error_key" }
            };

            await channel.QueueDeclareAsync(_queueName, durable: true, exclusive: false, autoDelete: false, arguments: arguments);

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(eventMessage));
            
            var properties = new BasicProperties
            {
                MessageId = Guid.NewGuid().ToString(),
                Persistent = true,
                CorrelationId = correlationId
            };

            await channel.BasicPublishAsync(
                exchange: string.Empty, 
                routingKey: _queueName, 
                mandatory: true, 
                basicProperties: properties, 
                body: body);
        });
    }
}