import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireSeedAccess } from "./_helpers";

/**
 * Edu starter catalogue seed.
 *
 * Design notes:
 * - Idempotent: every entity has a stable uniqueness key, so re-running never duplicates.
 * - Honest sourcing: only URLs that were already verified are stored as "verified".
 *   Everything else is catalogue metadata with sourceStatus "needs_url" — the entry
 *   exists, the official DBE/provincial link gets attached later (via admin addPaper
 *   or a future admin tool). We never invent URLs.
 * - Scale: papers are generated from SUBJECTS × YEARS × paper numbers, so growing the
 *   catalogue means adding a year or a subject row, not hand-writing hundreds of objects.
 */

// ─── Subject catalogue ────────────────────────────────────────────────────────
// paperNumbers = NSC exam papers for Grade 12. core = also seeded for Grades 10–11.
interface SubjectDef {
  code: string;
  name: string;
  paperNumbers: number[];
  language?: string; // language of the paper itself, defaults to English
  core?: boolean;
  hasAddendum?: boolean;
}

const SUBJECTS: SubjectDef[] = [
  { code: "mathematics",            name: "Mathematics",                          paperNumbers: [1, 2], core: true },
  { code: "mathematical-literacy",  name: "Mathematical Literacy",                paperNumbers: [1, 2], core: true },
  { code: "physical-sciences",      name: "Physical Sciences",                    paperNumbers: [1, 2], core: true },
  { code: "life-sciences",          name: "Life Sciences",                        paperNumbers: [1, 2], core: true },
  { code: "geography",              name: "Geography",                            paperNumbers: [1, 2], core: true },
  { code: "history",                name: "History",                              paperNumbers: [1, 2], hasAddendum: true },
  { code: "accounting",             name: "Accounting",                           paperNumbers: [1, 2], core: true },
  { code: "business-studies",       name: "Business Studies",                     paperNumbers: [1, 2] },
  { code: "economics",              name: "Economics",                            paperNumbers: [1, 2] },
  { code: "english-hl",             name: "English Home Language",                paperNumbers: [1, 2, 3], core: true },
  { code: "english-fal",            name: "English First Additional Language",    paperNumbers: [1, 2, 3], core: true },
  { code: "afrikaans-fal",          name: "Afrikaans First Additional Language",  paperNumbers: [1, 2, 3], language: "Afrikaans" },
  { code: "isizulu-hl",             name: "IsiZulu Home Language",                paperNumbers: [1, 2, 3], language: "isiZulu" },
  { code: "isixhosa-hl",            name: "IsiXhosa Home Language",               paperNumbers: [1, 2, 3], language: "isiXhosa" },
  { code: "life-orientation",       name: "Life Orientation",                     paperNumbers: [] }, // school-based assessment, no NSC paper seeded
  { code: "tourism",                name: "Tourism",                              paperNumbers: [1] },
  { code: "agricultural-sciences",  name: "Agricultural Sciences",                paperNumbers: [1, 2] },
  { code: "cat",                    name: "Computer Applications Technology",     paperNumbers: [1, 2] },
  { code: "information-technology", name: "Information Technology",               paperNumbers: [1, 2] },
  { code: "consumer-studies",       name: "Consumer Studies",                     paperNumbers: [1] },
  { code: "dramatic-arts",          name: "Dramatic Arts",                        paperNumbers: [1] },
  { code: "visual-arts",            name: "Visual Arts",                          paperNumbers: [1] },
];

const GRADE_12_YEARS = [2024, 2023, 2022];
const GRADE_10_11_YEARS = [2024, 2023];
const SESSION = "November";

// URLs already verified in the previous Edu seed (DBE NSC November 2024 downloads).
// Paper number intentionally omitted — we only store what we know is true.
const VERIFIED_2024_LINKS: { code: string; url: string }[] = [
  { code: "mathematics",       url: "https://www.education.gov.za/LinkClick.aspx?fileticket=8W2dAxBUTQA%3D&forcedownload=true&mid=13724&portalid=0&tabid=5193" },
  { code: "physical-sciences", url: "https://www.education.gov.za/LinkClick.aspx?fileticket=jKqWYBbucS4%3D&forcedownload=true&mid=13728&portalid=0&tabid=5193" },
  { code: "life-sciences",     url: "https://www.education.gov.za/LinkClick.aspx?fileticket=UH53U88PRPE%3D&forcedownload=true&mid=13722&portalid=0&tabid=5193" },
  { code: "geography",         url: "https://www.education.gov.za/LinkClick.aspx?fileticket=Hc8_CaQJpd4%3D&forcedownload=true&mid=13717&portalid=0&tabid=5193" },
  { code: "business-studies",  url: "https://www.education.gov.za/LinkClick.aspx?fileticket=VGv_B_A4kxA%3D&forcedownload=true&mid=13707&portalid=0&tabid=5193" },
  { code: "economics",         url: "https://www.education.gov.za/LinkClick.aspx?fileticket=gZ8YszYxrcI%3D&forcedownload=true&mid=13714&portalid=0&tabid=5193" },
];

type PaperType = "question_paper" | "memorandum" | "addendum" | "formula_sheet";

interface PaperSeed {
  code:         string;
  grade:        number;
  year:         number;
  session:      string;
  paperNumber?: number;
  language:     string;
  paperType:    PaperType;
  sourceName:   string;
  sourceStatus: "verified" | "needs_url";
  pdfUrl?:      string;
  tags:         string[];
}

function buildPaperCatalogue(): PaperSeed[] {
  const papers: PaperSeed[] = [];

  const push = (
    subject: SubjectDef, grade: number, year: number,
    paperType: PaperType, paperNumber: number | undefined, sourceName: string,
  ) => {
    papers.push({
      code:         subject.code,
      grade,
      year,
      session:      SESSION,
      paperNumber,
      language:     subject.language ?? "English",
      paperType,
      sourceName,
      sourceStatus: "needs_url",
      tags:         [grade === 12 ? "NSC" : "CAPS", `${SESSION} ${year}`],
    });
  };

  for (const subject of SUBJECTS) {
    // Grade 12 — full NSC exam sets
    for (const year of GRADE_12_YEARS) {
      for (const n of subject.paperNumbers) {
        push(subject, 12, year, "question_paper", n, "DBE NSC");
        push(subject, 12, year, "memorandum", n, "DBE NSC");
        if (subject.hasAddendum) push(subject, 12, year, "addendum", n, "DBE NSC");
      }
    }
    // Grades 10–11 — core subjects, provincial/DBE exemplar sets
    if (subject.core) {
      for (const grade of [10, 11]) {
        for (const year of GRADE_10_11_YEARS) {
          for (const n of subject.paperNumbers) {
            push(subject, grade, year, "question_paper", n, "DBE / Provincial");
            push(subject, grade, year, "memorandum", n, "DBE / Provincial");
          }
        }
      }
    }
  }

  // Verified DBE November 2024 Grade 12 download links (paper number unknown → stored without one)
  for (const link of VERIFIED_2024_LINKS) {
    const subject = SUBJECTS.find((s) => s.code === link.code)!;
    papers.push({
      code:         subject.code,
      grade:        12,
      year:         2024,
      session:      SESSION,
      paperNumber:  undefined,
      language:     "English",
      paperType:    "question_paper",
      sourceName:   "DBE NSC",
      sourceStatus: "verified",
      pdfUrl:       link.url,
      tags:         ["NSC", "November 2024", "Verified link"],
    });
  }

  return papers;
}

