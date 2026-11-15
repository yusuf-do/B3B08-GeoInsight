let worker;
let idleTimer;
let idleMs = 180_000;
let released = () => {};
let inFlight = false;
let disposePending;
let stopActive;

function startIdleTimer() {
  clearTimeout(idleTimer);
  if (worker && !inFlight) idleTimer = setTimeout(releaseBrowserGeoAi, idleMs);
}

export function configureBrowserGeoAiIdleTimeout(minutes, onRelease) {
  idleMs = ([1, 3, 5].includes(minutes) ? minutes : 3) * 60_000;
  released = onRelease;
  startIdleTimer();
}

export function releaseBrowserGeoAi(immediate = false) {
  clearTimeout(idleTimer);
  if (immediate) stopActive?.();
  if (!worker || inFlight) return;
  const disposable = worker;
  worker = undefined;
  if (immediate) {
    disposable.terminate();
    return;
  }
  disposePending = new Promise((resolve) => {
    const finish = () => {
      clearTimeout(deadline);
      disposable.terminate();
      resolve();
    };
    const deadline = setTimeout(finish, 2_000);
    disposable.onmessage = ({ data }) => { if (data.type === 'disposed') finish(); };
    disposable.onerror = finish;
    disposable.postMessage({ type: 'dispose' });
  }).finally(() => { disposePending = undefined; });
  released();
}

export async function generateBrowserGeoAi(messages, signal, onStatus, { scopeCheck, mode = 'eco', onDraft, singleSentence } = {}) {
  if (inFlight) throw new Error('GeoAI is already generating a response.');
  inFlight = true;
  clearTimeout(idleTimer);
  try {
    await disposePending;
    if (signal.aborted) throw signal.reason;
    if (!window.isSecureContext || typeof Worker !== 'function' || typeof WebAssembly !== 'object') {
      throw new Error('Local AI needs a modern browser with Web Workers and WebAssembly on localhost or HTTPS.');
    }
    worker ||= new Worker(new URL('./geoai-local-worker.js', import.meta.url), { type: 'module' });
    return await new Promise((resolve, reject) => {
      const active = worker;
      let deadline;
      let generating = false;
      const finish = (error, answer, keepWorker = false) => {
        clearTimeout(deadline);
        stopActive = undefined;
        signal.removeEventListener('abort', stop);
        active.onmessage = null;
        active.onerror = null;
        if (!error) return resolve(answer);
        if (!keepWorker) {
          active.terminate();
          worker = undefined;
        }
        reject(error);
      };
      const setDeadline = (milliseconds, error) => {
        clearTimeout(deadline);
        deadline = setTimeout(() => finish(error), milliseconds);
      };
      const stop = () => {
        if (!generating) return finish(signal.reason);
        active.postMessage({ type: 'cancel' });
        setDeadline(1_500, signal.reason);
      };
      stopActive = () => finish(new DOMException('Page closed', 'AbortError'));
      signal.addEventListener('abort', stop, { once: true });
      const timeout = new Error('Local AI timed out. Try again.');
      setDeadline(20 * 60_000, timeout);
      active.onerror = () => finish(new Error('The browser could not start the local AI worker. Run npm ci and retry.'));
      active.onmessage = ({ data }) => {
        if (data.type === 'status' && !signal.aborted) {
          onStatus(data.text);
          generating = data.phase === 'generating';
          if (generating) setDeadline(3 * 60_000, timeout);
        }
        if (data.type === 'draft' && !signal.aborted) onDraft?.(data.text);
        if (data.type === 'error') finish(new Error(data.text));
        if (data.type === 'incomplete') finish(new Error(data.text), null, true);
        if (data.type === 'cancelled' || (data.type === 'answer' && signal.aborted)) finish(signal.reason, null, true);
        else if (data.type === 'answer') finish(null, data);
      };
      active.postMessage({ type: 'generate', messages, scopeCheck, mode, preview: Boolean(onDraft), singleSentence });
    });
  } finally {
    inFlight = false;
    startIdleTimer();
  }
}

const measurementAliases = {
  hectare: 'ha', hectares: 'ha', hektar: 'ha', percent: '%', yüzde: '%',
  metres: 'm', metre: 'm', meters: 'm', meter: 'm', ft: 'feet', km2: 'km²'
};

