/**
 * The skill vocabulary used to read postings and profiles the same way.
 *
 * Extraction only ever reports a skill whose name (or a listed alias) appears
 * in the text itself — it does not infer "React" from "front-end". Words that
 * are also ordinary English ("Go", "Swift", "Spark", "Excel", "Unity") are
 * matched case-sensitively, and "Go" only where it reads as a language
 * ("Java, Go, Rust", "written in Go").
 */

type SkillDef = {
  name: string;
  /** Regex sources; matched with word boundaries. */
  patterns: string[];
  /** Match case-sensitively (for names that are also common words). */
  caseSensitive?: boolean;
};

const s = (
  name: string,
  patterns: string[] = [escape(name)],
  caseSensitive = false,
): SkillDef => ({
  name,
  patterns,
  caseSensitive,
});

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const SKILLS: SkillDef[] = [
  // languages
  s("TypeScript"),
  s("JavaScript", ["JavaScript", "ES6"]),
  s("Python"),
  s("Java", ["Java(?!\\s*Script)"], true),
  s("Kotlin"),
  s("Scala", ["Scala"], true),
  // "Go" only inside an enumeration or after "in/with/using": "Go deep",
  // "Go-to-market" and a sentence-initial "Go" are English, not the language.
  s(
    "Go",
    [
      "Golang",
      "(?<=[,/(]\\s?|\\b(?:and|or|in|with|using)\\s)Go\\b(?![- ](?:deep|to|beyond|further|live))",
      "Go(?=\\s?[,/)]|\\s(?:and|or)\\s)",
    ],
    true,
  ),
  s("Rust", ["Rust"], true),
  s("Ruby", ["Ruby"], true),
  s("PHP"),
  s("C++", ["C\\+\\+"]),
  s("C#", ["C#"]),
  s(".NET", ["\\.NET", "dotnet"]),
  s("Swift", ["Swift(?!ly)"], true),
  s("Objective-C", ["Objective-C"]),
  s("Elixir"),
  s("Solidity"),
  s("SQL", ["SQL"]),
  s("Bash", ["Bash", "shell scripting"]),
  // front end
  s("React", ["React(?!\\s*Native)(?:\\.js|JS)?"], true),
  s("React Native"),
  s("Next.js", ["Next\\.js", "NextJS"]),
  s("Vue", ["Vue(?:\\.js)?"], true),
  s("Nuxt", ["Nuxt(?:\\.js)?"]),
  s("Angular", ["Angular(?:JS)?"], true),
  s("Svelte", ["Svelte(?:Kit)?"]),
  s("Redux"),
  s("HTML", ["HTML5?"]),
  s("CSS", ["CSS3?"]),
  s("Tailwind CSS", ["Tailwind(?:\\s*CSS)?"]),
  s("Sass", ["Sass", "SCSS"], true),
  s("Webpack"),
  s("Vite", ["Vite"], true),
  s("Accessibility", ["accessibility", "WCAG", "a11y"]),
  // back end and data
  s("Node.js", ["Node(?:\\.js|JS)"]),
  s("Express", ["Express(?:\\.js)"]),
  s("Django"),
  s("Flask", ["Flask"], true),
  s("FastAPI"),
  s("Ruby on Rails", ["Ruby on Rails", "Rails"]),
  s("Spring Boot"),
  s("Laravel"),
  s("GraphQL"),
  s("REST APIs", ["REST(?:ful)?\\s*APIs?", "RESTful"]),
  s("gRPC"),
  s("Microservices", ["micro-?services"]),
  s("PostgreSQL", ["PostgreSQL", "Postgres"]),
  s("MySQL"),
  s("MongoDB", ["MongoDB", "Mongo"]),
  s("Redis"),
  s("Elasticsearch", ["Elasticsearch", "Elastic Search"]),
  s("Kafka"),
  s("RabbitMQ"),
  s("Prisma", ["Prisma"], true),
  s("Supabase"),
  s("Firebase"),
  // cloud and ops
  s("AWS", ["AWS", "Amazon Web Services"]),
  s("Google Cloud", ["GCP", "Google Cloud"]),
  s("Azure", ["Azure"], true),
  s("Docker"),
  s("Kubernetes", ["Kubernetes", "K8s"]),
  s("Terraform"),
  s("CI/CD", ["CI/CD", "CI\\s*/\\s*CD", "continuous integration"]),
  s("Linux"),
  s("Git", ["Git(?!Hub|Lab)"], true),
  s("GitHub Actions"),
  s("Observability", ["observability"]),
  // data and ML
  s("Spark", ["(?:Apache\\s+)?Spark"], true),
  s("Airflow"),
  s("dbt", ["dbt"], true),
  s("Snowflake", ["Snowflake"], true),
  s("BigQuery"),
  s("Pandas", ["pandas"]),
  s("NumPy"),
  s("PyTorch"),
  s("TensorFlow"),
  s("Machine Learning", ["machine learning", "ML engineering"]),
  s("LLMs", ["LLMs?", "large language models?"]),
  s("NLP", ["NLP", "natural language processing"]),
  s("Computer Vision", ["computer vision"]),
  s("Data Analysis", ["data analysis", "data analytics"]),
  s("Tableau"),
  s("Looker", ["Looker"], true),
  s("Power BI"),
  s("Excel", ["Excel"], true),
  s("Statistics", ["statistics", "statistical"]),
  // mobile and platforms
  s("iOS", ["iOS"], true),
  s("Android", ["Android"], true),
  s("Flutter"),
  s("Unity", ["Unity"], true),
  // testing
  s("Jest"),
  s("Cypress", ["Cypress"], true),
  s("Playwright"),
  s("Selenium"),
  s("Testing", ["unit test(?:s|ing)?", "test automation", "automated testing"]),
  // design and product
  s("Figma"),
  s("Sketch", ["Sketch"], true),
  // "user experience" alone is usually a product goal, not a design skill.
  s("UX Design", ["UX(?:\\s*design)?"], true),
  s("UI Design", ["UI design", "interface design"]),
  s("Design Systems", ["design systems?"]),
  s("User Research", ["user research"]),
  s("Product Management", ["product management"]),
  s("Agile", ["Agile", "Scrum", "Kanban"], true),
  s("Jira", ["Jira", "JIRA"]),
  // business
  s("Salesforce", ["Salesforce(?!\\s+Ventures)"]),
  s("HubSpot"),
  s("SEO", ["SEO"], true),
  s("Google Analytics"),
  s("Project Management", ["project management"]),
  s("Stakeholder Management", ["stakeholder management"]),
  s("Financial Modeling", ["financial model(?:l)?ing"]),
];

