import { clean, q, txt, until, set, bool, num } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /javascript — https://browserleaks.com/javascript
 * 101 fields: JavaScript detection, document, screen, date/time, Intl API, navigator, userAgentData,
 * plugins, mimeTypes, battery, network, Bluetooth, Web Audio, SpeechSynthesis
 */
export async function scrapeBlJavascript(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!txt('#js-userAgent') && !!txt('#js-timeZone') && !!txt('#js-width'), timeoutMs);
    const g = (id: string) => txt('#js-' + id);
    
    // JavaScript Detection
    set(out, 'jsEnabled', bool(txt('body')));
    set(out, 'inlineScripts', bool(txt('#inline-scripts')));
    set(out, 'sameOriginScripts', bool(txt('#same-origin-scripts')));
    set(out, 'thirdPartyScripts', bool(txt('#third-party-scripts')));
    
    // Document Object
    set(out, 'documentReferrer', g('referrer'));
    
    // Screen Object
    set(out, 'screenWidth', num(g('width')));
    set(out, 'screenHeight', num(g('height')));
    set(out, 'availWidth', num(g('availWidth')));
    set(out, 'availHeight', num(g('availHeight')));
    set(out, 'colorDepth', num(g('colorDepth')));
    set(out, 'pixelDepth', num(g('pixelDepth')));
    set(out, 'availTop', num(g('availTop')));
    set(out, 'availLeft', num(g('availLeft')));
    set(out, 'orientationType', g('orientation-type'));
    set(out, 'orientationAngle', num(g('orientation-angle')));
    set(out, 'devicePixelRatio', num(g('devicePixelRatio')));
    set(out, 'innerWidth', num(g('innerWidth')));
    set(out, 'innerHeight', num(g('innerHeight')));
    set(out, 'outerWidth', num(g('outerWidth')));
    set(out, 'outerHeight', num(g('outerHeight')));
    set(out, 'divClientWidth', num(g('div-clientWidth')));
    set(out, 'divClientHeight', num(g('div-clientHeight')));
    set(out, 'isExtended', bool(g('isExtended')));
    
    // Date/Time
    set(out, 'systemTime', g('date'));
    set(out, 'toLocaleString', g('toLocaleString'));
    set(out, 'toLocaleFormat', g('toLocaleFormat'));
    
    // Internationalization API
    set(out, 'dateTimeFormat', g('DateTimeFormat'));
    set(out, 'hourCycle', g('hourCycle'));
    set(out, 'locale', g('locale'));
    set(out, 'calendar', g('calendar'));
    set(out, 'numberingSystem', g('numberingSystem'));
    set(out, 'timeZone', g('timeZone'));
    set(out, 'intlYear', g('year'));
    set(out, 'intlMonth', g('month'));
    set(out, 'intlDay', g('day'));
    
    // Navigator Object
    set(out, 'userAgent', g('userAgent'));
    set(out, 'appVersion', g('appVersion'));
    set(out, 'appName', g('appName'));
    set(out, 'appCodeName', g('appCodeName'));
    set(out, 'product', g('product'));
    set(out, 'productSub', g('productSub'));
    set(out, 'vendor', g('vendor'));
    set(out, 'buildID', g('buildID'));
    set(out, 'platform', g('platform'));
    set(out, 'oscpu', g('oscpu'));
    set(out, 'hardwareConcurrency', num(g('hardwareConcurrency')));
    set(out, 'deviceMemory', num(g('deviceMemory')));
    set(out, 'devicePostureType', g('devicePosture-type'));
    set(out, 'language', g('language'));
    const langs = g('languages');
    if (langs) out.languages = langs.split(/[,\s]+/).filter(Boolean);
    set(out, 'onLine', bool(g('onLine')));
    set(out, 'doNotTrack', g('doNotTrack'));
    set(out, 'cookieEnabled', bool(g('cookieEnabled')));
    set(out, 'maxTouchPoints', num(g('maxTouchPoints')));
    set(out, 'webdriver', bool(g('webdriver')));
    set(out, 'pdfViewerEnabled', bool(g('pdfViewerEnabled')));
    set(out, 'globalPrivacyControl', g('globalPrivacyControl'));
    
    // navigator.userAgentData (Client Hints)
    set(out, 'uaDataApiStatus', g('uaData-apiStatus'));
    set(out, 'uaDataBrands', g('uaData-brands'));
    set(out, 'uaDataMobile', bool(g('uaData-mobile')));
    set(out, 'uaDataPlatform', g('uaData-platform'));
    set(out, 'uaDataArchitecture', g('uaData-architecture'));
    set(out, 'uaDataBitness', g('uaData-bitness'));
    set(out, 'uaDataWow64', bool(g('uaData-wow64')));
    set(out, 'uaDataFullVersion', g('uaData-uaFullVersion'));
    set(out, 'uaDataFullVersionList', g('uaData-fullVersionList'));
    set(out, 'uaDataFormFactors', g('uaData-formFactors'));
    
    // navigator.plugins & mimeTypes
    const plugins = g('plugins'), mimes = g('mimeTypes');
    set(out, 'pluginsCount', /^\d+$/.test(plugins) ? +plugins : (q('#js-plugins') ? q('#js-plugins')!.querySelectorAll('li, br').length || undefined : undefined));
    set(out, 'mimeTypesCount', /^\d+$/.test(mimes) ? +mimes : (q('#js-mimeTypes') ? q('#js-mimeTypes')!.querySelectorAll('li, br').length || undefined : undefined));
    
    // Battery Status API
    set(out, 'batteryApiStatus', g('battery-apiStatus'));
    set(out, 'batteryCharging', bool(g('charging')));
    set(out, 'batteryChargingTime', num(g('chargingTime')));
    set(out, 'batteryDischargingTime', num(g('dischargingTime')));
    set(out, 'batteryLevel', (() => { const n = num(g('level')); return n === undefined ? undefined : (/%/.test(g('level')) ? n / 100 : n); })());
    
    // Network Information API
    set(out, 'networkApiStatus', g('network-apiStatus'));
    set(out, 'networkType', g('network-type'));
    set(out, 'networkEffectiveType', g('network-effectiveType'));
    set(out, 'networkDownlink', num(g('network-downlink')));
    set(out, 'networkDownlinkMax', num(g('network-downlinkMax')));
    set(out, 'networkRtt', num(g('network-rtt')));
    set(out, 'networkSaveData', bool(g('network-saveData')));
    
    // Web Bluetooth API
    set(out, 'bluetoothApiStatus', g('bluetooth-apiStatus'));
    
    // Web Audio API
    set(out, 'audioApiStatus', g('audio-apiStatus'));
    set(out, 'audioState', g('audio-state'));
    set(out, 'audioSampleRate', num(g('audio-sampleRate')));
    set(out, 'audioMaxChannelCount', num(g('audio-maxChannelCount')));
    set(out, 'audioNumberOfInputs', num(g('audio-numberOfInputs')));
    set(out, 'audioNumberOfOutputs', num(g('audio-numberOfOutputs')));
    set(out, 'audioChannelCount', num(g('audio-channelCount')));
    set(out, 'audioChannelCountMode', g('audio-channelCountMode'));
    set(out, 'audioChannelInterpretation', g('audio-channelInterpretation'));
    set(out, 'audioFftSize', num(g('audio-fftSize')));
    set(out, 'audioFrequencyBinCount', num(g('audio-frequencyBinCount')));
    set(out, 'audioMinDecibels', num(g('audio-minDecibels')));
    set(out, 'audioMaxDecibels', num(g('audio-maxDecibels')));
    set(out, 'audioSmoothingTimeConstant', num(g('audio-smoothingTimeConstant')));
    
    // SpeechSynthesis
    set(out, 'speechApiStatus', g('speech-apiStatus'));
    set(out, 'speechVoicesCount', num(g('voices')));
    
    // Rest of window.navigator
    set(out, 'deprecatedRunAdAuctionEnforcesKAnonymity', bool(g('deprecatedRunAdAuctionEnforcesKAnonymity')));
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}