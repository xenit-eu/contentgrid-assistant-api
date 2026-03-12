"""
Test suite for the tools endpoint.
Tests that tools are returned with proper schemas and descriptions.
"""
import pytest
from fastapi.testclient import TestClient
from contentgrid_assistant_api.app import ContentGridAssistantAPI
from contentgrid_assistant_api.types.agents import Agent
from contentgrid_assistant_api.config import AssistantExtensionConfig, DatabaseConfig
from contentgrid_extension_helpers.authentication.user import ContentGridUser
from contentgrid_assistant_api.types.context import DefaultThreadContext
from mock_agent import compile_mock_agent
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from typing import Optional, List


# Define test tools with Pydantic schemas
class SearchInput(BaseModel):
    """Input schema for search tool"""
    query: str = Field(
        description="The search query to execute",
        min_length=1,
        max_length=500
    )
    limit: int = Field(
        default=10,
        description="Maximum number of results to return",
        ge=1,
        le=100
    )
    filters: Optional[List[str]] = Field(
        default=None,
        description="Optional filters to apply to search results"
    )


@tool("search", args_schema=SearchInput)
def search_tool(query: str, limit: int = 10, filters: Optional[List[str]] = None) -> str:
    """Search for information using a query string with optional filters and result limits"""
    return f"Searching for '{query}' with limit {limit}"


class CalculateInput(BaseModel):
    """Input schema for calculate tool"""
    expression: str = Field(
        description="Mathematical expression to calculate (e.g., '2 + 2 * 3')",
        min_length=1,
        max_length=100
    )
    precision: int = Field(
        default=2,
        description="Number of decimal places for the result",
        ge=0,
        le=10
    )


@tool("calculate", args_schema=CalculateInput)
def calculate_tool(expression: str, precision: int = 2) -> str:
    """Calculate mathematical expressions with configurable precision"""
    return f"Result of {expression}"


@tool("increment")
def increment_tool(number: int) -> int:
    """Increment a number by one"""
    return number + 1


test_tools = [search_tool, calculate_tool, increment_tool]


# Test users
TEST_USER = ContentGridUser(**{
    "sub": "test_user_sub",
    "iss": "test_issuer",
    "exp": 9999999999,
    "name": "Test User",
    "email": "test@example.com",
    "access_token": "test_token",
    "context:application:domains": [],
    "context:application:id": "test_app_123"
})

OTHER_USER = ContentGridUser(**{
    "sub": "other_user_sub",
    "iss": "test_issuer",
    "exp": 9999999999,
    "name": "Other User",
    "email": "other@example.com",
    "access_token": "other_token",
    "context:application:domains": [],
    "context:application:id": "test_app_123"
})


