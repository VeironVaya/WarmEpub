# Stage 1: Build the Rust application
FROM rust:latest AS builder

WORKDIR /app

# Copy Cargo and source files
COPY Cargo.toml ./
COPY migrations ./migrations
COPY src ./src

# Compile binary in release mode
RUN cargo build --release

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary from builder
COPY --from=builder /app/target/release/epub_backend /app/epub_backend
COPY --from=builder /app/migrations /app/migrations

# Create storage directory
RUN mkdir -p /app/storage

EXPOSE 8080

CMD ["/app/epub_backend"]
