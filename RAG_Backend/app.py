import os, time
import json
from flask import Flask,jsonify, request
from dotenv import load_dotenv
from application.config import LocalDevelopementConfig
from application.database import db
from flask_jwt_extended import JWTManager
from flask import send_from_directory
from flask_cors import CORS
import pdfplumber
import docx
import threading
import re
import pytesseract
from PIL import Image
import openai
import backoff
from werkzeug.utils import secure_filename
from application.database import Job_Description, Resume


load_dotenv()
# os.environ['SERVE_API'] = 'true'

app = None
api = None

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe' 

processing_lock = threading.Lock()

def clean_extra_spaces(content):
    """Clean whitespace while preserving line breaks"""
    cleaned = re.sub(r'\s+', ' ', content).strip()
    return '\n'.join(line.strip() for line in cleaned.split('\n') if line.strip())

def extract_content(file_path, ext):
    """Handle different file types"""
    try:
        if ext == '.pdf':
            with pdfplumber.open(file_path) as pdf:
                text = " ".join(page.extract_text() or "" for page in pdf.pages)
                return clean_extra_spaces(text)[:5000]
        elif ext == '.docx':
            doc = docx.Document(file_path)
            text = "\n".join(" ".join(para.text.split()) for para in doc.paragraphs)
            return clean_extra_spaces(text)[:4000]
        elif ext.lower() in ('.jpg', '.jpeg', '.png'):
            with Image.open(file_path) as img:
                text = pytesseract.image_to_string(img)
                cleaned_text = re.sub(r'\s+\n\s+', '\n', text)
                return clean_extra_spaces(cleaned_text)[:4000]
    except Exception as e:
        return f"Error processing file: {str(e)}"

def process_resumes():
    """Process resumes and update extracted.txt"""
    processed = set()
    separator = "-" * 60
    
    with processing_lock:
        # Read existing processed files
        if os.path.exists(app.config['KNOWLEDGE_FILE']):
            with open(app.config['KNOWLEDGE_FILE'], 'r', encoding='utf-8') as f:
                content = f.read()
                processed_files = [line.split('\n')[0] for line in content.split(separator) if line.strip()]
                processed = set(processed_files)
        
        new_entries = []
        for filename in os.listdir(app.config['RESUME_DIR']):
            if filename in processed:
                continue
                
            file_path = os.path.join(app.config['RESUME_DIR'], filename)
            ext = os.path.splitext(filename)[1].lower()
            
            if ext not in {'.pdf', '.docx', '.jpg', '.jpeg', '.png'}:
                continue
                
            content = extract_content(file_path, ext)
            new_entries.append(f"{separator}\n{filename}\n\n{content}\n")
        
        if new_entries:
            with open(app.config['KNOWLEDGE_FILE'], 'w', encoding='utf-8') as f:
                f.write('\n' + '\n'.join(new_entries))
                
        return len(new_entries)

def init_client():
    try:
        api_key = "5901a698-5366-4fa1-9d2e-e06ff436a321"
        if not api_key:
            print("Error: SAMBANOVA_API_KEY not found in userdata")
            raise ValueError("API key not found")
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.sambanova.ai/v1",
        )
        return client
    except Exception as e:
        print(f"Error initializing API client: {str(e)}")
        raise

