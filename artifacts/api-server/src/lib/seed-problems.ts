import type {
  ProblemExample,
  ProblemTestCase,
  ProblemStarter,
} from "@workspace/db";

export type SeedProblem = {
  slug: string;
  title: string;
  difficulty: string;
  statement: string;
  inputDescription: string;
  outputDescription: string;
  constraints: string;
  examples: ProblemExample[];
  publicTestCases: ProblemTestCase[];
  hiddenTestCases: ProblemTestCase[];
  tags: string[];
  starterCode: ProblemStarter;
  xpReward: number;
  eloReward: number;
};

const jsStarterIO = `// stdin-аас өгөгдөл уншиж stdout руу хэвлэнэ
const lines = inputLines;
// Энд кодоо бичнэ үү
print(/* үр дүн */);
`;

const pyStarter = `# stdin-аас өгөгдөл уншиж stdout руу хэвлэнэ
# Python ажиллуулагч одоогоор бэлэн биш
print()
`;

export const SEED_PROBLEMS: SeedProblem[] = [
  {
    slug: "two-sum-numbers",
    title: "Хоёр тооны нийлбэр",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн хоёр бүхэл тооны нийлбэрийг ол. Энэ нь үндсэн оролт-гаралтын дасгал юм.",
    inputDescription: "Нэг мөрөнд хоосон зайгаар тусгаарлагдсан хоёр бүхэл тоо a, b өгөгдөнө.",
    outputDescription: "a + b нийлбэрийг хэвлэнэ.",
    constraints: "-10^9 ≤ a, b ≤ 10^9",
    examples: [
      { input: "2 3", output: "5" },
      { input: "10 -4", output: "6" },
    ],
    publicTestCases: [
      { input: "2 3", expectedOutput: "5" },
      { input: "10 -4", expectedOutput: "6" },
    ],
    hiddenTestCases: [
      { input: "0 0", expectedOutput: "0" },
      { input: "100 250", expectedOutput: "350" },
      { input: "-5 5", expectedOutput: "0" },
    ],
    tags: ["math", "io"],
    starterCode: {
      javascript: `const [a, b] = inputLines[0].split(' ').map(Number);\nprint(a + b);\n`,
      python: pyStarter,
    },
    xpReward: 30,
    eloReward: 0,
  },
  {
    slug: "max-of-three",
    title: "Гурван тооны хамгийн их утга",
    difficulty: "Хялбар",
    statement: "Гурван бүхэл тооноос хамгийн их утгыг ол.",
    inputDescription: "Нэг мөрөнд хоосон зайгаар тусгаарлагдсан гурван тоо.",
    outputDescription: "Хамгийн их тоог хэвлэнэ.",
    constraints: "-10^6 ≤ a, b, c ≤ 10^6",
    examples: [
      { input: "1 2 3", output: "3" },
      { input: "10 5 7", output: "10" },
    ],
    publicTestCases: [
      { input: "1 2 3", expectedOutput: "3" },
      { input: "10 5 7", expectedOutput: "10" },
    ],
    hiddenTestCases: [
      { input: "-1 -2 -3", expectedOutput: "-1" },
      { input: "100 100 99", expectedOutput: "100" },
    ],
    tags: ["math", "conditionals"],
    starterCode: {
      javascript: `const nums = inputLines[0].split(' ').map(Number);\nprint(Math.max(...nums));\n`,
      python: pyStarter,
    },
    xpReward: 30,
    eloReward: 0,
  },
  {
    slug: "even-or-odd",
    title: "Тэгш эсвэл сондгой",
    difficulty: "Хялбар",
    statement: "Өгөгдсөн тоо тэгш бол 'тэгш', сондгой бол 'сондгой' гэж хэвлэ.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "тэгш эсвэл сондгой.",
    constraints: "-10^9 ≤ n ≤ 10^9",
    examples: [
      { input: "4", output: "тэгш" },
      { input: "7", output: "сондгой" },
    ],
    publicTestCases: [
      { input: "4", expectedOutput: "тэгш" },
      { input: "7", expectedOutput: "сондгой" },
    ],
    hiddenTestCases: [
      { input: "0", expectedOutput: "тэгш" },
      { input: "-3", expectedOutput: "сондгой" },
      { input: "100", expectedOutput: "тэгш" },
    ],
    tags: ["math", "conditionals"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nprint(n % 2 === 0 ? 'тэгш' : 'сондгой');\n`,
      python: pyStarter,
    },
    xpReward: 30,
    eloReward: 0,
  },
  {
    slug: "string-reverse",
    title: "Тэмдэгт мөрийг эргүүлэх",
    difficulty: "Хялбар",
    statement: "Өгөгдсөн тэмдэгт мөрийг урвуу дарааллаар хэвлэ.",
    inputDescription: "Нэг тэмдэгт мөр.",
    outputDescription: "Эргүүлсэн тэмдэгт мөр.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "hello", output: "olleh" },
      { input: "сайн", output: "найс" },
    ],
    publicTestCases: [
      { input: "hello", expectedOutput: "olleh" },
      { input: "abc", expectedOutput: "cba" },
    ],
    hiddenTestCases: [
      { input: "code", expectedOutput: "edoc" },
      { input: "a", expectedOutput: "a" },
    ],
    tags: ["strings"],
    starterCode: {
      javascript: `print([...inputLines[0]].reverse().join(''));\n`,
      python: pyStarter,
    },
    xpReward: 40,
    eloReward: 0,
  },
  {
    slug: "factorial",
    title: "Факториал",
    difficulty: "Хялбар",
    statement: "n тооны факториал n!-ийг ол.",
    inputDescription: "0 ≤ n ≤ 15.",
    outputDescription: "n!-ийн утга.",
    constraints: "0 ≤ n ≤ 15",
    examples: [
      { input: "5", output: "120" },
      { input: "0", output: "1" },
    ],
    publicTestCases: [
      { input: "5", expectedOutput: "120" },
      { input: "0", expectedOutput: "1" },
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "10", expectedOutput: "3628800" },
      { input: "7", expectedOutput: "5040" },
    ],
    tags: ["math", "recursion"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nlet f = 1;\nfor (let i = 2; i <= n; i++) f *= i;\nprint(f);\n`,
      python: pyStarter,
    },
    xpReward: 40,
    eloReward: 0,
  },
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "Хялбар",
    statement:
      "1-ээс n хүртэлх тоонуудыг хэвлэ. 3-т хуваагдвал 'Fizz', 5-д хуваагдвал 'Buzz', хоёуланд нь хуваагдвал 'FizzBuzz' гэж хэвлэ.",
    inputDescription: "n нэг бүхэл тоо.",
    outputDescription: "Мөр бүрт нэг утга.",
    constraints: "1 ≤ n ≤ 100",
    examples: [
      { input: "5", output: "1\n2\nFizz\n4\nBuzz" },
    ],
    publicTestCases: [
      { input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz" },
      {
        input: "15",
        expectedOutput:
          "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
      },
    ],
    hiddenTestCases: [
      { input: "3", expectedOutput: "1\n2\nFizz" },
      { input: "1", expectedOutput: "1" },
    ],
    tags: ["loops", "conditionals"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nfor (let i = 1; i <= n; i++) {\n  if (i % 15 === 0) print('FizzBuzz');\n  else if (i % 3 === 0) print('Fizz');\n  else if (i % 5 === 0) print('Buzz');\n  else print(i);\n}\n`,
      python: pyStarter,
    },
    xpReward: 50,
    eloReward: 0,
  },
  {
    slug: "array-sum",
    title: "Массивын нийлбэр",
    difficulty: "Хялбар",
    statement: "n ширхэг бүхэл тооны нийлбэрийг ол.",
    inputDescription:
      "Эхний мөрөнд n. Дараагийн мөрөнд хоосон зайгаар тусгаарлагдсан n тоо.",
    outputDescription: "Нийлбэрийг хэвлэ.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [
      { input: "5\n1 2 3 4 5", output: "15" },
    ],
    publicTestCases: [
      { input: "5\n1 2 3 4 5", expectedOutput: "15" },
      { input: "3\n10 -5 7", expectedOutput: "12" },
    ],
    hiddenTestCases: [
      { input: "1\n42", expectedOutput: "42" },
      { input: "4\n0 0 0 0", expectedOutput: "0" },
    ],
    tags: ["arrays", "math"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nconst arr = inputLines[1].split(' ').map(Number);\nprint(arr.reduce((s, x) => s + x, 0));\n`,
      python: pyStarter,
    },
    xpReward: 40,
    eloReward: 0,
  },
  {
    slug: "palindrome-check",
    title: "Палиндром шалгах",
    difficulty: "Дунд",
    statement:
      "Өгөгдсөн тэмдэгт мөр палиндром эсэхийг шалга. Тийм бол 'тийм', үгүй бол 'үгүй' гэж хэвлэ.",
    inputDescription: "Нэг тэмдэгт мөр.",
    outputDescription: "тийм эсвэл үгүй.",
    constraints: "1 ≤ |s| ≤ 10^4",
    examples: [
      { input: "racecar", output: "тийм" },
      { input: "hello", output: "үгүй" },
    ],
    publicTestCases: [
      { input: "racecar", expectedOutput: "тийм" },
      { input: "hello", expectedOutput: "үгүй" },
    ],
    hiddenTestCases: [
      { input: "abba", expectedOutput: "тийм" },
      { input: "abc", expectedOutput: "үгүй" },
      { input: "a", expectedOutput: "тийм" },
    ],
    tags: ["strings"],
    starterCode: {
      javascript: `const s = inputLines[0];\nconst r = [...s].reverse().join('');\nprint(s === r ? 'тийм' : 'үгүй');\n`,
      python: pyStarter,
    },
    xpReward: 60,
    eloReward: 0,
  },
  {
    slug: "fibonacci",
    title: "Фибоначчийн n-р гишүүн",
    difficulty: "Дунд",
    statement: "Фибоначчийн дарааллын n-р гишүүнийг ол. F(0)=0, F(1)=1.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "F(n).",
    constraints: "0 ≤ n ≤ 50",
    examples: [
      { input: "10", output: "55" },
      { input: "0", output: "0" },
    ],
    publicTestCases: [
      { input: "10", expectedOutput: "55" },
      { input: "0", expectedOutput: "0" },
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "20", expectedOutput: "6765" },
      { input: "30", expectedOutput: "832040" },
    ],
    tags: ["dp", "math"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nlet a = 0, b = 1;\nfor (let i = 0; i < n; i++) [a, b] = [b, a + b];\nprint(a);\n`,
      python: pyStarter,
    },
    xpReward: 60,
    eloReward: 0,
  },
  {
    slug: "count-vowels",
    title: "Эгшгүүдийг тоолох",
    difficulty: "Дунд",
    statement:
      "Англи цагаан толгойн эгшиг үсгүүдийг тоолно (a, e, i, o, u). Том жижиг үсгийг ялгахгүй.",
    inputDescription: "Нэг тэмдэгт мөр.",
    outputDescription: "Эгшгүүдийн тоо.",
    constraints: "1 ≤ |s| ≤ 10^4",
    examples: [
      { input: "Hello World", output: "3" },
      { input: "abcdef", output: "2" },
    ],
    publicTestCases: [
      { input: "Hello World", expectedOutput: "3" },
      { input: "abcdef", expectedOutput: "2" },
    ],
    hiddenTestCases: [
      { input: "AEIOU", expectedOutput: "5" },
      { input: "xyz", expectedOutput: "0" },
    ],
    tags: ["strings"],
    starterCode: {
      javascript: `const s = inputLines[0].toLowerCase();\nlet c = 0;\nfor (const ch of s) if ('aeiou'.includes(ch)) c++;\nprint(c);\n`,
      python: pyStarter,
    },
    xpReward: 60,
    eloReward: 0,
  },
  {
    slug: "gcd",
    title: "Их ерөнхий хуваагч",
    difficulty: "Дунд",
    statement: "Хоёр бүхэл тооны их ерөнхий хуваагчийг (GCD) ол.",
    inputDescription: "Нэг мөрөнд a, b хоёр тоо.",
    outputDescription: "GCD(a, b).",
    constraints: "1 ≤ a, b ≤ 10^9",
    examples: [
      { input: "12 18", output: "6" },
      { input: "100 75", output: "25" },
    ],
    publicTestCases: [
      { input: "12 18", expectedOutput: "6" },
      { input: "100 75", expectedOutput: "25" },
    ],
    hiddenTestCases: [
      { input: "1 1", expectedOutput: "1" },
      { input: "17 23", expectedOutput: "1" },
      { input: "1000 100", expectedOutput: "100" },
    ],
    tags: ["math"],
    starterCode: {
      javascript: `let [a, b] = inputLines[0].split(' ').map(Number);\nwhile (b) [a, b] = [b, a % b];\nprint(a);\n`,
      python: pyStarter,
    },
    xpReward: 70,
    eloReward: 0,
  },
  {
    slug: "is-prime",
    title: "Анхны тоо мөн эсэх",
    difficulty: "Дунд",
    statement:
      "Өгөгдсөн тоо анхны тоо мөн эсэхийг шалга. Тийм бол 'тийм', үгүй бол 'үгүй'.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "тийм эсвэл үгүй.",
    constraints: "1 ≤ n ≤ 10^7",
    examples: [
      { input: "7", output: "тийм" },
      { input: "10", output: "үгүй" },
    ],
    publicTestCases: [
      { input: "7", expectedOutput: "тийм" },
      { input: "10", expectedOutput: "үгүй" },
    ],
    hiddenTestCases: [
      { input: "2", expectedOutput: "тийм" },
      { input: "1", expectedOutput: "үгүй" },
      { input: "97", expectedOutput: "тийм" },
    ],
    tags: ["math"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nlet isPrime = n > 1;\nfor (let i = 2; i * i <= n; i++) if (n % i === 0) { isPrime = false; break; }\nprint(isPrime ? 'тийм' : 'үгүй');\n`,
      python: pyStarter,
    },
    xpReward: 70,
    eloReward: 0,
  },
  {
    slug: "max-subarray",
    title: "Хамгийн их дэд массивын нийлбэр",
    difficulty: "Хэцүү",
    statement:
      "n ширхэг бүхэл тооноос тогтсон массивын дараалсан элементүүдийн хамгийн их нийлбэрийг ол (Кадане алгоритм).",
    inputDescription:
      "Эхний мөрөнд n. Дараагийн мөрөнд хоосон зайгаар тусгаарлагдсан n тоо.",
    outputDescription: "Хамгийн их дэд нийлбэр.",
    constraints: "1 ≤ n ≤ 10^5, -10^4 ≤ a[i] ≤ 10^4",
    examples: [
      {
        input: "9\n-2 1 -3 4 -1 2 1 -5 4",
        output: "6",
        explanation: "[4, -1, 2, 1] → 6",
      },
    ],
    publicTestCases: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { input: "5\n1 2 3 4 5", expectedOutput: "15" },
    ],
    hiddenTestCases: [
      { input: "1\n-5", expectedOutput: "-5" },
      { input: "4\n-1 -2 -3 -4", expectedOutput: "-1" },
      { input: "3\n5 -1 5", expectedOutput: "9" },
    ],
    tags: ["dp", "arrays"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nconst arr = inputLines[1].split(' ').map(Number);\nlet best = arr[0], cur = arr[0];\nfor (let i = 1; i < n; i++) {\n  cur = Math.max(arr[i], cur + arr[i]);\n  best = Math.max(best, cur);\n}\nprint(best);\n`,
      python: pyStarter,
    },
    xpReward: 100,
    eloReward: 0,
  },
  {
    slug: "binary-search",
    title: "Хоёртын хайлт",
    difficulty: "Хэцүү",
    statement:
      "Эрэмбэлэгдсэн массиваас x утгын байршлыг (0-c эхэлсэн индекс) ол. Олдохгүй бол -1.",
    inputDescription:
      "Эхний мөрөнд n, x. Дараагийн мөрөнд эрэмбэлэгдсэн n тоо.",
    outputDescription: "Индекс эсвэл -1.",
    constraints: "1 ≤ n ≤ 10^6",
    examples: [
      { input: "5 3\n1 2 3 4 5", output: "2" },
      { input: "5 6\n1 2 3 4 5", output: "-1" },
    ],
    publicTestCases: [
      { input: "5 3\n1 2 3 4 5", expectedOutput: "2" },
      { input: "5 6\n1 2 3 4 5", expectedOutput: "-1" },
    ],
    hiddenTestCases: [
      { input: "1 1\n1", expectedOutput: "0" },
      { input: "4 4\n1 2 3 4", expectedOutput: "3" },
    ],
    tags: ["binary-search", "arrays"],
    starterCode: {
      javascript: `const [n, x] = inputLines[0].split(' ').map(Number);\nconst arr = inputLines[1].split(' ').map(Number);\nlet lo = 0, hi = n - 1, ans = -1;\nwhile (lo <= hi) {\n  const mid = (lo + hi) >> 1;\n  if (arr[mid] === x) { ans = mid; break; }\n  else if (arr[mid] < x) lo = mid + 1;\n  else hi = mid - 1;\n}\nprint(ans);\n`,
      python: pyStarter,
    },
    xpReward: 100,
    eloReward: 0,
  },
  {
    slug: "matrix-transpose",
    title: "Матрицын транспоз",
    difficulty: "Хэцүү",
    statement: "n × m матрицын транспозийг хэвлэ.",
    inputDescription:
      "Эхний мөрөнд n, m. Дараагийн n мөр бүрт m тоо.",
    outputDescription: "m × n хэмжээтэй транспоз.",
    constraints: "1 ≤ n, m ≤ 50",
    examples: [
      { input: "2 3\n1 2 3\n4 5 6", output: "1 4\n2 5\n3 6" },
    ],
    publicTestCases: [
      { input: "2 3\n1 2 3\n4 5 6", expectedOutput: "1 4\n2 5\n3 6" },
    ],
    hiddenTestCases: [
      { input: "1 1\n7", expectedOutput: "7" },
      { input: "2 2\n1 2\n3 4", expectedOutput: "1 3\n2 4" },
    ],
    tags: ["matrix", "arrays"],
    starterCode: {
      javascript: `const [n, m] = inputLines[0].split(' ').map(Number);\nconst mat = [];\nfor (let i = 0; i < n; i++) mat.push(inputLines[1 + i].split(' ').map(Number));\nfor (let j = 0; j < m; j++) {\n  const row = [];\n  for (let i = 0; i < n; i++) row.push(mat[i][j]);\n  print(row.join(' '));\n}\n`,
      python: pyStarter,
    },
    xpReward: 120,
    eloReward: 0,
  },
  {
    slug: "longest-word",
    title: "Хамгийн урт үг",
    difficulty: "Дунд",
    statement: "Өгөгдсөн өгүүлбэрээс хамгийн урт үгийг ол.",
    inputDescription: "Нэг өгүүлбэр (зайгаар тусгаарлагдсан үгс).",
    outputDescription: "Хамгийн урт үг.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "монгол улс минь", output: "монгол" },
      { input: "i love coding", output: "coding" },
    ],
    publicTestCases: [
      { input: "монгол улс минь", expectedOutput: "монгол" },
      { input: "i love coding", expectedOutput: "coding" },
    ],
    hiddenTestCases: [
      { input: "a bb ccc", expectedOutput: "ccc" },
      { input: "code", expectedOutput: "code" },
    ],
    tags: ["strings"],
    starterCode: {
      javascript: `const words = inputLines[0].split(' ');\nlet best = '';\nfor (const w of words) if ([...w].length > [...best].length) best = w;\nprint(best);\n`,
      python: pyStarter,
    },
    xpReward: 60,
    eloReward: 0,
  },
  {
    slug: "power-of-two",
    title: "Хоёрын зэрэг",
    difficulty: "Хялбар",
    statement: "n тоо 2-ын зэрэг мөн эсэхийг шалга.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "тийм эсвэл үгүй.",
    constraints: "1 ≤ n ≤ 10^18",
    examples: [
      { input: "8", output: "тийм" },
      { input: "10", output: "үгүй" },
    ],
    publicTestCases: [
      { input: "8", expectedOutput: "тийм" },
      { input: "10", expectedOutput: "үгүй" },
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "тийм" },
      { input: "1024", expectedOutput: "тийм" },
      { input: "0", expectedOutput: "үгүй" },
    ],
    tags: ["bit-manipulation", "math"],
    starterCode: {
      javascript: `const n = BigInt(inputLines[0]);\nprint(n > 0n && (n & (n - 1n)) === 0n ? 'тийм' : 'үгүй');\n`,
      python: pyStarter,
    },
    xpReward: 50,
    eloReward: 0,
  },
  {
    slug: "count-divisors",
    title: "Хуваагчдын тоо",
    difficulty: "Дунд",
    statement: "n тооны хуваагчдын тоог ол.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "Хуваагчдын тоо.",
    constraints: "1 ≤ n ≤ 10^7",
    examples: [
      { input: "12", output: "6" },
      { input: "13", output: "2" },
    ],
    publicTestCases: [
      { input: "12", expectedOutput: "6" },
      { input: "13", expectedOutput: "2" },
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "100", expectedOutput: "9" },
    ],
    tags: ["math"],
    starterCode: {
      javascript: `const n = Number(inputLines[0]);\nlet count = 0;\nfor (let i = 1; i * i <= n; i++) {\n  if (n % i === 0) {\n    count++;\n    if (i !== n / i) count++;\n  }\n}\nprint(count);\n`,
      python: pyStarter,
    },
    xpReward: 70,
    eloReward: 0,
  },
  {
    slug: "anagram-check",
    title: "Анаграм шалгах",
    difficulty: "Дунд",
    statement:
      "Хоёр тэмдэгт мөр анаграм мөн эсэхийг шалга (адил үсгүүд янз бүрийн дарааллаар).",
    inputDescription: "Хоёр тэмдэгт мөр тусдаа мөрөнд.",
    outputDescription: "тийм эсвэл үгүй.",
    constraints: "1 ≤ |s| ≤ 10^4",
    examples: [
      { input: "listen\nsilent", output: "тийм" },
      { input: "hello\nworld", output: "үгүй" },
    ],
    publicTestCases: [
      { input: "listen\nsilent", expectedOutput: "тийм" },
      { input: "hello\nworld", expectedOutput: "үгүй" },
    ],
    hiddenTestCases: [
      { input: "abc\ncba", expectedOutput: "тийм" },
      { input: "ab\nabc", expectedOutput: "үгүй" },
    ],
    tags: ["strings", "hashing"],
    starterCode: {
      javascript: `const a = inputLines[0].split('').sort().join('');\nconst b = inputLines[1].split('').sort().join('');\nprint(a === b ? 'тийм' : 'үгүй');\n`,
      python: pyStarter,
    },
    xpReward: 80,
    eloReward: 0,
  },
  {
    slug: "string-replace",
    title: "Үсэг солих",
    difficulty: "Хялбар",
    statement: "Тэмдэгт мөр доторх бүх 'a' үсгийг '*' тэмдэгээр сольж хэвлэ.",
    inputDescription: "Нэг тэмдэгт мөр.",
    outputDescription: "Сольсон тэмдэгт мөр.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "banana", output: "b*n*n*" },
      { input: "code", output: "code" },
    ],
    publicTestCases: [
      { input: "banana", expectedOutput: "b*n*n*" },
      { input: "code", expectedOutput: "code" },
    ],
    hiddenTestCases: [
      { input: "aaa", expectedOutput: "***" },
      { input: "test", expectedOutput: "test" },
    ],
    tags: ["strings"],
    starterCode: {
      javascript: `print(inputLines[0].split('a').join('*'));\n`,
      python: pyStarter,
    },
    xpReward: 30,
    eloReward: 0,
  },
];
