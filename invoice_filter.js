// Invoice Filter
// 1. Get the array of jobs from CSV parser node
const rows = $json.text || [];
// Standardize property names to match grouping logic
const normalize = obj => ({
  company: obj.Company || obj.company || "",
  job_key: obj["Job Key"] || obj.job_key || "",
  reference_number: obj["Reference Number"] || obj.reference_number || "",
  job_title: obj["Job Title"] || obj.job_title || "",
  location: obj.Location || obj.location || "",
  quantity: obj.Quantity || obj.quantity || "",
  unit: obj.Unit || obj.unit || "",
  average_cost: obj["Average Cost"] || obj.average_cost || "",
  total: obj.Total || obj.total || "",
  currency: obj.Currency || obj.currency || "",
});

// 2. Format numeric values to 2 decimal places (as strings)
const normalizedRows = rows
  .map(normalize)
  .filter(obj => obj.reference_number && obj.job_title); // Filter summary lines

for (const obj of normalizedRows) {
  // Convert and format numeric fields if present
  if (obj.total && !isNaN(obj.total)) obj.total = parseFloat(obj.total).toFixed(2);
  if (obj.average_cost && !isNaN(obj.average_cost)) obj.average_cost = parseFloat(obj.average_cost).toFixed(2);
  if (obj.quantity && !isNaN(obj.quantity)) obj.quantity = parseInt(obj.quantity, 10);
}

// 3. Define groups
const EVERETT_LOCATIONS = [
  "Maumelle", "Little Rock", "Conway", "Tyler", "Southaven", "Oxford", "Fayetteville", "Dallas", "Searcy", "Jonesboro", "Rogers", "Jacksonville"
];
const WHITTINGHAM_LOCATIONS = [
  "Indianapolis", "Carmel", "Evansville"
];
const MCLAIN_LOCATIONS = [
  "Birmingham", "Mobile", "Huntsville"
];

// 4. Prepare grouped arrays
const everett = [];
const whittingham = [];
const mclain = [];
const others = [];

for (const obj of normalizedRows) {
  const loc = (obj.location || "").trim();
  const city = loc.split(",")[0];
  const job = (obj.job_title || "").trim();

  if (
    EVERETT_LOCATIONS.includes(city) ||
    (loc === "Dallas, TX" && job === "Insurance Representative")
  ) {
    everett.push(obj);
  } else if (WHITTINGHAM_LOCATIONS.includes(city)) {
    whittingham.push(obj);
  } else if (MCLAIN_LOCATIONS.includes(city)) {
    mclain.push(obj);
  } else {
    others.push(obj);
  }
}

// 5. Output results: groups + individual
const output = [];
if (everett.length > 0) {
  output.push({ json: { locations: "Everett", jobs: everett } });
}
if (whittingham.length > 0) {
  output.push({ json: { locations: "Whittingham", jobs: whittingham } });
}
if (mclain.length > 0) {
  output.push({ json: { locations: "McLain", jobs: mclain } });
}
output.push(...others.map(obj => ({ json: obj })));

return output;
