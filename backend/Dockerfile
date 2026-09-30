FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["AsistenciaLenguas.Api.csproj", "./"]
RUN dotnet restore "AsistenciaLenguas.Api.csproj"
COPY . .
RUN dotnet publish "AsistenciaLenguas.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Expose standard ASP.NET Core port
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "AsistenciaLenguas.Api.dll"]
