import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { useDetailModal } from "src/providers/DetailModalProvider";
import {
  MOBILE_LLM_RETRY_INTERVAL_MS,
  checkMobileLlmHealth,
  loadMobileLlmUrl,
  normalizeMobileLlmUrl,
  requestMovieRecommendations,
  saveMobileLlmUrl,
} from "src/lib/mobileLlm";
import { searchMovieByTitle } from "src/lib/tmdbSearch";
import {
  ChatMessage,
  ChatRecommendation,
  MobileLlmStatus,
} from "src/types/Chatbot";
import { MEDIA_TYPE } from "src/types/Common";

const quickPrompts = [
  "Need a fast sci-fi movie with a smart twist.",
  "Recommend a cozy family movie for dinner time.",
  "I want a suspense movie that is not too dark.",
  "Suggest stylish action movies like John Wick.",
];

const initialMessage: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Tell me your mood, watch time, favorite genres, or who is watching with you. I will turn that into a sharper movie shortlist.",
  createdAt: Date.now(),
};

const panelMotion = {
  initial: { opacity: 0, y: 24, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 24, scale: 0.96 },
  transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] },
};

function buildMessage(role: ChatMessage["role"], content: string) {
  const message: ChatMessage = {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  };

  return message;
}

function getStatusCopy(status: MobileLlmStatus, hasUrl: boolean) {
  if (!hasUrl) {
    return {
      title: "Mobile LLM URL missing",
      body: "Paste your current ngrok HTTPS URL to connect the website to your phone.",
    };
  }

  if (status === "online") {
    return {
      title: "Phone model connected",
      body: "Recommendations are live from your mobile Termux session.",
    };
  }

  if (status === "checking") {
    return {
      title: "Checking connection",
      body: "Trying to reach your phone now.",
    };
  }

  return {
    title: "Phone model offline",
    body: "I will keep retrying every 15 seconds. Start Termux, launch the model, and keep ngrok running.",
  };
}

async function enrichRecommendations(
  recommendations: ChatRecommendation[]
): Promise<ChatRecommendation[]> {
  const resolvedRecommendations = await Promise.all(
    recommendations.map(async (item) => {
      try {
        const movie = await searchMovieByTitle(item.title);
        return { ...item, movie };
      } catch {
        return item;
      }
    })
  );

  return resolvedRecommendations;
}

