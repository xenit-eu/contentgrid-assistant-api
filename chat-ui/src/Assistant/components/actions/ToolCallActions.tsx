import { Box, Button } from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import { makeStyles } from "tss-react/mui";
import { ToolCall } from "../../models/Message";

const useStyles = makeStyles()((theme) => ({
    actionsContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: theme.spacing(1),
        marginTop: theme.spacing(2),
    },
    acceptedButton: {
        '&.Mui-disabled': {
            color: theme.palette.success.main,
        },
    },
    rejectedButton: {
        '&.Mui-disabled': {
            color: theme.palette.error.main,
        },
    },
}));

type ToolCallActionsProps = {
    toolCall: ToolCall;
    accepted: boolean | undefined;
    onAccept? : (arg0 : ToolCall) => void;
    onReject? : (arg0 : ToolCall) => void;
};

export const ToolCallActions = ({ toolCall, accepted, onAccept, onReject }: ToolCallActionsProps) => {
    const { classes } = useStyles();

    const handleAccept = () => {
        onAccept?.(toolCall);
    };

    const handleReject = () => {
        onReject?.(toolCall);
    };

    if (accepted === undefined) {
        return (
            <Box className={classes.actionsContainer}>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<Check />}
                    onClick={handleAccept}
                >
                    Accept
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Close />}
                    onClick={handleReject}
                >
                    Reject
                </Button>
            </Box>
        )
    } else if (accepted) {
        return (
            <Box className={classes.actionsContainer}>
                <Button
                    className={classes.acceptedButton}
                    color="success"
                    startIcon={<Check />}
                    disabled
                >
                    Accepted
                </Button>
            </Box>
        )
    } else {
        return (
            <Box className={classes.actionsContainer}>
                <Button
                    className={classes.rejectedButton}
                    color="error"
                    startIcon={<Close />}
                    disabled
                >
                    Rejected
                </Button>
            </Box>
        )
    }
};
