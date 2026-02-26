import { Box } from "@mui/material";
import { AIMessage, ToolMessage } from "../../models/Message";
import { makeStyles } from "tss-react/mui";
import { renderMessageContent } from "./MessageContentBlocks";
import { MessageActions, MessageCopyButton, ThumbsDownButton, ThumbsUpButton } from "../actions/MessageActions";
import ToolCallItem from "./ToolCallItem";
import { useState } from "react";

interface AIMessageItemProps {
    message: AIMessage;
    renderToolCallResponse? : (args0 : ToolMessage) => React.ReactNode,
    showTechnicalToolCalls? : boolean
}

const useStyles = makeStyles()((theme) => ({
    container: {
        display: 'flex',
        justifyContent: 'flex-start',
        flexDirection: "column-reverse",
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        marginBottom: theme.spacing(1),
    },
    toolCallsContainer: {
        marginTop: theme.spacing(1),
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1),
    },
    toolCallItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.5),
    },
    blueBordered: {
        border: `2px solid ${theme.palette.primary.main}`,
    },
    greenBordered: {
        border: `2px solid ${theme.palette.success.main}`,
    },
    redBordered: {
        border: `2px solid ${theme.palette.error.main}`,
    },
    argsContainer: {
        padding: theme.spacing(2),
        backgroundColor : theme.palette.primary.light,
        borderRadius: theme.shape.borderRadius,
    },
    argsContainerSuccess: {
        backgroundColor: theme.palette.success.light,
    },
    argsContainerError: {
        backgroundColor: theme.palette.error.light,
    },
    argRow: {
        display: 'flex',
        gap: theme.spacing(1),
        marginBottom: theme.spacing(0.5),
        marginLeft: theme.spacing(2),
        '&:last-child': {
            marginBottom: 0,
        },
    },
    argKey: {
        fontWeight: 600,
        color: theme.palette.text.secondary,
        minWidth: '120px',
    },
    argValue: {
        color: theme.palette.text.primary,
        wordBreak: 'break-word',
    },
    expandIcon: {
        transition: theme.transitions.create('transform'),
    },
    expandIconOpen: {
        transform: 'rotate(180deg)',
    },
    markdownContainer: {
        width: '100%',
        wordBreak: 'break-word',
        hyphens: 'auto',
        '& img': {
            width: '100%',
            height: 'auto',
        },
        '& pre, & code': {
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
        },
    }
}));

export const AIMessageItem = ({ message, renderToolCallResponse, showTechnicalToolCalls }: AIMessageItemProps) => {
    const { classes } = useStyles();
    const [thumbsUp, setThumbsUp] = useState(false);
    const [thumbsDown, setThumbsDown] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.textContent);
    };

    const handleThumbUp = () => {
        if (thumbsUp) {
            // Clicking again to deactivate
            setThumbsUp(false);
        } else {
            // Activate thumbs up, deactivate thumbs down
            setThumbsUp(true);
            setThumbsDown(false);
        }
    }

    const handleThumbDown = () => {
        if (thumbsDown) {
            // Clicking again to deactivate
            setThumbsDown(false);
        } else {
            // Activate thumbs down, deactivate thumbs up
            setThumbsDown(true);
            setThumbsUp(false);
        }
    }

    const hasTextContent = message.textContent.trim().length > 0;

    return (
        <Box className={classes.container}>
            {hasTextContent && (
                <MessageActions alignment="left" showOnHover={false}>
                    <MessageCopyButton onCopy={handleCopy} />
                    {!thumbsDown && (
                        <ThumbsUpButton 
                            onThumbsUp={handleThumbUp} 
                            isActive={thumbsUp}
                        />
                    )}
                    {!thumbsUp && (
                        <ThumbsDownButton 
                            onThumbsDown={handleThumbDown}
                            isActive={thumbsDown}
                        />
                    )}
                </MessageActions>
            )}
            <Box marginLeft={1}>
                {message.content && renderMessageContent(message.content, classes)}
            </Box>

            {message.hasToolCalls && (
                <Box className={classes.toolCallsContainer}>
                    {message.toolCalls.map((toolCall) => <ToolCallItem key={toolCall.id} toolCall={toolCall} showTechnicalToolCalls={showTechnicalToolCalls} renderToolCallResponse={renderToolCallResponse} />)}
                </Box>
            )}
        </Box>
    );
};