function geoAiMeasurements(text) {
  const matches = text.matchAll(
    /(\d+(?:[.,]\d+)*)\s*(%|m²|km²|(?:ha|hectares?|hektar|km2?|ton|percent|yüzde|feet|ft|metres?|meters?)\b)|\b(NDVI|dNBR|SAR)\b[^.!?\n\d]{0,30}(\d+[.,]\d+)/gi
  );
  return Array.from(matches, ([, quantity, unit, index, indexValue]) => {
    if (index) return `${index.toLowerCase()} ${indexValue.replace(',', '.')}`;
    const label = unit.toLowerCase();
    const value = /^(?:\d{1,3}[.,])+\d{3}$/.test(quantity) ? quantity.replace(/[.,]/g, '') : quantity.replace(',', '.');
    return `${measurementAliases[label] || label} ${value}`;
  });
}

export function hasUnsupportedGeoAiMeasurement(answer, evidence) {
  const recorded = new Set(geoAiMeasurements(evidence || ''));
  return geoAiMeasurements(answer).some((measurement) => !recorded.has(measurement));
}

export function hasUnsupportedGeoAiImpact(answer, evidence) {
  if (!evidence) return false;
  // Satellite records alone cannot establish downstream human impacts.
  const humanImpact = /\b(economic|socioeconomic|financial|social|fatalit\w*|casualt\w*|ekonomik|sosyoekonomik|mali|sosyal|toplumsal|can kayb\w*)\b/iu;
  if (humanImpact.test(evidence)) return false;
  const uncertainty = /\b(unverified|unknown|unavailable|no evidence|cannot|does not|do not|not establish|not show|not measure|belirsiz|bilinmiyor|göstermez|belirlenemedi|doğrulanmadı|doğrulamıyor|ölçülmedi|değerlendirilemez)\b/iu;
  return answer.split(/(?<=[.!?])\s+|\n+/).some((sentence) => humanImpact.test(sentence) && !uncertainty.test(sentence));
}

export function browserGeoAiLanguage(question, previousLanguage = 'en') {
  const words = question.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ı', 'i');
  if (/\b(what|where|which|why|how|does|tell me|explain|show me|compare|analy[sz]e|thank you|hello)\b/.test(words)) return 'en';
  if (/\b(ne|nedir|nasil|neden|hangi|nerede|demek|havza|anlat|acikla|nedeni|merhaba|tesekkur|tamam|olmus|degismis)\b/.test(words) ||
    /[çğıöşüİ]/i.test(question.replace(/Muğla|Menteşe|Köyceğiz|Bördübet|İçmeler|Turunç|Türkiye/gi, ''))) return 'tr';
  if (/\b(hi|thanks|okay|summarize|simplify)\b/.test(words)) return 'en';
  return previousLanguage;
}

// Definitions are context for the model. They are independent of the map selection.
const geoAiDefinitions = [
  [/\b(watershed|drainage basin|havza)\w*\b/i,
    'A watershed is land that drains to one outlet. The land includes slopes and streams leading to that outlet.',
    'Su toplama havzası, yağış sularının aynı çıkış noktasına doğru aktığı kara alanıdır.'],
  [/\bNDVI\b/i,
    'NDVI compares near-infrared and red reflectance to help assess vegetation greenness. It does not directly measure biomass.',
    'NDVI, bitki örtüsünün yeşilliğini değerlendirmek için yakın kızılötesi ve kırmızı bant yansımalarını karşılaştırır. Doğrudan biyokütle ölçümü değildir.'],
  [/\bdNBR\b/i,
    'dNBR subtracts the post-fire NBR from the pre-fire NBR. It helps map fire-related change and assess severity.',
    'dNBR, yangın öncesi NBR değerinden yangın sonrası NBR değerinin çıkarılmasıyla hesaplanır. Yangınla ilişkili değişimi değerlendirmeye yarar.']
];

export function browserGeoAiDefinition(question, language) {
  if (!/\b(?:what (?:is|does)|define|nedir|ne demek|ne anlama gelir)\b/i.test(question)) return null;
  return geoAiDefinitions.find(([term]) => term.test(question))?.[language === 'tr' ? 2 : 1] ?? null;
}

export function browserGeoAiScopeCheck(question, language, intent, reference) {
  if (intent !== 'information' || reference) return null;
  const explicitUnrelated = /^(?:please\s+)?(?:tell me (?:a|another) joke|write (?:me )?a poem|who won the football match|(?:bana )?bir (?:şaka|fıkra) anlat|(?:bana )?bir şiir yaz)[\s.!?]*$/iu;
  return { language, unrelated: explicitUnrelated.test(question) };
}

