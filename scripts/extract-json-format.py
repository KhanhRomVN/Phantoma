base = 'src/renderer/src/components/RightPanel/Zen/feature/Chat/services/'
p = base + 'ResponseParser.ts'
s = open(p, encoding='utf-8').read()
a0 = s.index('/**\n * Parse a raw inner-content string')
a1 = s.index('// ─── Types ─')
b0 = s.index('/**\n * JSON format parser:')
b1 = s.index('export const parseAIResponse = (')
assert a0 < a1 < b0 < b1
block_a = s[a0:a1]
block_b = s[b0:b1]
header = open('scripts/json-format-header.txt', encoding='utf-8').read()
footer = open('scripts/json-format-footer.txt', encoding='utf-8').read()
open(base + 'tool-formats/json.ts', 'w', encoding='utf-8').write(header + block_a + block_b + footer)
open(p, 'w', encoding='utf-8').write(s[:a0] + s[a1:b0] + s[b1:])
print('blockA lines', block_a.count('\n'), 'blockB lines', block_b.count('\n'))