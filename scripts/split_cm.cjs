/**
 * Split cm.js into individual cmGX.js files (one per group)
 * Run: node scripts/split_cm.cjs
 */
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "../src/data/cm.js"), "utf8");

// Find each top-level group key: "  N: ["
const groupRegex = /^  (\d+): \[/gm;
const matches = [];
let m;
while ((m = groupRegex.exec(src)) !== null) {
  matches.push({ group: parseInt(m[1]), start: m.index });
}

for (let i = 0; i < matches.length; i++) {
  const g = matches[i].group;
  const start = matches[i].start;
  const end = i + 1 < matches.length ? matches[i + 1].start : src.lastIndexOf("};");

  // Extract the array content between "N: [" and the closing "],"
  let chunk = src.slice(start, end).trimEnd();
  // Remove trailing comma
  if (chunk.endsWith(",")) chunk = chunk.slice(0, -1);

  // Extract just the array part (after "N: ")
  const arrayStart = chunk.indexOf("[");
  let arrayContent = chunk.slice(arrayStart).trimEnd();
  // Ensure it ends with ]
  if (!arrayContent.endsWith("]")) {
    // Find last ]
    const lastBracket = arrayContent.lastIndexOf("]");
    if (lastBracket > 0) arrayContent = arrayContent.slice(0, lastBracket + 1);
  }

  // Re-indent: remove 2 spaces from each line (they were indented inside the object)
  const lines = arrayContent.split("\n").map(line => {
    if (line.startsWith("    ")) return line.slice(2);
    if (line.startsWith("  ")) return line.slice(2);
    return line;
  });

  const fileContent = `// Clínica Médica — Grupo ${g} — Cronograma 2026.1\nexport const CM_G${g} = ${lines.join("\n")};\n`;

  const outPath = path.join(__dirname, `../src/data/cmG${g}.js`);
  fs.writeFileSync(outPath, fileContent, "utf8");

  // Count weeks
  const weekCount = (arrayContent.match(/\{num:/g) || []).length;
  console.log(`cmG${g}.js — ${weekCount} semanas, ${lines.length} linhas`);
}

console.log("\nDone! All CM group files created.");
