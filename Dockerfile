# Choose whatever you want, version >= 1.16
FROM golang:1.22-alpine

WORKDIR /app

RUN apk update && apk add npm && rm -rf /var/cache/apk/*
RUN npm install -g typescript
RUN go install github.com/air-verse/air@latest && go install github.com/a-h/templ/cmd/templ@latest

COPY go.mod go.sum ./
RUN go mod download

CMD ["air", "-c", ".air.toml"]
