import { Box, Paper } from "@mui/material";
import { HumanMessage } from "../../models/Message";
import { makeStyles } from "tss-react/mui";
import { renderMessageContent } from "./MessageContentBlocks";
import { MessageActions, MessageCopyButton } from "../actions/MessageActions";

interface HumanMessageItemProps {
    message: HumanMessage;
}

const useStyles = makeStyles()((theme) => ({
    container: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
    messagePaper: {
        padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
        maxWidth: '70%',
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    },
}));

export const HumanMessageItem = ({ message }: HumanMessageItemProps) => {
    const { classes } = useStyles();

    const handleCopy = () => {
        navigator.clipboard.writeText(message.textContent);
    };

    const hasTextContent = message.textContent.trim().length > 0

    return (
        <Box>
            <Box className={classes.container}>
                <Paper className={classes.messagePaper} elevation={1}>
                    {message.content && renderMessageContent(message.content, classes)}
                </Paper>
            </Box>
            {hasTextContent && (
                <MessageActions alignment="right" showOnHover={true}>
                    <MessageCopyButton onCopy={handleCopy} />
                </MessageActions>
            )}
        </Box>
    );
};
