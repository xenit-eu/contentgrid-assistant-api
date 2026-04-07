
import logging
from contentgrid_assistant_api.config import LangfuseConfig
from contentgrid_assistant_api.types.context import ContentGridUser, DefaultThreadContext


def setup_langfuse(langfuse_config: LangfuseConfig) -> None:
    """Initialize the Langfuse observability client."""
    if langfuse_config.is_configured:
        from langfuse import Langfuse
        Langfuse(
            public_key=langfuse_config.langfuse_public_key,
            secret_key=langfuse_config.langfuse_secret_key,
            base_url=langfuse_config.langfuse_base_url,
        )
        logging.info("Langfuse observability initialized successfully")
    else:
        logging.info("Langfuse not configured - tracing disabled. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable.")


def shutdown_langfuse(langfuse_config: LangfuseConfig) -> None:
    """Flush and shut down the Langfuse client."""
    if langfuse_config.is_configured:
        from langfuse import get_client
        get_client().shutdown()
        logging.info("Langfuse client shutdown complete")


def _create_langfuse_config_for_thread(
    thread_id: str,
    user: ContentGridUser,
    agent_name: str,
    langfuse_config: LangfuseConfig,
    extra_tags: list[str] | None = None
) -> dict:
    """Create LangChain config with Langfuse callback handler and metadata.
    
    Per Langfuse best practices:
    - session_id: Groups conversation messages together (using thread_id)
    - user_id: Enables user filtering and cost attribution
    - tags: Per-feature analytics (using agent name)
    """
    config: dict = {}
    
    if langfuse_config.is_configured:
        try:
            from langfuse.langchain import CallbackHandler
            langfuse_handler = CallbackHandler()
            config["callbacks"] = [langfuse_handler]
            config["metadata"] = {
                "langfuse_session_id": thread_id,
                "langfuse_user_id": user.sub,
                "langfuse_tags": [agent_name] + (extra_tags or [])
            }
        except ImportError:
            logging.warning("Langfuse not installed, tracing disabled")
    
    return config

def _create_langfuse_config(
    thread_context: DefaultThreadContext,
    user: ContentGridUser,
    agent_name: str,
    langfuse_config: LangfuseConfig
) -> dict:
    """Create LangChain config with Langfuse callback handler for an existing thread."""
    return _create_langfuse_config_for_thread(thread_context.thread_id, user, agent_name, langfuse_config)