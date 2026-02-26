import { Thread, ThreadSlice } from '../models/Thread';
import MuiDrawer from '@mui/material/Drawer';
import { CSSObject, styled, Theme } from '@mui/material/styles';
import { Box, Divider, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight, Draw, EditNote } from '@mui/icons-material';
import { assistantDrawerClosedWidth, assistantDrawerOpenedWidth, assistantToolBarHeight } from './constants';
import { AssistantThreadSelector } from './AssistantThreadSelector';
import { AssistantChatProps } from './AssistantContainer';

const openedMixin = (theme: Theme): CSSObject => ({
    width: assistantDrawerOpenedWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: assistantDrawerClosedWidth,
    [theme.breakpoints.up('sm')]: {
        width: assistantDrawerClosedWidth,
    },
});

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: assistantToolBarHeight,
    padding: theme.spacing(0, 1),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme }) => ({
    width: assistantDrawerOpenedWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '& .MuiDrawer-paper': {
        position: 'absolute',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    variants: [
        {
            props: ({ open }) => open,
            style: {
                ...openedMixin(theme),
                '& .MuiDrawer-paper': {
                    ...openedMixin(theme),
                    position: 'absolute',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                },
            },
        },
        {
            props: ({ open }) => !open,
            style: {
                ...closedMixin(theme),
                '& .MuiDrawer-paper': {
                    ...closedMixin(theme),
                    position: 'absolute',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                },
            },
        },
    ],
}));

const IconContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(1),
}));

const BlueIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.primary.main
}));

interface AssistantChatDrawerProps extends AssistantChatProps {
    threadSlice: ThreadSlice;
    setSelectedThread: (thread: Thread | undefined) => void;
    handleCreateNewThread : () => void
}

interface AssistantChatOpenableDrawerProps extends AssistantChatDrawerProps {
    drawerOpened: boolean;
    setDrawerOpened: (arg0: boolean) => void;
}

export const AssistantChatDrawer = ({
    threadSlice,
    drawerOpened,
    setDrawerOpened,
    setSelectedThread,
    handleCreateNewThread,
    ...props
}: AssistantChatOpenableDrawerProps) => {
    const handleDrawerOpen = () => {
        setDrawerOpened(true);
    };

    const handleDrawerClose = () => {
        setDrawerOpened(false);
    };

    return (
        <Drawer variant="permanent" open={drawerOpened}>
            <DrawerHeader>
                {drawerOpened ? (
                    <IconButton onClick={handleDrawerClose}>
                        <ChevronLeft />
                    </IconButton>
                ) : (
                    <IconButton onClick={handleDrawerOpen}>
                        <ChevronRight />
                    </IconButton>
                )}
            </DrawerHeader>
            <Divider />
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {drawerOpened ? (
                    <AssistantThreadSelector handleCreateNewThread={handleCreateNewThread} threadSlice={threadSlice} setSelectedThread={setSelectedThread} {...props} />
                ) : (
                    <IconContainer>
                        <BlueIconButton onClick={handleCreateNewThread}>
                            <Draw />
                        </BlueIconButton>
                        <IconButton onClick={handleDrawerOpen}>
                            <EditNote />
                        </IconButton>
                    </IconContainer>
                )}
            </Box>
        </Drawer>
    );
};

