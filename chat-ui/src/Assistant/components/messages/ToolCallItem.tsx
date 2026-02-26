import { useEffect, useState } from "react";
import { ToolCall, ToolMessage } from "../../models/Message";
import { makeStyles } from "tss-react/mui";
import { Box, Collapse, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { green, red } from "@mui/material/colors";
import { Build, ExpandMore } from "@mui/icons-material";
import { BlockTitle } from "../BlockTitle";
import { ToolCallActions } from "../actions/ToolCallActions";
import { ToolCallResponseItem } from "./ToolCallResponseItem";
import { ToolCallResponseChip } from "./ToolCallResponseChip";

const useStyles = makeStyles()((theme) => ({
    container: {
        display: 'flex',
        justifyContent: 'flex-start',
        flexDirection: "column-reverse",
    },
    toolCallItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.5),
        width: '100%',
    },
    toolCallHeader: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        cursor: 'pointer',
        flexShrink: 0,
    },
    toolCallHeaderWithChip: {
        display: "flex",
        alignItems: "center",
        gap : theme.spacing(1),
        minWidth: 0,
        width: '100%',
    },
    toolCallHeaderPending: {
        backgroundColor : theme.palette.primary.light,
        '&:hover': {
            backgroundColor: theme.palette.grey[50],
        },
    },
    toolCallHeaderSuccess: {
        backgroundColor: green[100],
        '&:hover': {
            backgroundColor: green[50],
        },
    },
    toolCallHeaderFailed: {
        backgroundColor: red[100],
        '&:hover': {
            backgroundColor: red[50],
        },
    },
    argsContainer: {
        padding: theme.spacing(2),
        backgroundColor: theme.palette.grey[50],
        borderRadius: theme.shape.borderRadius,
        marginTop: theme.spacing(1),
    },
    argsTable: {
        marginTop: theme.spacing(1),
    },
    tableHeaderCell: {
        fontWeight: 700,
        backgroundColor: theme.palette.grey[200],
        color: theme.palette.text.primary,
    },
    argKeyCell: {
        fontWeight: 600,
        color: theme.palette.text.secondary,
        width: '30%',
        verticalAlign: 'top',
    },
    argValueCell: {
        color: theme.palette.text.primary,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
    },
    expandIcon: {
        transition: theme.transitions.create('transform'),
    },
    expandIconOpen: {
        transform: 'rotate(180deg)',
    },
}));

type ToolCallItemProps = {
    toolCall : ToolCall
    initiallyExpanded? : boolean
    renderToolCallResponse? : (args0 : ToolMessage) => React.ReactNode
    showTechnicalToolCalls? : boolean
}

const ToolCallItem = ({ toolCall, initiallyExpanded = false, showTechnicalToolCalls = true, renderToolCallResponse } : ToolCallItemProps) => {
    const { classes, cx } = useStyles();
    const [expanded, setExpanded] = useState(initiallyExpanded);

    const hasResponse : boolean = toolCall.toolResponse !== undefined
    const isSuccess : boolean | undefined = toolCall.toolResponse ? toolCall.toolResponse.status === "success" && toolCall.toolResponse.artifacts.every((artifact) => artifact.failed === false) : undefined
    
    // Undefined means that the user has not clicked accept or reject yet
    const [accepted, setAccepted] = useState<boolean | undefined>(undefined)

    useEffect(() => {
        // Once the ToolCall has a ToolCallResponse that means that the message was accepted.
        if (hasResponse && accepted === undefined) {
            setAccepted(true)
        }
    }, [isSuccess, accepted])

    if (showTechnicalToolCalls == false) {
        // If showtechnicalToolCalls is false we use the inject renderToolCallResponse function to display the toolCallResponse.
        // if it is true we show the collapses and display the full technical information.
        if (!toolCall.toolResponse) {
            return null
        }
        return renderToolCallResponse?.(toolCall.toolResponse)
    } else {
        return (
            <Box className={classes.toolCallItem}>
                <Box className={classes.toolCallHeaderWithChip}>
                    <Box
                        className={cx(classes.toolCallHeader, {
                            [classes.toolCallHeaderPending]: !hasResponse,
                            [classes.toolCallHeaderSuccess]: hasResponse && isSuccess,
                            [classes.toolCallHeaderFailed]: hasResponse && isSuccess === false
                        })}
                        onClick={() => setExpanded(!expanded)}
                    >
                        <Build fontSize="small"/>
                        <BlockTitle mb={0} typographyVariant="subtitle1">{toolCall.name}</BlockTitle>
                        <IconButton
                            size="small"
                            onClick={() => setExpanded(!expanded)}
                            className={cx(classes.expandIcon, {
                                [classes.expandIconOpen]: expanded,
                            })}
                        >
                            <ExpandMore />
                        </IconButton>
                    </Box>
                    {hasResponse && toolCall.toolResponse && (
                        <ToolCallResponseChip toolMessage={toolCall.toolResponse} />
                    )}
                </Box>
                <Collapse in={expanded}>
                    <Box className={classes.argsContainer}>
                        <Box display={"flex"} gap={1} alignItems={"baseline"}>
                            <BlockTitle mb={0} variant="regular" typographyVariant="body2">Assistant want to run: </BlockTitle><Typography fontWeight={"bold"}>{toolCall.name}</Typography>
                        </Box>
                        <Table className={classes.argsTable} size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell className={classes.tableHeaderCell}>Argument</TableCell>
                                    <TableCell className={classes.tableHeaderCell}>Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(toolCall.args).map(([key, value]) => (
                                    <TableRow key={key}>
                                        <TableCell className={classes.argKeyCell}>
                                            {key}
                                        </TableCell>
                                        <TableCell className={classes.argValueCell}>
                                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ToolCallActions 
                            toolCall={toolCall}
                            accepted={accepted}
                            onAccept={() => setAccepted(true)}
                            onReject={() => setAccepted(false)}
                        />
                        {hasResponse && <ToolCallResponseItem message={toolCall.toolResponse!} />}
                    </Box>
                </Collapse>
                {toolCall.toolResponse && renderToolCallResponse?.(toolCall.toolResponse)}
            </Box>
        )
    }
}

export default ToolCallItem;
