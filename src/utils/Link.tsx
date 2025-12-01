import { Text, Transform } from 'ink';
import type { FC as ReactFC, ReactNode } from 'react';
import terminalLink from 'terminal-link';

export type Props = {
  readonly children: ReactNode;
  /**
   * The URL to link to.
   *
   * @example
   * ```
   * import React from 'react';
   * import { Link } from '../utils/Link';
   *
   * <Link url="https://sindresorhus.com">
   *   My <Text color="cyan">Website</Text>
   * </Link>
   * ```
   */
  readonly url: string;
  /**
   * Determines whether the URL should be printed after the text for unsupported terminals:
   * `My website https://sindresorhus.com`.
   *
   * Can be a boolean or a function that receives the text and URL and returns a custom fallback string.
   *
   * @default true
   *
   * @example
   * ```
   * import React from 'react';
   * import { Link } from '../utils/Link';
   *
   * <Link url="https://sindresorhus.com" fallback={false}>
   *   My <Text color="cyan">Website</Text>
   * </Link>
   *
   * <Link url="https://sindresorhus.com" fallback={(text, url) => `[${text}](${url})`}>
   *   My <Text color="cyan">Website</Text>
   * </Link>
   * ```
   */
  readonly fallback?: boolean | ((text: string, url: string) => string);
};

/**
 * An Ink component that creates clickable links in the terminal.
 *
 * [Supported terminals.](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda)
 *
 * For unsupported terminals, the link will be printed after the text:
 * `My website https://sindresorhus.com`.
 *
 * @example
 * ```
 * import React from 'react';
 * import { render, Text } from 'ink';
 * import { Link } from '../utils/Link';
 *
 * render(
 *   <Link url="https://sindresorhus.com">
 *     My <Text color="cyan">Website</Text>
 *   </Link>
 * );
 * ```
 */
const Link: ReactFC<Props> = ({ children, url, fallback = true }) => (
  <Transform
    transform={(children) => terminalLink(children, url, { fallback })}
  >
    <Text>{children}</Text>
  </Transform>
);

export { Link };
