# Use Deno base image
FROM denoland/deno:2.0

# Create app directory
WORKDIR /app

# Cache the dependencies as a layer
COPY deno.json* deno.lock* ./
RUN deno cache --lock=deno.lock main.ts

# Copy app source
COPY . .

# Compile the app
RUN deno cache main.ts

# Set environment variables
ENV PORT=8000

# Run the app
EXPOSE 8000
CMD ["run", "--allow-net", "main.ts"]
