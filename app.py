"""
Simple Flask API Template
A basic Flask API with common patterns for building RESTful APIs.
"""

from flask import Flask, request, jsonify
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# In-memory storage for demo purposes
items = {}


# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


# ==================== Decorators ====================

def require_json(f):
    """Decorator to require JSON content type"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        return f(*args, **kwargs)
    return decorated_function


# ==================== Health Check ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


# ==================== Items API ====================

@app.route('/api/items', methods=['GET'])
def get_items():
    """Get all items"""
    return jsonify({
        'success': True,
        'data': list(items.values()),
        'count': len(items)
    }), 200


@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    """Get a specific item by ID"""
    if item_id not in items:
        return jsonify({'error': f'Item {item_id} not found'}), 404
    
    return jsonify({
        'success': True,
        'data': items[item_id]
    }), 200


@app.route('/api/items', methods=['POST'])
@require_json
def create_item():
    """Create a new item"""
    data = request.get_json()
    
    # Validation
    if not data or 'name' not in data:
        return jsonify({'error': 'Missing required field: name'}), 400
    
    # Generate ID
    item_id = max(items.keys()) + 1 if items else 1
    
    # Create item
    item = {
        'id': item_id,
        'name': data.get('name'),
        'description': data.get('description', ''),
        'created_at': datetime.utcnow().isoformat()
    }
    
    items[item_id] = item
    
    return jsonify({
        'success': True,
        'data': item,
        'message': 'Item created successfully'
    }), 201


@app.route('/api/items/<int:item_id>', methods=['PUT'])
@require_json
def update_item(item_id):
    """Update an existing item"""
    if item_id not in items:
        return jsonify({'error': f'Item {item_id} not found'}), 404
    
    data = request.get_json()
    
    # Update fields
    if 'name' in data:
        items[item_id]['name'] = data['name']
    if 'description' in data:
        items[item_id]['description'] = data['description']
    
    items[item_id]['updated_at'] = datetime.utcnow().isoformat()
    
    return jsonify({
        'success': True,
        'data': items[item_id],
        'message': 'Item updated successfully'
    }), 200


@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete an item"""
    if item_id not in items:
        return jsonify({'error': f'Item {item_id} not found'}), 404
    
    deleted_item = items.pop(item_id)
    
    return jsonify({
        'success': True,
        'data': deleted_item,
        'message': 'Item deleted successfully'
    }), 200


# ==================== Root Endpoint ====================

@app.route('/', methods=['GET'])
def index():
    """API information endpoint"""
    return jsonify({
        'name': 'Simple Flask API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/health',
            'items': {
                'list': 'GET /api/items',
                'get': 'GET /api/items/<id>',
                'create': 'POST /api/items',
                'update': 'PUT /api/items/<id>',
                'delete': 'DELETE /api/items/<id>'
            }
        }
    }), 200


# ==================== Entry Point ====================

if __name__ == '__main__':
    # Development server
    app.run(debug=True, host='0.0.0.0', port=5000)
    
    # For production, use:
    # app.run(debug=False, host='0.0.0.0', port=5000)
    # Or better, use a WSGI server like Gunicorn:
    # gunicorn -w 4 -b 0.0.0.0:5000 app:app
