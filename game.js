'use strict';
/* JavaType: Code Rush - browser port of the Java Swing game.
   Model classes (Difficulty, CodeChallenge, ChallengeSelector, Player, Leaderboard,
   BattleLeaderboard, GameStatistics, TypingEngine, CodeRunner) are kept as in the Java version.
   LAN sockets are replaced by WebRTC (PeerJS) so multiplayer works from a static host like Vercel. */

// =====================================================================
// Helpers
// =====================================================================
const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number(n).toFixed(d);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nowMs = () => performance.now();
const MONO = "'JetBrains Mono','Roboto Mono','Cascadia Mono',Consolas,Menlo,'DejaVu Sans Mono',monospace";
const SANS = "'Inter','Segoe UI',system-ui,sans-serif";
const C = {
  NEON: '#3ccf6a', NEON_SOFT: '#7fd89a', TEXT: '#e6f2e9', MUTED: '#93b3a2',
  PURPLE: '#8a5cd0', PINK: '#ff5c8a', UNTYPED: '#5a666e', BG: '#0a0716',
};
const dd = (s) => s.replace(/^\n/, '').replace(/\s+$/, '');   // stripTrailing for snippets
const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a / 255})`;
};
function mixColor(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
  else ctx.rect(x, y, w, h);
}
function fitCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (w === 0 || h === 0) return null;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// =====================================================================
// Game model
// =====================================================================
const Difficulty = {
  BEGINNER: { key: 'BEGINNER', name: 'Beginner', seconds: 60, mult: 1.0, npcWpm: 45, topics: 'variables, if-else, loops, methods' },
  INTERMEDIATE: { key: 'INTERMEDIATE', name: 'Intermediate', seconds: 90, mult: 2.0, npcWpm: 70, topics: 'arrays, classes, overloading' },
  ADVANCED: { key: 'ADVANCED', name: 'Advanced', seconds: 120, mult: 3.0, npcWpm: 100, topics: 'OOP, exceptions, generics' },
};
const DIFFS = [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.ADVANCED];
const diffByOrdinal = (i) => DIFFS[i];

const SNIPPETS = {
  BEGINNER: [
    ['Variables', dd(`
int age = 20;
double price = 19.99;
char grade = 'A';
boolean passed = true;
String name = "Alex";
`)],
    ['Add Method', dd(`
public int add(int a, int b) {
    return a + b;
}
`)],
    ['If-Else', dd(`
int score = 85;
if (score >= 75) {
    System.out.println("Passed");
} else {
    System.out.println("Failed");
}
`)],
    ['For Loop', dd(`
for (int i = 1; i <= 5; i++) {
    System.out.println("Count: " + i);
}
`)],
    ['Arithmetic', dd(`
int a = 17;
int b = 5;
int sum = a + b;
int remainder = a % b;
double average = (a + b) / 2.0;
`)],
    ['Is Even', dd(`
public boolean isEven(int number) {
    return number % 2 == 0;
}
`)],
    ['While Loop', dd(`
int total = 0;
int n = 1;
while (n <= 10) {
    total += n;
    n++;
}
`)],
  ],
  INTERMEDIATE: [
    ['Array Sum', dd(`
int[] numbers = {4, 8, 15, 16, 23, 42};
int sum = 0;
for (int number : numbers) {
    sum += number;
}
`)],
    ['Nested Loops', dd(`
for (int row = 1; row <= 3; row++) {
    for (int col = 1; col <= 3; col++) {
        System.out.print(row * col + " ");
    }
    System.out.println();
}
`)],
    ['Method Overloading', dd(`
public int multiply(int a, int b) {
    return a * b;
}

public double multiply(double a, double b) {
    return a * b;
}
`)],
    ['Student Class', dd(`
public class Student {
    private String name;

    public Student(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
`)],
    ['Reverse String', dd(`
public String reverse(String text) {
    String result = "";
    for (int i = text.length() - 1; i >= 0; i--) {
        result += text.charAt(i);
    }
    return result;
}
`)],
    ['Find Maximum', dd(`
public int findMax(int[] values) {
    int max = values[0];
    for (int i = 1; i < values.length; i++) {
        if (values[i] > max) {
            max = values[i];
        }
    }
    return max;
}
`)],
  ],
  ADVANCED: [
    ['Abstract Class', dd(`
public abstract class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public abstract String makeSound();
}
`)],
    ['Interface', dd(`
public interface Drawable {
    void draw();
}

public class Circle implements Drawable {
    @Override
    public void draw() {
        System.out.println("Drawing a circle");
    }
}
`)],
    ['Method Overriding', dd(`
public class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }

    @Override
    public String makeSound() {
        return name + " says Woof!";
    }
}
`)],
    ['Polymorphism', dd(`
List<Animal> animals = new ArrayList<>();
animals.add(new Dog("Rex"));
animals.add(new Cat("Mimi"));
for (Animal animal : animals) {
    System.out.println(animal.makeSound());
}
`)],
    ['Exception Handling', dd(`
public int divide(int a, int b) {
    try {
        return a / b;
    } catch (ArithmeticException e) {
        System.out.println("Cannot divide by zero");
        return 0;
    } finally {
        System.out.println("Division finished");
    }
}
`)],
    ['Map and Generics', dd(`
Map<String, Integer> scores = new HashMap<>();
scores.put("Alex", 95);
scores.put("Mia", 88);
for (Map.Entry<String, Integer> e : scores.entrySet()) {
    System.out.println(e.getKey() + ": " + e.getValue());
}
`)],
    ['Encapsulation', dd(`
