const e=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CF Archiver</title>
  <meta name="wtss:date" content="2025-01-16" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\/script>
</head>
<body class="bg-surface text-text flex flex-col items-center justify-start min-h-screen p-6">

  <!-- Input Panel -->
  <section id="input-panel" class="w-full max-w-2xl mx-auto flex flex-col justify-center space-y-4 py-8">
    <!-- Mode Selector -->
    <div class="w-full flex gap-2 p-1 bg-bg border border-text-muted/30 rounded">
      <button id="mode-csv" class="flex-1 px-4 py-2 text-sm rounded bg-accent/10 border border-accent/30 text-accent font-mono transition">
        csv export
      </button>
      <button id="mode-code" class="flex-1 px-4 py-2 text-sm rounded bg-transparent text-text-muted font-mono hover:text-text transition">
        code fetch
      </button>
    </div>

    <!-- CSV Mode Form -->
    <div id="csv-form" class="w-full space-y-3">
      <textarea
        id="usernames-input"
        rows="4"
        placeholder="usernames (comma or newline separated)"
        class="w-full px-3 py-2 bg-bg border border-text-muted/20 rounded text-sm text-text focus:outline-none focus:border-accent/40 resize-none font-mono"
      ></textarea>

      <div class="flex gap-2">
        <button id="btn-csv-fetch" class="px-4 py-2 text-sm rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition font-mono">
          export
        </button>
        <button id="btn-csv-clear" class="px-4 py-2 text-sm rounded bg-bg border border-text-muted/20 text-text-muted hover:text-text hover:border-text-muted/40 transition font-mono">
          clear
        </button>
      </div>

      <div id="csv-cache-indicator" class="text-xs text-text-muted font-mono"></div>
    </div>

    <!-- Code Mode Form -->
    <div id="code-form" class="hidden w-full space-y-3">
      <input
        id="code-username"
        type="text"
        placeholder="username"
        class="w-full px-3 py-2 bg-bg border border-text-muted/20 rounded text-sm text-text focus:outline-none focus:border-accent/40 font-mono"
      />
      <input
        id="code-apikey"
        type="text"
        placeholder="api key"
        class="w-full px-3 py-2 bg-bg border border-text-muted/20 rounded text-sm text-text focus:outline-none focus:border-accent/40 font-mono"
      />
      <input
        id="code-apisecret"
        type="password"
        placeholder="api secret"
        class="w-full px-3 py-2 bg-bg border border-text-muted/20 rounded text-sm text-text focus:outline-none focus:border-accent/40 font-mono"
      />

      <div class="text-xs text-text-muted font-mono">
        <a href="https://codeforces.com/settings/api" target="_blank" class="text-accent/70 hover:text-accent underline">generate api key</a>
        · credentials used locally only
      </div>

      <div class="flex gap-2">
        <button id="btn-code-fetch" class="px-4 py-2 text-sm rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition font-mono">
          fetch code
        </button>
        <button id="btn-code-clear" class="px-4 py-2 text-sm rounded bg-bg border border-text-muted/20 text-text-muted hover:text-text hover:border-text-muted/40 transition font-mono">
          clear
        </button>
      </div>

      <div id="code-cache-indicator" class="text-xs text-text-muted font-mono"></div>
    </div>
  </section>

  <!-- Progress Panel -->
  <section id="progress-panel" class="hidden w-full max-w-2xl mx-auto py-8 space-y-4">
    <div class="space-y-2">
      <div class="w-full bg-bg border border-text-muted/20 rounded h-2 overflow-hidden">
        <div id="progress-bar" class="h-full bg-accent transition-all duration-300" style="width: 0%"></div>
      </div>

      <div id="progress-text" class="text-xs text-text-muted font-mono"></div>

      <div id="error-log" class="mt-3 space-y-1 text-xs text-text-muted max-h-32 overflow-y-auto font-mono"></div>
    </div>
  </section>

  <!-- Results Panel -->
  <section id="results-panel" class="hidden w-full max-w-2xl mx-auto py-8 space-y-4">
    <div id="results-stats" class="grid grid-cols-3 gap-3 text-center font-mono text-sm">
      <div class="p-3 bg-bg border border-text-muted/20 rounded">
        <div id="stat-users" class="text-lg text-accent">0</div>
        <div class="text-xs text-text-muted mt-1">users</div>
      </div>
      <div class="p-3 bg-bg border border-text-muted/20 rounded">
        <div id="stat-problems" class="text-lg text-accent">0</div>
        <div class="text-xs text-text-muted mt-1">problems</div>
      </div>
      <div class="p-3 bg-bg border border-text-muted/20 rounded">
        <div id="stat-submissions" class="text-lg text-accent">0</div>
        <div class="text-xs text-text-muted mt-1">submissions</div>
      </div>
    </div>

    <div class="flex gap-2">
      <button id="btn-download" class="px-4 py-2 text-sm rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition font-mono">
        download
      </button>
      <button id="btn-restart" class="px-4 py-2 text-sm rounded bg-bg border border-text-muted/20 text-text-muted hover:text-text hover:border-text-muted/40 transition font-mono">
        restart
      </button>
    </div>
  </section>