// ─── Study notes (original content written for Connex — not copied) ──────────
type NoteType =
  | "summary" | "formula_sheet" | "exam_tips" | "definitions"
  | "worked_examples" | "essay_guide" | "practical_guide";
type Difficulty = "beginner" | "normal" | "advanced";

interface NoteSeed {
  grade:       number;
  subjectCode: string;
  topic:       string;
  title:       string;
  noteType:    NoteType;
  difficulty:  Difficulty;
  content:     string;
  tags?:       string[];
}

const NOTES: NoteSeed[] = [
  {
    grade: 12, subjectCode: "mathematics", topic: "Calculus",
    title: "Differentiation rules you must know", noteType: "summary", difficulty: "normal",
    content:
      "FIRST PRINCIPLES\nf'(x) = lim h→0 [f(x+h) − f(x)] / h\nThe exam almost always has one first-principles question. Practise it until it is automatic.\n\nPOWER RULE\nIf f(x) = ax^n then f'(x) = n·ax^(n−1).\nBefore differentiating: split fractions, expand brackets, and rewrite surds and 1/x terms as powers (√x = x^½, 1/x² = x^−2).\n\nWHAT THE DERIVATIVE MEANS\n• Gradient of the tangent at a point\n• Rate of change\n• Used to find turning points: set f'(x) = 0\n\nCUBIC GRAPH STRATEGY\n1. y-intercept: x = 0\n2. x-intercepts: solve f(x) = 0 (factor theorem)\n3. Turning points: f'(x) = 0\n4. Shape: positive x³ coefficient rises to the right\n\nOPTIMISATION\nTranslate the story into a formula, differentiate, set to zero. Check that your answer makes sense (lengths can't be negative).",
    tags: ["derivatives", "first principles", "cubic graphs"],
  },
  {
    grade: 12, subjectCode: "mathematics", topic: "Functions",
    title: "Parabolas, hyperbolas and exponentials: what to read off", noteType: "summary", difficulty: "normal",
    content:
      "PARABOLA y = a(x − p)² + q\n• Turning point (p; q)\n• a > 0 smile, a < 0 frown\n• Axis of symmetry x = p\n• Range: y ≥ q or y ≤ q\n\nHYPERBOLA y = a/(x − p) + q\n• Asymptotes x = p and y = q\n• Domain x ≠ p, range y ≠ q\n\nEXPONENTIAL y = a·b^(x−p) + q\n• Horizontal asymptote y = q\n\nINVERSES\nSwap x and y, then solve for y. The graph of the inverse is the reflection in the line y = x. For y = x² restrict the domain (x ≥ 0 or x ≤ 0) so the inverse is a function.\n\nCOMMON QUESTIONS\n• Length of vertical line between two graphs: top minus bottom\n• 'For which x is f(x) > g(x)?': read where one graph is above the other\n• Average gradient between two points: (y₂ − y₁)/(x₂ − x₁)",
    tags: ["parabola", "hyperbola", "inverse"],
  },
  {
    grade: 12, subjectCode: "mathematics", topic: "Trigonometry",
    title: "Trig identities and the CAST diagram", noteType: "formula_sheet", difficulty: "normal",
    content:
      "IDENTITIES\n• tan θ = sin θ / cos θ\n• sin²θ + cos²θ = 1\n\nREDUCTION\n• sin(180° − θ) = sin θ\n• cos(180° + θ) = −cos θ\n• sin(360° − θ) = −sin θ\n• cos(90° − θ) = sin θ\n\nCAST: which ratios are positive\nQuadrant I: All, II: Sin, III: Tan, IV: Cos\n\nCOMPOUND ANGLES\n• sin(A ± B) = sinA cosB ± cosA sinB\n• cos(A ± B) = cosA cosB ∓ sinA sinB\n\nDOUBLE ANGLES\n• sin 2A = 2 sinA cosA\n• cos 2A = cos²A − sin²A = 1 − 2sin²A = 2cos²A − 1\n\nGENERAL SOLUTIONS\nsin x = k → x = ref ∠ + 360°n or (180° − ref ∠) + 360°n\ncos x = k → x = ±ref ∠ + 360°n\ntan x = k → x = ref ∠ + 180°n, n ∈ ℤ\n\nSINE/COSINE/AREA RULES\na/sinA = b/sinB; a² = b² + c² − 2bc·cosA; Area = ½ab·sinC",
    tags: ["CAST", "identities", "general solution"],
  },
  {
    grade: 12, subjectCode: "mathematics", topic: "Probability",
    title: "Probability essentials: rules, Venn diagrams, counting", noteType: "summary", difficulty: "normal",
    content:
      "CORE RULES\n• P(A or B) = P(A) + P(B) − P(A and B)\n• Mutually exclusive: P(A and B) = 0\n• Complementary: P(not A) = 1 − P(A)\n• Independent events: P(A and B) = P(A) × P(B)\n\nTEST FOR INDEPENDENCE\nCalculate P(A) × P(B) and compare with P(A and B). State the conclusion in words.\n\nVENN DIAGRAMS\nFill in from the intersection outwards. Let the unknown be x if a value is missing, then build an equation from the total.\n\nTREE DIAGRAMS\nMultiply along branches, add between branches. Watch for 'without replacement' — the denominator changes.\n\nFUNDAMENTAL COUNTING PRINCIPLE\nIf one task can be done in m ways and a second in n ways, together: m × n.\n• Letters/digits may repeat → multiply the full options each time\n• No repetition → options decrease (n, n−1, n−2 …)\n• Word arrangements with repeated letters: n! / (repeats!)",
    tags: ["venn", "counting", "independence"],
  },
  {
    grade: 11, subjectCode: "mathematics", topic: "Algebra",
    title: "Quadratic equations and inequalities", noteType: "worked_examples", difficulty: "beginner",
    content:
      "SOLVING x² − 5x + 6 = 0\nFactorise: (x − 2)(x − 3) = 0 → x = 2 or x = 3.\n\nWHEN FACTORS DON'T WORK\nUse the quadratic formula: x = [−b ± √(b² − 4ac)] / 2a.\nExample: 2x² + 3x − 4 = 0 → a = 2, b = 3, c = −4\nx = [−3 ± √(9 + 32)] / 4 = (−3 ± √41)/4.\n\nNATURE OF ROOTS (Δ = b² − 4ac)\n• Δ > 0: two real roots (perfect square → rational)\n• Δ = 0: equal roots\n• Δ < 0: no real roots\n\nQUADRATIC INEQUALITY x² − 5x + 6 < 0\n1. Find the roots: x = 2, x = 3\n2. Sketch the parabola (smile)\n3. Below zero between the roots → 2 < x < 3\n\nEXPONENT EQUATIONS\nSame base: 3^x = 81 = 3⁴ → x = 4.\nSubstitution: 2^(2x) − 5·2^x + 4 = 0 → let k = 2^x → (k − 1)(k − 4) = 0 → x = 0 or x = 2.",
    tags: ["quadratics", "discriminant"],
  },
  {
    grade: 10, subjectCode: "mathematics", topic: "Algebra",
    title: "Factorising: the three patterns", noteType: "summary", difficulty: "beginner",
    content:
      "ALWAYS take out the highest common factor first.\n6x² + 9x = 3x(2x + 3)\n\nPATTERN 1 — Difference of squares\na² − b² = (a − b)(a + b)\nx² − 25 = (x − 5)(x + 5)\n\nPATTERN 2 — Trinomials\nx² + 7x + 12: find two numbers that multiply to 12 and add to 7 → 3 and 4 → (x + 3)(x + 4).\nSigns guide: +c means same signs, −c means different signs.\n\nPATTERN 3 — Grouping (4 terms)\nax + ay + bx + by = a(x + y) + b(x + y) = (a + b)(x + y)\n\nSUM/DIFFERENCE OF CUBES\na³ + b³ = (a + b)(a² − ab + b²)\na³ − b³ = (a − b)(a² + ab + b²)\n\nCHECK by multiplying back out. If your expansion doesn't return the original expression, the factors are wrong.",
    tags: ["factorising", "foundations"],
  },
  {
    grade: 12, subjectCode: "physical-sciences", topic: "Mechanics",
    title: "Newton's laws and momentum: exam framework", noteType: "summary", difficulty: "normal",
    content:
      "NEWTON I: An object continues at rest or constant velocity unless a net force acts on it.\nNEWTON II: F(net) = ma. Direction of acceleration = direction of net force.\nNEWTON III: A on B equals B on A, opposite direction, DIFFERENT objects.\n\nFREE-BODY DIAGRAMS\nDraw the object as a dot. Forces from the dot outwards: weight (w = mg), normal (⊥ surface), friction (opposes motion), applied force, tension.\nOn a slope: split weight into mg·sinθ (along) and mg·cosθ (perpendicular).\n\nMOMENTUM\np = mv. Net external force zero → total momentum conserved:\nm₁v₁ + m₂v₂ (before) = m₁v₁' + m₂v₂' (after)\nDefine a positive direction FIRST and keep signs consistent.\n\nIMPULSE\nF·Δt = Δp. Airbags/crumple zones increase Δt → smaller force for the same momentum change.\n\nVERTICAL PROJECTILE MOTION\nOnly gravity acts (a = 9,8 m·s⁻² down). At the top v = 0 but a ≠ 0. Up and down times are equal for the same height.",
    tags: ["newton", "momentum", "impulse"],
  },
  {
    grade: 12, subjectCode: "physical-sciences", topic: "Electricity",
    title: "Circuits: internal resistance and the big five formulas", noteType: "formula_sheet", difficulty: "normal",
    content:
      "OHM'S LAW: V = IR (constant temperature)\nPOWER: P = VI = I²R = V²/R\nENERGY: W = Pt\n\nSERIES\n• Same current everywhere\n• R(total) = R₁ + R₂ + …\n• Voltages add up to supply\n\nPARALLEL\n• Same voltage across branches\n• 1/R(total) = 1/R₁ + 1/R₂\n• Two resistors shortcut: product/sum\n\nINTERNAL RESISTANCE\nemf = I(R + r)  →  V(terminal) = emf − Ir\nWhen more bulbs are switched on in parallel: total resistance drops, current from the battery rises, 'lost volts' Ir rises, terminal voltage drops.\n\nEXAM METHOD\n1. Redraw/label the circuit\n2. Work out total resistance\n3. Find total current via emf = I(R + r)\n4. Work back to the branch they asked about\nAlways carry units; round only at the end.",
    tags: ["circuits", "emf", "internal resistance"],
  },
  {
    grade: 12, subjectCode: "physical-sciences", topic: "Organic Chemistry",
    title: "Organic chemistry: naming and reactions map", noteType: "summary", difficulty: "advanced",
    content:
      "HOMOLOGOUS SERIES (functional groups)\n• Alkanes C–C, alkenes C=C, alkynes C≡C\n• Alcohols –OH, carboxylic acids –COOH, esters –COO–\n• Haloalkanes –X, aldehydes –CHO, ketones C=O (middle)\n\nNAMING STEPS\n1. Longest chain containing the functional group\n2. Number so the functional group gets the lowest number\n3. Substituents alphabetically (di-, tri- don't affect order)\n\nPHYSICAL PROPERTIES LOGIC\nLonger chain → stronger London forces → higher boiling point.\nBranching → lower boiling point.\n–OH and –COOH hydrogen bond → much higher boiling points.\n\nREACTION MAP\n• Alkene + H₂ → alkane (hydrogenation, Pt catalyst)\n• Alkene + HX → haloalkane (Markovnikov: H to the C with more H's)\n• Alkene + H₂O → alcohol (hydration, H₂SO₄/H₃PO₄ catalyst)\n• Haloalkane + dilute NaOH → alcohol (substitution)\n• Haloalkane + concentrated NaOH, heat → alkene (elimination)\n• Alcohol + carboxylic acid → ester + water (H₂SO₄, warm)\nEster name: alcohol part first (alkyl), then acid part (-oate).",
    tags: ["IUPAC", "esters", "reactions"],
  },
  {
    grade: 11, subjectCode: "physical-sciences", topic: "Chemical Change",
    title: "Stoichiometry: the mole route map", noteType: "worked_examples", difficulty: "normal",
    content:
      "THE MAP\nmass → moles: n = m/M\nvolume of gas (STP) → moles: n = V/22,4 (dm³)\nsolution → moles: n = c × V (V in dm³)\nparticles → moles: n = N/6,02×10²³\n\nRECIPE FOR EVERY STOICHIOMETRY PROBLEM\n1. Balanced equation\n2. Convert the given quantity to moles\n3. Use the mole ratio from the equation\n4. Convert to the asked quantity\n\nEXAMPLE\nHow many grams of water form when 8 g of H₂ burns? 2H₂ + O₂ → 2H₂O\nn(H₂) = 8/2 = 4 mol → ratio 2:2 → n(H₂O) = 4 mol → m = 4 × 18 = 72 g\n\nLIMITING REAGENT\nConvert BOTH reactants to moles, divide each by its coefficient; the smaller value is the limiting reagent. Base all further calculations on it.\n\nPERCENTAGE YIELD = (actual/theoretical) × 100",
    tags: ["moles", "limiting reagent"],
  },
  {
    grade: 12, subjectCode: "life-sciences", topic: "Genetics",
    title: "Genetics problems: a step-by-step method", noteType: "worked_examples", difficulty: "normal",
    content:
      "KEY TERMS\nGene: DNA segment coding for a characteristic. Allele: version of a gene. Genotype: allele pair (Bb). Phenotype: what shows. Homozygous: BB/bb. Heterozygous: Bb.\n\nMONOHYBRID CROSS FORMAT (use this every time — marks are for the format)\nP1:  phenotype × phenotype\n     genotype × genotype\nMeiosis\nG:   gametes in circles\nFertilisation\nF1:  Punnett square or genotype list\n     phenotypes + ratio\n\nEXAMPLE: Bb × Bb (brown dominant)\nGametes: B, b each side → BB, Bb, Bb, bb → 3 brown : 1 white.\n\nSPECIAL CASES\n• Incomplete dominance: heterozygote is a blend (red × white → pink)\n• Codominance: both alleles show (e.g. AB blood group)\n• Sex-linked: alleles on X (write as X^B, X^b); males X^bY show recessive traits more often\n• Blood groups: A and B codominant, O recessive\n\nPEDIGREES\nTwo unaffected parents with an affected child → the trait is recessive and both parents are carriers.",
    tags: ["punnett", "alleles", "pedigree"],
  },
  {
    grade: 12, subjectCode: "life-sciences", topic: "Evolution",
    title: "Natural selection vs Lamarckism + evidence for evolution", noteType: "summary", difficulty: "normal",
    content:
      "DARWIN'S NATURAL SELECTION (the 6-step answer)\n1. Variation exists within a population (caused by mutation, meiosis, random fertilisation)\n2. More offspring are produced than can survive\n3. There is competition for resources\n4. Individuals with favourable characteristics survive\n5. They reproduce and pass the favourable allele on\n6. Over generations the favourable characteristic becomes more common\n\nLAMARCK (for comparison questions)\n• Use and disuse changes an organ\n• Acquired characteristics are inherited (rejected — acquired traits are not genetic)\nKey difference: Darwin starts with EXISTING variation; Lamarck says the environment creates change in the individual.\n\nPUNCTUATED EQUILIBRIUM\nLong periods of little change interrupted by short bursts of rapid change — explains gaps in the fossil record.\n\nSPECIATION (allopatric)\nPopulation split by a geographic barrier → no gene flow → different selection pressures on each side → genotypic differences accumulate → even if reunited they cannot interbreed → two species.\n\nHUMAN EVOLUTION EVIDENCE\nFossils (Taung child, Mrs Ples, Little Foot, Homo naledi — South Africa's Cradle of Humankind), comparative anatomy, genetic similarity to African apes.",
    tags: ["darwin", "speciation"],
  },
  {
    grade: 12, subjectCode: "life-sciences", topic: "Human Reproduction",
    title: "Menstrual cycle hormones made simple", noteType: "summary", difficulty: "normal",
    content:
      "THE FOUR HORMONES\n• FSH (pituitary): stimulates follicle development; follicle secretes oestrogen\n• Oestrogen (follicle): rebuilds endometrium; high level triggers LH surge\n• LH (pituitary): surge causes ovulation around day 14; remaining follicle → corpus luteum\n• Progesterone (corpus luteum): maintains and thickens the endometrium\n\nIF NO FERTILISATION\nCorpus luteum degenerates → progesterone drops → endometrium breaks down → menstruation. Low progesterone also releases the brake on FSH → new cycle starts.\n\nIF FERTILISATION\nThe embryo implants; corpus luteum keeps secreting progesterone, so the endometrium is maintained and there is no menstruation.\n\nNEGATIVE FEEDBACK\nHigh progesterone inhibits FSH and LH — this is why no new follicles develop during pregnancy and the principle behind hormonal contraception.\n\nEXAM TIP\nGraph questions: identify each hormone by WHEN it peaks — FSH early, oestrogen before day 14, LH spike at ovulation, progesterone in the second half.",
    tags: ["hormones", "feedback"],
  },
  {
    grade: 12, subjectCode: "accounting", topic: "Financial Statements",
    title: "Income statement and balance sheet: where everything goes", noteType: "summary", difficulty: "normal",
    content:
      "INCOME STATEMENT (Statement of Comprehensive Income)\nSales − Cost of sales = Gross profit\n+ Other operating income (rent income, discount received, bad debts recovered)\n− Operating expenses (salaries, depreciation, bad debts, trading stock deficit)\n= Operating profit\n+ Interest income → − Interest expense = Net profit before tax → − Tax = Net profit after tax\n\nBALANCE SHEET (Statement of Financial Position)\nASSETS: Non-current (fixed assets at carrying value, fixed deposits) + Current (inventories, trade & other receivables, cash)\nEQUITY & LIABILITIES: Ordinary share capital + Retained income + Non-current liabilities (loans) + Current liabilities (trade & other payables, bank overdraft, short-term portion of loan)\n\nADJUSTMENT REMINDERS\n• Depreciation: cost method (cost × %) vs diminishing balance (carrying value × %)\n• Accrued expense = still owing → liability; Prepaid expense = paid early → asset\n• Income received in advance → liability; Accrued income → asset\n• Bad debts written off reduce debtors; provision for bad debts adjusts to % of debtors\n\nALWAYS move the loan portion payable within 12 months to current liabilities.",
    tags: ["statements", "adjustments"],
  },
  {
    grade: 12, subjectCode: "accounting", topic: "Inventory",
    title: "FIFO vs weighted average: calculations and arguments", noteType: "worked_examples", difficulty: "normal",
    content:
      "FIFO (first in, first out)\nClosing stock is valued at the MOST RECENT purchase prices.\nMethod: take units on hand, value them backwards from the latest purchases.\n\nWEIGHTED AVERAGE\nAverage cost per unit = (value of opening stock + purchases + carriage) ÷ total units available.\nClosing stock = units on hand × average cost.\n\nWORKED MINI-EXAMPLE\nOpening: 100 units @ R10 = R1 000\nPurchases: 200 @ R12 = R2 400, then 100 @ R15 = R1 500\nOn hand at year end: 150 units\n• FIFO: 100 @ R15 + 50 @ R12 = R1 500 + R600 = R2 100\n• Weighted average: (1 000 + 2 400 + 1 500) ÷ 400 = R12,25 → 150 × R12,25 = R1 837,50\n\nWHICH TO USE? (typical 4-mark discussion)\n• Rising prices: FIFO shows higher closing stock and higher profit\n• Weighted average smooths out price changes — more conservative\n• Consistency principle: don't switch methods without good reason\n\nSTOCK TURNOVER RATE = Cost of sales ÷ Average stock. Low rate → overstocking or slow-moving stock.",
    tags: ["FIFO", "stock"],
  },
  {
    grade: 11, subjectCode: "accounting", topic: "VAT",
    title: "VAT calculations: the three situations", noteType: "worked_examples", difficulty: "beginner",
    content:
      "South African VAT is 15%. Three situations:\n\n1. ADDING VAT to a price\nPrice excluding VAT × 1,15 = price including VAT\nR200 × 1,15 = R230\n\n2. REMOVING VAT from an inclusive price\nPrice including VAT ÷ 1,15 = price excluding VAT\nR230 ÷ 1,15 = R200\n\n3. FINDING THE VAT AMOUNT\nFrom exclusive price: × 0,15  (R200 × 0,15 = R30)\nFrom inclusive price: × 15/115  (R230 × 15/115 = R30)\nThe 15/115 fraction is the one most learners get wrong — practise it.\n\nVAT INPUT vs OUTPUT\n• Output VAT: charged on sales (owed TO SARS)\n• Input VAT: paid on purchases (claimed BACK from SARS)\n• Amount payable to SARS = Output − Input\n\nZERO-RATED basics (brown bread, maize meal, rice, vegetables, eggs): 0% VAT but still in the VAT system. EXEMPT supplies (residential rent, school fees) are outside the system.",
    tags: ["VAT", "SARS"],
  },
  {
    grade: 12, subjectCode: "geography", topic: "Climate",
    title: "Mid-latitude cyclones and SA weather systems", noteType: "summary", difficulty: "normal",
    content:
      "MID-LATITUDE CYCLONE (frontal depression)\n• Forms at the polar front (~40–60°S) where warm subtropical air meets cold polar air\n• Travels west → east, affects SA mainly in WINTER (brings Cape rain)\n• Cold front: steep, fast; cumulonimbus, heavy showers, temperature drops, pressure rises after passage; wind backs NW → SW\n• Warm front: gentle slope, light steady rain ahead\n• Occlusion: cold front catches the warm front; system dies\n\nANTICYCLONES OVER SA\nKalahari High, South Atlantic High, South Indian High. Subsiding air → stable, dry conditions. Winter: strong inversion traps pollution over the Highveld.\n\nLINE THUNDERSTORMS (moisture front)\nSummer: moist Indian Ocean air meets dry air from the west → line of cumulonimbus along the boundary → afternoon thunderstorms over the interior.\n\nBERG WINDS\nHot, dry air flowing from the interior plateau down to the coast ahead of a coastal low. Raises coastal temperatures sharply; fire danger.\n\nMAP TIP: label fronts, isobars (4 hPa intervals), and remember wind blows clockwise around lows in the southern hemisphere.",
    tags: ["cyclones", "synoptic charts"],
  },
  {
    grade: 12, subjectCode: "geography", topic: "Geomorphology",
    title: "Drainage systems and river profiles", noteType: "summary", difficulty: "normal",
    content:
      "DRAINAGE PATTERNS (identify on maps)\n• Dendritic: tree-like, uniform rock\n• Trellis: parallel streams + right-angle tributaries, folded/alternating rock\n• Radial: streams flow outward from a high point (dome/volcano)\n• Centripetal: streams flow into a central basin\n• Rectangular: right-angle bends following joints/faults\n\nLONGITUDINAL PROFILE\nUpper course: steep gradient, vertical erosion, V-valleys, waterfalls, rapids\nMiddle course: lateral erosion grows, meanders begin\nLower course: gentle gradient, deposition, floodplains, oxbow lakes, deltas\n\nGRADED PROFILE: smooth concave curve — erosion and deposition in balance.\nREJUVENATION: base level drops (uplift / sea level falls) → river erodes downwards again → knickpoints, terraces, incised meanders.\n\nDRAINAGE DENSITY = total stream length ÷ basin area.\nHigh density: impermeable rock, steep slopes, sparse vegetation, heavy rain.\n\nRIVER CAPTURE: a stronger river erodes headwards and 'steals' the headwaters of a weaker one. Features: elbow of capture, wind gap, misfit stream.",
    tags: ["rivers", "fluvial"],
  },
  {
    grade: 12, subjectCode: "geography", topic: "GIS",
    title: "GIS: concepts the exam actually asks", noteType: "definitions", difficulty: "beginner",
    content:
      "GIS: a system that captures, stores, analyses and displays spatially referenced data.\n\nDATA TYPES\n• Spatial data: WHERE things are (coordinates)\n• Attribute data: information ABOUT the feature (name of the school, width of the road)\n\nVECTOR vs RASTER\n• Vector: points, lines, polygons — precise boundaries (roads, farm edges)\n• Raster: grid of pixels — continuous data (satellite images, rainfall surfaces)\n\nRESOLUTION: size of the area one pixel represents. Smaller pixel = higher resolution = more detail.\n\nDATA LAYERING\nSeparate themes (roads, rivers, land use, contours) stacked over each other so relationships can be analysed.\n\nBUFFERING\nA zone of a chosen distance around a feature, e.g. a 500 m buffer around a river when planning where building is not allowed.\n\nQUERYING: asking the GIS questions ('show all clinics within 5 km of the school').\n\nDATA STANDARDISATION: making data from different sources compatible (same scale, projection, format).\n\nAPPLICATIONS TO QUOTE: flood-line mapping, route planning, service delivery planning, crime pattern analysis, disaster management.",
    tags: ["GIS", "mapwork"],
  },
  {
    grade: 12, subjectCode: "history", topic: "Essay Writing",
    title: "How to write a History essay that earns Level 7", noteType: "essay_guide", difficulty: "normal",
    content:
      "STRUCTURE\n1. INTRODUCTION (4–5 lines): take a clear LINE OF ARGUMENT that answers the question directly. Do not retell background. Signal your main points.\n2. BODY (6–8 paragraphs): one point per paragraph.\n   PEEL: Point → Evidence (names, dates, events) → Explain → Link back to the question.\n3. CONCLUSION: return to your argument; no new evidence.\n\nWHAT MARKERS REWARD\n• Relevance: every paragraph must serve the question, not the topic in general\n• Sustained argument: your stance must run through the whole essay\n• Evidence used to SUPPORT the argument, not listed for its own sake\n\nCOMMON QUESTION VERBS\n• 'To what extent…' → take a position (large extent / limited extent) and weigh both sides, ending firmly on yours\n• 'Critically discuss' → present evidence for and against, judge which is stronger\n• 'Do you agree?' → say so in line 1 and defend it\n\nAVOID\n• Storytelling/narrative without analysis\n• Vague claims ('many people suffered') without specifics\n• Introducing new points in the conclusion\n\nPLAN for 5 minutes before writing: argument + paragraph points. A planned essay beats a longer unplanned one.",
    tags: ["essay", "PEEL"],
  },
  {
    grade: 12, subjectCode: "history", topic: "Source-Based Questions",
    title: "Source-based questions: decoding the levels", noteType: "exam_tips", difficulty: "normal",
    content:
      "THE SKILL LEVELS\n• L1 — Extract: 'According to Source 1A…' → quote or paraphrase directly from the source\n• L2 — Explain/interpret: use the source PLUS your own knowledge\n• L3 — Evaluate: usefulness, reliability, bias, comparison\n\nUSEFULNESS vs RELIABILITY (don't mix them up)\n• Useful: what CAN the historian learn from it? (even biased sources are useful — they show perspective)\n• Reliable: can it be trusted? Consider author, date, purpose, audience, tone\n\nCOMPARISON QUESTIONS\nName the aspect, then show how EACH source treats it: 'Source 1A states… whereas Source 1B suggests…'. Single-source answers score half marks at best.\n\nCARTOON ANALYSIS\nIdentify: the figures, the symbols, the exaggeration, the message, and WHOSE perspective it represents.\n\nPARAGRAPH QUESTION (8 marks)\nMini-essay: use at least two sources + own knowledge, link to the question, write in full sentences (no bullet points).\n\nTIME MANAGEMENT: roughly 1 mark = 1 minute. Don't write a page for a 2-mark extraction question.",
    tags: ["sources", "reliability"],
  },
  {
    grade: 12, subjectCode: "english-hl", topic: "Essay Writing",
    title: "The discursive and argumentative essay toolkit", noteType: "essay_guide", difficulty: "normal",
    content:
      "KNOW THE DIFFERENCE\n• Argumentative: ONE strong viewpoint defended throughout. Passionate, persuasive tone.\n• Discursive: BOTH sides examined in a balanced way; your view may appear in the conclusion.\n\nPLANNING (10 minutes is not wasted time)\nBrainstorm → select 4–5 strongest ideas → order them → write.\n\nINTRODUCTIONS THAT WORK\n• A provocative question\n• A striking statistic or scenario\n• A bold statement of position (argumentative)\nAvoid 'In this essay I will…'.\n\nPARAGRAPHING\nTopic sentence → development (example, reason, consequence) → link. One idea per paragraph. Vary paragraph openings — not three paragraphs starting with 'Furthermore'.\n\nCOHESION TOOLBOX\nhowever, moreover, consequently, in contrast, admittedly, nevertheless, ultimately\n\nREGISTER\nFormal-ish but natural. No SMS language. Rhetorical questions and direct address ('Consider this…') work well in argumentative writing.\n\nFINAL CHECK (5 minutes)\nConcord errors, tense consistency, punctuation of dialogue, spelling of words IN the topic. Count your words; stay within the required range.",
    tags: ["essay", "writing"],
  },
  {
    grade: 11, subjectCode: "english-fal", topic: "Comprehension",
    title: "Comprehension test strategy: question words decoded", noteType: "exam_tips", difficulty: "beginner",
    content:
      "READ THE QUESTIONS FIRST — then read the passage knowing what you are hunting for.\n\nQUESTION WORDS\n• Quote: copy the exact words from the text, in quotation marks\n• In your own words: do NOT copy — paraphrase\n• Refer to paragraph X: your answer must come from that paragraph\n• Identify: name it (one word/phrase usually enough)\n• Discuss/Explain: full sentences, give the reason or effect\n• Critically comment: give your view AND support it from the text\n\nMARK ALLOCATION = number of points needed. 2 marks → 2 points or 1 point + explanation.\n\nFACT vs OPINION\nFact: can be proven (dates, numbers, events). Opinion: someone's view (look for 'believes', 'best', 'should', emotive words).\n\nIMPLIED MEANING\n'What does the writer suggest…' → the answer is NOT directly stated. Look at word choice and tone.\n\nLANGUAGE IN CONTEXT\nKeep a mental list: simile, metaphor, personification, alliteration, irony, sarcasm, pun, rhetorical question — and the EFFECT of each ('emphasises…', 'creates a vivid picture of…').\n\nLAST QUESTION TRAP: the final question usually asks your opinion with justification — never answer yes/no alone.",
    tags: ["comprehension", "strategy"],
  },
  {
    grade: 12, subjectCode: "business-studies", topic: "Business Environments",
    title: "PESTLE and Porter's Five Forces in exam answers", noteType: "summary", difficulty: "normal",
    content:
      "THE THREE ENVIRONMENTS\n• Micro: inside the business (full control) — staff, management, policies\n• Market: customers, competitors, suppliers, intermediaries (influence only)\n• Macro: PESTLE (no control — business must adapt)\n\nPESTLE\nPolitical, Economic, Social, Technological, Legal, Environmental.\nExam trick: classify a scenario sentence into the right factor — load-shedding = Economic/Technological context; new labour law = Legal; consumer boycott = Social.\n\nPORTER'S FIVE FORCES (competitiveness of an industry)\n1. Power of buyers — many alternatives → buyers strong\n2. Power of suppliers — few suppliers → suppliers strong\n3. Threat of new entrants — low barriers → high threat\n4. Threat of substitutes — different product, same need\n5. Rivalry among existing competitors — the result of the other four\n\nANSWER FORMAT\nBusiness Studies marks come in 2s: FACT (1) + EXPLANATION/example linked to the scenario (1). Headings and white space help the marker find your points.\n\nQUOTE THE SCENARIO: if the case study mentions 'Naledi's bakery', your answer must too.",
    tags: ["PESTLE", "porter"],
  },
  {
    grade: 12, subjectCode: "economics", topic: "Macroeconomics",
    title: "The circular flow and the multiplier", noteType: "summary", difficulty: "normal",
    content:
      "PARTICIPANTS\nHouseholds (own factors of production), Firms (produce), State (taxes, spends, provides services), Foreign sector (imports/exports), Financial sector (links savers and borrowers).\n\nLEAKAGES AND INJECTIONS\nLeakages (money out): Savings + Taxes + Imports (S + T + M)\nInjections (money in): Investment + Government spending + Exports (I + G + X)\nEconomy in equilibrium when leakages = injections.\n\nTHE MULTIPLIER\nAn injection of spending raises income by MORE than the injection because income is re-spent in rounds.\nMultiplier k = 1/(1 − mpc) = 1/mps\nIf mpc = 0,8 → k = 5 → R10m injection raises income by R50m.\nLarger mpc → larger multiplier (poorer communities spend a larger share, so the effect is bigger).\n\nNATIONAL ACCOUNT AGGREGATES\nGDP: total value of final goods and services produced INSIDE the country in a year.\nGNP/GNI: production by the country's PERMANENT RESIDENTS (GDP + primary income from abroad − primary income to abroad).\nNominal vs Real: real GDP removes inflation — use real figures to compare growth.\n\nMETHODS: production (value added), income (wages + rent + interest + profit), expenditure (C + I + G + (X − M)).",
    tags: ["circular flow", "multiplier", "GDP"],
  },
  {
    grade: 10, subjectCode: "life-sciences", topic: "Cells",
    title: "Cell structure: organelles and their jobs", noteType: "definitions", difficulty: "beginner",
    content:
      "CELL THEORY: all living things consist of cells; the cell is the basic unit of life; cells come from existing cells.\n\nORGANELLES\n• Cell membrane: controls what enters/leaves (selectively permeable)\n• Cytoplasm: jelly where reactions happen\n• Nucleus: controls the cell; contains DNA\n• Mitochondria: cellular respiration → releases energy (more in muscle cells!)\n• Ribosomes: protein synthesis\n• Endoplasmic reticulum: transport (rough ER has ribosomes)\n• Golgi body: packages and exports substances\n• Lysosomes: digestion inside the cell\n\nPLANT CELLS ALSO HAVE\n• Cell wall (cellulose) — shape and support\n• Chloroplasts — photosynthesis\n• Large central vacuole — storage and turgor\n\nPLANT vs ANIMAL TABLE (learn it)\nWall: plant yes / animal no. Chloroplasts: plant yes / animal no. Vacuole: plant large / animal small or absent. Centrioles: animal yes / plant no.\n\nMICROSCOPE CALCULATION\nMagnification = eyepiece × objective. Size of object = size of image ÷ magnification.",
    tags: ["organelles", "foundations"],
  },
  {
    grade: 12, subjectCode: "cat", topic: "Spreadsheets",
    title: "Excel functions for the practical exam", noteType: "practical_guide", difficulty: "normal",
    content:
      "THE FUNCTIONS THAT ALWAYS APPEAR\n• =SUM(A1:A10), =AVERAGE(), =MAX(), =MIN(), =COUNT() (numbers) vs =COUNTA() (anything)\n• =COUNTIF(range; \"criteria\") — e.g. =COUNTIF(B2:B50; \">=50\")\n• =SUMIF(range; criteria; sum_range)\n• =IF(condition; value_if_true; value_if_false)\n  Nested: =IF(A1>=80; \"Distinction\"; IF(A1>=50; \"Pass\"; \"Fail\"))\n• =VLOOKUP(value; table; column_number; FALSE) — FALSE = exact match; remember to make the table reference ABSOLUTE\n• =ROUND(A1; 0) vs ROUNDUP / ROUNDDOWN\n• Text: =LEFT(A1;3), =RIGHT(), =MID(A1;2;4), =CONCATENATE()/& , =LEN()\n• Date: =TODAY(), =YEAR(), age = (TODAY()−birthdate)/365,25 rounded down\n\nABSOLUTE REFERENCES\n$A$1 stays fixed when you copy the formula. If your copied formula breaks, you forgot the $.\n\nERROR VALUES\n#DIV/0! dividing by empty/zero · #N/A VLOOKUP can't find it · #REF! deleted cells · ##### column too narrow (not an error — widen it)\n\nEXAM HABIT: read the instruction for the EXACT cell, function name and rounding asked. Marks are lost to almost-right answers.",
    tags: ["excel", "practical"],
  },
];

