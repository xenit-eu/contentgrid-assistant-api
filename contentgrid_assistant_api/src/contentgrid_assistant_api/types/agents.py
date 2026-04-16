
from typing import Any, Callable, List, Optional
from enum import Enum
import uuid
from pydantic import BaseModel, Field, ConfigDict, HttpUrl
from langchain.tools import BaseTool
from contentgrid_extension_helpers.responses.hal import FastAPIHALResponse, FastAPIHALCollection, HALLinkFor
from contentgrid_assistant_api.types.context import DefaultThreadContext

class Agent(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name : str = "Default agent name"
    version : str = "v0"
    get_agent_override : Callable[..., Any] = Field(exclude=True, default_factory=lambda x : None) # used to override the get agent dependency
    get_current_user_override : Callable[..., Any] = Field(exclude=True, default_factory=lambda x : None) # used to override authentication
    thread_context : type = Field(exclude=True, default=DefaultThreadContext)
    # Function that accepts the thread_context and returns the tools.
    # We do this dynamically because tools could be generated based on the context (like based on the origin profile)
    get_tools : Callable[..., List[BaseTool]] = Field(exclude=True, default=lambda _ : [])
    
    
class AgentHomeResponse(FastAPIHALResponse):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    name : str
    version : str
    
    def __init__(self, origin: Optional[HttpUrl] = None, tags: Optional[List[str | Enum]] = None, **kwargs):
        super().__init__(**kwargs)
        params = {"origin": str(origin)} if origin else {}
        self.links = {
            "self": HALLinkFor(endpoint_function_name="get_agent_home", params=params, tags=tags),
            "threads": HALLinkFor(endpoint_function_name="read_threads",   params=params, tags=tags),
        }
    
class AgentToolResponse(FastAPIHALResponse):
    name : str
    description : str
    args : dict
        
class AgentToolCollectionResponse(FastAPIHALCollection[AgentToolResponse]):
    thread_id : uuid.UUID
    
    def __init__(self, tags: Optional[List[str | Enum]]=None, **kwargs):
        super().__init__(**kwargs)
        self.links = {
            "self": HALLinkFor(endpoint_function_name="get_thread_tools", tags=tags, templated=False, path_params=lambda instance: {"thread_id": instance.thread_id}),
            "thread": HALLinkFor(endpoint_function_name="read_thread", tags=tags, templated=False, path_params=lambda instance: {"thread_id": instance.thread_id}),
        }

    