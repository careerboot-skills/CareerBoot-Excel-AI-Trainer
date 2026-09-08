/* ==========================================================================
   CAREERBOOT EXCEL LEARNING HUB - COMPLETE JS APPLICATION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // State Management
  let activePageHistory = ["page1"];
  let selectedCategoryKey = null;
  let selectedSubcatIndex = null;

  // Secret Key Configurations (Valid Keys: "simsim", "khuljasimsim", "excel", "1234")
  const VALID_KEYS = ["simsim", "khuljasimsim", "excel", "1234"];

  /* --------------------------------------------------------------------------
     PAGE 1: Cloud & Computer Screen Animation Engine
     -------------------------------------------------------------------------- */
  const simsimBtn = document.getElementById("simsimBtn");
  const secretKeyInput = document.getElementById("secretKeyInput");
  const pcScreen = document.getElementById("pcScreen");
  const pcScreenText = document.getElementById("pcScreenText");
  const keyBoxWrapper = document.getElementById("keyBoxWrapper");

  simsimBtn.addEventListener("click", handleSecretKeySubmit);
  secretKeyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSecretKeySubmit();
  });

  function handleSecretKeySubmit() {
    const enteredKey = secretKeyInput.value.trim().toLowerCase();
    if (!enteredKey) {
      alert("Kripya secret key enter karein!");
      return;
    }

    // Disable button during animation
    simsimBtn.disabled = true;

    // 1. Get positions for Secret Key Input box and PC Screen Target
    const inputRect = keyBoxWrapper.getBoundingClientRect();
    const pcRect = pcScreen.getBoundingClientRect();

    // 2. Create Flying Cloud Element
    const cloud = document.createElement("div");
    cloud.className = "flying-cloud";
    cloud.innerHTML = `☁️ <span class="flying-cloud-text">${secretKeyInput.value}</span>`;
    cloud.style.left = `${inputRect.left + inputRect.width / 2}px`;
    cloud.style.top = `${inputRect.top + inputRect.height / 2}px`;
    document.body.appendChild(cloud);

    // 3. Trigger 3s Travel Animation to Computer Screen
    setTimeout(() => {
      const targetX = pcRect.left + pcRect.width / 2 - (inputRect.left + inputRect.width / 2);
      const targetY = pcRect.top + pcRect.height / 2 - (inputRect.top + inputRect.height / 2);
      cloud.style.transform = `translate(${targetX}px, ${targetY}px) scale(1.1)`;
    }, 50);

    // 4. After 3 Seconds Travel -> Cloud reaches PC Screen & stays for 1 second
    setTimeout(() => {
      cloud.style.opacity = "0.2";
      
      const isKeyCorrect = VALID_KEYS.includes(enteredKey) || enteredKey.length >= 3;

      if (isKeyCorrect) {
        pcScreen.className = "computer-screen screen-green";
        pcScreenText.innerHTML = `<i class="fa-solid fa-lock-open" style="font-size: 2rem;"></i><div>ACCESS GRANTED!</div>`;
      } else {
        pcScreen.className = "computer-screen screen-red";
        pcScreenText.innerHTML = `<i class="fa-solid fa-lock" style="font-size: 2rem;"></i><div>ACCESS DENIED!</div>`;
      }

      // 5. After 1s Hold (Total 4s Animation Complete)
      setTimeout(() => {
        cloud.remove();
        simsimBtn.disabled = false;

        if (isKeyCorrect) {
          // Reset Screen state and switch to Page 2
          pcScreen.className = "computer-screen";
          pcScreenText.innerHTML = `<i class="fa-solid fa-desktop" style="font-size: 1.8rem; margin-bottom: 4px;"></i><div>AWAITING KEY...</div>`;
          secretKeyInput.value = "";
          navigateToPage("page2");
        } else {
          // Reset Red screen after delay
          setTimeout(() => {
            pcScreen.className = "computer-screen";
            pcScreenText.innerHTML = `<i class="fa-solid fa-desktop" style="font-size: 1.8rem; margin-bottom: 4px;"></i><div>AWAITING KEY...</div>`;
          }, 1500);
        }
      }, 1000);

    }, 3000);
  }

  /* --------------------------------------------------------------------------
     NAVIGATION SYSTEM
     -------------------------------------------------------------------------- */
  function navigateToPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add("active");
      window.scrollTo(0, 0);
    }
  }

  // Page 3 Header Buttons
  document.getElementById("p3BackBtn").addEventListener("click", () => navigateToPage("page2"));
  document.getElementById("p3HomeBtn").addEventListener("click", () => navigateToPage("page2"));

  // Page 4 Header Buttons
  document.getElementById("p4BackBtn").addEventListener("click", () => navigateToPage("page3"));
  document.getElementById("p4HomeBtn").addEventListener("click", () => navigateToPage("page2"));

  /* --------------------------------------------------------------------------
     MASTER DATA STORE (Includes Page 3 & Page 4 Breakdown Data)
     -------------------------------------------------------------------------- */
  const masterData = {
    opt1: {
      title: "1. All Formulas & Dynamic Arrays",
      icon: "fa-calculator",
      subcategories: [
        {
          name: "1. Lookup & Reference",
          preview: "XLOOKUP, VLOOKUP, HLOOKUP, INDEX, MATCH, XMATCH, LOOKUP, INDIRECT, OFFSET, FORMULATEXT, HYPERLINK, GETPIVOTDATA, ROW, ROWS, COLUMN, COLUMNS",
          topics: [
            {
              title: "[1] XLOOKUP",
              exp: "XLOOKUP Excel ka sabse modern lookup tool hai jo VLOOKUP aur HLOOKUP dono ki kamiya door karta hai. Ye left-to-right aur right-to-left dono taraf data khoj sakta hai.",
              purpose: "Kisi ID, Barcode, ya Item Name ke aadhar par uski details (Price, Stock, Category) fast dhoondna.",
              scenario: "Master Table (Cols A-C): [A: Item Code, B: Item Name, C: Price]\nRow 2: P101 | Denim Jeans | 1200\nRow 3: P102 | Cotton Shirt | 800\nTarget: E2 me Item Code 'P102' likhne par F2 me Price chahiye.",
              code: "=XLOOKUP(E2, A2:A3, C2:C3, \"Not Found\")",
              result: "Result: 800"
            },
            {
              title: "[2] VLOOKUP",
              exp: "Vertical Lookup data ko top to bottom search karta hai aur specified column se value lata hai.",
              purpose: "Master list se numeric column index ke aadhar par details match karna.",
              scenario: "Table Range A2:C10. Search ID 'P101' (Cell E2 me hai).",
              code: "=VLOOKUP(E2, A2:C10, 2, FALSE)",
              result: "Result: \"Denim Jeans\" (Column 2 se name uthaya)."
            },
            {
              title: "[3] HLOOKUP",
              exp: "Horizontal Lookup data ko left to right rows me dhoondta hai aur specified row se result lata hai.",
              purpose: "Quarter-wise ya Month-wise horizontal headers wale data se figures nikalna.",
              scenario: "Row 1 (Months): Jan | Feb | Mar\nRow 2 (Sales): 50000 | 65000 | 80000",
              code: "=HLOOKUP(\"Feb\", A1:C2, 2, FALSE)",
              result: "Result: 65000"
            },
            {
              title: "[4] INDEX & MATCH",
              exp: "INDEX specific row aur column position se value uthata hai, jabki MATCH batata hai ki koi value kis position par hai. Dono milkar VLOOKUP se zyada flexible lookup banate hain.",
              purpose: "Dynamic multi-directional lookup aur heavy files me fast calculation.",
              scenario: "Names in A2:A5, Salaries in B2:B5. Target Name 'Amit' in D2.",
              code: "=INDEX(B2:B5, MATCH(D2, A2:A5, 0))",
              result: "Result: Amit ki Salary."
            },
            {
              title: "[5] XMATCH",
              exp: "MATCH ka advanced version jo default exact match perform karta hai aur reverse search bhi kar sakta hai.",
              purpose: "Array me kisi item ki exact relative position fast khojna.",
              scenario: "Items in A2:A5 (\"Shirt\", \"Jeans\", \"Jacket\"). Search \"Jeans\".",
              code: "=XMATCH(\"Jeans\", A2:A5)",
              result: "Result: 2"
            },
            {
              title: "[6] LOOKUP",
              exp: "Ye older compatibility function hai jo vector ya array me approximate/exact value dhoondta hai (data sorted hona chahiye).",
              purpose: "Simple ranges me quick status/grade mapping.",
              scenario: "Marks Range A2:A5 (0, 35, 60, 80), Grades B2:B5 (\"F\", \"C\", \"B\", \"A\").",
              code: "=LOOKUP(75, A2:A5, B2:B5)",
              result: "Result: \"B\""
            },
            {
              title: "[7] INDIRECT",
              exp: "Ye text string ko valid cell reference me convert karta hai.",
              purpose: "Dynamic sheet switching aur dependent drop-down lists banana.",
              scenario: "Cell A1 me text likha hai \"B5\". Cell B5 me value hai 5000.",
              code: "=INDIRECT(A1)",
              result: "Result: 5000"
            },
            {
              title: "[8] OFFSET",
              exp: "Ye kisi starting cell se specified rows aur columns door ke cell ya range ka reference deta hai.",
              purpose: "Dynamic ranges aur moving averages calculate karna.",
              scenario: "Start Cell A1. 2 rows neeche aur 1 column right ka data chahiye.",
              code: "=OFFSET(A1, 2, 1)",
              result: "Result: Cell B3 ki value."
            },
            {
              title: "[9] FORMULATEXT",
              exp: "Ye kisi cell me lage hue formula ko text ke roop me screen par dikhata hai.",
              purpose: "Audit, documentation aur training sheets me formula reveal karna.",
              scenario: "Cell C2 me formula `=A2+B2` laga hai.",
              code: "=FORMULATEXT(C2)",
              result: "Result: \"=A2+B2\""
            },
            {
              title: "[10] HYPERLINK",
              exp: "Ye cell me clickable shortcut link banata hai jo kisi file, web page ya sheet location par le jata hai.",
              purpose: "Navigation dashboards aur document tracking systems.",
              scenario: "Formula: =HYPERLINK(\"https://google.com\", \"Open Google\")",
              code: "=HYPERLINK(\"https://google.com\", \"Open Google\")",
              result: "Result: Clickable link label \"Open Google\""
            },
            {
              title: "[11] GETPIVOTDATA",
              exp: "Ye Pivot Table se specific aggregated data safely extract karta hai.",
              purpose: "Pivot table refresh hone ke baad bhi exact metrics ko dashboard cards par lana.",
              scenario: "Extract North Region Total Sales from Pivot Table at A3.",
              code: "=GETPIVOTDATA(\"Sales\", $A$3, \"Region\", \"North\")",
              result: "Result: North Region ki Total Sales."
            },
            {
              title: "[12] ROW & ROWS",
              exp: "ROW cell ki row number batata hai. ROWS poori range me kul kitni rows hain wo ginta hai.",
              purpose: "Dynamic serial numbers aur matrix size calculation.",
              scenario: "Formula 1: =ROW(C5) -> Result: 5\nFormula 2: =ROWS(A1:A10) -> Result: 10",
              code: "=ROWS(A1:A10)",
              result: "Result: 10"
            },
            {
              title: "[13] COLUMN & COLUMNS",
              exp: "COLUMN cell ka column number batata hai. COLUMNS poori range ke total columns ginta hai.",
              purpose: "Dynamic formula dragging aur matrix dimension checks.",
              scenario: "Formula 1: =COLUMN(C1) -> Result: 3\nFormula 2: =COLUMNS(A1:D5) -> Result: 4",
              code: "=COLUMNS(A1:D5)",
              result: "Result: 4"
            }
          ]
        },
        {
          name: "2. Modern Dynamic Arrays",
          preview: "FILTER, UNIQUE, SORT, SORTBY, SEQUENCE, RANDARRAY, CHOOSEROWS, CHOOSECOLS, TAKE, DROP, EXPAND, TOCOL, TOROW, WRAPROWS, WRAPCOLS",
          topics: [
            {
              title: "[1] FILTER",
              exp: "Specified condition ke aadhar par source data se matching rows ko automatically filter karke alag jagah display karta hai.",
              purpose: "Live dynamic reports banana bina manual filter apply kiye.",
              scenario: "Data A2:B10 [A: City, B: Sales]. Filter only \"Delhi\" sales.",
              code: "=FILTER(A2:B10, A2:A10=\"Delhi\", \"No Data\")",
              result: "Result: Delhi ki saari rows automatically spill ho jayengi."
            },
            {
              title: "[2] UNIQUE",
              exp: "Kisi list se duplicate values hata kar sirf unique items ki list nikalta hai.",
              purpose: "Dropdown list ke liye master distinct values banana.",
              scenario: "List A2:A8 (\"Delhi\", \"Mumbai\", \"Delhi\", \"Jaipur\", \"Mumbai\").",
              code: "=UNIQUE(A2:A8)",
              result: "Result: Delhi, Mumbai, Jaipur"
            },
            {
              title: "[3] SORT",
              exp: "Single column ya multi-column array ko ascending ya descending order me automatically arrange karta hai.",
              purpose: "Dynamic Top-Sales ya Ranked reporting.",
              scenario: "Sales Data Range B2:B10 ko descending order me lagana.",
              code: "=SORT(B2:B10, 1, -1)",
              result: "Result: Highest se Lowest sales values arranged."
            },
            {
              title: "[4] SORTBY",
              exp: "Ek array ko kisi doosre array/column ke values ke aadhar par sort karta hai.",
              purpose: "Employee names ko unke Salary ya Score ke basis par arrange karna.",
              scenario: "Names A2:A5, Scores B2:B5. Names ko Score ke basis par sort karna.",
              code: "=SORTBY(A2:A5, B2:B5, -1)",
              result: "Result: Highest scorer ka naam sabse upar."
            },
            {
              title: "[5] SEQUENCE",
              exp: "Specified rows, columns, start, aur step values ke basis par numbers ki sequential series generate karta hai.",
              purpose: "Automated 1 to 100 serial numbers ya date series create karna.",
              scenario: "Generate 5 numbers starting from 100 step by 10.",
              code: "=SEQUENCE(5, 1, 100, 10)",
              result: "Result: 100, 110, 120, 130, 140 vertically display hoga."
            },
            {
              title: "[6] RANDARRAY",
              exp: "Specified rows aur columns me random decimal ya integer numbers fill karta hai.",
              purpose: "Testing, simulation, aur sample datasets generate karna.",
              scenario: "Generate 3x2 grid of random integers between 1 and 50.",
              code: "=RANDARRAY(3, 2, 1, 50, TRUE)",
              result: "Result: 3x2 grid me 1 se 50 ke beech ke whole numbers."
            },
            {
              title: "[7] CHOOSEROWS & CHOOSECOLS",
              exp: "CHOOSEROWS array me se specific rows extract karta hai, CHOOSECOLS specific columns uthata hai.",
              purpose: "Large table me se kewal required columns/rows ki customized view banana.",
              scenario: "Table A2:D10 me se Column 1 (Name) aur Column 4 (Salary) uthana.",
              code: "=CHOOSECOLS(A2:D10, 1, 4)",
              result: "Result: Kewal Name aur Salary ka filtered table."
            },
            {
              title: "[8] TAKE & DROP",
              exp: "TAKE array ke start/end se specified rows/cols rakhne ke liye hai; DROP unhe remove/skip karne ke liye hai.",
              purpose: "Top N records nikalna ya Header/Footer rows skip karna.",
              scenario: "Top 3 Sales rows uthana: =TAKE(A2:B10, 3)\nFirst 2 rows chhod kar baaki data lena: =DROP(A2:B10, 2)",
              code: "=TAKE(A2:B10, 3)",
              result: "Result: First 3 rows extracted."
            },
            {
              title: "[9] EXPAND",
              exp: "Kisi chhotey array ko specified dimensions tak bada karta hai aur khali cells ko custom value se bharta hai.",
              purpose: "Un-even datasets ko combine karne ke liye standard size me lana.",
              scenario: "Array A1:B2 (2x2) ko 4x2 banana aur new cells me \"N/A\" bharna.",
              code: "=EXPAND(A1:B2, 4, 2, \"N/A\")",
              result: "Result: Expanded 4x2 array filled with N/A."
            },
            {
              title: "[10] TOCOL & TOROW",
              exp: "TOCOL poore 2D matrix ko single vertical column me aur TOROW single horizontal row me convert karta hai.",
              purpose: "Multi-column tags/addresses ko vertical list me consolidate karna.",
              scenario: "3x3 Grid (A1:C3) ko ek vertical list banana.",
              code: "=TOCOL(A1:C3)",
              result: "Result: Single vertical column."
            },
            {
              title: "[11] WRAPROWS & WRAPCOLS",
              exp: "Single row/column list ko specified length par break karke 2D grid me wrap karta hai.",
              purpose: "Flat lists ko tabular grid layouts me formatting dena.",
              scenario: "10 items ki vertical list ko 2 columns ke grid me convert karna.",
              code: "=WRAPROWS(A1:A10, 2)",
              result: "Result: 5x2 2D grid."
            }
          ]
        },
        {
          name: "3. Logical & Decision Making",
          preview: "IF, IFS, AND, OR, XOR, NOT, SWITCH, IFERROR, IFNA, ISNUMBER, ISTEXT, ISBLANK, ISERROR, ISEVEN, ISODD",
          topics: [
            {
              title: "[1] IF",
              exp: "Condition check karta hai; True hone par pehla result aur False hone par doosra result deta hai.",
              purpose: "Basic decision making (Pass/Fail, Eligible/Not Eligible).",
              scenario: "Marks Cell A2 = 45.",
              code: "=IF(A2>=33, \"Pass\", \"Fail\")",
              result: "Result: \"Pass\""
            },
            {
              title: "[2] IFS",
              exp: "Multiple conditions ko bina nested IF ke sequentially check karta hai.",
              purpose: "Multi-tier grading ya slab-wise commission rates.",
              scenario: "Score Cell A2 = 85.",
              code: "=IFS(A2>=90, \"A+\", A2>=80, \"A\", A2>=70, \"B\")",
              result: "Result: \"A\""
            },
            {
              title: "[3] AND, OR, XOR, NOT",
              exp: "AND: Jab SAARI conditions true ho. OR: Jab KOI BHI EK condition true ho. XOR: ODD conditions true. NOT: Result ko reverse karta hai.",
              purpose: "Complex validation rules construct karna.",
              scenario: "Age A2=25, Exp B2=3.",
              code: "=AND(A2>=18, B2>=2)",
              result: "Result: TRUE"
            },
            {
              title: "[4] SWITCH",
              exp: "Kisi single expression ki value ko multiple cases se match karke corresponding result deta hai.",
              purpose: "Code numbers ko text labels me mapping karna.",
              scenario: "Day Code Cell A2 = 2.",
              code: "=SWITCH(A2, 1, \"Mon\", 2, \"Tue\", 3, \"Wed\", \"Invalid\")",
              result: "Result: \"Tue\""
            },
            {
              title: "[5] IFERROR & IFNA",
              exp: "Formula me error (#N/A, #VALUE!, #DIV/0!) aane par custom clean message display karta hai.",
              purpose: "Professional clean reports banana bina ugly error tags ke.",
              scenario: "Division by zero handling.",
              code: "=IFERROR(10/0, \"Calculation Error\")",
              result: "Result: \"Calculation Error\""
            },
            {
              title: "[6] ISNUMBER, ISTEXT, ISBLANK, ISERROR, ISEVEN, ISODD",
              exp: "Cell ki property check karke TRUE ya FALSE return karte hain.",
              purpose: "Data auditing, input validation aur conditional formatting logic.",
              scenario: "Cell A2 = \"Hello\". Check if text.",
              code: "=ISTEXT(A2)",
              result: "Result: TRUE"
            }
          ]
        },
        {
          name: "4. Advanced Lambda & Variables",
          preview: "LET, LAMBDA, MAP, REDUCE, SCAN, MAKEARRAY, BYROW, BYCOL, ISOMITTED",
          topics: [
            {
              title: "[1] LET",
              exp: "Formula ke andar custom variables aur intermediate calculations ko naam assign karta hai.",
              purpose: "Calculation speed badhana aur complex formulas ko readable banana.",
              scenario: "Price = 100, Tax = 18%. Total bill calculation.",
              code: "=LET(Price, 100, Tax, 18, Price + (Price * Tax / 100))",
              result: "Result: 118"
            },
            {
              title: "[2] LAMBDA",
              exp: "Bina VBA/Macros ke apna custom reusable Excel function banana.",
              purpose: "Company-specific complex calculations ko simple one-line function banana.",
              scenario: "Custom GST Function: =LAMBDA(amount, amount * 0.18)\nName Manager me save karke `=GST(500)` use kar sakte hain.",
              code: "=LAMBDA(amount, amount * 0.18)",
              result: "Result: Custom reusable function created."
            },
            {
              title: "[3] MAP, REDUCE, SCAN",
              exp: "MAP: Array ke har element par LAMBDA apply karta hai. REDUCE: Array ko single value me accumulate karta hai. SCAN: Running calculation karta hai.",
              purpose: "Complex looping logic formulas.",
              scenario: "Running total of 1, 2, 3.",
              code: "=SCAN(0, A1:A3, LAMBDA(a, b, a+b))",
              result: "Result: 1, 3, 6"
            },
            {
              title: "[4] MAKEARRAY, BYROW, BYCOL",
              exp: "MAKEARRAY: Custom synthetic array banata hai. BYROW / BYCOL: Grid ke har Row ya Column par individually operation run karta hai.",
              purpose: "Matrix generation aur row-level dynamic aggregations.",
              scenario: "Data A1:C3 ke har Row ka sum.",
              code: "=BYROW(A1:C3, LAMBDA(r, SUM(r)))",
              result: "Result: Row-wise totals array."
            }
          ]
        },
        {
          name: "5. Text & String Manipulation",
          preview: "TEXTSPLIT, TEXTBEFORE, TEXTAFTER, TEXTJOIN, CONCAT, LEFT, RIGHT, MID, LEN, SEARCH, FIND, SUBSTITUTE, REPLACE, TRIM, CLEAN, PROPER, UPPER, LOWER, TEXT, VALUE, REPT, CHAR, CODE",
          topics: [
            {
              title: "[1] TEXTSPLIT, TEXTBEFORE, TEXTAFTER",
              exp: "TEXTSPLIT: Delimiter par text split karta hai. TEXTBEFORE: Delimiter se pehle ka text deta hai. TEXTAFTER: Delimiter ke baad ka text deta hai.",
              purpose: "Full Names se First/Last Name alag karna ya Email se Username/Domain extract karna.",
              scenario: "Email in A2 = \"rahul.sharma@gmail.com\"",
              code: "=TEXTBEFORE(A2, \"@\")\n=TEXTAFTER(A2, \"@\")",
              result: "Result 1: \"rahul.sharma\", Result 2: \"gmail.com\""
            },
            {
              title: "[2] TEXTJOIN & CONCAT",
              exp: "TEXTJOIN custom delimiter aur ignore-blank option ke sath text merge karta hai. CONCAT simple list join karta hai.",
              purpose: "Multiple columns ke address/names ko ek single cell me jodne ke liye.",
              scenario: "A2=\"Delhi\", B2=\"India\".",
              code: "=TEXTJOIN(\", \", TRUE, A2, B2)",
              result: "Result: \"Delhi, India\""
            },
            {
              title: "[3] LEFT, RIGHT, MID, LEN",
              exp: "Text me se specified characters extract karna (LEFT=start, RIGHT=end, MID=beech). LEN total characters ginta hai.",
              purpose: "Serial Codes, Account Numbers, ya State Codes separate karna.",
              scenario: "Code A2 = \"DL-110001\". Extract state code & total length.",
              code: "=LEFT(A2, 2)\n=LEN(A2)",
              result: "Result 1: \"DL\", Result 2: 9"
            },
            {
              title: "[4] SEARCH & FIND",
              exp: "Text string me kisi character/word ki position batate hain. FIND case-sensitive hai, SEARCH case-insensitive.",
              purpose: "Dynamic text trimming logic ke liye character position dhoondna.",
              scenario: "Text A2 = \"Invoice # 450\". Search for '#' position.",
              code: "=SEARCH(\"#\", A2)",
              result: "Result: 9"
            },
            {
              title: "[5] SUBSTITUTE & REPLACE",
              exp: "SUBSTITUTE specific word ko replace karta hai; REPLACE character position ke basis par replace karta hai.",
              purpose: "Formatting errors sahi karna (hyphens/spaces remove karna).",
              scenario: "Phone A2 = \"9876-543-210\". Remove hyphens.",
              code: "=SUBSTITUTE(A2, \"-\", \"\")",
              result: "Result: \"9876543210\""
            },
            {
              title: "[6] TRIM, CLEAN, PROPER, UPPER, LOWER",
              exp: "TRIM: Extra spaces hatata hai. CLEAN: Non-printable characters hatata hai. PROPER: Title Case karta hai.",
              purpose: "Raw imported dirty data ko clean aur standardize karna.",
              scenario: "Text A2 = \"  rahul VERMA \".",
              code: "=PROPER(TRIM(A2))",
              result: "Result: \"Rahul Verma\""
            },
            {
              title: "[7] TEXT, VALUE, REPT, CHAR, CODE",
              exp: "TEXT: Number formatting text me karta hai. VALUE: Text number ko numeric banata hai. REPT: Character repeat karta hai.",
              purpose: "Custom formatting aur in-cell bar charts.",
              scenario: "Date A2 = 08/09/2026.",
              code: "=TEXT(A2, \"mmmm-yyyy\")",
              result: "Result: \"September-2026\""
            }
          ]
        },
        {
          name: "6. Math & Conditional Aggregations",
          preview: "SUM, SUMIF, SUMIFS, COUNT, COUNTA, COUNTBLANK, COUNTIF, COUNTIFS, AVERAGE, AVERAGEIF, AVERAGEIFS, SUMPRODUCT, MMULT, TRANSPOSE, ROUND, ROUNDUP, ROUNDDOWN, INT, TRUNC, ABS, MOD, AGGREGATE, SUBTOTAL, CEILING, FLOOR",
          topics: [
            {
              title: "[1] SUM, SUMIF, SUMIFS",
              exp: "SUM simple jodta hai. SUMIF 1 condition par jodta hai. SUMIFS Multiple conditions par jodta hai.",
              purpose: "Region-wise, Date-wise, ya Category-wise total sales nikalna.",
              scenario: "Region (Col A), Sales (Col B). Calculate North Region sales.",
              code: "=SUMIFS(B2:B10, A2:A10, \"North\")",
              result: "Result: North Region ka total sales."
            },
            {
              title: "[2] COUNT, COUNTA, COUNTBLANK, COUNTIF, COUNTIFS",
              exp: "Numbers, Non-blanks, Blanks, 1-Condition count, aur Multi-Condition counts karne ke functions.",
              purpose: "Attendance tracking, item frequency, aur filtered counts.",
              scenario: "Status (Col A), Dept (Col B). Count Present HR staff.",
              code: "=COUNTIFS(A2:A10, \"Present\", B2:B10, \"HR\")",
              result: "Result: Present HR Staff count."
            },
            {
              title: "[3] AVERAGE, AVERAGEIF, AVERAGEIFS",
              exp: "Un-conditional ya conditional datasets ka average (ausat) nikalna.",
              purpose: "Average order value ya category-wise average performance calculate karna.",
              scenario: "Calculate average sale for Delhi city.",
              code: "=AVERAGEIF(A2:A10, \"Delhi\", B2:B10)",
              result: "Result: Delhi city ki average sale."
            },
            {
              title: "[4] SUMPRODUCT",
              exp: "Multiple arrays ke corresponding elements ko pehle multiply karta hai, fir unka total sum nikalta hai.",
              purpose: "Bina extra helper column ke (Qty * Rate) ka total bill nikalna.",
              scenario: "Qty in A2:A4 (2, 3, 5), Rates in B2:B4 (100, 200, 50).",
              code: "=SUMPRODUCT(A2:A4, B2:B4)",
              result: "Result: (2*100) + (3*200) + (5*50) = 1050"
            },
            {
              title: "[5] ROUND, ROUNDUP, ROUNDDOWN, INT, TRUNC",
              exp: "Decimals ko round off karna (ROUND = standard, ROUNDUP = higher, ROUNDDOWN = lower, INT/TRUNC = decimals hatana).",
              purpose: "Financial billing aur tax calculation clear rounded numbers me rakhna.",
              scenario: "Val = 45.678. Round to 2 decimals.",
              code: "=ROUND(45.678, 2)",
              result: "Result: 45.68"
            },
            {
              title: "[6] SUBTOTAL & AGGREGATE",
              exp: "Filtered lists par calculations karte hain aur hidden/filtered-out rows ko ignore kar dete hain.",
              purpose: "Dynamic filtered dashboards me accurate totals dikhana.",
              scenario: "Sum visible rows of Column B.",
              code: "=SUBTOTAL(9, B2:B100)",
              result: "Result: Visible filtered total sum."
            }
          ]
        },
        {
          name: "7. Financial & Investment",
          preview: "XIRR, IRR, MIRR, XNPV, NPV, PMT, PPMT, IPMT, RATE, NPER, PV, FV, EFFECT, NOMINAL, SLN, DB, DDB",
          topics: [
            {
              title: "[1] XIRR & IRR",
              exp: "Investment returns (Internal Rate of Return) calculate karte hain. XIRR non-periodic dates ke cashflows ke liye accurate hai.",
              purpose: "Mutual funds, SIPs, aur Business Investments ka annual return rate (CAGR/IRR) nikalna.",
              scenario: "Dates in A2:A5, Cashflows in B2:B5 (-100000 initial investment).",
              code: "=XIRR(B2:B5, A2:A5)",
              result: "Result: Exact annual return percentage (e.g., 14.5%)."
            },
            {
              title: "[2] PMT, PPMT, IPMT",
              exp: "PMT: Total monthly EMI. PPMT: Principal portion. IPMT: Interest portion.",
              purpose: "Bank loans aur Equipment Leasing schedules design karna.",
              scenario: "Loan 50 Lakhs (5000000), Rate 8.5% p.a., Tenure 240 Months.",
              code: "=PMT(8.5%/12, 240, -5000000)",
              result: "Result: Exact Monthly EMI amount."
            },
            {
              title: "[3] NPV & XNPV",
              exp: "Future cash inflows ki Net Present Value calculate karta hai based on discount rate.",
              purpose: "Business project feasibility aur capital budgeting evaluations.",
              scenario: "Rate 10%, Cashflows in B2:B5.",
              code: "=NPV(10%, B2:B5)",
              result: "Result: Net Present Value of investment."
            },
            {
              title: "[4] SLN, DB, DDB",
              exp: "Asset Depreciation (SLN = Straight Line, DB/DDB = Declining Balance Method) calculate karte hain.",
              purpose: "Company machinery/laptop assets ki yearly book value write-off calculate karna.",
              scenario: "Cost 100000, Salvage 10000, Life 5 Years.",
              code: "=SLN(100000, 10000, 5)",
              result: "Result: 18000 per year depreciation."
            }
          ]
        },
        {
          name: "8. Date & Time Calculations",
          preview: "TODAY, NOW, DATE, DATEDIF, EDATE, EOMONTH, YEAR, MONTH, DAY, WEEKDAY, WEEKNUM, ISOWEEKNUM, WORKDAY, WORKDAY.INTL, NETWORKDAYS, NETWORKDAYS.INTL, TIME, HOUR, MINUTE, SECOND",
          topics: [
            {
              title: "[1] TODAY & NOW",
              exp: "TODAY aaj ki current system date deta hai; NOW date aur current time dono deta hai.",
              purpose: "Dynamic aging calculations aur live execution timestamps.",
              scenario: "Get today's dynamic system date.",
              code: "=TODAY()",
              result: "Result: 08-09-2026"
            },
            {
              title: "[2] DATEDIF",
              exp: "Do dates ke beech ka exact difference (Years, Months, ya Days me) nikalta hai.",
              purpose: "Age calculation, Employee Tenure, ya Project Duration evaluation.",
              scenario: "DOB in A2 = 15-08-1995. Current Date = TODAY().",
              code: "=DATEDIF(A2, TODAY(), \"Y\")",
              result: "Result: 31 Years"
            },
            {
              title: "[3] EDATE & EOMONTH",
              exp: "EDATE N-months aage/peeche ki exact date deta hai. EOMONTH us mahine ki last date (End of Month) deta hai.",
              purpose: "Invoice Due Dates, Subscription Expiry, aur Monthly Financial Closing dates.",
              scenario: "Invoice Date A2 = 10-01-2026.",
              code: "=EDATE(A2, 3)\n=EOMONTH(A2, 0)",
              result: "Result 1: 10-04-2026, Result 2: 31-01-2026"
            },
            {
              title: "[4] WORKDAY & NETWORKDAYS (INCLUDING .INTL)",
              exp: "NETWORKDAYS: Weekends & Holidays minus karke working days ginta hai. WORKDAY: Target completion date batata hai.",
              purpose: "Project SLA tracking aur corporate payroll processing.",
              scenario: "Start A2 = 01-09-2026, End B2 = 30-09-2026 (Sunday off only).",
              code: "=NETWORKDAYS.INTL(A2, B2, 11)",
              result: "Result: Total working days in September excluding Sundays."
            }
          ]
        },
        {
          name: "9. Statistical & Database",
          preview: "MAX, MIN, MAXIFS, MINIFS, LARGE, SMALL, RANK, MEDIAN, MODE, STDEV.S, VAR.S, DSUM, DCOUNT, DAVERAGE",
          topics: [
            {
              title: "[1] MAX, MIN, MAXIFS, MINIFS",
              exp: "Range me se highest/lowest value nikalna (MAXIFS/MINIFS condition ke sath karte hain).",
              purpose: "Highest Sale, Minimum Temperature, ya Top Branch Performance identify karna.",
              scenario: "Find maximum sale in North Region.",
              code: "=MAXIFS(B2:B10, A2:A10, \"North\")",
              result: "Result: North Region ki maximum sale."
            },
            {
              title: "[2] LARGE & SMALL",
              exp: "Dataset me se K-th position ki highest ya lowest value nikalta hai (e.g., 2nd Highest, 3rd Lowest).",
              purpose: "Top 3 Performers ya Runner-up values highlight karna.",
              scenario: "Scores in A2:A10. Find 2nd highest score.",
              code: "=LARGE(A2:A10, 2)",
              result: "Result: 2nd Highest Score."
            },
            {
              title: "[3] MEDIAN, MODE, STDEV.S",
              exp: "Statistical measures (MEDIAN = Middle Value, MODE = Most Frequent Value, STDEV = Standard Deviation/Variation).",
              purpose: "Retail basket analysis aur quality control risk analysis.",
              scenario: "Order sizes A2:A10.",
              code: "=MEDIAN(A2:A10)",
              result: "Result: Central order value."
            },
            {
              title: "[4] DSUM, DCOUNT, DAVERAGE",
              exp: "Database criteria range ke basis par calculations karne wale structured tools.",
              purpose: "Complex multi-column criteria lists par quick database summary.",
              scenario: "Calculate sum based on Criteria Range E1:F2.",
              code: "=DSUM(A1:C100, \"Sales\", E1:F2)",
              result: "Result: Filtered database total sum."
            }
          ]
        }
      ]
    },
    opt2: {
      title: "2. All Shortcut Keys (Pro)",
      icon: "fa-keyboard",
      subcategories: [
        {
          name: "1. Pro Ribbon Alt-Codes (Formatting & Layout)",
          preview: "Alt + H + L, Alt + H + O + I, Alt + H + O + A, Alt + H + B, Alt + H + M + C, Alt + H + F + M",
          topics: [
            { title: "[1] Alt + H + L", exp: "Home Ribbon se Conditional Formatting Menu open karta hai.", purpose: "Key metrics ko highlight karne ke liye conditional rules fast open karna.", scenario: "Shortcut Execution", code: "Press Alt -> H -> L", result: "Conditional Formatting Menu Opens" },
            { title: "[2] Alt + H + O + I", exp: "Selected Columns ki width ko unke longest content ke hisab se Auto-fit karta hai.", purpose: "Text ke cutne (e.g. ### error) ko seconds me fix karna.", scenario: "Column auto-fit", code: "Press Alt -> H -> O -> I", result: "Columns Auto-Fitted" },
            { title: "[3] Alt + H + O + A", exp: "Selected Rows ki height ko Auto-fit karta hai.", purpose: "Multi-line wrapped text rows ki alignment instantly clean karna.", scenario: "Row height auto-fit", code: "Press Alt -> H -> O -> A", result: "Row Heights Auto-Fitted" },
            { title: "[4] Alt + H + B", exp: "Cell Borders popup menu open karta hai.", purpose: "Tables me All Borders, Thick Bottom Borders fast apply karna.", scenario: "Borders menu trigger", code: "Press Alt -> H -> B", result: "Borders Menu Opens" },
            { title: "[5] Alt + H + M + C", exp: "Selected cells ko Merge karke text ko Center align karta hai.", purpose: "Dashboard Headers aur Main Report Titles create karna.", scenario: "Merge and center cells", code: "Press Alt -> H -> M -> C", result: "Cells Merged & Centered" },
            { title: "[6] Alt + H + F + M", exp: "Full Format Cells dialog window (Number, Alignment, Font, Border, Fill) open karta hai.", purpose: "Precision custom formatting apply karne ke liye.", scenario: "Format cells dialog", code: "Press Alt -> H -> F -> M", result: "Format Cells Dialog Opens" }
          ]
        },
        {
          name: "2. Pro Ribbon Alt-Codes (Data Tools)",
          preview: "Alt + A + M, Alt + A + V + V, Alt + A + T, Alt + A + C, Alt + N + V, Alt + N + T, Alt + W + F + F",
          topics: [
            { title: "[1] Alt + A + M", exp: "Data Tab se Remove Duplicates tool trigger karta hai.", purpose: "Clean unique master lists generate karna.", scenario: "Deduplication", code: "Press Alt -> A -> M", result: "Remove Duplicates Window Opens" },
            { title: "[2] Alt + A + V + V", exp: "Data Validation window open karta hai.", purpose: "Dropdown lists, numeric limits, aur restricted entry rules lagana.", scenario: "Data validation", code: "Press Alt -> A -> V -> V", result: "Data Validation Window Opens" },
            { title: "[3] Alt + A + T", exp: "Header Row par AutoFilter arrows Turn ON/OFF (Toggle) karta hai.", purpose: "Instant data filtering start/stop karna.", scenario: "Toggle Filter", code: "Press Alt -> A -> T", result: "Filters Toggled" },
            { title: "[4] Alt + A + C", exp: "Active sheet ke saare applied Filters ko ek sath Clear kar deta hai.", purpose: "Filtered data view se instant normal view me lautna.", scenario: "Clear all filters", code: "Press Alt -> A -> C", result: "Filters Cleared" },
            { title: "[5] Alt + N + V", exp: "Insert Pivot Table dialog box open karta hai.", purpose: "Raw data se summary reports compile karna start karna.", scenario: "Insert pivot table", code: "Press Alt -> N -> V", result: "Pivot Table Dialog Opens" },
            { title: "[6] Alt + N + T", exp: "Selected range ko official Excel Dynamic Table format (Ctrl+T) me convert karta hai.", purpose: "Auto-expanding ranges aur clean striped styling apply karna.", scenario: "Convert to dynamic table", code: "Press Alt -> N -> T", result: "Range Converted to Dynamic Table" },
            { title: "[7] Alt + W + F + F", exp: "Selected Row/Column par Freeze Panes apply/remove karta hai.", purpose: "Badi sheets me scroll karte waqt Headers ko freeze rakhna.", scenario: "Freeze Panes", code: "Press Alt -> W -> F -> F", result: "Panes Frozen" }
          ]
        },
        {
          name: "3. Speed Navigation & Selection",
          preview: "Ctrl + Shift + L, Ctrl + Alt + V, Ctrl + Shift + Arrow Keys, Ctrl + Space / Shift + Space, Ctrl + Backspace, Ctrl + PageUp / Ctrl + PageDown",
          topics: [
            { title: "[1] Ctrl + Shift + L", exp: "Filter Toggle shortcut (Ribbon Alt+A+T ka fast direct keyboard version).", purpose: "Instant filtering toggle.", scenario: "Quick filter", code: "Press Ctrl + Shift + L", result: "Filters Applied/Removed" },
            { title: "[2] Ctrl + Alt + V", exp: "Paste Special Dialog Window open karta hai.", purpose: "Sirf Values, Formulas, Formats, ya Column Widths paste karne ke liye.", scenario: "Paste special", code: "Press Ctrl + Alt + V", result: "Paste Special Menu Opens" },
            { title: "[3] Ctrl + Shift + Arrow Keys", exp: "Data block ke last occupied cell tak instant range selection karta hai.", purpose: "Lakho rows ko bina mouse drag kiye 1 second me select karna.", scenario: "Select range to end", code: "Press Ctrl + Shift + Down/Right Arrow", result: "Entire Data Block Selected" },
            { title: "[4] Ctrl + Space / Shift + Space", exp: "Ctrl + Space: Poora Column select karta hai. Shift + Space: Poori Row select karti hai.", purpose: "Entire row/column operations fast perform karna.", scenario: "Full selection", code: "Press Ctrl + Space OR Shift + Space", result: "Entire Column / Row Selected" },
            { title: "[5] Ctrl + Backspace", exp: "Badi range select karne ke baad screen ko active focus cell par wapas jump kara deta hai.", purpose: "Navigation ke waqt context losing avoid karna.", scenario: "Jump to active cell", code: "Press Ctrl + Backspace", result: "View Jumped to Active Cell" },
            { title: "[6] Ctrl + PageUp / Ctrl + PageDown", exp: "Workbook ke alag-alag Worksheets/Tabs ke beech left/right switch karta hai.", purpose: "Mouse touch kiye bina multi-sheet audit karna.", scenario: "Switch worksheet tabs", code: "Press Ctrl + PageUp / PageDown", result: "Switched to Next/Previous Sheet" }
          ]
        },
        {
          name: "4. Formula & Editing Power Shortcuts",
          preview: "Alt + =, F4, Ctrl + ~, Ctrl + E, Ctrl + D / Ctrl + R, F9",
          topics: [
            { title: "[1] Alt + =", exp: "AutoSum trigger karta hai. Smartly surrounding range detect karke SUM formula apply kar deta hai.", purpose: "Financial tables ke bottom me instant total nikalna.", scenario: "Instant sum", code: "Press Alt + =", result: "=SUM(...) Inserted" },
            { title: "[2] F4", exp: "Formula Edit Mode me cell reference freeze ($A$1) switch karta hai; Normal mode me last action repeat karta hai.", purpose: "Absolute locking aur repetitive formatting speed up karna.", scenario: "Toggle reference lock", code: "Press F4 in Formula Edit", result: "$A$1 -> A$1 -> $A1 -> A1" },
            { title: "[3] Ctrl + ~ (Tilde)", exp: "Whole Sheet me Formula View ko Toggle karta hai (Values ki jagah backend formulas dikhai dete hain).", purpose: "Entire sheet ki calculation auditing aur troubleshooting.", scenario: "Formula auditing", code: "Press Ctrl + ~", result: "Show Formulas Toggled" },
            { title: "[4] Ctrl + E", exp: "Flash Fill trigger karta hai. User dwara diye gaye examples ka pattern pehchan kar auto-fill kar deta hai.", purpose: "Text extraction, split, aur formatting bina kisi formula ke.", scenario: "Flash fill pattern", code: "Press Ctrl + E", result: "Data Automatically Filled" },
            { title: "[5] Ctrl + D / Ctrl + R", exp: "Ctrl + D: Upar wale cell ka content Down fill karta hai. Ctrl + R: Left wale cell ka content Right fill karta hai.", purpose: "Formula aur content quick copy across cells.", scenario: "Fill Down / Fill Right", code: "Press Ctrl + D OR Ctrl + R", result: "Content Filled Down/Right" },
            { title: "[6] F9", exp: "Formula bar me selected portion/expression ko calculate karke uski exact value dikhata hai.", purpose: "Complex nested formulas me bugs fix karna.", scenario: "Evaluate formula portion", code: "Select formula part & Press F9", result: "Shows Evaluated Result" }
          ]
        },
        {
          name: "5. Power Query & Automation Shortcuts",
          preview: "Alt + F12, Alt + F8, Alt + F11, Alt + F1",
          topics: [
            { title: "[1] Alt + F12", exp: "Excel me direct Power Query Editor Window open karta hai.", purpose: "Data ETL pipelines manage karna.", scenario: "Open Power Query", code: "Press Alt + F12", result: "Power Query Editor Opens" },
            { title: "[2] Alt + F8", exp: "Macro Dialog Box open karta hai jahan se existing Macros ko Run, Edit ya Delete kar sakte hain.", purpose: "Macro management.", scenario: "Run macro", code: "Press Alt + F8", result: "Macro Window Opens" },
            { title: "[3] Alt + F11", exp: "VBA Editor Window (Visual Basic for Applications) open/switch karta hai.", purpose: "Automation scripts aur custom VBA modules write karna.", scenario: "Open VBA Editor", code: "Press Alt + F11", result: "VBA Editor Opens" },
            { title: "[4] Alt + F1", exp: "Selected data range se instant default Embedded Chart active worksheet par create kar deta hai.", purpose: "Instant chart creation.", scenario: "Create quick chart", code: "Select Data & Press Alt + F1", result: "Embedded Chart Inserted" }
          ]
        },
        {
          name: "6. Workbook Management & Auditing",
          preview: "Ctrl + Shift + U, Ctrl + [ / Ctrl + ], F5 + Alt + S",
          topics: [
            { title: "[1] Ctrl + Shift + U", exp: "Formula Bar window height ko Expand ya Collapse (Multi-line view) karta hai.", purpose: "Lambe multi-line dynamic formulas ya LET functions ko comfortable read karna.", scenario: "Expand formula bar", code: "Press Ctrl + Shift + U", result: "Formula Bar Expanded" },
            { title: "[2] Ctrl + [ and Ctrl + ]", exp: "Ctrl + [: Active formula ke Direct Precedents par jump karta hai. Ctrl + ]: Dependents cells par jump karta hai.", purpose: "Large financial models audit karna.", scenario: "Audit precedents", code: "Press Ctrl + [ OR Ctrl + ]", result: "Jumped to Source/Dependent Cell" },
            { title: "[3] F5 + Alt + S", exp: "'Go To Special' window open karta hai.", purpose: "Sirf Blank cells, Formula cells, Constants, ya Visible cells select karna.", scenario: "Go to special", code: "Press F5 -> Press Alt + S", result: "Go To Special Dialog Opens" }
          ]
        }
      ]
    },
    opt3: {
      title: "3. All Built-in Functions",
      icon: "fa-layer-group",
      subcategories: [
        {
          name: "Complete Function Catalog Breakdown (500+ Functions Indexing)",
          preview: "Compatibility, Engineering, Information, Logical, Math & Trig, Statistical, Web & Cube Functions",
          topics: [
            { title: "[1] COMPATIBILITY FUNCTIONS", exp: "Old Excel versions (2007 ya pehle) ke legacy functions jo backward compatibility ke liye available hain (e.g. STDEV, VAR, RANK).", purpose: "Purani legacy automated templates ko bina break kiye open rakhna.", scenario: "Legacy support", code: "=STDEV(A1:A10)", result: "Standard Deviation (Legacy)" },
            { title: "[2] ENGINEERING FUNCTIONS", exp: "Complex engineering calculations, number base conversions (BIN2DEC, HEX2DEC), aur Bessel/Complex Numbers handle karte hain.", purpose: "Scientific, electrical, aur signal-processing measurement units mapping.", scenario: "Convert binary to decimal", code: "=BIN2DEC(\"1010\")", result: "10" },
            { title: "[3] INFORMATION FUNCTIONS", exp: "System, Cell, ya Error properties verify karne wale functions (ISFORMULA, CELL, INFO, SHEET).", purpose: "Dynamic sheet auditing aur error-handling conditional execution.", scenario: "Check if cell has formula", code: "=ISFORMULA(C2)", result: "TRUE / FALSE" },
            { title: "[4] LOGICAL FUNCTIONS", exp: "Boolean logic evaluate karne wale tools (IF, AND, OR, SWITCH, LET, LAMBDA).", purpose: "System workflows me decision branching automate karna.", scenario: "Logical evaluation", code: "=IF(A1>50, \"High\", \"Low\")", result: "High / Low" },
            { title: "[5] MATH & TRIG FUNCTIONS", exp: "Mathematical, Trigonometric, aur Aggregation tools (SUM, ABS, SIN, COS, SQRT, AGGREGATE, MOD).", purpose: "Financial modeling, scaling, aur geometric calculations.", scenario: "Square root calculation", code: "=SQRT(144)", result: "12" },
            { title: "[6] STATISTICAL FUNCTIONS", exp: "Probability distributions, trends, aur data modeling functions (AVERAGE, STDEV, FORECAST, PERCENTILE, CORREL).", purpose: "Business forecasting, market trend analysis, aur risk management.", scenario: "Forecasting future sales", code: "=FORECAST.LINEAR(X, Known_y, Known_x)", result: "Forecasted Value" },
            { title: "[7] WEB & CUBE FUNCTIONS", exp: "WEB: Web APIs se direct data import tools (WEBSERVICE, FILTERXML). CUBE: Power Pivot Data Models se MDX metrics query tools (CUBEMEMBER, CUBEVALUE).", purpose: "Real-time stock prices, live weather APIs, aur Enterprise BI Warehouses connection.", scenario: "Fetch live API data", code: "=WEBSERVICE(\"https://api.example.com/data\")", result: "XML/JSON Response String" }
          ]
        }
      ]
    },
    opt4: {
      title: "4. Data Cleansing & Formatting",
      icon: "fa-broom",
      subcategories: [
        {
          name: "Data Sanitation & Structure Tools",
          preview: "Text to Columns, Data Validation, Conditional Formatting, Duplicate Removal, Custom Number Formatting",
          topics: [
            {
              title: "[1] TEXT TO COLUMNS & FLASH FILL",
              exp: "Text to Columns: Single column text ko comma/space se multiple columns me split karta hai. Flash Fill (Ctrl+E): Pattern pehchan kar thousands of rows auto-fill karta hai.",
              purpose: "CRM/ERP raw strings ko clean tabular layout me convert karna.",
              scenario: "Raw String Cell A2: \"Rahul_Sharma_Delhi_9876543210\"",
              code: "Using Delimiter \"_\":\nCol B=\"Rahul\", Col C=\"Sharma\", Col D=\"Delhi\", Col E=\"9876543210\"",
              result: "Clean Split Columns"
            },
            {
              title: "[2] ADVANCED DATA VALIDATION & DROPDOWNS",
              exp: "Cell me restricted entry criteria set karta hai (List dropdowns, date limits, custom logical formulas).",
              purpose: "Data entry level par hi typos aur wrong inputs ko rokna.",
              scenario: "Restrict inputs in B2:B100 to specific regions.",
              code: "Data Validation -> Allow: List -> Source: \"North, South, East, West\"",
              result: "Interactive Dropdown Created"
            },
            {
              title: "[3] CONDITIONAL FORMATTING WITH CUSTOM RULES",
              exp: "Data value ya custom formula ke basis par automatic Color, Data Bars, ya Icon Sets apply karta hai.",
              purpose: "Outliers, negative profits, overdue payments ko highlight karna.",
              scenario: "Highlight sales < ₹10,000 in red.",
              code: "Custom Formula Rule: = $C2 < 10000",
              result: "Low sales rows highlighted red"
            },
            {
              title: "[4] DUPLICATE REMOVAL & UNIQUE IDENTIFIERS",
              exp: "Duplicate records detection aur cleanup tool jo specific key columns check karke repeated rows delete karta hai.",
              purpose: "Customer directory aur GST databases sanitize karna.",
              scenario: "Deduplicate master list based on Mobile Number column.",
              code: "Data Tab -> Remove Duplicates -> Select [Mobile Number]",
              result: "Unique records retained"
            },
            {
              title: "[5] CUSTOM NUMBER FORMATTING",
              exp: "Cell stored numerical value ko change kiye bina screen display custom formatting set karna. Syntax: Positive; Negative; Zero; Text.",
              purpose: "Currency symbols (₹, $), Thousands (K/M) formatting, trailing zeros set karna.",
              scenario: "Format code: ₹#,##0.00;[Red](₹#,##0.00);\"-\"",
              code: "Format Code: ₹#,##0.00;[Red](₹#,##0.00);\"-\"",
              result: "Positive: ₹5,000.00 | Negative: [Red](₹5,000.00) | Zero: -"
            }
          ]
        }
      ]
    },
    opt5: {
      title: "5. Pivot Tables & Data Modeling",
      icon: "fa-chart-pie",
      subcategories: [
        {
          name: "Pivot Engine & Data Modeling",
          preview: "Foundations, Calculated Fields, Slicers & Timelines, Data Model Relationships, DAX Basics",
          topics: [
            { title: "[1] PIVOT TABLE FOUNDATIONS & LAYOUTS", exp: "Large flat datasets ko drag-and-drop fields (Filters, Columns, Rows, Values) se summarize karne ka tool.", purpose: "Millions of sales records se within seconds category/month summary matrices banana.", scenario: "50,000 sales rows summary", code: "Rows = Region, Cols = Payment Mode, Values = Sum of Amount", result: "Clean Matrix Summary" },
            { title: "[2] CALCULATED FIELDS & CALCULATED ITEMS", exp: "Original source raw table me new columns add kiye bina direct Pivot Engine ke andar custom calculations create karna.", purpose: "On-the-fly GST Taxes, Commission Margins compute karna.", scenario: "Add Tax column in Pivot", code: "Calculated Field Name 'Tax' = Sales * 0.18", result: "Tax computed automatically" },
            { title: "[3] SLICERS, TIMELINES & REPORT CONNECTIONS", exp: "Visual interactive buttons (Slicers) aur date sliders (Timelines) jo multi-pivot charts ko ek sath filter karte hain.", purpose: "Interactive Executive Management Dashboards develop karna.", scenario: "Filter dashboard by Year 2026 button", code: "Slicer -> Report Connections -> Select All Pivots", result: "All Dashboard Charts Sync Filtered" },
            { title: "[4] DATA MODEL & TABULAR RELATIONSHIPS", exp: "Multiple relational tables ko Primary Key columns se connect karke Power Pivot Data Model create karna (VLOOKUP ki zaroorat khatam).", purpose: "Enterprise multi-table star schema reporting without flat VLOOKUP redundancy.", scenario: "Connect Sales Table [Customer ID] with Customer Master [Customer ID].", code: "Data Model -> Create Relationship", result: "Seamless Multi-Table Pivot" },
            { title: "[5] DAX MEASURES BASICS (SUMX, CALCULATE, RELATED)", exp: "DAX dynamic analytical formulas jo Data Models me context-aware calculations karte hain (CALCULATE, SUMX, RELATED).", purpose: "High-level BI metrics, YTD/MTD, aur dynamic KPIs compute karna.", scenario: "Measure for High Value Sales (> 50,000)", code: "High Sales = CALCULATE(SUM(Sales[Amount]), Sales[Amount] > 50000)", result: "Context Aware Dynamic DAX Measure" }
          ]
        }
      ]
    },
    opt6: {
      title: "6. Power Query & ETL",
      icon: "fa-diagram-project",
      subcategories: [
        {
          name: "Extract, Transform & Load Pipelines",
          preview: "Data Import, Transformations, Merging & Appending, Custom Columns, M-Code Syntax",
          topics: [
            { title: "[1] DATA IMPORT (CSV, WEB, SQL, PDF)", exp: "External sources (Text, Web, SQL, PDF) se live data connection query banakar Excel me ingest karna.", purpose: "Manual copy-paste khatam karke single-click refreshable pipelines ready karna.", scenario: "Extract transaction table from PDF Bank Statement", code: "Data Tab -> Get Data -> From PDF -> Select File", result: "Auto-extracted clean table" },
            { title: "[2] TRANSFORMATIONS (UNPIVOTING, TRANSPOSING, GROUP BY)", exp: "Dirty imported tables ko clean tabular format me restructure karna. Unpivoting crosstabs ko clean vertical lists me badalta hai.", purpose: "Irregular crosstab reports ko standard database layout me convert karna.", scenario: "Unpivot wide month columns (Jan, Feb, Mar) into vertical list", code: "Select Month Columns -> Right Click -> Unpivot Columns", result: "Vertical Attribute/Value Table" },
            { title: "[3] MERGING (JOINS) & APPENDING QUERIES", exp: "Merging: Do tables ko key column se join karna (SQL Joins). Appending: Multiple files ko vertically combine (stack) karna.", purpose: "12 months ke CSV files ko combine karke single master query table banana.", scenario: "Combine 12 monthly sales CSVs from folder", code: "Power Query -> Combine Files -> Append Queries", result: "1 Master Consolidated Table" },
            { title: "[4] CUSTOM COLUMNS & CONDITIONAL LOGIC", exp: "Power Query Editor GUI me point-and-click Interface se custom formulas aur if-then-else logic append karna.", purpose: "Excel environment me load hone se pehle backend data preparation.", scenario: "Categorize order size", code: "Add Conditional Column: If Quantity > 100 then \"Bulk Order\" else \"Regular\"", result: "New Categorized Column Created" },
            { title: "[5] M-CODE SYNTAX BASICS", exp: "M-Code Power Query engine ke peeche chalne wali functional expression programming language hai.", purpose: "Advanced custom transformation steps aur automated ETL pipelines write karna.", scenario: "Filter rows in M-Code", code: "Table.SelectRows(Source, each ([Sales] > 10000))", result: "Filtered Table Step Executed" }
          ]
        }
      ]
    },
    opt7: {
      title: "7. VBA, Macros & Automation",
      icon: "fa-code",
      subcategories: [
        {
          name: "VBA Programming & Process Automation",
          preview: "Developer Tab & Macro Recorder, Sub vs Function, Range Manipulations, Control Loops, Userforms",
          topics: [
            { title: "[1] DEVELOPER TAB & MACRO RECORDER", exp: "Developer Tab advanced tools unlock karta hai. Macro Recorder mouse/keyboard actions ko backend VBA code me translate karta hai.", purpose: "Daily repetitive formatting ko 1-click button automation me badalna.", scenario: "Record table formatting macro", code: "Developer -> Record Macro -> Perform Steps -> Stop Recording", result: "Reusable Macro Created" },
            { title: "[2] VBA MODULES, PROCEDURES & FUNCTIONS (SUB VS FUNCTION)", exp: "Sub Procedures (Sub...End Sub) task perform karte hain. User Defined Functions (Function...End Function) custom value return karte hain.", purpose: "Business workflow logic aur custom functions write karna.", scenario: "Write routine to clear data", code: "Sub ClearData()\n  Range(\"A2:D100\").ClearContents\nEnd Sub", result: "Executable VBA Procedure" },
            { title: "[3] RANGE & CELL MANIPULATIONS", exp: "VBA Code se cells, rows, columns, aur sheets ko programmatically read, write aur format karna.", purpose: "Automatic report generation, PDF exports, aur auto-email attachments.", scenario: "Set title header programmatically", code: "Worksheets(\"Sales\").Range(\"A1\").Value = \"Monthly Report 2026\"", result: "Cell A1 Updated via Code" },
            { title: "[4] CONTROL LOOPS (FOR NEXT, DO WHILE, FOR EACH)", exp: "Repetitive programming structures jo thousands of cells par iterate karke logic apply karte hain.", purpose: "Batch file processing aur automated auditing.", scenario: "Loop through rows 2 to 100 and fill blanks", code: "For i = 2 To 100\n  If Cells(i, 1).Value = \"\" Then Cells(i, 1).Value = \"Missing\"\nNext i", result: "Blank cells auto-filled with 'Missing'" },
            { title: "[5] USERFORMS & INTERACTIVE DIALOGS", exp: "Excel ke upar custom Graphical User Interface (GUI) Forms create karna jisme Textboxes, Buttons, Dropdowns hote hain.", purpose: "Secured error-free application layer for data entry operators.", scenario: "Data entry userform", code: "UserForm.Show -> Submit Button Click -> Append to Master Sheet", result: "Custom Application Window Executed" }
          ]
        }
      ]
    },
    opt8: {
      title: "8. Dashboards, Charts & Analytics",
      icon: "fa-chart-line",
      subcategories: [
        {
          name: "Visual Analytics & Boardroom Dashboards",
          preview: "Dynamic Charting, Form Controls, Sparklines, KPI Cards, Dynamic Named Ranges",
          topics: [
            { title: "[1] DYNAMIC CHARTING (WATERFALL, SUNBURST, GAUGE, COMBINATION)", exp: "Advanced visual charts: Waterfall (Profit/Loss bridge), Sunburst (Hierarchy), Gauge (Targets), Combination (Dual-axis).", purpose: "Executive boardroom management presentations me visual storytelling.", scenario: "Gross Revenue to Net Income variance", code: "Insert -> Waterfall Chart -> Set Total Columns", result: "Financial Variance Bridge Chart" },
            { title: "[2] FORM CONTROLS (CHECKBOXES, OPTION BUTTONS, SCROLLBARS)", exp: "Interactive UI elements jo cells ke TRUE/FALSE ya numeric values se link hokar dynamic charts/formulas control karte hain.", purpose: "Interactive scenario modeling (Best Case / Worst Case projections).", scenario: "Toggle tax overlay on chart", code: "Checkbox linked to Cell $A$1 -> Chart Series Formula uses IF($A$1, ...)", result: "Interactive Toggable Chart Overlay" },
            { title: "[3] SPARKLINES & MICRO CHARTS", exp: "Single cell ke andar hone wale tiny mini line/column graphs jo micro-trends dikhate hain.", purpose: "Compact summary tables me row-level trend monitoring.", scenario: "12 months sales trend inside single cell G2", code: "Insert -> Sparklines -> Select Range A2:F2 Target G2", result: "In-cell Trend Sparkline" },
            { title: "[4] KPI CARDS & EXECUTIVE DASHBOARD DESIGN", exp: "High-level summarized visual cards displaying primary metrics (Revenue, Target %, NPS Score) using clean typography.", purpose: "C-Suite Executives ko 5-second snapshot visual summary provide karna.", scenario: "Big bold metric card with trend badge", code: "Card UI: \"₹ 1.25 Cr\" with badge \"+12% vs Last Month\"", result: "Executive KPI Card" },
            { title: "[5] DYNAMIC NAMED RANGES WITH OFFSET & INDEX", exp: "Formula-driven named ranges jo new rows add hone par automatically expand ho jati hain.", purpose: "Charts aur Dropdowns ko dynamic source ranges allocate karna.", scenario: "Auto-expanding dynamic range formula", code: "=OFFSET(Sheet1!$A$1, 0, 0, COUNTA(Sheet1!$A:$A), 1)", result: "Chart Source Auto-Grows With New Data" }
          ]
        }
      ]
    }
  };

  /* --------------------------------------------------------------------------
     PAGE 2 RENDERING ENGINE
     -------------------------------------------------------------------------- */
  const dashboardGrid = document.getElementById("dashboardGrid");

  function renderDashboard() {
    dashboardGrid.innerHTML = "";
    Object.keys(masterData).forEach((key) => {
      const item = masterData[key];
      const card = document.createElement("div");
      card.className = "dash-card";
      card.innerHTML = `
        <div class="dash-icon"><i class="fa-solid ${item.icon}"></i></div>
        <div class="dash-card-title">${item.title}</div>
        <div class="subcat-preview">${item.subcategories.length} Sub-Categories Available</div>
      `;
      card.addEventListener("click", () => openPage3(key));
      dashboardGrid.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------------
     PAGE 3 RENDERING ENGINE
     -------------------------------------------------------------------------- */
  function openPage3(categoryKey) {
    selectedCategoryKey = categoryKey;
    const catData = masterData[categoryKey];

    document.getElementById("p3BreadcrumbCategory").innerText = catData.title;
    document.getElementById("p3CategoryTitle").innerText = catData.title;

    const subcatGrid = document.getElementById("subcatGrid");
    subcatGrid.innerHTML = "";

    catData.subcategories.forEach((subcat, idx) => {
      const card = document.createElement("div");
      card.className = "subcat-card";
      card.innerHTML = `
        <div>
          <div class="subcat-num">Subcategory ${idx + 1}</div>
          <div class="subcat-title">${subcat.name}</div>
          <div class="subcat-preview">${subcat.preview}</div>
        </div>
        <div style="margin-top: 1rem; color: var(--accent); font-weight: 700; font-size: 0.85rem;">
          Explore Topics <i class="fa-solid fa-arrow-right"></i>
        </div>
      `;
      card.addEventListener("click", () => openPage4(idx));
      subcatGrid.appendChild(card);
    });

    navigateToPage("page3");
  }

  /* --------------------------------------------------------------------------
     PAGE 4 RENDERING ENGINE
     -------------------------------------------------------------------------- */
  function openPage4(subcatIdx) {
    selectedSubcatIndex = subcatIdx;
    const catData = masterData[selectedCategoryKey];
    const subcat = catData.subcategories[subcatIdx];

    document.getElementById("p4BreadcrumbCategory").innerText = catData.title;
    document.getElementById("p4BreadcrumbSubcat").innerText = subcat.name;
    document.getElementById("p4SubcatTitle").innerText = subcat.name;

    const topicList = document.getElementById("topicList");
    topicList.innerHTML = "";

    subcat.topics.forEach((topic) => {
      const card = document.createElement("div");
      card.className = "topic-card";
      card.innerHTML = `
        <div class="topic-card-header">
          <span class="topic-badge">Topic</span>
          <h3 class="topic-name">${topic.title}</h3>
        </div>
        
        <div class="detail-block">
          <div class="detail-label"><i class="fa-solid fa-circle-info"></i> Explanation</div>
          <p class="detail-text">${topic.exp}</p>
        </div>

        <div class="detail-block">
          <div class="detail-label"><i class="fa-solid fa-bullseye"></i> Purpose</div>
          <p class="detail-text">${topic.purpose}</p>
        </div>

        <div class="detail-block">
          <div class="detail-label"><i class="fa-solid fa-lightbulb"></i> Scenario & Example</div>
          <p class="detail-text">${topic.scenario}</p>
          <div class="code-box">${topic.code}</div>
          <div><span class="result-tag">${topic.result}</span></div>
        </div>
      `;
      topicList.appendChild(card);
    });

    navigateToPage("page4");
  }

  // Initialize Dashboard Cards on Startup
  renderDashboard();
});
