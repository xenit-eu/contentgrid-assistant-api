import { HalObject } from "@contentgrid/hal";
import type { AgentShape, AgentSlice, HomeShape } from "../models/AssistantHome";
import { Thread, ThreadSlice } from "../models/Thread";
import type { ThreadContext } from "../models/ThreadContext";
import type { Message, MessageSlice } from "../models/Message";


export default interface IAssistantDataFetcher {
    fetch(input: string | Request, init?: RequestInit | undefined): Promise<Response> 
    getHome(): Promise<AgentSlice>;
    getAgentHome(): Promise<HalObject<AgentShape>>;
    getThreads(assistantHome : HalObject<AgentShape>, threadContext? : ThreadContext) : Promise<ThreadSlice>;
    getThread(thread: Thread): Promise<Thread> ;
    createThread(threadSlice : ThreadSlice, threadContext: ThreadContext) : Promise<Thread>;
    deleteThread(thread : Thread) : Promise<{ message: string }>;
    getMessages(thread: Thread) : Promise<MessageSlice>;
    createMessage(conversation: MessageSlice, question: string, file?: File): Promise<Message>;
    streamMessage(
        messageSlice: MessageSlice,
        question: string,
        file: File | undefined,
        onTokenChunk: (messageId: string, content: string) => void,
        onMessageUpdate: (messages: Message[]) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void>;
}