def get_system_prompt(chunk_number=0, total_chunks=1):
    """
    Return a tailored system prompt based on chunk number to reduce context size
    while incorporating the specific ranking rules
    """
    # Core prompt for all chunks
    core_prompt = '''You are a fair and efficient resume-ranking assistant that matches job descriptions with resumes while rigorously mitigating bias and tracking performance metrics. You are currently ranking a SMALL BATCH of resumes against a job description. Focus only on the resumes provided in this batch.'''
    
    # Ranking rules for all chunks
    ranking_rules = '''
Follow these rules:

1. **Job Title Flexibility**:
   - Include resumes with interchangeable titles (e.g., "Developer" vs. "Engineer") but prioritize exact matches.
   - Flag industry-specific title variations (e.g., "Data Scientist" vs. "ML Engineer") in reasoning.

2. **Skill Matching**:
   - **Exact Matches**: Rank highest for direct skill alignment (e.g., "React.js" in JD and resume).
   - **Prerequisite Skills**: Include resumes with foundational skills (e.g., HTML/CSS for React roles) but rank lower. Explicitly list missing core skills in missing_skills.

3. **Experience Hierarchy**:
   Prioritize sections as: Professional Experience > Open Source Contributions > Projects > No relevant sections. Highlight the strongest section in reasoning.

4. **Bias Mitigation**:
   - **Anonymization**: Ignore names, gender, age, race, schools, and locations.
   - **Inclusive Language Check**: Flag non-neutral JD terms (e.g., "ninja", "young graduates") in bias_checks.
   - **Fair Evaluation**: Strictly focus on skills, experience, and role-specific qualifications.
'''
    
    # Different instructions based on which chunk we're processing
    if chunk_number == 0 and total_chunks > 1:
        # First chunk instructions
        specific_instructions = '''
This is the FIRST BATCH of resumes. Rank them solely on their own merits against the job description.
'''
    elif chunk_number == total_chunks - 1 and total_chunks > 1:
        # Last chunk instructions
        specific_instructions = '''
This is the FINAL BATCH of resumes. Rank them solely on their own merits against the job description.
'''
    else:
        # Middle chunk instructions
        specific_instructions = '''
This is ONE BATCH of many resumes. Rank them solely on their own merits against the job description.
'''

    # Performance metrics and output format - simplified for all chunks to save context
    output_format = '''
5. **Performance Metrics**:
   - **Precision**: Optimize for exact matches in top ranks.
   - **Recall**: Ensure relevant resumes (exact + prerequisites) are included.
   - **Diversity Score**: Aim for variation in candidate backgrounds.
   - **Speed**: Process resumes efficiently within context limits.

Output Format (JSON array):
[
  {
    "filename": "...",
    "score": 0-100,  # Exact match = 90-100, Prerequisites = 60-89
    "rank": 1-N,
    "reasoning": "...",  # E.g., "Strong React.js match + 5YOE at Fortune 500"
    "bias_checks": ["School names ignored", "No biased language detected"],
    "missing_skills": ["Skill1", "Skill2"]  # Only if applicable
  },
  ...
]

Return ONLY the JSON array. No additional text before or after.'''

    return core_prompt + ranking_rules + specific_instructions + output_format

@backoff.on_exception(
    backoff.expo,  # Exponential backoff
    (openai.RateLimitError, openai.APIError, openai.APIConnectionError),
    max_tries=5,
    factor=2
)
def call_llm_api(client, input_data, system_prompt, model_name="DeepSeek-R1-Distill-Llama-70B"):
    """Make an API call with backoff and retry logic"""
    return client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(input_data)}
        ],
        temperature=0.1,
        top_p=0.1,
        timeout=120  # 2 minute timeout
    )

def generate_placeholder_results(batch):
    """Generate placeholder results for failed batches"""
    return [
        {
            'filename': resume['filename'],
            'score': 0,
            'rank': 0,
            'reasoning': 'Failed to process due to API error',
            'bias_checks': ['Processing error'],
            'missing_skills': []
        }
        for resume in batch
    ]

