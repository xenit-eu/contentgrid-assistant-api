from enum import Enum
from typing import Optional, List
import uuid
from pydantic import BaseModel
from datetime import datetime
from sqlmodel import Field, SQLModel
from contentgrid_extension_helpers.responses.hal import FastAPIHALResponse, HALLinkFor, HALTemplateFor, HALLink

class ComponentType(str, Enum):
    DATAMODEL = "datamodel"

class ThreadBase(SQLModel):
    # Base model for Thread
    # Not used on its own, but as a base for Thread, ThreadCreate.
    # ThreadUpdate inherits from Basemodel. Meaning only the fields there can be patched.
    # All fields set here will be inherited so are therefore publicly accessible
    # For private fields that should not be publicly accessible, use the main Thread class
    id : uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    name: str = Field(index=True, description="Name of the Thread")
    origin : Optional[str] = Field()
    component: ComponentType = Field(index=True, default=ComponentType.DATAMODEL)
    created_at : datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    
class Thread(ThreadBase, table=True):
    # Main Thread model, this is the model where you will code your business logic with
    # id : Optional[uuid.UUID] = Field(primary_key=True, default_factory=uuid.uuid4)
    user_sub : str = Field(index=True, description="User subject (sub) who owns the Thread")

class ThreadRead(ThreadBase, FastAPIHALResponse):
    # A read-only version of the Thread model that can be used for public API responses
    # Note that this model inherits from ThreadBase, so it has the same fields
    # and also explicitly defined the id field so that is also publicly accessible
    # id is not added in the BaseModel because on creation it is not known yet

    def __init__(self, tags: Optional[List[str | Enum]]=None, **kwargs):
        super().__init__(**kwargs)
        self.links = {
            "self": HALLinkFor(endpoint_function_name="read_thread", tags=tags, templated=False, path_params=lambda instance: {"thread_id": instance.id}),
            "messages": HALLinkFor(endpoint_function_name="read_messages", tags=tags, templated=False, path_params=lambda instance: {"thread_id": instance.id}),
        }
        self.templates = {
            "update": HALTemplateFor(endpoint_function_name="update_thread", tags=tags, templated=False, path_params=lambda instance: {"thread_id": instance.id}),
            "delete": HALTemplateFor(endpoint_function_name="delete_thread", tags=tags, templated=False, path_params=lambda instance: {"thread_id": instance.id})
        }

class ThreadCreate(ThreadBase):
    # Creating a thread will be done by injecting the user_sub and blueprint from the origin.
    pass

class ThreadUpdate(BaseModel):
    name : str = Field(None, description="New name of the Thread") # type: ignore