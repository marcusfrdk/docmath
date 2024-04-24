let fractions;
let equations;

let _config;
let _values;

let _variables;
let _answers;

const DEFAULT_FRACTIONS = 3;

// --- COMPUTE ---
function recompute(){
  const args =  Object.keys(_values)
  .filter(key => _variables.includes(key))
  .reduce((obj, key) => {
    obj[key] = _values[key];
    return obj;
  }, {});

  let values = {
    ..._values,
    ...compute(args)
  };

  // Set default fraction
  if(typeof fractions !== "number"){
    fractions = DEFAULT_FRACTIONS;
  }

  // Update equations
  equations.forEach((equation, index) => {
    let output = equation;
    
    Object.entries(values).forEach(([key, value]) => {
      // Convert math.Matrix to array
      if(typeof math !== "undefined" && value instanceof math.Matrix){
        value = value.toArray().map(row => row.map(cell => isNaN(cell) ? 0 : cell));
      }

      if(Array.isArray(value)){
        // console.log("Matrix", key, value);
        let template = `
          \\begin{bmatrix}
            ${value.map(row => {
              return row.map(cell => typeof cell === "number" ? cell : "").join(" & ");
            }).join(" \\\\") }
          \\end{bmatrix}
        `;

        output = output.replaceAll(`{{${key}}}`, template);
      } else {
        let val = value || key;
  
        // Decimals
        if(String(val).includes(".")){
          const decimalPart = String(val).split(".")[1];
          const leadingZeros = decimalPart.match(/^0*/)[0].length;
          const decimals = decimalPart.length;
  
          // Scientific notation
          if(leadingZeros > fractions){
            val = Number(value).toExponential(fractions);
          }
          // Fixed number of decimals
          else if(decimals > fractions){
            val = parseFloat(value.toFixed(fractions));
  
            if(val === 0) val = Number(value).toExponential(fractions);
          }
        }
  
        output = output.replaceAll(`{{${key}}}`, val);
      }
    });

    const equationElement = document.getElementById(`equation-${index + 1}`);
    equationElement.innerHTML = katex.renderToString(output, {throwOnError: false});
  });
}

function onInput(event){
  const id = event.srcElement.id;
  const node = document.getElementById(id);
  const config = _config[id];

  let value = parseFloat(node.value) ?? undefined;

  // Validate
  if(typeof config.min !== "undefined" && value < config.min){
    value = config.min;
    node.value = value;
  }
  
  if(typeof config.max !== "undefined" && value > config.max){
    value = config.max;
    node.value = value;
  }

  _values[id] = Number(value);

  recompute();
};

function onMatrix(event){
  const id = event.srcElement.id;
  const node = document.getElementById(id);
  const value = parseFloat(node.value) ?? undefined;

  const [variable, row, col] = id.split("-");

  // Handle min, max

  _values[variable][col][row] = value;

  recompute();
}

// --- INITIALIZATION ---
function parseEquations(){
  if(typeof equations === "string") equations = [equations];

  // Create a new set
  let _variables = new Set();
  let _answers = new Set();

  equations.forEach((equation, index) => {
    const ans_regex = /=\s*\{\{([^{}]+)\}\}$/g;
    const ans_match = ans_regex.exec(equation);
    
    if(ans_match) _answers.add(ans_match[1]);

    const var_matches = equation.match(/{{(.*?)}}/g).map((match) => match.replace(/{{|}}/g, "").replace(/[^A-Za-z0-9_]/g, ""));
    
    var_matches.forEach((var_match) => {
      if(!_answers.has(var_match)) {
        _variables.add(var_match);
      };
    });
  });

  return [[..._variables], [..._answers]];
}

