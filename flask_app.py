
"""
Insurance GLR Pipeline Flask Application
Modern Flask app with comprehensive logging and beautiful UI
"""

import os
import io
import json
import logging
import logging.config
import uuid
from datetime import datetime
from pathlib import Path
import pdfplumber
import traceback
from functools import wraps

from flask import Flask, render_template, request, send_file, jsonify, flash, session
from werkzeug.utils import secure_filename
from docxtpl import DocxTemplate
from openai import OpenAI

# Configure logging before creating Flask app
def setup_logging():
    """Configure comprehensive logging for the Flask application"""

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Define logging configuration
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'detailed': {
                'format': '[%(asctime)s] %(levelname)s in %(name)s [%(filename)s:%(lineno)d]: %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'simple': {
                'format': '%(levelname)s - %(message)s'
            },
            'json': {
                'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "module": "%(name)s", "function": "%(funcName)s", "line": %(lineno)d, "message": "%(message)s"}',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
                'formatter': 'detailed',
                'stream': 'ext://sys.stdout'
            },
            'file_info': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'detailed',
                'filename': log_dir / 'app_info.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
                'encoding': 'utf8'
            },
            'file_error': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': 'detailed',
                'filename': log_dir / 'app_error.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
                'encoding': 'utf8'
            },
            'file_debug': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'DEBUG',
                'formatter': 'json',
                'filename': log_dir / 'app_debug.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 3,
                'encoding': 'utf8'
            }
        },
        'loggers': {
            '': {  # root logger
                'level': 'DEBUG',
                'handlers': ['console', 'file_info', 'file_error', 'file_debug']
            },
            'flask': {
                'level': 'INFO',
                'handlers': ['file_info'],
                'propagate': False
            },
            'werkzeug': {
                'level': 'WARNING',
                'handlers': ['file_error'],
                'propagate': False
            }
        }
    }

    logging.config.dictConfig(logging_config)
    return logging.getLogger(__name__)

# Initialize logging
logger = setup_logging()

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create upload directory
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Logging decorator for routes
def log_route(f):
    """Decorator to log route access and performance"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = datetime.now()
        session_id = session.get('session_id', 'anonymous')

        logger.info(f"Route accessed: {request.endpoint} by session {session_id}")
        logger.debug(f"Request method: {request.method}, IP: {request.remote_addr}")

        try:
            result = f(*args, **kwargs)
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Route {request.endpoint} completed successfully in {duration:.2f}s")
            return result
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"Route {request.endpoint} failed after {duration:.2f}s: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    return decorated_function

# Session management
@app.before_request
def before_request():
    """Initialize session and log request details"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        logger.info(f"New session created: {session['session_id']}")

    logger.debug(f"Request: {request.method} {request.url} from {request.remote_addr}")

# Helper functions
def allowed_file(filename, allowed_extensions):
    """Check if file has allowed extension"""
    logger.debug(f"Checking file: {filename} against extensions: {allowed_extensions}")
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def safe_filename(filename):
    """Generate safe filename with timestamp"""
    secure_name = secure_filename(filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name, ext = os.path.splitext(secure_name)
    safe_name = f"{name}_{timestamp}{ext}"
    logger.debug(f"Generated safe filename: {safe_name} from {filename}")
    return safe_name

def extract_text_from_pdfs(pdf_files):
    """Extract text from multiple PDF files with error handling"""
    logger.info(f"Starting text extraction from {len(pdf_files)} PDF files")
    text_chunks = []

    for i, pdf_file in enumerate(pdf_files):
        try:
            logger.debug(f"Processing PDF {i+1}/{len(pdf_files)}: size {len(pdf_file.getvalue())} bytes")

            with pdfplumber.open(pdf_file) as pdf:
                logger.debug(f"PDF opened successfully, {len(pdf.pages)} pages found")

                for page_num, page in enumerate(pdf.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text_chunks.append(page_text)
                            logger.debug(f"Extracted {len(page_text)} characters from page {page_num + 1}")
                        else:
                            logger.warning(f"No text found on page {page_num + 1}")
                    except Exception as e:
                        logger.error(f"Error extracting text from page {page_num + 1}: {str(e)}")
                        continue

        except Exception as e:
            logger.error(f"Error processing PDF file {i+1}: {str(e)}")
            logger.error(f"PDF processing traceback: {traceback.format_exc()}")
            continue

    combined_text = "\n".join(text_chunks)
    logger.info(f"Text extraction completed. Total characters extracted: {len(combined_text)}")
    return combined_text

def call_llm_api(prompt, api_key, model="openrouter/auto", max_tokens=512):
    """Call LLM API with comprehensive error handling and logging"""
    logger.info(f"Making LLM API call with model: {model}")
    logger.debug(f"Prompt length: {len(prompt)} characters")

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "flask-insurance-glr",
                "X-Title": "Insurance GLR Pipeline Flask"
            }
        )

        logger.debug("OpenAI client initialized successfully")

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )

        result = response.choices[0].message.content
        logger.info(f"LLM API call successful. Response length: {len(result)} characters")
        logger.debug(f"API response preview: {result[:100]}...")

        return result

    except Exception as e:
        logger.error(f"LLM API call failed: {str(e)}")
        logger.error(f"API call traceback: {traceback.format_exc()}")
        raise

