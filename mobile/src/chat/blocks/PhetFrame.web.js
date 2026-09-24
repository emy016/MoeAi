/**
 * A PhET simulation, straight from phet.colorado.edu. It is not put in the
 * srcdoc sandbox the other cards use: PhET is a trusted, separate origin, and
 * its sims need their own storage and full-screen support to work.
 */
import React from 'react';

export default function PhetFrame({ url, height, title, style }) {
  return React.createElement('iframe', {
    src: url,
    title,
    allow: 'fullscreen; autoplay',
    allowFullScreen: true,
    loading: 'lazy',
    referrerPolicy: 'no-referrer',
    style: { display: 'block', width: '100%', height, border: 0, background: '#fff', ...style },
  });
}
