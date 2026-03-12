from typing import Optional
from langchain.agents import AgentState
from contentgrid_extension_helpers.authentication import ContentGridUser

class DefaultThreadContext(AgentState):
    user: ContentGridUser
    thread_id : str
    origin: Optional[str]
    