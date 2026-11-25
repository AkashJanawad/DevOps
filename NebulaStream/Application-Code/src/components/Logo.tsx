import Box, { BoxProps } from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { MAIN_PATH } from "src/constant";

export default function Logo({ sx }: BoxProps) {
  return (
    <RouterLink to={`/${MAIN_PATH.browse}`}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          height: 25,
          color: "primary.contrastText",
          textDecoration: "none",
          ...sx,
        }}
      >
        <Typography
          component="span"
          sx={{
            color: "#ffffff",
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          NebulaStream
        </Typography>
      </Box>
    </RouterLink>
  );
}
