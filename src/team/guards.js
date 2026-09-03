// src/team/guards.js

const DEFAULTS = {
  maxRounds: 4,
  maxMessages: 10
};

export function createConversationGuard(
  options = {}
) {
  const config = {
    ...DEFAULTS,
    ...options
  };

  const state = {
    rounds: 0,
    messages: [],
    finished: false
  };

  return {
    canContinue() {
      return (
        !state.finished &&
        state.rounds <
          config.maxRounds &&
        state.messages.length <
          config.maxMessages
      );
    },

    startRound() {
      state.rounds += 1;
      return state.rounds;
    },

    recordMessage({
      agentId,
      content
    }) {
      state.messages.push({
        agentId,
        content,
        round: state.rounds,
        timestamp:
          new Date().toISOString()
      });
    },

    markFinished() {
      state.finished = true;
    },

    getState() {
      return {
        rounds: state.rounds,
        messages:
          state.messages.length,
        finished:
          state.finished
      };
    }
  };
}

export function stripSilentPrefix(
  content
) {
  const text =
    String(content ?? "")
      .trim();

  if (
    /^silent$/i.test(text)
  ) {
    return {
      silent: true,
      content: ""
    };
  }

  return {
    silent: false,
    content: text
  };
}
