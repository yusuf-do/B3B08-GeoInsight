const PROVIDER_NAMES = { gemini: 'Gemini', openai: 'OpenAI', custom: 'OpenAI-compatible provider' };
const DEFAULT_DELAY = 60_000;
let lastResult;

function getConfiguration() {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const customUrl = (process.env.LLM_API_URL || '').trim();
  const configured = [geminiKey && 'gemini', openAiKey && 'openai', customUrl && 'custom'].filter(Boolean);
  const selected = (process.env.GEOAI_LLM_PROVIDER || '').trim().toLowerCase();
  const id = selected || (configured.length === 1 ? configured[0] : '');
  if (id === 'off') return { note: 'Live chat is disabled. The GIS Evidence Engine is available.' };
  if (!id) {
    return { note: configured.length > 1 ? 'Select a provider via GEOAI_LLM_PROVIDER on the server.' : 'Configure a model provider on the server to enable live chat.' };
  }
  if (!configured.includes(id)) return { note: 'Server configuration is incomplete for the selected provider.' };
  const model = (process.env.LLM_MODEL || '').trim();
  if (id === 'gemini') {
    const geminiModel = (process.env.GEMINI_MODEL || '').trim() || 'gemini-3.5-flash';
    if (!/^[a-z0-9._-]+$/i.test(geminiModel)) return { note: 'GEMINI_MODEL must be a valid model name.' };
    return { id, key: geminiKey, model: geminiModel, url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent` };
  }
  if (id === 'openai') return { id, key: openAiKey, model: model || 'gpt-4.1-mini', url: 'https://api.openai.com/v1/chat/completions' };
  try {
    const url = new URL(customUrl);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) || url.username || url.password) throw new Error();
    if (!model) return { note: 'Set LLM_MODEL for the OpenAI-compatible provider.' };
    return { id, key: (process.env.LLM_API_KEY || '').trim(), model, url: url.href };
  } catch {
    return { note: 'LLM_API_URL must be an HTTPS URL or a loopback HTTP URL.' };
  }
}

export function getGeoAiSystemStatus() {
  const config = getConfiguration();
  const name = PROVIDER_NAMES[config.id];
  const current = lastResult?.id === config.id && lastResult?.url === config.url && lastResult?.model === config.model ? lastResult : null;
  const connected = Boolean(name && current?.ok);
  return {
    mode: connected ? 'SERVER_LLM_AND_GIS_TOOLS' : 'GIS_TOOLS',
    provider: name ? `${name} + GIS Evidence Engine` : 'GIS Evidence Engine',
    active_provider: connected ? name : 'GIS Evidence Engine',
    model: name ? config.model : null,
    llm_configured: Boolean(name),
    cloud_llm_configured: Boolean(name && config.url.startsWith('https:')),
    llm_connected: connected,
    llm_error: current?.error || null,
    badge_tr: connected ? `${name} connected` : current?.error ? 'Model unavailable' : name ? `${name} configured` : 'GIS Mode',
    security_note_tr: current?.error ? 'The model is unavailable. GIS evidence remains accessible.' :
      config.note || (connected ? `The most recent ${name} request succeeded.` : `${name} is configured. The first request will verify connectivity.`)
  };
}

function providerFailure(response) {
  const { status } = response;
  const retryAfter = response.headers.get('retry-after');
  const seconds = Number(retryAfter);
  const delay = retryAfter && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
  const wait = Number.isFinite(delay) && delay > 0 ? delay : DEFAULT_DELAY;
  if (status === 429) return { code: 'rate_limit', message: 'İstek veya kota sınırına ulaşıldı', wait };
  if (status === 402) return { code: 'payment_required', message: 'Bakiye, bütçe veya ücretli model erişimi gerekiyor', wait: 300_000 };
  if (status === 401 || status === 403) return { code: 'access_denied', message: 'Anahtar veya model erişimi reddedildi', wait: 300_000 };
  if (status === 400 || status === 404) return { message: 'Model veya istek yapılandırmasını kontrol edin', wait: 300_000 };
  return { message: 'Model isteği başarısız oldu', wait: status >= 500 ? wait : 0 };
}

export async function requestGeoAiCompletion({ instructions, history, question, maxTokens, tool }) {
  const config = getConfiguration();
  if (!config.id) return { code: 'not_configured' };
  const { id, key, model, url } = config;
  const name = PROVIDER_NAMES[id];
  if (lastResult?.id === id && lastResult.url === url && lastResult.model === model && lastResult.retryAt > Date.now()) {
    return { code: lastResult.code, error: lastResult.error };
  }
  const turns = [...history, { role: 'user', content: question }];
  const headers = { 'Content-Type': 'application/json' };
  const gemini = id === 'gemini';
  if (gemini) headers['x-goog-api-key'] = key;
  else if (key) headers.Authorization = `Bearer ${key}`;
  const body = gemini ? {
    systemInstruction: { parts: [{ text: instructions }] },
    contents: turns.map((turn) => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.content }] })),
    generationConfig: { maxOutputTokens: maxTokens },
    ...(tool ? { tools: [{ functionDeclarations: [tool] }] } : {})
  } : {
    model,
    messages: [{ role: 'system', content: instructions }, ...turns],
    ...(id === 'openai' ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    ...(tool ? { tools: [{ type: 'function', function: tool }], tool_choice: 'auto' } : {})
  };
  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok) {
      const { message, wait, code = 'unavailable' } = providerFailure(response);
      const error = `${name} HTTP ${response.status} · ${message}.`;
      console.warn('GeoAI sağlayıcı isteği başarısız', { provider: name, model, status: response.status, reason: message, retryAfterMs: wait });
      lastResult = { id, model, url, code, error, retryAt: Date.now() + wait };
      return { code, error };
    }
    const data = await response.json();
    if (tool) {
      const call = gemini ? data.candidates?.[0]?.content?.parts?.find((part) => part.functionCall)?.functionCall
        : data.choices?.[0]?.message?.tool_calls?.[0]?.function;
      if (call?.name === tool.name) {
        let args = call.args;
        if (!gemini) {
          try { args = JSON.parse(call.arguments); } catch { args = null; }
        }
        if (args && Object.entries(tool.parameters.properties).every(([key, spec]) => spec.enum.includes(args[key]))) {
          lastResult = { id, model, url, ok: true };
          return { tool_args: args };
        }
      }
    }
    const content = gemini
      ? data.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || '').join('')
      : data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) {
      lastResult = { id, model, url, ok: true };
      return { answer: content.trim(), provider: name, model };
    }
    const error = `${name} kullanılabilir metin döndürmedi.`;
    console.warn('GeoAI sağlayıcı yanıtı boş veya geçersiz', { provider: name, model });
    lastResult = { id, model, url, error };
    return { error };
  } catch (err) {
    const error = `${name} ${err.name === 'TimeoutError' ? 'zaman aşımına uğradı' : 'bağlantısı kurulamadı'}.`;
    console.warn('GeoAI sağlayıcısına erişilemedi', { provider: name, model, reason: error });
    const code = err.name === 'TimeoutError' ? 'timeout' : 'unavailable';
    lastResult = { id, model, url, code, error, retryAt: Date.now() + 15_000 };
    return { code, error };
  }
}
