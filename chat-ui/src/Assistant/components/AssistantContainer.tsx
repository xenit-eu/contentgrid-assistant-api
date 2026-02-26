import { Alert,  Box, Button, Card, CardContent, Grid, Typography } from "@mui/material";

import { useAgents, useCreateThreadMutation, useThreads } from "../hooks/api";
import { Agent, AgentSlice } from "../models/AssistantHome";
import { useCallback, useEffect, useState } from "react";
import { Thread } from "../models/Thread";
import { ThreadContext } from "../models/ThreadContext";
import { AssistantChatLoader } from "./AssistantChat";
import { AIMessage, HumanMessage, ToolMessage } from "../models/Message";
import { AssistantChatDrawer } from "./AssistantChatDrawer";
import { makeStyles } from "tss-react/mui";
import { assistantContainerHeight, assistantDrawerOpenedWidth, assistantDrawerClosedWidth } from "./constants";
import { LoadingAsssitantIcon } from "./AssistantIcon";
import { Add } from "@mui/icons-material";

interface AssistantContainerProps {
    threadContext: ThreadContext,
    autoSelectLatestThread? : boolean,
    showTechnicalToolCalls? : boolean,
    showDrawer? : boolean,
    chatHistoryDrawerOpened? : boolean,
    renderToolCallResponse? : (value : ToolMessage) => React.ReactNode,
    onChatHistoryDrawerOpened? : (value : boolean) => void,
    onThreadSelect? : (value : Thread | undefined) => void,
    onToolCall? : (arg0 : ToolMessage) => void,
    onHumanMessage? : (arg0 : HumanMessage) => void,
    onAIMessage? : (arg0 : AIMessage) => void,
    onToolCallResponse? : (arg0 : ToolMessage) => void,
    settings? : React.ReactNode
}

export interface AssistantChatProps extends AssistantContainerProps {
    agent : Agent
}

export const AssistantContainer = (props: AssistantContainerProps) => {
    const {data : agentSlice, error} = useAgents();
    const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>(undefined);

    if (error) {
        return <Alert severity="error">Agents could not be loaded</Alert>;
    }

    if (agentSlice) {
        // If only one agent, auto-select it
        if (agentSlice.agents.length === 1 && !selectedAgent) {
            setSelectedAgent(agentSlice.agents[0]);
        }

        // Show agent selector if multiple agents and none selected
        if (!selectedAgent && agentSlice.agents.length > 1) {
            return <AgentSelector agentSlice={agentSlice} onSelectAgent={setSelectedAgent} />;
        }

        // Show threads for selected agent
        if (selectedAgent) {
            return <AssistantThreadsLoader agent={selectedAgent} onBackToAgents={() => setSelectedAgent(undefined)} {...props}/>;
        }
    }

    return null;
}

type AgentSelectorProps = {
    agentSlice: AgentSlice;
    onSelectAgent: (agent: Agent) => void;
}

const AgentSelector = ({ agentSlice, onSelectAgent }: AgentSelectorProps) => {
    const { classes } = useStyles();

    return (
        <Box className={classes.welcomeContainer}>
            <Box className={classes.welcomeContent}>
                <LoadingAsssitantIcon loading={false} lookDown={false} />
                
                <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
                    Select an Assistant
                </Typography>
                
                <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 500, textAlign: 'center' }}>
                    Choose which assistant you'd like to chat with
                </Typography>

                <Grid container spacing={2} sx={{ maxWidth: 800 }}>
                    {agentSlice.agents.map((agent) => (
                        <Grid item xs={12} sm={6} md={4} key={agent.name}>
                            <Card 
                                sx={{ 
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4
                                    }
                                }}
                                onClick={() => onSelectAgent(agent)}
                            >
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {agent.name}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {agent.version}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Box>
    );
}


interface AssistantThreadsLoaderProps extends AssistantChatProps {
    onBackToAgents: () => void;
}

