from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic import computed_field
import logging
import urllib

class AssistantExtensionConfig(BaseSettings):
    production : bool = False
    
    class Config:
        extra = "allow"
        env_file = [".env", ".env.secret"]
        env_file_encoding = "utf-8"
        
    
    server_port: int | None = 8000
    server_url: str | None = Field("http://localhost:8000", serialization_alias="BACKEND_URL")
    web_concurrency: int | None = 1
    opening_message : str = "Hello, please introduce yourself and list your available tools and functionalities."
    graph_recursion_limit: int = 100
    
    assistant_name : str = "default"
    mock_oidc : bool = False
    
    extension_path_prefix : str | None = None

    routes_assistant_prefix : str = "/assistant"
    routes_thread_prefix : str = "/threads"
    routes_message_prefix : str = "/messages"
    
    problem_type_base_url : str = "https://api.contentgrid.com/problems/ml"

class DatabaseConfig(BaseSettings):
    pg_dbname: str = "assistant"
    pg_user: str = "assistant"
    pg_passwd: str = "assistant"
    pg_host: str = "postgres"
    pg_port: str = "5432"
    pg_reinitialize: bool = False
    use_sqlite_db: bool = False
    
    class Config:
        extra = "allow"
        env_file = [".env", ".env.secret"]
        env_file_encoding = "utf-8"
    
    @computed_field # type: ignore
    @property
    def database_url(self) -> str:
        if self.use_sqlite_db:
            logging.info("Using SQLite database")
            return "sqlite:///sqlite.db"
        else:
            return f"postgresql://{self.pg_user}:{urllib.parse.quote(self.pg_passwd)}@{self.pg_host}:{self.pg_port}/{self.pg_dbname}" # type: ignore
    
    def log_config(self) -> None:
        """Log database configuration (excluding password)"""
        logging.info("===Database Config===")
        logging.info(f"user : {self.pg_user}")
        logging.info("Passwd : ********")
        logging.info(f"dbname : {self.pg_dbname}")
        logging.info(f"host : {self.pg_host}")
        logging.info(f"port : {self.pg_port}")
        logging.info(f"use_sqlite_db : {self.use_sqlite_db}")
