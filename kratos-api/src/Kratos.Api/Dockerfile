FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY Kratos.Api.csproj ./
RUN dotnet restore

COPY . ./

RUN dotnet publish Kratos.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 5007
ENV ASPNETCORE_URLS=http://+:5007

ENTRYPOINT ["dotnet", "Kratos.Api.dll"]