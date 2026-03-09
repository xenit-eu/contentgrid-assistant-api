# ContentGrid Assistant API

A FastAPI framework for building conversational AI assistants with LangGraph integration, designed for the ContentGrid ecosystem.

## Overview

ContentGrid Assistant API provides a comprehensive framework for creating multi-agent conversational assistants with persistent chat threads, streaming responses, and HAL (Hypertext Application Language) compliant REST APIs. Built on FastAPI and LangGraph, it offers a structured approach to deploying AI agents with built-in authentication, database persistence, and tool calling capabilities.

## Key Features

- **Multi-Agent Architecture**: Support for multiple independent agents with their own tools and configurations
- **Thread-Based Conversations**: Persistent conversation threads with PostgreSQL or SQLite storage
- **LangGraph Integration**: Built-in checkpoint persistence and state management for complex agent workflows
- **Streaming Support**: Real-time streaming responses for interactive chat experiences
- **HAL REST APIs**: Hypermedia-driven APIs following HAL specification for discoverability
- **Authentication**: Integrated ContentGrid user authentication and authorization
- **File Upload Support**: Handle images, audio, PDFs, and other file attachments in conversations
- **Tool Calling**: Built-in support for LangChain tools with automatic execution and response handling
- **Database Flexibility**: PostgreSQL for production or SQLite for development/testing
- **CORS & Middleware**: Configurable CORS and exception handling middleware

## Architecture

### Core Components

- **ContentGridAssistantAPI**: Specialized FastAPI application with pre-configured routes and middleware
- **Agent**: Configurable agent with custom tools, authentication, and context management
- **Thread Management**: CRUD operations for conversation threads with user isolation
- **Message Handling**: Support for Human, AI, System, and Tool messages with content blocks
- **Dependency Injection**: Structured dependency resolution for database, authentication, and agent access

### API Structure

```
/{agent_name}/
  ├── GET /               # Agent home with HAL links
  ├── GET /tools          # List available agent tools
  └── /threads
      ├── GET /           # List user's threads
      ├── POST /          # Create new thread
      └── /{thread_id}
          ├── GET /       # Get thread details
          ├── PATCH /     # Update thread
          ├── DELETE /    # Delete thread
          └── /messages
              ├── GET /   # List messages in thread
              └── POST /  # Add message to thread (supports streaming)
```

## Installation

```bash
pip install contentgrid-assistant-api
```

Or install from source:

```bash
git clone <repository-url>
cd contentgrid-assistant-api/contentgrid_assistant_api
pip install -e .
```

## Quick Start

```python
from contentgrid_assistant_api.app import ContentGridAssistantAPI
from contentgrid_assistant_api.types.agents import Agent
from contentgrid_extension_helpers.authentication.user import ContentGridUser

def get_current_user() -> ContentGridUser:
    # Implement your authentication logic
    return ContentGridUser(...)

def compile_my_agent(checkpointer):
    # Return your LangGraph compiled agent
    return compiled_graph

agents = [
    Agent(
        name="my_agent",
        version="v1.0.0",
        get_current_user_override=get_current_user,
        get_agent_override=compile_my_agent,
        tools=my_tools
    )
]

app = ContentGridAssistantAPI(agents=agents)
```

## How to Use the Library

### Step 1: Create Your Tools

Define tools that your agent can use. Tools are LangChain-compatible functions decorated with `@tool`:

```python
from langchain_core.tools import tool

@tool("get_weather")
def get_weather(location: str) -> str:
    """Get the current weather for a location"""
    # Your implementation
    return f"Weather in {location}: Sunny, 72°F"

@tool("send_message")
def send_message(recipient: str, message: str) -> str:
    """Send a message to a recipient"""
    # Your implementation
    return f"Message sent to {recipient}"

tools = [get_weather, send_message]
```

### Step 2: Define Agent Context

Create a context class that extends `AgentState` to hold thread-specific data:

```python
from langgraph.graph import MessagesState

class ThreadContext(MessagesState):
    """Context for your agent's conversation thread"""
    user_id: str = None
    conversation_type: str = None
    # Add any other context fields your agent needs
    pass
```

### Step 3: Create the LLM Model

Initialize your language model using your preferred provider (OpenAI, Anthropic, Google, etc.):

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(
    model="gpt-4o",
    api_key="your-api-key"
)
model_with_tools = model.bind_tools(tools, parallel_tool_calls=False)
```

### Step 4: Build the Agent Graph

Create a LangGraph state graph that defines your agent's workflow:

```python
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage, AIMessage
import typing

class AgentState(MessagesState):
    pass

tool_node = ToolNode(tools)

@typing.no_type_check
def llm_call(state: AgentState) -> AgentState:
    """Call the LLM with the current conversation"""
    system_prompt = "You are a helpful assistant"
    messages = state['messages']
    
    new_message = model_with_tools.invoke(
        [SystemMessage(content=system_prompt)] + messages
    )
    
    state['messages'] = [new_message]
    return state

def should_continue(state: AgentState):
    """Decide if we should call tools or end"""
    messages = state["messages"]
    last_message = messages[-1]
    
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tool_node"
    return END