class TestToolsEndpoint:
    """Test suite for the tools endpoint"""
    
    @pytest.fixture(scope="class")
    def app_config(self):
        """Configure application for testing with SQLite"""
        extension_config = AssistantExtensionConfig(
            production=False,
            server_port=8000,
            server_url="http://localhost:8000",
            opening_message="Test message",
            extension_path_prefix="/test"
        )
        
        db_config = DatabaseConfig(
            use_sqlite_db=True,
            pg_reinitialize=True
        )
        
        return extension_config, db_config
    
    @pytest.fixture(scope="class")
    def current_user_store(self):
        """Store for managing current user context in tests"""
        return {"user": TEST_USER}
    
    @pytest.fixture(scope="class")
    def test_app(self, app_config, current_user_store):
        """Create test FastAPI application with custom tools"""
        extension_config, db_config = app_config
        
        def get_current_user() -> ContentGridUser:
            """Dynamic user provider that returns user from store"""
            return current_user_store["user"]
        
        def get_tools(context) -> List:
            """Return test tools"""
            return test_tools
        
        agents = [
            Agent(
                name="test_agent",
                version="v1.0.0",
                get_current_user_override=get_current_user,
                get_agent_override=compile_mock_agent,
                thread_context=DefaultThreadContext,
                get_tools=get_tools
            )
        ]
        
        app = ContentGridAssistantAPI(
            extension_config=extension_config,
            database_config=db_config,
            agents=agents
        )
        
        return app
    
    @pytest.fixture(scope="class")
    def client(self, test_app):
        """Create test client with lifespan enabled"""
        with TestClient(test_app) as client:
            yield client
    
    @pytest.fixture
    def thread_id(self, client, current_user_store):
        """Create a thread and return its ID"""
        current_user_store["user"] = TEST_USER
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        return create_response.json()["id"]
    
    @pytest.fixture
    def tools_response(self, client, thread_id):
        """Get tools for a thread"""
        response = client.get(f"/test/test_agent/threads/{thread_id}/tools")
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture
    def tools(self, tools_response):
        """Extract tools list from response"""
        return tools_response["_embedded"]["tools"]
    
    @pytest.fixture
    def search_tool_schema(self, tools):
        """Get the search tool from tools list"""
        return next(t for t in tools if t["name"] == "search")
    
    @pytest.fixture
    def calculate_tool_schema(self, tools):
        """Get the calculate tool from tools list"""
        return next(t for t in tools if t["name"] == "calculate")
    
    @pytest.fixture
    def increment_tool_schema(self, tools):
        """Get the increment tool from tools list"""
        return next(t for t in tools if t["name"] == "increment")
    
    def test_get_tools_for_thread(self, tools):
        """Test retrieving tools for a thread"""
        assert len(tools) == 3
        
        tool_names = [tool["name"] for tool in tools]
        assert "search" in tool_names
        assert "calculate" in tool_names
        assert "increment" in tool_names
    
    def test_tools_include_descriptions(self, search_tool_schema, calculate_tool_schema):
        """Test that tools include descriptions"""
        assert "Search for information" in search_tool_schema["description"]
        assert "Calculate mathematical expressions" in calculate_tool_schema["description"]
    
    def test_tools_include_json_schema(self, search_tool_schema):
        """Test that tools include JSON schema for arguments"""
        assert "args" in search_tool_schema
        schema = search_tool_schema["args"]
        assert "type" in schema
        assert schema["type"] == "object"
        assert "properties" in schema
        assert "required" in schema
    
    def test_schema_includes_field_descriptions(self, search_tool_schema):
        """Test that schema includes field descriptions"""
        schema = search_tool_schema["args"]
        
        assert "query" in schema["properties"]
        assert "description" in schema["properties"]["query"]
        assert "search query" in schema["properties"]["query"]["description"].lower()
        
        assert "limit" in schema["properties"]
        assert "description" in schema["properties"]["limit"]
        assert "maximum number of results" in schema["properties"]["limit"]["description"].lower()
    
    def test_schema_includes_validation_rules(self, search_tool_schema):
        """Test that schema includes validation rules"""
        schema = search_tool_schema["args"]
        
        # Check validation rules for query field
        query_schema = schema["properties"]["query"]
        assert "minLength" in query_schema
        assert query_schema["minLength"] == 1
        assert "maxLength" in query_schema
        assert query_schema["maxLength"] == 500
        
        # Check validation rules for limit field
        limit_schema = schema["properties"]["limit"]
        assert "minimum" in limit_schema or "exclusiveMinimum" in limit_schema
        assert "maximum" in limit_schema
        assert limit_schema["maximum"] == 100
    
    def test_schema_includes_defaults(self, search_tool_schema):
        """Test that schema includes default values"""
        schema = search_tool_schema["args"]
        
        limit_schema = schema["properties"]["limit"]
        assert "default" in limit_schema
        assert limit_schema["default"] == 10
    
    def test_required_fields_in_schema(self, search_tool_schema):
        """Test that schema includes required fields"""
        schema = search_tool_schema["args"]
        
        # Query should be required
        assert "query" in schema["required"]
        # Limit and filters should not be required (they have defaults)
        assert "limit" not in schema["required"]
        assert "filters" not in schema["required"]
    
    def test_tools_endpoint_respects_user_isolation(self, client, current_user_store):
        """Test that tools endpoint respects user isolation"""
        # User 1 creates a thread
        current_user_store["user"] = TEST_USER
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # User 1 can get tools
        tools_response = client.get(f"/test/test_agent/threads/{thread_id}/tools")
        assert tools_response.status_code == 200
        
        # User 2 tries to get tools for User 1's thread
        current_user_store["user"] = OTHER_USER
        tools_response = client.get(f"/test/test_agent/threads/{thread_id}/tools")
        assert tools_response.status_code == 404
    
    def test_tools_response_structure(self, tools_response):
        """Test the complete structure of the tools response"""
        # Check HAL structure
        assert "_embedded" in tools_response
        assert "_links" in tools_response
        
        # Check links
        links = tools_response["_links"]
        assert "self" in links
        assert "thread" in links
    
    def test_simple_tool_schema_includes_number_field(self, increment_tool_schema):
        """Test that simple tool schema includes the number field"""
        assert "args" in increment_tool_schema
        schema = increment_tool_schema["args"]
        assert "properties" in schema
        assert "number" in schema["properties"]
        
        # Check number field details
        number_schema = schema["properties"]["number"]
        assert "type" in number_schema
        assert number_schema["type"] == "integer"
        
        # Check it's in required fields
        assert "required" in schema
        assert "number" in schema["required"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
