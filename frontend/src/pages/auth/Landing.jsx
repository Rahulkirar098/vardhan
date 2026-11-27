import { Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Box,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { AppButton } from "../../components/common";
import {
  AssignmentTurnedInRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  GroupsRounded,
  LocalHospitalRounded,
  MeetingRoomRounded,
  ScheduleRounded,
  ShieldRounded,
  TrendingUpRounded,
} from "@mui/icons-material";

const capabilities = [
  {
    icon: GroupsRounded,
    title: "HR & Employee Management",
    text: "Create staff profiles, invite team members and keep employee information organized in one place.",
  },
  {
    icon: CalendarMonthRounded,
    title: "Smart Duty Rosters",
    text: "Prepare, review and publish staff schedules with clear shift and duty assignments.",
  },
  {
    icon: ScheduleRounded,
    title: "Attendance Tracking",
    text: "Keep attendance information connected to your workforce and daily operations.",
  },
  {
    icon: AssignmentTurnedInRounded,
    title: "Leave Management",
    text: "Manage leave requests through a structured review and approval workflow.",
  },
  {
    icon: MeetingRoomRounded,
    title: "Hospital Structure",
    text: "Organize floors, wards, units and rooms to reflect the way your hospital works.",
  },
  {
    icon: ShieldRounded,
    title: "Roles & Permissions",
    text: "Give administrators, HR teams and staff access that matches their responsibilities.",
  },
];

const workflow = [
  [
    "01",
    "Set up your hospital",
    "Create your hospital profile and establish your workspace.",
  ],
  [
    "02",
    "Bring your team together",
    "Invite HR members and build employee profiles.",
  ],
  [
    "03",
    "Organize hospital operations",
    "Set up your hospital structure and workforce details.",
  ],
  [
    "04",
    "Plan and manage every shift",
    "Create rosters, coordinate leave and manage daily staffing.",
  ],
];

const Brand = ({ inverse = false }) => (
  <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: "12px",
        background: inverse ? "#FFFFFF" : "#153E36",
        color: inverse ? "#153E36" : "#FFFFFF",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        fontSize: 19,
        letterSpacing: "-0.06em",
      }}
    >
      V
    </Box>
    <Stack spacing={0}>
      <Typography
        sx={{
          fontWeight: 850,
          fontSize: 18,
          letterSpacing: "-0.035em",
          lineHeight: 1.1,
          color: inverse ? "#FFFFFF" : "#142B27",
        }}
      >
        VARDAAN
      </Typography>
      <Typography
        sx={{
          color: inverse ? "rgba(255,255,255,.58)" : "#71817C",
          fontWeight: 700,
          letterSpacing: 1.05,
          fontSize: 8.5,
          lineHeight: 1.5,
        }}
      >
        HOSPITAL MANAGEMENT
      </Typography>
    </Stack>
  </Stack>
);

const SectionEyebrow = ({ children }) => (
  <Typography
    component="div"
    sx={{
      color: "#397A69",
      fontWeight: 800,
      fontSize: 11,
      letterSpacing: 1.55,
      textTransform: "uppercase",
    }}
  >
    {children}
  </Typography>
);

