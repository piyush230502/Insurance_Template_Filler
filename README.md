# Insurance Template Filler

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.0+-black?style=for-the-badge&logo=flask)
![Streamlit](https://img.shields.io/badge/Streamlit-1.0+-red?style=for-the-badge&logo=streamlit)
![OpenAI](https://img.shields.io/badge/OpenAI-API-green?style=for-the-badge&logo=openai)

> A powerful, AI-driven tool to automate the tedious process of filling insurance templates. This application extracts data from various document formats and intelligently populates predefined templates, saving time and reducing manual errors.

## ✨ Key Features

- **Automated Data Extraction**: Leverages `pdfplumber` for PDFs and `pytesseract` for image-based documents to accurately extract text.
- **AI-Powered Data Mapping**: Utilizes the OpenAI API to understand the context of the extracted text and map it to the correct fields in the template.
- **Template-Based Document Generation**: Employs `docxtpl` to dynamically generate filled `.docx` files from templates.
- **Interactive Web Interface**: A user-friendly UI built with Streamlit allows for easy file uploads and management.
- **Flexible Backend**: A robust Flask backend handles the core processing and logic.
- **Support for Multiple Carriers**: Easily adaptable to different insurance carriers and their unique templates, with existing examples for USAA, Guide-one-eberl, and Wayne-elevate.

## 🚀 How It Works

1.  **Upload**: The user uploads an insurance document (e.g., a PDF claim form or a scanned image) through the Streamlit web interface.
2.  **Process**: The Flask backend receives the file. It uses `pdfplumber` or `pytesseract` to extract the raw text.
3.  **Analyze**: The extracted text is sent to the OpenAI API with a prompt engineered to identify and structure key information (e.g., Insured Name, Policy Number, Date of Loss).
4.  **Populate**: The structured data returned by the AI is used to populate a corresponding `.docx` template via `docxtpl`.
5.  **Download**: The newly generated, filled document is made available for the user to download.

## 🛠️ Technologies Used

- **Frontend**: Streamlit
- **Backend**: Flask, Werkzeug
- **AI & Data Processing**: OpenAI API, PDFPlumber, Pytesseract (Tesseract OCR)
- **Document Templating**: docxtpl
- **Environment Management**: python-dotenv

## ⚙️ Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/piyush230502/Insurance_Template_Filler.git
    cd Insurance_Template_Filler
    ```

2.  **Create a virtual environment and activate it:**
    ```bash
    conda create -p GLR python=3.10 -y
    conda activate 
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up your environment variables:**
    Create a file named `.env` in the root directory and add your OpenAI API key:
    ```
    OPENAI_API_KEY='your_openai_api_key_here'
    ```

## ▶️ How to Run

1.  **Start the Streamlit application:**
    ```bash
    streamlit run streamlit_app.py
    python flask_app.py
    ```
2.  Open your web browser and navigate to the local URL provided by Streamlit (usually `http://localhost:8501`).
3.  Upload your insurance documents and let the magic happen!

## 📂 Project Structure

```
Insurance_Template_Filler/
├── .env                  # Environment variables (OpenAI key)
├── .gitignore            # Files to be ignored by Git
├── requirements.txt      # Project dependencies
├── flask_app.py          # Core Flask backend logic
├── streamlit_app.py      # Streamlit frontend application
├── Filled_Insurance_Template.txt # Example output file
├── docs/                 # Templates for different carriers
│   ├── Guide-one-eberl/
│   ├── USAA/
│   └── wayne-elevate/
├── logs/                 # Application logs(automatically generate)
├── static/               # Static assets for Flask
├── templates/            # HTML templates for Flask
└── uploads/              # Directory for file uploads
```

## Deployment 

To deploy it to Railway, we need to:
1. Create a Procfile: This file tells Railway how to start the application.
2. Create a runtime.txt: This file specifies the Python version to use
3. Update requirements.txt: We need to add gunicorn to run the app in a production environment.
4. Add a .railway directory with a railway.json file: This is the modern way to configure Railway deployments and will contain the start command and other settings

5.make a ".railway" directory by using command "mkdir .railway"

-- Now, you can deploy your application to Railway by following these steps:

1. Install the Railway CLI: If you haven't already, install the Railway command-line interface.
2. Login to Railway: railway login
3. Initialize your project: railway init
4. Deploy: railway up
5. Railway will automatically detect the configuration files I've created and deploy your application.


## 🤝 Contributing

Contributions are welcome! If you have ideas for improvements or want to add support for more insurance carriers, please feel free to fork the repository and submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
