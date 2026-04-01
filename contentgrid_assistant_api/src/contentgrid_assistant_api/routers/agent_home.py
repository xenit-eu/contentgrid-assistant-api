from fastapi import APIRouter, FastAPI
import os
from fastapi.concurrency import asynccontextmanager
from contentgrid_assistant_api.config import DatabaseConfig, AssistantExtensionConfig, LangfuseConfig
from contentgrid_assistant_api.dependencies import DependencyResolver
from contentgrid_assistant_api.routers.thread_router import generate_agent_thread_router
from contentgrid_assistant_api.types.agents import Agent, AgentHomeResponse

def exit_uvicorn():
    import signal
    # Send interrupt signal (Ctrl+C equivalent) to uvicorn (parent process)
    # This is a bit of a janky way to "gracefully crash" the process, but it should suffice for now.
    os.kill(os.getppid(), signal.SIGINT)


def generate_agent_home_router(
    agent: Agent,
    extension_config: AssistantExtensionConfig,
    database_config: DatabaseConfig,
    langfuse_config: LangfuseConfig | None = None
) -> APIRouter:
    if database_config.pg_dbname == database_config.__class__.model_fields["pg_dbname"].default:
        # Check if the pg_dbname is still the default, if yes use the agent name
        database_config.pg_dbname = agent.name
    
    # Use provided langfuse_config or create default
    langfuse_cfg = langfuse_config or LangfuseConfig()
        
    dep_resolver = DependencyResolver(agent=agent, db_config=database_config)
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if database_config.pg_reinitialize:
            # Clean up the threads and wipe the database
            dep_resolver.db_conn_factory.wipe_database()
        # Lifespan of the fast API router. Code before the yield is executed when the application starts
        # and code after the yield is executed when the application stops.
        dep_resolver.db_conn_factory.create_db_and_tables()
        yield
        
        
    router = APIRouter(lifespan=lifespan, tags=[agent.name])
    router.include_router(generate_agent_thread_router(
        dep_resolver,
        extension_config,
        langfuse_config=langfuse_cfg,
        agent_name=agent.name,
        tags=[agent.name]
    ))
    
    @router.get("/", response_model=AgentHomeResponse, response_model_exclude_unset=True)
    def get_agent_home():
        return AgentHomeResponse(**agent.model_dump(), tags=[agent.name])

    return router