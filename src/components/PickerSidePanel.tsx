import { runJamVotesPageUrl } from '../lib/runVoteUrl';

interface PickerSidePanelProps {
  jamSlug: string;
}

export function PickerSidePanel({ jamSlug }: PickerSidePanelProps) {
  const jamVotesUrl = runJamVotesPageUrl(jamSlug);

  return (
    <aside
      className="picker-side-panel"
      aria-label="JamSlots guide"
    >
      <div className="picker-side-panel__inner">
        <h2 className="picker-side-panel__title font-display">Guide</h2>

        <section className="picker-side-panel__section" aria-labelledby="side-vote-heading">
          <h3 id="side-vote-heading" className="picker-side-panel__heading">
            How to vote
          </h3>
          <p className="picker-side-panel__copy">
            Tap the glowing cyan{' '}
            <span className="picker-side-icon-sample picker-side-icon-sample--vote" aria-hidden>
              ▲
            </span>{' '}
            on any cover. RUN opens that game&apos;s ballot so you can vote in one tap.
          </p>
          <p className="picker-side-panel__copy picker-side-panel__copy--muted">
            <a
              href={jamVotesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="picker-side-panel__link"
            >
              Browse all jam games on RUN
            </a>
          </p>
        </section>

        <section className="picker-side-panel__section" aria-labelledby="side-key-heading">
          <h3 id="side-key-heading" className="picker-side-panel__heading">
            Cover icons
          </h3>
          <ul className="picker-side-key">
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--vote" aria-hidden>
                ▲
              </span>
              <span>
                <strong className="picker-side-key__label">RUN votes</strong>
                <span className="picker-side-key__desc">Official jam ballot for this game</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--plays" aria-hidden>
                1.2k
              </span>
              <span>
                <strong className="picker-side-key__label">Plays</strong>
                <span className="picker-side-key__desc">Total plays on RUN (bottom left)</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--favs" aria-hidden>
                ★ 12
              </span>
              <span>
                <strong className="picker-side-key__label">JamSlots stars</strong>
                <span className="picker-side-key__desc">Favorites from players here (bottom right)</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--star" aria-hidden>
                ☆
              </span>
              <span>
                <strong className="picker-side-key__label">Your favorites</strong>
                <span className="picker-side-key__desc">Star on a poster to save it</span>
              </span>
            </li>
            <li className="picker-side-key__row">
              <span className="picker-side-icon-sample picker-side-icon-sample--lock" aria-hidden>
                ○
              </span>
              <span>
                <strong className="picker-side-key__label">Lock reel</strong>
                <span className="picker-side-key__desc">Slots only: keep a reel when you roll again</span>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </aside>
  );
}
