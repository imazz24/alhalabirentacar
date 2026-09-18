# Al Halabi Rent — FastAPI + SQLite backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so code changes do not invalidate the pip layer.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# The database, the company settings file and uploaded photos all live under
# /data so a single volume keeps every piece of state across rebuilds.
ENV DATABASE_URL=sqlite:////data/car_rental.db \
    UPLOAD_DIR=/app/app/static/uploads
RUN mkdir -p /data /app/app/static/uploads

EXPOSE 8000

# Seeding is idempotent: it only inserts when the tables are empty.
CMD ["sh", "-c", "python -m app.services.seed && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
