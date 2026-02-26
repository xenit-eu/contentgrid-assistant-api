# type : ignore

import base64
import json
from typing import Annotated, AsyncGenerator, List, Union, Optional
import typing
import uuid
from enum import Enum
from langgraph.graph.state import CompiledStateGraph
from fastapi import APIRouter, BackgroundTasks, File, Form, Request, UploadFile
from fastapi.params import Depends
from contentgrid_assistant_api.config import AssistantExtensionConfig
from fastapi.responses import StreamingResponse
from contentgrid_assistant_api.db.repositories.thread import ThreadRepository
from contentgrid_assistant_api.db.types.message import HALHumanMessage, HALAIMessage, HALSystemMessage, HALToolMessage
from contentgrid_assistant_api.dependencies import DependencyResolver
from contentgrid_extension_helpers.authentication import ContentGridUser
from langgraph.checkpoint.base import BaseCheckpointSaver
from contentgrid_extension_helpers.responses.hal import FastAPIHALCollection, HALTemplateFor, HALLinkFor
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage, ToolMessage
from fastapi import HTTPException


# ContentBlocks
from langchain_core.messages.content import create_image_block, create_file_block, create_audio_block, create_text_block, ImageContentBlock, AudioContentBlock, FileContentBlock, TextContentBlock
import logging

from contentgrid_assistant_api.types.context import DefaultThreadContext

