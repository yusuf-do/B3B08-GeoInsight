const MODEL = 'onnx-community/Qwen3-0.6B-ONNX';
const REVISION = '79346d370dfae34801d26993fda9ae2372900fd0';
const MIN_GPU_STORAGE = 128 * 1024 * 1024;
const LIMITS = {
  eco: { input: 384, output: 256, short: 54, evidence: 78 },
  balanced: { input: 768, output: 384, short: 128, evidence: 144 }
};
let generator;
let device;
let Tensor;
let StoppingCriteria;
let TextStreamer;
let stopping;
let running = false;
const COMPLETE_SENTENCE = /^[\s\S]*[.!?](?:["”’)]*)(?=\s|$)/;
const FIRST_SENTENCE = /^[\s\S]*?(?<!\d)[.!?](?:["”’)]*)(?=\s|$)/;
const ENDS_SENTENCE = /[.!?](?:["”’)]*)\s*$/;
class IncompleteReply extends Error {}

function status(text, phase) {
  self.postMessage({ type: 'status', text, phase });
}

async function usableGpu() {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    return adapter?.features.has('shader-f16') && adapter.limits.maxStorageBufferBindingSize >= MIN_GPU_STORAGE;
  } catch {
    return false;
  }
}

async function initialize(cpuOnly = false) {
  if (typeof WebAssembly !== 'object' || !self.isSecureContext) {
    self.postMessage({ type: 'error', text: 'Local AI needs a modern browser with WebAssembly on localhost or HTTPS.' });
    return false;
  }
  status('Loading local AI runtime…', 'loading');
  const { env, pipeline, Tensor: RuntimeTensor, InterruptableStoppingCriteria, TextStreamer: RuntimeStreamer } =
    await import('/geoai-runtime/transformers.min.js');
  Tensor = RuntimeTensor;
  StoppingCriteria = InterruptableStoppingCriteria;
  TextStreamer = RuntimeStreamer;
  env.allowLocalModels = false;
  env.useBrowserCache = 'caches' in self;
  env.backends.onnx.wasm.wasmPaths = new URL('/geoai-runtime/', self.location.href).href;
  env.backends.onnx.wasm.numThreads = 1;
  const devices = !cpuOnly && await usableGpu() ? ['webgpu', 'wasm'] : ['wasm'];
  for (const candidate of devices) {
    let percentage = -1;
    try {
      status(`Loading the local model (${candidate === 'wasm' ? 'CPU' : 'WebGPU'})…`, 'loading');
      generator = await pipeline('text-generation', MODEL, {
        revision: REVISION,
        dtype: candidate === 'webgpu' ? 'q4f16' : 'q8',
        device: candidate,
        progress_callback(event) {
          if (event.status !== 'progress' || !event.file.endsWith('.onnx')) return;
          const next = Math.floor(event.progress);
          if (percentage === next || !Number.isFinite(next)) return;
          percentage = next;
          status(`Downloading local model… ${next}%`, 'loading');
        }
      });
      if (candidate === 'webgpu') {
        const check = await infer([{ role: 'user', content: 'Reply with exactly this word: READY' }],
          { max_new_tokens: 8, do_sample: false });
        if (!/^ready[.!]?$/i.test(check)) throw new Error('WebGPU model output did not pass validation');
      }
      device = candidate;
      return true;
    } catch (error) {
      console.warn('GeoAI model initialization failed', candidate, error);
      if (candidate === 'wasm') throw error;
      await generator?.dispose().catch(() => {});
      generator = undefined;
    }
  }
}

function inputTokens(messages, limit) {
  const tokenizer = generator.tokenizer;
  const encode = (turns) => tokenizer.apply_chat_template(turns, {
    tokenize: true, return_tensor: false, add_generation_prompt: true, enable_thinking: false
  });
  const turns = messages.slice();
  let ids = encode(turns);
  while (ids.length > limit && turns.length > 2) {
    // Remove an old exchange before clipping the current request.
    turns.splice(1, Math.min(2, turns.length - 2));
    ids = encode(turns);
  }
  if (ids.length <= limit) return ids;
  // Preserve the system instruction and the current question at the end of the GIS prompt.
  const head = Math.floor(limit / 2);
  return [...ids.slice(0, head), ...ids.slice(-(limit - head))];
}

async function infer(messages, options = {}, limits = LIMITS.eco, reply = null) {
  if (stopping?.interrupted) return '';
  const ids = inputTokens(messages, limits.input);
  const softStop = reply && new StoppingCriteria();
  let previewText = '';
  let publishedAt = 0;
  let generated = 0;
  const limitsReached = () => reply.singleSentence
    ? generated >= 9 && FIRST_SENTENCE.test(previewText)
    : generated >= reply.target && ENDS_SENTENCE.test(previewText) && !/\d\.\s*$/.test(previewText);
  const streamer = reply ? new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    token_callback_function(tokens) { generated += tokens.length; },
    callback_function(text) {
      if (!text || stopping?.interrupted) return;
      previewText += text;
      if (limitsReached()) softStop.interrupt();
      if (reply.preview && performance.now() - publishedAt >= 160) {
        publishedAt = performance.now();
        self.postMessage({ type: 'draft', text: reply.singleSentence ? previewText.match(FIRST_SENTENCE)?.[0] || previewText : previewText });
      }
    }
  }) : undefined;
  const output = await generator.model.generate({
    inputs: new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    max_new_tokens: limits.output,
    stopping_criteria: softStop ? [stopping, softStop] : stopping ?? undefined,
    ...(streamer && { streamer }),
    do_sample: true,
    temperature: 0.4,
    top_p: 0.85,
    top_k: 20,
    repetition_penalty: 1.1,
    ...options
  });
  const tokens = output.tolist()[0].slice(ids.length);
  let text = generator.tokenizer.decode(tokens, { skip_special_tokens: true }).trim();
  if (stopping?.interrupted) return '';
  if (!text) throw new Error('Empty generation');
  if (reply?.singleSentence) text = text.match(FIRST_SENTENCE)?.[0] || text;
  if (reply && (softStop.interrupted || tokens.length >= (options.max_new_tokens ?? limits.output)) && !ENDS_SENTENCE.test(text)) {
    text = text.match(COMPLETE_SENTENCE)?.[0].trim();
    if (!text) throw new IncompleteReply();
  }
  return text;
}

async function generate(messages, scopeCheck, limits, preview, singleSentence) {
  status(`Generating on ${device === 'wasm' ? 'CPU' : 'WebGPU'}…`, 'generating');
  if (scopeCheck) {
    const earlier = messages.slice(1, -1).findLast((message) => message.role === 'user')?.content;
    const category = scopeCheck.unrelated ? '2' : await infer([
      { role: 'system', content: 'Classify the final request. Answer only 1 or 2. 1 means geography, environment, satellite imagery, GIS, or a related follow-up. 2 means an unrelated task such as jokes, poems or sports scores.' },
      { role: 'user', content: `Earlier topic, if relevant: ${earlier || 'none'}\nFinal request: ${messages.at(-1).content}\nAnswer only 1 or 2.` }
    ], { max_new_tokens: 4, do_sample: false }, limits);
    if (/^2\b/.test(category)) {
      const scopeReply = scopeCheck.language === 'tr'
        ? 'Alakasız bir istek aldın. Uzmanlık alanını tek bir Türkçe cümleyle belirt.'
        : 'Say what you specialize in as GeoAI, in one sentence starting with “I”. Your scope is satellite imagery and environmental analysis in Muğla.';
      return infer([messages[0], { role: 'user', content: scopeReply }], { max_new_tokens: 64 }, limits, { target: 32, preview: false });
    }
  }
  return infer(messages, {}, limits, { target: preview ? limits.short : limits.evidence, preview, singleSentence });
}

self.onmessage = async ({ data: { type, messages, scopeCheck, mode, preview, singleSentence } }) => {
  if (type === 'cancel') {
    stopping?.interrupt();
    return;
  }
  if (type === 'dispose' && !running) {
    try {
      await generator?.dispose();
    } finally {
      generator = undefined;
      self.postMessage({ type: 'disposed' });
      self.close();
    }
    return;
  }
  if (type !== 'generate' || running) return;
  running = true;
  try {
    if (!generator && !await initialize()) return;
    stopping = new StoppingCriteria();
    const limits = mode === 'balanced' ? LIMITS.balanced : LIMITS.eco;
    const text = await generate(messages, scopeCheck, limits, preview, singleSentence).catch(async (error) => {
      if (stopping.interrupted || error instanceof IncompleteReply || device !== 'webgpu') throw error;
      console.warn('GeoAI WebGPU generation failed; switching to CPU', error);
      const previous = generator;
      generator = undefined;
      await previous.dispose().catch(() => {});
      await initialize(true);
      return generate(messages, scopeCheck, limits, preview, singleSentence);
    });
    self.postMessage(stopping.interrupted ? { type: 'cancelled' } : { type: 'answer', text, device });
  } catch (error) {
    if (error instanceof IncompleteReply) {
      self.postMessage({ type: 'incomplete', text: 'The model did not finish a sentence. Try rephrasing or use Balanced mode.' });
      return;
    }
    console.warn('GeoAI local inference failed', error);
    const text = generator
      ? 'The local model could not generate a reply. Retry or close other memory-intensive tabs.'
      : 'The local model could not load. Check your connection for the first download, browser storage, and available memory.';
    self.postMessage(stopping?.interrupted ? { type: 'cancelled' } : { type: 'error', text });
  } finally {
    stopping = undefined;
    running = false;
  }
};
