
from typing import Any, Callable, List, Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
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
    tools : List[BaseTool] = Field(exclude=True, default=[])
    
    
class AgentHomeResponse(FastAPIHALResponse):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name : str
    version : str
    # tools : List[BaseTool] = Field(exclude=True, default=[])
    
    def __init__(self, tags: Optional[List[str | Enum]]=None, **kwargs):
        super().__init__(**kwargs)
        self.links = {
            "self" : HALLinkFor(endpoint_function_name="get_agent_home", tags=tags),
            "threads" : HALLinkFor(endpoint_function_name="read_threads", tags=tags),
            "tools" : HALLinkFor(endpoint_function_name="get_agent_tools", tags=tags),
        }
    
class AgentToolResponse(FastAPIHALResponse):
    name : str
    description : str
    
    #TODO add halforms templates here to disable or enable tools
    
class AgentToolCollectionResponse(FastAPIHALCollection[AgentToolResponse]):
    
    def __init__(self, tags: Optional[List[str | Enum]]=None, **kwargs):
        super().__init__(**kwargs)
        self.links = {
            "self" : HALLinkFor(endpoint_function_name="get_agent_tools", tags=tags),
            "agent": HALLinkFor(endpoint_function_name="get_agent_home", tags=tags)
        }

    