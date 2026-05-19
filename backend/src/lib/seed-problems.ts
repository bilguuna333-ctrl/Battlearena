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

// Each problem has exactly 10 well-structured test cases:
//   - 3 public  (visible to user, used for "examples"/quick check)
//   - 7 hidden  (used for grading)
// They are ordered from easy/edge cases to harder/larger inputs to
// give a clear, predictable difficulty curve.

const jsStarter: ProblemStarter = {
  javascript: `// stdin-аас өгөгдөл уншиж stdout руу хэвлэнэ
const lines = inputLines;
// Энд кодоо бичнэ үү
print(/* үр дүн */);
`,
  typescript: `// stdin-аас өгөгдөл уншиж stdout руу хэвлэнэ
// inputLines: string[]  — нэг нэг мөр
// print(...args): хэвлэх функц
const lines: string[] = inputLines;
// Энд кодоо бичнэ үү
print(/* үр дүн */);
`,
  python: `# stdin-аас өгөгдөл уншиж stdout руу хэвлэнэ
import sys
data = sys.stdin.read().split()
# Энд кодоо бичнэ үү
print()
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Энд кодоо бичнэ үү
    return 0;
}
`,
};

function tc(input: string, expectedOutput: string): ProblemTestCase {
  return { input, expectedOutput };
}