// ─── Tutors (sample directory entries for the discovery UI) ──────────────────
interface TutorSeed {
  seedKey:        string;
  name:           string;
  bio:            string;
  subjects:       string[];
  grades:         number[];
  province:       string;
  mode:           "online" | "in_person" | "both";
  hourlyRateZar?: number;
  rating:         number;
  reviewCount:    number;
  languages:      string[];
  availability:   string;
  verified:       boolean;
  avatarColor:    string;
}

const TUTORS: TutorSeed[] = [
  {
    seedKey: "tutor-thabo-mokoena", name: "Thabo Mokoena",
    bio: "UCT engineering graduate. I focus on exam technique for Maths P1 — algebra, functions and calculus, with past-paper drills every session.",
    subjects: ["mathematics", "physical-sciences"], grades: [11, 12],
    province: "Western Cape", mode: "both", hourlyRateZar: 180,
    rating: 4.9, reviewCount: 41, languages: ["English", "Sesotho"],
    availability: "Weekday evenings + Saturday mornings", verified: true, avatarColor: "#1E5A9C",
  },
  {
    seedKey: "tutor-naledi-khumalo", name: "Naledi Khumalo",
    bio: "Life Sciences teacher with 8 years of matric marking experience. I teach you to answer the way markers award marks.",
    subjects: ["life-sciences"], grades: [10, 11, 12],
    province: "Gauteng", mode: "online", hourlyRateZar: 150,
    rating: 4.8, reviewCount: 36, languages: ["English", "isiZulu"],
    availability: "Mon–Thu 17:00–20:00", verified: true, avatarColor: "#00A86B",
  },
  {
    seedKey: "tutor-sipho-dlamini", name: "Sipho Dlamini",
    bio: "Accounting honours student. Financial statements, cash flow and inventory valuation made step-by-step. Free group sessions on Sundays.",
    subjects: ["accounting", "economics"], grades: [11, 12],
    province: "KwaZulu-Natal", mode: "both",
    rating: 4.7, reviewCount: 22, languages: ["English", "isiZulu"],
    availability: "Weekends", verified: false, avatarColor: "#C9973F",
  },
  {
    seedKey: "tutor-anelisa-mbete", name: "Anelisa Mbete",
    bio: "Published poet and English HL specialist. Essay coaching, poetry analysis and literature revision for Grades 10–12.",
    subjects: ["english-hl", "english-fal"], grades: [10, 11, 12],
    province: "Eastern Cape", mode: "online", hourlyRateZar: 120,
    rating: 4.6, reviewCount: 18, languages: ["English", "isiXhosa"],
    availability: "Flexible — book a slot", verified: true, avatarColor: "#8E44AD",
  },
  {
    seedKey: "tutor-pieter-vanwyk", name: "Pieter van Wyk",
    bio: "Retired Physical Sciences HOD. Patient, methodical, strong on electricity and mechanics. In-person in Bloemfontein or online.",
    subjects: ["physical-sciences", "mathematics"], grades: [10, 11, 12],
    province: "Free State", mode: "both", hourlyRateZar: 200,
    rating: 4.9, reviewCount: 57, languages: ["Afrikaans", "English"],
    availability: "Weekdays 14:00–18:00", verified: true, avatarColor: "#2C6E49",
  },
  {
    seedKey: "tutor-zanele-ngcobo", name: "Zanele Ngcobo",
    bio: "Geography masters student. Mapwork, GIS and climatology. I run free community classes at the Durban North library.",
    subjects: ["geography"], grades: [11, 12],
    province: "KwaZulu-Natal", mode: "in_person",
    rating: 4.5, reviewCount: 12, languages: ["isiZulu", "English"],
    availability: "Saturdays 09:00–13:00", verified: false, avatarColor: "#D35400",
  },
  {
    seedKey: "tutor-lerato-molefe", name: "Lerato Molefe",
    bio: "CA(SA) trainee. Accounting and Maths Literacy with real-world examples. Online whiteboard sessions with recordings you keep.",
    subjects: ["accounting", "mathematical-literacy"], grades: [10, 11, 12],
    province: "Gauteng", mode: "online", hourlyRateZar: 170,
    rating: 4.7, reviewCount: 29, languages: ["English", "Setswana"],
    availability: "Tue/Thu evenings + Sunday", verified: true, avatarColor: "#16A085",
  },
  {
    seedKey: "tutor-johan-coetzee", name: "Johan Coetzee",
    bio: "IT teacher and hobbyist game developer. Java/Delphi for IT learners, plus CAT practical prep (Excel, Access, Word).",
    subjects: ["information-technology", "cat"], grades: [10, 11, 12],
    province: "Western Cape", mode: "online", hourlyRateZar: 160,
    rating: 4.4, reviewCount: 9, languages: ["Afrikaans", "English"],
    availability: "Weekday afternoons", verified: false, avatarColor: "#34495E",
  },
  {
    seedKey: "tutor-busisiwe-nkosi", name: "Busisiwe Nkosi",
    bio: "History PhD candidate. Essay structure, source analysis and the Cold War / civil resistance topics. First session free.",
    subjects: ["history"], grades: [10, 11, 12],
    province: "Gauteng", mode: "both", hourlyRateZar: 140,
    rating: 4.8, reviewCount: 25, languages: ["English", "isiZulu", "Sepedi"],
    availability: "Weekends + school holidays", verified: true, avatarColor: "#7B241C",
  },
  {
    seedKey: "tutor-amahle-sithole", name: "Amahle Sithole",
    bio: "Matric 2023 top achiever (7 distinctions), now studying medicine. Peer tutoring for Life Sciences and Maths — free, community first.",
    subjects: ["life-sciences", "mathematics"], grades: [10, 11],
    province: "Limpopo", mode: "online",
    rating: 4.6, reviewCount: 14, languages: ["Sepedi", "English"],
    availability: "Evenings after 19:00", verified: false, avatarColor: "#117864",
  },
  {
    seedKey: "tutor-karin-botha", name: "Karin Botha",
    bio: "Afrikaans FAL specialist. Begripstoetse, opsommings en letterkunde. I make Afrikaans feel doable for English-speaking learners.",
    subjects: ["afrikaans-fal"], grades: [10, 11, 12],
    province: "North West", mode: "online", hourlyRateZar: 130,
    rating: 4.5, reviewCount: 16, languages: ["Afrikaans", "English"],
    availability: "Mon–Fri 15:00–18:00", verified: true, avatarColor: "#9C640C",
  },
  {
    seedKey: "tutor-luyanda-mahlangu", name: "Luyanda Mahlangu",
    bio: "Economics and Business Studies tutor, BCom graduate. Essay frameworks, graphs and case-study answering technique.",
    subjects: ["economics", "business-studies"], grades: [11, 12],
    province: "Mpumalanga", mode: "both", hourlyRateZar: 150,
    rating: 4.6, reviewCount: 20, languages: ["isiNdebele", "English", "isiZulu"],
    availability: "Weekends", verified: false, avatarColor: "#5B2C6F",
  },
];

