// detail.js — Gọi và parse Detail API của mcp.directory
// Endpoint: GET https://mcp.directory/skills/{slug} với header rsc: 1

const slug = process.argv[2] || "svg-precision"; // slug mặc định

async function fetchSkillDetail(slug) {
  const url = `https://mcp.directory/skills/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "rsc": "1",
      "User-Agent": "Mozilla/5.0 (toolUI-detail-script)",
      "Accept": "*/*",
    },
  });

  console.log(`[detail] GET ${url}`);
  console.log(`[detail] status = ${res.status}`);
  console.log(`[detail] content-type = ${res.headers.get("content-type")}`);

  const text = await res.text();
  return text;
}

function parseDetailMarkdown(responseText) {
  // Response RSC chứa đoạn T<number>,---\n<markdown>\n---
  const match = responseText.match(/T\d+,---\n([\s\S]*?)---/);
  if (!match) return null;

  const block = match[1];
  const lines = block.split("\n");
  
  const name = lines.find((l) => l.startsWith("name:"))?.replace("name:", "").trim();
  const description = lines.find((l) => l.startsWith("description:"))?.replace("description:", "").trim();
  
  return { name, description, content: block };
}

(async () => {
  try {
    console.log(`[run] slug = ${slug}`);
    const body = await fetchSkillDetail(slug);
    console.log(`[detail] response length = ${body.length} bytes`);

    const parsed = parseDetailMarkdown(body);
    if (!parsed) {
      console.log("[parse] Không tìm thấy markdown block trong RSC payload.");
      console.log("[raw] Trích 500 ký tự đầu:");
      console.log(body.slice(0, 500));
      return;
    }

    console.log("\n=== Kết quả parse ===");
    console.log("name:", parsed.name);
    console.log("description:", parsed.description);
    console.log("\n--- Nội dung markdown ---");
    console.log(parsed.content);
  } catch (err) {
    console.error("[error]", err.message);
    process.exitCode = 1;
  }
})();
