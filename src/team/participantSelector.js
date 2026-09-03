// src/team/participantSelector.js

const KEYWORDS = {
  ops: [
    "error",
    "bug",
    "broken",
    "failure",
    "failed",
    "down",
    "offline",
    "deployment",
    "deploy",
    "rollback",
    "github",
    "code",
    "website",
    "server",
    "api",
    "production",
    "incident",
    "technical"
  ],

  research: [
    "dpdp",
    "privacy",
    "regulation",
    "regulatory",
    "law",
    "legal",
    "compliance",
    "policy",
    "research",
    "government",
    "requirement",
    "notice",
    "consent",
    "data principal"
  ],

  analyst: [
    "analytics",
    "metric",
    "metrics",
    "kpi",
    "revenue",
    "users",
    "traffic",
    "conversion",
    "trend",
    "forecast",
    "experiment",
    "impact",
    "data",
    "audit"
  ],

  support: [
    "customer",
    "user complaint",
    "support",
    "ticket",
    "refund",
    "account",
    "customer issue",
    "escalation",
    "user issue"
  ],

  growth: [
    "lead",
    "leads",
    "sales",
    "campaign",
    "marketing",
    "growth",
    "funnel",
    "email",
    "acquisition",
    "conversion"
  ]
};

const FALLBACK_TEAM = [
  "ops",
  "analyst",
  "research"
];

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function selectParticipants(
  text,
  {
    triggerAgentId = null,
    maxParticipants = 4
  } = {}
) {
  const input =
    normalize(text);

  const scores = new Map();

  for (
    const [agentId, keywords]
      of Object.entries(KEYWORDS)
  ) {
    let score = 0;

    for (
      const keyword of keywords
    ) {
      if (
        input.includes(
          keyword
        )
      ) {
        score += keyword.includes(
          " "
        )
          ? 2
          : 1;
      }
    }

    if (
      agentId ===
      triggerAgentId
    ) {
      score += 5;
    }

    if (score > 0) {
      scores.set(
        agentId,
        score
      );
    }
  }

  if (
    scores.size === 0
  ) {
    for (
      const agentId of
        FALLBACK_TEAM
    ) {
      scores.set(
        agentId,
        1
      );
    }
  }

  return [...scores.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([agentId]) =>
        agentId
    )
    .slice(
      0,
      maxParticipants
    );
}
