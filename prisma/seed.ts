/**
 * ELARA seed data.
 *
 * LOCAL DEVELOPMENT ONLY. Never run this against a production database.
 *
 * Two things live here, and they are kept distinct:
 *
 *   1. A sample job catalogue — invented companies and postings. Every row is
 *      flagged `isDemo`, and job discovery never shows demo rows: live jobs
 *      come only from real providers (`npm run jobs:sync`). The samples exist
 *      so the demo account's saved jobs and applications have something to
 *      point at.
 *   2. One demo account with a complete career profile, so the workspace can be
 *      seen full rather than empty. Ordinary accounts are untouched by this.
 *
 * Re-runnable: jobs upsert on (source, externalId) and the demo user upserts on
 * email, so `npm run db:seed` twice is the same as running it once.
 */
import {
  PrismaClient,
  type EmploymentType,
  type LocationType,
  type SalaryPeriod,
  type Seniority,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_EMAIL = "amara@elara.dev";
const DEMO_PASSWORD = "elara-demo-2026";

/** Days ago → Date, so postings always look freshly listed. */
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const year = (y: number, m = 1) => new Date(Date.UTC(y, m - 1, 1));

type JobSeed = {
  externalId: string;
  title: string;
  company: string;
  companyDomain: string;
  location: string;
  locationType: LocationType;
  employmentType: EmploymentType;
  seniority: Seniority;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: SalaryPeriod;
  postedDaysAgo: number;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  benefits: string[];
};

const JOBS: JobSeed[] = [
  {
    externalId: "norwind-frontend",
    title: "Front-end engineer",
    company: "Norwind",
    companyDomain: "norwind.pt",
    location: "Lisbon, Portugal",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 48000,
    salaryMax: 62000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 2,
    summary:
      "Own the shared interface layer four product teams build on, and keep it fast and accessible as it grows.",
    description:
      "Norwind builds scheduling software for maritime logistics. Our four product teams ship against one shared component library, and we are looking for someone to take responsibility for it — not just to add components, but to decide what belongs in it, keep the documentation honest, and help teams migrate when something has to change.\n\nYou would work alongside two designers and report to the engineering lead. We deploy several times a day and review each other's work closely.",
    responsibilities: [
      "Maintain and extend the shared component library used across four products",
      "Write and keep the usage documentation teams actually read",
      "Review interface work from product teams and raise the accessibility bar",
      "Lead migrations when a component has to change shape",
    ],
    requirements: [
      "Two or more years writing TypeScript and React in production",
      "Experience with a design system, whether you built it or consumed it",
      "A working knowledge of WCAG and how to test against it",
      "Comfortable reading a Figma file and asking the right questions about it",
    ],
    skills: [
      "TypeScript",
      "React",
      "Design systems",
      "Accessibility",
      "CSS",
      "Storybook",
    ],
    benefits: [
      "Two remote days a week",
      "Annual learning budget of €1,200",
      "26 days of leave",
    ],
  },
  {
    externalId: "halden-product-web",
    title: "Product engineer, web",
    company: "Halden Labs",
    companyDomain: "haldenlabs.io",
    location: "Remote — EU timezones",
    locationType: "REMOTE",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 55000,
    salaryMax: 70000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 4,
    summary:
      "Small team, whole features. You will take a problem from the first conversation through to what ships.",
    description:
      "Halden Labs makes tooling for environmental monitoring teams. We are eleven people, six of them engineers, and everyone works across the stack.\n\nWe do not have product managers. Engineers talk to the people using the product, decide what to build with a designer, and ship it. If you want a clean specification handed to you, this will frustrate you. If you want to own the whole problem, it works well.",
    responsibilities: [
      "Take features from problem statement to production",
      "Talk directly to the researchers and field teams who use the product",
      "Keep the Postgres schema sensible as the product grows",
      "Share the on-call rota (roughly one week in six)",
    ],
    requirements: [
      "Three or more years building web products end to end",
      "Comfortable in both React and a server-side runtime, ideally Node",
      "You can design a relational schema and explain your choices",
      "Overlap with European working hours",
    ],
    skills: ["React", "TypeScript", "Node", "Postgres", "Product thinking"],
    benefits: [
      "Fully remote with a yearly team week",
      "Four-day week in August",
      "Home office budget",
    ],
  },
  {
    externalId: "marrow-ui-systems",
    title: "UI engineer (design systems)",
    company: "Marrow",
    companyDomain: "marrow.studio",
    location: "Porto, Portugal",
    locationType: "ONSITE",
    employmentType: "CONTRACT",
    seniority: "MID",
    salaryMin: 300,
    salaryMax: 380,
    salaryCurrency: "EUR",
    salaryPeriod: "HOUR",
    postedDaysAgo: 7,
    summary:
      "Six-month contract rebuilding a healthcare client's interface library to meet accessibility requirements.",
    description:
      "Marrow is a fifteen-person studio. This engagement is with a healthcare client whose product has to meet EN 301 549 by the end of the year, and their component library is the thing standing in the way.\n\nThe work is an audit, then a rebuild of roughly forty components, then handover to their in-house team. You would be the second engineer on it, working with an accessibility specialist.",
    responsibilities: [
      "Audit the existing component library against EN 301 549",
      "Rebuild components with correct semantics and keyboard behaviour",
      "Write the migration path and hand it over to the client's team",
    ],
    requirements: [
      "Demonstrable accessibility work — audits, remediation or both",
      "Strong CSS, including a real understanding of focus management",
      "Able to work from the Porto studio three days a week",
    ],
    skills: ["Accessibility", "CSS", "Storybook", "TypeScript", "ARIA"],
    benefits: [
      "Day rate paid within 14 days",
      "Possible extension to 12 months",
    ],
  },
  {
    externalId: "pell-frontend-junior",
    title: "Junior front-end developer",
    company: "Pell & Co",
    companyDomain: "pellandco.com",
    location: "Lisbon, Portugal",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "ENTRY",
    salaryMin: 28000,
    salaryMax: 34000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 1,
    summary:
      "A first or second role, with a named mentor and work that is genuinely reviewed.",
    description:
      "Pell & Co builds booking and membership software for independent gyms and studios. We have taken on junior engineers every year for six years, and most are still here.\n\nYou would be paired with a senior engineer for your first three months. Expect your work to be reviewed carefully and for that to be the point — we would rather explain something twice than merge something nobody understands.",
    responsibilities: [
      "Build and maintain screens in the member-facing app",
      "Fix bugs reported by our support team, and write the test that keeps them fixed",
      "Take part in code review, including reviewing work more senior than yours",
    ],
    requirements: [
      "You can build something in React and explain how it works",
      "Some HTML and CSS you are proud of — coursework and side projects count",
      "Willing to ask questions early rather than stall quietly",
    ],
    skills: ["JavaScript", "React", "HTML", "CSS", "Git"],
    benefits: [
      "Named mentor for the first six months",
      "Conference ticket each year",
      "Gym membership, unsurprisingly",
    ],
  },
  {
    externalId: "tideglass-design-intern",
    title: "Product design intern",
    company: "Tideglass",
    companyDomain: "tideglass.co",
    location: "Remote — Europe",
    locationType: "REMOTE",
    employmentType: "INTERNSHIP",
    seniority: "INTERNSHIP",
    salaryMin: 1400,
    salaryMax: 1400,
    salaryCurrency: "EUR",
    salaryPeriod: "MONTH",
    postedDaysAgo: 3,
    summary:
      "Six months on a real product surface, with your own piece of work to take to a portfolio.",
    description:
      "Tideglass makes reading tools for people with dyslexia. Our design team is three people and we take one intern every six months.\n\nYou will not be resizing icons. You will be given a surface of the product — this cycle it is the reading settings — and asked to take it from research through to shipped, with a designer supporting you the whole way.",
    responsibilities: [
      "Run usability sessions with our reader community",
      "Design and iterate on the reading settings experience",
      "Work with engineers through implementation, not just handover",
    ],
    requirements: [
      "Currently studying, or within a year of finishing",
      "A portfolio showing how you think, not only what you made",
      "An interest in accessibility and reading",
    ],
    skills: ["Figma", "User research", "Prototyping", "Accessibility"],
    benefits: [
      "Paid internship",
      "Mentorship from a senior designer",
      "Reference on completion",
    ],
  },
  {
    externalId: "verso-data-analyst",
    title: "Data analyst",
    company: "Verso Analytics",
    companyDomain: "verso.io",
    location: "Madrid, Spain",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "ENTRY",
    salaryMin: 32000,
    salaryMax: 40000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 6,
    summary:
      "Answer questions the commercial team cannot answer themselves, and make the answers reusable.",
    description:
      "Verso works with independent retailers on pricing and stock. The analytics team is four people, sitting between the data engineers and the commercial team.\n\nMost of the job is turning a vague question into a specific one, answering it in SQL, and then deciding whether the answer deserves a dashboard or a one-off note.",
    responsibilities: [
      "Answer commercial questions with SQL against the warehouse",
      "Build and maintain the dashboards that earn their keep",
      "Write up findings so a non-analyst can act on them",
    ],
    requirements: [
      "Confident SQL, including window functions",
      "Some Python or R for the analysis that SQL cannot do cleanly",
      "You can explain a result to someone who does not want the methodology",
    ],
    skills: ["SQL", "Python", "dbt", "Data visualisation", "Excel"],
    benefits: ["Hybrid, two days in the Madrid office", "Private health cover"],
  },
  {
    externalId: "kestrel-ux-researcher",
    title: "UX researcher",
    company: "Kestrel Health",
    companyDomain: "kestrelhealth.eu",
    location: "Amsterdam, Netherlands",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 58000,
    salaryMax: 72000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 9,
    summary:
      "Research with clinicians and patients, in a domain where getting it wrong has consequences.",
    description:
      "Kestrel builds software for outpatient clinics across the Netherlands and Belgium. Research here means time in clinics, not just calls.\n\nWe are looking for someone who can hold the line on research quality under delivery pressure, and who is comfortable telling a product team that the thing they want to build is not the thing that will help.",
    responsibilities: [
      "Plan and run studies with clinicians, administrators and patients",
      "Maintain the research repository so findings are found again",
      "Sit with product teams through planning, not just at the end",
    ],
    requirements: [
      "Three or more years of applied UX research",
      "Both generative and evaluative methods",
      "Experience in a regulated or clinical setting is welcome, not required",
    ],
    skills: ["User research", "Interviewing", "Usability testing", "Synthesis"],
    benefits: [
      "Pension contribution",
      "Travel covered for clinic visits",
      "30 days of leave",
    ],
  },
  {
    externalId: "alder-backend",
    title: "Backend engineer",
    company: "Alder Systems",
    companyDomain: "aldersystems.dev",
    location: "Remote — Europe",
    locationType: "REMOTE",
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 75000,
    salaryMax: 95000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 5,
    summary:
      "Own the ingestion pipeline that everything else at Alder depends on.",
    description:
      "Alder processes sensor data for industrial sites. The ingestion pipeline takes in roughly two billion readings a day and it has outgrown its original design.\n\nThis role is about that pipeline: understanding what it does now, deciding what it should do, and getting there without a rewrite that stops the world.",
    responsibilities: [
      "Own the design and reliability of the ingestion pipeline",
      "Bring down processing cost per reading without losing fidelity",
      "Mentor two mid-level engineers on the platform team",
    ],
    requirements: [
      "Five or more years on backend systems at scale",
      "Deep familiarity with Postgres and at least one streaming system",
      "You have migrated a live system before and can talk about what went wrong",
    ],
    skills: ["Go", "Postgres", "Kafka", "Distributed systems", "Observability"],
    benefits: [
      "Fully remote",
      "Equity",
      "Four weeks of paid sabbatical every three years",
    ],
  },
  {
    externalId: "quayside-content-designer",
    title: "Content designer",
    company: "Quayside",
    companyDomain: "quayside.bank",
    location: "Dublin, Ireland",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 52000,
    salaryMax: 65000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 11,
    summary:
      "Write the words in a banking app that people read when they are worried.",
    description:
      "Quayside is a retail bank. Content design here is mostly about the difficult moments: a declined payment, a frozen card, a fraud check.\n\nYou would work across two product teams and own the tone guidance the rest of the organisation writes against.",
    responsibilities: [
      "Write and test interface copy across payments and card controls",
      "Own the content standards and keep them current",
      "Work with legal and compliance to make required wording readable",
    ],
    requirements: [
      "Three or more years of content design on digital products",
      "Comfortable defending a wording choice with evidence",
      "Experience in financial services or another regulated field",
    ],
    skills: ["Content design", "UX writing", "Plain language", "Figma"],
    benefits: ["Hybrid", "Pension", "Health insurance for you and a partner"],
  },
  {
    externalId: "northbeam-qa",
    title: "QA engineer",
    company: "Northbeam",
    companyDomain: "northbeam.se",
    location: "Stockholm, Sweden",
    locationType: "ONSITE",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 480000,
    salaryMax: 580000,
    salaryCurrency: "SEK",
    salaryPeriod: "YEAR",
    postedDaysAgo: 14,
    summary:
      "Build the automated coverage that lets a small team ship a safety-relevant product weekly.",
    description:
      "Northbeam makes control software for crane operators. A defect is not a cosmetic problem, so the test suite is load-bearing.\n\nWe want someone to own test strategy: what gets automated, what stays manual, and how quickly a failure tells us something useful.",
    responsibilities: [
      "Own the end-to-end test suite and its reliability",
      "Decide the automation strategy with the engineering leads",
      "Investigate and reproduce field-reported defects",
    ],
    requirements: [
      "Experience owning automated testing for a real product",
      "Playwright, Cypress or an equivalent",
      "Patience for flaky tests and the discipline to fix rather than retry them",
    ],
    skills: ["Playwright", "TypeScript", "Test strategy", "CI/CD"],
    benefits: [
      "Central Stockholm office",
      "Occupational pension",
      "Wellness allowance",
    ],
  },
  {
    externalId: "lumen-mobile",
    title: "Mobile engineer (React Native)",
    company: "Lumen Foundry",
    companyDomain: "lumenfoundry.app",
    location: "Barcelona, Spain",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 45000,
    salaryMax: 58000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 8,
    summary:
      "One codebase, two platforms, and a team that cares whether it feels native on both.",
    description:
      "Lumen Foundry builds field-reporting apps for conservation organisations. The app has to work on old Android hardware in places with no signal.\n\nOffline sync and performance on cheap devices are the interesting problems here.",
    responsibilities: [
      "Build and maintain features across iOS and Android",
      "Own the offline sync layer and its conflict handling",
      "Keep the app usable on five-year-old Android devices",
    ],
    requirements: [
      "Two or more years with React Native in production",
      "Real experience with offline-first data",
      "Willing to test on genuinely slow hardware",
    ],
    skills: ["React Native", "TypeScript", "SQLite", "Offline-first"],
    benefits: ["Hybrid in Barcelona", "Annual field trip to a partner site"],
  },
  {
    externalId: "rookfen-product-manager",
    title: "Product manager",
    company: "Rook & Fen",
    companyDomain: "rookandfen.com",
    location: "London, United Kingdom",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 70000,
    salaryMax: 88000,
    salaryCurrency: "GBP",
    salaryPeriod: "YEAR",
    postedDaysAgo: 12,
    summary:
      "Own a product area with real revenue attached and a team that will push back on you.",
    description:
      "Rook & Fen sells inventory software to independent bookshops. You would own the ordering area — the part customers touch daily and complain about loudly.\n\nOur engineers have opinions and our customers have phone numbers. Both are features of the job.",
    responsibilities: [
      "Own the strategy and roadmap for the ordering area",
      "Spend real time with booksellers, including in their shops",
      "Make the trade-off calls and write down why",
    ],
    requirements: [
      "Four or more years in product management on a B2B product",
      "You can read a database and write your own queries",
      "Comfortable saying no with a reason attached",
    ],
    skills: ["Product management", "SQL", "Discovery", "Roadmapping"],
    benefits: ["Hybrid, two days in London", "Book allowance", "Share options"],
  },
  {
    externalId: "blueharbour-devops",
    title: "Platform engineer",
    company: "Blue Harbour",
    companyDomain: "blueharbour.cloud",
    location: "Remote — Europe",
    locationType: "REMOTE",
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 72000,
    salaryMax: 90000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 10,
    summary:
      "Make deploying safe and boring for forty engineers across six teams.",
    description:
      "Blue Harbour runs logistics software for regional ports. The platform team is four people and exists to make the other teams faster.\n\nWe measure ourselves on how rarely other teams have to think about us.",
    responsibilities: [
      "Own the deployment pipeline and its guardrails",
      "Run the Kubernetes platform the product teams deploy onto",
      "Improve the time from merge to production",
    ],
    requirements: [
      "Five or more years in platform or infrastructure work",
      "Kubernetes and Terraform in production, not in a tutorial",
      "You treat other engineers as your users",
    ],
    skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Observability"],
    benefits: [
      "Fully remote",
      "On-call compensated separately",
      "Learning budget",
    ],
  },
  {
    externalId: "meridian-graduate-developer",
    title: "Graduate software developer",
    company: "Meridian Studio",
    companyDomain: "meridian.studio",
    location: "Coimbra, Portugal",
    locationType: "ONSITE",
    employmentType: "FULL_TIME",
    seniority: "ENTRY",
    salaryMin: 26000,
    salaryMax: 30000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 2,
    summary:
      "A structured first year: three rotations, a mentor, and work that ships.",
    description:
      "Meridian builds software for universities. The graduate programme runs twelve months across three teams — web, data and integrations — after which you choose where to stay.\n\nWe hire for curiosity rather than for a specific stack.",
    responsibilities: [
      "Rotate through three engineering teams over twelve months",
      "Ship real features on each rotation, with review",
      "Present what you learned at the end of each rotation",
    ],
    requirements: [
      "A degree finishing this year, or finished within the last two",
      "Programming ability in any language — we will teach the stack",
      "Based in or willing to move to Coimbra",
    ],
    skills: ["Java", "JavaScript", "SQL", "Git"],
    benefits: [
      "Structured rotations",
      "Assigned mentor",
      "Permanent role on completion",
    ],
  },
  {
    externalId: "tideglass-frontend-parttime",
    title: "Front-end developer (part time)",
    company: "Tideglass",
    companyDomain: "tideglass.co",
    location: "Remote — Europe",
    locationType: "REMOTE",
    employmentType: "PART_TIME",
    seniority: "MID",
    salaryMin: 30000,
    salaryMax: 36000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
    postedDaysAgo: 15,
    summary:
      "Three days a week on a reading product where typography and accessibility are the product.",
    description:
      "Tideglass makes reading tools for people with dyslexia. This is a genuine part-time role at three days a week, not a full-time job with a smaller salary.\n\nThe front end is where most of the product lives: text rendering, typography controls, and making all of it work with assistive technology.",
    responsibilities: [
      "Build and refine the reader interface",
      "Own the typography and rendering controls",
      "Test with screen readers as a matter of routine",
    ],
    requirements: [
      "Strong CSS, especially typography",
      "Experience testing with assistive technology",
      "Available three days a week, consistently",
    ],
    skills: ["CSS", "TypeScript", "Accessibility", "Typography", "React"],
    benefits: ["Genuine part-time hours", "Fully remote", "Pro-rata leave"],
  },
  {
    externalId: "verso-marketing-intern",
    title: "Marketing analyst intern",
    company: "Verso Analytics",
    companyDomain: "verso.io",
    location: "Madrid, Spain",
    locationType: "HYBRID",
    employmentType: "INTERNSHIP",
    seniority: "INTERNSHIP",
    salaryMin: 1100,
    salaryMax: 1100,
    salaryCurrency: "EUR",
    salaryPeriod: "MONTH",
    postedDaysAgo: 4,
    summary: "Six months working out which of our marketing actually works.",
    description:
      "You will sit with the growth team and spend most of your time in the data: which channels bring customers who stay, and which bring customers who leave in a month.\n\nWe will teach you the SQL you need. You need to bring the curiosity.",
    responsibilities: [
      "Track campaign performance and report on it weekly",
      "Build the attribution view the growth team works from",
      "Write up what you find, plainly",
    ],
    requirements: [
      "Studying business, economics, statistics or similar",
      "Comfortable in spreadsheets; willing to learn SQL",
      "Available for six months from spring",
    ],
    skills: ["Excel", "SQL", "Analytics", "Reporting"],
    benefits: [
      "Paid internship",
      "Two days in the Madrid office",
      "Possible permanent offer",
    ],
  },
];

async function seedJobs() {
  for (const job of JOBS) {
    const { postedDaysAgo, ...rest } = job;

    await db.job.upsert({
      where: {
        source_externalId: { source: "elara", externalId: job.externalId },
      },
      update: { ...rest, postedAt: daysAgo(postedDaysAgo) },
      create: {
        ...rest,
        source: "elara",
        postedAt: daysAgo(postedDaysAgo),
        applyUrl: `https://${job.companyDomain}/careers/${job.externalId}`,
        isDemo: true,
      },
    });
  }

  console.info(`  jobs        ${JOBS.length} listings`);
}

async function seedDemoAccount() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Amara Ilunga",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    select: { id: true },
  });

  // Rebuild the demo profile from scratch on every run, so editing it while
  // exploring never leaves the seed in a half-state.
  await db.profile.deleteMany({ where: { userId: user.id } });

  const profile = await db.profile.create({
    data: {
      userId: user.id,
      fullName: "Amara Ilunga",
      headline: "Front-end engineer — design systems",
      summary:
        "Front-end engineer with four years building and maintaining shared interface systems. Most comfortable at the seam between design and engineering — turning an agreed visual language into components other teams can move quickly with, and keeping them accessible as they grow.",
      location: "Lisbon, Portugal",
      phone: "+351 912 004 118",
      website: "https://amara.build",
      openToWork: true,
      links: {
        create: [
          {
            label: "GitHub",
            url: "https://github.com/amarailunga",
            sortIndex: 0,
          },
          { label: "Writing", url: "https://amara.build/notes", sortIndex: 1 },
        ],
      },
      experience: {
        create: [
          {
            company: "Norwind",
            role: "Front-end engineer",
            employmentType: "FULL_TIME",
            locationType: "HYBRID",
            location: "Lisbon",
            startDate: year(2023, 3),
            current: true,
            highlights: [
              "Rebuilt the shared component library adopted by four product teams, and wrote the migration guide they shipped against.",
              "Added visual regression checks to the release pipeline, moving UI review from screenshots in tickets to a gate on every pull request.",
              "Took the marketing site to WCAG 2.2 AA, including a keyboard-navigable booking flow.",
            ],
            skills: ["TypeScript", "React", "Design systems", "Accessibility"],
            sortIndex: 0,
          },
          {
            company: "Caldera Studio",
            role: "Junior developer",
            employmentType: "FULL_TIME",
            locationType: "ONSITE",
            location: "Porto",
            startDate: year(2021, 9),
            endDate: year(2023, 2),
            highlights: [
              "Shipped the booking flow used across 40 venue clients on web and tablet.",
              "Maintained the studio's internal React starter and its documentation.",
            ],
            skills: ["JavaScript", "React", "CSS"],
            sortIndex: 1,
          },
        ],
      },
      education: {
        create: [
          {
            school: "University of Porto",
            degree: "BSc",
            field: "Informatics Engineering",
            location: "Porto",
            startDate: year(2018, 9),
            endDate: year(2021, 7),
            sortIndex: 0,
          },
        ],
      },
      projects: {
        create: [
          {
            name: "Tideline",
            role: "Design and build",
            description:
              "An offline-first tide and swell reader for the Atlantic coast, built as a progressive web app.",
            highlights: [
              "Caches a fortnight of forecast data so the app stays useful without signal.",
            ],
            technologies: ["TypeScript", "React", "IndexedDB", "Workbox"],
            url: "https://amara.build/tideline",
            startDate: year(2024, 2),
            current: true,
            featured: true,
            sortIndex: 0,
          },
          {
            name: "Setwise",
            role: "Contributor",
            description:
              "An open-source type scale generator used by a handful of design teams.",
            highlights: [],
            technologies: ["TypeScript", "CSS"],
            repoUrl: "https://github.com/amarailunga/setwise",
            startDate: year(2023, 5),
            endDate: year(2023, 11),
            sortIndex: 1,
          },
        ],
      },
      skills: {
        create: [
          {
            name: "TypeScript",
            category: "Languages",
            level: "ADVANCED",
            sortIndex: 0,
          },
          {
            name: "JavaScript",
            category: "Languages",
            level: "ADVANCED",
            sortIndex: 1,
          },
          {
            name: "HTML",
            category: "Languages",
            level: "EXPERT",
            sortIndex: 2,
          },
          { name: "CSS", category: "Languages", level: "EXPERT", sortIndex: 3 },
          { name: "React", category: "Tools", level: "ADVANCED", sortIndex: 4 },
          {
            name: "Next.js",
            category: "Tools",
            level: "PROFICIENT",
            sortIndex: 5,
          },
          {
            name: "Figma",
            category: "Tools",
            level: "PROFICIENT",
            sortIndex: 6,
          },
          {
            name: "Storybook",
            category: "Tools",
            level: "ADVANCED",
            sortIndex: 7,
          },
          {
            name: "Design systems",
            category: "Practice",
            level: "ADVANCED",
            sortIndex: 8,
          },
          {
            name: "Accessibility",
            category: "Practice",
            level: "ADVANCED",
            sortIndex: 9,
          },
          {
            name: "Testing Library",
            category: "Practice",
            level: "PROFICIENT",
            sortIndex: 10,
          },
          {
            name: "Playwright",
            category: "Practice",
            level: "PROFICIENT",
            sortIndex: 11,
          },
        ],
      },
      languages: {
        create: [
          { name: "Portuguese", proficiency: "NATIVE", sortIndex: 0 },
          { name: "English", proficiency: "FLUENT", sortIndex: 1 },
          { name: "French", proficiency: "CONVERSATIONAL", sortIndex: 2 },
        ],
      },
      certifications: {
        create: [
          {
            name: "IAAP Web Accessibility Specialist",
            issuer: "IAAP",
            issueDate: year(2024, 6),
            sortIndex: 0,
          },
        ],
      },
      achievements: {
        create: [
          {
            title: "Speaker, Front-end Lisbon",
            description:
              "Talk on keeping a component library accessible as it grows.",
            date: year(2025, 4),
            sortIndex: 0,
          },
        ],
      },
    },
    select: { id: true },
  });

  return { userId: user.id, profileId: profile.id };
}

