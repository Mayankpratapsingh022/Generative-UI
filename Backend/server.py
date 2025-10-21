from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
import uvicorn
from dotenv import load_dotenv

app = FastAPI(title="Generator", version="1.0.0")
load_dotenv()

# Get environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")

# Configure CORS origins based on environment
if ENVIRONMENT == "production":
    # Production CORS configuration
    if CORS_ORIGINS:
        # If CORS_ORIGINS is provided as comma-separated string, split it
        allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]
    else:
        # Default production origins (add your production domains here)
        allowed_origins = [
            "https://yourdomain.com",
            "https://www.yourdomain.com",
            "https://app.yourdomain.com"
        ]
else:
    # Development CORS configuration
    allowed_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003"
    ]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
# Pydantic models
class ComponentInfo(BaseModel):
    name: str
    import_statement: str
    items: List[str]
    props: List[str]

class AppGenerationRequest(BaseModel):
    user_prompt: str = Field(description="Description of the app to build")

class AppGenerationResponse(BaseModel):
    app_jsx_code: str
    used_components: List[str]
    success: bool
    message: str

# Initialize OpenAI LLM
llm = ChatOpenAI(model="gpt-5-2025-08-07", temperature=0.1)

class ShadcnComponentParser:
    """Parser for shadcn components.json file"""
    
    def __init__(self, components_json_path: str):
        self.components_json_path = components_json_path
        self.components = self._load_components()
    
    def _load_components(self) -> Dict[str, ComponentInfo]:
        """Load and parse components from components.json"""
        try:
            if not os.path.exists(self.components_json_path):
                raise FileNotFoundError(f"Components file not found: {self.components_json_path}")
            
            with open(self.components_json_path, 'r') as f:
                data = json.load(f)
            
            components = {}
            shadcn_components = data.get("shadcn_components", {})
            
            for comp_name, comp_data in shadcn_components.items():
                components[comp_name] = ComponentInfo(
                    name=comp_name,
                    import_statement=comp_data.get("import", ""),
                    items=comp_data.get("items", []),
                    props=comp_data.get("props", [])
                )
            
            return components
        except Exception as e:
            raise Exception(f"Error loading components: {str(e)}")
    
    def get_component_list(self) -> List[str]:
        """Get list of available component names"""
        return list(self.components.keys())
    
    def get_component_info(self, component_name: str) -> Optional[ComponentInfo]:
        """Get detailed info for a specific component"""
        return self.components.get(component_name)
    
    def get_all_components_summary(self) -> str:
        """Get a formatted summary of all components for the prompt"""
        summary = "AVAILABLE SHADCN COMPONENTS:\n\n"
        
        for name, info in self.components.items():
            summary += f"## {name.upper()}\n"
            summary += f"Import: {info.import_statement}\n"
            summary += f"Items: {', '.join(info.items)}\n"
            summary += f"Props: {', '.join(info.props)}\n\n"
        
        return summary

class ReactAppGenerator:
    """Generates React app.jsx code using available shadcn components"""
    
    def __init__(self, llm, component_parser: ShadcnComponentParser):
        self.llm = llm
        self.component_parser = component_parser
    
    def generate_system_prompt(self) -> str:
        components_info = self.component_parser.get_all_components_summary()
        
        return f"""You are a React application generator that creates modern, functional apps using shadcn/ui components.

{components_info}

GENERATION RULES:
1. Generate ONLY a single app.jsx file - no other files
2. Use the shadcn components listed above, if something is not available in the shadcn components.json file, you have control to add custom tailwind classes and customer elements (for example canvas etc stuff, Make sure your main job is to give working app's whatever it takes to do that do it ) as well, something which is not available in the shadcn components.json file, but make sure what ever you are giving has a good consistent design and look (similar to shadcn)
3. Create a complete, functional React application
4. Use modern React patterns (functional components,)
5. Include proper imports for used shadcn components
8. Make the app responsive and visually appealing
8. Include proper state management where needed
9. Ensure the app is interactive and functional
10. Use proper component composition and organization
11. don't use this @/components/ui/ instead use ./components/ui/ while  importing any component
12. You have control to add custom tailwind classes and customer elements (for example canvas etc stuff, Make sure your main job is to give working app's whatever it takes to do that do it ) as well, something which is not available in the shadcn components.json file, but make sure what ever you are giving has a good consistent design and look (similar to shadcn)

IMPORTANT CONSTRAINTS:
- ONLY use components from the provided list
- Import components exactly as specified in the import statements
- Make sure all used components are properly imported
- Generate clean, production-ready code
- Include error handling where appropriate
- Use TypeScript-style props when beneficial
- don't use this component (toast) not there in shadcnuse-toast

RESPONSE FORMAT:
Return only the complete app.jsx file code, nothing else."""

    def generate_user_prompt(self, user_request: str) -> str:
        available_components = ", ".join(self.component_parser.get_component_list())
        
        return f"""Generate a React application based on this request: {user_request}

Available components to use: {available_components}

Requirements:
- Create a single app.jsx file
- Use appropriate shadcn components from the available list
- Make it functional and interactive
- Ensure responsive design
- Include proper state management
- Add loading states and error handling where needed
- Make it visually appealing and modern

Generate the complete app.jsx code now."""

    def generate_app(self, user_prompt: str) -> tuple[str, List[str]]:
        """Generate the React app code"""
        try:
            print(f"Creating system and human messages for prompt: {user_prompt}")
            
            system_message = SystemMessage(content=self.generate_system_prompt())
            human_message = HumanMessage(content=self.generate_user_prompt(user_prompt))
            
            print("Calling LLM...")
            response = self.llm.invoke([system_message, human_message])
            app_code = response.content
            
            print(f"LLM response received, length: {len(app_code)}")
            
            # Extract used components from the generated code
            used_components = self._extract_used_components(app_code)
            print(f"Extracted {len(used_components)} used components")
            
            return app_code, used_components
            
        except Exception as e:
            print(f"Error in generate_app: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Error generating app: {str(e)}")
    
    def _extract_used_components(self, code: str) -> List[str]:
        """Extract which shadcn components were used in the generated code"""
        used_components = []
        
        for comp_name, comp_info in self.component_parser.components.items():
            for item in comp_info.items:
                if item in code:
                    used_components.append(f"{comp_name}.{item}")
        
        return used_components

