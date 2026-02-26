import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetcher from '../repository';
import { Agent } from "../models/AssistantHome";
import { Thread, ThreadCreate, ThreadSlice } from "../models/Thread";
import { ThreadContext } from "../models/ThreadContext";
import { TypedRequest } from "@contentgrid/typed-fetch";
import { Message, MessageSlice, AssistantConversation } from "../models/Message";
import AssistantLinkRelations from "../repository/AssistantLinkRelations";
import { useCallback, useState } from "react";

const AssistantHometagKey = 'Assistant'
const ThreadsTagKey = 'Assistantthreads';
export const CurrentThreadTagKey = 'AssistantThread'
export const CurrentThreadMessages = 'AssistantMessages'

export const useAgents = () => {
    return useQuery({
        queryKey: [AssistantHometagKey],
        queryFn: () => fetcher.getHome(),
    })
}

export const useAgent = () => {
    return useQuery({
        queryKey: [AssistantHometagKey],
        queryFn: () => fetcher.getAgentHome(),
    })
}

export const useThreads = (agent : Agent, threadContext? : ThreadContext) => {
    return useQuery({
        queryKey: [ThreadsTagKey, agent.name],
        queryFn: () => fetcher.getThreads(agent, threadContext),
    });
}

export const useThread = (thread : Thread) => {
    return useQuery({
        queryKey: [CurrentThreadTagKey, thread.self.href],
        queryFn: () => fetcher.getThread(thread),
    });
}

export const useThreadMessages = (thread : Thread) => {
    return useQuery({
        queryKey: [CurrentThreadMessages, thread.self.href],
        queryFn: () => fetcher.getMessages(thread),
    });
}

export function useCreateThreadMutation(threadContext : ThreadContext) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (threads: ThreadSlice): Promise<Thread> =>
            fetcher.createThread(threads, threadContext),
        onSuccess: (newThread) => {
            queryClient.setQueryData(
                [CurrentThreadTagKey, newThread.self.href], 
                newThread
            );
            queryClient.invalidateQueries({ queryKey: [ThreadsTagKey] });
        },
    });
}

export function useDeleteThreadMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (thread: Thread): Promise<{message : string}> =>
            fetcher.deleteThread(thread),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ThreadsTagKey] });
        },
    });
}

export function useUpdateThreadMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: TypedRequest<ThreadCreate, Thread>) => {
            const response = await fetcher.fetch(request);
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ThreadsTagKey] });
        },
    });
}

export function useCreateMessageMutation(messagesList : MessageSlice) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ question, file }: { question: string; file?: File}): Promise<Message> =>
            fetcher.createMessage(messagesList, question, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CurrentThreadMessages, messagesList.links.findLink(AssistantLinkRelations.thread)?.href] });
        },
    });
}

interface StreamingState {
    isStreaming: boolean;
    streamingContent: string;
}

export function useStreamMessage(
    messageSlice: MessageSlice,
    conversation: AssistantConversation
) {
    const queryClient = useQueryClient();
    const [streamingState, setStreamingState] = useState<StreamingState>({
        isStreaming: false,
        streamingContent: ''
    });

    const streamMessage = useCallback(async (question: string, file?: File) => {
        setStreamingState({ isStreaming: true, streamingContent: '' });
        
        await fetcher.streamMessage(
            messageSlice,
            question,
            file,
            
            // onTokenChunk - accumulate content
            (_messageId: string, content: string) => {
                setStreamingState(prev => ({
                    ...prev,
                    streamingContent: prev.streamingContent + content
                }));
            },
            
            // onMessageUpdate - receive complete HAL message objects
            (messages: Message[]) => {
                // Use conversation's addMessages to handle incremental updates
                conversation.addMessages(messages);
                
                // Clear streaming content when we get complete messages
                setStreamingState(prev => ({
                    ...prev,
                    streamingContent: ''
                }));
            },
            
            // onComplete
            () => {
                setStreamingState({
                    isStreaming: false,
                    streamingContent: ''
                });
                // Final refetch to ensure consistency
                queryClient.invalidateQueries({ 
                    queryKey: [CurrentThreadMessages, messageSlice.links.findLink(AssistantLinkRelations.thread)?.href] 
                });
            },
            
            // onError
            (error: Error) => {
                console.error('[useStreamMessage] Streaming error:', error);
                setStreamingState({
                    isStreaming: false,
                    streamingContent: ''
                });
            }
        );
    }, [messageSlice, conversation, queryClient]);

    return {
        streamMessage,
        ...streamingState
    };
}