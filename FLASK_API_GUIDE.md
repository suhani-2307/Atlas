# Flask API Template - Quick Start Guide

## Installation

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up API keys (for hospital payment plan features):

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys:
# - Get SerpApi key at https://serpapi.com/ (100 free searches/month)
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

### Items API (Demo CRUD)

- **GET** `/api/items` - Get all items
- **GET** `/api/items/<id>` - Get a specific item
- **POST** `/api/items` - Create a new item
- **PUT** `/api/items/<id>` - Update an item
- **DELETE** `/api/items/<id>` - Delete an item

### Hospital Payment Plans API

- **POST** `/api/hospital/payment-plans` - Search for hospital payment plan documents

### Insurance Extraction API

- **POST** `/api/insurance/extract` - Extract structured data from a base64-encoded insurance ID image

## Example Requests

### Items API Examples

#### Get all items

```bash
curl http://localhost:5000/api/items
```

#### Create an item

```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "My Item", "description": "Item description"}'
```

#### Update an item

```bash
curl -X PUT http://localhost:5000/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

#### Delete an item

```bash
curl -X DELETE http://localhost:5000/api/items/1
```

### Insurance Extraction API Examples

#### Extract insurance info from base64 image

```bash
curl -X POST http://localhost:5000/api/insurance/extract \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  }'
```

**Response:**

```json
{
    "member_name": "JOHN DOE",
    "member_id": "XYZ123456789",
    "group_number": "987654",
    "insurer_name": "Blue Cross Blue Shield",
    "plan_name": "PPO Silver",
    "deductible": "$1,000 IND / $2,000 FAM",
    "oopm": "$4,000 IND / $8,000 FAM",
    "rx_bin": "610014",
    "rx_pcn": "BCBS",
    "rx_group": "RX1234",
    "...": "..."
}
```

### Hospital Payment Plans API Examples

#### Search for hospital payment plan documents

```bash
curl -X POST http://localhost:5000/api/hospital/payment-plans \
  -H "Content-Type: application/json" \
  -d '{
    "hospital_name": "Cleveland Clinic",
    "limit": 10
  }'
```

**Response:**

```json
{
    "success": true,
    "hospital_name": "Cleveland Clinic",
    "results_found": 10,
    "results": [
        {
            "hospital_name": "Cleveland Clinic",
            "title": "Financial Assistance Application",
            "url": "https://my.clevelandclinic.org/...",
            "description": "Apply for financial assistance...",
            "document_type": "pdf"
        }
    ]
}
```

#### Using API key in request (alternative to .env)

```bash
curl -X POST http://localhost:5000/api/hospital/payment-plans \
  -H "Content-Type: application/json" \
  -d '{
    "hospital_name": "Johns Hopkins",
    "limit": 10,
    "serp_api_key": "your_serpapi_key_here"
  }'
```

## Features Included

### Core Features

- ✅ Full CRUD operations (Items API)
- ✅ JSON request/response handling
- ✅ Error handling with proper HTTP status codes
- ✅ Input validation
- ✅ Decorators for common patterns
- ✅ Health check endpoint
- ✅ In-memory storage (for demo - replace with a database)
- ✅ Well-organized and commented code

### Hospital Payment Plan Finder

- ✅ **Automated document discovery** - Uses SerpApi to search Google for payment plan PDFs and webpages
- ✅ **Smart search queries** - Targets payment plans, financial assistance, charity care documents
- ✅ **Structured output** - Returns hospital name, URL, document type, description
- ✅ **API key management** - Supports environment variables or request-level API keys
- ✅ **US hospital focus** - Configured for US-based hospital searches
- ✅ **Free tier compatible** - Works with free SerpApi (100 searches/month)

## Architecture

### Hospital Payment Plan Workflow

```
1. User Request → Flask API
   ↓
2. SerpApi Search → Google results for hospital + "payment plan" / "financial assistance"
   ↓
3. Return Structured JSON → Hospital name, URLs, document types, descriptions
```

### Files Structure

- **`app.py`** - Flask API with endpoints for items, hospital payment plans, and insurance extraction
- **`vision_ocr_api.py`** - Module for insurance extraction using Groq's vision LLM
- **`payment_plan.py`** - Core module with `HospitalPaymentPlanFinder` class
- **`requirements.txt`** - Python dependencies
- **`.env`** - API keys (create from `.env.example`)
- **`FLASK_API_GUIDE.md`** - This guide

## API Key Setup

### SerpApi (Required for Payment Plans)

1. Visit https://serpapi.com/
2. Sign up for free account (100 searches/month)
3. Copy your API key
4. Add to `.env`: `SERP_API_KEY=your_key_here`

### Groq (Required for Insurance Extraction)

1. Visit https://console.groq.com/
2. Sign up and create an API key
3. Add to `.env`: `GROQ_API_KEY=your_key_here`

## Testing the Hospital Payment Plan API

### Test with Python script

```python
import requests

response = requests.post(
    'http://localhost:5000/api/hospital/payment-plans',
    json={
        'hospital_name': 'Stanford Health Care',
        'limit': 10
    }
)

data = response.json()
print(f"Found {data['results_found']} results")

for result in data['results']:
    print(f"\nTitle: {result['title']}")
    print(f"URL: {result['url']}")
    print(f"Type: {result['document_type']}")
    print(f"Description: {result['description']}")
```

### Test standalone module

```bash
# Run the payment_plan.py module directly
python payment_plan.py "Massachusetts General Hospital"
```

## Next Steps

### General Improvements

- Replace in-memory storage with a database (SQLAlchemy + SQLite/PostgreSQL)
- Add authentication/authorization (JWT tokens, OAuth)
- Add logging (Python logging module or cloud logging)
- Add input validation with Marshmallow or Pydantic
- Add tests with pytest
- Deploy to production with Gunicorn + Nginx

### Hospital Payment Plan Enhancements

- **Database storage** - Cache search results to reduce API calls
- **Batch processing** - Queue multiple hospitals for processing
- **Document extraction** - Add PDF and webpage content extraction for detailed analysis
- **Advanced analysis** - Use NLP/LLMs to extract specific payment terms, eligibility criteria
- **Dashboard** - Create front-end to browse and compare hospital payment plans
- **Notifications** - Alert when new payment plan documents are published
- **Export options** - Generate CSV/Excel reports of payment plan comparisons
- **State/region filtering** - Search hospitals by geographic area
- **Document versioning** - Track changes to payment policies over time

## Troubleshooting

### "SerpApi API key is required"

- Ensure `.env` file exists with `SERP_API_KEY=your_key`
- Or pass `serp_api_key` in the request JSON

### "Rate limit reached"

- SerpApi free tier: 100 searches/month (4 queries per hospital × 25 hospitals max)
- Wait until next month or upgrade plan

### Import errors

- Run `pip install -r requirements.txt`
- Ensure you're in the correct virtual environment

## Production Deployment

### Using Gunicorn

```bash
# Install gunicorn
pip install gunicorn

# Run with 4 worker processes
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Environment Variables for Production

```bash
# Set debug to False
export FLASK_ENV=production

# Set API keys
export SERP_API_KEY=your_production_key

# Optional: Set rate limiting
export MAX_REQUESTS_PER_MINUTE=60
```

## License & Credits

This Flask API template includes:

- **SerpApi** integration for Google search results

Built for finding hospital payment plan documents to improve healthcare price transparency.