const compiled = SKILLS.map((def) => ({
  name: def.name,
  regex: new RegExp(
    def.patterns.map((p) => `(?<![\\w+#.])(?:${p})(?![\\w+#])`).join("|"),
    def.caseSensitive ? "m" : "im",
  ),
}));

/**
 * Skills whose names appear in the text. `exclude` drops names that would be
 * misleading in context — above all the employer's own name ("Figma" in every
 * Figma posting is not a skill requirement).
 */
export function extractSkills(text: string, exclude: string[] = []): string[] {
  const skip = new Set(exclude.map((value) => value.toLowerCase().trim()));
  const found: string[] = [];
  for (const { name, regex } of compiled) {
    if (skip.has(name.toLowerCase())) continue;
    if (regex.test(text)) found.push(name);
  }
  return found;
}

/**
 * Map free-typed skill names ("postgres", "NextJS", "k8s") onto the canonical
 * vocabulary so a profile and a posting can be compared. Unknown names are
 * returned trimmed and unchanged — nothing is dropped or invented.
 */
export function canonicalSkill(name: string): string {
  const value = name.trim();
  for (const { name: canonical, regex } of compiled) {
    // Only a whole-string match counts as the same skill.
    const m = value.match(regex);
    if (m && m[0].trim().length === value.length) return canonical;
    if (canonical.toLowerCase() === value.toLowerCase()) return canonical;
  }
  return value;
}

export function skillKey(name: string) {
  return canonicalSkill(name).toLowerCase();
}
