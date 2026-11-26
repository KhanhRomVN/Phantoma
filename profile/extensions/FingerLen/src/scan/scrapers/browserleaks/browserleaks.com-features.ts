import { clean, q, txt, until, set, bool } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /features — https://browserleaks.com/features
 * 323 fields: General (features hash), HTML5 (60+ features), CSS (120+ features),
 * Graphics (20+ features), Storage (5), ECMAScript (40+), Network (15+), Miscellaneous (60+)
 */
export async function scrapeBlFeatures(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!txt('#features-hash'), timeoutMs);
    
    // General
    set(out, 'featuresHash', txt('#features-hash'));
    
    // Extract tất cả feature tests từ các bảng
    // Mỗi feature có format: <tr><td class="feature-name">Feature Name</td><td class="feature-value">true/false/value</td></tr>
    const tables = document.querySelectorAll('table.features-table');
    
    for (const table of Array.from(tables)) {
      const sectionHeader = table.previousElementSibling;
      const sectionName = sectionHeader ? clean(sectionHeader.textContent).toLowerCase().replace(/[^a-z0-9]+/g, '_') : '';
      
      for (const row of Array.from(table.querySelectorAll('tr'))) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const featureName = clean(cells[0].textContent);
          const featureValue = clean(cells[1].textContent);
          
          if (!featureName || !featureValue) continue;
          
          // Convert feature name to camelCase key
          const key = featureName
            .replace(/[()\[\]:]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
            .replace(/^[A-Z]/, c => c.toLowerCase());
          
          // Parse value
          let parsedValue: any = featureValue;
          if (featureValue === 'true' || featureValue === 'True') parsedValue = true;
          else if (featureValue === 'false' || featureValue === 'False') parsedValue = false;
          else if (/^\d+$/.test(featureValue)) parsedValue = parseInt(featureValue, 10);
          else if (/^\d+\.\d+$/.test(featureValue)) parsedValue = parseFloat(featureValue);
          
          // Prefix with section name nếu có
          const finalKey = sectionName ? `${sectionName}_${key}` : key;
          out[finalKey] = parsedValue;
        }
      }
    }
    
    // Fallback: nếu không có bảng, extract trực tiếp từ các element có id
    if (Object.keys(out).length <= 1) {
      const featureElements = document.querySelectorAll('[data-feature]');
      for (const el of Array.from(featureElements)) {
        const key = (el as HTMLElement).dataset.feature;
        const value = clean(el.textContent);
        if (key && value) {
          let parsedValue: any = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          out[key] = parsedValue;
        }
      }
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}