<script>
(function () {
  const CSV_STORAGE_KEY = 'cf-archiver-users';
  const CODE_STORAGE_KEY = 'cf-archiver-code-username';
  const API_DELAY = 4000; // 4 seconds between requests
  const MAX_RETRIES = 2;

  // Language to extension mapping
  const LANG_TO_EXT = {
    'GNU C++': '.cpp', 'GNU C++11': '.cpp', 'GNU C++14': '.cpp', 'GNU C++17': '.cpp',
    'GNU C++20': '.cpp', 'GNU C++23': '.cpp',
    'Clang++17 Diagnostics': '.cpp', 'Clang++20 Diagnostics': '.cpp',
    'MS C++': '.cpp', 'MS C++ 2017': '.cpp',
    'Python 2': '.py', 'Python 3': '.py', 'PyPy 2': '.py', 'PyPy 3': '.py',
    'PyPy 3-64': '.py',
    'Java 8': '.java', 'Java 11': '.java', 'Java 17': '.java', 'Java 21': '.java',
    'C# 8': '.cs', 'C# 10': '.cs', 'C# Mono 6': '.cs',
    'Kotlin 1.4': '.kt', 'Kotlin 1.5': '.kt', 'Kotlin 1.6': '.kt', 'Kotlin 1.7': '.kt',
    'Go': '.go',
    'Rust 2021': '.rs',
    'JavaScript': '.js', 'Node.js': '.js',
    'D': '.d',
    'Haskell': '.hs',
    'OCaml': '.ml',
    'Scala': '.scala',
    'Ruby 3': '.rb',
    'PHP': '.php',
    'Perl': '.pl',
    'Delphi': '.pas', 'Free Pascal': '.pas',
    'Q#': '.qs',
  };

  // DOM elements
  const inputPanel = document.getElementById('input-panel');
  const progressPanel = document.getElementById('progress-panel');
  const resultsPanel = document.getElementById('results-panel');
  const modeCSVBtn = document.getElementById('mode-csv');
  const modeCodeBtn = document.getElementById('mode-code');
  const csvForm = document.getElementById('csv-form');
  const codeForm = document.getElementById('code-form');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const errorLog = document.getElementById('error-log');

  // Global state
  let currentMode = 'csv';
  let problemsMap = new Map();
  let totalSubmissions = 0;
  let processedUsers = 0;
  let zipData = null; // For code mode

  // Mode switching
  function switchMode(mode) {
    currentMode = mode;
    if (mode === 'csv') {
      csvForm.classList.remove('hidden');
      codeForm.classList.add('hidden');
      modeCSVBtn.className = 'flex-1 px-4 py-2 text-sm rounded bg-accent/10 border border-accent/30 text-accent font-mono transition';
      modeCodeBtn.className = 'flex-1 px-4 py-2 text-sm rounded bg-transparent text-text-muted font-mono hover:text-text transition';
    } else {
      csvForm.classList.add('hidden');
      codeForm.classList.remove('hidden');
      modeCSVBtn.className = 'flex-1 px-4 py-2 text-sm rounded bg-transparent text-text-muted font-mono hover:text-text transition';
      modeCodeBtn.className = 'flex-1 px-4 py-2 text-sm rounded bg-accent/10 border border-accent/30 text-accent font-mono transition';
    }
  }

  modeCSVBtn.addEventListener('click', () => switchMode('csv'));
  modeCodeBtn.addEventListener('click', () => switchMode('code'));

  // CSV Mode: Load/Save cache
  function loadCSVCache() {
    const cached = localStorage.getItem(CSV_STORAGE_KEY);
    if (cached) {
      document.getElementById('usernames-input').value = cached;
      document.getElementById('csv-cache-indicator').textContent = 'cached';
    }
  }

  function saveCSVCache(usernames) {
    localStorage.setItem(CSV_STORAGE_KEY, usernames);
  }

  document.getElementById('btn-csv-clear').addEventListener('click', () => {
    localStorage.removeItem(CSV_STORAGE_KEY);
    document.getElementById('usernames-input').value = '';
    document.getElementById('csv-cache-indicator').textContent = '';
  });

  // Code Mode: Load/Save cache
  function loadCodeCache() {
    const cached = localStorage.getItem(CODE_STORAGE_KEY);
    if (cached) {
      document.getElementById('code-username').value = cached;
      document.getElementById('code-cache-indicator').textContent = 'cached username';
    }
  }

  function saveCodeCache(username) {
    localStorage.setItem(CODE_STORAGE_KEY, username);
  }

  document.getElementById('btn-code-clear').addEventListener('click', () => {
    localStorage.removeItem(CODE_STORAGE_KEY);
    document.getElementById('code-username').value = '';
    document.getElementById('code-apikey').value = '';
    document.getElementById('code-apisecret').value = '';
    document.getElementById('code-cache-indicator').textContent = '';
  });

  // Utilities
  function parseUsernames(input) {
    return input.split(/[\\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
          return data.result;
        } else if (data.status === 'FAILED') {
          if (data.comment === 'Call limit exceeded' && attempt < retries) {
            await sleep(API_DELAY);
            continue;
          }
          throw new Error(data.comment || 'API request failed');
        }
      } catch (error) {
        if (attempt === retries) throw error;
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  function toISO8601(unixTimestamp) {
    return new Date(unixTimestamp * 1000).toISOString();
  }

  function getProblemId(submission) {
    const contestId = submission.problem.contestId || submission.contestId || 'unknown';
    const index = submission.problem.index;
    return \`\${contestId}\${index}\`;
  }

  function logError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = \`× \${message}\`;
    errorLog.appendChild(errorDiv);
  }

  function updateProgress(current, total, message) {
    const percentage = (current / total) * 100;
    progressBar.style.width = \`\${percentage}%\`;
    progressText.textContent = message;
  }

  // SHA-512 implementation using Web Crypto API
  async function sha512(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate API signature
  async function generateApiSig(methodName, params, secret) {
    const rand = Math.random().toString(36).substring(2, 8);
    const sortedParams = Object.keys(params).sort().map(key => \`\${key}=\${params[key]}\`).join('&');
    const toHash = \`\${rand}/\${methodName}?\${sortedParams}#\${secret}\`;
    const hash = await sha512(toHash);
    return rand + hash;
  }

  // Build authenticated API URL
  async function buildAuthUrl(methodName, params, apiKey, apiSecret) {
    const time = Math.floor(Date.now() / 1000);
    const allParams = { ...params, apiKey, time };
    const apiSig = await generateApiSig(methodName, allParams, apiSecret);
    const queryString = Object.keys(allParams).map(k => \`\${k}=\${encodeURIComponent(allParams[k])}\`).join('&');
    return \`https://codeforces.com/api/\${methodName}?\${queryString}&apiSig=\${apiSig}\`;
  }

  // CSV Mode: Process submissions
  function processSubmissions(submissions) {
    const acSubmissions = submissions.filter(s => s.verdict === 'OK');

    for (const sub of acSubmissions) {
      const problemId = getProblemId(sub);
      const submissionId = sub.id;
      const acTime = sub.creationTimeSeconds;
      const contestId = sub.problem.contestId || sub.contestId || 'unknown';

      if (!problemsMap.has(problemId)) {
        problemsMap.set(problemId, {
          id: problemId,
          contestId: contestId,
          name: sub.problem.name,
          rating: sub.problem.rating || 'N/A',
          tags: sub.problem.tags || [],
          earliestAcTime: acTime,
          submissionIds: new Set([submissionId])
        });
      } else {
        const existing = problemsMap.get(problemId);
        existing.submissionIds.add(submissionId);
        if (acTime < existing.earliestAcTime) {
          existing.earliestAcTime = acTime;
        }
      }
    }

    totalSubmissions += acSubmissions.length;
  }

  // CSV Mode: Main process
  async function processCSVMode() {
    const input = document.getElementById('usernames-input').value.trim();
    if (!input) {
      document.getElementById('csv-cache-indicator').textContent = 'enter usernames';
      return;
    }

    const usernames = parseUsernames(input);
    if (usernames.length === 0) {
      document.getElementById('csv-cache-indicator').textContent = 'no valid usernames';
      return;
    }

    saveCSVCache(input);
    problemsMap.clear();
    totalSubmissions = 0;
    processedUsers = 0;
    errorLog.innerHTML = '';

    inputPanel.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    progressPanel.classList.remove('hidden');

    for (let i = 0; i < usernames.length; i++) {
      const handle = usernames[i];
      updateProgress(i, usernames.length, \`fetching \${handle}...\`);

      try {
        const url = \`https://codeforces.com/api/user.status?handle=\${handle}&from=1&count=100000\`;
        const submissions = await fetchWithRetry(url);
        processSubmissions(submissions);
        processedUsers++;

        if (i < usernames.length - 1) await sleep(API_DELAY);
      } catch (error) {
        logError(\`\${handle}: \${error.message}\`);
      }
    }

    updateProgress(usernames.length, usernames.length, 'done');
    setTimeout(() => showResults(usernames.length, 'csv'), 500);
  }

  // Code Mode: Main process
  async function processCodeMode() {
    const username = document.getElementById('code-username').value.trim();
    const apiKey = document.getElementById('code-apikey').value.trim();
    const apiSecret = document.getElementById('code-apisecret').value.trim();

    if (!username || !apiKey || !apiSecret) {
      document.getElementById('code-cache-indicator').textContent = 'all fields required';
      return;
    }

    saveCodeCache(username);
    errorLog.innerHTML = '';

    inputPanel.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    progressPanel.classList.remove('hidden');

    try {
      updateProgress(0, 3, 'fetching submissions...');

      // Fetch submissions with source code
      const url = await buildAuthUrl('user.status', {
        handle: username,
        from: 1,
        count: 100000,
        includeSources: true
      }, apiKey, apiSecret);

      const submissions = await fetchWithRetry(url);
      const acSubmissions = submissions.filter(s => s.verdict === 'OK' && s.sourceBase64);

      updateProgress(1, 3, \`creating zip (\${acSubmissions.length} files)...\`);

      // Create ZIP
      const zip = new JSZip();
      const cfFolder = zip.folder('cf');

      for (const sub of acSubmissions) {
        const contestId = sub.problem.contestId || sub.contestId || 'unknown';
        const problemId = getProblemId(sub);
        const submissionId = sub.id;
        const lang = sub.programmingLanguage;
        const ext = LANG_TO_EXT[lang] || '.cpp';

        // Decode base64 source code
        let sourceCode;
        try {
          const decoded = atob(sub.sourceBase64);
          sourceCode = decodeURIComponent(escape(decoded)); // Handle UTF-8
        } catch (e) {
          // Fallback if UTF-8 decoding fails
          sourceCode = atob(sub.sourceBase64);
        }

        const contestFolder = cfFolder.folder(contestId.toString());
        const filename = \`\${problemId}_\${submissionId}\${ext}\`;
        contestFolder.file(filename, sourceCode);
      }

      updateProgress(2, 3, 'generating archive...');

      zipData = await zip.generateAsync({ type: 'blob' });
      totalSubmissions = acSubmissions.length;

      updateProgress(3, 3, 'done');
      setTimeout(() => showResults(1, 'code'), 500);

      // Clear sensitive data
      document.getElementById('code-apikey').value = '';
      document.getElementById('code-apisecret').value = '';

    } catch (error) {
      logError(\`failed: \${error.message}\`);
      setTimeout(() => {
        progressPanel.classList.add('hidden');
        inputPanel.classList.remove('hidden');
      }, 2000);
    }
  }

  // Show results
  function showResults(userCount, mode) {
    progressPanel.classList.add('hidden');
    resultsPanel.classList.remove('hidden');

    document.getElementById('stat-users').textContent = userCount;

    if (mode === 'csv') {
      document.getElementById('stat-problems').textContent = problemsMap.size;
      document.getElementById('stat-submissions').textContent = totalSubmissions;
      document.getElementById('btn-download').textContent = 'download csv';
    } else {
      document.getElementById('stat-problems').textContent = '—';
      document.getElementById('stat-submissions').textContent = totalSubmissions;
      document.getElementById('btn-download').textContent = 'download zip';
    }
  }

  // Generate CSV
  function generateCSV() {
    const headers = ['id', 'contestid', 'problem_name', 'earliest_ac_time', 'rating', 'tags', 'submission_ids', 'links'];
    const rows = [headers];

    const sortedProblems = Array.from(problemsMap.values()).sort((a, b) => {
      const aMatch = a.id.match(/^(\\d+)/);
      const bMatch = b.id.match(/^(\\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1]) : 0;
      const bNum = bMatch ? parseInt(bMatch[1]) : 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.id.localeCompare(b.id);
    });

    for (const problem of sortedProblems) {
      const submissionIds = Array.from(problem.submissionIds).sort((a, b) => b - a);
      const links = submissionIds.map(subId =>
        \`https://codeforces.com/contest/\${problem.contestId}/submission/\${subId}\`
      );

      const row = [
        problem.id,
        problem.contestId,
        \`"\${problem.name.replace(/"/g, '""')}"\`,
        toISO8601(problem.earliestAcTime),
        problem.rating,
        \`"\${problem.tags.join('; ')}"\`,
        \`"\${submissionIds.join('; ')}"\`,
        \`"\${links.join('; ')}"\`
      ];
      rows.push(row);
    }

    return rows.map(row => row.join(',')).join('\\n');
  }

  // Download handlers
  function downloadCSV() {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`cf-archive-\${new Date().toISOString().split('T')[0]}.csv\`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadZip() {
    if (!zipData) return;
    const url = URL.createObjectURL(zipData);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`cf-code-archive-\${new Date().toISOString().split('T')[0]}.zip\`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Event listeners
  document.getElementById('btn-csv-fetch').addEventListener('click', processCSVMode);
  document.getElementById('btn-code-fetch').addEventListener('click', processCodeMode);
  document.getElementById('btn-download').addEventListener('click', () => {
    if (currentMode === 'csv') downloadCSV();
    else downloadZip();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    resultsPanel.classList.add('hidden');
    inputPanel.classList.remove('hidden');
  });

  // Initialize
  loadCSVCache();
  loadCodeCache();
})();
<\/script>
</body>
</html>
`;export{e as default};
