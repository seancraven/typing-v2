FROM lukemathwalker/cargo-chef:latest AS chef

WORKDIR /app

FROM chef AS planner
COPY ./Cargo.toml Cargo.lock ./
COPY ./src ./src
COPY ./migrations ./migrations
COPY ./.sqlx ./.sqlx
RUN cargo chef prepare --recipe-path recipe.json --bin typing2

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json --bin typing2

WORKDIR /app
COPY ./Cargo.toml ./Cargo.lock ./
RUN cargo fetch
COPY ./src ./src
COPY ./migrations ./migrations
COPY ./.sqlx ./.sqlx
RUN  cargo build -r --bin typing2

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /app/target/release/typing2 /usr/local/bin
ENTRYPOINT ["/usr/local/bin/typing2"]
