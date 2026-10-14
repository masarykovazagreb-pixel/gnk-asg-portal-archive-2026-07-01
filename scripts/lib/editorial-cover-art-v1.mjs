import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const PALETTES = [
  ['#07111f', '#15283c', '#64d4ce', '#f3c96b'],
  ['#101126', '#292049', '#f08473', '#f4d48b'],
  ['#08151a', '#163b3a', '#74d6a4', '#e9c56e'],
  ['#131018', '#35213a', '#d997ec', '#f0bd73'],
  ['#0c1426', '#233c65', '#8bb7ff', '#f7d87f'],
  ['#17130f', '#463325', '#e49d5d', '#f2d9a5'],
  ['#0c1020', '#263552', '#71d3e3', '#e8bd7a'],
  ['#0d1715', '#214b42', '#a3d070', '#f1ca70'],
];
const THEMES = [
  { id: 'network', re: /\b(ai|umjetn|digital|podat|software|tehnolog|network|mrež|algorit|model|infrastruktur|cyber|kibern|sustav|automatiz|cloud|data)\b/i },
  { id: 'finance', re: /\b(financ|kapital|novac|invest|trži|burz|dug|inflacij|valut|bank|račun|prihod|likvid|ekonom|money|capital|market|credit|debt)\b/i },
  { id: 'governance', re: /\b(uprav|odgovorn|reviz|transparent|povjeren|odbor|izvješt|autor|prav|etika|govern|trust|audit|report|board)\b/i },
  { id: 'resilience', re: /\b(rizik|sigurn|otporn|kriz|zaštit|oporav|backup|incident|cyber|kibern|risk|security|resilien|continuity)\b/i },
  { id: 'energy', re: /\b(energ|klim|voda|miner|resurs|potrošn|održiv|supply|dobavn|lanac|food|hrana|water)\b/i },
  { id: 'sport', re: /\b(sport|nogomet|košark|cibona|hrgović|athlet|champion|trener|player|team)\b/i },
  { id: 'journey', re: /\b(putov|destin|grad|obal|more|obitelj|stil|kultur|umjetn|prič|travel|journey|culture|story)\b/i },
];
const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
const rgb = (hex, alpha = 1) => {
  const raw = hex.replace('#', '');
  return `rgba(${parseInt(raw.slice(0, 2), 16)},${parseInt(raw.slice(2, 4), 16)},${parseInt(raw.slice(4, 6), 16)},${alpha})`;
};
function wrapTitle(value, limit = 27, maxLines = 4) {
  const words = String(value || 'GNK ASG Editorial').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > limit && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = `${visible[maxLines - 1].replace(/[.,;:]?$/, '')}…`;
    return visible;
  }
  return lines;
}
function motifFor(title, type) {
  const hay = `${type || ''} ${title || ''}`;
  return THEMES.find((theme) => theme.re.test(hay))?.id || 'governance';
}
function motifDraw(motif, accent, pale, seed) {
  const offset = seed % 22;
  const faint = rgb(accent, 0.2);
  const line = rgb(pale, 0.45);
  const args = [];
  const draw = (fill, stroke, width, geometry) => args.push('-fill', fill, '-stroke', stroke, '-strokewidth', String(width), '-draw', geometry);
  if (motif === 'network') {
    draw('none', rgb(accent, 0.66), 3, 'line 770,215 930,166 line 930,166 1070,247 line 770,215 840,348 line 840,348 1014,417 line 1014,417 1110,492 line 840,348 932,526 line 930,166 1014,417 line 1070,247 1014,417');
    [[770,215,12],[930,166,12],[1070,247,12],[840,348,20],[1014,417,12],[1110,492,10],[932,526,11]].forEach(([x,y,r],i) => draw(i===3?accent:pale, pale, 2, `circle ${x},${y} ${x+r},${y}`));
  } else if (motif === 'finance') {
    draw(faint, rgb(accent, 0.8), 2, 'rectangle 790,350 852,520 rectangle 875,270 937,520 rectangle 960,194 1022,520 rectangle 1045,124 1107,520');
    draw('none', line, 3, 'circle 950,300 1090,300 line 810,515 1120,515 line 822,320 905,252 line 905,252 978,278 line 978,278 1080,155 line 1080,155 1103,181');
    draw(pale, pale, 0, 'polygon 1080,155 1113,147 1103,181');
  } else if (motif === 'resilience') {
    draw(faint, line, 4, `polygon 953,130 1105,189 1093,340 1027,459 953,509 879,459 813,340 801,189`);
    draw('none', accent, 12, 'line 865,316 932,382 line 932,382 1054,251');
    draw('none', rgb(accent, 0.55), 2, 'circle 953,320 1160,320');
  } else if (motif === 'energy') {
    draw('none', line, 3, 'circle 955,327 1150,327 line 760,327 1150,327 line 955,130 955,524');
    draw('none', rgb(accent, 0.82), 4, 'path "M955,145 C1062,145 1140,220 1140,327 C1140,434 1062,509 955,509 C848,509 770,434 770,327 C770,220 848,145 955,145" path "M855,171 C922,245 922,409 855,483 M1055,171 C988,245 988,409 1055,483"');
    draw(accent, pale, 2, 'polygon 975,211 906,340 956,340 923,437 1020,301 970,301');
  } else if (motif === 'sport') {
    draw(faint, line, 3, 'roundrectangle 765,142 1145,522 24,24 line 955,142 955,522 line 765,332 1145,332 line 765,232 1145,232 line 765,432 1145,432');
    draw('none', accent, 5, 'circle 955,332 1030,332');
    draw(pale, pale, 0, 'circle 855,265 873,265 circle 1055,403 1068,403');
  } else if (motif === 'journey') {
    draw(rgb(accent,0.17), rgb(pale,0.5), 3, 'circle 1010,242 1095,242 polygon 747,478 876,260 954,355 1032,236 1162,478');
    draw(rgb(pale,0.14), rgb(accent,0.74), 3, `polygon 750,505 866,386 965,470 1049,403 1162,505`);
    draw('none', line, 3, 'line 740,520 1168,520');
  } else {
    draw(faint, rgb(accent,0.65), 3, 'circle 955,327 1156,327 circle 955,327 1104,327 circle 955,327 1053,327');
    draw('none', line, 5, `path "M${775+offset},354 C865,185 934,205 1000,342 S1116,469 1140,277"`);
    draw(pale, pale, 0, 'circle 795,354 810,354 circle 1000,342 1019,342 circle 1140,277 1151,277');
  }
  return args;
}