# Routes
@app.route('/')
@log_route
def index():
    """Main page route"""
    logger.info("Serving main page")
    return render_template('index.html')

@app.route('/process', methods=['POST'])
@log_route
def process_documents():
    """Main document processing endpoint"""
    session_id = session.get('session_id')
    logger.info(f"Starting document processing for session {session_id}")

    try:
        # Validate request
        if 'template' not in request.files:
            logger.warning("No template file in request")
            return jsonify({'error': 'No template file provided'}), 400

        if 'reports' not in request.files:
            logger.warning("No report files in request")
            return jsonify({'error': 'No report files provided'}), 400

        template_file = request.files['template']
        report_files = request.files.getlist('reports')
        api_key = request.form.get('api_key', '').strip()

        # Validate files
        if template_file.filename == '':
            logger.warning("Empty template filename")
            return jsonify({'error': 'No template file selected'}), 400

        if not report_files or all(f.filename == '' for f in report_files):
            logger.warning("No report files selected")
            return jsonify({'error': 'No report files selected'}), 400

        if not api_key:
            logger.warning("No API key provided")
            return jsonify({'error': 'API key is required'}), 400

        # Validate file types
        if not allowed_file(template_file.filename, {'docx'}):
            logger.warning(f"Invalid template file type: {template_file.filename}")
            return jsonify({'error': 'Template must be a .docx file'}), 400

        for report_file in report_files:
            if not allowed_file(report_file.filename, {'pdf'}):
                logger.warning(f"Invalid report file type: {report_file.filename}")
                return jsonify({'error': 'All report files must be .pdf files'}), 400

        logger.info(f"Validation passed. Processing {len(report_files)} reports with template")

        # Process template
        logger.info("Loading template file")
        template_stream = io.BytesIO(template_file.read())
        template = DocxTemplate(template_stream)
        placeholders = list(template.get_undeclared_template_variables())

        logger.info(f"Template loaded successfully. Found {len(placeholders)} placeholders: {placeholders}")

        # Extract text from PDFs
        logger.info("Starting PDF text extraction")
        pdf_streams = [io.BytesIO(f.read()) for f in report_files]
        extracted_text = extract_text_from_pdfs(pdf_streams)

        if not extracted_text.strip():
            logger.error("No text could be extracted from PDF files")
            return jsonify({'error': 'No text could be extracted from the PDF files'}), 400

        # Prepare LLM prompt
        system_prompt = f"""You are an expert insurance claims analyst. 
Given the raw text extracted from photo-inspection reports, return a valid JSON object 
whose keys exactly match this list of template variables:
{placeholders}

For any missing value, return an empty string. Ensure the JSON is valid and properly formatted.
Only return the JSON object, no additional text or explanation."""

        full_prompt = f"{system_prompt}\n\nREPORT TEXT:\n{extracted_text}"

        logger.info("Calling LLM API for data extraction")
        llm_response = call_llm_api(full_prompt, api_key)

        # Parse LLM response
        try:
            context = json.loads(llm_response)
            logger.info(f"LLM response parsed successfully. Found {len(context)} data points")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
            logger.error(f"LLM response was: {llm_response}")
            return jsonify({'error': 'AI response was not valid JSON. Please try again.'}), 500

        # Render template
        logger.info("Rendering template with extracted data")
        template.render(context)

        # Save to memory buffer
        output_buffer = io.BytesIO()
        template.save(output_buffer)
        output_buffer.seek(0)

        logger.info("Document processing completed successfully")

        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"filled_insurance_template_{timestamp}.docx"

        return send_file(
            output_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        logger.error(f"Processing traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/health')
@log_route
def health_check():
    """Health check endpoint"""
    logger.debug("Health check requested")
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    logger.warning(f"404 error: {request.url}")
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(413)
def too_large(error):
    logger.warning(f"File too large: {request.url}")
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

if __name__ == '__main__':
    logger.info("Starting Flask application")
    logger.info(f"Log files are being written to: {Path('logs').absolute()}")

    # Development server
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )
