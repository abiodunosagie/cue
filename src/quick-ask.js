// One short model call that must not hang: the full reply text, or a rejection
// after timeoutMs. For the small Fast-model checks (is this a question on
// screen, is this the same question), where a stalled stream would otherwise
// block the feature that is waiting on it for good.
function quickAsk({ llm, system, text, imageDataUrl, imageDataUrls, maxTokens, timeoutMs }) {
  let timer = null;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('the model took too long')), timeoutMs);
  });
  // llm.stream resolves with the whole reply, so tokens need no collecting here.
  const call = llm.stream({ system, turns: [{ role: 'user', text }], imageDataUrl, imageDataUrls, maxTokens, onToken: () => {} });
  return Promise.race([call, timeout]).then((reply) => String(reply || '')).finally(() => clearTimeout(timer));
}

module.exports = { quickAsk };