def generate_agent_message_router(dep_resolver: DependencyResolver, extension_config: AssistantExtensionConfig, tags: Optional[List[str | Enum]]=None) -> APIRouter:
    messagesrouter = APIRouter(prefix="/{thread_id}" + extension_config.routes_message_prefix, tags=tags or ["messages"])

    def convert_to_hal_message(message: BaseMessage, thread_id: uuid.UUID) -> Union[HALHumanMessage, HALAIMessage, HALSystemMessage, HALToolMessage]:
        """Convert a LangChain BaseMessage to the appropriate HAL message type"""
        if isinstance(message, ToolMessage):
            # Handle ToolMessage first since it might inherit from other message types
            hal_message = HALToolMessage(**message.model_dump())
        elif isinstance(message, HumanMessage):
            hal_message = HALHumanMessage(**message.model_dump())
        elif isinstance(message, AIMessage):
            hal_message = HALAIMessage(**message.model_dump())
        elif isinstance(message, SystemMessage):
            hal_message = HALSystemMessage(**message.model_dump())
        else:
            # Default to HALSystemMessage for unknown types
            logging.warning("Unknown type : " + str(type(message)))
            hal_message = HALSystemMessage(**message.model_dump())
        
        # Add HAL links and templates
        hal_message.links = {
            "self": HALLinkFor(endpoint_function_name="read_message", tags=tags, path_params={"thread_id": str(thread_id), "message_id": str(message.id)}, condition=message.id is not None),
            "thread": HALLinkFor(endpoint_function_name="read_thread", tags=tags, path_params={"thread_id": str(thread_id)}),
            "messages": HALLinkFor(endpoint_function_name="read_messages", tags=tags, path_params={"thread_id": str(thread_id)})
        }
        
        return hal_message

    async def convert_upload_file_to_contentblock(file: UploadFile) -> ImageContentBlock | FileContentBlock | AudioContentBlock:
        # Reference: https://docs.langchain.com/oss/python/langchain/messages#content-block-reference
        
        # Read file content
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode("utf-8")
        
        # Determine content type based on file's content type
        if file.content_type:
            content_type = file.content_type
            
            if content_type.startswith("image/"):
                # Handle image files
                return create_image_block(
                        base64=file_base64,
                        mime_type=content_type
                    )
            elif content_type.startswith("audio/"):
                # Handle audio files
                return create_audio_block(
                        base64=file_base64,
                        mime_type=content_type
                    )
            else:
                # Handle PDF files and other extensions
                return create_file_block(
                    base64=file_base64,
                    mime_type=content_type,
                    filename=file.filename if file.filename else None
                )
        else:
            # No content type provided, treat as generic file
            return create_file_block(
                    base64=file_base64,
                    mime_type="application/octet-stream",
                    filename=file.filename if file.filename else None
                )
        
            
    @messagesrouter.get("/", response_model=FastAPIHALCollection, response_model_exclude_none=True)
    def read_messages(
        thread_id: uuid.UUID,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency()),
        agent: CompiledStateGraph = Depends(dep_resolver.get_agent_dependency()),
        thread_context: DefaultThreadContext = Depends(dep_resolver.get_thread_context_dependency())
    ):
        """Get all messages for a thread"""
        state = agent.get_state(config={"configurable" : thread_context}) # type: ignore
        new_message_can_be_added = True
        if state and state.values:
            messages = state.values['messages']
            # Convert LangChain messages to HAL message types
            hal_messages = [convert_to_hal_message(msg, thread_id) for msg in messages]
            last_message = messages[-1]
            if not isinstance(last_message, AIMessage):
                new_message_can_be_added = False
            else:
                # we have an AI message but we need to check if it is waiting for tools to execute.
                if len(last_message.tool_calls) > 0:
                    new_message_can_be_added = False
        else:
            hal_messages = []
            
        return FastAPIHALCollection[Union[HALHumanMessage, HALAIMessage, HALSystemMessage, HALToolMessage]](
            _embedded={"messages": hal_messages},
            _links={
                "self": HALLinkFor(endpoint_function_name="read_messages", tags=tags, path_params={"thread_id": str(thread_id)}),
                "thread": HALLinkFor(endpoint_function_name="read_thread", tags=tags, path_params={"thread_id": str(thread_id)})
            },
            _templates={"addMessage": HALTemplateFor(endpoint_function_name="add_message", tags=tags, path_params={"thread_id": str(thread_id)}, condition=new_message_can_be_added)}
        )
        
        
    @messagesrouter.post("/", response_model=HALHumanMessage, response_model_exclude_none=True)
    async def add_message(
        request: Request,
        thread_id: uuid.UUID,
        question: Annotated[str, Form()],
        background_tasks : BackgroundTasks,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency()),
        agent: CompiledStateGraph = Depends(dep_resolver.get_agent_dependency()),
        checkpointer: BaseCheckpointSaver = Depends(dep_resolver.get_langgraph_checkpointer_dependency()),
        thread_context: DefaultThreadContext = Depends(dep_resolver.get_thread_context_dependency()),
        file: UploadFile = File(None),
    ):
        """Add new messages to a thread"""
            # Check Accept header to determine response format
        accept_header = request.headers.get("accept", "").lower()
        streaming = (
            "text/event-stream" in accept_header
        )
        # Build content blocks
        content_blocks : List[ImageContentBlock | FileContentBlock | AudioContentBlock | TextContentBlock] = [create_text_block(text=question)]
        
        if file:
            # Add custom content blocks based on file type
            file_block = await convert_upload_file_to_contentblock(file)
            content_blocks.append(file_block)
        
        # Create the message with proper content structure
        new_message = HumanMessage(content=content_blocks) # type: ignore
        messages = [new_message]
        
        if streaming:
            state = agent.get_state(config={"configurable" : thread_context}) #type: ignore
            nb_current_messages = 0
            if state and state.values and 'messages' in state.values.keys() and len(state.values['messages']):
                nb_current_messages = len(state.values['messages'])

            @typing.no_type_check
            async def generate_stream(current_message_index) -> AsyncGenerator[str, None]:
                for mode, chunk in agent.stream(
                    {"messages": messages},
                    {"configurable": thread_context, "recursion_limit": extension_config.graph_recursion_limit},
                    context=thread_context,
                    stream_mode=["values", "messages"]
                ):
                    if mode=="values":
                        values = chunk
                        new_state_messages = values["messages"][current_message_index:]
                        hal_messages = [convert_to_hal_message(msg, thread_id) for msg in new_state_messages]
                        
                        # Convert HAL messages to dictionaries
                        messages_data = []
                        for msg in hal_messages:
                            if hasattr(msg, 'model_dump'):
                                messages_data.append(msg.model_dump(exclude_unset=True))
                            else:
                                messages_data.append(msg)
                        
                        # Send JSON chunk with proper structure
                        yield "event: message\n"
                        yield f"data: {json.dumps(messages_data)}\n\n"
                        current_message_index += len(new_state_messages)
                    elif mode == "messages":
                        message_chunk, metadata = chunk
                        if message_chunk.content:
                            try:
                                yield "event: token\n"
                                yield f"data: {json.dumps(message_chunk.content)}\n"
                                yield f"id: {message_chunk.id}\n\n"
                            except Exception as e:
                                logging.exception(e)
                                continue

                # Send completion signal
                yield f"data: {json.dumps({'complete': True})}\n\n"
            
            return StreamingResponse(
                generate_stream(current_message_index=nb_current_messages),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            def process_agent_response():
                try:
                    agent.invoke(
                        {"messages": messages},
                        {"configurable": thread_context, "recursion_limit": extension_config.graph_recursion_limit},
                        context=thread_context,
                    )
                except Exception as e:
                    # Log the error since this runs in background
                    logging.exception(f"Error processing agent response: {e}")
            
            # Add the task to background tasks
            background_tasks.add_task(process_agent_response)
            
            # Return immediately with the human message
            return convert_to_hal_message(new_message, thread_id=thread_id)

    @messagesrouter.get("/{message_id}", response_model=Union[HALHumanMessage, HALAIMessage, HALSystemMessage, HALToolMessage], response_model_exclude_none=True)
    def read_message(
        thread_id: uuid.UUID,
        message_id: str,
        user: ContentGridUser = Depends(dep_resolver.get_current_user_dependency()),
        thread_repo: ThreadRepository = Depends(dep_resolver.get_thread_repository_dependency()),
        checkpointer: BaseCheckpointSaver = Depends(dep_resolver.get_langgraph_checkpointer_dependency()),
        thread_context: DefaultThreadContext = Depends(dep_resolver.get_thread_context_dependency())
    ):
        """Get a specific message by ID from a thread"""
        state = checkpointer.get({"configurable": thread_context}) #type: ignore
        if state and "channel_values" in state.keys():
            messages = state["channel_values"]["messages"]
            
            # Find the message by ID
            for msg in messages:
                if msg.id == message_id:
                    return convert_to_hal_message(msg, thread_id)
        
        # Message not found
        raise HTTPException(status_code=404, detail="Message not found")
    
    return messagesrouter