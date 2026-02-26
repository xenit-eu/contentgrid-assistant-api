import { Box, Typography, TypographyProps } from "@mui/material"
import { ReactNode } from "react"
import { makeStyles } from "tss-react/mui"

interface BlockTitleProps {
    mt?: number;
    mr?: number;
    mb?: number;
    ml?: number;
    variant?: 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
    typographyVariant?: TypographyProps['variant'];
    icon?: ReactNode;
    children: ReactNode;
}

const getFontWeight = (variant: 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold'): number => {
    switch (variant) {
        case 'thin': return 100;
        case 'light': return 300;
        case 'regular': return 400;
        case 'medium': return 500;
        case 'semibold': return 600;
        case 'bold': return 700;
        default: return 500;
    }
};

const useStyles = makeStyles()((theme) => ({
    outlinedContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        padding: '12px 16px',
        background: theme.palette.background.paper ,
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: theme.spacing(2),
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    },
    defaultContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
    },
    icon: {
        color: theme.palette.common.black
    },
}));

export const BlockTitle = ({
    mt = 0,
    mr = 0, 
    mb = 2, 
    ml = 0, 
    variant = 'medium',
    typographyVariant = 'h6',
    icon,
    children 
}: BlockTitleProps) => {
    const numericFontWeight = getFontWeight(variant);
    const { classes } = useStyles();
    
    // Default layout
    return (
        <Box mt={mt} mr={mr} mb={mb} ml={ml}>
            <Box className={classes.defaultContainer}>
                {icon}
                <Typography variant={typographyVariant}>
                    <Box sx={{ fontWeight: numericFontWeight }}>{children}</Box>
                </Typography>
            </Box>
        </Box>
    )
}
