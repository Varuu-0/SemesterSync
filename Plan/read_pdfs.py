import PyPDF2
import sys

def read_pdf(file_path):
    output_path = file_path + '.txt'
    print(f"Reading {file_path} to {output_path}")
    try:
        with open(file_path, 'rb') as file, open(output_path, 'w', encoding='utf-8') as out_file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\n'
            out_file.write(text)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

read_pdf('Hackers Package.pdf')
read_pdf('Gdghacks Syllabus To Calendar Ai Project Research.pdf')
