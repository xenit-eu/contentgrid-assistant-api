

import { createSvgIcon } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import cx from 'classnames'

export const AIIcon = createSvgIcon(
<svg
   width="27.891279mm"
   height="28.270796mm"
   viewBox="0 0 27.891279 28.270796"
   version="1.1"
   id="svg1">
  <defs id="defs1">
    <linearGradient
       id="linearGradient228"
       gradientUnits="userSpaceOnUse"
       gradientTransform="rotate(44.95405,-246.37412,-413.4637)"
       x1="-152.81824"
       y1="56.628471"
       x2="-107.1256"
       y2="56.628471">
      <stop
         style={{stopColor:"#ffffff", stopOpacity:0}}
         offset="0"
         id="stop1" />
      <stop
         style={{stopColor:"#009ee3", stopOpacity:1}}
         offset="0.24766485"
         id="stop2" />
    </linearGradient>
    <linearGradient
       id="linearGradient229"
       gradientUnits="userSpaceOnUse"
       gradientTransform="matrix(-0.70767365,0.70653946,0.70653946,0.70767365,-592.76173,53.206685)"
       x1="-152.81824"
       y1="56.628471"
       x2="-107.1256"
       y2="56.628471">
      <stop
         style={{stopColor:"#ffffff", stopOpacity:0}}
         offset="0"
         id="stop3" />
      <stop
         style={{stopColor:"#009ee3", stopOpacity:1}}
         offset="0.24766485"
         id="stop4" />
    </linearGradient>
  </defs>
  <g
     id="layer1"
     transform="translate(-12.740978,-9.2392214)">
    <g
       id="ContentGridAssistant"
       transform="translate(-119.67499,-166.31761)">
      <g
         id="antennas"
         transform="matrix(0.27729144,0,0,0.27729144,279.09835,180.5008)">
        <path
           id="LeftBlueTop"
           style={{fill:"url(#linearGradient228)", strokeWidth:0.116349}}
           d="m -509.17225,-17.829505 29.22698,29.18014 -0.0257,6.24278 -6.24131,0.0343 -29.22698,-29.18014 z" />
        <path
           id="RightBlueTop"
           style={{fill:"url(#linearGradient229)", strokeWidth:0.116349}}
           d="m -447.73958,-17.829505 -29.22697,29.18014 0.0257,6.24278 6.24131,0.0343 29.22698,-29.18014 z" />
      </g>
      <g
         id="head"
         transform="matrix(0.34740594,0,0,0.34740594,276.13154,179.6798)"
         style={{fill:"#3f3f3f", fillOpacity:1}}>
        <path
           id="TopHead"
           style={{fill:"#3f3f3f", fillOpacity:1, strokeWidth:0.267855}}
           d="m -393.94229,19.903266 39.79918,-0.0526 4.51326,4.604822 -4.51326,4.246749 -39.58877,-0.03507 -4.50622,-4.522227 z" />
        <path
           id="RightHead"
           style={{fill:"#3f3f3f", fillOpacity:1, strokeWidth:0.267855}}
           d="m -352.9997,59.276661 -0.0526,-29.745013 4.60482,-4.513261 4.24675,4.513261 -0.0351,29.534603 -4.52223,4.50622 z" />
        <path
           id="LeftHead"
           style={{fill:"#3f3f3f", fillOpacity:1, strokeWidth:0.267855}}
           d="m -403.66496,59.276661 -0.0526,-29.745013 4.60482,-4.513261 4.24675,4.513261 -0.0351,29.534603 -4.52223,4.50622 z" />
        <path
           id="BottomHead"
           style={{fill:"#3f3f3f", fillOpacity:1, strokeWidth:0.267855}}
           d="m -393.82697,60.709995 39.79918,-0.0526 4.51326,4.604822 -4.51326,4.246749 -39.58877,-0.03507 -4.50622,-4.522227 z" />
      </g>
      <g
         id="ears"
         transform="matrix(0.34740594,0,0,0.34740594,312.75821,179.70087)"
         style={{fill:"#3f3f3f", fillOpacity:1, stroke:"#3f3f3f", strokeWidth:2.87848, strokeDasharray:"none", strokeOpacity:1}}>
        <rect
           style={{fill:"#3f3f3f", fillOpacity:1, stroke:"#3f3f3f", strokeWidth:2.87848, strokeDasharray:"none", strokeOpacity:1}}
           id="LeftEar"
           width="5.1110044"
           height="19.896412"
           x="-517.67175"
           y="34.68182"
           ry="2.5555022" />
        <rect
           style={{fill:"#3f3f3f", fillOpacity:1, stroke:"#3f3f3f", strokeWidth:2.87848, strokeDasharray:"none", strokeOpacity:1}}
           id="RightEar"
           width="5.1110044"
           height="19.896412"
           x="-445.37683"
           y="34.431282"
           ry="2.5555022" />
      </g>
      <g
         id="eyes"
         transform="matrix(0.34740594,0,0,0.34740594,275.93914,180.46013)"
         style={{fill:"#3f3f3f", fillOpacity:1}}>
        <circle
           style={{fill:"#3f3f3f", fillOpacity:1, strokeWidth:0.264583}}
           id="LeftEye"
           cx="-383.50061"
           cy="40.748795"
           r="4.4420919" />
        <circle
           style={{fill:"#3f3f3f", fillOpacity:1, strokeWidth:0.264583}}
           id="RightEye"
           cx="-364.13788"
           cy="41.347527"
           r="4.4420919" />
      </g>
    </g>
  </g>
</svg>, 'ContentGrid AI Assistant'
);

