import os
from google.genai import Client
from dotenv import load_dotenv

# .env ෆයිල් එකේ තියෙන දත්ත ගන්න
load_dotenv() 

client = Client(api_key=os.getenv("GEMINI_API_KEY"))

print("ඔයාගේ API Key එකට වැඩ කරන Models ලිස්ට් එක:")
for model in client.models.list():
    # 'gemini' කියලා පටන් ගන්න models විතරක් print කරමු
    if "gemini" in model.name.lower():
        print(model.name)