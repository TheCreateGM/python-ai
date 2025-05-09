from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import google.generativeai as genai
import openai
import os
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
import uuid

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.environ.get('SECRET_KEY', 'devsecret')
CORS(app)

# Database setup
Base = declarative_base()
engine = create_engine('sqlite:///chat_history.db')
SessionLocal = sessionmaker(bind=engine)

class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True)
    chat_id = Column(String(64), index=True)
    role = Column(String(10))  # 'user' or 'ai'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ChatSession(Base):
    __tablename__ = 'chats'
    id = Column(String(64), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String(128), default='New Chat')

Base.metadata.create_all(engine)

# Load environment variables
load_dotenv()

@app.before_request
def ensure_session():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chats', methods=['GET'])
def list_chats():
    db = SessionLocal()
    chats = db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()
    chat_list = []
    for chat in chats:
        # Get first user message as title if available
        first_msg = db.query(Message).filter_by(chat_id=chat.id, role='user').order_by(Message.timestamp).first()
        chat_list.append({
            'id': chat.id,
            'title': first_msg.content[:40] if first_msg else chat.title,
            'created_at': chat.created_at.isoformat()
        })
    db.close()
    return jsonify({'chats': chat_list})

@app.route('/api/chats', methods=['POST'])
def create_chat():
    db = SessionLocal()
    chat_id = str(uuid.uuid4())
    chat = ChatSession(id=chat_id)
    db.add(chat)
    db.commit()
    db.close()
    return jsonify({'chat_id': chat_id})

@app.route('/api/history', methods=['GET'])
def get_history():
    db = SessionLocal()
    chat_id = request.args.get('chat_id')
    if not chat_id:
        db.close()
        return jsonify({'history': []})
    messages = db.query(Message).filter_by(chat_id=chat_id).order_by(Message.timestamp).all()
    history = [
        {'role': m.role, 'content': m.content, 'timestamp': m.timestamp.isoformat()} for m in messages
    ]
    db.close()
    return jsonify({'history': history})

@app.route('/api/chat', methods=['POST'])
def chat():
    db = SessionLocal()
    data = request.form if request.form else request.json
    message = data.get('message')
    api_type = data.get('api_type')
    api_key = data.get('api_key')
    gemini_model = data.get('gemini_model', 'gemini-1.5-pro-latest')
    file = request.files.get('file') if 'file' in request.files else None
    chat_id = data.get('chat_id')
    if not message or not api_type or not api_key or not chat_id:
        return jsonify({'error': 'Missing required parameters'}), 400
    try:
        # Store user message
        db.add(Message(chat_id=chat_id, role='user', content=message))
        db.commit()
        if api_type == 'gemini':
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(gemini_model)
            if file:
                file_content = file.read().decode('utf-8')
                prompt = f"{message}\n\n---\n\n{file_content}"
                response = model.generate_content(prompt)
            else:
                response = model.generate_content(message)
            ai_content = response.text
        elif api_type == 'chatgpt':
            openai.api_key = api_key
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": message}]
            )
            ai_content = response.choices[0].message.content
        else:
            return jsonify({'error': 'Invalid API type'}), 400
        # Store AI message
        db.add(Message(chat_id=chat_id, role='ai', content=ai_content))
        db.commit()
        db.close()
        return jsonify({'response': ai_content})
    except Exception as e:
        db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/gemini/models', methods=['POST'])
def list_gemini_models():
    api_key = request.json.get('api_key')
    if not api_key:
        return jsonify({'error': 'Missing API key'}), 400
    try:
        genai.configure(api_key=api_key)
        models = genai.list_models()
        model_names = [m.name for m in models]
        return jsonify({'models': model_names})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 