export const LoadingAsssitantIcon = ({loading, lookDown} : {loading : boolean, lookDown : boolean}) => {
   const { classes } = useStyles();
   return <AIIcon className={cx(classes.assistantIcon, loading ? classes.assistantIconLoading : null, lookDown ? classes.assistantIconFocused : null)}></AIIcon>
}

const useStyles = makeStyles()(() => ({
    assistantIcon : {
        fontSize : '5rem',
        transition: 'all 0.3s ease-in-out',
    },
    assistantIconFocused: {
        '& #LeftEye, & #RightEye': {
            transform: 'translateY(3px)',
            transition: 'transform 0.8s ease-in-out',
        },
    },
    assistantIconLoading: {
        '& #TopHead': {
            animation: 'colorCycle 2s ease-in-out infinite',
            animationDelay: '0s',
        },
        '& #RightHead': {
            animation: 'colorCycle 2s ease-in-out infinite',
            animationDelay: '0.5s',
        },
        '& #BottomHead': {
            animation: 'colorCycle 2s ease-in-out infinite',
            animationDelay: '1s',
        },
        '& #LeftHead': {
            animation: 'colorCycle 2s ease-in-out infinite',
            animationDelay: '1.5s',
        },
        '& #LeftBlueTop': {
            animation: 'colorCycle 2s ease-in-out infinite',
            animationDelay: '0.5s',
        },
        '& #RightBlueTop': {
            animation: 'colorCycle 2s ease-in-out infinite',
            animationDelay: '0.5s',
        },
        '& #LeftEye': {
            animation: 'eyeLookAround 3s ease-in-out infinite',
        },
        '& #RightEye': {
            animation: 'eyeLookAround 3s ease-in-out infinite',
        },
        '@keyframes colorCycle': {
            '0%, 100%': {
                fill: '#3f3f3f',
            },
            '50%': {
                fill: '#009ee3',
            },
        },
        '@keyframes eyeLookAround': {
            '0%': {
                transform: 'translate(0, 0)',
            },
            '25%': {
                transform: 'translate(2px, 0)',
            },
            '50%': {
                transform: 'translate(0, 2px)',
            },
            '75%': {
                transform: 'translate(-2px, 0)',
            },
            '100%': {
                transform: 'translate(0, 0)',
            },
        },
    },
}));