public class BankAccount {
    private double balance;

    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    public double getBalance() {
        return balance;
    }
}
`)],
  ],
};

const CHALLENGE_INFO = {
  BEGINNER: {
    description: 'Basic syntax: variables, operators, if-else, loops and simple methods.',
    tip: 'Short and simple. Watch the semicolons and the quotation marks.',
  },
  INTERMEDIATE: {
    description: 'Arrays, strings, nested loops, overloading, constructors and classes.',
    tip: 'Mind the indentation (4 spaces per level) and any blank lines.',
  },
  ADVANCED: {
    description: 'OOP and more: abstract classes, interfaces, overriding, polymorphism, exceptions, generics.',
    tip: 'Long snippet. Angle brackets, @Override and generics are easy to get wrong.',
  },
};

// ---- English words mode (Battle Mode): same text on both machines comes from a shared seed ----
const ENGLISH_WORDS = {
  BEGINNER: 'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us'.split(' '),
  INTERMEDIATE: 'about above across after again against almost along always another around because before behind below between both change children close country different during early enough every example family father feel few follow found friend great group happen heard house important keep large later learn leave life light little long might money mother mountain never night number often only open paper place point question right river school second seem sentence should small sound still story study sure thought through together under until water while white whole world write young'.split(' '),
  ADVANCED: 'absolutely achievement adventure afternoon algorithm atmosphere beautiful boundary calculate challenge character community complicated concentrate consequence considerable development difference discovery education electricity environment especially experience extraordinary foundation government imagination immediately incredible independent information instrument interesting knowledge laboratory literature management mysterious necessary opportunity organization particular performance philosophy population possibility potential practical previous production profession programming reasonable relationship responsible restaurant revolution scientific separate significant situation structure successful technology temperature throughout transportation understand university vocabulary wonderful'.split(' '),
};
const ENGLISH_COUNTS = { BEGINNER: 10, INTERMEDIATE: 20, ADVANCED: 40 };
// NPC typing speed (words per minute) in English battles. EDIT THESE to change the English NPC speed.
const ENGLISH_NPC_WPM = { BEGINNER: 45, INTERMEDIATE: 75, ADVANCED: 130 };
function mulberry32(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function englishText(seed, difficulty) {
  const rnd = mulberry32(seed >>> 0), list = ENGLISH_WORDS[difficulty.key], out = [];
  while (out.length < ENGLISH_COUNTS[difficulty.key]) {
    const w = list[Math.floor(rnd() * list.length)];
    if (out[out.length - 1] !== w) out.push(w);
  }
  return out.join(' ');
}
class EnglishChallenge {
  constructor(difficulty, seed) { this.difficulty = difficulty; this.text = englishText(seed, difficulty); }
  getDifficultyName() { return this.difficulty.name; }
  getTitle() { return 'English words'; }
  getCodeSnippet() { return this.text; }
}

/* Same snippet lists on both machines <=> same fingerprint (used by the multiplayer version check). */
const SNIPPET_FINGERPRINT = (() => {
  let h = 0;
  const s = JSON.stringify([SNIPPETS, ENGLISH_WORDS, ENGLISH_COUNTS]);
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
})();

class CodeChallenge {
  constructor(difficulty, index) {
    const list = SNIPPETS[difficulty.key];
    if (index < 0 || index >= list.length) throw new Error('No snippet with index ' + index);
    this.difficulty = difficulty;
    this.title = list[index][0];
    this.codeSnippet = list[index][1];
  }
  getDifficultyName() { return this.difficulty.name; }
  getChallengeDescription() { return CHALLENGE_INFO[this.difficulty.key].description; }
  getScoreMultiplier() { return this.difficulty.mult; }
  getTypingTip() { return CHALLENGE_INFO[this.difficulty.key].tip; }
  getTitle() { return this.title; }
  getCodeSnippet() { return this.codeSnippet; }
  calculateScore(wpm, accuracy, exactMatch) {
    const base = GameStatistics.calculateBaseScore(wpm, accuracy, exactMatch);
    return Math.max(0, Math.round(base * this.getScoreMultiplier()));
  }
}
// kept for parity with the Java class names
class BeginnerChallenge extends CodeChallenge { constructor(i) { super(Difficulty.BEGINNER, i); } }
class IntermediateChallenge extends CodeChallenge { constructor(i) { super(Difficulty.INTERMEDIATE, i); } }
class AdvancedChallenge extends CodeChallenge { constructor(i) { super(Difficulty.ADVANCED, i); } }

/** Deals snippets like a shuffled deck: every snippet is used once before any repeats. */
class ChallengeSelector {
  constructor() { this.decks = {}; }
  next(difficulty) { return this.create(difficulty, this.nextIndex(difficulty)); }
  nextIndex(difficulty) {
    let deck = this.decks[difficulty.key];
    if (!deck || deck.length === 0) {
      deck = [...Array(SNIPPETS[difficulty.key].length).keys()];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      this.decks[difficulty.key] = deck;
    }
    return deck.pop();
  }
  create(difficulty, index) {
    switch (difficulty.key) {
      case 'BEGINNER': return new BeginnerChallenge(index);
      case 'INTERMEDIATE': return new IntermediateChallenge(index);
      default: return new AdvancedChallenge(index);
    }
  }
}

class Player {
  static MAX_NAME_LENGTH = 20;
  #name = ''; #totalScore = 0; #roundsPlayed = 0;
  constructor(name) { this.setName(name); }
  getName() { return this.#name; }
  getTotalScore() { return this.#totalScore; }
  getRoundsPlayed() { return this.#roundsPlayed; }
  setName(newName) {
    if (newName == null || String(newName).trim() === '') throw new Error('Name cannot be blank.');
    const cleaned = String(newName).trim();
    if (cleaned.length > Player.MAX_NAME_LENGTH) throw new Error('Name must be at most ' + Player.MAX_NAME_LENGTH + ' characters.');
    this.#name = cleaned;
  }
  recordRound(points) {
    if (points < 0) throw new Error('Points cannot be negative.');
    this.#totalScore += points;
    this.#roundsPlayed++;
  }
}

function loadJson(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function saveJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage unavailable: game keeps working */ } }

/** Per-difficulty leaderboard saved in localStorage (this browser only). */
class Leaderboard {
  constructor() { this.key = 'javatype.leaderboard'; this.rows = loadJson(this.key); }
  record(name, difficulty, points, wpm) {
    const clean = name.trim().replace(/\t/g, ' ');
    const pts = Math.max(0, points);
    const r = this.rows.find((x) => x.difficulty === difficulty.key && x.name.toLowerCase() === clean.toLowerCase());
    if (r) { r.totalScore += pts; r.rounds += 1; r.bestWpm = Math.max(r.bestWpm, wpm); }
    else this.rows.push({ name: clean, difficulty: difficulty.key, totalScore: pts, rounds: 1, bestWpm: wpm });
    saveJson(this.key, this.rows);
  }
  /** difficulty = null for the overall ranking */
  getRanking(difficulty) {
    const merged = new Map();
    for (const r of this.rows) {
      if (difficulty && r.difficulty !== difficulty.key) continue;
      const k = r.name.toLowerCase();
      const old = merged.get(k);
      if (!old) merged.set(k, { name: r.name, totalScore: r.totalScore, rounds: r.rounds, bestWpm: r.bestWpm });
      else merged.set(k, { name: old.name, totalScore: old.totalScore + r.totalScore, rounds: old.rounds + r.rounds, bestWpm: Math.max(old.bestWpm, r.bestWpm) });
    }
    return [...merged.values()].sort((a, b) => b.totalScore - a.totalScore || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }
}

/** Battle Mode results: wins, accuracy and WPM, ranked by wins. */
class BattleLeaderboard {
  constructor() { this.key = 'javatype.battleLeaderboard'; this.rows = loadJson(this.key); }
  record(name, won, correctKeys, totalKeys, correctChars, seconds) {
    const clean = name.trim().replace(/\t/g, ' ');
    const ck = Math.max(0, correctKeys), tk = Math.max(ck, totalKeys);
    const cc = Math.max(0, correctChars), sec = Math.max(0, seconds), win = won ? 1 : 0;
    const r = this.rows.find((x) => x.name.toLowerCase() === clean.toLowerCase());
    if (r) { r.battles++; r.wins += win; r.correctKeys += ck; r.totalKeys += tk; r.correctChars += cc; r.seconds += sec; }
    else this.rows.push({ name: clean, battles: 1, wins: win, correctKeys: ck, totalKeys: tk, correctChars: cc, seconds: sec });
    saveJson(this.key, this.rows);
  }
  getRanking() {
    return this.rows.map((r) => ({
      name: r.name, wins: r.wins, battles: r.battles,
      accuracy: r.totalKeys === 0 ? 0 : (100 * r.correctKeys) / r.totalKeys,
      wpm: r.seconds <= 0 ? 0 : r.correctChars / GameStatistics.CHARS_PER_WORD / (r.seconds / 60),
    })).sort((a, b) => b.wins - a.wins || b.accuracy - a.accuracy || b.wpm - a.wpm || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }
}

class GameStatistics {
  static CHARS_PER_WORD = 5.0;
  static MAX_SCORING_WPM = 300.0;
  static EXACT_MATCH_BONUS = 100.0;
  constructor() { this.results = []; }
  static msToSeconds(ms) { return Math.max(0, ms) / 1000; }
  static calculateWpm(chars, seconds) {
    if (chars <= 0 || seconds <= 0) return 0;
    return (chars / GameStatistics.CHARS_PER_WORD) / (seconds / 60);
  }
  static calculateAccuracy(errors, targetLength, typedLength) {
    const longest = Math.max(targetLength, typedLength);
    if (longest <= 0) return 0;
    return Math.max(0, Math.min(100, (1 - errors / longest) * 100));
  }
  static calculateBaseScore(wpm, accuracy, exact) {
    const capped = Math.max(0, Math.min(wpm, GameStatistics.MAX_SCORING_WPM));
    const acc = Math.max(0, Math.min(accuracy, 100)) / 100;
    return capped * acc * acc * 10 + (exact ? GameStatistics.EXACT_MATCH_BONUS : 0);
  }
  addResult(r) { if (!r) throw new Error('Result must not be null.'); this.results.push(r); }
  getResults() { return this.results; }
  getRoundsPlayed() { return this.results.length; }
  getTotalScore() { return this.results.reduce((s, r) => s + r.score, 0); }
  getTotalErrors() { return this.results.reduce((s, r) => s + r.errors, 0); }
  getAverageWpm() { return this.results.length ? this.results.reduce((s, r) => s + r.wpm, 0) / this.results.length : 0; }
  getAverageAccuracy() { return this.results.length ? this.results.reduce((s, r) => s + r.accuracy, 0) / this.results.length : 0; }
  getBestWpm() { return this.results.reduce((m, r) => Math.max(m, r.wpm), 0); }
  getTotalTimeSeconds() { return this.results.reduce((s, r) => s + r.elapsedSeconds, 0); }
  getPerfectRounds() { return this.results.filter((r) => r.exactMatch && r.accuracy >= 100).length; }
}

function getRating(r) {
  if (r.exactMatch && r.accuracy >= 100) return 'PERFECT! Exact match!';
  if (r.accuracy >= 95) return 'EXCELLENT!';
  if (r.accuracy >= 85) return 'GOOD JOB!';
  if (r.accuracy >= 60) return 'KEEP PRACTICING!';
  return 'TRY AGAIN!';
}

const TypingEngine = {
  /** correctedMistakes = wrong letters typed and then deleted; they still count as errors. */
  evaluate(challenge, typed, elapsedMs, correctedMistakes) {
    const target = challenge.getCodeSnippet();
    const submitted = (typed == null ? '' : typed).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const errors = this.countCharacterErrors(target, submitted) + Math.max(0, correctedMistakes);
    const accuracy = GameStatistics.calculateAccuracy(errors, target.length, submitted.length);
    const seconds = GameStatistics.msToSeconds(elapsedMs);
    const wpm = GameStatistics.calculateWpm(submitted.length, seconds);
    const exact = target === submitted;
    const score = challenge.calculateScore(wpm, accuracy, exact && correctedMistakes === 0);
    return {
      difficultyName: challenge.getDifficultyName(), challengeTitle: challenge.getTitle(),
      targetLength: target.length, typedLength: submitted.length, errors, accuracy,
      elapsedSeconds: seconds, wpm, exactMatch: exact,
      firstDifferentLine: this.findFirstDifferentLine(target, submitted), score,
    };
  },
  /** Levenshtein edit distance */
  countCharacterErrors(target, typed) {
    const n = target.length, m = typed.length;
    let prev = new Array(m + 1), cur = new Array(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      for (let j = 1; j <= m; j++) {
        const cost = target[i - 1] === typed[j - 1] ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      [prev, cur] = [cur, prev];
    }
    return prev[m];
  },
  findFirstDifferentLine(target, typed) {
    const a = target.split('\n'), b = typed.split('\n');
    const common = Math.min(a.length, b.length);
    for (let i = 0; i < common; i++) if (a[i] !== b[i]) return i + 1;
    return a.length === b.length ? 0 : common + 1;
  },
};

// =====================================================================
// CodeRunner - browsers cannot run javac, so the wrapped program is sent to a code-execution API.
// Change RUNNER below if you host your own runner (see README / chat instructions).
// =====================================================================
const CodeRunner = {
  RUNNER: { url: 'https://emkc.org/api/v2/piston/execute', language: 'java', version: '*' },
  TIMEOUT_MS: 15000,
  ANIMALS: 'abstract class Animal {\n    protected String name;\n    public Animal(String name) { this.name = name; }\n    public abstract String makeSound();\n}\n',
  HARNESSES: null,
  init() {
    const H = {};
    const put = (t, kind, support, demo) => { H[t] = { kind, support, demo }; };
    put('Variables', 'main', '', 'System.out.println(age + " " + price + " " + grade + " " + passed + " " + name);');
    put('Add Method', 'members', '', 'System.out.println("add(2, 3) = " + new Main().add(2, 3));');
    put('If-Else', 'main', '', '');
    put('For Loop', 'main', '', '');
    put('Arithmetic', 'main', '', 'System.out.println("sum = " + sum);\nSystem.out.println("remainder = " + remainder);\nSystem.out.println("average = " + average);');
    put('Is Even', 'members', '', 'System.out.println("isEven(4) = " + new Main().isEven(4));\nSystem.out.println("isEven(7) = " + new Main().isEven(7));');
    put('While Loop', 'main', '', 'System.out.println("total = " + total);');
    put('Array Sum', 'main', '', 'System.out.println("sum = " + sum);');
    put('Nested Loops', 'main', '', '');
    put('Method Overloading', 'members', '', 'Main m = new Main();\nSystem.out.println(m.multiply(3, 4));\nSystem.out.println(m.multiply(2.5, 2.0));');
    put('Student Class', 'types', '', 'Student s = new Student("Alex");\nSystem.out.println(s.getName());\ns.setName("Mia");\nSystem.out.println(s.getName());');
    put('Reverse String', 'members', '', 'System.out.println(new Main().reverse("hello"));');
    put('Find Maximum', 'members', '', 'System.out.println("max = " + new Main().findMax(new int[] {3, 9, 2, 7}));');
    put('Abstract Class', 'types', '', 'Animal a = new Animal("Tom") {\n    public String makeSound() { return name + " makes a sound"; }\n};\nSystem.out.println(a.makeSound());');
    put('Interface', 'types', '', 'Drawable d = new Circle();\nd.draw();');
    put('Method Overriding', 'types', this.ANIMALS, 'Animal a = new Dog("Rex");\nSystem.out.println(a.makeSound());');
    put('Polymorphism', 'main',
      this.ANIMALS +
      'class Dog extends Animal {\n    public Dog(String name) { super(name); }\n    public String makeSound() { return name + " says Woof!"; }\n}\n' +
      'class Cat extends Animal {\n    public Cat(String name) { super(name); }\n    public String makeSound() { return name + " says Meow!"; }\n}\n', '');
    put('Exception Handling', 'members', '', 'Main m = new Main();\nSystem.out.println(m.divide(10, 2));\nSystem.out.println(m.divide(5, 0));');
    put('Map and Generics', 'main', '', '');
    put('Encapsulation', 'types', '', 'BankAccount acc = new BankAccount();\nacc.deposit(100);\nacc.deposit(-5);\nSystem.out.println("Balance: " + acc.getBalance());');
    this.HARNESSES = H;
  },
  buildSource(title, code) {
    const h = this.HARNESSES[title] || { kind: 'main', support: '', demo: '' };
    let s = 'import java.util.*;\n\n' + h.support + '\n';
    if (h.kind === 'types') s += code.replace(/^public /gm, '') + '\n\n';
    s += 'public class Main {\n';
    if (h.kind === 'members') s += code + '\n';
    s += '    public static void main(String[] args) throws Exception {\n';
    if (h.kind === 'main') s += code + '\n';
    s += h.demo + '\n    }\n}\n';
    return s;
  },
  async run(title, code) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.TIMEOUT_MS);
    try {
      const res = await fetch(this.RUNNER.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({
          language: this.RUNNER.language, version: this.RUNNER.version,
          files: [{ name: 'Main.java', content: this.buildSource(title, code) }],
          run_timeout: 10000, compile_timeout: 10000,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return 'Could not run the code: the runner answered HTTP ' + res.status + '. ' + t.slice(0, 200);
      }
      const j = await res.json();
      if (j.compile && j.compile.code !== 0 && j.compile.code != null) {
        const cleaned = (j.compile.output || j.compile.stderr || '').replace(/Main\.java:\d+: /g, '');
        return 'COMPILE ERROR - the code did not compile:\n\n' + cleaned.trim();
      }
      const run = j.run || {};
      const out = (run.output != null ? run.output : (run.stdout || '') + (run.stderr || '')).replace(/\s+$/, '');
      if (run.signal === 'SIGKILL' && !out) return '[Stopped: the program ran for more than 10 seconds]';
      if (run.code !== 0 && run.code != null) return out + '\n\n[Program ended with an error, exit code ' + run.code + ']';
      return out === '' ? '(the program printed nothing)' : out;
    } catch (e) {
      return 'Could not run the code: ' + (e.name === 'AbortError' ? 'the runner took too long.' : e.message);
    } finally { clearTimeout(timer); }
  },
};
CodeRunner.init();

// =====================================================================
// Typing surface (canvas)
// =====================================================================
class TypingPanel {
  constructor(canvas) {
    this.cv = canvas;
    this.target = ''; this.typed = ''; this.jumpStart = []; this.active = false;
    this.lastType = nowMs(); this.animUntil = 0;
    this.caretX = 0; this.caretY = 0; this.caretInit = false; this.caretMoving = false; this.lastBlink = true;
    this.onChange = () => {}; this.corrected = 0; this.dirty = true; this.softWrap = false;
    canvas.addEventListener('keydown', (e) => this.onKey(e));
    canvas.addEventListener('mousedown', () => canvas.focus());
    canvas.addEventListener('focus', () => { this.dirty = true; });
    canvas.addEventListener('blur', () => { this.dirty = true; });
    new ResizeObserver(() => { this.dirty = true; }).observe(canvas);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.dirty = true; });
    const loop = () => { this.tick(); requestAnimationFrame(loop); };
    loop();
  }
  setOnChange(fn) { this.onChange = fn; }
  getTyped() { return this.typed; }
  getCorrectedMistakes() { return this.corrected; }
  setActive(on) { this.active = on; this.dirty = true; }
  focus() { this.cv.focus(); }
  setTarget(text) {
    this.target = text || ''; this.typed = ''; this.corrected = 0;
    this.jumpStart = new Array(this.target.length).fill(0);
    this.caretInit = false; this.lastType = nowMs(); this.animUntil = 0; this.dirty = true;
  }
  onKey(e) {
    if (e.metaKey || ((e.ctrlKey || e.altKey) && !e.getModifierState('AltGraph'))) return;
    let ch = null;
    if (e.key === 'Backspace') ch = '\b';
    else if (e.key === 'Enter') ch = '\n';
    else if (e.key === 'Tab') ch = '\t';
    else if (e.key.length === 1) ch = e.key;
    if (ch === null) return;
    e.preventDefault();
    this.handleKey(ch);
  }
  handleKey(c) {
    if (!this.active || !this.target) return;
    const now = nowMs();
    let changed = false;
    if (c === '\b') {
      if (this.typed.length > 0) {
        const last = this.typed.length - 1;
        if (this.typed[last] !== this.target[last]) this.corrected++;   // wrong letter typed, then deleted
        this.typed = this.typed.slice(0, last);
        this.jumpStart[last] = 0;
        changed = true;
      }
    } else {
      if (this.softWrap && (c === '\n' || c === '\t')) return;   // English text has no line breaks or tabs
      const add = c === '\n' ? '\n' : c === '\t' ? '    ' : c;
      for (let i = 0; i < add.length && this.typed.length < this.target.length; i++) {
        this.jumpStart[this.typed.length] = now;
        this.typed += add[i];
        changed = true;
      }
    }
    if (changed) {
      this.lastType = now; this.animUntil = now + 140; this.dirty = true;
      this.onChange();
    }
  }
  blinkOn(now) { const idle = now - this.lastType; return idle < 500 || Math.floor(idle / 500) % 2 === 0; }
  tick() {
    if (this.cv.offsetParent === null) return;
    const now = nowMs();
    const blink = this.blinkOn(now);
    if (this.dirty || now < this.animUntil || this.caretMoving || blink !== this.lastBlink) {
      this.lastBlink = blink; this.dirty = false;
      this.paint();
    }
  }
  /** Greedy word wrap; every line keeps its trailing space so lines joined together equal the text. */
  static wrap(text, cols) {
    const words = text.split(' '), lines = [];
    let cur = '';
    words.forEach((wd, i) => {
      const piece = wd + (i < words.length - 1 ? ' ' : '');
      if (cur && cur.length + piece.length > cols) { lines.push(cur); cur = ''; }
      cur += piece;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  static drawReturn(ctx, x, rowTop, cw, lineH, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const midY = rowTop + lineH / 2, x1 = x + cw * 0.85, x0 = x + cw * 0.15;
    const yTop = midY - lineH / 7, yBot = midY + lineH / 9, ah = Math.max(2, cw * 0.25);
    ctx.beginPath();
    ctx.moveTo(x1, yTop); ctx.lineTo(x1, yBot); ctx.lineTo(x0, yBot);
    ctx.moveTo(x0 + ah, yBot - ah); ctx.lineTo(x0, yBot); ctx.lineTo(x0 + ah, yBot + ah);
    ctx.stroke();
  }
  paint() {
    const f = fitCanvas(this.cv);
    if (!f) return;
    const { ctx, w, h } = f;
    if (!this.target) return;
    const PAD = 30;
    let lines, maxCols = 1, size, cw;
    const measure = () => { ctx.font = `${size}px ${MONO}`; return ctx.measureText('m').width; };
    if (this.softWrap) {   // Monkeytype style: words wrap to the width, no Enter needed
      size = 28;
      for (;;) {
        cw = measure();
        lines = TypingPanel.wrap(this.target, Math.max(10, Math.floor((w - 2 * PAD) / cw)));
        if (size <= 12 || lines.length * Math.round(size * 1.6) <= h - PAD) break;
        size -= 1;
      }
      for (const l of lines) maxCols = Math.max(maxCols, l.length);
    } else {
      lines = this.target.split('\n');
      for (const l of lines) maxCols = Math.max(maxCols, l.length);
      size = Math.max(11, Math.min(30, (h - 2 * PAD) / (lines.length * 1.6)));
      cw = measure();
      while ((maxCols + 1) * cw > w - 2 * PAD && size > 11) { size -= 1; cw = measure(); }
    }
    const lineH = Math.round(size * 1.6);
    const originX = Math.max(PAD, (w - maxCols * cw) / 2);
    const originY = Math.max(PAD / 2, (h - lines.length * lineH) / 2);
    const dim = this.active && document.activeElement !== this.cv;
    ctx.textBaseline = 'alphabetic';
    if (dim) ctx.globalAlpha = 0.4;

    const now = nowMs();
    const typedLen = this.typed.length;
    let idx = 0, caretTX = originX, caretTY = originY;
    for (let r = 0; r < lines.length; r++) {
      const line = lines[r];
      const rowTop = originY + r * lineH;
      const baseY = rowTop + lineH / 2 + size * 0.34;
      for (let c = 0; c <= line.length; c++) {
        const x = originX + c * cw;
        if (idx === typedLen) { caretTX = x; caretTY = rowTop; }
        const atEnd = c === line.length;
        const nl = atEnd && !this.softWrap;
        if (atEnd && (this.softWrap || r === lines.length - 1)) break;
        const expected = nl ? '\n' : line[c];
        let dy = 0;
        const t = now - this.jumpStart[idx];
        if (this.jumpStart[idx] !== 0 && t >= 0 && t < 140) dy = Math.round(-Math.sin(Math.PI * t / 140) * size * 0.14);
        if (idx >= typedLen) {
          if (nl) TypingPanel.drawReturn(ctx, x, rowTop, cw, lineH, 'rgba(107,116,126,.43)');
          else { ctx.fillStyle = C.UNTYPED; ctx.fillText(expected, x, baseY); }
        } else if (this.typed[idx] === expected) {
          if (!nl) { ctx.fillStyle = C.TEXT; ctx.fillText(expected, x, baseY + dy); }
        } else {
          ctx.fillStyle = alpha(C.PINK, 55);
          rr(ctx, Math.round(x), rowTop + 3 + dy, Math.ceil(cw), lineH - 6, 6); ctx.fill();
          ctx.fillStyle = C.PINK;
          if (nl) TypingPanel.drawReturn(ctx, x, rowTop + dy, cw, lineH, C.PINK);
          else ctx.fillText(expected, x, baseY + dy);
        }
        idx++;
      }
    }
    ctx.globalAlpha = 1;

    if (this.active) {
      if (!this.caretInit) { this.caretX = caretTX; this.caretY = caretTY; this.caretInit = true; }
      else { this.caretX += (caretTX - this.caretX) * 0.45; this.caretY += (caretTY - this.caretY) * 0.45; }
      this.caretMoving = Math.abs(caretTX - this.caretX) > 0.4 || Math.abs(caretTY - this.caretY) > 0.4;
      if (!this.caretMoving) { this.caretX = caretTX; this.caretY = caretTY; }
      if (this.blinkOn(now) || this.caretMoving) {
        ctx.fillStyle = C.NEON;
        rr(ctx, Math.round(this.caretX) - 1, Math.round(this.caretY + lineH * 0.15), 3, Math.round(lineH * 0.7), 3); ctx.fill();
      }
    } else this.caretMoving = false;

    const pw = Math.round((w - 24) * typedLen / this.target.length);
    if (pw > 0) { ctx.fillStyle = alpha(C.NEON, 170); rr(ctx, 12, h - 7, pw, 3, 3); ctx.fill(); }

    if (dim) {
      const hint = 'Click here to focus, then start typing';
      ctx.font = `700 15px ${SANS}`;
      const hw = ctx.measureText(hint).width + 36, hh = 36;
      ctx.fillStyle = 'rgba(0,0,0,.69)';
      rr(ctx, (w - hw) / 2, (h - hh) / 2, hw, hh, hh); ctx.fill();
      ctx.fillStyle = C.TEXT; ctx.fillText(hint, (w - hw) / 2 + 18, (h - hh) / 2 + 23);
    }
  }
}

// =====================================================================
// Battle arena (canvas)
// =====================================================================
const MAX_HP = 100, HIT_DAMAGE = 20, READY_SECONDS = 3, PROTOCOL = 3;

class ArenaPanel {
  constructor(canvas) {
    this.cv = canvas;
    this.FLIGHT = 420; this.LUNGE = 200; this.FLASH = 320; this.FLOAT = 800;
    this.leftName = 'You'; this.rightName = 'Opponent';
    this.leftHp = MAX_HP; this.rightHp = MAX_HP; this.leftTarget = MAX_HP; this.rightTarget = MAX_HP;
    this.leftProgress = 0; this.rightProgress = 0;
    this.banner = ''; this.bannerColor = C.TEXT; this.bannerUntil = 0;
    this.attackActive = false; this.attackFromLeft = false; this.attackStart = 0; this.attackDamage = 0; this.attackDone = null;
    this.hitStart = 0; this.hitOnLeft = false; this.hitDamage = 0;
    const loop = () => { this.tick(); requestAnimationFrame(loop); };
    loop();
  }
  setNames(l, r) { this.leftName = l; this.rightName = r; }
  reset() {
    this.leftHp = this.rightHp = this.leftTarget = this.rightTarget = MAX_HP;
    this.leftProgress = this.rightProgress = 0; this.banner = '';
    this.attackActive = false; this.attackDone = null; this.hitStart = 0;
  }
  setHp(left, hp) { if (left) this.leftTarget = hp; else this.rightTarget = hp; }
  setProgress(left, fr) { const v = Math.max(0, Math.min(1, fr)); if (left) this.leftProgress = v; else this.rightProgress = v; }
  setBanner(text, color, millis) { this.banner = text; this.bannerColor = color; this.bannerUntil = millis <= 0 ? 0 : nowMs() + millis; }
  fire(fromLeft, damage, onHit) {
    this.attackActive = true; this.attackFromLeft = fromLeft; this.attackDamage = damage;
    this.attackStart = nowMs(); this.attackDone = onHit;
  }
  static ease(cur, target) { const d = target - cur; return Math.abs(d) < 0.3 ? target : cur + d * 0.15; }
  tick() {
    if (this.cv.offsetParent === null) return;
    const now = nowMs();
    this.leftHp = ArenaPanel.ease(this.leftHp, this.leftTarget);
    this.rightHp = ArenaPanel.ease(this.rightHp, this.rightTarget);
    if (this.attackActive && now - this.attackStart >= this.FLIGHT) {
      this.attackActive = false; this.hitStart = now; this.hitOnLeft = !this.attackFromLeft; this.hitDamage = this.attackDamage;
      const done = this.attackDone; this.attackDone = null;
      if (done) done();
    }
    this.paint();
  }
  paint() {
    const f = fitCanvas(this.cv);
    if (!f) return;
    const { ctx, w, h } = f;
    const now = nowMs();
    ctx.fillStyle = 'rgba(0,0,0,.27)'; rr(ctx, 0.5, 0.5, w - 1, h - 1, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke();
    const groundY = h - 18;
    ctx.strokeStyle = alpha(C.NEON, 60);
    ctx.beginPath(); ctx.moveTo(16, groundY); ctx.lineTo(w - 16, groundY); ctx.stroke();
    const s = Math.max(0.6, Math.min(1.4, (h - 95) / 112));
    const leftX = w * 0.2, rightX = w * 0.8;
    this.drawFighter(ctx, leftX, groundY, s, +1, '#2ea857', true, now);
    this.drawFighter(ctx, rightX, groundY, s, -1, '#8a5cd0', false, now);
    if (this.attackActive) this.drawBolt(ctx, leftX, rightX, groundY, s, now);
    const barW = Math.max(160, Math.min(w * 0.42, 340));
    this.drawBar(ctx, 16, barW, false, this.leftName, this.leftHp, this.leftProgress);
    this.drawBar(ctx, w - 16 - barW, barW, true, this.rightName, this.rightHp, this.rightProgress);
    if (this.hitStart !== 0 && now - this.hitStart < this.FLOAT) {
      const k = (now - this.hitStart) / this.FLOAT;
      const fx = this.hitOnLeft ? leftX : rightX;
      ctx.font = `700 26px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillStyle = alpha(C.PINK, Math.round(255 * (1 - k)));
      ctx.fillText('-' + this.hitDamage, fx, groundY - 125 * s - 30 * k);
      ctx.textAlign = 'left';
    }
    if (this.banner && (this.bannerUntil === 0 || now < this.bannerUntil)) {
      ctx.font = `700 44px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(this.banner, w / 2 + 2, h / 2 + 18);
      ctx.fillStyle = this.bannerColor; ctx.fillText(this.banner, w / 2, h / 2 + 16);
      ctx.textAlign = 'left';
    }
  }
  drawFighter(ctx, cx, groundY, s, dir, base, isLeft, now) {
    const hp = isLeft ? this.leftHp : this.rightHp, target = isLeft ? this.leftTarget : this.rightTarget;
    const ko = target <= 0 && hp <= 0.5;
    let dx = 0, flash = 0;
    if (this.attackActive && this.attackFromLeft === isLeft) {
      const t = now - this.attackStart;
      if (t < this.LUNGE) dx += dir * Math.sin(Math.PI * t / this.LUNGE) * 14;
    }
    if (this.hitStart !== 0 && this.hitOnLeft === isLeft) {
      const t = now - this.hitStart;
      if (t < this.FLASH) { flash = 1 - t / this.FLASH; dx += -dir * Math.sin(t / 12) * 6 * flash; }
    }
    const bob = ko ? 0 : Math.sin(now / 260 + (isLeft ? 0 : 1.7)) * 2.5;
    ctx.save();
    ctx.translate(cx + dx * s, groundY + bob);
    ctx.scale(s, s);
    if (ko) ctx.rotate(-dir * 1.4);
    const body = mixColor(base, '#ffffff', flash * 0.85);
    const dark = mixColor(base, '#000000', 0.5);
    const accent = isLeft ? C.NEON : C.PINK;
    ctx.fillStyle = dark; rr(ctx, -15, -24, 11, 24, 5); ctx.fill(); rr(ctx, 4, -24, 11, 24, 5); ctx.fill();
    ctx.fillStyle = body; rr(ctx, -23, -78, 46, 58, 16); ctx.fill();
    ctx.fillStyle = mixColor(dark, '#ffffff', flash * 0.6); rr(ctx, -14, -66, 28, 22, 8); ctx.fill();
    ctx.fillStyle = accent; ctx.font = `700 12px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('</>', 0, -47); ctx.textAlign = 'left';
    ctx.strokeStyle = body; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(dir * 18, -62); ctx.lineTo(dir * 38, -54); ctx.stroke();
    ctx.fillStyle = mixColor(base, '#ffffff', 0.18 + flash * 0.7); rr(ctx, -20, -116, 40, 34, 16); ctx.fill();
    ctx.fillStyle = C.BG; rr(ctx, dir > 0 ? -6 : -22, -106, 28, 14, 10); ctx.fill();
    ctx.fillStyle = ko ? C.MUTED : accent; ctx.beginPath(); ctx.arc(dir > 0 ? 13 : -13, -99, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -116); ctx.lineTo(dir * 5, -128); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(dir * 5, -130, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawBolt(ctx, leftX, rightX, groundY, s, now) {
    const p = Math.min(1, (now - this.attackStart) / this.FLIGHT);
    const d = this.attackFromLeft ? 1 : -1;
    const ax = (this.attackFromLeft ? leftX : rightX) + d * 38 * s;
    const tx = (this.attackFromLeft ? rightX : leftX) - d * 18 * s;
    const ay = groundY - 54 * s, ty = groundY - 50 * s;
    const x = ax + (tx - ax) * p, y = ay + (ty - ay) * p - Math.sin(Math.PI * p) * 16 * s;
    if (p > 0.03) {
      const g = ctx.createLinearGradient(ax, ay, x, y);
      g.addColorStop(0, alpha(C.NEON, 0)); g.addColorStop(1, alpha(C.NEON, 190));
      ctx.strokeStyle = g; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x, y); ctx.stroke();
    }
    const r = 10 * s;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    rg.addColorStop(0, '#fff'); rg.addColorStop(0.4, alpha(C.NEON, 200)); rg.addColorStop(1, alpha(C.NEON, 0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  drawBar(ctx, x, w, alignRight, name, hp, progress) {
    const barY = 24, barH = 14;
    ctx.font = `700 13px ${MONO}`;
    ctx.fillStyle = C.TEXT; ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(name, alignRight ? x + w : x, 18);
    ctx.fillStyle = C.MUTED; ctx.textAlign = alignRight ? 'left' : 'right';
    ctx.fillText(Math.ceil(hp) + '/' + MAX_HP, alignRight ? x : x + w, 18);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.094)'; rr(ctx, x, barY, w, barH, barH); ctx.fill();
    const frac = Math.max(0, Math.min(1, hp / MAX_HP));
    const fw = Math.round(w * frac);
    if (fw > 0) { ctx.fillStyle = mixColor(C.PINK, C.NEON, frac); rr(ctx, alignRight ? x + w - fw : x, barY, fw, barH, barH); ctx.fill(); }
    const typeY = barY + barH + 6;
    ctx.fillStyle = 'rgba(255,255,255,.063)'; rr(ctx, x, typeY, w, 4, 4); ctx.fill();
    const pw = Math.round(w * progress);
    if (pw > 0) { ctx.fillStyle = alpha(C.PURPLE, 230); rr(ctx, alignRight ? x + w - pw : x, typeY, pw, 4, 4); ctx.fill(); }
  }
}

// =====================================================================
// Instructions text
// =====================================================================
const INSTRUCTIONS = `Goal: type the Java code shown on screen as fast and as accurately as you can
before the countdown reaches zero.

How a round works:
  1. Choose a difficulty. A snippet appears in the middle of the screen.
     Each difficulty has its own time limit:
     Beginner 60 s, Intermediate 90 s, Advanced 120 s.
  2. Just start typing - you type directly over the snippet. Letters turn
     bright when correct and red when wrong, and each letter hops as you
     type it. If the typing area looks dim, click it to focus.
     The countdown in the upper right corner starts at your first keystroke.
  3. The round ends automatically when your text matches the snippet exactly,
     when you press Submit, or when the countdown hits 0. Whatever you have
     typed by then is scored.
  4. Changed your mind? Press Back to leave the round. It will not be scored.
  5. On the result screen, press "Show output" to compile and run the code you
     typed. You see what it prints, or the compiler errors if it has mistakes.
     (The code is compiled by an online Java runner, so this needs internet.)

Rules:
  - Every character counts: spaces, indentation, capitals, braces,
    semicolons and quotes. Nothing is auto-corrected.
  - Indent with spaces (4 per level). The Tab key types 4 spaces for you.
  - Blank lines in the snippet are blank lines you must type
    (press ENTER where you see the faint return arrow).
  - Backspace lets you fix mistakes, but every wrong letter you type
    still counts as an error, even after you delete it.
  - After each round choose: same difficulty, change difficulty,
    or end the session to see your session summary.
  - Every finished round is saved to the Leaderboard under your name
    (in this browser), both in the Overall ranking and in the ranking
    of that difficulty.

Formulas:
  Errors   = edit distance between your text and the target
             (wrong, missing and extra characters each count 1)
             + every wrong letter you typed and then deleted
  Accuracy = (1 - errors / longer text length) x 100
  WPM      = (characters typed / 5) / minutes used
  Score    = min(WPM,300) x (accuracy/100)^2 x 10, +100 for a perfect
             round (no mistakes), then x difficulty (1.0 / 1.5 / 2.0)

Battle Mode (main menu):
  Two fighters get the same snippet. After a 3-2-1 countdown, whoever types it
  EXACTLY first fires an attack at the other (every attack does the same damage:
  20 of 100 HP). Backspace fixes mistakes, but you need an exact match to attack.
  There is no timer in Battle Mode: every round ends with a hit.
  The first fighter to reach 0 HP loses.
  Finished battles are saved on the Leaderboard's "Battle Mode" tab: wins, accuracy
  (correct keystrokes out of all keystrokes) and WPM, ranked by wins.
  - Two kinds of text: "Java code" (the snippets) or "English words" (Monkeytype style:
    random common words that wrap across the screen, 15 / 25 / 35 words by difficulty;
    no Enter or Tab needed, just type the words and spaces). In an online game the
    host's choice of text is used.
  - Play vs NPC: the difficulty sets the snippets and how fast the NPC types
    (about 35 / 65 / 90 WPM, a little random each round - much faster than
    normal typing, so every level is hard).
  - Online game: one player picks "Host an online game" and tells the other the
    room code shown. The other types it into "Room code" and presses Join.
    It works across the internet (peer-to-peer WebRTC); both players just need
    this page open. The host's difficulty is used and the host decides who
    finished first.
`;

// =====================================================================
// Battle screen
// =====================================================================
class BattleScreen {
  constructor(onExit, board) {
    this.onExit = onExit; this.board = board;
    this.difficulty = Difficulty.BEGINNER;
    this.arena = new ArenaPanel($('arenaCanvas'));
    this.typing = new TypingPanel($('bTypingCanvas'));
    this.typing.setOnChange(() => this.onTyped());
    this.mode = 'NPC'; this.phase = 'IDLE'; this.kind = 'CODE';
    this.selector = new ChallengeSelector(); this.challenge = null;
    this.round = 0; this.resolvedRound = 0; this.myHp = MAX_HP; this.oppHp = MAX_HP;
    this.myName = 'Player'; this.oppName = 'Opponent';
    this.roundStart = 0; this.readyEnd = 0; this.npcCps = 0; this.lastSentProgress = -1;
    this.keysTotal = 0; this.keysCorrect = 0; this.prevTypedLen = 0; this.battleCorrectChars = 0; this.battleSeconds = 0; this.statsOpen = false;
    this.net = null; this.peer = null; this.epoch = 0; this.loopId = null;

    const lv = $('bLevels');
    this.diffButtons = {};
    for (const d of DIFFS) {
      const b = document.createElement('button');
      b.className = 'btn' + (d === this.difficulty ? ' primary' : '');
      b.textContent = d.name;
      b.onclick = () => this.selectDifficulty(d);
      this.diffButtons[d.key] = b; lv.appendChild(b);
    }
    this.kindButtons = {};
    for (const [k, label] of [['CODE', 'Java code'], ['ENGLISH', 'English words']]) {
      const b = document.createElement('button');
      b.className = 'btn' + (k === this.kind ? ' primary' : '');
      b.textContent = label;
      b.onclick = () => this.selectKind(k);
      this.kindButtons[k] = b; $('bKinds').appendChild(b);
    }
    $('bNpc').onclick = () => this.startNpc();
    $('bHost').onclick = () => this.startHosting();
    $('bJoin').onclick = () => this.joinGame();
    $('bBack').onclick = () => { this.cancelNetworking(); this.onExit(); };
    $('bQuit').onclick = () => this.leaveArena();
    $('bRematch').onclick = () => { this.beginBattle(); this.beginRound(1, this.newContent()); };
  }
  show(id) { window.showScreen(id); }
  open() { this.cancelNetworking(); this.say(' ', false); this.show('battleSetup'); }
  say(msg, error) { const m = $('bMessage'); m.className = 'msg' + (error ? ' err' : ''); m.textContent = msg; }
  selectDifficulty(d) {
    this.difficulty = d;
    for (const k in this.diffButtons) this.diffButtons[k].classList.toggle('primary', k === d.key);
  }
  selectKind(k) {
    this.kind = k;
    for (const key in this.kindButtons) this.kindButtons[key].classList.toggle('primary', key === k);
  }
  /** A new round's content id: a snippet number (code) or a random seed (English). */
  newContent() { return this.kind === 'ENGLISH' ? Math.floor(Math.random() * 1e9) : this.selector.nextIndex(this.difficulty); }
  makeChallenge(id) { return this.kind === 'ENGLISH' ? new EnglishChallenge(this.difficulty, id) : this.selector.create(this.difficulty, id); }
  static sanitizeName(raw, fallback) {
    let s = (raw == null ? '' : String(raw)).replace(/[<>\u0000-\u001f\u007f]/g, '').trim();
    if (s.length > Player.MAX_NAME_LENGTH) s = s.substring(0, Player.MAX_NAME_LENGTH);
    return s === '' ? fallback : s;
  }
  validName() {
    try { return BattleScreen.sanitizeName(new Player($('bNameField').value).getName(), 'Player'); }
    catch (ex) { this.say(ex.message, true); return null; }
  }
  leaveArena() { this.cancelNetworking(); this.say(' ', false); this.show('battleSetup'); }

  startNpc() {
    const name = this.validName(); if (!name) return;
    this.cancelNetworking();
    this.mode = 'NPC'; this.myName = name; this.oppName = 'NPC ' + this.difficulty.name;
    this.beginBattle();
    this.beginRound(1, this.newContent());
  }

  static randomCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = ''; for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }
  startHosting() {
    const name = this.validName(); if (!name) return;
    if (typeof Peer === 'undefined') { this.say('The multiplayer library could not load. Check your internet connection and reload.', true); return; }
    this.cancelNetworking();
    this.mode = 'HOST'; this.myName = name;
    this.tryHost(this.epoch, 0);
  }
  tryHost(token, attempt) {
    const code = BattleScreen.randomCode();
    let peer;
    try { peer = new Peer('jt-' + code.toLowerCase()); } catch (e) { this.say('Hosting failed: ' + e.message, true); return; }
    this.peer = peer;
    peer.on('open', () => { if (token === this.epoch) this.say(`Waiting for a player. ROOM CODE: ${code}  (press Back to cancel)`, false); });
    peer.on('connection', (conn) => {
      if (token !== this.epoch) { conn.close(); return; }
      if (this.net) { conn.close(); return; }
      conn.on('open', () => this.attach(conn, token));
    });
    peer.on('error', (err) => {
      if (token !== this.epoch) return;
      if (err.type === 'unavailable-id' && attempt < 5) { try { peer.destroy(); } catch (e) { /* ignore */ } this.tryHost(token, attempt + 1); return; }
      this.say('Hosting failed: ' + (err.type || err.message), true);
    });
  }
  joinGame() {
    const name = this.validName(); if (!name) return;
    const code = $('bCode').value.trim().toLowerCase();
    if (!code) { this.say('Enter the host\'s room code first.', true); return; }
    if (typeof Peer === 'undefined') { this.say('The multiplayer library could not load. Check your internet connection and reload.', true); return; }
    this.cancelNetworking();
    this.mode = 'CLIENT'; this.myName = name;
    const token = this.epoch;
    this.say('Connecting to room ' + code.toUpperCase() + ' ...', false);
    const peer = new Peer();
    this.peer = peer;
    peer.on('open', () => {
      if (token !== this.epoch) return;
      const conn = peer.connect('jt-' + code, { reliable: true });
      conn.on('open', () => this.attach(conn, token));
      conn.on('error', () => { if (token === this.epoch) this.say('Could not connect to that room.', true); });
      setTimeout(() => { if (token === this.epoch && !this.net) this.say('Could not connect. Check the room code (and that the host is still waiting).', true); }, 12000);
    });
    peer.on('error', (err) => {
      if (token !== this.epoch) return;
      this.say(err.type === 'peer-unavailable' ? 'No game found with that room code.' : 'Could not connect: ' + (err.type || err.message), true);
    });
  }
  attach(conn, token) {
    if (token !== this.epoch) { try { conn.close(); } catch (e) { /* ignore */ } return; }
    const net = {
      conn,
      send: (line) => { try { conn.send(String(line).replace(/[\r\n]/g, ' ')); } catch (e) { /* link dropped */ } },
      close: () => { try { conn.close(); } catch (e) { /* ignore */ } },
    };
    this.net = net;
    conn.on('data', (d) => { if (this.net === net) this.onNet(String(d)); });
    conn.on('close', () => { if (this.net === net) this.onNetClosed(); });
    if (this.mode === 'CLIENT') {
      net.send(`HELLO ${PROTOCOL} ${SNIPPET_FINGERPRINT} ${this.myName}`);
      this.say('Connected! Waiting for the host to start the round...', false);
      setTimeout(() => {
        if (token === this.epoch && this.phase === 'IDLE') {
          this.cancelNetworking();
          this.say('Connected, but the host never started the game. Make sure you both load the same deployed version of the game.', true);
        }
      }, 8000);
    } else this.say('A player connected - checking version...', false);
  }
  cancelNetworking() {
    this.epoch++;
    if (this.loopId) { clearInterval(this.loopId); this.loopId = null; }
    this.phase = 'IDLE';
    this.typing.setActive(false);
    const old = this.net; this.net = null;
    if (old) old.close();
    if (this.peer) { try { this.peer.destroy(); } catch (e) { /* ignore */ } this.peer = null; }
  }

  beginBattle() {
    this.selector = new ChallengeSelector();
    this.round = 0; this.resolvedRound = 0; this.myHp = MAX_HP; this.oppHp = MAX_HP;
    this.keysTotal = 0; this.keysCorrect = 0; this.battleCorrectChars = 0; this.battleSeconds = 0; this.statsOpen = false;
    this.arena.reset(); this.arena.setNames(this.myName, this.oppName);
    $('bRematch').classList.add('hidden');
    this.typing.setActive(false);
    this.show('battleArena');
    if (this.loopId) clearInterval(this.loopId);
    this.loopId = setInterval(() => this.onLoop(), 50);
  }
  beginRound(roundNo, snippetIndex) {
    this.round = roundNo;
    this.challenge = this.makeChallenge(snippetIndex);
    this.typing.softWrap = this.kind === 'ENGLISH';
    this.typing.setTarget(this.challenge.getCodeSnippet());
    this.typing.setActive(false);
    this.arena.setProgress(true, 0); this.arena.setProgress(false, 0);
    this.lastSentProgress = -1; this.prevTypedLen = 0; this.statsOpen = false;
    $('bHeader').textContent = `ROUND ${this.round}   ${this.myName} vs ${this.oppName}   ${this.difficulty.name}: ${this.challenge.getTitle()}`;
    $('bStatus').textContent = 'Get ready - type the code exactly. The first to finish hits the other!';
    const baseWpm = this.kind === 'ENGLISH' ? ENGLISH_NPC_WPM[this.difficulty.key] : this.difficulty.npcWpm;
    this.npcCps = baseWpm * (0.85 + 0.30 * Math.random()) * GameStatistics.CHARS_PER_WORD / 60;
    this.phase = 'READY';
    this.readyEnd = nowMs() + READY_SECONDS * 1000;
    setTimeout(() => this.typing.focus(), 0);
  }
  startFight(now) {
    this.phase = 'FIGHT'; this.roundStart = now; this.statsOpen = true;
    this.typing.setActive(true); this.typing.focus();
    this.arena.setBanner('GO!', C.NEON, 600);
    $('bStatus').textContent = 'Type it! Backspace fixes mistakes - you need an exact match.';
  }
  onLoop() {
    const now = nowMs();
    if (this.phase === 'READY') {
      const left = this.readyEnd - now;
      if (left <= 0) this.startFight(now);
      else this.arena.setBanner(String(Math.ceil(left / 1000)), C.PURPLE, 0);
    } else if (this.phase === 'FIGHT' && this.mode === 'NPC') {
      const len = this.challenge.getCodeSnippet().length;
      const chars = Math.min(len, GameStatistics.msToSeconds(now - this.roundStart) * this.npcCps);
      this.arena.setProgress(false, chars / len);
      if (chars >= len) this.resolveRound(false);
    }
  }
  static correctPrefix(typed, target) {
    const n = Math.min(typed.length, target.length); let i = 0;
    while (i < n && typed[i] === target[i]) i++;
    return i;
  }
  onTyped() {
    if (this.phase !== 'FIGHT') return;
    const typed = this.typing.getTyped(), snippet = this.challenge.getCodeSnippet();
    const correct = BattleScreen.correctPrefix(typed, snippet);
    if (typed.length > this.prevTypedLen) {   // only keys that added characters count
      this.keysTotal += typed.length - this.prevTypedLen;
      this.keysCorrect += Math.max(0, correct - this.prevTypedLen);
    }
    this.prevTypedLen = typed.length;
    this.arena.setProgress(true, correct / snippet.length);
    if (this.net && correct !== this.lastSentProgress) { this.lastSentProgress = correct; this.net.send(`PROG ${this.round} ${correct}`); }
    if (typed === snippet) {
      this.closeRoundStats(nowMs());
      this.typing.setActive(false);
      if (this.mode === 'CLIENT') {
        this.phase = 'HIT';
        $('bStatus').textContent = 'Finished! Waiting for the host to confirm the hit...';
        if (this.net) this.net.send('DONE ' + this.round);
      } else this.resolveRound(true);
    }
  }
  closeRoundStats(end) {
    if (!this.statsOpen || !this.challenge) return;
    this.statsOpen = false;
    this.battleCorrectChars += BattleScreen.correctPrefix(this.typing.getTyped(), this.challenge.getCodeSnippet());
    this.battleSeconds += GameStatistics.msToSeconds(end - this.roundStart);
  }
  resolveRound(youWin) {
    if (this.phase !== 'FIGHT') return;
    this.phase = 'HIT'; this.typing.setActive(false);
    const newOpp = youWin ? Math.max(0, this.oppHp - HIT_DAMAGE) : this.oppHp;
    const newMy = youWin ? this.myHp : Math.max(0, this.myHp - HIT_DAMAGE);
    if (this.mode === 'HOST' && this.net) this.net.send(`HIT ${this.round} ${youWin ? 'HOST' : 'CLIENT'} ${newMy} ${newOpp}`);
    this.playAttack(youWin, newMy, newOpp);
  }
  playAttack(youWin, newMy, newOpp) {
    this.closeRoundStats(nowMs());
    $('bStatus').textContent = youWin ? 'Direct hit! You typed it first.' : this.oppName + ' typed it first!';
    this.arena.fire(youWin, HIT_DAMAGE, () => {
      this.myHp = newMy; this.oppHp = newOpp;
      this.arena.setHp(true, this.myHp); this.arena.setHp(false, this.oppHp);
      if (this.myHp <= 0 || this.oppHp <= 0) this.endBattle(this.oppHp <= 0);
      else if (this.mode !== 'CLIENT') this.scheduleNextRound(1500);
    });
  }
  scheduleNextRound(ms) {
    const token = this.epoch;
    setTimeout(() => {
      if (token !== this.epoch || this.phase === 'OVER' || this.phase === 'IDLE') return;
      const index = this.newContent();
      if (this.mode === 'HOST' && this.net) this.net.send(`START ${DIFFS.indexOf(this.difficulty)} ${index} ${this.round + 1} ${this.kind} ${this.myName}`);
      this.beginRound(this.round + 1, index);
    }, ms);
  }
  endBattle(won) {
    if (this.phase === 'OVER') return;
    this.phase = 'OVER';
    this.board.record(this.myName, won, this.keysCorrect, this.keysTotal, this.battleCorrectChars, this.battleSeconds);
    if (this.loopId) { clearInterval(this.loopId); this.loopId = null; }
    this.typing.setActive(false);
    this.arena.setBanner(won ? 'YOU WIN!' : 'YOU LOSE', won ? C.NEON : C.PINK, 0);
    $('bStatus').textContent = won ? 'Victory! Saved to the Battle Mode leaderboard. Press Quit to go back.'
      : this.oppName + ' wins. Saved to the Battle Mode leaderboard.';
    $('bRematch').classList.toggle('hidden', this.mode !== 'NPC');
  }

  onNet(line) {
    try {
      const p = line.split(' ');
      switch (p[0]) {
        case 'HELLO': {
          if (this.mode === 'HOST' && this.phase === 'IDLE') {
            const h = line.split(' ');
            const ok = h.length >= 4 && h[1] === String(PROTOCOL) && h[2] === String(SNIPPET_FINGERPRINT);
            if (!ok) {
              if (this.net) this.net.send('REJECT Your game version is different from the host\'s. Both players need the same deployed version.');
              this.cancelNetworking();
              this.say('A player tried to join with a different version of the game. Press "Host an online game" to try again.', true);
              return;
            }
            this.oppName = BattleScreen.sanitizeName(h.slice(3).join(' '), 'Opponent');
            this.beginBattle();
            const index = this.newContent();
            this.net.send(`START ${DIFFS.indexOf(this.difficulty)} ${index} 1 ${this.kind} ${this.myName}`);
            this.beginRound(1, index);
          }
          break;
        }
        case 'REJECT':
          if (this.mode === 'CLIENT') {
            const why = line.length > 7 ? line.substring(7) : 'The host refused the connection.';
            this.cancelNetworking(); this.say(why, true);
          }
          break;
        case 'START':
          if (this.mode === 'CLIENT' && p.length >= 6 && this.phase !== 'OVER') {
            this.selectKind(p[4] === 'ENGLISH' ? 'ENGLISH' : 'CODE');
            this.difficulty = diffByOrdinal(parseInt(p[1], 10));
            const index = parseInt(p[2], 10), roundNo = parseInt(p[3], 10);
            if (this.phase === 'IDLE') {
              this.oppName = BattleScreen.sanitizeName(p.slice(5).join(' '), 'Opponent');
              this.beginBattle();
            }
            this.beginRound(roundNo, index);
          }
          break;
        case 'PROG':
          if (p.length >= 3 && this.challenge && parseInt(p[1], 10) === this.round)
            this.arena.setProgress(false, parseInt(p[2], 10) / this.challenge.getCodeSnippet().length);
          break;
        case 'DONE':
          if (this.mode === 'HOST' && parseInt(p[1], 10) === this.round) this.resolveRound(false);
          break;
        case 'HIT':
          if (this.mode === 'CLIENT' && p.length >= 5) {
            const r = parseInt(p[1], 10);
            if (r !== this.round || this.resolvedRound === r || this.phase === 'OVER') return;
            this.resolvedRound = r;
            const youWin = p[2] === 'CLIENT';
            const hostHp = parseInt(p[3], 10), clientHp = parseInt(p[4], 10);
            this.phase = 'HIT'; this.typing.setActive(false);
            this.playAttack(youWin, clientHp, hostHp);
          }
          break;
        default: break;
      }
    } catch (e) { /* a malformed message from the other side is ignored */ }
  }
  onNetClosed() {
    if (this.phase === 'OVER') { $('bStatus').textContent = 'The other player left. Press Quit to go back.'; return; }
    const wasInBattle = this.phase !== 'IDLE';
    this.cancelNetworking();
    this.show('battleSetup');
    this.say(wasInBattle ? 'The other player disconnected.' : 'The connection was closed.', true);
  }
}

// =====================================================================
// Main game window
// =====================================================================
const screens = ['menu', 'setup', 'game', 'result', 'summary', 'stats', 'board', 'info', 'output', 'battleSetup', 'battleArena'];
window.showScreen = (id) => {
  for (const s of screens) $(s).classList.toggle('active', s === id);
};

const selector = new ChallengeSelector();
const allTimeStats = new GameStatistics();
const leaderboard = new Leaderboard();
const battleBoard = new BattleLeaderboard();
let session = new GameStatistics();
let player = null, challenge = null, difficulty = null, round = 0;
let inSession = false, active = false, startMs = 0;
let boardFilter = null, boardBattle = false;
let lastTyped = '', lastTitle = '';
let clock = null;
let finishDelay = null;

const typing = new TypingPanel($('typingCanvas'));
const battle = new BattleScreen(() => showScreen('menu'), battleBoard);

const formatClock = (ms) => {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${p2(Math.floor(tenths / 600))}:${p2(Math.floor(tenths / 10) % 60)}.${tenths % 10}`;
};

// ---- menu ----
$('btnStart').onclick = () => { inSession = false; openSetup(); };
$('btnBattle').onclick = () => battle.open();
$('btnInfo').onclick = () => showInfo('INSTRUCTIONS', INSTRUCTIONS);
$('btnStats').onclick = showStatistics;
$('btnBoard').onclick = showLeaderboard;
$('btnExit').onclick = () => { window.close(); showScreen('menu'); };

// ---- setup ----
const levelsEl = $('levels');
for (const d of DIFFS) {
  const b = document.createElement('button');
  b.className = 'btn level';
  b.innerHTML = `<b>${d.name}</b><span class="m">x${d.mult.toFixed(1)}  ·  ${d.seconds}s</span><span class="d">${d.topics}</span>`;
  b.onclick = () => onDifficulty(d);
  levelsEl.appendChild(b);
}
$('setupBack').onclick = () => showScreen(inSession ? 'result' : 'menu');
function openSetup() {
  $('setupMessage').innerHTML = '&nbsp;';
  $('nameRow').classList.toggle('hidden', inSession);
  showScreen('setup');
  if (!inSession) { $('nameField').focus(); $('nameField').select(); }
}
function onDifficulty(d) {
  if (!inSession) {
    try {
      if (!player) player = new Player($('nameField').value);
      else player.setName($('nameField').value);
    } catch (ex) { $('setupMessage').textContent = ex.message + ' Please try again.'; return; }
    session = new GameStatistics(); round = 0; inSession = true;
  }
  difficulty = d;
  nextRound();
}

// ---- game ----
typing.setOnChange(onTyped);
$('gameBack').onclick = leaveRound;
$('gameSubmit').onclick = () => finishRound();

function nextRound() {
  round++;
  challenge = selector.next(difficulty);
  $('gameHeader').textContent = `ROUND ${round}   Player: ${player.getName()}   Difficulty: ${difficulty.name}`;
  $('gameInfo').innerHTML = `<b>${esc(challenge.getTitle())}</b> &mdash; ${esc(challenge.getChallengeDescription())}<br><span class="tip">Tip: ${esc(challenge.getTypingTip())}</span>`;
  typing.setTarget(challenge.getCodeSnippet());
  typing.setActive(true);
  startMs = 0;
  clearInterval(clock); clock = null;
  clearTimeout(finishDelay);
  $('timerLabel').textContent = formatClock(difficulty.seconds * 1000);
  $('liveWpm').textContent = 'WPM 0';
  active = true;
  $('gameStatus').textContent = `Just start typing - the ${difficulty.seconds}s countdown starts on your first keystroke.`;
  showScreen('game');
  setTimeout(() => typing.focus(), 0);
}
function onTyped() {
  if (!active) return;
  if (startMs === 0) {
    startMs = nowMs();
    clock = setInterval(refreshTimer, 100);
    $('gameStatus').textContent = 'Countdown running... exact match or Submit ends the round early.';
  }
  refreshTimer();
  if (active && typing.getTyped() === challenge.getCodeSnippet()) {
    typing.setActive(false);   // let the last letter finish its hop, but stop the clock now
    const end = nowMs();
    finishDelay = setTimeout(() => finishRound(end), 160);
  }
}
function refreshTimer() {
  if (!active) return;
  const limit = difficulty.seconds * 1000;
  const elapsed = startMs === 0 ? 0 : nowMs() - startMs;
  if (elapsed >= limit) { finishRound(startMs + limit); return; }
  $('timerLabel').textContent = formatClock(limit - elapsed);
  $('liveWpm').textContent = 'WPM ' + Math.round(GameStatistics.calculateWpm(typing.getTyped().length, GameStatistics.msToSeconds(elapsed)));
}
function finishRound(endMs) {
  if (!active) return;
  if (endMs === undefined) endMs = nowMs();
  active = false;
  clearInterval(clock); clock = null;
  clearTimeout(finishDelay);
  typing.setActive(false);
  const limit = difficulty.seconds * 1000;
  const elapsed = startMs === 0 ? 0 : Math.min(limit, Math.max(0, endMs - startMs));
  $('timerLabel').textContent = formatClock(limit - elapsed);
  const r = TypingEngine.evaluate(challenge, typing.getTyped(), elapsed, typing.getCorrectedMistakes());
  lastTyped = typing.getTyped();
  lastTitle = challenge.getTitle();
  session.addResult(r);
  allTimeStats.addResult(r);
  player.recordRound(r.score);
  leaderboard.record(player.getName(), difficulty, r.score, r.wpm);
  fillResult(r, elapsed >= limit && !r.exactMatch);
  showScreen('result');
}
function leaveRound() {
  if (!active) return;
  if (startMs !== 0 && typing.getTyped().length > 0) {
    if (!confirm('Leave this round? Your progress in this round will be lost.') || !active) return;
  }
  active = false;
  clearInterval(clock); clock = null; clearTimeout(finishDelay);
  startMs = 0;
  typing.setActive(false);
  if (session.getRoundsPlayed() > 0) endSession();
  else { inSession = false; showScreen('menu'); }
}

// ---- result ----
$('resSame').onclick = nextRound;
$('resChange').onclick = openSetup;
$('resOutput').onclick = showOutput;
$('resEnd').onclick = endSession;
function ratingColor(r) {
  if (r.accuracy >= 95) return C.NEON;
  if (r.accuracy >= 85) return C.NEON_SOFT;
  if (r.accuracy >= 60) return C.PURPLE;
  return C.PINK;
}
function fillResult(r, timeUp) {
  $('resultTitle').textContent = 'RESULT - Round ' + round + (timeUp ? "  (time's up!)" : '');
  $('resultSub').textContent = r.difficultyName + ': ' + r.challengeTitle;
  const rl = $('ratingLabel'); rl.textContent = getRating(r); rl.style.color = ratingColor(r);
  const match = r.exactMatch ? 'YES' : r.typedLength === 0 ? 'NO (nothing was typed)' : `NO (first difference on line ${r.firstDifferentLine})`;
  const rows = [
    ['Time used', `${fmt(r.elapsedSeconds)} of ${difficulty.seconds} seconds`],
    ['Accuracy', fmt(r.accuracy) + '%'],
    ['WPM', fmt(r.wpm)],
    ['Errors', `${r.errors} character error(s)`],
    ['Typed', `${r.typedLength} of ${r.targetLength} characters`],
    ['Exact match', match],
    ['Score', String(r.score)],
    ['Total', `${player.getTotalScore()} points in ${player.getRoundsPlayed()} round(s)`],
  ];
  $('resultStats').innerHTML = rows.map(([k, v]) => `<span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>`).join('');
}

// ---- summary / statistics (report panels) ----
function loadReport(bodyEl, stats, totalRows) {
  if (!totalRows) { bodyEl.innerHTML = '<div class="empty">No rounds played yet. Choose "Start Game" to begin!</div>'; return; }
  let html = '<table><thead><tr>' + ['Round', 'Difficulty', 'Snippet', 'Time(s)', 'WPM', 'Accuracy', 'Errors', 'Score']
    .map((h, i) => `<th class="${i === 1 || i === 2 ? 'l' : ''}">${h}</th>`).join('') + '</tr></thead><tbody>';
  stats.getResults().forEach((r, i) => {
    html += `<tr><td>${i + 1}</td><td class="l">${esc(r.difficultyName)}</td><td class="l">${esc(r.challengeTitle)}</td>` +
      `<td>${fmt(r.elapsedSeconds)}</td><td>${fmt(r.wpm)}</td><td>${fmt(r.accuracy)}%</td><td>${r.errors}</td><td class="n">${r.score}</td></tr>`;
  });
  html += '</tbody></table><div class="totals">';
  for (const [k, v] of totalRows) html += `<span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>`;
  if (totalRows.length % 2 === 1) html += '<span></span><span></span>';
  bodyEl.innerHTML = html + '</div>';
}
function endSession() {
  inSession = false;
  $('summaryTitle').textContent = 'SESSION SUMMARY - ' + player.getName();
  loadReport($('summaryBody'), session, [
    ['Rounds played', String(session.getRoundsPlayed())],
    ['Total score', String(session.getTotalScore())],
    ['Average WPM', fmt(session.getAverageWpm())],
    ['Best WPM', fmt(session.getBestWpm())],
    ['Average accuracy', fmt(session.getAverageAccuracy()) + '%'],
    ['Total errors', String(session.getTotalErrors())],
    ['Perfect rounds', String(session.getPerfectRounds())],
  ]);
  showScreen('summary');
}
$('sumAgain').onclick = openSetup;
$('sumMenu').onclick = () => showScreen('menu');
$('statsBack').onclick = () => showScreen('menu');
function showStatistics() {
  $('statsTitle').textContent = 'STATISTICS (since the page was opened)';
  if (allTimeStats.getRoundsPlayed() === 0) loadReport($('statsBody'), allTimeStats, null);
  else loadReport($('statsBody'), allTimeStats, [
    ['Player', player.getName()],
    ['Rounds played', String(player.getRoundsPlayed())],
    ['Total score', String(player.getTotalScore())],
    ['Average WPM', fmt(allTimeStats.getAverageWpm())],
    ['Best WPM', fmt(allTimeStats.getBestWpm())],
    ['Average accuracy', fmt(allTimeStats.getAverageAccuracy()) + '%'],
    ['Total errors', String(allTimeStats.getTotalErrors())],
    ['Perfect rounds', String(allTimeStats.getPerfectRounds())],
    ['Total typing time', fmt(allTimeStats.getTotalTimeSeconds()) + ' s'],
  ]);
  showScreen('stats');
}

// ---- leaderboard ----
const tabsEl = $('boardTabs');
const tabButtons = [];
function addTab(label, onClick) {
  const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = onClick;
  tabsEl.appendChild(b); tabButtons.push(b); return b;
}
addTab('Overall', () => selectBoard(null));
DIFFS.forEach((d) => addTab(d.name, () => selectBoard(d)));
addTab('Battle Mode', selectBattleBoard);
$('boardBack').onclick = () => showScreen('menu');
function setActiveTab(i) { tabButtons.forEach((b, j) => b.classList.toggle('primary', i === j)); }
function showLeaderboard() { if (boardBattle) selectBattleBoard(); else selectBoard(boardFilter); showScreen('board'); }
function selectBoard(d) {
  boardFilter = d; boardBattle = false;
  setActiveTab(d ? DIFFS.indexOf(d) + 1 : 0);
  const ranking = leaderboard.getRanking(d);
  const body = $('boardBody');
  if (!ranking.length) {
    body.innerHTML = `<div class="empty">${d ? 'No ' + d.name + ' scores yet. Be the first!' : 'No saved players yet. Choose "Start Game" to be the first!'}</div>`;
    return;
  }
  body.innerHTML = '<table><thead><tr><th>Rank</th><th class="l">Player</th><th>Total score</th><th>Rounds</th><th>Best WPM</th></tr></thead><tbody>' +
    ranking.map((e, i) => `<tr><td>${i + 1}</td><td class="l">${esc(e.name)}</td><td class="n">${e.totalScore}</td><td>${e.rounds}</td><td>${fmt(e.bestWpm)}</td></tr>`).join('') + '</tbody></table>';
}
function selectBattleBoard() {
  boardBattle = true; setActiveTab(4);
  const ranking = battleBoard.getRanking();
  const body = $('boardBody');
  if (!ranking.length) { body.innerHTML = '<div class="empty">No battles finished yet. Play Battle Mode to get ranked!</div>'; return; }
  body.innerHTML = '<table><thead><tr><th>Rank</th><th class="l">Player</th><th>Wins</th><th>Accuracy</th><th>WPM</th></tr></thead><tbody>' +
    ranking.map((e, i) => `<tr><td>${i + 1}</td><td class="l">${esc(e.name)}</td><td class="n">${e.wins}</td><td>${fmt(e.accuracy)}%</td><td>${fmt(e.wpm)}</td></tr>`).join('') + '</tbody></table>';
}

// ---- info / output ----
$('infoBack').onclick = () => showScreen('menu');
function showInfo(title, text) {
  $('infoTitle').textContent = title; $('infoText').textContent = text;
  $('infoText').scrollTop = 0; showScreen('info');
}
$('outBack').onclick = () => showScreen('result');
async function showOutput() {
  $('outputTitle').textContent = 'OUTPUT - ' + lastTitle;
  const codeEl = $('codeText'), outEl = $('outputText');
  codeEl.textContent = lastTyped.trim() === '' ? '(nothing typed)' : lastTyped;
  outEl.style.color = C.TEXT;
  if (lastTyped.trim() === '') { outEl.textContent = 'Nothing was typed, so there is nothing to run.'; showScreen('output'); return; }
  const title = lastTitle, code = lastTyped;
  const exact = challenge && challenge.getTitle() === title && challenge.getCodeSnippet() === code;
  const note = exact ? '' : '(Your text did not match the snippet exactly, so this is what YOUR code does.)\n\n';
  outEl.textContent = 'Compiling and running...';
  showScreen('output');
  const result = await CodeRunner.run(title, code);
  const failed = result.startsWith('COMPILE ERROR') || result.startsWith('Could not') ||
    result.includes('[Program ended with an error') || result.includes('[Stopped:');
  outEl.style.color = failed ? C.PINK : C.TEXT;
  outEl.textContent = note + result;
}

showScreen('menu');