export const SEED_PROBLEMS: SeedProblem[] = [
  // 1. Two-sum-numbers ---------------------------------------------------
  {
    slug: "two-sum-numbers",
    title: "Хоёр тооны нийлбэр",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн хоёр бүхэл тооны нийлбэрийг ол. Үндсэн оролт-гаралтын дасгал.",
    inputDescription:
      "Нэг мөрөнд зайгаар тусгаарлагдсан хоёр бүхэл тоо a, b.",
    outputDescription: "a + b нийлбэрийг хэвлэнэ.",
    constraints: "-10^9 ≤ a, b ≤ 10^9",
    examples: [
      { input: "2 3", output: "5" },
      { input: "10 -4", output: "6" },
    ],
    publicTestCases: [
      tc("2 3", "5"),
      tc("10 -4", "6"),
      tc("0 0", "0"),
    ],
    hiddenTestCases: [
      tc("-1 1", "0"),
      tc("100 200", "300"),
      tc("-50 -50", "-100"),
      tc("1 -1000", "-999"),
      tc("999999999 1", "1000000000"),
      tc("-999999999 -1", "-1000000000"),
      tc("123456 654321", "777777"),
    ],
    tags: ["arithmetic", "intro"],
    starterCode: jsStarter,
    xpReward: 25,
    eloReward: 5,
  },

  // 2. Max of three -------------------------------------------------------
  {
    slug: "max-of-three",
    title: "Гурван тооны их нь",
    difficulty: "Хялбар",
    statement: "Гурван бүхэл тооны хамгийн ихийг ол.",
    inputDescription: "Нэг мөрөнд гурван бүхэл тоо a, b, c.",
    outputDescription: "Хамгийн их утгыг хэвлэнэ.",
    constraints: "-10^9 ≤ a, b, c ≤ 10^9",
    examples: [
      { input: "1 2 3", output: "3" },
      { input: "5 5 5", output: "5" },
    ],
    publicTestCases: [
      tc("1 2 3", "3"),
      tc("3 2 1", "3"),
      tc("5 5 5", "5"),
    ],
    hiddenTestCases: [
      tc("-1 -2 -3", "-1"),
      tc("0 0 -1", "0"),
      tc("100 50 75", "100"),
      tc("7 7 1", "7"),
      tc("-100 100 0", "100"),
      tc("999999999 1 -1", "999999999"),
      tc("4 4 5", "5"),
    ],
    tags: ["conditionals", "intro"],
    starterCode: jsStarter,
    xpReward: 25,
    eloReward: 5,
  },

  // 3. Even or odd --------------------------------------------------------
  {
    slug: "even-or-odd",
    title: "Тэгш сондгой",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн бүхэл тоо тэгш бол 'even', сондгой бол 'odd' гэж хэвлэнэ.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "'even' эсвэл 'odd' гэсэн үг.",
    constraints: "-10^9 ≤ n ≤ 10^9",
    examples: [
      { input: "4", output: "even" },
      { input: "7", output: "odd" },
    ],
    publicTestCases: [
      tc("4", "even"),
      tc("7", "odd"),
      tc("0", "even"),
    ],
    hiddenTestCases: [
      tc("1", "odd"),
      tc("-2", "even"),
      tc("-3", "odd"),
      tc("100", "even"),
      tc("999999999", "odd"),
      tc("1000000000", "even"),
      tc("123456789", "odd"),
    ],
    tags: ["conditionals", "intro"],
    starterCode: jsStarter,
    xpReward: 25,
    eloReward: 5,
  },

  // 4. String reverse -----------------------------------------------------
  {
    slug: "string-reverse",
    title: "Текстийг урвуулах",
    difficulty: "Хялбар",
    statement: "Өгөгдсөн текстийг үсгээр нь урвуулж хэвлэнэ.",
    inputDescription: "Нэг мөр текст s (хоосон зайгүй).",
    outputDescription: "Урвуулсан текст.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "hello", output: "olleh" },
      { input: "abc", output: "cba" },
    ],
    publicTestCases: [
      tc("hello", "olleh"),
      tc("abc", "cba"),
      tc("a", "a"),
    ],
    hiddenTestCases: [
      tc("ab", "ba"),
      tc("racecar", "racecar"),
      tc("12345", "54321"),
      tc("OpenAI", "IAnepO"),
      tc("aaaa", "aaaa"),
      tc("ab12cd", "dc21ba"),
      tc("monGoliA", "AiloGnom"),
    ],
    tags: ["strings"],
    starterCode: jsStarter,
    xpReward: 25,
    eloReward: 5,
  },

  // 5. Factorial ----------------------------------------------------------
  {
    slug: "factorial",
    title: "Факториал",
    difficulty: "Хялбар",
    statement: "Өгөгдсөн n тооны n! утгыг ол.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "n! утга.",
    constraints: "0 ≤ n ≤ 12",
    examples: [
      { input: "5", output: "120" },
      { input: "0", output: "1" },
    ],
    publicTestCases: [
      tc("0", "1"),
      tc("1", "1"),
      tc("5", "120"),
    ],
    hiddenTestCases: [
      tc("2", "2"),
      tc("3", "6"),
      tc("4", "24"),
      tc("6", "720"),
      tc("7", "5040"),
      tc("10", "3628800"),
      tc("12", "479001600"),
    ],
    tags: ["math", "loops"],
    starterCode: jsStarter,
    xpReward: 30,
    eloReward: 8,
  },

  // 6. FizzBuzz -----------------------------------------------------------
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "Хялбар",
    statement:
      "1-ээс n хүртэлх тоонуудыг хэвлэнэ. 3-т хуваагдвал 'Fizz', 5-т 'Buzz', 15-т 'FizzBuzz'.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "n мөр гаралт.",
    constraints: "1 ≤ n ≤ 100",
    examples: [
      {
        input: "5",
        output: "1\n2\nFizz\n4\nBuzz",
      },
    ],
    publicTestCases: [
      tc("3", "1\n2\nFizz"),
      tc("5", "1\n2\nFizz\n4\nBuzz"),
      tc("1", "1"),
    ],
    hiddenTestCases: [
      tc("2", "1\n2"),
      tc("6", "1\n2\nFizz\n4\nBuzz\nFizz"),
      tc(
        "10",
        "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz",
      ),
      tc(
        "15",
        "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
      ),
      tc("4", "1\n2\nFizz\n4"),
      tc(
        "16",
        "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16",
      ),
      tc("9", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz"),
    ],
    tags: ["loops", "conditionals", "classic"],
    starterCode: jsStarter,
    xpReward: 35,
    eloReward: 10,
  },

  // 7. Array sum ----------------------------------------------------------
  {
    slug: "array-sum",
    title: "Массивын нийлбэр",
    difficulty: "Хялбар",
    statement: "Өгөгдсөн n ширхэг бүхэл тооны нийлбэрийг ол.",
    inputDescription:
      "Эхний мөрөнд n. Хоёр дахь мөрөнд зайгаар тусгаарлагдсан n тоо.",
    outputDescription: "Тоонуудын нийлбэр.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [
      { input: "5\n1 2 3 4 5", output: "15" },
      { input: "3\n-1 -2 -3", output: "-6" },
    ],
    publicTestCases: [
      tc("5\n1 2 3 4 5", "15"),
      tc("3\n-1 -2 -3", "-6"),
      tc("1\n42", "42"),
    ],
    hiddenTestCases: [
      tc("2\n0 0", "0"),
      tc("4\n10 20 30 40", "100"),
      tc("5\n1 -1 1 -1 1", "1"),
      tc("6\n1 1 1 1 1 1", "6"),
      tc("3\n100 200 300", "600"),
      tc("5\n-5 -10 -15 -20 -25", "-75"),
      tc("8\n1 2 3 4 5 6 7 8", "36"),
    ],
    tags: ["arrays", "loops"],
    starterCode: jsStarter,
    xpReward: 30,
    eloReward: 8,
  },

  // 8. Palindrome check ---------------------------------------------------
  {
    slug: "palindrome-check",
    title: "Палиндром мөн эсэх",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн текст палиндром (урвуу талаасаа адил уншигдах) мөн эсэхийг шалгана. 'yes' эсвэл 'no'.",
    inputDescription: "Нэг мөр текст s.",
    outputDescription: "'yes' эсвэл 'no'.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "racecar", output: "yes" },
      { input: "hello", output: "no" },
    ],
    publicTestCases: [
      tc("racecar", "yes"),
      tc("hello", "no"),
      tc("a", "yes"),
    ],
    hiddenTestCases: [
      tc("ab", "no"),
      tc("aba", "yes"),
      tc("abba", "yes"),
      tc("abcba", "yes"),
      tc("abcdef", "no"),
      tc("12321", "yes"),
      tc("12345", "no"),
    ],
    tags: ["strings"],
    starterCode: jsStarter,
    xpReward: 35,
    eloReward: 10,
  },

  // 9. Fibonacci ----------------------------------------------------------
  {
    slug: "fibonacci",
    title: "Фибоначчи дараалал",
    difficulty: "Дунд",
    statement:
      "Фибоначчи дарааллын n-р гишүүнийг ол. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "F(n) утга.",
    constraints: "0 ≤ n ≤ 30",
    examples: [
      { input: "0", output: "0" },
      { input: "10", output: "55" },
    ],
    publicTestCases: [
      tc("0", "0"),
      tc("1", "1"),
      tc("10", "55"),
    ],
    hiddenTestCases: [
      tc("2", "1"),
      tc("3", "2"),
      tc("5", "5"),
      tc("7", "13"),
      tc("15", "610"),
      tc("20", "6765"),
      tc("30", "832040"),
    ],
    tags: ["math", "recursion"],
    starterCode: jsStarter,
    xpReward: 50,
    eloReward: 15,
  },

  // 10. Count vowels ------------------------------------------------------
  {
    slug: "count-vowels",
    title: "Эгшгийг тоолох",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн англи текстэд буй эгшгийг (a, e, i, o, u) тоолж хэвлэ. Жижиг үсэг гэж үзнэ.",
    inputDescription: "Нэг мөр текст s.",
    outputDescription: "Эгшгийн тоо.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "hello", output: "2" },
      { input: "rhythm", output: "0" },
    ],
    publicTestCases: [
      tc("hello", "2"),
      tc("rhythm", "0"),
      tc("aeiou", "5"),
    ],
    hiddenTestCases: [
      tc("a", "1"),
      tc("xyz", "0"),
      tc("programming", "3"),
      tc("queue", "4"),
      tc("javascript", "3"),
      tc("aaaaa", "5"),
      tc("the quick brown fox", "5"),
    ],
    tags: ["strings"],
    starterCode: jsStarter,
    xpReward: 35,
    eloReward: 10,
  },

  // 11. GCD ---------------------------------------------------------------
  {
    slug: "gcd",
    title: "Хамгийн их ерөнхий хуваагч",
    difficulty: "Дунд",
    statement: "Хоёр эерэг бүхэл тооны хамгийн их ерөнхий хуваагчийг ол.",
    inputDescription: "Нэг мөрөнд a, b хоёр тоо.",
    outputDescription: "GCD(a, b) утга.",
    constraints: "1 ≤ a, b ≤ 10^9",
    examples: [
      { input: "12 18", output: "6" },
      { input: "7 5", output: "1" },
    ],
    publicTestCases: [
      tc("12 18", "6"),
      tc("7 5", "1"),
      tc("100 25", "25"),
    ],
    hiddenTestCases: [
      tc("1 1", "1"),
      tc("48 36", "12"),
      tc("17 13", "1"),
      tc("1000 100", "100"),
      tc("81 27", "27"),
      tc("123456 789012", "12"),
      tc("999999999 3", "3"),
    ],
    tags: ["math", "algorithms"],
    starterCode: jsStarter,
    xpReward: 55,
    eloReward: 18,
  },

  // 12. Is prime ----------------------------------------------------------
  {
    slug: "is-prime",
    title: "Анхны тоо мөн үү",
    difficulty: "Дунд",
    statement: "Өгөгдсөн n тоо анхны тоо бол 'yes', үгүй бол 'no' хэвлэнэ.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "'yes' эсвэл 'no'.",
    constraints: "1 ≤ n ≤ 10^6",
    examples: [
      { input: "7", output: "yes" },
      { input: "10", output: "no" },
    ],
    publicTestCases: [
      tc("7", "yes"),
      tc("10", "no"),
      tc("2", "yes"),
    ],
    hiddenTestCases: [
      tc("1", "no"),
      tc("3", "yes"),
      tc("4", "no"),
      tc("13", "yes"),
      tc("25", "no"),
      tc("97", "yes"),
      tc("100", "no"),
    ],
    tags: ["math"],
    starterCode: jsStarter,
    xpReward: 50,
    eloReward: 15,
  },

  // 13. Max subarray (Kadane) --------------------------------------------
  {
    slug: "max-subarray",
    title: "Хамгийн их дэд массив",
    difficulty: "Хүнд",
    statement:
      "Өгөгдсөн n тооноос хамгийн их нийлбэртэй залгаа дэд массивын нийлбэрийг ол (Kadane).",
    inputDescription:
      "Эхний мөрөнд n. Хоёр дахь мөрөнд n тоо зайгаар тусгаарлагдан.",
    outputDescription: "Хамгийн их дэд массивын нийлбэр.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
      { input: "1\n5", output: "5" },
    ],
    publicTestCases: [
      tc("9\n-2 1 -3 4 -1 2 1 -5 4", "6"),
      tc("1\n5", "5"),
      tc("3\n-1 -2 -3", "-1"),
    ],
    hiddenTestCases: [
      tc("5\n1 2 3 4 5", "15"),
      tc("4\n-1 -2 -3 -4", "-1"),
      tc("5\n5 -1 5 -1 5", "13"),
      tc("2\n-5 -2", "-2"),
      tc("6\n3 -1 4 -1 5 -9", "10"),
      tc("4\n2 -1 2 -1", "3"),
      tc("1\n-100", "-100"),
    ],
    tags: ["arrays", "dp", "algorithms"],
    starterCode: jsStarter,
    xpReward: 90,
    eloReward: 30,
  },

  // 14. Binary search -----------------------------------------------------
  {
    slug: "binary-search",
    title: "Хоёртын хайлт",
    difficulty: "Дунд",
    statement:
      "Өгөгдсөн өсөх дарааллаар эрэмбэлэгдсэн n ширхэг тооноос x тоог олж 0-ээс эхэлсэн индексийг хэвлэ. Олдохгүй бол -1.",
    inputDescription:
      "Эхний мөрөнд n, x. Хоёр дахь мөрөнд n тоо өсөх дарааллаар.",
    outputDescription: "Индекс эсвэл -1.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [
      { input: "5 3\n1 2 3 4 5", output: "2" },
      { input: "5 6\n1 2 3 4 5", output: "-1" },
    ],
    publicTestCases: [
      tc("5 3\n1 2 3 4 5", "2"),
      tc("5 6\n1 2 3 4 5", "-1"),
      tc("1 7\n7", "0"),
    ],
    hiddenTestCases: [
      tc("4 1\n1 2 3 4", "0"),
      tc("4 4\n1 2 3 4", "3"),
      tc("6 5\n1 3 5 7 9 11", "2"),
      tc("6 4\n1 3 5 7 9 11", "-1"),
      tc("3 100\n10 50 100", "2"),
      tc("5 50\n10 20 30 40 50", "4"),
      tc("7 25\n5 15 25 35 45 55 65", "2"),
    ],
    tags: ["arrays", "binary-search", "algorithms"],
    starterCode: jsStarter,
    xpReward: 70,
    eloReward: 22,
  },

  // 15. Matrix transpose --------------------------------------------------
  {
    slug: "matrix-transpose",
    title: "Матрицын транспоз",
    difficulty: "Дунд",
    statement: "n×m матрицын транспозыг хэвлэ.",
    inputDescription:
      "Эхний мөрөнд n, m. Дараагийн n мөрөнд тус бүр m тоотой матриц.",
    outputDescription:
      "m×n хэмжээтэй транспоз матриц. Мөр бүр зайгаар тусгаарлагдсан.",
    constraints: "1 ≤ n, m ≤ 50",
    examples: [
      { input: "2 3\n1 2 3\n4 5 6", output: "1 4\n2 5\n3 6" },
    ],
    publicTestCases: [
      tc("2 3\n1 2 3\n4 5 6", "1 4\n2 5\n3 6"),
      tc("1 1\n7", "7"),
      tc("2 2\n1 2\n3 4", "1 3\n2 4"),
    ],
    hiddenTestCases: [
      tc("3 1\n1\n2\n3", "1 2 3"),
      tc("1 3\n1 2 3", "1\n2\n3"),
      tc(
        "3 3\n1 2 3\n4 5 6\n7 8 9",
        "1 4 7\n2 5 8\n3 6 9",
      ),
      tc("2 2\n0 0\n0 0", "0 0\n0 0"),
      tc(
        "3 2\n1 2\n3 4\n5 6",
        "1 3 5\n2 4 6",
      ),
      tc("1 5\n5 4 3 2 1", "5\n4\n3\n2\n1"),
      tc("4 1\n10\n20\n30\n40", "10 20 30 40"),
    ],
    tags: ["arrays", "matrix"],
    starterCode: jsStarter,
    xpReward: 70,
    eloReward: 22,
  },

  // 16. Longest word ------------------------------------------------------
  {
    slug: "longest-word",
    title: "Хамгийн урт үг",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн өгүүлбэрээс хамгийн урт үгийг ол. Тэнцүү урттай хэд байвал эхнийхийг сонгоно.",
    inputDescription: "Нэг мөр өгүүлбэр.",
    outputDescription: "Хамгийн урт үг.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "the quick brown fox", output: "quick" },
      { input: "hello world", output: "hello" },
    ],
    publicTestCases: [
      tc("the quick brown fox", "quick"),
      tc("hello world", "hello"),
      tc("a", "a"),
    ],
    hiddenTestCases: [
      tc("ab cd ef", "ab"),
      tc("javascript is fun", "javascript"),
      tc("one two three four", "three"),
      tc("a bb ccc dddd", "dddd"),
      tc("apple banana", "banana"),
      tc("i love coding", "coding"),
      tc("short and longerword", "longerword"),
    ],
    tags: ["strings"],
    starterCode: jsStarter,
    xpReward: 35,
    eloReward: 10,
  },

  // 17. Power of two ------------------------------------------------------
  {
    slug: "power-of-two",
    title: "Хоёрын зэрэг мөн үү",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн эерэг бүхэл тоо n нь 2-ын яг зэрэг бол 'yes', үгүй бол 'no'.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "'yes' эсвэл 'no'.",
    constraints: "1 ≤ n ≤ 10^9",
    examples: [
      { input: "8", output: "yes" },
      { input: "12", output: "no" },
    ],
    publicTestCases: [
      tc("8", "yes"),
      tc("12", "no"),
      tc("1", "yes"),
    ],
    hiddenTestCases: [
      tc("2", "yes"),
      tc("3", "no"),
      tc("16", "yes"),
      tc("31", "no"),
      tc("1024", "yes"),
      tc("1023", "no"),
      tc("536870912", "yes"),
    ],
    tags: ["math", "bits"],
    starterCode: jsStarter,
    xpReward: 40,
    eloReward: 12,
  },

  // 18. Count divisors ----------------------------------------------------
  {
    slug: "count-divisors",
    title: "Хуваагчдын тоо",
    difficulty: "Дунд",
    statement: "Өгөгдсөн n эерэг тооны бүх эерэг хуваагчдын тоог ол.",
    inputDescription: "Нэг бүхэл тоо n.",
    outputDescription: "Хуваагчдын тоо.",
    constraints: "1 ≤ n ≤ 10^6",
    examples: [
      { input: "6", output: "4" },
      { input: "10", output: "4" },
    ],
    publicTestCases: [
      tc("6", "4"),
      tc("10", "4"),
      tc("1", "1"),
    ],
    hiddenTestCases: [
      tc("2", "2"),
      tc("12", "6"),
      tc("16", "5"),
      tc("100", "9"),
      tc("28", "6"),
      tc("36", "9"),
      tc("997", "2"),
    ],
    tags: ["math"],
    starterCode: jsStarter,
    xpReward: 55,
    eloReward: 18,
  },

  // 19. Anagram check -----------------------------------------------------
  {
    slug: "anagram-check",
    title: "Анаграмм мөн эсэх",
    difficulty: "Дунд",
    statement:
      "Хоёр текст нь яг ижил үсгүүдээс бүтсэн (анаграмм) бол 'yes', үгүй бол 'no'.",
    inputDescription: "Хоёр мөрөнд хоёр текст a, b.",
    outputDescription: "'yes' эсвэл 'no'.",
    constraints: "1 ≤ |a|, |b| ≤ 1000",
    examples: [
      { input: "listen\nsilent", output: "yes" },
      { input: "hello\nworld", output: "no" },
    ],
    publicTestCases: [
      tc("listen\nsilent", "yes"),
      tc("hello\nworld", "no"),
      tc("a\na", "yes"),
    ],
    hiddenTestCases: [
      tc("ab\nba", "yes"),
      tc("abc\ncab", "yes"),
      tc("abc\nabd", "no"),
      tc("rail safety\nfairy tales", "no"),
      tc("evil\nvile", "yes"),
      tc("dusty\nstudy", "yes"),
      tc("aabb\nabbb", "no"),
    ],
    tags: ["strings"],
    starterCode: jsStarter,
    xpReward: 60,
    eloReward: 20,
  },

  // 20. String replace ----------------------------------------------------
  {
    slug: "string-replace",
    title: "Үсэг солих",
    difficulty: "Хялбар",
    statement:
      "Өгөгдсөн текст дэх бүх 'a' үсгийг '*' тэмдэгтээр сольж хэвлэнэ.",
    inputDescription: "Нэг мөр текст s.",
    outputDescription: "Сольсон текст.",
    constraints: "1 ≤ |s| ≤ 1000",
    examples: [
      { input: "banana", output: "b*n*n*" },
      { input: "hello", output: "hello" },
    ],
    publicTestCases: [
      tc("banana", "b*n*n*"),
      tc("hello", "hello"),
      tc("a", "*"),
    ],
    hiddenTestCases: [
      tc("aaaa", "****"),
      tc("apple", "*pple"),
      tc("xyz", "xyz"),
      tc("alphabet", "*lph*bet"),
      tc("data", "d*t*"),
      tc("javascript", "j*v*script"),
      tc("antarctica", "*nt*rctic*"),
    ],
    tags: ["strings"],
    starterCode: jsStarter,
    xpReward: 30,
    eloReward: 8,
  },
];

for (let i = 21; i <= 130; i++) {
  SEED_PROBLEMS.push({
    slug: `problem-${i}`,
    title: `Дасгал ${i}`,
    difficulty: i % 5 === 0 ? "Хүнд" : i % 3 === 0 ? "Дунд" : "Хялбар",
    statement: `${i}-р дасгалын тайлбар. Өгөгдсөн N тоог 2 дахин өсгө.`,
    inputDescription: "Нэг бүхэл тоо N.",
    outputDescription: "N * 2",
    constraints: "-10^9 <= N <= 10^9",
    examples: [
      { input: "5", output: "10" },
    ],
    publicTestCases: [
      tc("5", "10"),
      tc("10", "20"),
      tc("0", "0"),
    ],
    hiddenTestCases: [
      tc("-5", "-10"),
      tc("100", "200"),
      tc("-100", "-200"),
      tc("123", "246"),
      tc("999", "1998"),
      tc("50", "100"),
      tc("1", "2"),
    ],
    tags: ["math", "intro"],
    starterCode: jsStarter,
    xpReward: i % 5 === 0 ? 80 : i % 3 === 0 ? 50 : 25,
    eloReward: i % 5 === 0 ? 25 : i % 3 === 0 ? 15 : 5,
  });
}

