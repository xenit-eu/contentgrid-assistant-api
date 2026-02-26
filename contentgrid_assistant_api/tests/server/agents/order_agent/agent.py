import json
import logging
from typing import Literal
import typing
from langgraph.graph import StateGraph, START, END
from agents.llms import init_langchain_model
from agents.llms import providerconfig
from agents.order_agent.context import ThreadContext
from agents.order_agent.tools import tools
from agents.order_agent.prompt import prompt
from langgraph.prebuilt import ToolNode
from langgraph.graph import MessagesState
from langgraph.runtime import Runtime
from langchain_core.messages import AIMessage, SystemMessage
from langgraph.types import CachePolicy
from contentgrid_extension_helpers.exceptions import LLMDenyException
from contentgrid_hal_client.exceptions import Unauthorized

# MessagesState contains the default messages key with a list of AnyMessages. So accessing the conversation can be done through state['messages']
class AgentState(MessagesState):
    pass

model = init_langchain_model(providerconfig.llm_provider)
tools_by_name = {tool.name: tool for tool in tools}
model_with_tools = model.bind_tools(tools, parallel_tool_calls=False)
tool_node = ToolNode(tools)

@typing.no_type_check
def llm_call(state: AgentState) -> AgentState: 
    """LLM decides whether to call a tool or not"""
    conversation = state['messages']
    
    system_prompt = prompt
        
    new_messages = [model_with_tools.invoke(
        [
            SystemMessage(
                content=system_prompt
            ),
        ] + conversation
    )]
    
    state['messages'] = new_messages
    
    return state

# Conditional edge function to route to the tool node or end based upon whether the LLM made a tool call
def should_continue(state: AgentState) -> Literal["tool_node", END]: # type: ignore
    """Decide if we should continue the loop or stop based upon whether the LLM made a tool call"""

    messages = state["messages"]
    last_message = messages[-1]

    # If the LLM makes a tool call, then perform an action
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tool_node"

    # Otherwise, we stop (reply to the user)
    return END

# Build workflow
agent_builder = StateGraph(AgentState, context_schema=ThreadContext)

# Add nodes
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_node("tool_node", tool_node)
# Add edges to connect nodes
agent_builder.add_edge(START, "llm_call")
agent_builder.add_conditional_edges(
    "llm_call",
    should_continue,
    ["tool_node", END]
)
agent_builder.add_edge("tool_node", "llm_call")

def compile_order_agent(checkpointer):
    if checkpointer:
        return agent_builder.compile(checkpointer=checkpointer)
    else:
        return agent_builder.compile()