export function writeCoverWebp({ title, kicker = 'GNK ASG · EDITORIAL', seed = title, type = '' }, outputPath, { quality = 84 } = {}) {
  const digest = hash(`${seed}|${title}|${type}`);
  const palette = PALETTES[parseInt(digest.slice(0, 2), 16) % PALETTES.length];
  const [background, panel, accent, pale] = palette;
  const variation = parseInt(digest.slice(2, 8), 16);
  const motif = motifFor(title, type);
  const titleLines = wrapTitle(title, 27, 4);
  const args = [
    '-size','1200x630',`gradient:${background}-${panel}`,
    '-fill',rgb(accent,0.12),'-draw','circle 975,325 1235,325',
    '-fill','none','-stroke',rgb(pale,0.06),'-strokewidth','1',
    '-draw','line 700,0 700,630 line 738,0 738,630 line 776,0 776,630 line 814,0 814,630 line 852,0 852,630 line 890,0 890,630 line 928,0 928,630 line 966,0 966,630 line 1004,0 1004,630 line 1042,0 1042,630 line 1080,0 1080,630 line 1118,0 1118,630 line 1156,0 1156,630',
    '-fill',rgb(accent,0.06),'-stroke','none','-draw','polygon 0,520 215,450 382,586 560,536 725,630 0,630',
    '-fill',rgb(accent,0.65),'-stroke','none','-draw','roundrectangle 76,82 120,88 3,3',
    '-font','DejaVu-Sans-Bold','-pointsize','19','-fill',pale,'-stroke','none','-annotate','+133+94',String(kicker).toUpperCase().slice(0,44),
    '-font','DejaVu-Sans-Bold','-pointsize','16','-fill',accent,'-annotate','+76+183',`${motif.toUpperCase()} · EDITORIAL ILLUSTRATION`,
    ...motifDraw(motif,accent,pale,variation),
    '-stroke',rgb('#ffffff',0.18),'-strokewidth','1','-draw','line 76,509 1124,509',
    '-font','DejaVu-Sans-Bold','-pointsize','43','-fill','#f8f4e9','-stroke','none',
  ];
  titleLines.forEach((line,index) => args.push('-annotate',`+76+${264+index*58}`,line));
  args.push('-font','DejaVu-Sans-Bold','-pointsize','18','-fill',rgb('#f8f4e9',0.88),'-annotate','+76+557','GNK ASG · AKTUAL MEDIA');
  args.push('-strip','-depth','8','-quality',String(quality),'-define','webp:method=6',`webp:${outputPath}`);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const result = spawnSync('convert',args,{encoding:'utf8',maxBuffer:4*1024*1024});
  if (result.error || result.status !== 0) {
    throw new Error(`ImageMagick WebP generation failed for ${outputPath}: ${result.error?.message || result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  return outputPath;
}
