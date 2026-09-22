const https = require('https');
const { URL } = require('url');

const REQUEST_TIMEOUT = 15_000;
const MAX_CODE_LENGTH = 20_000;
const MAX_MESSAGE_LENGTH = 1900;

function postJSON(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const payload = JSON.stringify(body);

    const request = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(parsed.error || `Snekbox returned HTTP ${res.statusCode}`));
          }
          resolve(parsed);
        } catch {
          reject(new Error('Snekbox returned an invalid response.'));
        }
      });
    });

    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy(new Error('Python execution timed out.'));
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function extractCode(message, args) {
  const raw = message.content.slice(message.content.indexOf(args[0] || ''));

  const fenced = raw.match(/^\s*```(?:python|py)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fenced) return fenced[1];

  const inline = raw.match(/^`([\s\S]*)`$/);
  if (inline) return inline[1];

  return raw.trim();
}

function formatOutput(result) {
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const returncode = result.returncode;

  let output = stdout || '(no output)';
  if (output.length > MAX_MESSAGE_LENGTH) {
    output = output.slice(0, MAX_MESSAGE_LENGTH) + '\n…output truncated';
  }

  const status = returncode === 0 ? '✅' : '❌';
  return `${status} Python result (exit code ${returncode ?? 'unknown'})\n\`\`\`text\n${output.replace(/```/g, '` ` `')}\n\`\`\``;
}

module.exports = {
  name: 'e',
  aliases: ['evalpython', 'py'],
  description: 'Execute Python code in an isolated Snekbox sandbox.',
  usage: '!e \`\`\`python\\nprint(2 + 3)\\n\`\`\`',
  async execute(message, args) {
    const ownerId = process.env.OWNER_ID;
    if (!ownerId || message.author.id !== ownerId) {
      return message.reply('❌ You are not authorized to use this command.');
    }

    const endpoint = process.env.SNEKBOX_URL;
    if (!endpoint) {
      return message.reply('❌ Python execution is not configured. Set the SNEKBOX_URL environment variable.');
    }

    const code = extractCode(message, args);
    if (!code) {
      return message.reply('Usage: `!e <Python code>` or send a Python code block.');
    }

    if (code.length > MAX_CODE_LENGTH) {
      return message.reply(`❌ Code is too long. Maximum: ${MAX_CODE_LENGTH} characters.`);
    }

    try {
      const result = await postJSON(endpoint, {
        args: ['main.py'],
        files: [{
          path: 'main.py',
          content: Buffer.from(code, 'utf8').toString('base64'),
        }],
      });

      return message.reply(formatOutput(result));
    } catch (error) {
      console.error('[PythonEval]', error);
      return message.reply(`❌ Python execution failed: ${error.message}`);
    }
  },
};
