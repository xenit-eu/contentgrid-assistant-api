from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, UsageMetadata
from contentgrid_extension_helpers.responses.hal import FastAPIHALResponse
from pydantic import Field


class BaseHALMessage(FastAPIHALResponse):
    hidden : bool = False
    additional_kwargs: dict = Field(exclude=True) # exclude removes the output from the serialization
    response_metadata: dict = Field(exclude=True)

    def get(self, key, default=None):
        """Add get method for compatibility with LangChain validation"""
        return getattr(self, key, default)
    
class HALHumanMessage(BaseHALMessage, HumanMessage):
    pass
        
class HALAIMessage(BaseHALMessage, AIMessage):
    usage_metadata: UsageMetadata | None = Field(exclude=True)
        
class HALSystemMessage(BaseHALMessage, SystemMessage):
    hidden : bool = True

class HALToolMessage(BaseHALMessage, ToolMessage):
    pass