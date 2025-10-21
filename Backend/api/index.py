"""
Vercel serverless function entry point for FastAPI backend
"""
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

# Import the FastAPI app
from server import app

# This is the entry point for Vercel
handler = app
