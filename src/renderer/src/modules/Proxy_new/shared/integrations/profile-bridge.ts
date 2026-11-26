/**
 * The only place in the Proxy module that reaches into the Profile module.
 *
 * These are generic building blocks (modal hook, QR decoder, lookup-state UI) that Profile still
 * owns. Keeping the deep imports here means that when Profile exposes a public API, or these move
 * to shared UI, only this file has to change. Profile *data* access (profile list, browser folder)
 * does not go through here: it is injected through `FoxholeProfileGateway` instead.
 */
export { useEscapeKey } from '../../../Profile/hooks/useEscapeKey';
export { decodeQrText } from '../../../Profile/utils/qr';
export {
  CenteredState,
  RetryButton,
} from '../../../Profile/components/modal/LaunchBrowserModal/DetailPanel/CenteredState';
export { IpInfoBlocks } from '../../../Profile/components/modal/LaunchBrowserModal/DetailPanel/IpInfoBlocks';
