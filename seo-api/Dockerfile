FROM python:3.12-slim

WORKDIR /app

# Install Hugo for site rebuilding
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    && wget -O hugo.deb https://github.com/gohugoio/hugo/releases/download/v0.139.0/hugo_extended_0.139.0_linux-amd64.deb \
    && dpkg -i hugo.deb \
    && rm hugo.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .
COPY analyzer.py .
COPY ai_optimizer.py .

# Directories mounted at runtime:
# /content/blog -> Hugo blog content (read/write)
# /hugo-site -> Full Hugo site directory (read-only for config/themes)
# /output -> Hugo build output directory (write)

# Expose port
EXPOSE 8001

# Run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