export default function MobileLlmChatbot() {
  const { data: configuration } = useGetConfigurationQuery(undefined);
  const { setDetailType } = useDetailModal();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<MobileLlmStatus>("checking");
  const [urlInput, setUrlInput] = useState(loadMobileLlmUrl);
  const [serviceUrl, setServiceUrl] = useState(loadMobileLlmUrl);
  const [isSending, setIsSending] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hasUrl = Boolean(serviceUrl);
  const statusCopy = getStatusCopy(status, hasUrl);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!serviceUrl) {
      setStatus("not_configured");
      return;
    }

    let isSubscribed = true;

    const pollHealth = async () => {
      if (!isSubscribed) {
        return;
      }

      setStatus((currentStatus) =>
        currentStatus === "online" ? currentStatus : "checking"
      );

      try {
        await checkMobileLlmHealth(serviceUrl);
        if (!isSubscribed) {
          return;
        }
        setStatus("online");
      } catch {
        if (!isSubscribed) {
          return;
        }
        setStatus("offline");
      } finally {
        if (isSubscribed) {
          setLastCheckedAt(Date.now());
        }
      }
    };

    pollHealth();
    const intervalId = window.setInterval(pollHealth, MOBILE_LLM_RETRY_INTERVAL_MS);

    return () => {
      isSubscribed = false;
      window.clearInterval(intervalId);
    };
  }, [serviceUrl]);

  const retryEta = useMemo(() => {
    if (!lastCheckedAt || status === "online" || !hasUrl) {
      return "";
    }

    return "Auto-retrying every 15s";
  }, [hasUrl, lastCheckedAt, status]);

  const handleSaveUrl = async () => {
    const normalizedValue = saveMobileLlmUrl(urlInput);
    setUrlInput(normalizedValue);
    setServiceUrl(normalizedValue);
    setIsSettingsOpen(false);

    if (!normalizedValue) {
      setStatus("not_configured");
      setMessages((currentMessages) => [
        ...currentMessages,
        buildMessage(
          "status",
          "Mobile LLM URL cleared. Add a fresh ngrok URL whenever your phone session changes."
        ),
      ]);
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      buildMessage(
        "status",
        `Connected target updated to ${normalizedValue}. I am checking the phone now.`
      ),
    ]);

    try {
      await checkMobileLlmHealth(normalizedValue);
      setStatus("online");
    } catch {
      setStatus("offline");
    } finally {
      setLastCheckedAt(Date.now());
    }
  };

  const handleReconnect = async () => {
    if (!serviceUrl) {
      setIsSettingsOpen(true);
      return;
    }

    setStatus("checking");

    try {
      await checkMobileLlmHealth(serviceUrl);
      setStatus("online");
    } catch {
      setStatus("offline");
    } finally {
      setLastCheckedAt(Date.now());
    }
  };

  const handleSend = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedDraft = draft.trim();

    if (!trimmedDraft || isSending) {
      return;
    }

    if (!serviceUrl) {
      setIsOpen(true);
      setIsSettingsOpen(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        buildMessage(
          "status",
          "Add your current ngrok URL first, then I can talk to the mobile model."
        ),
      ]);
      return;
    }

    const nextUserMessage = buildMessage("user", trimmedDraft);
    setMessages((currentMessages) => [...currentMessages, nextUserMessage]);
    setDraft("");
    setIsSending(true);

    try {
      const conversation = [...messages, nextUserMessage]
        .filter(
          (item): item is ChatMessage & { role: "user" | "assistant" } =>
            item.role === "user" || item.role === "assistant"
        )
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.content }));

      const response = await requestMovieRecommendations(serviceUrl, conversation);
      const recommendations = await enrichRecommendations(response.recommendations);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          ...buildMessage("assistant", response.reply),
          recommendations,
        },
      ]);
      setStatus("online");
    } catch {
      setStatus("offline");
      setMessages((currentMessages) => [
        ...currentMessages,
        buildMessage(
          "assistant",
          "Your phone looks offline right now. Start the Termux model and ngrok again, then tap reconnect or wait for auto-retry."
        ),
      ]);
    } finally {
      setIsSending(false);
      setLastCheckedAt(Date.now());
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 14, md: 24 },
        bottom: { xs: 18, md: 24 },
        zIndex: 1400,
      }}
    >
      <AnimatePresence>
        {isOpen ? (
          <Box
            component={motion.div}
            key="chatbot-panel"
            {...panelMotion}
            sx={{
              width: { xs: "calc(100vw - 28px)", sm: 420 },
              maxWidth: "calc(100vw - 28px)",
              height: { xs: "min(78vh, 720px)", md: 720 },
              borderRadius: "26px",
              overflow: "hidden",
              backdropFilter: "blur(24px)",
              bgcolor: "rgba(8, 11, 18, 0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 24px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top right, rgba(255,113,67,0.26), transparent 32%), radial-gradient(circle at bottom left, rgba(76,175,80,0.18), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))",
                pointerEvents: "none",
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 2.5,
                py: 2,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "16px",
                    background:
                      "linear-gradient(135deg, rgba(255,122,89,1), rgba(255,184,77,0.92))",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 10px 35px rgba(255,122,89,0.4)",
                  }}
                >
                  <SmartToyRoundedIcon sx={{ color: "#111", fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, lineHeight: 1.1 }}
                  >
                    Nebula AI
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mobile movie guide powered by your phone
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={() => setIsSettingsOpen((currentValue) => !currentValue)}
                  sx={{
                    color: "text.primary",
                    bgcolor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <SettingsRoundedIcon />
                </IconButton>
                <IconButton
                  onClick={() => setIsOpen(false)}
                  sx={{
                    color: "text.primary",
                    bgcolor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <TuneRoundedIcon />
                </IconButton>
              </Stack>
            </Stack>

            <Box
              sx={{
                mx: 2.5,
                px: 1.5,
                py: 1.25,
                borderRadius: "18px",
                bgcolor:
                  status === "online"
                    ? "rgba(51, 171, 116, 0.14)"
                    : "rgba(255,255,255,0.05)",
                border:
                  status === "online"
                    ? "1px solid rgba(51, 171, 116, 0.25)"
                    : "1px solid rgba(255,255,255,0.08)",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                {status === "online" ? (
                  <CloudDoneRoundedIcon sx={{ color: "#52cf88" }} />
                ) : (
                  <CloudOffRoundedIcon sx={{ color: "#ffb74d" }} />
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {statusCopy.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {statusCopy.body}
                    {retryEta ? ` ${retryEta}.` : ""}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={handleReconnect}
                  startIcon={<RefreshRoundedIcon />}
                  sx={{
                    color: "text.primary",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reconnect
                </Button>
              </Stack>
            </Box>

            <AnimatePresence initial={false}>
              {isSettingsOpen ? (
                <Box
                  component={motion.div}
                  key="settings"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  sx={{
                    mx: 2.5,
                    mt: 1.5,
                    p: 1.5,
                    borderRadius: "18px",
                    bgcolor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Mobile endpoint
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paste the ngrok HTTPS URL from your phone. You can change it here any time.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                    <Box
                      sx={{
                        flexGrow: 1,
                        display: "flex",
                        alignItems: "center",
                        px: 1.5,
                        borderRadius: "14px",
                        bgcolor: "rgba(0,0,0,0.24)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <LinkRoundedIcon
                        sx={{ color: "text.secondary", mr: 1, fontSize: 20 }}
                      />
                      <InputBase
                        value={urlInput}
                        onChange={(event) => setUrlInput(event.target.value)}
                        placeholder="https://your-ngrok-url.ngrok-free.app"
                        sx={{ flexGrow: 1, color: "text.primary" }}
                      />
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleSaveUrl}
                      sx={{
                        borderRadius: "14px",
                        px: 2,
                        bgcolor: "#ff7043",
                        color: "#111",
                        "&:hover": { bgcolor: "#ff8a65" },
                      }}
                    >
                      Save
                    </Button>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Normalized URL: {normalizeMobileLlmUrl(urlInput) || "Not set"}
                  </Typography>
                </Box>
              ) : null}
            </AnimatePresence>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                px: 2.5,
                pt: 1.5,
                pb: 0.5,
                position: "relative",
                zIndex: 1,
                overflowX: "auto",
              }}
            >
              {quickPrompts.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  onClick={() => {
                    setDraft(prompt);
                    setIsOpen(true);
                  }}
                  sx={{
                    color: "text.primary",
                    bgcolor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </Stack>

            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                px: 2.5,
                py: 1.5,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Stack spacing={1.4}>
                <AnimatePresence initial={false}>
                  {messages.map((message) => {
                    const isAssistant = message.role !== "user";
                    return (
                      <Box
                        component={motion.div}
                        key={message.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.22 }}
                        sx={{
                          alignSelf: isAssistant ? "stretch" : "flex-end",
                          ml: isAssistant ? 0 : 6,
                          mr: isAssistant ? 6 : 0,
                        }}
                      >
                        <Box
                          sx={{
                            px: 1.6,
                            py: 1.3,
                            borderRadius: isAssistant
                              ? "18px 18px 18px 6px"
                              : "18px 18px 6px 18px",
                            bgcolor:
                              message.role === "status"
                                ? "rgba(255,255,255,0.06)"
                                : isAssistant
                                ? "rgba(255,255,255,0.09)"
                                : "linear-gradient(135deg, #ff7043, #ffb74d)",
                            background:
                              message.role === "user"
                                ? "linear-gradient(135deg, #ff7043, #ffb74d)"
                                : undefined,
                            border:
                              message.role === "status"
                                ? "1px dashed rgba(255,255,255,0.14)"
                                : "1px solid rgba(255,255,255,0.08)",
                            boxShadow:
                              message.role === "user"
                                ? "0 10px 25px rgba(255,112,67,0.22)"
                                : "none",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                message.role === "user" ? "#111" : "text.primary",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {message.content}
                          </Typography>
                        </Box>

                        {message.recommendations?.length ? (
                          <Stack spacing={1.1} sx={{ mt: 1.1 }}>
                            {message.recommendations.map((recommendation) => {
                              const imageBaseUrl =
                                configuration?.images.secure_base_url ||
                                configuration?.images.base_url ||
                                "";
                              const posterSource = recommendation.movie?.poster_path
                                ? `${imageBaseUrl}w342${recommendation.movie.poster_path}`
                                : recommendation.movie?.backdrop_path
                                ? `${imageBaseUrl}w342${recommendation.movie.backdrop_path}`
                                : "";

                              return (
                                <Box
                                  key={`${message.id}-${recommendation.title}`}
                                  component={motion.button}
                                  whileHover={{ y: -4, scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => {
                                    if (recommendation.movie?.id) {
                                      setDetailType({
                                        mediaType: MEDIA_TYPE.Movie,
                                        id: recommendation.movie.id,
                                      });
                                    }
                                  }}
                                  sx={{
                                    width: "100%",
                                    display: "grid",
                                    gridTemplateColumns: "88px 1fr",
                                    gap: 1.25,
                                    p: 1,
                                    borderRadius: "16px",
                                    bgcolor: "rgba(9, 12, 18, 0.75)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "inherit",
                                    textAlign: "left",
                                    cursor: recommendation.movie?.id
                                      ? "pointer"
                                      : "default",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 88,
                                      aspectRatio: "2 / 3",
                                      borderRadius: "12px",
                                      overflow: "hidden",
                                      bgcolor: "rgba(255,255,255,0.05)",
                                      display: "grid",
                                      placeItems: "center",
                                    }}
                                  >
                                    {posterSource ? (
                                      <Box
                                        component="img"
                                        src={posterSource}
                                        alt={recommendation.title}
                                        sx={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <AutoAwesomeRoundedIcon
                                        sx={{ color: "rgba(255,255,255,0.65)" }}
                                      />
                                    )}
                                  </Box>
                                  <Stack spacing={0.7} sx={{ minWidth: 0 }}>
                                    <Typography
                                      variant="subtitle1"
                                      sx={{ fontWeight: 700, lineHeight: 1.1 }}
                                    >
                                      {recommendation.movie?.title ||
                                        recommendation.title}
                                    </Typography>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                                      {recommendation.mood ? (
                                        <Chip
                                          size="small"
                                          label={recommendation.mood}
                                          sx={{
                                            bgcolor: "rgba(255,112,67,0.18)",
                                            color: "#ffd2c2",
                                          }}
                                        />
                                      ) : null}
                                      {recommendation.yearHint ? (
                                        <Chip
                                          size="small"
                                          label={recommendation.yearHint}
                                          sx={{
                                            bgcolor: "rgba(255,255,255,0.08)",
                                            color: "text.primary",
                                          }}
                                        />
                                      ) : null}
                                    </Stack>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {recommendation.reason}
                                    </Typography>
                                  </Stack>
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : null}
                      </Box>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </Stack>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

            <Box sx={{ p: 2.5, position: "relative", zIndex: 1 }}>
              <Box
                component="form"
                onSubmit={handleSend}
                sx={{
                  p: 0.75,
                  borderRadius: "18px",
                  bgcolor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <InputBase
                    multiline
                    minRows={1}
                    maxRows={5}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Describe your mood, genre, runtime, or who is watching..."
                    sx={{
                      flexGrow: 1,
                      px: 1.25,
                      py: 0.8,
                      color: "text.primary",
                    }}
                  />
                  <IconButton
                    type="submit"
                    disabled={isSending || !draft.trim()}
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "14px",
                      bgcolor: draft.trim()
                        ? "#ff7043"
                        : "rgba(255,255,255,0.08)",
                      color: draft.trim() ? "#111" : "text.disabled",
                      "&:hover": {
                        bgcolor: draft.trim() ? "#ff8a65" : "rgba(255,255,255,0.12)",
                      },
                    }}
                  >
                    <SendRoundedIcon />
                  </IconButton>
                </Stack>
              </Box>
            </Box>
          </Box>
        ) : null}
      </AnimatePresence>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
        <Box sx={{ position: "relative" }}>
          <Box
            component={motion.div}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
            sx={{
              position: "absolute",
              inset: -8,
              borderRadius: "28px",
              background:
                "conic-gradient(from 180deg, rgba(255,112,67,0.2), rgba(255,190,92,0.75), rgba(255,112,67,0.2))",
              filter: "blur(8px)",
            }}
          />
          <Button
            onClick={() => setIsOpen((currentValue) => !currentValue)}
            startIcon={<AutoAwesomeRoundedIcon />}
            sx={{
              position: "relative",
              px: 2.25,
              py: 1.4,
              minWidth: 0,
              borderRadius: "20px",
              bgcolor: "rgba(10, 13, 20, 0.92)",
              color: "text.primary",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 18px 45px rgba(0,0,0,0.38)",
              "&:hover": {
                bgcolor: "rgba(14, 18, 28, 0.98)",
              },
            }}
          >
            <Stack spacing={0.15} alignItems="flex-start">
              <Typography variant="subtitle2" sx={{ lineHeight: 1.05 }}>
                Ask Nebula AI
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Movie picks from your phone model
              </Typography>
            </Stack>
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
