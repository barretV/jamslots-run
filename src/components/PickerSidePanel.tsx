import { runJamVotesPageUrl } from '../lib/runVoteUrl';

interface PickerSidePanelProps {
  jamSlug: string;
}

export function PickerSidePanel({ jamSlug }: PickerSidePanelProps) {
  const jamVotesUrl = runJamVotesPageUrl(jamSlug);

  return (
    <aside className="picker-side-panel" aria-label="JamSlots guide">
      <div className="picker-side-panel__glow" aria-hidden />
      <div className="picker-side-panel__inner">
        <header className="picker-side-hero">
          <p className="picker-side-hero__eyebrow font-display">JamSlots</p>
          <h2 className="picker-side-hero__title font-display">
            <span className="picker-side-hero__line">Quick</span>
            <span className="picker-side-hero__line">Guide</span>
          </h2>
        </header>

        <div className="picker-side-vote-card">
          <span className="picker-side-tap-hand" aria-hidden>
            <span className="picker-side-tap-hand__emoji">👆</span>
            <span className="picker-side-tap-hand__ring" />
          </span>
          <p className="picker-side-tap-label font-display">Tap to vote</p>
          <p className="picker-side-tap-hint">Use the glowing badge on any game cover</p>
        </div>

        <section className="picker-side-key-block" aria-labelledby="side-key-heading">
          <h3 id="side-key-heading" className="picker-side-key-heading font-display">
            Icons
          </h3>
          <ul className="picker-side-key">
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--plays" aria-hidden>
                1.2k
              </span>
              <span>
                <strong className="picker-side-key__label">Plays</strong>
                <span className="picker-side-key__desc">RUN total, bottom left</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--favs" aria-hidden>
                ★ 12
              </span>
              <span>
                <strong className="picker-side-key__label">JamSlots stars</strong>
                <span className="picker-side-key__desc">Community favorites here</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--star" aria-hidden>
                ☆
              </span>
              <span>
                <strong className="picker-side-key__label">Your favorites</strong>
                <span className="picker-side-key__desc">Star a poster to save it</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--lock" aria-hidden>
                ○
              </span>
              <span>
                <strong className="picker-side-key__label">Lock reel</strong>
                <span className="picker-side-key__desc">Slots: keep a reel on roll</span>
              </span>
            </li>
          </ul>
        </section>

        <p className="picker-side-footer">
          <a
            href={jamVotesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="picker-side-panel__link"
          >
            All games on RUN
          </a>
        </p>
      </div>
    </aside>
  );
}
