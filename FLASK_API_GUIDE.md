# Flask API Template - Quick Start Guide

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the API

Start the development server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/health` - Check API status

### Items API
- **GET** `/api/items` - Get all items
- **GET** `/api/items/<id>` - Get a specific item
- **POST** `/api/items` - Create a new item
- **PUT** `/api/items/<id>` - Update an item
- **DELETE** `/api/items/<id>` - Delete an item

## Example Requests

### Get all items
```bash
curl http://localhost:5000/api/items
```

### Create an item
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "My Item", "description": "Item description"}'
```

### Update an item
```bash
curl -X PUT http://localhost:5000/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

### Delete an item
```bash
curl -X DELETE http://localhost:5000/api/items/1
```

## Features Included

- ✅ Full CRUD operations
- ✅ JSON request/response handling
- ✅ Error handling with proper HTTP status codes
- ✅ Input validation
- ✅ Decorators for common patterns
- ✅ Health check endpoint
- ✅ In-memory storage (for demo - replace with a database)
- ✅ Well-organized and commented code

## Next Steps

- Replace in-memory storage with a database (SQLAlchemy + SQLite/PostgreSQL)
- Add authentication/authorization
- Add logging
- Add input validation with Marshmallow or Pydantic
- Add tests with pytest
- Deploy to production with Gunicorn + Nginx
