import logging
from typing import Optional
from dotenv import load_dotenv
from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

load_dotenv()
load_dotenv(".env.secret")


class LLMProviders(BaseSettings):
    """Settings for the LLM provider."""
    
    # Selects the model that should be loaded and uses the variable for to load the config of that model trough the available_llms dict
    llm_provider: str = Field(default="openai")
    
    # LLM Provider settings:
    # required for a model to be enabled used:
    # - PROVIDER_API_KEY 
    #   the api key of the provider
    # - PROVIDER_MODEL
    #   the model identifier from the provider. i.e.: 'gpt-4o'
    # - BASE_URL
    #   If the base_url is not set, the default of langchain is used. 
    #   These are pointing and updated to the providers urls based on the langchain subpackages (like langchain_openai). 
    #   The base_url can be optionally set if you want to point it to a openai api wrapper (or other provider). like using an llm on scaleway.
    anthropic_api_key: Optional[str] = Field(default=None)
    anthropic_model: str = Field(default="claude-sonnet-4-5-20250929")
    anthropic_base_url: Optional[str] = Field(default=None)

    google_api_key: Optional[str] = Field(default=None)
    google_model: str = Field(default="gemini-2.5-flash")
    google_base_url: Optional[str] = Field(default=None)

    openai_api_key: Optional[str] = Field(default="fake-key-123")
    openai_model: str = Field(default="gpt-4o")
    openai_base_url: Optional[str] = Field(default=None)

    class Config:
        env_prefix = ""  # ensures no prefix for environment variables


class LLMSpecification(BaseModel):
    model_provider: str = Field(description="The name of the language model provider.")
    model: str = Field(
        description="The specific model version to use from the provider."
    )
    temperature: float = Field(
        default=0,
        description="The temperature setting for the model, affecting randomness in output.",
    )
    api_key: Optional[str] = Field(
        default=None, description="The api key of the LLM model provider"
    )
    base_url: Optional[str] = Field(
        default=None, description="Adjusted backend url to send requests to"
    )

providerconfig = LLMProviders()
print(providerconfig)

available_llms : dict[str, LLMSpecification] = {
    "openai": LLMSpecification(
        model_provider="openai",
        model=providerconfig.openai_model,
        api_key=providerconfig.openai_api_key,
        base_url=providerconfig.openai_base_url
    ),
    "anthropic": LLMSpecification(
        model_provider="anthropic",
        model=providerconfig.anthropic_model,
        api_key=providerconfig.anthropic_api_key,
        base_url=providerconfig.anthropic_base_url
    ),
    "google": LLMSpecification(
        model_provider="google_genai",
        model=providerconfig.google_model,
        api_key=providerconfig.google_api_key,
        base_url=providerconfig.google_base_url,
    )
}

def get_available_models(ignore_missing_key : bool = False) -> dict[str, LLMSpecification]:
    # TODO In a later iteration, the automation data must be checked to see which models are available for a certain app
    models = {}
    for model, configuration in available_llms.items():
        if configuration.api_key or ignore_missing_key:
            models[model] = configuration
    return models

def init_langchain_model(llm_provider: str) -> BaseChatModel:
    from langchain.chat_models import init_chat_model

    llm_provider = llm_provider.lower()
    if llm_provider not in available_llms.keys():
        raise Exception(
            f"Model provider {llm_provider} not supported. Supported models: {', '.join(available_llms.keys())}"
        )

    chosen_config = available_llms[llm_provider]
    logging.debug(
        f"Selected provider {llm_provider} enabled model: {chosen_config.model} base_url: {chosen_config.base_url}"
    )
    return init_chat_model(**chosen_config.model_dump())
