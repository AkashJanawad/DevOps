import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";

export default function Footer() {
  return (
    <Box
      sx={{
        bgcolor: "background.default",
        color: "grey.700",
        py: 8,
        px: { xs: 4, md: "60px" },
        borderTop: "1px solid",
        borderColor: "grey.900",
      }}
    >
      <Grid container spacing={4} justifyContent="space-between">
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Explore
          </Typography>
          <Stack spacing={1}>
            <Link href="/browse" color="inherit" underline="hover">
              Explore All
            </Link>
            <Link href="/browse" color="inherit" underline="hover">
              Movies
            </Link>
            <Link href="/browse" color="inherit" underline="hover">
              Originals
            </Link>
            <Link href="/browse" color="inherit" underline="hover">
              Trending
            </Link>
          </Stack>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Company
          </Typography>
          <Stack spacing={1}>
            <Link href="#" color="inherit" underline="hover">
              About Us - Discover our story and mission.
            </Link>
            <Link href="#" color="inherit" underline="hover">
              Careers - Join our global team of innovators.
            </Link>
            <Link href="#" color="inherit" underline="hover">
              Contact - Get in touch for support or inquiries.
            </Link>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Contact Information
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Email:{" "}
            <Link
              href="mailto:hemanand4t@gmail.com"
              color="primary"
              underline="hover"
            >
              hemanand4t@gmail.com
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Contact:{" "}
            <Link href="tel:+917624927665" color="primary" underline="hover">
              7624927665
            </Link>
          </Typography>
          <Typography variant="body2">
            NebulaStream is your ultimate destination for high-quality media
            streaming. We provide a seamless experience for all your
            entertainment needs.
          </Typography>
        </Grid>
      </Grid>

      <Box sx={{ mt: 8 }}>
        <Divider sx={{ mb: 4, borderColor: "grey.900" }} />
        <Typography variant="body2" align="center">
          © {new Date().getFullYear()} NebulaStream. Developed by{" "}
          <Link
            href="https://github.com/crazy-man22"
            underline="none"
            sx={{ color: "text.primary" }}
            target="_blank"
          >
            Crazy Man
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
