import { CopyAll, ThumbDownAltOutlined, ThumbUpOutlined, ThumbDown, ThumbUp } from "@mui/icons-material"
import { Box, IconButton } from "@mui/material"
import { makeStyles } from "tss-react/mui"

type MessageActionsProps = {
    children: React.ReactNode;
    alignment?: 'left' | 'right';
    showOnHover?: boolean;
}

export const MessageActions = ({ children, alignment = 'left', showOnHover = false }: MessageActionsProps) => {
    const { classes } = useStyles({ showOnHover });

    return (
        <Box 
            className={classes.actionsContainer} 
            sx={{ justifyContent: alignment === 'right' ? 'flex-end' : 'flex-start' }}
        >
            {children}
        </Box>
    );
}

type MessageCopyButtonProps = {
    onCopy: () => void;
}

export const MessageCopyButton = ({ onCopy }: MessageCopyButtonProps) => {
    const { classes } = useStyles({ showOnHover : false });

    return (
        <IconButton className={classes.copyButton} onClick={onCopy}>
            <CopyAll />
        </IconButton>
    );
}

type ThumbsUpButtonProps = {
    onThumbsUp: () => void;
    isActive: boolean;
}

export const ThumbsUpButton = ({ onThumbsUp, isActive }: ThumbsUpButtonProps) => {
    const { classes } = useStyles({ showOnHover: false, isActive });

    return (
        <IconButton 
            className={classes.thumbUpButton} 
            onClick={onThumbsUp}
            disabled
        >
            {isActive ? <ThumbUp /> : <ThumbUpOutlined />}
        </IconButton>
    );
}

type ThumbsDownButtonProps = {
    onThumbsDown: () => void;
    isActive: boolean;
}

export const ThumbsDownButton = ({ onThumbsDown, isActive }: ThumbsDownButtonProps) => {
    const { classes } = useStyles({ showOnHover: false, isActive });

    return (
        <IconButton 
            className={classes.thumbDownButton} 
            onClick={onThumbsDown}
            disabled
        >
            {isActive ? <ThumbDown /> : <ThumbDownAltOutlined />}
        </IconButton>
    );
}

const useStyles = makeStyles<{ showOnHover: boolean; isActive?: boolean }>()((theme, { showOnHover, isActive = false }) => ({
    actionsContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        padding: theme.spacing(1),
        opacity: showOnHover ? 0 : 1,
        transition: theme.transitions.create('opacity', {
            duration: theme.transitions.duration.shorter,
        }),
        '&:hover': showOnHover ? {
            opacity: 1,
        } : {},
    },
    copyButton: {
        padding: theme.spacing(0.5),
    },
    thumbUpButton: {
        padding: theme.spacing(0.5),
        opacity: 0.8,
        color: isActive ? theme.palette.success.main : 'inherit',
    },
    thumbDownButton: {
        padding: theme.spacing(0.5),
        opacity: 0.8,
        color: isActive ? theme.palette.error.main : 'inherit',
    }
}))