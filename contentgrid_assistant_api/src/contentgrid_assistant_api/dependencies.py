from typing import Generator
import uuid
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
from contentgrid_assistant_api.db.repositories.thread import ThreadRepository
from contentgrid_extension_helpers.dependencies.sqlalch.db import SQLiteSessionFactory, PostgresSessionFactory
from contentgrid_extension_helpers.dependencies.authentication.user import ContentGridUser
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph
from contentgrid_assistant_api.types.context import DefaultThreadContext
from contentgrid_assistant_api.config import DatabaseConfig
from contentgrid_assistant_api.types.agents import Agent


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class DependencyResolver():
    def __init__(self, agent : Agent, db_config : DatabaseConfig) -> None:
        db_config.pg_dbname = agent.name
        self.agent = agent
        self.db_config = db_config
        if db_config.use_sqlite_db:
            self.db_conn_factory = SQLiteSessionFactory(sqlite_file_name=f"{agent.name}.db")
            self.in_mem_store = MemorySaver()
        else:
            self.db_conn_factory = PostgresSessionFactory(
                pg_host=db_config.pg_host,
                pg_dbname=db_config.pg_dbname,
                pg_user=db_config.pg_user,
                pg_passwd=db_config.pg_passwd,
                pg_port=db_config.pg_port
            )
            # Only setup PostgreSQL checkpointer if not using SQLite
            with PostgresSaver.from_conn_string(db_config.database_url) as store:
                store.setup()
        
    def get_langgraph_checkpointer_dependency(self):
        def get_langgraph_checkpointer() -> Generator[BaseCheckpointSaver, None, None]:
            if self.db_config.use_sqlite_db:
                yield self.in_mem_store
            elif "postgresql" in self.db_config.database_url:
                with PostgresSaver.from_conn_string(self.db_config.database_url) as store:
                    yield store
        return get_langgraph_checkpointer
    
    
    def get_thread_repository_dependency(self):
        def get_thread_repository(session: Session = Depends(self.db_conn_factory)) -> ThreadRepository:
            """Get a dataset repository instance"""
            return ThreadRepository(session)
        return get_thread_repository
    
    def get_thread_context_dependency(self):
        def get_thread_context(thread_id: uuid.UUID, thread_repository: ThreadRepository = Depends(self.get_thread_repository_dependency()), user: ContentGridUser = Depends(self.get_current_user_dependency())) -> DefaultThreadContext:
            # Getting the Conversation context from the incoming request.
            # This dependency can only be used on /{thread_id}/... endpoints
            # Each thread is related to a blueprint_url, using the thread_id we fetch that blueprint_url using the thread_repository.
            # If the user is not allowed to read the thread, the database won't return the thread and the request is terminated with 404 early.
            # If the user is allowed to read, the blueprint_url from the database is injected in the conversation context which tools can access.
            # ThreadContext shows all fields in the thread's context of the user.
            thread = thread_repository.get_by_id_for_user(thread_id=thread_id, user=user)
            # Here we could check if the user is still allowed to reach the blueprint. 
            # > This is done in the fetch_datamodel node in the langgraph. If that nodes fails, execution is halted.
            # btw mypy complains about messages not being passed but that is not good because then the conversation is empty. so do not pass messages here. it should come from the postgres persistance.
            return self.agent.thread_context(user=user, origin=thread.origin, thread_id=str(thread_id)) # type: ignore
        return get_thread_context
    
    def get_agent_dependency(self):
        def get_agent(checkpointer: BaseCheckpointSaver = Depends(self.get_langgraph_checkpointer_dependency())) -> CompiledStateGraph:
            return self.agent.get_agent_override(checkpointer=checkpointer)
        return get_agent
    
    def get_current_user_dependency(self):
        if self.agent.get_current_user_override:
            return self.agent.get_current_user_override
        raise Exception("Get current user dependency not set...")