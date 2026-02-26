import { Box, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { ToolMessage } from "../../models/Message";

const useStyles = makeStyles()((theme) => ({
    chipContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(0.5),
        padding: theme.spacing(0.5, 1.5),
        borderRadius: 16,
        backgroundColor: 'transparent',
        flex: '1 1 0',
        minWidth: 0,
        overflow: 'hidden',
    },
    success: {
        color: theme.palette.success.main,
    },
    error: {
        color: theme.palette.error.main,
    },
    label: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
}));

type ToolCallResponseChipProps = {
    toolMessage: ToolMessage;
};

export const ToolCallResponseChip = ({ toolMessage }: ToolCallResponseChipProps) => {
    const { classes, cx } = useStyles();
    
    const isSuccess = toolMessage.status === "success" && 
                     !toolMessage.hasFailed
    
    const response = toolMessage.content;

    if (!response) return null;

    return (
        <Box 
            className={cx(classes.chipContainer, {
                [classes.success]: isSuccess,
                [classes.error]: !isSuccess,
            })}
        >
            <Typography className={classes.label} component="span">
                {response}
            </Typography>
        </Box>
    );
};
