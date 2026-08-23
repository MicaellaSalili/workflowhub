# -----------------------------------------------------------------------------
# Multi-Stage Production Dockerfile for WorkflowHub ASP.NET Core API (.NET 8 LTS)
# -----------------------------------------------------------------------------

# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy project file and restore layers
COPY WorkflowHub.Api.csproj ./
RUN dotnet restore WorkflowHub.Api.csproj

# Copy full source and publish Release binary
COPY . ./
RUN dotnet publish WorkflowHub.Api.csproj -c Release -o /app/publish --no-restore

# Stage 2: Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Install native dependencies & create non-root user
RUN apk add --no-cache icu-libs curl && \
    mkdir -p /app/LocalFiles && \
    chown -R 1000:1000 /app

USER 1000

# Copy compiled binaries from build stage
COPY --from=build --chown=1000:1000 /app/publish .

# Expose API port
EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dotnet", "WorkflowHub.Api.dll"]
