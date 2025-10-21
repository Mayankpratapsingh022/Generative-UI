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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3002"
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
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
            system_message = SystemMessage(content=self.generate_system_prompt())
            human_message = HumanMessage(content=self.generate_user_prompt(user_prompt))
            
            response = self.llm.invoke([system_message, human_message])
            app_code = response.content
            
            # Extract used components from the generated code
            used_components = self._extract_used_components(app_code)
            
            return app_code, used_components
            
        except Exception as e:
            raise Exception(f"Error generating app: {str(e)}")
    
    def _extract_used_components(self, code: str) -> List[str]:
        """Extract which shadcn components were used in the generated code"""
        used_components = []
        
        for comp_name, comp_info in self.component_parser.components.items():
            for item in comp_info.items:
                if item in code:
                    used_components.append(f"{comp_name}.{item}")
        
        return used_components

# Initialize OpenAI LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0.1)

# Global component parser - initialized on startup
COMPONENTS_JSON_PATH = "./components.json"
component_parser = None

@app.on_event("startup")
async def startup_event():
    """Initialize component parser on startup"""
    global component_parser
    try:
        component_parser = ShadcnComponentParser(COMPONENTS_JSON_PATH)
        print(f"Loaded {len(component_parser.components)} shadcn components")
    except Exception as e:
        print(f"Error loading components: {e}")
        raise e

@app.post("/generate-app", response_model=AppGenerationResponse)
async def generate_react_app(request: AppGenerationRequest):
    """
    Generate a React app.jsx file based on user requirements using available shadcn components
    """
    global component_parser
    
    if component_parser is None:
        raise HTTPException(status_code=500, detail="Components not loaded. Please restart the server.")
    
    try:
        # Initialize app generator with global component parser
        app_generator = ReactAppGenerator(llm, component_parser)
        
        # Generate the app
        app_code, used_components = app_generator.generate_app(request.user_prompt)
        
        return AppGenerationResponse(
            app_jsx_code=app_code,
            used_components=used_components,
            success=True,
            message="App generated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating app: {str(e)}")

@app.get("/components")
async def get_available_components():
    """
    Get list of available shadcn components
    """
    global component_parser
    
    if component_parser is None:
        raise HTTPException(status_code=500, detail="Components not loaded. Please restart the server.")
    
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
    return {"status": "healthy", "service": "Shadcn React App Generator"}

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000)
    