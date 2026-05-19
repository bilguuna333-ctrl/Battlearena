import fs from 'fs';
import path from 'path';

const src = "C:\\Users\\User\\.gemini\\antigravity\\brain\\5f5d28de-f263-42ef-9457-71c777ab4b56\\shadow_lord_boss_1779200488886.png";
const dest = "c:\\Users\\User\\Desktop\\battle arena\\Ranked-Arena\\frontend\\public\\shadow_lord_boss.png";

try {
  fs.copyFileSync(src, dest);
  console.log("Image copied successfully!");
} catch (err) {
  console.error("Failed to copy image:", err);
}
