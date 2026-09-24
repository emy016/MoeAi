/**
 * A block's page in a sandboxed iframe. `allow-scripts` without
 * `allow-same-origin` gives the page an opaque origin: it runs its own code
 * but cannot read the app, its storage, cookies or the student's session.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SandboxFrame = forwardRef(function SandboxFrame({ html, frameId, height, onMessage, title, style }, ref) {
  const iframe = useRef(null);

  useImperativeHandle(ref, () => ({
    send(command) { iframe.current?.contentWindow?.postMessage({ __moeaiCmd: true, ...command }, '*'); },
  }), []);

  useEffect(() => {
    const listener = (event) => {
      const data = event.data;
      if (!data || data.__moeai !== frameId || event.source !== iframe.current?.contentWindow) return;
      onMessage?.(data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [frameId, onMessage]);

  return React.createElement('iframe', {
    ref: iframe,
    srcDoc: html,
    title,
    sandbox: 'allow-scripts allow-downloads',
    allow: 'fullscreen',
    loading: 'lazy',
    style: { display: 'block', width: '100%', height, border: 0, background: 'transparent', colorScheme: 'normal', ...style },
  });
});

export default SandboxFrame;
