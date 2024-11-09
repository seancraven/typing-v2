FROM lukemathwalker/cargo-chef:latest AS chef
WORKDIR /app

FROM chef AS planner
COPY ./Cargo.toml ./Cargo.lock ./
COPY ./src ./src
RUN cargo chef prepare

FROM chef AS builder
ENV SQLX_OFFLINE true
COPY --from=planner /app/recipe.json .
RUN cargo chef cook --release
COPY src src
COPY migrations migrations
COPY .sqlx .sqlx
RUN cargo build -r

FROM debian:stable-slim AS runtime
WORKDIR /app
COPY --from=builder /app/target/release/typing2 /usr/local/bin/typing2
ENTRYPOINT ["/usr/local/bin/typing2"]