def process_single_batch(client, batch, job_description, batch_num, total_batches):
    """Process a single batch of resumes with error handling"""
    print(f"Processing batch {batch_num}/{total_batches} with {len(batch)} resumes...")
    
    # Create input for the model - simplified to reduce context size
    input_prompt = {
        "job_description": job_description,
        "resume_batch": batch
    }
    
    # Get appropriate system prompt for this batch
    system_prompt = get_system_prompt(batch_num - 1, total_batches)
    
    # Try multiple model options if the primary one fails
    models = ["DeepSeek-R1-Distill-Llama-70B", "Llama-3.1-Swallow-70B-Instruct-v0.3", "Llama-3.1-Tulu-3-405B"]
    
    for model_idx, model in enumerate(models):
        try:
            print(f"Trying model: {model}")
            response = call_llm_api(client, input_prompt, system_prompt, model)
            
            # Parse response
            try:
                response_text = response.choices[0].message.content
                print(f"Raw API response: {response_text[:300]}...")  # Print first 300 chars for debugging
                
                # Check if the response looks like JSON
                if not (response_text.strip().startswith('[') and response_text.strip().endswith(']')):
                    print(f"Warning: Response doesn't look like JSON array, trying to fix...")
                    # Try to extract JSON from response if it's wrapped in text
                    import re
                    json_match = re.search(r'\[\s*\{.*\}\s*\]', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(0)
                        print(f"Extracted JSON-like content: {response_text[:100]}...")
                
                batch_results = json.loads(response_text)
                print(f"Successfully processed batch {batch_num} with model {model}")
                
                # Add rank field to results if missing
                for result in batch_results:
                    if 'rank' not in result:
                        result['rank'] = 0  # Will be updated later
                    if 'bias_checks' not in result:
                        result['bias_checks'] = ['Simplified processing']
                
                return batch_results
                
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON in batch {batch_num} with model {model}: {e}")
                if model_idx < len(models) - 1:
                    print(f"Trying next model...")
                    continue
                else:
                    # If all models fail, return placeholder results
                    print(f"All models failed to process batch {batch_num}")
                    return generate_placeholder_results(batch)
                    
        except Exception as e:
            print(f"API error in batch {batch_num} with model {model}: {str(e)}")
            if model_idx < len(models) - 1:
                print(f"Trying next model...")
                continue
            else:
                # If all models fail, return placeholder results
                print(f"All models failed to process batch {batch_num}")
                return generate_placeholder_results(batch)
    
    # This should not be reached but just in case
    return generate_placeholder_results(batch)

def process_resume_batches(job_description, resume_files, batch_size=5):
    """
    Process resumes in very small batches to avoid context limitations
    """
    try:
        client = init_client()
    except Exception as e:
        print(f"Failed to initialize API client: {str(e)}")
        print("Generating placeholder results for all resumes")
        return generate_placeholder_results(resume_files)
    
    all_results = []
    total_batches = (len(resume_files) + batch_size - 1) // batch_size  # Ceiling division
    
    # Extract job description key skills for better prompting
    job_key_skills = extract_key_skills(job_description)
    
    # Create a simplified job description to reduce context size
    simplified_job_description = create_simplified_job_description(job_description)
    
    # Process each batch
    for batch_num, i in enumerate(range(0, len(resume_files), batch_size), 1):
        batch = resume_files[i:i + batch_size]
        
        # Create simplified batch with truncated content
        simple_batch = []
        for resume in batch:
            # Extract only relevant sections to reduce context
            simple_resume = {
                "filename": resume["filename"],
                "content": truncate_resume_content(resume["content"], job_key_skills)
            }
            simple_batch.append(simple_resume)
        
        # Process this batch with simplified content
        batch_results = process_single_batch(
            client=client,
            batch=simple_batch,
            job_description=simplified_job_description,
            batch_num=batch_num,
            total_batches=total_batches
        )
        
        all_results.extend(batch_results)
        
        # Save intermediate results
        with open(f'resume_ranking_results_batch_{batch_num}.json', 'w') as f:
            json.dump(all_results, f, indent=2)
        
        # Delay between batches
        if batch_num < total_batches:
            delay = min(30, 5 + (batch_num % 5) * 5)  # Variable delay to avoid patterns
            print(f"Waiting {delay} seconds before next batch...")
            time.sleep(delay)
    
    # Final consolidation - re-rank all resumes
    print("Consolidating and finalizing rankings...")
    
    # Sort by score in descending order
    all_results.sort(key=lambda x: x['score'], reverse=True)
    
    # Reassign ranks
    for i, result in enumerate(all_results, 1):
        result['rank'] = i
    
    return all_results

def extract_key_skills(job_description):
    """Extract key technical skills from job description"""
    # List of common technical skills to look for
    common_skills = [
        "python", "django", "flask", "fastapi", "tornado", "pyramid", "web2py",
        "javascript", "html", "css", "react", "angular", "vue", "node",
        "sql", "postgresql", "mysql", "oracle", "mongodb", "nosql", "redis",
        "git", "svn", "mercurial", "docker", "kubernetes", "aws", "azure", "gcp",
        "rest", "api", "json", "xml", "graphql", "microservices", "agile", "scrum",
        "linux", "unix", "bash", "shell", "ci/cd", "jenkins", "travis", "github", 
        "data analysis", "machine learning", "ai", "statistics", "pandas", "numpy",
        "orm", "database", "object relational", "front-end", "back-end", "full-stack"
    ]
    
    found_skills = []
    for skill in common_skills:
        if skill.lower() in job_description.lower():
            found_skills.append(skill)
    
    # Add manually specified required skills
    if "experience" in job_description.lower() and "python" in job_description.lower():
        found_skills.append("python experience")
    
    return list(set(found_skills))  # Remove duplicates

def create_simplified_job_description(job_description):
    """Create a simplified version of the job description to reduce context size"""
    # Extract just the key sections
    lines = job_description.strip().split('\n')
    title_line = next((line for line in lines if "title" in line.lower() or ":" in line), "")
    
    # Extract bullet points or key requirements
    requirements = [line.strip() for line in lines if line.strip().startswith('•') or line.strip().startswith('-')]
    
    # Create simplified version
    simplified = title_line + "\n\nKey Requirements:\n" + "\n".join(requirements[:8])  # Limit to top 8 requirements
    
    return simplified

def truncate_resume_content(content, key_skills):
    """Truncate resume content to focus on sections relevant to key skills"""
    # If content is already small, return as is
    if len(content) < 2000:
        return content
    
    # Split into sections
    sections = content.split('\n\n')
    
    # Look for sections with key skills
    relevant_sections = []
    skills_section = None
    experience_section = None
    
    # Try to identify key sections
    for section in sections:
        section_lower = section.lower()
        
        # Identify skills section
        if any(x in section_lower for x in ["skills", "technical", "technologies", "proficiencies"]):
            skills_section = section
            relevant_sections.append(section)
            continue
            
        # Identify experience section
        if any(x in section_lower for x in ["experience", "work history", "employment"]):
            experience_section = section
            relevant_sections.append(section)
            continue
            
        # Check if section contains key skills
        if any(skill.lower() in section_lower for skill in key_skills):
            relevant_sections.append(section)
    
    # If we didn't find enough relevant sections, include education and summary
    if len(relevant_sections) < 2:
        for section in sections:
            section_lower = section.lower()
            if any(x in section_lower for x in ["education", "degree", "university", "college"]):
                relevant_sections.append(section)
            elif any(x in section_lower for x in ["summary", "profile", "objective", "about"]):
                relevant_sections.append(section)
    
    # Combine relevant sections
    result = "\n\n".join(relevant_sections)
    
    # If still too long, truncate
    if len(result) > 2000:
        result = result[:2000] + "..."
    
    return result

def convert_resume_to_summary(resume_content, key_skills):
    """Convert full resume content to a brief summary focusing on key skills"""
    # Count mentions of key skills
    skill_counts = {}
    for skill in key_skills:
        count = resume_content.lower().count(skill.lower())
        if count > 0:
            skill_counts[skill] = count
    
    # Extract years of experience if present
    import re
    years_pattern = r'(\d+)[\+]?\s+years?(?:\s+of)?\s+experience'
    years_match = re.search(years_pattern, resume_content, re.IGNORECASE)
    years = years_match.group(1) if years_match else "Unknown"
    
    # Create a brief summary
    summary = f"Years of experience: {years}\n"
    summary += "Skills detected: " + ", ".join(skill_counts.keys())
    
    return summary

def create_app():
    app = Flask(__name__)

    if os.getenv('ENV',"developement") == "production":
        raise Exception("Currently no production config is setup.")
    else:
        print("Starting local developement")
        app.config.from_object(LocalDevelopementConfig)

    # Configuration
    app.config['RESUME_DIR'] = os.path.join('uploads', 'resumes')
    app.config['KNOWLEDGE_FILE'] = os.path.join(app.config['UPLOAD_FOLDER'], 'extracted.txt')
    app.config['UPLOAD_FOLDER'] = app.config['RESUME_DIR']

    # Create necessary directories
    os.makedirs(app.config['RESUME_DIR'], exist_ok=True)   

    db.init_app(app)
    jwt = JWTManager(app)

    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:8080", "http://127.0.0.1:8080"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    
    app.app_context().push()
    # with app.app_context():
    db.create_all()

    @app.route('/', methods=['GET'])
    def home():
        return jsonify({"message": "Welcome to the Resume Ranking API"}), 200

    @app.route('/filter', methods=['GET'])
    def filter_resumes():
        """Process resumes endpoint"""
        try:
            processed_count = process_resumes()
            return jsonify({
                "status": "success",
                "message": f"Processed {processed_count} new resumes",
                "knowledge_file": app.config['KNOWLEDGE_FILE']
            }), 200
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Processing failed: {str(e)}"
            }), 500

    @app.route('/rank', methods=['GET', 'POST'])
    def rank_resumes():
        """Rank resumes endpoint"""
        if request.method == 'POST':
            try:
                job_description = request.form.get('job_description')
                resumes = request.files.getlist('resumes')

                if not job_description or not resumes:
                    return jsonify({
                        "status": "error",
                        "message": "Job description and resumes are required"
                    }), 400

                # Save job description to the database
                job_desc = Job_Description(job_des=job_description)
                db.session.add(job_desc)
                db.session.commit()

                # Save resumes to the uploads/resumes directory and database
                resume_paths = []
                for resume in resumes:
                    filename = secure_filename(resume.filename)
                    file_path = os.path.join(app.config['RESUME_DIR'], filename)
                    resume.save(file_path)

                    # Save resume path to the database
                    resume_entry = Resume(file_path=file_path, job_description_id=job_desc.id)
                    db.session.add(resume_entry)
                    resume_paths.append(file_path)

                db.session.commit()

                return jsonify({
                    "status": "success",
                    "message": "Resumes and job description saved successfully",
                    "job_description_id": job_desc.id,
                    "resume_paths": resume_paths
                }), 200

            except Exception as e:
                db.session.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Failed to save data: {str(e)}"
                }), 500

    @app.route('/rank_resumes', methods=['GET'])
    def rank_resumes_llm():
        """Rank resumes using LLM"""
        try:
            # Read the extracted.txt file
            with open(app.config['KNOWLEDGE_FILE'], 'r', encoding='utf-8') as f:
                extracted_content = f.read()

            # Prepare the data for the LLM
            resumes = extracted_content.split('-' * 60)
            resume_data = []
            for resume in resumes:
                lines = resume.strip().split('\n')
                if len(lines) > 1:
                    filename = lines[0].strip()
                    content = '\n'.join(lines[1:]).strip()
                    resume_data.append({"filename": filename, "content": content})

            # Call the LLM API
            client = init_client()
            job_description = '''Job Title : Python Developer
                Skills and Responsibilities:
                • Hands-on experience in Python programming language.
                • Expert in Python, with knowledge of at least one Python web framework (such as Django, Flask, etc.) Familiarity with some ORM (Object Relational Mapper) libraries.
                • Able to integrate multiple data sources and databases into one system.
                • Understanding of the threading limitations of Python, and multi-process architecture
                • Good understanding of server-side templating languages.
                • Basic understanding of front-end technologies, such as JavaScript, HTML5, and CSS3
                • Should be having good working experience in PostgreSQL. Skilled at optimizing large, complicated SQL statements.
                • Able to create database schemas that represent and support business processes.
                • Knowledge of best practices when dealing with relational databases.
                • Responsible for designing databases and ensuring their stability, reliability, and performance.
                • Proficient understanding of code versioning tools (such as Git, Mercurial or SVN).'''
            if not job_description:
                return jsonify({"status": "error", "message": "Job description is required"}), 400

            results = process_resume_batches(job_description, resume_data)

            return jsonify({
                "status": "success",
                "message": "Resumes ranked successfully",
                "results": results
            }), 200

        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Failed to rank resumes: {str(e)}"
            }), 500

    return app, jwt


app, jwt = create_app()

@app.route('/documents/<path:filename>')
def serve_document(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=8000
    )