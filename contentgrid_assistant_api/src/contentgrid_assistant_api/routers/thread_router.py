
from enum import Enum
from typing import Annotated, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from pydantic import HttpUrl

from contentgrid_assistant_api.db.repositories.thread_repository import ThreadRepository
from contentgrid_assistant_api.db.types.thread import ThreadRead, ThreadUpdate
from contentgrid_assistant_api.dependencies import DependencyResolver
from contentgrid_extension_helpers.responses.hal import FastAPIHALCollection, HALLinkFor, HALTemplateFor
from contentgrid_extension_helpers.authentication import ContentGridUser
from contentgrid_assistant_api.routers.message_router import generate_agent_message_router
from contentgrid_assistant_api.types.agents import AgentToolCollectionResponse, AgentToolResponse
from contentgrid_assistant_api.types.context import DefaultThreadContext
from langchain.messages import HumanMessage
from langgraph.graph.state import CompiledStateGraph
from contentgrid_assistant_api.config import AssistantExtensionConfig, LangfuseConfig
import logging


def _create_langfuse_config_for_thread(
    thread_id: str,
    user: ContentGridUser,
    agent_name: str,
    langfuse_config: LangfuseConfig
) -> dict:
    """Create LangChain config with Langfuse callback handler for thread creation."""
    config: dict = {}
    
    if langfuse_config.is_configured:
        try:
            from langfuse.langchain import CallbackHandler
            
            langfuse_handler = CallbackHandler()
            config["callbacks"] = [langfuse_handler]
            config["metadata"] = {
                "langfuse_session_id": thread_id,
                "langfuse_user_id": user.sub,
                "langfuse_tags": [agent_name, "thread-creation"]
            }
        except ImportError:
            logging.warning("Langfuse not installed, tracing disabled")
        except Exception as e:
            logging.warning(f"Failed to create Langfuse handler: {e}")
    
    return config


def generate_agent_thread_router(
    dep_resolver: DependencyResolver,
    extension_config: AssistantExtensionConfig,
    langfuse_config: LangfuseConfig | None = None,
    agent_name: str = "agent",
    tags: Optional[List[str | Enum]] = None
):
    # Use provided langfuse_config or create default
    langfuse_cfg = langfuse_config or LangfuseConfig()
    
    threadrouter = APIRouter(prefix=extension_config.routes_thread_prefix, tags=tags or ["threads"])

    threadrouter.include_router(
        generate_agent_message_router(
            dep_resolver,
            extension_config,
            langfuse_config=langfuse_cfg,
            agent_name=agent_name,
            tags=tags
        )
    )

    @threadrouter.post("/", response_model=ThreadRead, status_code=status.HTTP_201_CREATED, response_model_exclude_none=True)
    def create_thread(
        origin: Optional[HttpUrl] = None,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency()),
        agent : CompiledStateGraph = Depends(dep_resolver.get_agent_dependency())
    ):
        """Create new thread"""
        
        thread_id = uuid.uuid4()
        messages = [HumanMessage(content=extension_config.opening_message)]
        context = dep_resolver.agent.thread_context(thread_id=str(thread_id), user=user, origin=origin)
        
        # Create Langfuse config for thread creation tracing
        lf_config = _create_langfuse_config_for_thread(str(thread_id), user, agent_name, langfuse_cfg)
        invoke_config = {
            "configurable": context,
            **lf_config
        }
        
        agent.invoke(
            {"messages": messages},
            invoke_config, #type: ignore
            context=context, #type: ignore
        )
        
        created_thread = thread_repo.create(user=user, origin=origin, component="datamodel", thread_id=thread_id)
        return ThreadRead(**created_thread.model_dump(), tags=tags)

    @threadrouter.get("/", response_model=FastAPIHALCollection, response_model_exclude_none=True)
    def read_threads(
        origin: Optional[HttpUrl] = None,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency()),
        offset: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
    ):
        """Get all threads with pagination"""
        threads = []
        if origin:
            threads = thread_repo.get_all_for_user_and_origin(user, origin, offset=offset, limit=limit)
        else:
            threads = thread_repo.get_all_for_user(user, offset=offset, limit=limit)
        thread_reads = [ThreadRead(**thread.model_dump(), tags=tags) for thread in threads]
        return FastAPIHALCollection[ThreadRead](
            _embedded={"threads" : thread_reads}, 
            _links={"self": HALLinkFor(endpoint_function_name="read_threads", tags=tags, templated=True, params={"offset": offset, "limit": limit})},
            _templates={"startThread": HALTemplateFor(endpoint_function_name="create_thread", tags=tags, params={"origin": origin.encoded_string()} if origin else {})},
        )

    @threadrouter.get("/{thread_id}", response_model=ThreadRead, response_model_exclude_none=True)
    def read_thread(
        thread_id: uuid.UUID,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency())
    ):
        """Get thread by ID"""
        thread = thread_repo.get_by_id_for_user(thread_id, user)
        return ThreadRead(**thread.model_dump(), tags=tags)

    @threadrouter.get("/{thread_id}/tools", response_model=AgentToolCollectionResponse, response_model_exclude_none=True)
    def get_thread_tools(
        thread_id: uuid.UUID,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency()),
        thread_context: DefaultThreadContext = Depends(dep_resolver.get_thread_context_dependency())
    ):
        """Get available tools for a thread"""
        tools_list = dep_resolver.agent.get_tools(thread_context)
        
        # Extract tool information including schema
        tool_responses = []
        for tool in tools_list:
            tool_dict = tool.model_dump()
            
            # Extract schema if args_schema is available
            if hasattr(tool, 'args_schema') and tool.args_schema:
                try:
                    # Get JSON schema from Pydantic model
                    tool_dict['args'] = tool.args_schema.model_json_schema()
                except (AttributeError, Exception):
                    # Fallback if schema doesn't exist or can't be extracted
                    tool_dict['args'] = {}
            else:
                tool_dict['args'] = {}
            
            tool_responses.append(AgentToolResponse(**tool_dict))
        
        return AgentToolCollectionResponse(thread_id=thread_id, _embedded={"tools": tool_responses}, tags=tags)

    @threadrouter.patch("/{thread_id}", response_model=ThreadRead, response_model_exclude_none=True)
    def update_thread(
        thread_id: uuid.UUID,
        thread_update: ThreadUpdate,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency())
    ):
        """Update thread"""
        updated_thread = thread_repo.update_for_user(thread_id, thread_update, user)
        return ThreadRead(**updated_thread.model_dump(), tags=tags)

    @threadrouter.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_thread(
        thread_id: uuid.UUID,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency())
    ):
        """Delete thread"""
        thread_repo.delete_for_user(thread_id, user)
    
    return threadrouter