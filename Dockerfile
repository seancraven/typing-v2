FROM lukemathwalker/cargo-chef:latest AS builder
WORKDIR /app
ENV SQLX_OFFLINE=true
COPY ./Cargo.toml ./
COPY ./src ./src
COPY ./migrations ./migrations
COPY ./.sqlx ./.sqlx
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/home/root/app/target \
    cargo build -r
FROM debian:stable-slim AS runtime
WORKDIR /app
COPY --from=builder /app/target/release/typing2 /usr/local/bin/typing2

ENTRYPOINT ["/usr/local/bin/typing2"]
