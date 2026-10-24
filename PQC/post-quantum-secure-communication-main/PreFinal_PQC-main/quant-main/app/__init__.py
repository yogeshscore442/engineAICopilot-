import os
from flask import Flask, render_template
from flask_socketio import SocketIO
from app.config import Config
from app.models import db

# Initialize OQS library paths BEFORE importing any cryptographic modules
Config.init_oqs_path()

socketio = SocketIO()

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response

    with app.app_context():
        db.create_all()

        
    # Register blueprints
    from app.auth.routes import auth_bp
    from app.api.routes import api_bp
    from app.mail.mail_routes import mail_bp
    from app.files.file_routes import files_bp
    from app.keys.key_routes import key_bp
    from app.audit.audit_routes import audit_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(mail_bp, url_prefix='/api/mail')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(key_bp, url_prefix='/api/keys')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')
    
    # Import socketio events so they register with the socketio instance
    from app.chat import events
    
    return app

