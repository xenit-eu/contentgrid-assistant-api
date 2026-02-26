import { Box, Paper, Typography, Chip, Alert, IconButton, Collapse } from "@mui/material";
import { ToolMessage } from "../../models/Message";
import { makeStyles } from "tss-react/mui";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from "react";

interface ToolCallResponseItemProps {
    message: ToolMessage;
}

const useStyles = makeStyles()((theme) => ({
    container: {
        display: 'flex',
        justifyContent: 'center',
        margin: "auto",
        padding: theme.spacing(1, 0),
    },
    messagePaper: {
        width : "100%",
        padding: theme.spacing(1.5),
        backgroundColor: theme.palette.background.default,
        border: `1px solid ${theme.palette.divider}`,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent : "space-between",
        gap: theme.spacing(1),
        marginBottom: theme.spacing(0.5),
        cursor: "pointer"
    },
    artifactsContainer: {
        marginTop: theme.spacing(1),
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.5),
    },
    expandButton: {
        padding: theme.spacing(0.5),
        transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
        }),
    },
    expandButtonOpen: {
        transform: 'rotate(180deg)',
    },
}));

export const ToolCallResponseItem = ({ message }: ToolCallResponseItemProps) => {
    const { classes } = useStyles();
    const artifacts = message.artifacts;
    const [expanded, setExpanded] = useState(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    return (
        <Box className={classes.container}>
            <Paper className={classes.messagePaper} elevation={0}>
                <Box className={classes.header} onClick={handleExpandClick}>
                    <Box display={"flex"} gap={1} alignItems={"center"}>
                        <IconButton
                            className={`${classes.expandButton} ${expanded ? classes.expandButtonOpen : ''}`}
                            onClick={handleExpandClick}
                            size="small"
                            aria-expanded={expanded}
                            aria-label="show more"
                        >
                            <ExpandMoreIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary" >
                         Tool response: {message.name}
                        </Typography>
                    </Box>
                    
                    {message.hasFailed ? (
                        <Chip
                            icon={<ErrorIcon />}
                            label="Failed"
                            size="small"
                            color="error"
                            variant="outlined"
                        />
                    ) : (
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="Success"
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                    )}
                </Box>

                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box className={classes.artifactsContainer}>
                        {artifacts.map((artifact, index) => (
                            <Alert
                                key={index}
                                severity={artifact.failed ? "error" : "success"}
                                variant="outlined"
                                icon={false}
                            >
                                <Typography variant="caption">
                                    <strong>{artifact.action_type}</strong>
                                    {artifact.entity && ` • Entity: ${artifact.entity}`}
                                    {artifact.attribute && ` • Attribute: ${artifact.attribute}`}
                                    {artifact.relation && ` • Relation: ${artifact.relation}`}
                                </Typography>
                                <Typography variant="body2">{artifact.response}</Typography>
                            </Alert>
                        ))}
                    </Box>
                </Collapse>
            </Paper>
        </Box>
    );
};