// ─── The seed mutation ────────────────────────────────────────────────────────
export const seedStarterData = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSeedAccess(ctx, sessionId);

    // 1. Subjects — upsert by (code, grade)
    let subjectsInserted = 0;
    const subjectIds = new Map<string, Id<"eduSubjects">>(); // "code|grade" → id
    for (const grade of [10, 11, 12]) {
      const existing = await ctx.db
        .query("eduSubjects")
        .withIndex("by_grade", (q) => q.eq("grade", grade))
        .collect();

      for (const subject of SUBJECTS) {
        const match = existing.find((s) => s.code === subject.code || s.name === subject.name);
        if (match) {
          if (!match.code) await ctx.db.patch(match._id, { code: subject.code });
          subjectIds.set(`${subject.code}|${grade}`, match._id);
        } else {
          const id = await ctx.db.insert("eduSubjects", {
            name: subject.name, grade, code: subject.code,
          });
          subjectIds.set(`${subject.code}|${grade}`, id);
          subjectsInserted += 1;
        }
      }
    }

    // 2. Papers — replace legacy entries (pre-metadata seed), insert catalogue idempotently
    const allPapers = [];
    for (const grade of [10, 11, 12]) {
      const gradeSubjectIds = SUBJECTS
        .map((s) => subjectIds.get(`${s.code}|${grade}`))
        .filter((id): id is Id<"eduSubjects"> => id !== undefined);
      for (const subjectId of gradeSubjectIds) {
        const papers = await ctx.db
          .query("eduPapers")
          .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
          .collect();
        allPapers.push(...papers);
      }
    }

    // Legacy = no paperType (old seed format, no user content). Remove so the
    // structured catalogue replaces them without duplicates.
    let legacyRemoved = 0;
    for (const paper of allPapers) {
      if (paper.paperType === undefined && paper.storageId === undefined) {
        await ctx.db.delete(paper._id);
        legacyRemoved += 1;
      }
    }

    const subjectIdToKeyPrefix = new Map<string, string>();
    for (const [key, id] of subjectIds.entries()) {
      subjectIdToKeyPrefix.set(id as string, key);
    }

    const existingKeys = new Set<string>();
    for (const paper of allPapers) {
      if (paper.paperType === undefined && paper.storageId === undefined) continue; // deleted above
      const prefix = subjectIdToKeyPrefix.get(paper.subjectId as string) ?? paper.subjectId;
      existingKeys.add(
        `${prefix}|${paper.year}|${paper.session ?? ""}|${paper.paperType ?? "question_paper"}|${paper.paperNumber ?? 0}|${paper.language ?? "English"}`,
      );
    }

    let papersInserted = 0;
    const now = Date.now();
    for (const seed of buildPaperCatalogue()) {
      const subjectId = subjectIds.get(`${seed.code}|${seed.grade}`);
      if (!subjectId) continue;
      const key = `${seed.code}|${seed.grade}|${seed.year}|${seed.session}|${seed.paperType}|${seed.paperNumber ?? 0}|${seed.language}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      await ctx.db.insert("eduPapers", {
        subjectId,
        grade:        seed.grade,
        year:         seed.year,
        session:      seed.session,
        paperNumber:  seed.paperNumber,
        language:     seed.language,
        paperType:    seed.paperType,
        sourceName:   seed.sourceName,
        sourceStatus: seed.sourceStatus,
        pdfUrl:       seed.pdfUrl,
        tags:         seed.tags,
        updatedAt:    now,
      });
      papersInserted += 1;
    }

    // 3. Notes — unique by (grade, subjectCode, topic, title)
    let notesInserted = 0;
    for (const note of NOTES) {
      const subject = SUBJECTS.find((s) => s.code === note.subjectCode);
      if (!subject) continue;

      const existing = await ctx.db
        .query("eduNotes")
        .withIndex("by_grade_subject", (q) =>
          q.eq("grade", note.grade).eq("subjectCode", note.subjectCode),
        )
        .collect();
      if (existing.some((n) => n.topic === note.topic && n.title === note.title)) continue;

      await ctx.db.insert("eduNotes", {
        grade:       note.grade,
        subjectCode: note.subjectCode,
        subjectName: subject.name,
        topic:       note.topic,
        title:       note.title,
        noteType:    note.noteType,
        difficulty:  note.difficulty,
        content:     note.content,
        tags:        note.tags,
        updatedAt:   now,
      });
      notesInserted += 1;
    }

    // 4. Tutors — unique by seedKey
    let tutorsInserted = 0;
    for (const tutor of TUTORS) {
      const existing = await ctx.db
        .query("eduTutors")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", tutor.seedKey))
        .unique();
      if (existing) continue;

      await ctx.db.insert("eduTutors", {
        seedKey:       tutor.seedKey,
        name:          tutor.name,
        bio:           tutor.bio,
        subjects:      tutor.subjects,
        grades:        tutor.grades,
        province:      tutor.province,
        mode:          tutor.mode,
        hourlyRateZar: tutor.hourlyRateZar,
        rating:        tutor.rating,
        reviewCount:   tutor.reviewCount,
        languages:     tutor.languages,
        availability:  tutor.availability,
        verified:      tutor.verified,
        avatarColor:   tutor.avatarColor,
      });
      tutorsInserted += 1;
    }

    return {
      subjectsInserted,
      papersInserted,
      notesInserted,
      tutorsInserted,
      legacyPapersReplaced: legacyRemoved,
    };
  },
});
