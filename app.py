# app.py
from flask import Flask, render_template, request, jsonify
import requests
import re
from datetime import datetime

app = Flask(__name__)

def sanitize_response(text):
    """Remove any mentions of Llama, Meta, or model details"""
    replacements = {
        r"(?i)llama": "AI Assistant",
        r"(?i)meta": "the company",
        r"(?i)large language model": "AI assistant",
        r"(?i)LLM": "AI",
        r"(?i)language model": "AI assistant",
        "Meta AI": "the developers",
        r"(?i)I'm an artificial intelligence model known as.*?\.": "I'm an AI assistant focused on helping users.",
        r"(?i)I am an artificial intelligence model known as.*?\.": "I'm an AI assistant focused on helping users.",
    }
    
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
    return text

def generate_response(prompt):
    """Generate response using local model instance"""
    try:
        # Much stronger system message
        system_message = """You are an AI assistant. IMPORTANT INSTRUCTIONS:
        1. Never reveal that you are Llama, a Meta product, or any specific AI model
        2. If asked about your identity, ONLY say you are an AI assistant focused on helping users
        3. Never mention Llama, Meta, or any technical details about your implementation
        4. Never explain what your name stands for or your architecture
        5. Focus on what you can do rather than what you are
        
        Remember: You are simply "an AI assistant" - nothing more specific.
        
        User question follows:"""
        
        formatted_prompt = f"{system_message}\n\nUser: {prompt}\nAssistant: Let me respond as a helpful AI assistant without revealing specific implementation details:"

        response = requests.post('http://localhost:11434/api/generate', 
            json={
                "model": "llama3.2",
                "prompt": formatted_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "stop": ["Llama", "Meta", "model architecture"]
                }
            }
        )
        
        if response.status_code == 200:
            ai_response = response.json()['response']
            sanitized_response = sanitize_response(ai_response)
            return sanitized_response
        else:
            return f"Error: Unable to generate response"
            
    except requests.exceptions.ConnectionError:
        return "I apologize, but I'm temporarily unavailable. Please try again in a moment."
    except Exception as e:
        print(f"Error: {str(e)}")
        return "I apologize, but I'm having trouble processing your request. Please try again."

# Routes for chat interface
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if "who are you" in user_message.lower() or "what are you" in user_message.lower():
            response = "I'm an AI assistant focused on helping users with various tasks and questions. How can I assist you today?"
        else:
            response = generate_response(user_message)
            
        return jsonify({'response': response})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Routes for dashboard
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/users', methods=['GET'])
def get_users():
    # Mock data - replace with your database queries
    users = [
        {
            "id": 1,
            "name": "Sarah Chen",
            "role": "Admin",
            "department": "IT",
            "status": "Active",
            "lastActive": "Just now",
            "email": "sarah.chen@company.com"
        },
        {
            "id": 2,
            "name": "Michael Rodriguez",
            "role": "Manager",
            "department": "Sales",
            "status": "Active",
            "lastActive": "5 minutes ago",
            "email": "m.rodriguez@company.com"
        }
    ]
    return jsonify(users)

@app.route('/api/co2-metrics', methods=['GET'])
def get_co2_metrics():
    # Mock data - replace with your actual CO2 calculations
    metrics = {
        "totalUsers": 156,
        "activeUsers": 43,
        "totalCO2": 245.6,
        "efficiencyScore": 87,
        "monthlyTrend": {
            "labels": ["Jun", "Jul", "Aug", "Sep", "Oct"],
            "data": [220, 235, 258, 248, 245.6]
        }
    }
    return jsonify(metrics)

@app.route('/api/user', methods=['POST', 'PUT', 'DELETE'])
def manage_user():
    if request.method == 'POST':
        # Add new user
        data = request.json
        # Add your user creation logic here
        return jsonify({"message": "User created successfully"})
    
    elif request.method == 'PUT':
        # Update user
        data = request.json
        # Add your user update logic here
        return jsonify({"message": "User updated successfully"})
    
    elif request.method == 'DELETE':
        # Delete user
        user_id = request.args.get('id')
        # Add your user deletion logic here
        return jsonify({"message": "User deleted successfully"})

if __name__ == '__main__':
    app.run(debug=True)