async function seedDemoWorkspace(userId: string) {
  await db.resume.deleteMany({ where: { userId } });
  await db.application.deleteMany({ where: { userId } });
  await db.savedJob.deleteMany({ where: { userId } });

  const sections = [
    { kind: "HEADER", title: "Header", visible: true },
    { kind: "SUMMARY", title: "Summary", visible: true },
    { kind: "EXPERIENCE", title: "Experience", visible: true },
    { kind: "PROJECTS", title: "Projects", visible: true },
    { kind: "EDUCATION", title: "Education", visible: true },
    { kind: "SKILLS", title: "Skills", visible: true },
    { kind: "CERTIFICATIONS", title: "Certifications", visible: true },
    { kind: "LANGUAGES", title: "Languages", visible: true },
    { kind: "ACHIEVEMENTS", title: "Achievements", visible: false },
    { kind: "LINKS", title: "Links", visible: false },
  ] as const;

  const norwind = await db.job.findFirst({
    where: { externalId: "norwind-frontend" },
    select: { id: true },
  });

  await db.resume.create({
    data: {
      userId,
      title: "Front-end engineer — general",
      templateKey: "editorial",
      accentKey: "cobalt",
      density: "regular",
      sections: {
        create: sections.map((section, index) => ({
          kind: section.kind,
          title: section.title,
          visible: section.visible,
          sortIndex: index,
        })),
      },
    },
  });

  await db.resume.create({
    data: {
      userId,
      title: "Design systems — Norwind",
      templateKey: "modern",
      accentKey: "ink",
      density: "compact",
      targetJobId: norwind?.id ?? null,
      sections: {
        create: sections.map((section, index) => ({
          kind: section.kind,
          title: section.title,
          visible: section.visible,
          sortIndex: index,
        })),
      },
    },
  });

  const jobs = await db.job.findMany({
    where: {
      externalId: {
        in: [
          "norwind-frontend",
          "halden-product-web",
          "marrow-ui-systems",
          "tideglass-frontend-parttime",
        ],
      },
    },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      applyUrl: true,
      externalId: true,
    },
  });

  const byKey = Object.fromEntries(jobs.map((job) => [job.externalId!, job]));

  await db.savedJob.createMany({
    data: jobs.map((job) => ({ userId, jobId: job.id })),
    skipDuplicates: true,
  });

  const pipeline: {
    key: string;
    status: "APPLIED" | "SCREENING" | "INTERVIEW";
    daysAgo: number;
    note: string;
    next?: { at: Date; label: string };
  }[] = [
    {
      key: "norwind-frontend",
      status: "APPLIED",
      daysAgo: 3,
      note: "Applied with the design-systems resume. Mentioned the Tideline project in the note field.",
    },
    {
      key: "halden-product-web",
      status: "SCREENING",
      daysAgo: 6,
      note: "Intro call with Sofie went well. They want to see something I have owned end to end.",
      next: { at: daysAgo(-2), label: "Technical call" },
    },
    {
      key: "marrow-ui-systems",
      status: "INTERVIEW",
      daysAgo: 9,
      note: "Second round is a live accessibility audit of a page they supply. Revise ARIA patterns.",
      next: { at: daysAgo(-4), label: "Panel interview" },
    },
  ];

  for (const entry of pipeline) {
    const job = byKey[entry.key];
    if (!job) continue;

    const application = await db.application.create({
      data: {
        userId,
        jobId: job.id,
        company: job.company,
        role: job.title,
        location: job.location,
        url: job.applyUrl,
        source: "ELARA",
        status: entry.status,
        appliedAt: daysAgo(entry.daysAgo),
        nextEventAt: entry.next?.at ?? null,
        nextEventLabel: entry.next?.label ?? null,
        notes: { create: { body: entry.note } },
      },
      select: { id: true },
    });

    // A believable history rather than a single event.
    const trail: ("SAVED" | "APPLIED" | "SCREENING" | "INTERVIEW")[] =
      entry.status === "APPLIED"
        ? ["SAVED", "APPLIED"]
        : entry.status === "SCREENING"
          ? ["SAVED", "APPLIED", "SCREENING"]
          : ["SAVED", "APPLIED", "SCREENING", "INTERVIEW"];

    await db.applicationEvent.createMany({
      data: trail.map((status, index) => ({
        applicationId: application.id,
        fromStatus: index === 0 ? null : trail[index - 1],
        toStatus: status,
        createdAt: daysAgo(entry.daysAgo - index * 2),
      })),
    });
  }

  console.info(
    "  demo user   profile, 2 resumes, 4 saved jobs, 3 applications",
  );
}

async function main() {
  console.info("\nSeeding ELARA\n");

  await seedJobs();
  const { userId } = await seedDemoAccount();
  await seedDemoWorkspace(userId);

  console.info(`\n  Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
