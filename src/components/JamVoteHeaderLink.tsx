import { runJamVotesPageUrl } from '../lib/runVoteUrl';

interface JamVoteHeaderLinkProps {
  jamSlug: string;
}

/** Opens the RUN jam Game Votes page in a new tab. */
export function JamVoteHeaderLink({ jamSlug }: JamVoteHeaderLinkProps) {
  return (
    <a
      href={runJamVotesPageUrl(jamSlug)}
      target="_blank"
      rel="noopener noreferrer"
      className="jam-vote-header-cta font-display shrink-0"
    >
      <span className="relative z-[1]">Vote here</span>
    </a>
  );
}
