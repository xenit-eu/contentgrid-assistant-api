"""
Comprehensive test suite for thread access control.
Tests that users can only access their own threads and messages, not those of other users.
Uses SQLite database for testing.
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from contentgrid_assistant_api.app import ContentGridAssistantAPI
from contentgrid_assistant_api.types.agents import Agent
from contentgrid_assistant_api.config import AssistantExtensionConfig, DatabaseConfig
from contentgrid_extension_helpers.authentication.user import ContentGridUser
from contentgrid_assistant_api.types.context import DefaultThreadContext
from mock_agent import compile_mock_agent


# Test users
USER_1 = ContentGridUser(**{
    "sub": "user_sub_1",
    "iss": "test_issuer",
    "exp": 9999999999,
    "name": "Test User 1",
    "email": "user1@example.com",
    "access_token": "token_user1",
    "context:application:domains": [],
    "context:application:id": "test_app_123"
})

USER_2 = ContentGridUser(**{
    "sub": "user_sub_2",
    "iss": "test_issuer",
    "exp": 9999999999,
    "name": "Test User 2",
    "email": "user2@example.com",
    "access_token": "token_user2",
    "context:application:domains": [],
    "context:application:id": "test_app_123"
})

USER_3 = ContentGridUser(**{
    "sub": "user_sub_3",
    "iss": "test_issuer",
    "exp": 9999999999,
    "name": "Test User 3",
    "email": "user3@example.com",
    "access_token": "token_user3",
    "context:application:domains": [],
    "context:application:id": "test_app_123"
})


class TestThreadAccessControl:
    """Test suite for thread access control"""
    
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
        return {"user": USER_1}
    
    @pytest.fixture(scope="class")
    def test_app(self, app_config, current_user_store):
        """Create test FastAPI application"""
        extension_config, db_config = app_config
        
        def get_current_user() -> ContentGridUser:
            """Dynamic user provider that returns user from store"""
            return current_user_store["user"]
        
        agents = [
            Agent(
                name="test_agent",
                version="v1.0.0",
                get_current_user_override=get_current_user,
                get_agent_override=compile_mock_agent,
                thread_context=DefaultThreadContext,
                tools=[]
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
    
    def test_user_can_create_thread(self, client, current_user_store):
        """Test that a user can create a thread"""
        current_user_store["user"] = USER_1
        
        response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        
        assert response.status_code == 201
        thread = response.json()
        assert "id" in thread
        assert thread["name"] == "New Thread"
        
        return thread["id"]
    
    def test_user_can_list_own_threads(self, client, current_user_store):
        """Test that a user can list their own threads"""
        current_user_store["user"] = USER_1
        
        # Create a thread for user 1
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # List threads
        list_response = client.get("/test/test_agent/threads/")
        assert list_response.status_code == 200
        
        threads_data = list_response.json()
        assert "_embedded" in threads_data
        assert "threads" in threads_data["_embedded"]
        
        threads = threads_data["_embedded"]["threads"]
        thread_ids = [t["id"] for t in threads]
        assert thread_id in thread_ids
    
    def test_user_can_read_own_thread(self, client, current_user_store):
        """Test that a user can read their own thread"""
        current_user_store["user"] = USER_1
        
        # Create a thread
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # Read the thread
        read_response = client.get(f"/test/test_agent/threads/{thread_id}")
        assert read_response.status_code == 200
        thread = read_response.json()
        assert thread["id"] == thread_id
    
    def test_user_can_update_own_thread(self, client, current_user_store):
        """Test that a user can update their own thread"""
        current_user_store["user"] = USER_1
        
        # Create a thread
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # Update the thread
        update_response = client.patch(
            f"/test/test_agent/threads/{thread_id}",
            json={"name": "Updated Thread Name"}
        )
        assert update_response.status_code == 200
        updated_thread = update_response.json()
        assert updated_thread["name"] == "Updated Thread Name"
    
    def test_user_can_delete_own_thread(self, client, current_user_store):
        """Test that a user can delete their own thread"""
        current_user_store["user"] = USER_1
        
        # Create a thread
        create_response = client.post(
            "/test/test_agent/threads/",
            data={"origin": "http://example.com/resource/1"}
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # Delete the thread
        delete_response = client.delete(f"/test/test_agent/threads/{thread_id}")
        assert delete_response.status_code == 204
        
        # Verify thread is deleted
        read_response = client.get(f"/test/test_agent/threads/{thread_id}")
        assert read_response.status_code == 404
    
    def test_user_cannot_read_other_users_thread(self, client, current_user_store):
        """Test that a user cannot read another user's thread"""
        # User 1 creates a thread
        current_user_store["user"] = USER_1
        create_response = client.post(
            "/test/test_agent/threads/",
            data={"origin": "http://example.com/resource/1"}
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # User 2 tries to read User 1's thread
        current_user_store["user"] = USER_2
        read_response = client.get(f"/test/test_agent/threads/{thread_id}")
        assert read_response.status_code == 404
        assert "Thread not found or access denied" in read_response.json()["detail"]
    
    def test_user_cannot_update_other_users_thread(self, client, current_user_store):
        """Test that a user cannot update another user's thread"""
        # User 1 creates a thread
        current_user_store["user"] = USER_1
        create_response = client.post(
            "/test/test_agent/threads/",
            data={"origin": "http://example.com/resource/1"}
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # User 2 tries to update User 1's thread
        current_user_store["user"] = USER_2
        update_response = client.patch(
            f"/test/test_agent/threads/{thread_id}",
            json={"name": "Hacked Thread Name"}
        )
        assert update_response.status_code == 404
        assert "Thread not found or access denied" in update_response.json()["detail"]
    
    def test_user_cannot_delete_other_users_thread(self, client, current_user_store):
        """Test that a user cannot delete another user's thread"""
        # User 1 creates a thread
        current_user_store["user"] = USER_1
        create_response = client.post(
            "/test/test_agent/threads/",
            data={"origin": "http://example.com/resource/1"}
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # User 2 tries to delete User 1's thread
        current_user_store["user"] = USER_2
        delete_response = client.delete(f"/test/test_agent/threads/{thread_id}")
        assert delete_response.status_code == 404
        
        # Verify User 1 can still read their thread
        current_user_store["user"] = USER_1
        read_response = client.get(f"/test/test_agent/threads/{thread_id}")
        assert read_response.status_code == 200
    
    def test_user_only_sees_own_threads_in_list(self, client, current_user_store):
        """Test that listing threads only returns the user's own threads"""
        # User 1 creates 2 threads
        current_user_store["user"] = USER_1
        user1_thread1 = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        ).json()["id"]
        user1_thread2 = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/2"
        ).json()["id"]
        
        # User 2 creates 2 threads
        current_user_store["user"] = USER_2
        user2_thread1 = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/3"
        ).json()["id"]
        user2_thread2 = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/4"
        ).json()["id"]
        
        # User 1 lists threads
        current_user_store["user"] = USER_1
        user1_list = client.get("/test/test_agent/threads/").json()
        user1_thread_ids = [t["id"] for t in user1_list["_embedded"]["threads"]]
        
        # User 1 should see only their threads
        assert user1_thread1 in user1_thread_ids
        assert user1_thread2 in user1_thread_ids
        assert user2_thread1 not in user1_thread_ids
        assert user2_thread2 not in user1_thread_ids
        
        # User 2 lists threads
        current_user_store["user"] = USER_2
        user2_list = client.get("/test/test_agent/threads/").json()
        user2_thread_ids = [t["id"] for t in user2_list["_embedded"]["threads"]]
        
        # User 2 should see only their threads
        assert user2_thread1 in user2_thread_ids
        assert user2_thread2 in user2_thread_ids
        assert user1_thread1 not in user2_thread_ids
        assert user1_thread2 not in user2_thread_ids
    
    def test_user_can_read_own_messages(self, client, current_user_store):
        """Test that a user can read messages in their own thread"""
        current_user_store["user"] = USER_1
        
        # Create a thread
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # Read messages
        messages_response = client.get(f"/test/test_agent/threads/{thread_id}/messages/")
        assert messages_response.status_code == 200
        
        messages_data = messages_response.json()
        assert "_embedded" in messages_data
        assert "messages" in messages_data["_embedded"]
    
    def test_user_cannot_read_other_users_messages(self, client, current_user_store):
        """Test that a user cannot read messages in another user's thread"""
        # User 1 creates a thread with messages
        current_user_store["user"] = USER_1
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # User 2 tries to read User 1's messages
        current_user_store["user"] = USER_2
        messages_response = client.get(f"/test/test_agent/threads/{thread_id}/messages/")
        assert messages_response.status_code == 404
        assert "Thread not found or access denied" in messages_response.json()["detail"]
    
    def test_user_cannot_add_messages_to_other_users_thread(self, client, current_user_store):
        """Test that a user cannot add messages to another user's thread"""
        # User 1 creates a thread
        current_user_store["user"] = USER_1
        create_response = client.post(
            "/test/test_agent/threads/?origin=http://example.com/resource/1"
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["id"]
        
        # User 2 tries to add a message to User 1's thread
        current_user_store["user"] = USER_2
        message_response = client.post(
            f"/test/test_agent/threads/{thread_id}/messages/",
            data={"question": "Trying to hack into someone else's thread"}
        )
        assert message_response.status_code == 404
        assert "Thread not found or access denied" in message_response.json()["detail"]
    
    def test_multiple_users_independent_threads(self, client, current_user_store):
        """Test that multiple users can independently manage their threads"""
        # User 1, 2, and 3 each create threads
        user_threads = {}
        
        for user in [USER_1, USER_2, USER_3]:
            current_user_store["user"] = user
            response = client.post(
                f"/test/test_agent/threads/?origin=http://example.com/resource/{user.sub}"
            )
            assert response.status_code == 201
            user_threads[user.sub] = response.json()["id"]
        
        # Each user verifies they can only access their own thread
        for user in [USER_1, USER_2, USER_3]:
            current_user_store["user"] = user
            
            # Can read own thread
            own_thread_id = user_threads[user.sub]
            response = client.get(f"/test/test_agent/threads/{own_thread_id}")
            assert response.status_code == 200
            
            # Cannot read other users' threads
            for other_user in [USER_1, USER_2, USER_3]:
                if other_user.sub != user.sub:
                    other_thread_id = user_threads[other_user.sub]
                    response = client.get(f"/test/test_agent/threads/{other_thread_id}")
                    assert response.status_code == 404
    
    def test_thread_isolation_with_origin_filter(self, client, current_user_store):
        """Test that thread filtering by origin respects user boundaries"""
        origin1 = "http://example.com/resource/1"
        origin2 = "http://example.com/resource/2"
        
        # User 1 creates threads with both origins
        current_user_store["user"] = USER_1
        user1_origin1_thread = client.post(
            f"/test/test_agent/threads/?origin={origin1}"
        ).json()["id"]
        user1_origin2_thread = client.post(
            f"/test/test_agent/threads/?origin={origin2}"
        ).json()["id"]
        
        # User 2 creates threads with both origins
        current_user_store["user"] = USER_2
        user2_origin1_thread = client.post(
            f"/test/test_agent/threads/?origin={origin1}"
        ).json()["id"]
        user2_origin2_thread = client.post(
            f"/test/test_agent/threads/?origin={origin2}"
        ).json()["id"]
        
        # User 1 filters by origin1
        current_user_store["user"] = USER_1
        response = client.get(f"/test/test_agent/threads/?origin={origin1}")
        assert response.status_code == 200
       
        response_json = response.json()
        filtered_threads = [t["id"] for t in response_json["_embedded"]["threads"]]
        
        # Should only see User 1's origin1 thread
        assert user1_origin1_thread in filtered_threads
        assert user1_origin2_thread not in filtered_threads
        assert user2_origin1_thread not in filtered_threads  # Same origin but different user
        assert user2_origin2_thread not in filtered_threads


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
