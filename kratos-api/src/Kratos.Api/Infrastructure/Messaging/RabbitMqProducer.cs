using System.Text;
using System.Text.Json;
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

    public async Task PublishAsync(User user)
    {
        await _policy.ExecuteAsync(async () =>
        {
            using var channel = await _connection.CreateChannelAsync();

            var arguments = new Dictionary<string, object?>
            {
                { "x-dead-letter-exchange", "user_dlx" },
                { "x-dead-letter-routing-key", "error_key" }
            };

            await channel.QueueDeclareAsync(_queueName, durable: true, exclusive: false, autoDelete: false, arguments: arguments);

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(user));
            
            var properties = new BasicProperties
            {
                MessageId = Guid.NewGuid().ToString(),
                Persistent = true
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