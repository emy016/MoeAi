/** One of the site's own pages, filling the space it is given. Same origin, so it keeps the student's session. */
import React from 'react';

export default function SiteFrame({ url, title, style, onLoad }) {
  return React.createElement('iframe', {
    src: url,
    title,
    onLoad,
    allow: 'fullscreen; clipboard-write',
    style: { display: 'block', width: '100%', height: '100%', border: 0, background: 'transparent', ...style },
  });
}
