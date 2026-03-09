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

### Test Server

See `tests/server/server.py` for example implementations with multiple agents.

## License

See LICENSE file for details.

## Author

Ranec Belpaire (ranec.belpaire@xenit.eu)
