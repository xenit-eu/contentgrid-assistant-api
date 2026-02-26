import { HalObject, HalSlice } from "@contentgrid/hal";
import type { HalObjectShape, HalSliceShape, LinkShape } from "@contentgrid/hal/shape";
import type { HalFormsTemplateShape } from "@contentgrid/hal-forms/shape";

// Base message interface
interface BaseMessageObject {
    id: string;
    type: 'human' | 'ai' | 'tool';
    hidden: boolean;
}

// Content block types
export interface TextContentBlock {
    type: 'text';
    text: string;
    id: string;
}

export interface ImageContentBlock {
    type: 'image';
    mime_type: string;
    base64: string;
}

export interface FileContentBlock {
    type: 'file';
    id : string;
    file_name?: string;
    mime_type: string;
    base64: string;
    extras? : { filename : string}
}


export type ContentBlock = TextContentBlock | ImageContentBlock | FileContentBlock;

// Human message content can be string or array of content blocks
type HumanMessageContent = string | ContentBlock[];

interface HumanMessageObject extends BaseMessageObject {
    type: 'human';
    content: HumanMessageContent;
}

export type HumanMessageShape = HalObjectShape<HumanMessageObject> & {
    _links: {
        self: LinkShape;
        thread: LinkShape;
        messages: LinkShape;
    };
};

export class HumanMessage extends HalObject<HumanMessageShape> {
    constructor(data: HumanMessageShape) {
        super(data);
    }

    get id() {
        return this.data.id;
    }

    get content() {
        return this.data.content;
    }

    get hidden() {
        return this.data.hidden;
    }

    get textContent(): string {
        if (Array.isArray(this.content)) {
            return this.content
                .map(block => {
                    if (block.type === 'text') {
                        return (block as TextContentBlock).text;
                    }
                    return '';
                })
                .join('\n');
        }
        
        if (typeof this.content === 'string') {
            return this.content;
        }
        
        return '';
    }
}

interface AIMessageObject extends BaseMessageObject {
    type: 'ai';
    content: string | ContentBlock[];
    tool_calls: ToolCall[];
    invalid_tool_calls: any[];
}

export type AIMessageShape = HalObjectShape<AIMessageObject> & {
    _links: {
        self: LinkShape;
        thread: LinkShape;
        messages: LinkShape;
    };
};

export class AIMessage extends HalObject<AIMessageShape> {
    toolCalls : ToolCall[]

    constructor(data: AIMessageShape) {
        super(data);
        this.toolCalls = data.tool_calls
    }

    get id() {
        return this.data.id;
    }

    get content() {
        return this.data.content;
    }

    get invalidToolCalls() {
        return this.data.invalid_tool_calls;
    }

    get hidden() {
        return this.data.hidden;
    }

    get hasToolCalls() {
        return this.toolCalls.length > 0;
    }

    get textContent() {
        if (Array.isArray(this.content)) {
            return this.content
                .map(block => {
                    if (block.type === 'text') {
                        return (block as TextContentBlock).text;
                    }
                    return '';
                })
                .join('\n');
        }
        
        if (typeof this.content === 'string') {
            return this.content;
        }
        
        return '';
    }
}


type ToolCallShape = {
    name : string,
    args : Record<string, any>,
    id : string,
    type : 'tool_call'
}

export class ToolCall {
    name: string;
    args: Record<string, any>;
    id: string;
    type: 'tool_call';
    toolResponse : ToolMessage | undefined

    constructor(data: ToolCallShape) {
        this.name = data.name;
        this.args = data.args;
        this.id = data.id;
        this.type = data.type;
        this.toolResponse = undefined
    }
}
// Tool message artifact
export interface ToolArtifact {
    response: string;
    action_type: string;
    entity: string | null;
    attribute: string | null;
    relation: string | null;
    failed: boolean;
}

interface ToolMessageObject extends BaseMessageObject {
    type: 'tool';
    content: string;
    name: string;
    tool_call_id: string;
    artifact: undefined | ToolArtifact | ToolArtifact[];
    status: 'success' | 'error';
}

export type ToolMessageShape = HalObjectShape<ToolMessageObject> & {
    _links: {
        self: LinkShape;
        thread: LinkShape;
        messages: LinkShape;
    };
};

export class ToolMessage extends HalObject<ToolMessageShape> {
    constructor(data: ToolMessageShape) {
        super(data);
    }

    get id() {
        return this.data.id;
    }

    get content() {
        return this.data.content;
    }

    get name() {
        return this.data.name;
    }

    get toolCallId() {
        return this.data.tool_call_id;
    }

    get artifact() {
        return this.data.artifact;
    }

    get status() {
        return this.data.status;
    }

    get hidden() {
        return this.data.hidden;
    }

    get artifacts(): ToolArtifact[] {
        if (Array.isArray(this.artifact)) {
            return this.artifact;
        }
        if (this.artifact) {
            return [this.artifact];
        }
        return [];
    }

    get hasFailed() {
        return this.artifacts.length === 0 || this.artifacts.some(a => !a || a.failed);
    }

    get isAccepted() {
        return true
    }
}

