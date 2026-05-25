FROM golang:1.20-alpine AS builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o user-group-svc main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/user-group-svc .

EXPOSE 8082
CMD ["./user-group-svc"]