export function buildBrowserGeoAiMessages(question, history, context, evidence, language, intent, mode = 'eco', reference = null) {
  const eco = mode !== 'balanced';
  const turkish = language === 'tr';
  const revise = ['clarify', 'summarize'].includes(intent);
  const instructions = turkish
    ? 'Sen Muğla GeoAI coğrafya asistanısın. Soruyu doğal Türkçeyle doğrudan yanıtla. Yerel gözlemi genel bilgiden ayır.'
    : 'You are Muğla GeoAI, a geospatial research assistant. Answer directly in plain English. Separate local observations from general knowledge.';
  let task = turkish
    ? 'Başlık kullanmadan tek cümlede uydu kaydının gösterdiği değişimi açıkla. Yeni sonuç çıkarma ve sayı kullanma.'
    : 'In at most two short sentences, explain the mapped observation and its limit. Keep the finding within the recorded boundary. Add no measurements or causes.';
  if (evidence?.source_question) {
    task = turkish ? 'Sadece kayıtta adı geçen veri kaynaklarını açıkla.' : 'Name only the data sources in the observation record.';
  } else if (evidence?.area_question) {
    task = turkish ? 'Alan bilgisini, birimi değiştirmeden tek cümleyle söyle.'
      : evidence.drawn ? 'In one sentence, distinguish the drawn area from the affected area.'
        : 'Say how many hectares the verified event covered in one sentence.';
  }
  const currentHistory = history.filter((turn) => turn.intent !== 'social' && !turn.evidence);
  const previousReply = revise && history.findLast((turn) => turn.role === 'assistant' && turn.intent !== 'social' &&
    (!turn.evidence || history.at(-1) === turn));
  let record = evidence?.verified_record.replace(/\*\*/g, '').slice(0, eco ? 780 : 1300);
  if (turkish && evidence?.event && !evidence.area_question && !evidence.source_question && intent === 'analysis') {
    record = record.split(' Kayıttaki gösterge:')[0];
    if (evidence.module === 'wildfire_ecosystem' && record.includes('doğrulanmış yanma sınırı')) {
      const area = evidence.area?.split('—')[0].trim();
      record = `${area ? `${area}: ` : ''}Uydu görüntüleri orman yangınında yanan alanın sınırını gösteriyor.`;
      task = 'Uydu kaydının neyi gösterdiğini tek bir kısa cümleyle açıkla. Yanıta “Uydu görüntüleri” ile başla.';
    }
  }
  const years = (evidence?.years || context.comparison_years).join('–');
  const mosaics = evidence?.sentinel_mosaic_years?.join(', ');
  const facts = evidence
    ? [
      record,
      intent === 'comparison' && `${turkish ? 'Karşılaştırma dönemi' : 'Imagery comparison period'}: ${years}`,
      !turkish && `Module: ${context.module}`,
      !eco && !evidence.source_question && mosaics && `Sentinel-2 mosaics: ${mosaics}`,
      evidence.drawn && (turkish ? 'Çizimin alanı, olaydan etkilenen alanı göstermez.' : 'The drawn area is a boundary measurement. Any reference-event metric applies to that event.')
    ].filter(Boolean).join('\n')
    : null;
  let userMessage = facts ? `${turkish ? 'Kayıt' : 'Observation record'}: ${facts}\n${turkish ? 'Soru' : 'Question'}: ${question}\n${task}` : question;
  if (reference && !facts) {
    userMessage = turkish
      ? `Soru: ${question}\nTanım: ${reference}\nTerimin ne olduğunu ve ayırt edici özelliğini bir cümlede açıkla.`
      : `Reference definition: ${reference}\n${question}\nDefine the term in one sentence.`;
  }
  if (previousReply) {
    const rewrite = turkish ? 'İstenen değişikliği yap. Önceki yanıtın temel bulgusunu ve gerekli sayıları koru.'
      : 'Rewrite as requested. Preserve the main finding and any amount that answers the original question.';
    userMessage = `${previousReply.content.slice(0, eco ? 560 : 1000)}\n\n${question}\n${rewrite}`;
  }
  return [
    { role: 'system', content: instructions },
    ...(intent === 'social' || evidence || previousReply || reference ? [] : currentHistory.slice(eco ? -4 : -6))
      .map(({ role, content }) => ({ role, content: content.slice(0, eco ? 320 : 640) })),
    { role: 'user', content: userMessage }
  ];
}
