from contentgrid_assistant_api.app import ContentGridAssistantAPI
from contentgrid_assistant_api.types.agents import Agent


from contentgrid_extension_helpers.authentication.user import ContentGridUser
from agents.joke_agent.agent import compile_joke_agent
from agents.joke_agent.tools import tools as joke_tools
from agents.joke_agent.context import ThreadContext

from agents.order_agent.agent import compile_order_agent
from agents.order_agent.tools import tools as order_tools
from agents.order_agent.context import ThreadContext as OrderThreadContext

def get_dummy_user() -> ContentGridUser:
    """Get a dummy ContentGridUser instance for testing purposes"""
    return ContentGridUser(
        access_token="token_123",
        email="robot@example.com",
        exp=5,
        iss="iss_123",
        name="r_example",
        sub="sub_123"
    )


agents = [
    Agent(name="joker",
          version="v0.0.0",
          get_current_user_override=get_dummy_user,
          get_agent_override=compile_joke_agent,
          thread_context=ThreadContext,
          tools=joke_tools
    ),
    Agent(name="order",
          version="v0.0.0",
          get_current_user_override=get_dummy_user,
          get_agent_override=compile_order_agent,
          thread_context=OrderThreadContext,
          tools=order_tools
    )
    
]
app = ContentGridAssistantAPI(agents=agents)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5003, reload=False)
