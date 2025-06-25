import BashRenderComponent from './BashRender';
import FetchRenderComponent from './FetchRender';
import GlobRenderComponent from './GlobRender';
import GrepRenderComponent from './GrepRender';
import LsRenderComponent from './LsRender';
import ReadRenderComponent from './ReadRender';
import { withDebugInfo } from './withDebugInfo';

export const BashRender = withDebugInfo(BashRenderComponent);
export const FetchRender = withDebugInfo(FetchRenderComponent);
export const GrepRender = withDebugInfo(GrepRenderComponent);
export const GlobRender = withDebugInfo(GlobRenderComponent);
export const LsRender = withDebugInfo(LsRenderComponent);
export const ReadRender = withDebugInfo(ReadRenderComponent);
