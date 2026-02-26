import { Box } from "@mui/material";
import { HumanMessage, AIMessage, AssistantConversation } from "../models/Message";
import { HumanMessageItem } from "./messages/HumanMessageItem";
import { AIMessageItem } from "./messages/AIMessageItem";
import { StreamedMessageItem } from "./messages/StreamedMessageItem";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssistantChatProps } from "./AssistantContainer";

interface MessageListProps extends AssistantChatProps {
    conversation: AssistantConversation;
    streamingContent?: string;
    isStreaming?: boolean;
}

export const MessageList = ({ conversation, streamingContent, isStreaming, onToolCallResponse, renderToolCallResponse, showTechnicalToolCalls }: MessageListProps) => {
    const latestMessage = conversation.latestMessage;
    
    // Recompute message list when latestMessage changes
    const messageList = useMemo(() => conversation.messages, [latestMessage]);
    
    // Scroll to bottom when new message arrives
    const chatBoxRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [latestMessage, streamingContent]);

    const [displayedToolMessages, setDisplayedToolMessages] = useState<string[]>([]);

    useEffect(() => {
        // Find the latest tool message with an artifact
        const toolMessages = conversation.toolMessages;
        if (toolMessages.length > 0) {
            const latestToolMessage = toolMessages[toolMessages.length - 1];
            if (latestToolMessage?.artifact) {
                // Handle auto-navigation for the latest action
                const hasBeenDisplayed = displayedToolMessages.includes(latestToolMessage.id);
                if (!hasBeenDisplayed) {
                    onToolCallResponse?.(latestToolMessage);
                    setDisplayedToolMessages((ids) => [latestToolMessage.id, ...ids]);
                }
            }
        }
    }, [latestMessage, displayedToolMessages, conversation, onToolCallResponse]);

    return (
        <Box ref={chatBoxRef} key={`chatbox-${latestMessage?.id}`} sx={{ display: 'flex', flex: 1, overflowY: 'auto', flexDirection: 'column', paddingLeft: 2, paddingRight: 2, maxWidth : "1000px", margin: "auto", width: "100%"}}>
            {messageList.map((message) => {
                if (message.hidden) return null;
                
                if (message instanceof HumanMessage) {
                    return <HumanMessageItem key={message.id} message={message} />;
                }
                
                if (message instanceof AIMessage) {
                    return <AIMessageItem key={message.id} message={message} showTechnicalToolCalls={showTechnicalToolCalls} renderToolCallResponse={renderToolCallResponse}/>;
                }

                return null;
            })}
            
            {/* Show streaming message at the bottom */}
            {isStreaming && streamingContent && (
                <StreamedMessageItem content={streamingContent} />
            )}
        </Box>
    );
};
