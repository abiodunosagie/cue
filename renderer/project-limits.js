// Field limits for a saved project card, shared by the store (src/projects.js
// cuts to them) and Settings > Projects (the inputs stop at them).
(function () {
  const api = {
    MAX_NAME_CHARS: 80,
    MAX_SUMMARY_CHARS: 300,
    // Room for "how it was built": screens, architecture, state, integrations.
    MAX_DETAILS_CHARS: 2500,
    MAX_ROLE_CHARS: 300
  };
  if (typeof window !== 'undefined') window.ProjectLimits = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
