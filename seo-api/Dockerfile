FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .
COPY analyzer.py .
COPY ai_optimizer.py .

# Content directory will be mounted at runtime
# /content/blog -> Hugo blog content

# Expose port
EXPOSE 8001

# Run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