const Landing = () => (
  <Box
    sx={{
      minHeight: "100vh",
      bgcolor: "#F7F9F7",
      color: "#172B26",
      overflow: "hidden",
    }}
  >
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: "rgba(247,249,247,.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #E7ECE8",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1200,
          width: "100%",
          mx: "auto",
          px: { xs: 2, md: 4 },
          minHeight: { xs: 66, md: 76 },
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Brand />
        </Box>
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          sx={{ alignItems: "center" }}
        >
          <Box
            component="a"
            href="#platform"
            sx={{
              display: { xs: "none", sm: "block" },
              color: "#52635D",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 650,
              "&:hover": { color: "#153E36" },
            }}
          >
            Platform
          </Box>
          <Box
            component="a"
            href="#how-it-works"
            sx={{
              display: { xs: "none", sm: "block" },
              color: "#52635D",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 650,
              "&:hover": { color: "#153E36" },
            }}
          >
            How it works
          </Box>
          <AppButton
            component={RouterLink}
            to="/login"
            variant="text"
            sx={{ color: "#24483F", minWidth: 0 }}
          >
            Sign in
          </AppButton>
          {/* <AppButton
            component={RouterLink}
            to="/register"
            variant="primary"
            endIcon={<ArrowForwardRounded />}
            sx={{
              borderRadius: "10px",
              px: { xs: 1.5, sm: 2.2 },
              whiteSpace: "nowrap",
            }}
          >
            Get started
          </AppButton> */}
        </Stack>
      </Toolbar>
    </AppBar>

    <Box
      sx={{
        position: "relative",
        background:
          "radial-gradient(circle at 82% 30%, rgba(192,224,207,.42), transparent 34%), linear-gradient(180deg,#F7F9F7 0%,#F2F7F3 100%)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 440,
          height: 440,
          borderRadius: "50%",
          border: "1px solid rgba(68,126,103,.10)",
          right: "-180px",
          top: "-170px",
          pointerEvents: "none",
        }}
      />
      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 13 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.02fr .98fr" },
            gap: { xs: 6, md: 7 },
            alignItems: "center",
          }}
        >
          <Stack spacing={3} sx={{ maxWidth: 600 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                width: "fit-content",
                px: 1.5,
                py: 0.8,
                border: "1px solid #DCE8DF",
                borderRadius: 99,
                bgcolor: "rgba(255,255,255,.72)",
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: "#4B9B77",
                }}
              />
              <Typography
                sx={{
                  color: "#477362",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.1,
                }}
              >
                ONE WORKSPACE. BETTER HOSPITAL OPERATIONS.
              </Typography>
            </Box>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 39, sm: 50, md: 59 },
                lineHeight: 1.06,
                letterSpacing: "-.055em",
                fontWeight: 800,
                color: "#16372F",
              }}
            >
              Bring your hospital team and operations{" "}
              <Box component="span" sx={{ color: "#4B8B70" }}>
                together.
              </Box>
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 16, md: 18 },
                lineHeight: 1.75,
                color: "#64756E",
                maxWidth: 540,
              }}
            >
              VARDAAN helps hospitals manage people, duty rosters, attendance,
              leave and hospital structure through one connected platform.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ pt: 1 }}
            >
              {/* <AppButton
                component={RouterLink}
                to="/register"
                variant="primary"
                size="large"
                endIcon={<ArrowForwardRounded />}
                sx={{ borderRadius: "11px", px: 2.7, py: 1.35 }}
              >
                Create your workspace
              </AppButton> */}
              <AppButton
                component={RouterLink}
                to="/login"
                variant="outlined"
                size="large"
                sx={{
                  borderRadius: "11px",
                  px: 2.7,
                  py: 1.35,
                  borderColor: "#C9D8CF",
                  color: "#24483F",
                }}
              >
                Sign in to VARDAAN
              </AppButton>
            </Stack>
            <Stack
              direction="row"
              spacing={2.5}
              sx={{ pt: 1, flexWrap: "wrap", rowGap: 1 }}
            >
              {[
                "Role-based access",
                "Connected workflows",
                "Built for hospital teams",
              ].map((item) => (
                <Stack
                  key={item}
                  direction="row"
                  spacing={0.7}
                  sx={{ alignItems: "center" }}
                >
                  <CheckCircleRounded sx={{ fontSize: 16, color: "#4B8B70" }} />
                  <Typography
                    sx={{ color: "#66766F", fontSize: 11.5, fontWeight: 650 }}
                  >
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Box
            sx={{
              position: "relative",
              maxWidth: 550,
              width: "100%",
              mx: "auto",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: "9% -5% -7% 9%",
                borderRadius: "30px",
                bgcolor: "#DDEBE1",
                transform: "rotate(4deg)",
              }}
            />
            <Box
              sx={{
                position: "relative",
                bgcolor: "#FFFFFF",
                border: "1px solid #E3EBE5",
                borderRadius: "22px",
                p: { xs: 2, sm: 2.6 },
                boxShadow: "0 28px 70px rgba(30,75,55,.13)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ pb: 2.2, borderBottom: "1px solid #EEF2EF" }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 29,
                      height: 29,
                      borderRadius: "9px",
                      bgcolor: "#E8F2EB",
                      color: "#397A60",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <LocalHospitalRounded sx={{ fontSize: 17 }} />
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 800, color: "#263B33" }}
                    >
                      Hospital workspace
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: "#91A098" }}>
                      Operations overview
                    </Typography>
                  </Box>
                </Stack>
                <Box
                  sx={{
                    px: 1.1,
                    py: 0.5,
                    borderRadius: 99,
                    bgcolor: "#EAF5ED",
                    color: "#43805D",
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                >
                  LIVE OVERVIEW
                </Box>
              </Stack>
              <Typography
                sx={{
                  mt: 2.2,
                  mb: 1.3,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#344A40",
                }}
              >
                Your workforce at a glance
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 1,
                }}
              >
                {[
                  ["Employees", "248", "+12 this month"],
                  ["On duty", "36", "Across all shifts"],
                  ["Pending leave", "08", "Needs review"],
                ].map(([label, value, note]) => (
                  <Box
                    key={label}
                    sx={{
                      p: 1.3,
                      borderRadius: "11px",
                      bgcolor: "#F6F9F6",
                      border: "1px solid #EDF2ED",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 9.5, color: "#84938B", fontWeight: 650 }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 23,
                        lineHeight: 1.4,
                        fontWeight: 800,
                        color: "#24483B",
                      }}
                    >
                      {value}
                    </Typography>
                    <Typography sx={{ fontSize: 8.5, color: "#91A097" }}>
                      {note}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 2.5, mb: 1.2 }}
              >
                <Typography
                  sx={{ fontSize: 11, fontWeight: 800, color: "#344A40" }}
                >
                  Today's shift coverage
                </Typography>
                <Typography sx={{ fontSize: 9, color: "#829188" }}>
                  Sample preview
                </Typography>
              </Stack>
              {[
                ["Morning shift", "18 staff", "75%", "#75A88A"],
                ["Evening shift", "12 staff", "55%", "#92B9A0"],
                ["Night shift", "06 staff", "35%", "#B3CDBA"],
              ].map(([label, count, width, color]) => (
                <Box key={label} sx={{ mb: 1.45 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.55 }}
                  >
                    <Typography
                      sx={{ fontSize: 9.5, color: "#66766D", fontWeight: 650 }}
                    >
                      {label}
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: "#66766D" }}>
                      {count}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 99,
                      bgcolor: "#EDF2EE",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width,
                        height: "100%",
                        borderRadius: 99,
                        bgcolor: color,
                      }}
                    />
                  </Box>
                </Box>
              ))}
              <Box
                sx={{
                  mt: 2,
                  p: 1.4,
                  borderRadius: "12px",
                  bgcolor: "#F0F6F1",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                }}
              >
                <Box
                  sx={{
                    width: 31,
                    height: 31,
                    borderRadius: "9px",
                    bgcolor: "#DCECE0",
                    color: "#397A60",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <TrendingUpRounded sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography
                    sx={{ fontSize: 10, color: "#355D49", fontWeight: 800 }}
                  >
                    A more connected workplace
                  </Typography>
                  <Typography sx={{ fontSize: 9, color: "#7A8D80" }}>
                    People, schedules and operations in sync
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                position: "absolute",
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                gap: 1,
                bottom: -23,
                left: -28,
                px: 1.7,
                py: 1.2,
                borderRadius: "13px",
                bgcolor: "#FFFFFF",
                boxShadow: "0 12px 32px rgba(30,75,55,.12)",
                border: "1px solid #E8EFE9",
              }}
            >
              <Box
                sx={{
                  width: 29,
                  height: 29,
                  borderRadius: "9px",
                  bgcolor: "#EAF4EC",
                  color: "#43805D",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CheckCircleRounded sx={{ fontSize: 17 }} />
              </Box>
              <Box>
                <Typography
                  sx={{ fontSize: 10, fontWeight: 800, color: "#345143" }}
                >
                  One connected platform
                </Typography>
                <Typography sx={{ fontSize: 8.5, color: "#89988F" }}>
                  Designed for care teams
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>

    <Container id="platform" maxWidth="lg" sx={{ py: { xs: 8, md: 11 } }}>
      <Stack
        spacing={1.4}
        sx={{ textAlign: "center", maxWidth: 650, mx: "auto", mb: 5 }}
      >
        <SectionEyebrow>THE VARDAAN PLATFORM</SectionEyebrow>
        <Typography
          component="h2"
          sx={{
            fontSize: { xs: 28, md: 38 },
            lineHeight: 1.15,
            letterSpacing: "-.04em",
            fontWeight: 800,
            color: "#183B31",
          }}
        >
          The essentials of hospital workforce management, in one place.
        </Typography>
        <Typography sx={{ color: "#718078", fontSize: 14, lineHeight: 1.7 }}>
          Bring your core administrative workflows into one organized
          workspace—so your teams can spend less time coordinating and more time
          supporting care.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2,1fr)",
            lg: "repeat(3,1fr)",
          },
          gap: 2,
        }}
      >
        {capabilities.map(({ icon: Icon, title, text }) => (
          <Box
            key={title}
            sx={{
              p: 2.7,
              minHeight: 190,
              borderRadius: "16px",
              border: "1px solid #E5ECE6",
              bgcolor: "#FFFFFF",
              transition: "transform .2s ease, box-shadow .2s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 16px 36px rgba(35,73,52,.08)",
              },
            }}
          >
            <Box
              sx={{
                width: 43,
                height: 43,
                borderRadius: "12px",
                bgcolor: "#EAF3EC",
                color: "#397A60",
                display: "grid",
                placeItems: "center",
                mb: 2,
              }}
            >
              <Icon sx={{ fontSize: 22 }} />
            </Box>
            <Typography
              sx={{ fontSize: 16, fontWeight: 800, color: "#27483A", mb: 0.8 }}
            >
              {title}
            </Typography>
            <Typography
              sx={{ fontSize: 12.5, lineHeight: 1.75, color: "#78867E" }}
            >
              {text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Container>

    <Box
      id="how-it-works"
      sx={{
        bgcolor: "#173D33",
        color: "#FFFFFF",
        py: { xs: 8, md: 10 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.08)",
          right: "-150px",
          top: "-210px",
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: ".85fr 1.15fr" },
            gap: { xs: 4, md: 8 },
          }}
        >
          <Stack spacing={2}>
            <Typography
              sx={{
                color: "#A7CFB3",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.5,
              }}
            >
              GETTING STARTED
            </Typography>
            <Typography
              component="h2"
              sx={{
                fontSize: { xs: 29, md: 39 },
                lineHeight: 1.14,
                fontWeight: 800,
                letterSpacing: "-.04em",
              }}
            >
              A clear path from setup to smoother operations.
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,.65)",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 390,
              }}
            >
              Start with your hospital profile, bring in your team and build the
              workflows that support your day-to-day operations.
            </Typography>
            <Box sx={{ pt: 1 }}>
              {/* <AppButton
                component={RouterLink}
                to="/register"
                variant="primary"
                endIcon={<ArrowOutwardRounded />}
                sx={{
                  bgcolor: "#E0F0E3",
                  color: "#173D33",
                  "&:hover": { bgcolor: "#CDE5D2" },
                  borderRadius: "10px",
                }}
              >
                Get started with VARDAAN
              </AppButton> */}
            </Box>
          </Stack>
          <Stack spacing={0}>
            {workflow.map(([number, title, text], index) => (
              <Box
                key={number}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr",
                  gap: 2,
                  py: 2.1,
                  borderBottom:
                    index === workflow.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,.13)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#A7CFB3",
                    pt: 0.3,
                  }}
                >
                  {number}
                </Typography>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 0.5 }}>
                    {title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: "rgba(255,255,255,.62)",
                      lineHeight: 1.7,
                    }}
                  >
                    {text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>

    <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
      <Box
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: "20px",
          bgcolor: "#EAF3EC",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Box sx={{ maxWidth: 620 }}>
          <SectionEyebrow>READY WHEN YOU ARE</SectionEyebrow>
          <Typography
            component="h2"
            sx={{
              mt: 1,
              fontSize: { xs: 25, md: 32 },
              lineHeight: 1.2,
              fontWeight: 800,
              letterSpacing: "-.035em",
              color: "#183B31",
            }}
          >
            Make your hospital workflows work better together.
          </Typography>
          <Typography
            sx={{ mt: 1, color: "#6F8076", fontSize: 13.5, lineHeight: 1.7 }}
          >
            Set up your VARDAAN workspace and bring your hospital team onto one
            platform.
          </Typography>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.2}
          sx={{ width: { xs: "100%", md: "auto" } }}
        >
          {/* <AppButton
            component={RouterLink}
            to="/register"
            variant="primary"
            endIcon={<ArrowForwardRounded />}
            sx={{ borderRadius: "10px", whiteSpace: "nowrap" }}
          >
            Create workspace
          </AppButton> */}
          <AppButton
            component={RouterLink}
            to="/login"
            variant="outlined"
            sx={{
              borderRadius: "10px",
              borderColor: "#BFD2C3",
              color: "#24483F",
            }}
          >
            Sign in
          </AppButton>
        </Stack>
      </Box>
    </Container>

    <Box sx={{ borderTop: "1px solid #E5ECE6", bgcolor: "#FFFFFF" }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Brand />
          <Typography sx={{ fontSize: 11, color: "#89958E" }}>
            © {new Date().getFullYear()} VARDAAN. Hospital management,
            connected.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box
              component={RouterLink}
              to="/login"
              sx={{
                color: "#607168",
                fontSize: 11,
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Sign in
            </Box>
            {/* <Box
              component={RouterLink}
              to="/register"
              sx={{
                color: "#607168",
                fontSize: 11,
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Get started
            </Box> */}
          </Stack>
        </Stack>
      </Container>
    </Box>
  </Box>
);

export default Landing;
