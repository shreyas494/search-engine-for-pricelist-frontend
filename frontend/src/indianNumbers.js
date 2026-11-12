// indianNumbers.js
// Marathi and Hindi number words as the speech recognizer writes them in English letters,
// e.g. "teen panchattar 18" -> "3 75 18". Several spellings per number because
// the recognizer spells them differently each time.

const WORDS = {
  1: "ek eka",
  2: "don doan",
  3: "teen tin",
  4: "char chaar",
  5: "pach paach panch paanch",
  6: "saha saho chhe che",
  7: "saat",
  8: "aath aat",
  9: "nau nav",
  10: "daha das",
  11: "akra akara gyarah gyara",
  12: "bara baara barah",
  13: "tera terah",
  14: "chauda chouda chaudah",
  15: "pandhra pandhara pandrah pandra",
  16: "sola solah",
  17: "satra satara satrah",
  18: "athra athara atharah atthara",
  19: "ekonis ekunis unnis",
  20: "vees vis wees bees bis",
  21: "ekvis ekavis ikkis",
  22: "bavis baavis baais",
  23: "tevis teis",
  24: "chovis chauvis chaubis",
  25: "panchvis panchavis pachvis pachchis pacchis",
  26: "savvis savis chhabbis",
  27: "sattavis sattais",
  28: "atthavis athavis atthais",
  29: "ekontis ekuntis untis",
  30: "tees tis",
  31: "ekatis ekatees iktis",
  32: "battis batis",
  33: "tetis tehtis taintis",
  34: "chautis chotis chauntis",
  35: "pastis pastees paintis",
  36: "chattis chhattis",
  37: "sadotis sadatis saintis",
  38: "adotis adatis artis",
  39: "ekonchalis ekunchalis untalis",
  40: "chalis chaalis",
  41: "ekkechalis iktalis",
  42: "bechalis byalis",
  43: "trechalis tentalis",
  44: "chavvechalis chavalis",
  45: "panchechalis pachechalis pantalis paintalis",
  46: "sehechalis shehechalis chhiyalis",
  47: "sattechalis saintalis",
  48: "atthechalis artalis",
  49: "ekonpannas unchas",
  50: "pannas pannaas pachas pachaas",
  51: "ekkavanna ikyavan",
  52: "bavanna bavan",
  53: "trepanna tirpan",
  54: "chopanna chauppanna chauvan",
  55: "pachpanna pachpan",
  56: "chhappanna chappanna chhappan",
  57: "sattavanna sattavan",
  58: "atthavanna atthavan",
  59: "ekonsatha unsath",
  60: "saath sath",
  61: "eksashta iksath",
  62: "basashta basath",
  63: "tresashta tirsath",
  64: "chausashta chaunsath",
  65: "pasashta pasasht painsath",
  66: "sahasashta chhiyasath",
  67: "sadusashta sadsath",
  68: "adusashta arsath",
  69: "ekonsattar unhattar",
  70: "sattar",
  71: "ekahattar ikhattar",
  72: "bahattar",
  73: "tryahattar tihattar",
  74: "chauryahattar chauhattar",
  75: "panchyahattar panchahattar pachahattar panchattar pachattar pachhattar panchhattar punchattar punchhattar",
  76: "shahattar chhihattar",
  77: "sattyahattar satattar",
  78: "atthyahattar athattar",
  79: "ekonainshi unasi",
  80: "ainshi aishi ainshee assi",
  81: "ekyaainshi ikyasi",
  82: "byaainshi bayasi",
  83: "tryaainshi tirasi",
  84: "chauryaainshi chaurasi",
  85: "panchyaainshi pachasi",
  86: "shahainshi chhiyasi",
  87: "sattyaainshi sattasi",
  88: "atthyaainshi atthasi",
  89: "ekonnavvad navasi",
  90: "navvad nauvad nabbe",
  91: "ekkyannav ikyanve",
  92: "byannav banve",
  93: "tryannav tiranve",
  94: "chauryannav chauranve",
  95: "panchyannav pachanve",
  96: "shahannav chhiyanve",
  97: "sattyannav sattanve",
  98: "atthyannav atthanve",
  99: "navvyannav ninyanve",
  100: "shambhar shambar sau",
};

// Halves: "adich" = 2.50, "dedh" = 1.50, "saade teen" = 3.50
export const HALF_VALUES = { adich: "2.50", adhich: "2.50", dhai: "2.50", dedh: "1.50", didh: "1.50" };
export const PLUS_HALF = new Set(["saade", "sade", "sadhe", "saadhe"]);

// English words that look like the above but should stay words
const KEEP_AS_WORD = new Set(["car", "set", "so", "do", "to"]);

// Spelling-tolerant key: "panchhattar" and "panchattar" give the same key
export const spellingKey = (w) => w.toLowerCase().replace(/[^a-z]/g, "").replace(/w/g, "v").replace(/(.)\1+/g, "$1");

const LOOKUP = new Map();
for (const [num, spellings] of Object.entries(WORDS)) {
  for (const s of spellings.split(" ")) LOOKUP.set(spellingKey(s), num);
}

// Returns the number as a string, or undefined if the word isn't a Marathi/Hindi number.
export function indianNumber(word) {
  if (KEEP_AS_WORD.has(word)) return undefined;
  return LOOKUP.get(spellingKey(word));
}
