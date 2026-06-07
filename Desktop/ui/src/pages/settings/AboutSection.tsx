import { useEffect, useState } from "react";
import { Box, Typography, Link, Chip, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import logo from "../../assets/app.svg";
import { HomeRounded } from "@mui/icons-material";
import { APP_DISPLAY_NAME, APP_HOME_URL, APP_NAME } from "../../utils/branding";

function isPreviewVersion(version: string): boolean {
  if (version.startsWith("0.")) return true;
  if (version.includes("-")) return true;
  return false;
}

export default function AboutSection() {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  const isPreview = version && isPreviewVersion(version);

  const links = [
    {
      icon: <HomeRounded fontSize="small" />,
      label: t("about.homepage"),
      href: APP_HOME_URL,
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} gutterBottom>
        {t("settings.about")}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Box
          component="img"
          src={logo}
          alt={APP_NAME}
          sx={{ width: 48, height: 48 }}
        />
        <Box>
          <Typography variant="h6" fontWeight={500}>
            {APP_DISPLAY_NAME}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {version ? `v${version}` : "..."}
            </Typography>
            {isPreview && (
              <Chip
                label={t("about.preview")}
                size="small"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
            )}
          </Stack>
        </Box>
      </Stack>

      <Stack spacing={1}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="text.secondary"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              width: "fit-content",
              "&:hover": { color: "primary.main" },
            }}
          >
            {link.icon}
            <Typography variant="body2">{link.label}</Typography>
          </Link>
        ))}
      </Stack>
    </Box>
  );
}
