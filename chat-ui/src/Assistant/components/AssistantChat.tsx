
import { Alert, CircularProgress, Box, Divider, IconButton, Dialog, DialogTitle, DialogContent, Typography, Tooltip } from "@mui/material";
import { useCreateMessageMutation, useThreadMessages, useStreamMessage } from "../hooks/api";
import { Thread } from "../models/Thread";
import { AssistantChatProps } from "./AssistantContainer";
import { AssistantConversation, MessageSlice } from "../models/Message";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { resolveTemplate } from "@contentgrid/hal-forms";
import { useEffect, useState, useRef } from "react";
import { LoadingAsssitantIcon } from "./AssistantIcon";
import { makeStyles } from "tss-react/mui";
import { Refresh, Settings, Close, Draw } from "@mui/icons-material";
import { assistantToolBarHeight } from "./constants";
import { AIIcon } from "./AssistantIcon";
import useInterval from "./interval";

interface AssistantChatLoaderProps extends AssistantChatProps {
    thread : Thread;
    handleCreateNewThread: () => void;
}

export const AssistantChatLoader = (props : AssistantChatLoaderProps) => {
    const { data: messages, error: messagesError, isFetching: messagesIsFetching, refetch: reloadConversation } = useThreadMessages(props.thread);
    const conversationRef = useRef<AssistantConversation>(new AssistantConversation([]));
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = async () => {
        await reloadConversation();
        if (messages) {
            conversationRef.current.setMessages(messages.messages);
            setRefreshTrigger(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (messages) {
            conversationRef.current.addMessages(messages.messages);
            setRefreshTrigger(prev => prev + 1);
        }
    }, [messages]);

    if (messagesError) {
        return <Alert severity="error">{messagesError.message}</Alert>
    }

    if (!messages) {
        return <Alert severity="info">No messages found</Alert>
    }

    const conversationKey = `${conversationRef.current.latestMessage?.id || 'empty'}-${refreshTrigger}`;

    return <AssistantChat {...props} messageSlice={messages} conversation={conversationRef.current} refetchMessages={handleRefresh} messagesIsFetching={messagesIsFetching} conversationKey={conversationKey} ></AssistantChat>
} 

interface AssistantLoadedChatProps extends AssistantChatProps {
    messageSlice : MessageSlice,
    conversation : AssistantConversation,
    refetchMessages : () => void,
    messagesIsFetching : boolean,
    enableStreaming?: boolean,
    conversationKey?: string,
    handleCreateNewThread: () => void;
}

export const AssistantChat = ({messageSlice, conversation, refetchMessages, messagesIsFetching, enableStreaming = true, conversationKey, handleCreateNewThread, ...props} : AssistantLoadedChatProps) => {
    const { mutateAsync: createMessage } = useCreateMessageMutation(messageSlice);
    const { streamMessage, isStreaming, streamingContent } = useStreamMessage(messageSlice, conversation);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const createNewMessageTemplate = resolveTemplate(messageSlice, "addMessage");
    const newMessageCanBeAdded = createNewMessageTemplate !== null

    const handleAskQuestion = async (question : string , file? : File) => {
        if (enableStreaming) {
            await streamMessage(question, file);
        } else {
            await createMessage({question : question, file : file});
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refetchMessages()
        } catch (err) {
            console.error('Failed to refresh messages', err)
        } finally {
            setIsRefreshing(false)
        }
    }

    // Only poll when streaming is disabled and message can't be added
    useInterval(() => {
        if (!enableStreaming && !newMessageCanBeAdded) {
            refetchMessages();
        }
    }, 2000);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' , width: "100%" }}>
            <AssistantChatTopToolBar isNewMessageLoading={!newMessageCanBeAdded || isStreaming} isNewInputLoading={isInputFocused} handleCreateNewThread={handleCreateNewThread} handleRefresh={handleRefresh} settings={props.settings} />
            {isRefreshing ? 
                <Box display={"flex"} flex={1} alignItems={"center"} justifyContent={"center"}><CircularProgress/></Box>
                :
                <MessageList conversation={conversation} streamingContent={streamingContent} isStreaming={isStreaming} {...props} key={conversationKey}/>
            }
            <MessageInput 
                messageSlice={messageSlice} 
                enabled={newMessageCanBeAdded && !isStreaming} 
                onMessageSent={handleAskQuestion}
                onFocusChange={setIsInputFocused}
            />
        </Box>
    );
}

interface AssistantChatTopToolBarProps {
    isNewMessageLoading : boolean,
    isNewInputLoading : boolean,
    handleRefresh : () => void,
    settings? : React.ReactNode
    handleCreateNewThread: () => void;
}

const AssistantChatTopToolBar = ({isNewMessageLoading, isNewInputLoading, handleRefresh, settings, handleCreateNewThread} : AssistantChatTopToolBarProps) => {
    const { classes } = useStyles();
    const [settingsOpen, setSettingsOpen] = useState(false);

    return <Box className={classes.toolBarContainer}>
        <Box className={classes.toolbarContent}>
            <Box className={classes.toolbarSide}>

            </Box>
            <LoadingAsssitantIcon loading={isNewMessageLoading} lookDown={isNewInputLoading} />
            <Box className={classes.toolbarSide}>
                <Tooltip title="Start new chat" placement="top">
                    <IconButton onClick={handleCreateNewThread}><Draw /></IconButton>
                </Tooltip>
                <Tooltip title="Refresh" placement="top">
                    <IconButton onClick={handleRefresh}><Refresh/></IconButton>
                </Tooltip>
                <Tooltip title="Settings" placement="top">
                    <IconButton onClick={() => setSettingsOpen(true)}><Settings/></IconButton>
                </Tooltip>
            </Box>
        </Box>
        <Divider/>
        <AssistantChatSettings settings={settings} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
}

interface AssistantChatSettingsProps {
    settings: React.ReactNode;
    open: boolean;
    onClose: () => void;
}

const AssistantChatSettings = ({settings, open, onClose} : AssistantChatSettingsProps) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, marginTop : 1 }}>
                <Box flexShrink="0">
                    <AIIcon />
                </Box>
                <Typography variant="h6" sx={{ flex: 1 }}>
                    ContentGrid Assistant Settings
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 2, pb: 1 }}>
                    {settings || <Typography color="text.secondary">No settings available</Typography>}
                </Box>
            </DialogContent>
        </Dialog>
    );
}

const useStyles = makeStyles()((theme) => ({
    toolbarContent: {
        display : "flex",
        flexGrow: '1',
        alignItems : "flex-end",
        justifyContent: "space-between",
        marginBottom : theme.spacing(2),
        position: "relative",
    },
    toolbarSide: {
        flex: 1,
        display: "flex",
        justifyContent: "flex-start",
        '&:last-child': {
            justifyContent: "flex-end",
        },
    },
    toolBarContainer : {
        display : "flex",
        flexDirection: "column",
        width : "100%",
        height: `calc(${assistantToolBarHeight} + 1px)`,
        marginBottom : theme.spacing(1)
    },
}));