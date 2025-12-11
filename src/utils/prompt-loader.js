import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = 'prompts';

export function loadPrompt(promptName) {
  const extensions = ['.md', '.txt', '.prompt'];
  
  for (const ext of extensions) {
    const filePath = path.join(PROMPTS_DIR, promptName + ext);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  }
  
  const exactPath = path.join(PROMPTS_DIR, promptName);
  if (fs.existsSync(exactPath)) {
    return fs.readFileSync(exactPath, 'utf-8');
  }
  
  throw new Error(`Prompt not found: ${promptName} (looked in ${PROMPTS_DIR}/)`);
}

export function substituteVariables(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, String(value));
    
    const singleBracePattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(singleBracePattern, String(value));
  }
  
  return result;
}

export function renderPrompt(promptName, variables = {}) {
  const template = loadPrompt(promptName);
  return substituteVariables(template, variables);
}

export function listAvailablePrompts() {
  if (!fs.existsSync(PROMPTS_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(PROMPTS_DIR);
  return files
    .filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.prompt'))
    .map(f => path.basename(f, path.extname(f)));
}
