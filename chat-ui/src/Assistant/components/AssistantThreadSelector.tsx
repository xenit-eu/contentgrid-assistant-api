import { resolveTemplateRequired } from "@contentgrid/hal-forms";
import { createValues } from "@contentgrid/hal-forms/values";
import { Edit, Delete, MoreVert, ExpandLess, ExpandMore, Draw, Close } from "@mui/icons-material";
import { Box, Button, List, ListItem, ListItemButton, ListItemText, IconButton, Dialog, DialogTitle, DialogContent, TextField, Typography, Divider, DialogActions, ListItemIcon, Collapse, Stack } from "@mui/material";
import { useCallback, useState } from "react";
import { useDeleteThreadMutation, useUpdateThreadMutation } from "../hooks/api";
import { Thread, ThreadSlice } from "../models/Thread";
import { AssistantChatProps } from "./AssistantContainer";
import { BlockTitle } from "./BlockTitle";
import halFormCodecs from "@contentgrid/hal-forms/codecs";
import { makeStyles } from "tss-react/mui";
import { AIIcon } from "./AssistantIcon";

interface AssistantThreadSelectorProps extends AssistantChatProps {
    threadSlice: ThreadSlice;
    setSelectedThread: (thread: Thread | undefined) => void;
    handleCreateNewThread : () => void
}

const useStyles = makeStyles()((theme) => ({
    blueIcon : {
        color: theme.palette.primary.main
    }
}));

export const AssistantThreadSelector = (props : AssistantThreadSelectorProps ) => {
    const { mutateAsync : deleteThread} = useDeleteThreadMutation()

    const handleDeleteThread = useCallback(async (thread: Thread) => {
        await deleteThread(thread);
    }, [deleteThread]);

    return (
        <AssistantThreadsList handleDeleteThread={handleDeleteThread} {...props} />
    );
}

interface AssistantThreadsListProps extends AssistantThreadSelectorProps {
    handleDeleteThread : (thread : Thread) => void;
}

const AssistantThreadsList = ( {threadSlice, setSelectedThread, handleDeleteThread, handleCreateNewThread}: AssistantThreadsListProps) => {
    const [open, setOpen] = useState(true);
    const { classes } = useStyles();

    const handleToggle = () => {
        setOpen(!open);
    };

    return (
        <List>
            <ListItemButton onClick={handleCreateNewThread}>
                <ListItemIcon className={classes.blueIcon}>
                    <Draw />
                </ListItemIcon>
                <ListItemText primary="New conversation" />
            </ListItemButton>
            <ListItemButton onClick={handleToggle}>
                <ListItemText primary="Conversations" />
                {open ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={open} timeout="auto" unmountOnExit>
                {threadSlice.threads.map((thread) => (
                    <ClickableThreadItem 
                        key={thread.data.id || thread.self?.href}
                        thread={thread}
                        onSelect={() => setSelectedThread(thread)}
                        onDelete={() => {handleDeleteThread(thread); setSelectedThread(undefined)}}
                    />
                ))}
            </Collapse>
        </List>
    );
}

interface ClickableThreadItemProps {
    thread: Thread;
    onSelect: () => void;
    onDelete: () => void;
}

const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
    } else {
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
};

const ClickableThreadItem = ({ thread, onSelect, onDelete }: ClickableThreadItemProps) => {
    return (
        <ListItem
            disablePadding
            secondaryAction={
                <ThreadSettingsModal thread={thread} onDelete={onDelete} />
            }
        >
            <ListItemButton onClick={onSelect}>
                <ListItemText
                    primary={<BlockTitle mb={0} variant="regular" typographyVariant="body1">{thread.name}</BlockTitle>}
                    secondary={<BlockTitle mb={0} variant="light" typographyVariant="body2">{formatDate(thread.data.created_at)}</BlockTitle>}
                    slotProps={{
                        primary: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        },
                        secondary: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }
                    }}
                />
            </ListItemButton>
        </ListItem>
    );
};

interface ThreadSettingsModalProps {
    thread: Thread;
    onDelete: () => void;
}

const ThreadSettingsModal = ({ thread, onDelete }: ThreadSettingsModalProps) => {
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(thread.name);
    const updateTemplate = resolveTemplateRequired(thread.data, "update");
    const { mutateAsync: updateThread } = useUpdateThreadMutation();
    
    const handleOpen = () => {
        setName(thread.name);
        setIsEditing(false);
        setOpen(true);
    };
    
    const handleClose = () => {
        setOpen(false);
        setIsEditing(false);
    };
    
    const handleEdit = () => {
        setIsEditing(true);
    };
    
    const handleCancelEdit = () => {
        setName(thread.name);
        setIsEditing(false);
    };
    
    const handleUpdateThread = async () => {
        const codec = halFormCodecs.requireCodecFor(updateTemplate!);
        const values = createValues(updateTemplate).withValue("name", name);
        const request = codec.encode(values);
        await updateThread(request);
        setIsEditing(false);
    };
    
    const handleDelete = () => {
        onDelete();
        handleClose();
    };
    
    return (
        <>
            <IconButton 
                size="small"
                onClick={handleOpen}
            >
                <MoreVert/>
            </IconButton>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, marginTop : 1 }}>
                    <Box flexShrink="0">
                        <AIIcon />
                    </Box>
                    <Typography variant="h6" sx={{ flex: 1 }}>
                        {isEditing ? 'Edit Conversation' : 'Conversation Settings'}
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {isEditing ? (
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Thread Name"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    ) : (
                        <Box sx={{ py: 1 }}>
                            <Stack spacing={0.5}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Thread ID
                                </Typography>
                                <Typography variant="body1">{thread.data.id || 'N/A'}</Typography>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Name
                                </Typography>
                                <Typography variant="body1">{thread.name}</Typography>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Created At
                                </Typography>
                                <Typography variant="body1">
                                    {formatDate(thread.data.created_at)}
                                </Typography>
                            </Stack>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', gap: 1 , justifyContent: "space-between"}}>
                                <Button 
                                    startIcon={<Edit/>}
                                    variant="contained"
                                    onClick={handleEdit}
                                >
                                    Edit
                                </Button>
                                <Button 
                                    startIcon={<Delete/>}
                                    variant="outlined" 
                                    color="error"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </Button>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {isEditing ? (
                        <Box display={"flex"} justifyContent={"space-between"}>
                            <Button onClick={handleCancelEdit}>Cancel</Button>
                            <Button onClick={handleUpdateThread} variant="contained">Save</Button>
                        </Box>
                    ) : (
                        null
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};