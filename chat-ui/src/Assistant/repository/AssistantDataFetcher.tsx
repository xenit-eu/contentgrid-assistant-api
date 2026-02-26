import { HttpError, HttpJsonError } from "../components/HttpError";
import IAssistantDataFetcher from "./IAssistantDataFetcher";
import { User as OidcUser } from 'oidc-client-ts';
import { HalObject,  SimpleLink } from "@contentgrid/hal";
import { Thread, ThreadShape, ThreadSlice, ThreadSliceShape } from "../models/Thread";
import { Agent, AgentShape, AgentSlice, AgentSliceShape } from "../models/AssistantHome";
import relationNames from "./AssistantLinkRelations"
import { ThreadContext } from "../models/ThreadContext";
import { resolveTemplate, resolveTemplateRequired } from "@contentgrid/hal-forms";
import { Message, MessageSlice, MessageSliceShape, HumanMessage, AIMessage, ToolMessage, HumanMessageShape, AIMessageShape, ToolMessageShape, MessageShape } from "../models/Message";
import { createEventSource } from 'eventsource-client';


export default class AssistantDataFetcher implements IAssistantDataFetcher {
    private readonly baseUrl: string;

    private readonly authority: string;
    private readonly clientId: string;

    public constructor(baseUrl: string, oidcAuthority: string, oidcClientId: string) {
        this.baseUrl = baseUrl;
        this.authority = oidcAuthority;
        this.clientId = oidcClientId;
    }

    public async getHome() : Promise<AgentSlice> {
        const url = SimpleLink.to(this.baseUrl);
        const response = await this.fetchJson<AgentSliceShape>(url);
        return new AgentSlice(response);
    }

    public async createThread(threadSlice : ThreadSlice): Promise<Thread> {
        // Access the raw data that was used to create the HalSlice
        const template = resolveTemplateRequired(threadSlice, 'startThread');
        const {url : collectionurl , method} = template.request as any;
        
        let finalUrl = collectionurl;
        const url = SimpleLink.to(finalUrl);
        return new Thread(await this.fetchJson(url, {
            method,
        }));
    }

    public async deleteThread(thread : Thread) : Promise<{ message: string }> {
        const template = resolveTemplateRequired(thread, 'delete');
        const {url, method} = template.request as any;
        const delete_url = SimpleLink.to(url);
        return await this.fetchJson(delete_url, {
            method,
        });
    }

    public async getAgentHome() : Promise<Agent> {
        const url = SimpleLink.to(this.baseUrl);
        const response = await this.fetchJson<AgentShape>(url);
        return new Agent(response);
    }
    
    public async getThreads(agent : Agent, threadContext: ThreadContext ): Promise<ThreadSlice> {
        // places calling this should only render when the assistant link is present
        const url = agent.links.requireSingleLink(relationNames.threads) // find threads link

        let finalUrl = url.href;
        
        const response =  await this.fetchJson<ThreadSliceShape>(SimpleLink.to(finalUrl));
        // Create HalSlice with the response data and preserve additional ThreadSlice properties
        const threadSlice : ThreadSlice = new ThreadSlice(response)
        // Merge the HalSlice methods with the additional ThreadSlice properties
        return threadSlice;
    }
    
    public async getThread(thread: Thread): Promise<Thread> {
        const url = SimpleLink.to(thread.self.href);
        const response =  await this.fetchJson<ThreadShape>(url);
        // Create HalSlice with the response data and preserve additional ThreadSlice properties
        const loadedThread: Thread = new Thread(response)
        // Merge the HalSlice methods with the additional ThreadSlice properties
        return loadedThread
    }

    public async getMessages(thread: Thread): Promise<MessageSlice> {
        const url = thread.links.findLink(relationNames.messages)!;
        const response =  await this.fetchJson<MessageSliceShape>(url);
        return  new MessageSlice(response)
    }

    public async createMessage(conversation: MessageSlice, question: string, file?: File): Promise<Message> {
        const template = resolveTemplate(conversation, 'addMessage');
        const { url, method } = template!.request;
        const properties = template!.properties;

        // Create a new FormData object
        const formData = new FormData();

        // Add properties to the form data
        properties.forEach((property) => {
            if (property.name === 'question') {
                formData.append(property.name, question !== '' ? question : 'I attached a file');
            } else if (property.name === 'file') {
                if (file) {
                    formData.append(property.name, file);
                }
            }
        });

        // Use the existing fetchJson method
        return await this.fetchJson<Message>(SimpleLink.to(url), {
            method,
            body: formData,
        });
    }

    public async streamMessage(
        messageSlice: MessageSlice,
        question: string,
        file: File | undefined,
        onTokenChunk: (messageId: string, content: string) => void,
        onMessageUpdate: (messages: Message[]) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> {
        const template = resolveTemplate(messageSlice, 'addMessage');
        if (!template) {
            throw new Error('addMessage template not found');
        }

        const { url, method } = template.request;

        // Create FormData
        const formData = new FormData();
        formData.append('question', question !== '' ? question : 'I attached a file');
        if (file) {
            formData.append('file', file);
        }

        // Get token for auth
        const token = this.getToken();

        try {
            const es = createEventSource({
                url: url,
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream'
                },
                body: formData,
                fetch: globalThis.fetch,
                onMessage: ({ data, event, id }) => {                    
                    try {
                        if (event === 'message') {
                            // Array of HAL messages - convert to Message objects
                            const parsed = JSON.parse(data);
                            const messages = parsed.map((halMessage: MessageShape) => {
                                switch (halMessage.type) {
                                    case 'human':
                                        return new HumanMessage(halMessage as HumanMessageShape);
                                    case 'ai':
                                        return new AIMessage(halMessage as AIMessageShape);
                                    case 'tool':
                                        return new ToolMessage(halMessage as ToolMessageShape);
                                    default:
                                        throw new Error(`Unknown message type: ${(halMessage as any).type}`);
                                }
                            });
                            onMessageUpdate(messages);
                        } else if (event === 'token') {
                            // Token event - data is the raw string content, id is the message ID
                            if (id && data) {
                                const content = JSON.parse(data);
                                onTokenChunk(id, content);
                            }
                        } else {
                            // Check for completion
                            const parsed = JSON.parse(data);
                            if (parsed.complete) {
                                onComplete();
                                es.close();
                            }
                        }
                    } catch (error) {
                        console.error('[StreamMessage] Error parsing SSE message:', error, { event, data });
                        onError(error instanceof Error ? error : new Error(String(error)));
                        es.close();
                    }
                },
            });
        } catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    private getToken(): String | null {
        var oidcKey = `oidc.user:${this.authority}:${this.clientId}`;
        const oidcStorage = sessionStorage.getItem(oidcKey);
        if (!oidcStorage) {
            return null;
        }

        var oidcUser = OidcUser.fromStorageString(oidcStorage);
        return oidcUser?.access_token;
    }

    public async fetch(input: string | Request, init?: RequestInit | undefined): Promise<Response> {
        const request = new Request(input, init);
        const token = this.getToken();
        
        if (token) {
            request.headers.append("Authorization", `Bearer ${token}`);
        }

        const response = await window.fetch(request);
        if (!response.ok) {
            throw await HttpJsonError.tryFromResponse(request.method, request.url, response);
        }

        return response;
    }

    public async fetchJson<T>(url: SimpleLink, init?: RequestInit): Promise<T> {
        const request = new Request(url.href, init);
        request.headers.append("Accept", "application/prs.hal-forms+json");
        const response = await this.fetch(request);
        if (response.status === 204) {
            throw new Error('Expected JSON but received 204 No Content');
        }
        return await response.json();
    }
}