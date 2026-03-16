# CodeAtlas Project Specification

Goal: Build a web application called CodeAtlas that allows developers to upload or link a GitHub repository and receive AI-powered insights about the codebase.

Core Features:
1. Repository Upload
   - Users can paste a GitHub repo URL or upload a zip file.
2. Repository Scanner
   - Backend clones the repo
   - Reads file structure
   - Detects imports, classes, and functions
   - Returns structured JSON
3. Architecture Summary
   - LLM generates:
     - Project purpose
     - Main entry points
     - Major modules
     - Tech stack
4. Dependency Graph
   - Visual graph showing file/module dependencies
5. Codebase Question Answering
   - Users can ask questions like:
     - "Where is authentication handled?"
     - "Where is the database connection?"
6. Feature Location Assistant
   - Users describe a feature they want to add
   - AI suggests:
     - Which file to modify
     - Where in the file
     - Reasoning
   - Example: "I want to add rate limiting to login requests"

Tech Stack:
- Frontend: React + Tailwind + React Flow for graphs
- Backend: Python + FastAPI
- AI: OpenAI API
- Repo processing: GitPython + AST parsing
- Vector search: FAISS

Architecture: 
Frontend → FastAPI backend → Repo Scanner → AI Services → Graph Generator

Focus on building a clean MVP first.