// Union type for all message types
export type MessageShape = HumanMessageShape | AIMessageShape | ToolMessageShape;
export type Message = HumanMessage | AIMessage | ToolMessage;

// Message slice
export interface MessageSliceShape extends HalSliceShape<MessageShape> {
    _links: {
        self: LinkShape;
        thread: LinkShape;
    };
    _templates: {
        addMessage?: HalFormsTemplateShape<AddMessageInput, Message>;
    };
}

export class MessageSlice extends HalSlice<MessageShape> {
    public _templates: MessageSliceShape['_templates'];

    constructor(data: MessageSliceShape) {
        super(data);
        this._templates = data._templates;
    }

    get messages(): Message[] {
        const embedded = this.data._embedded?.['messages'];
        if (!embedded) return [];

        return embedded.map((msg: MessageShape) => {
            switch (msg.type) {
                case 'human':
                    return new HumanMessage(msg as HumanMessageShape);
                case 'ai':
                    return new AIMessage(msg as AIMessageShape);
                case 'tool':
                    return new ToolMessage(msg as ToolMessageShape);
                default:
                    throw new Error(`Unknown message type: ${(msg as any).type}`);
            }
        });
    }
}

/**
 * AssistantConversation manages a collection of messages and their relationships.
 * 
 * Key responsibilities:
 * - Maintains a persistent list of messages to avoid re-processing on every update
 * - Links tool calls (from AI messages) to their corresponding tool responses (ToolMessages)
 * - Provides incremental updates via `addMessages()` to only process new messages
 * - Supports full refresh via `setMessages()` to rebuild the entire conversation
 * 
 * Performance optimizations:
 * - `addMessages()`: Only adds and links new messages, avoiding re-linking existing ones
 * - `linkToolCallResponsesToToolCall()`: Iterates over tool messages (typically fewer) 
 *   rather than all AI messages and their tool calls
 * - Links are maintained on the ToolCall objects themselves for efficient access
 * 
 * Usage:
 * - Initial load or refresh: Use `setMessages()` to set all messages and link everything
 * - Incremental updates: Use `addMessages()` to append only new messages and link them
 */
export class AssistantConversation {
    messages : Message[]

    constructor(messages : Message[]) {
        this.messages = messages
    }

    get latestMessage() : Message | undefined {
        return this.messages.length > 0 ? this.messages[this.messages.length - 1] : undefined;
    }

    get toolMessages() : ToolMessage[] {
        return this.messages.filter((msg): msg is ToolMessage => msg instanceof ToolMessage);
    }

    get humanMessages() : HumanMessage[] {
        return this.messages.filter((msg): msg is HumanMessage => msg instanceof HumanMessage);
    }

    get aiMessages() : AIMessage[] {
        return this.messages.filter((msg): msg is AIMessage => msg instanceof AIMessage);
    }

    findToolMessagesForToolCall( toolCall : ToolCall) : ToolMessage | undefined {
        return this.toolMessages.find((toolMsg) => toolMsg.toolCallId == toolCall.id)
    }

    findToolCallForToolMessage( toolMsg : ToolMessage ) : ToolCall | undefined {
        for (const aiMessage of this.aiMessages) {
            const toolCall = aiMessage.toolCalls.find((tc) => tc.id === toolMsg.toolCallId);
            if (toolCall) {
                return toolCall;
            }
        }
        return undefined;
    }

    setMessages(newMessages : Message[]) : void {
        this.messages = newMessages;
        this.linkToolCallResponsesToToolCall(newMessages);
    }

    addMessages(newMessages : Message[]) : void {
        if (newMessages.length === 0) {
            return;
        }

        const latestId = this.latestMessage?.id;
        
        if (!latestId) {
            // No existing messages, add all
            this.setMessages(newMessages);
            return;
        }

        // Find the index of the latest message in the new messages
        const latestIndex = newMessages.findIndex(msg => msg.id === latestId);
        
        if (latestIndex === undefined) {
            // Latest message not found in new messages, replace all
            this.setMessages(newMessages);
            return;
        }

        // Add only messages after the latest message
        const messagesToAdd = newMessages.slice(latestIndex + 1);
        if (messagesToAdd.length > 0) {
            this.messages.push(...messagesToAdd);
            this.linkToolCallResponsesToToolCall(messagesToAdd);
        }
    }

    private linkToolCallResponsesToToolCall(messages: Message[]) : void {
        // Find tool messages in the new messages and link them to their tool calls
        const newToolMessages = messages.filter((msg): msg is ToolMessage => msg instanceof ToolMessage);
        
        newToolMessages.forEach(toolMsg => {
            const toolCall = this.findToolCallForToolMessage(toolMsg);
            if (toolCall) {
                // Update even if already linked, in case it changed
                toolCall.toolResponse = toolMsg;
            } else {
                console.error('[AssistantConversation] Could not find tool call for tool message', toolMsg.id, 'with toolCallId', toolMsg.toolCallId);
            }
        });
    }
}

// Input type for adding a message
export type AddMessageInput = {
    question: string;
    file?: File;
};