const AssistantThreadsLoader = ({showDrawer=true, autoSelectLatestThread=false, chatHistoryDrawerOpened=false, onChatHistoryDrawerOpened, onThreadSelect, onBackToAgents, ...props} : AssistantThreadsLoaderProps) => {
    const { classes, cx } = useStyles();
    const { data : threads, error : threadsError, isPending : threadsIsPending} = useThreads(props.agent, props.threadContext);
    const { mutateAsync: createThread, isPending : createThreadIsPending, error: createThreadError, reset: resetThreadError } = useCreateThreadMutation(props.threadContext);

    const [selectedThread, setSelectedThread] = useState<Thread | undefined>(undefined)
    const [drawerOpenedInternal, setDrawerOpenedInternal] = useState(chatHistoryDrawerOpened);

    const setDrawerOpened = (value : boolean) => {
        setDrawerOpenedInternal(value)
        onChatHistoryDrawerOpened?.(value)
    }

    const handleSelectThread = (thread : Thread | undefined) => {
        setSelectedThread(thread)
        onThreadSelect?.(thread)
    }

    const handleCreateNewThread = useCallback(async () => {
        // Clear any previous errors before creating new thread
        resetThreadError();
        
        // Clear the current conversation by resetting the thread
        handleSelectThread(undefined);
        if (threads) {
            createThread(threads).then((created : Thread) => handleSelectThread(created));
        }
    }, [createThread, resetThreadError, threads]);

    useEffect(() => {
        // If threadId is passed we select it if found.
        if (props.threadContext && props.threadContext.threadId) {
            const threadById = threads?.threads?.find(thread => thread.data.id === props.threadContext.threadId);
            if (threadById) {
                handleSelectThread(threadById);
                return;
            }
        }
        // Sets the selectedThread to the latest one.
        if (autoSelectLatestThread && selectedThread === undefined && threads?.threads && threads?.threads.length > 0) {
            handleSelectThread(threads?.threads[threads.threads.length - 1])
        }
    }, [threads])

    if (threadsIsPending) {
        return "Loading..."
    }

    if (threadsError) {
        return <Alert severity="error">Assistant threads could not be loaded</Alert>;
    }

    if (threads) {
        return <Box className={classes.assistantContainer}>
            {showDrawer && <AssistantChatDrawer 
                threadSlice={threads} 
                drawerOpened={drawerOpenedInternal} 
                setDrawerOpened={setDrawerOpened} 
                setSelectedThread={handleSelectThread} 
                handleCreateNewThread={handleCreateNewThread}
                {...props}
            />}
            <Box className={cx({
                    [classes.chatContainerFullSize] : !showDrawer,
                    [classes.chatContainerDrawerOpen] : showDrawer && drawerOpenedInternal,
                    [classes.chatContainerDrawerClosed] : showDrawer && !drawerOpenedInternal,
                })}>
                {selectedThread ?
                    <AssistantChatLoader thread={selectedThread} handleCreateNewThread={handleCreateNewThread} {...props}/>
                    :
                    <NewThreadWelcomeBox 
                        handleCreateNewThread={handleCreateNewThread} 
                        newThreadIsPending={createThreadIsPending}
                        error={createThreadError}
                        onDismissError={resetThreadError}
                    />
                }
            </Box>
        </Box>
    }

    return null
}

type NewThreadWelcomeBoxProps = {
    handleCreateNewThread: () => void;
    newThreadIsPending: boolean;
    error: Error | null;
    onDismissError: () => void;
}

const NewThreadWelcomeBox = ({ handleCreateNewThread, newThreadIsPending, error, onDismissError }: NewThreadWelcomeBoxProps) => {
    const { classes } = useStyles();
    const [isHovering, setIsHovering] = useState(false);

    return (
        <Box className={classes.welcomeContainer}>
            <Box className={classes.welcomeContent}>
                <LoadingAsssitantIcon loading={newThreadIsPending} lookDown={isHovering} />
                
                <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
                    Hello, I'm the ContentGrid Assistant!
                </Typography>
                
                <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 500, textAlign: 'center' }}>
                    Start a new conversation to get help with your datamodel.
                </Typography>

                {error && (
                    <Alert 
                        severity="error" 
                        onClose={onDismissError}
                        sx={{ mb: 2, maxWidth: 500 }}
                    >
                        Failed to create thread: {error.message}
                    </Alert>
                )}

                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleCreateNewThread}
                    startIcon={<Add/>}
                    disabled={newThreadIsPending}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    sx={{ mt: 4 }}
                >
                    {newThreadIsPending ? 'Starting...' : 'New Chat'}
                </Button>
            </Box>
        </Box>
    );
}

const useStyles = makeStyles()((theme) => ({
    assistantContainer : {
        height : assistantContainerHeight,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
    },
    welcomeContainer: {
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default,
    },
    welcomeContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(4),
    },
    chatContainerFullSize : {
        height: '100%',
        width: '100%'
    },
    chatContainerDrawerOpen: {
        height: '100%',
        width: `calc(100% - ${assistantDrawerOpenedWidth})`,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    chatContainerDrawerClosed: {
        height: '100%',
        width: `calc(100% - ${assistantDrawerClosedWidth})`,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    }
}));