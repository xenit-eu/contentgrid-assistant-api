import { Box, TextField, IconButton, InputAdornment, CircularProgress, OutlinedInput, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { MessageSlice } from "../models/Message";
import { makeStyles } from "tss-react/mui";
import { Delete, AttachFile, Send } from "@mui/icons-material";

interface MessageInputProps {
    messageSlice: MessageSlice;
    onMessageSent: (chatInput : string , selectedFile?: File) => void;
    enabled : boolean,
    onFocusChange?: (isFocused: boolean) => void;
}

const useStyles = makeStyles()((theme) => ({
    hiddenInput: {
        display: 'none',
    },
    container: {
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'flex-end',
    },
    attachedFile: {
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingLeft: theme.spacing(0),
        paddingRight: theme.spacing(2),
    },
}));

export const MessageInput = ({ onMessageSent, enabled, onFocusChange }: MessageInputProps) => {
    const [chatInputText, setChatInputText] = useState('');
    const hasTextInput = chatInputText.length !== 0;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
    
    const handleAskQuestion = async () => {
        try {
            await onMessageSent(chatInputText, selectedFile);
            setSelectedFile(undefined);
            setChatInputText('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const { classes } = useStyles();

    return (
        <>
            {selectedFile && (
                <Box className={classes.attachedFile} display={'flex'} justifyItems={'center'} alignItems={'center'}>
                    <IconButton size="small" onClick={() => setSelectedFile(undefined)}>
                        <Delete color={'secondary'} />
                    </IconButton>
                    <Typography>{selectedFile.name}</Typography>
                </Box>
            )}
            <Box marginBottom="1em">
                <TextField
                    fullWidth
                    placeholder="Write your question here..."
                    variant="outlined"
                    multiline
                    maxRows={4}
                    value={chatInputText}
                    onChange={(event) => setChatInputText(event.target.value)}
                    onFocus={() => onFocusChange?.(true)}
                    onBlur={() => onFocusChange?.(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAskQuestion();
                        }
                    }}
                    slots={{ input: OutlinedInput }}
                    slotProps={{
                        input: {
                            style: { overflow: 'auto' },
                            endAdornment: (
                                <InputAdornment position="end">
                                    {!enabled ? (
                                        <IconButton disabled>
                                            <CircularProgress size={24} />
                                        </IconButton>
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className={classes.hiddenInput}
                                                onChange={handleFileChange}
                                            />
                                            <IconButton size="small" onClick={handleAttachClick}>
                                                <AttachFile />
                                            </IconButton>
                                            <IconButton
                                                size="medium"
                                                disabled={!hasTextInput && !selectedFile}
                                                onClick={handleAskQuestion}
                                            >
                                                <Send color={hasTextInput || selectedFile ? 'primary' : 'disabled'} />
                                            </IconButton>
                                        </>
                                    )}
                                </InputAdornment>
                            ),
                        }
                    }}
                />
            </Box>
        </>
    );
};
