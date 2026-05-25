FROM golang:1.20-alpine AS builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o expense-svc main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/expense-svc .

EXPOSE 8081
CMD ["./expense-svc"]
