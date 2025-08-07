# app.py
import os, io, json, pdfplumber, streamlit as st
from docxtpl import DocxTemplate
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

# --------------------------------------
# 1.  Streamlit inputs
# --------------------------------------
st.title("Insurance GLR Photo-Report Filler")

template_file = st.file_uploader("Upload insurance template (.docx)",
                                 type="docx")
pdf_files = st.file_uploader("Upload one or more photo reports (.pdf)",
                             type="pdf", accept_multiple_files=True)

api_key = st.text_input("OpenRouter API key", type="password",
                        value=os.getenv("OPENROUTER_API_KEY", ""))

run_btn = st.button("Generate filled document",
                    disabled=not(template_file and pdf_files and api_key))

# --------------------------------------
# 2.  Helper functions
# --------------------------------------
def pdfs_to_text(files):
    """Concatenate extracted text from multiple PDFs."""
    chunks = []
    for f in files:
        with pdfplumber.open(io.BytesIO(f.read())) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""   # empty if OCR needed
                chunks.append(page_text)
    return "\n".join(chunks)

def call_llm(prompt, model="openrouter/auto", max_tokens=512):
    client = OpenAI(base_url="https://openrouter.ai/api/v1",
                    api_key=api_key,
                    default_headers={"HTTP-Referer":"streamlit-app",
                                     "X-Title":"glr-pipeline"})
    rsp = client.chat.completions.create(
        model=model,
        messages=[{"role":"user","content":prompt}],
        max_tokens=max_tokens
    )
    return rsp.choices[0].message.content

# --------------------------------------
# 3.  Main pipeline
# --------------------------------------
if run_btn:
    # 3-a  read template & placeholders
    tpl_stream = io.BytesIO(template_file.read())
    tpl = DocxTemplate(tpl_stream)
    placeholders = list(tpl.get_undeclared_template_variables())  # [62]

    # 3-b  extract raw text from PDFs
    raw_txt = pdfs_to_text(pdf_files)

    # 3-c  prompt LLM to return JSON mapping
    sys_prompt = (
        "You are an expert insurance claims analyst. "
        "Given the raw text from photo-inspection reports, "
        "return a valid JSON object whose keys exactly match "
        "this list of template variables:\n"
        f"{placeholders}\n\n"
        "For any missing value, return an empty string."
    )
    llm_output = call_llm(sys_prompt + "\n\nREPORT TEXT:\n" + raw_txt)

    try:
        context = json.loads(llm_output)
    except json.JSONDecodeError:
        st.error("LLM response was not valid JSON. Please retry.")
        st.stop()

    # 3-d  render filled template in-memory
    tpl.render(context)
    out_buf = io.BytesIO()
    tpl.save(out_buf)
    out_buf.seek(0)

    # 3-e  download button
    st.success("Document generated successfully!")
    st.download_button(
        label="Download filled-in .docx",
        data=out_buf,
        file_name="filled_report.docx",
        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

