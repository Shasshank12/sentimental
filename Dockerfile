# Start from slim Python base image
FROM python:3.10-slim

# Install system dependencies for spacy, pandas, lxml, etc.
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    gcc \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (for tokenizers and maturin)
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy requirements first (for Docker cache)
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy model (ensures it's present in container)
RUN python -m spacy download en_core_web_sm

# Copy project files
COPY . .

# Expose port 10000 (used by Render)
EXPOSE 10000

# Start FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
