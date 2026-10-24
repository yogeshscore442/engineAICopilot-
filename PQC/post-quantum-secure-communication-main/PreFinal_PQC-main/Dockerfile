# ─────────────────────────────────────────────
# Stage 1: Build liboqs from source
# ─────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Install build tools
RUN apt-get update && apt-get install -y \
    cmake \
    gcc \
    g++ \
    git \
    make \
    libssl-dev \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Clone and build liboqs
RUN git clone --depth 1 --branch main https://github.com/open-quantum-safe/liboqs.git /tmp/liboqs && \
    cmake -S /tmp/liboqs -B /tmp/liboqs/build \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SHARED_LIBS=ON \
        -DOQS_BUILD_ONLY_LIB=ON \
        -GNinja && \
    cmake --build /tmp/liboqs/build --parallel && \
    cmake --install /tmp/liboqs/build --prefix /usr/local

# ─────────────────────────────────────────────
# Stage 2: Final Runtime Image
# ─────────────────────────────────────────────
FROM python:3.11-slim

# Copy built liboqs shared library from builder
COPY --from=builder /usr/local/lib /usr/local/lib
COPY --from=builder /usr/local/include /usr/local/include

# Refresh shared library cache
RUN ldconfig

# Set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Create instance directories for SQLite DB and uploads
RUN mkdir -p instance/uploads instance/temp_downloads

# Environment variables (can be overridden by Render dashboard)
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# Expose port
EXPOSE 10000

# Start the Flask + SocketIO server
CMD ["python", "run.py"]
