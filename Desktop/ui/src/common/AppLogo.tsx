import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import logoDark from "../assets/logo.svg";
import logoLight from "../assets/logo_light.svg";
import { APP_NAME } from "../utils/branding";

interface AppLogoProps {
  height?: number;
}

export default function AppLogo({ height = 28 }: AppLogoProps) {
  const theme = useTheme();
  const logo = theme.palette.mode === "dark" ? logoLight : logoDark;

  return (
    <Box
      component="img"
      src={logo}
      alt={APP_NAME}
      sx={{ height }}
    />
  );
}
