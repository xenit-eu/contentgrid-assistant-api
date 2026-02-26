"""
Mock agent for testing that doesn't require LLM calls.
Returns fixed responses without making external API calls.
"""
from langgraph.graph import StateGraph, START, END
from langgraph.graph import MessagesState
from langchain_core.messages import AIMessage


class MockAgentState(MessagesState):
    """Mock agent state - same as MessagesState"""
    pass


def mock_llm_call(state: MockAgentState) -> MockAgentState:
    """Mock LLM call that returns a fixed response"""
    conversation = state['messages']
    
    # Return a simple fixed response
    new_message = AIMessage(
        content="This is a mock response from the test agent.",
        name="test_agent"
    )
    
    state['messages'] = [new_message]
    return state


def compile_mock_agent(checkpointer=None):
    """
    Compile a mock agent that returns fixed responses.
    This agent never makes external API calls.
    """
    # Build workflow
    agent_builder = StateGraph(MockAgentState)
    
    # Add single node that returns fixed response
    agent_builder.add_node("mock_llm", mock_llm_call)
    
    # Simple flow: start -> mock_llm -> end
    agent_builder.add_edge(START, "mock_llm")
    agent_builder.add_edge("mock_llm", END)
    
    if checkpointer:
        return agent_builder.compile(checkpointer=checkpointer)
    else:
        return agent_builder.compile()