function init(config){
  // Equations
  if(typeof equations === "undefined"){
    throw new Error("No equations are defined.")
  }
  
  const [variableDefinitions, answerDefinitions] = parseEquations(equations);

  // Check if any values are both defined and computed
  const common = variableDefinitions.filter(value => answerDefinitions.includes(value));
  if(common.length > 0){
    throw new Error(`Variable${common.length === 1 ? "" : "s"} ${common.join(", ")} ${common.length === 1 ? "is" : "are"} both defined and computed.`);
  }

  // Undefined variables
  variableDefinitions.forEach(key => {
    if(!config.hasOwnProperty(key)){
      throw new Error(`Undefined variable '${key}' in config.`);
    }
  });

  // Answer defined in config
  answerDefinitions.forEach(key => {
    if(config.hasOwnProperty(key)){
      throw new Error(`Cannot define variable '${key}' in config since it is a computed value.`);
    }
  });

  _variables = variableDefinitions;
  _answers = answerDefinitions;

  // Validate compute function
  if(typeof compute === "undefined"){
    throw new Error("No compute function is defined.")
  }

  const computeString = compute.toString().replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "");
  const returnRegex = /return\s+((?:[^;\n]*\{[^\}]*\})|(?:[^;\n]*))(?=(;|\/\/|\/\*|$))/gm;
  const returnMatch = returnRegex.exec(computeString);
  
  if(!returnMatch){
    throw new Error("No return statement found in compute function.");
  }
  
  const removeRhsRegex = /:\s*("[^"]*"|[^,}]*)/g;
  const removeParRegex = /\([^()]*\)/g;
  // const removeCommentRegex = /\/\/[^\n]*/g;
  const removeCommentRegex = /\/\/[^\n]*|\/\*[^]*?\*\//g;
  
  let returnStatement = (returnMatch.length < 1 ? returnMatch.join("") : returnMatch[1]);
  returnStatement = returnStatement.replace(removeCommentRegex, "").replace(/\s|\/\//g, "");
  console.log(returnStatement);

  while(returnStatement.includes("(") || returnStatement.includes(")")){
    returnStatement = returnStatement.replace(removeParRegex, "");
  }
  returnStatement = returnStatement.replace(removeRhsRegex, "").replace(/[^A-Z0-9_,\{\}]/gi, "");
  const keyRegex = /[{(,]\s*[A-Za-z0-9_]+:?/g;
  const keyMatches = (returnStatement.match(keyRegex) || []).map(match => match.replace(/[^A-Za-z0-9_]/g, ""));

  const returnVariables = [...new Set(keyMatches.map((match) => match.replace(/\s/g, "").replace(/:|,/g, "")))];

  const missingVariables = answerDefinitions.filter(variable => !returnVariables.includes(variable));
  const redundantVariables = returnVariables.filter(variable => !answerDefinitions.includes(variable));

  if(missingVariables.length > 0){
    throw new Error(`Missing variable${missingVariables.length === 1 ? "" : "s"} ${missingVariables.join(", ")} in the compute function's return value.`);
  }

  if(redundantVariables.length > 0){
    throw new Error(`Redundant variable${redundantVariables.length === 1 ? "" : "s"} ${redundantVariables.join(", ")} in the compute function's return value.`);
  }

  // Fractions
  if(typeof fractions !== "undefined"){
    if(typeof fractions !== "number"){
      throw new Error("Fractions must be a number.");
    }

    if(fractions < 0){
      throw new Error("Fractions must be a positive integer.");
    }
  }

  // Types
  const validTypes = {
    "min": ["number", "undefined"],
    "max": ["number", "undefined"],
    "value": ["number", "undefined"],
    "step": ["number", "undefined"],
    "rows": ["number", "undefined"],
    "cols": ["number", "undefined"],
  };

  Object.entries(config).forEach(([key, value]) => {
    if(typeof value !== "object"){
      throw new Error(`Invalid type for '${key}'.`);
    }

    Object.entries(value).forEach(([attribute, val]) => {
      if(!validTypes.hasOwnProperty(attribute)){
        throw new Error(`Invalid attribute '${attribute}' for '${key}'.`);
      }

      if(!validTypes[attribute].includes(typeof val)){
        const expectedTypes = validTypes[attribute].join(", ");
        throw new Error(`Invalid type for '${key}.${attribute}', got '${typeof val}', expected one of ${expectedTypes}.`);
      }
    });
  });

  // Set global variables
  _config = config;
  _values = Object.entries(config).reduce((acc, [key, value]) => {
    if(value.hasOwnProperty("rows") && value.hasOwnProperty("cols")){
      acc[key] = Array(value.rows || value.cols).fill().map(() => Array(value.cols || value.rows).fill(0));
      return acc;
    }

    acc[key] = typeof value.value === "number" ? value.value : NaN;
    return acc;
  }, {});

  // DOM
  const inputAttributes = ["step", "min", "max", "value"];

  const equationsElement = document.createElement("div");
  equationsElement.id = "equations";

  const variablesElement = document.createElement("form");
  variablesElement.id = "variables";

  equations.forEach((_, index) => {
    const equationElement = document.createElement("div");
    equationElement.id = `equation-${index + 1}`;
    equationElement.className = "equation";
    equationsElement.appendChild(equationElement);
  });

  variableDefinitions.sort().forEach((variable) => {
    const containerElement = document.createElement("div");

    const labelElement = document.createElement("label");
    labelElement.for = variable;
    labelElement.textContent = `${variable} =`;

    // Matrix
    if(_config[variable].hasOwnProperty("rows") && _config[variable].hasOwnProperty("cols")){
      const tableElement = document.createElement("table");
      tableElement.id = variable;
      tableElement.className = "matrix";

      const rows = _config[variable].rows || _config[variable].cols;
      const cols = _config[variable].cols || _config[variable].rows;

      for(let i = 0; i < rows; i++){
        const rowElement = document.createElement("tr");

        for(let j = 0; j < cols; j++){
          const cellElement = document.createElement("td");

          const inputElement = document.createElement("input");
          inputElement.id = `${variable}-${i}-${j}`;
          inputElement.name = `${variable}-${i}-${j}`;
          inputElement.type = "number";
          // inputElement.value = 0;

          cellElement.appendChild(inputElement);
          rowElement.appendChild(cellElement);
        }

        tableElement.appendChild(rowElement);
      }

      containerElement.appendChild(labelElement);
      containerElement.appendChild(tableElement);
    } 
    
    // Input
    else {
      const inputElement = document.createElement("input");
      inputElement.id = variable;
      inputElement.name = variable;
      inputElement.type = "number";

      // Set attributes
      inputAttributes.forEach((attribute) => {
        let value;

        value = _config[variable][attribute];

        if(typeof value !== "undefined"){
          inputElement.setAttribute(attribute, value);
        }
      });

      containerElement.appendChild(labelElement);
      containerElement.appendChild(inputElement);
    }

    variablesElement.appendChild(containerElement);
  });

  document.body.appendChild(equationsElement);
  document.body.appendChild(variablesElement);

  // Add event listeners
  Object.keys(_config).forEach(key => {
    // Matrix
    if(_config[key].hasOwnProperty("rows") && _config[key].hasOwnProperty("cols")){
      const tableElement = document.getElementById(key);
        
      for(let i = 0; i < tableElement.rows.length; i++){
        for(let j = 0; j < tableElement.rows[i].cells.length; j++){
          const inputElement = tableElement.rows[i].cells[j].children[0];
          inputElement.addEventListener("input", onMatrix);
        }
      }
    }
    // Input
    else {
      const inputElement = document.getElementById(key);
      inputElement.addEventListener("input", onInput);
    };
  });

  recompute();
}

function onUnload(){
  Object.keys(_config).forEach(key => {
    // Matrix
    if(_config[key].hasOwnProperty("rows") && _config[key].hasOwnProperty("cols")){
      const tableElement = document.getElementById(key);
        
      for(let i = 0; i < tableElement.rows.length; i++){
        for(let j = 0; j < tableElement.rows[i].cells.length; j++){
          const inputElement = tableElement.rows[i].cells[j].children[0];
          inputElement.removeEventListener("input", onMatrix);
        }
      }
    }
    // Input
    else {
      const inputElement = document.getElementById(key);
      inputElement.removeEventListener("input", onInput);
    }
  });
}