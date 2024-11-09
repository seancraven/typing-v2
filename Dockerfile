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
COPY . .
COPY .sqlx .sqlx
RUN cargo build --release
RUN mv ./target/release/typing2 ./app

FROM debian:stable-slim AS runtime
WORKDIR /app
COPY --from=builder /app/app /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/app"]
