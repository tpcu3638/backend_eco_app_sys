FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
RUN chmod +x start.sh
CMD ["./start.sh"]
