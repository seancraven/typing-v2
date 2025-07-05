FROM rust:1.88-slim AS builder

WORKDIR /app
COPY ./Cargo.toml ./Cargo.lock ./
COPY ./src ./src
COPY ./migrations ./migrations
COPY ./.sqlx ./.sqlx
RUN  cargo build -r

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /app/target/release/typing2 /usr/local/bin
ENTRYPOINT ["/usr/local/bin/typing2"]
