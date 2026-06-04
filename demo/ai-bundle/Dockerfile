FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY worker/worker ./worker
ENV PYTHONUNBUFFERED=1

COPY ai-bundle/supervisord.conf /etc/supervisor/conf.d/ait.conf
COPY ai-bundle/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