# LLM will be initialized in startup event

# Global component parser - will be initialized lazily
COMPONENTS_JSON_PATH = "./components.json"
component_parser = None

def initialize_components():
    """Initialize components and LLM lazily"""
    global component_parser, llm
    
    if component_parser is None:
        try:
            # Try different paths for components.json
            possible_paths = [
                "./components.json",
                "components.json",
                os.path.join(os.path.dirname(__file__), "components.json"),
                os.path.join(os.path.dirname(__file__), "..", "components.json"),
                os.path.join(os.path.dirname(__file__), "..", "..", "components.json")
            ]
            
            components_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    components_path = path
                    print(f"Found components.json at: {path}")
                    break
            
            if components_path is None:
                print(f"Current directory: {os.getcwd()}")
                print(f"Directory contents: {os.listdir('.')}")
                print(f"Available paths: {possible_paths}")
                raise FileNotFoundError("components.json not found in any expected location")
            
            # Initialize component parser
            component_parser = ShadcnComponentParser(components_path)
            print(f"Loaded {len(component_parser.components)} shadcn components")
        except Exception as e:
            print(f"Error loading components: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    if llm is None:
        try:
            # Initialize LLM
            llm = ChatOpenAI(model="gpt-4o", temperature=0.1)
            print("LLM initialized successfully")
        except Exception as e:
            print(f"Error initializing LLM: {e}")
            raise e

@app.on_event("startup")
async def startup_event():
    """Initialize component parser and LLM on startup (for non-Vercel deployments)"""
    initialize_components()

@app.post("/generate-app", response_model=AppGenerationResponse)
async def generate_react_app(request: AppGenerationRequest):
    """
    Generate a React app.jsx file based on user requirements using available shadcn components
    """
    global component_parser, llm
    
    # Initialize components and LLM if not already done
    try:
        initialize_components()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize: {str(e)}")
    
    try:
        print(f"Generating app for prompt: {request.user_prompt}")
        
        # Initialize app generator with global component parser
        app_generator = ReactAppGenerator(llm, component_parser)
        
        # Generate the app
        app_code, used_components = app_generator.generate_app(request.user_prompt)
        
        print(f"Successfully generated app with {len(used_components)} components")
        
        return AppGenerationResponse(
            app_jsx_code=app_code,
            used_components=used_components,
            success=True,
            message="App generated successfully"
        )
        
    except Exception as e:
        print(f"Error generating app: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating app: {str(e)}")

@app.get("/components")
async def get_available_components():
    """
    Get list of available shadcn components
    """
    global component_parser
    
    # Initialize components if not already done
    try:
        initialize_components()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize: {str(e)}")
    
    try:
        return {
            "components": [
                {
                    "name": name,
                    "items": info.items,
                    "props": info.props,
                    "import": info.import_statement
                }
                for name, info in component_parser.components.items()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global component_parser, llm
    
    status = {
        "status": "healthy", 
        "service": "Shadcn React App Generator",
        "components_loaded": component_parser is not None,
        "llm_initialized": llm is not None
    }
    
    if component_parser:
        status["component_count"] = len(component_parser.components)
    
    return status

@app.get("/test-llm")
async def test_llm():
    """Test LLM endpoint"""
    global llm
    
    if llm is None:
        raise HTTPException(status_code=500, detail="LLM not initialized")
    
    try:
        from langchain_core.messages import HumanMessage
        response = llm.invoke([HumanMessage(content="Say 'Hello, LLM is working!'")])
        return {"message": response.content, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM test failed: {str(e)}")

@app.get("/debug-files")
async def debug_files():
    """Debug file system on Vercel"""
    try:
        import os
        from pathlib import Path
        
        debug_info = {
            "current_directory": os.getcwd(),
            "script_directory": os.path.dirname(__file__),
            "parent_directory": os.path.dirname(os.path.dirname(__file__)),
            "files_in_current_dir": os.listdir('.') if os.path.exists('.') else "Directory not found",
            "files_in_script_dir": os.listdir(os.path.dirname(__file__)) if os.path.exists(os.path.dirname(__file__)) else "Directory not found",
            "components_json_exists": os.path.exists("components.json"),
            "components_json_in_current": os.path.exists("./components.json"),
            "components_json_in_script": os.path.exists(os.path.join(os.path.dirname(__file__), "components.json")),
            "components_json_in_parent": os.path.exists(os.path.join(os.path.dirname(__file__), "..", "components.json"))
        }
        
        return debug_info
    except Exception as e:
        return {"error": str(e), "traceback": str(__import__('traceback').format_exc())}

if __name__ == "__main__":
    # Get server configuration from environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"Starting server in {ENVIRONMENT} mode")
    print(f"CORS allowed origins: {allowed_origins}")
    print(f"Server will run on {host}:{port}")
    
    # Run the FastAPI server
    uvicorn.run(app, host=host, port=port)
    