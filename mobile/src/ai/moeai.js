/**
 * The bridge from this app to the MoeAI tutor.
 *
 * The web app POSTs to /api/moeai and reads an NDJSON stream off
 * `response.body`. React Native's fetch has no `body` stream, so this uses
 * XMLHttpRequest instead and re-reads the part of `responseText` it has not
 * seen yet on every progress event. Same wire format, same endpoint, no
 * server changes:
 *
 *   {"citations":[…]} once, before the first token, when the answer is
 *                     grounded in the student's own course material
 *   {"delta":"..."}   zero or more, in order
 *   {"done":true}     once, at the end
 *   {"error":"..."}   instead, if the stream broke after it began
 *
 * A failure before the stream starts is an ordinary JSON body with a 4xx/5xx,
 * and the caller falls back to whatever it showed before the tutor existed.
 */
import { API_BASE_URL } from './config';

export class MoeAIError extends Error {
  /**
   * `fromServer` separates "MoeAI said no" (a spend cap, an outage — worth
   * showing verbatim) from "we never got there" (no signal, DNS, timeout),
   * where the app's own wording is friendlier than a transport error.
   */
  constructor(message, status, fromServer = false) {
    super(message);
    this.name = 'MoeAIError';
    this.status = status || 0;
    this.fromServer = fromServer;
  }
}

const TIMEOUT_MS = 45000;

/** The last 16 turns, trimmed — the endpoint caps at 24 and 12k characters each. */
function forWire(messages) {
  return messages
    .filter((message) => message && typeof message.text === 'string' && message.text.trim())
    .slice(-16)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.text.slice(0, 12000),
    }));
}

/**
 * Streams a reply. `onDelta` is called with each chunk of text as it arrives;
 * the promise resolves with the whole reply, or rejects with a MoeAIError.
 */
export function streamReply({ messages, context, signal }, onDelta, onCitations) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let seen = 0;
    let buffer = '';
    let full = '';
    let streamError = null;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(() => {
      try { xhr.abort(); } catch (_) {}
      finish(reject, new MoeAIError('The tutor took too long to answer.', 0));
    }, TIMEOUT_MS);

    if (signal) {
      signal.addEventListener?.('abort', () => {
        try { xhr.abort(); } catch (_) {}
        finish(reject, new MoeAIError('Cancelled.', 0));
      });
    }

    const consume = (text) => {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let event;
        try { event = JSON.parse(trimmed); } catch (_) { continue; }
        if (Array.isArray(event.citations)) {
          onCitations?.(event.citations);
        } else if (typeof event.delta === 'string' && event.delta) {
          full += event.delta;
          onDelta?.(event.delta, full);
        } else if (event.error) {
          streamError = String(event.error);
        }
      }
    };

    xhr.open('POST', `${API_BASE_URL}/api/moeai`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/x-ndjson');

    xhr.onprogress = () => {
      // responseText only ever grows, so everything past `seen` is new.
      const text = xhr.responseText || '';
      if (text.length <= seen) return;
      consume(text.slice(seen));
      seen = text.length;
    };

    xhr.onerror = () => finish(reject, new MoeAIError('Could not reach MoeAI. Check your connection.', 0));
    xhr.onabort = () => finish(reject, new MoeAIError('Cancelled.', 0));

    xhr.onload = () => {
      const text = xhr.responseText || '';
      if (text.length > seen) consume(text.slice(seen));
      if (buffer.trim()) consume('\n');

      if (xhr.status >= 400 && !full) {
        let message = `MoeAI returned ${xhr.status}.`;
        try {
          const body = JSON.parse(text);
          if (body && body.error) message = String(body.error);
        } catch (_) {}
        return finish(reject, new MoeAIError(message, xhr.status, true));
      }
      if (!full) return finish(reject, new MoeAIError(streamError || 'MoeAI sent an empty reply.', xhr.status, Boolean(streamError)));
      // A stream that broke midway still delivered real text; keep it.
      finish(resolve, full);
    };

    xhr.send(JSON.stringify({ messages: forWire(messages), context: context || null }));
  });
}
