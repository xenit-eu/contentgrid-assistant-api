import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import Depends, FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import APIError
from contentgrid_extension_helpers.middleware.exception_middleware import catch_exceptions_middleware
from contentgrid_extension_helpers.responses.hal import FastAPIHALResponse, FastAPIHALCollection, HALLink, HALLinkFor
from contentgrid_extension_helpers.logging import setup_json_logging
from contentgrid_extension_helpers.problem_response import ProblemResponse

from contentgrid_assistant_api.routers.agent_home import generate_agent_home_router
from contentgrid_assistant_api.config import AssistantExtensionConfig, DatabaseConfig, LangfuseConfig
from contentgrid_assistant_api.types.agents import Agent, AgentHomeResponse
from contentgrid_assistant_api.tracing import setup_langfuse, shutdown_langfuse
from pydantic import HttpUrl


class ContentGridAssistantAPI(FastAPI):
    """Specialized FastAPI application for a ContentGrid Assistant"""
    
    def __init__(self, 
                 extension_config: AssistantExtensionConfig | None = None, 
                 database_config: DatabaseConfig | None = None,
                 langfuse_config: LangfuseConfig | None = None,
                 agents: List[Agent] = [],
                 *args, **kwargs):
        self.extension_config = extension_config or AssistantExtensionConfig()
        self.database_config = database_config or DatabaseConfig()
        self.langfuse_config = langfuse_config or LangfuseConfig()
        
        self._setup_logging()
        super().__init__(*args, lifespan=self._lifespan, **kwargs)
        if not self.extension_config.production:
            self._setup_cors()
        self._setup_hal_response()
        
        self._register_agent_routers(agents)
        self._register_endpoints(agents)
        self._register_middleware()
    
    @property
    def _server_prefix(self) -> str:
        path_prefix = self.extension_config.extension_path_prefix
        if path_prefix:
            if path_prefix.startswith("/"):
                return path_prefix
            else:
                return f"/{path_prefix}"
        else:
            return ""
    
    def _format_problem_type(self, type: str) -> str:
        """Format problem type URL using configured base URL"""
        return f"{self.extension_config.problem_type_base_url}/{type}"
    
    def _setup_logging(self):
        """Configure JSON logging for production environments"""
        if self.extension_config.production:
            setup_json_logging()
    
    @asynccontextmanager
    async def _lifespan(self, app: "ContentGridAssistantAPI"):
        """Manage application lifespan: initialize and shut down Langfuse."""
        setup_langfuse(self.langfuse_config)
        yield
        shutdown_langfuse(self.langfuse_config)
    
    def _setup_cors(self):
        """Configure CORS middleware"""
        self.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_hal_response(self):
        """Initialize HAL response configuration"""
        FastAPIHALResponse.init_app(self)
        FastAPIHALResponse.add_server_url(
            self.extension_config.server_url or f"http://localhost:{self.extension_config.server_port or 8000}"
        )
    
    def _register_agent_routers(self, agents : List[Agent]):
        """Register API routers with authentication"""
        for agent in agents:
            self.include_router(
                generate_agent_home_router(agent, self.extension_config, self.database_config),
                prefix=f"{self.extension_config.extension_path_prefix if self.extension_config.extension_path_prefix else ''}/{agent.name}",
                tags=[agent.name],
                dependencies=[Depends(agent.get_current_user_override)]
            )
    
    def _register_endpoints(self, agents : List[Agent]):
        """Register root and health check endpoints"""
        
        @self.get(f"{self._server_prefix}/health")
        def health_check():
            return "ok"
        
        @self.get(f"{self._server_prefix}/", response_model=FastAPIHALCollection, response_model_exclude_unset=True)
        def get_server_resources(origin: Optional[HttpUrl] = None):
            return FastAPIHALCollection(
                _embedded={
                    "agents" : [
                        AgentHomeResponse(**agent.model_dump(), origin=origin, tags=[agent.name]) for agent in agents
                    ] 
                },
                _links={
                    "self": HALLinkFor(endpoint_function_name="get_server_resources"),
                }
            )
    
    def _register_middleware(self):
        """Register custom middleware for exception handling"""
        self.middleware("http")(self._create_openai_exception_middleware())
        self.middleware("http")(catch_exceptions_middleware)
    
    def _create_openai_exception_middleware(self):
        """Create OpenAI exception middleware with access to config"""
        async def catch_openai_exceptions_middleware(request: Request, call_next):
            """Handle OpenAI API exceptions and convert to problem responses"""
            try:
                return await call_next(request)
            except APIError as e:
                logging.exception(f"OpenAI error: {str(e)}", exc_info=True, stack_info=True)
                if e.code == "unsupported_file":
                    return ProblemResponse(
                        title="File not supported",
                        problem_type=self._format_problem_type("unsupported-file"),
                        detail="Provided file extension is not supported.",
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return ProblemResponse(
                        title="OpenAI error",
                        problem_type=self._format_problem_type("openai-error"),
                        detail="An unexpected OpenAI error occured.",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
        return catch_openai_exceptions_middleware
