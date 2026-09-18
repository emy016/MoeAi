"use client";
import { useState } from "react";
import { ArrowUpRight, ExternalLink, FlaskConical } from "lucide-react";

/**
 * The EduMoe simulators, inside the workspace.
 *
 * They are a full page of their own — logic canvas, probability, calculus,
 * discrete maths, physics — and rewriting them as React components would be
 * a week's work for no gain. Framing them keeps one implementation, and the
 * prompts underneath hand whatever the student built back to Moe.
 *
 * The frame is same-origin, so it inherits the theme the student picked.
 */
const ASKS = [
  { label: "Explain a logic circuit", text: "I built a circuit in the logic simulator. Walk me through how to read its truth table and find the minimal form." },
  { label: "Help with projectile motion", text: "Explain projectile motion: which quantities are independent, and why the horizontal and vertical parts separate." },
  { label: "Make sense of a distribution", text: "I'm using the probability simulator. Explain when to use a binomial versus a normal distribution, with an example from my course." },
  { label: "Read a slope field", text: "Explain what a slope field shows and how to read a particular solution off it." },
];

export function Simulators({ onAsk }: { onAsk: (text: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="mx-simulators">
      <div className="mx-view-title">
        <div>
          <span className="mx-eyebrow">BUILD IT, THEN ASK ABOUT IT</span>
          <h1>Simulators.</h1>
          <p>Logic circuits, probability, calculus, discrete maths and physics — running on this device, next to the tutor that can explain them.</p>
        </div>
        <a className="mx-secondary" href="/simulators" target="_blank" rel="noopener noreferrer">
          Open full screen <ExternalLink size={15}/>
        </a>
      </div>
      <div className="mx-simulator-frame">
        {!loaded && <div className="mx-simulator-loading"><FlaskConical size={22}/> Loading the simulators…</div>}
        <iframe
          src="/simulators"
          title="EduMoe simulators"
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="mx-simulator-asks">
        <span className="mx-eyebrow">ASK MOE ABOUT WHAT YOU BUILT</span>
        <div>
          {ASKS.map(ask => (
            <button key={ask.label} onClick={() => onAsk(ask.text)}>{ask.label}<ArrowUpRight size={13}/></button>
          ))}
        </div>
      </div>
    </section>
  );
}