# Build the graph
agent_builder = StateGraph(MessagesState, context_schema=ThreadContext)
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_node("tool_node", tool_node)
agent_builder.add_edge(START, "llm_call")
agent_builder.add_conditional_edges("llm_call", should_continue, ["tool_node", END])
agent_builder.add_edge("tool_node", "llm_call")

def compile_my_agent(checkpointer):
    """Compile the agent with checkpointer for persistence"""
    if checkpointer:
        return agent_builder.compile(checkpointer=checkpointer)
    return agent_builder.compile()
```

### Step 5: Initialize the Application

Create your FastAPI application with one or more agents:

```python
from contentgrid_assistant_api.app import ContentGridAssistantAPI
from contentgrid_assistant_api.types.agents import Agent
from contentgrid_extension_helpers.authentication.user import ContentGridUser

def get_current_user() -> ContentGridUser:
    """Provide authentication context"""
    return ContentGridUser(
        ...
    )

agents = [
    Agent(
        name="my_assistant",
        version="v1.0.0",
        get_current_user_override=get_current_user,
        get_agent_override=compile_my_agent,
        thread_context=ThreadContext,
        tools=tools
    )
]

app = ContentGridAssistantAPI(agents=agents)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

### Step 6: Using the API

The API provides REST endpoints for each agent. All requests require authentication via the ContentGrid user context. The endpoints follow this pattern: `/api/{agent_name}/...`

**Thread Management:**
- `POST /api/{agent_name}/threads` - Create a new conversation thread
- `GET /api/{agent_name}/threads` - List all threads for the current user (with pagination)
- `GET /api/{agent_name}/threads/{thread_id}` - Retrieve a specific thread
- `PATCH /api/{agent_name}/threads/{thread_id}` - Update thread metadata
- `DELETE /api/{agent_name}/threads/{thread_id}` - Delete a thread

**Message Management:**
- `GET /api/{agent_name}/threads/{thread_id}/messages` - Retrieve all messages in a thread
- `POST /api/{agent_name}/threads/{thread_id}/messages` - Send a message to the agent

The message endpoint supports two modes:
- **Non-streaming**: Returns the human message immediately while the agent response is processed in the background
- **Streaming**: Stream the agent's response in real-time by including the `Accept: text/event-stream` header. The response is sent as server-sent events (SSE) with message chunks and completion signals

**File Uploads:**
When posting a message, you can optionally attach a file. 
The file content is automatically converted into appropriate content blocks and sent to the agent for analysis.

### Example: Multi-Agent Server

See `example_server/server.py` for a complete example with multiple agents:

```python
from agents.joke_agent.agent import compile_joke_agent
from agents.order_agent.agent import compile_order_agent
# ... imports ...

agents = [
    Agent(name="joker", version="v0.0.0", 
          get_current_user_override=get_dummy_user,
          get_agent_override=compile_joke_agent,
          thread_context=ThreadContext,
          tools=joke_tools),
    Agent(name="order_bot", version="v0.0.0",
          get_current_user_override=get_dummy_user,
          get_agent_override=compile_order_agent,
          thread_context=OrderThreadContext,
          tools=order_tools)
]

app = ContentGridAssistantAPI(agents=agents)
```

This creates two separate conversation assistants accessible at:
- `/api/joker/threads` - For the joke agent
- `/api/order_bot/threads` - For the order agent

## Configuration

### Environment Variables

Configure via `.env` file or environment variables:

```bash
# Server Configuration
SERVER_PORT=8000
SERVER_URL=http://localhost:8000
PRODUCTION=false
WEB_CONCURRENCY=1

# Database Configuration
PG_DBNAME=assistant
PG_USER=assistant
PG_PASSWD=assistant
PG_HOST=postgres
PG_PORT=5432
USE_SQLITE_DB=false

# Assistant Configuration
GRAPH_RECURSION_LIMIT=100
OPENING_MESSAGE="Hello! How can I help you today?"

# Path Configuration
EXTENSION_PATH_PREFIX=/api
```

### Configuration Classes

- **AssistantExtensionConfig**: Application-level configuration
- **DatabaseConfig**: Database connection and initialization settings

## Message Types

The API supports rich message content including:

- **Text**: Plain text messages
- **Images**: Base64-encoded images with MIME type
- **Audio**: Audio file attachments
- **Files**: PDF and other document attachments
- **Tool Calls**: Agent tool invocations and responses

## Database Schema

### Threads Table
- `id`: UUID primary key
- `name`: Thread name
- `origin`: Optional origin URL/identifier
- `component`: Component type (default: datamodel)
- `user_sub`: User subject identifier
- `created_at`: Timestamp

### Messages
Messages are stored in LangGraph's checkpoint system with support for:
- Conversation history
- Tool call results
- State snapshots
- Rollback capabilities

## Development

### Running Tests

```bash
cd contentgrid_assistant_api
pytest
```

## License

See LICENSE file for details.

## Author

Ranec Belpaire (ranec.belpaire@xenit.eu)
