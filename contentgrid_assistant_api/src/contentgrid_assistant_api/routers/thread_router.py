
from enum import Enum
from typing import Annotated, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from pydantic import HttpUrl

from contentgrid_assistant_api.db.repositories.thread import ThreadRepository
from contentgrid_assistant_api.db.types.thread import ThreadRead, ThreadUpdate
from contentgrid_assistant_api.dependencies import DependencyResolver
from contentgrid_extension_helpers.responses.hal import FastAPIHALCollection, HALLinkFor, HALTemplateFor
from contentgrid_extension_helpers.authentication import ContentGridUser
from contentgrid_assistant_api.routers.message_router import generate_agent_message_router
from langchain.messages import HumanMessage
from langgraph.graph.state import CompiledStateGraph
from contentgrid_assistant_api.config import AssistantExtensionConfig
    
def generate_agent_thread_router(dep_resolver: DependencyResolver, extension_config: AssistantExtensionConfig, tags: Optional[List[str | Enum]]=None):
    threadrouter = APIRouter(prefix=extension_config.routes_thread_prefix, tags=tags or ["threads"])

    threadrouter.include_router(
        generate_agent_message_router(dep_resolver, extension_config, tags=tags)
    )

    @threadrouter.post("/", response_model=ThreadRead, response_model_exclude_none=True)
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
        agent.invoke(
            {"messages": messages},
            {"configurable": context}, #type: ignore
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

    @threadrouter.delete("/{thread_id}")
    def delete_thread(
        thread_id: uuid.UUID,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency())
    ):
        """Delete thread"""
        thread_repo.delete_for_user(thread_id, user)
        return {"message": "Thread deleted successfully"}
    
    return threadrouter