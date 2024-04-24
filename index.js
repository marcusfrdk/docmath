let fractions;
let equations;

let _config;
let _values;

let _defined;
let _computed;

const MATRIX_ATTRIBUTES = ["rows", "cols", "matrix"];
const DEFAULT_FRACTIONS = 3;

// --- UTILS ---
function isMatrix(value){
  return typeof value === "object" && MATRIX_ATTRIBUTES.some(attribute => value.hasOwnProperty(attribute));
}

function handleError(error){
  console.error(error);


  const equations = document.getElementById("equations");
  const variables = document.getElementById("variables");

  if(equations) equations.remove();
  if(variables) variables.remove();

  document.body.style.display = "flex";
  document.body.style.justifyContent = "center";
  document.body.style.alignItems = "center";
  document.body.style.padding = "0";
  document.body.style.height = "100dvh";
  document.documentElement.style.padding = "0";

  const errorMessage = document.createElement("p");
  errorMessage.textContent = error;
  document.body.appendChild(errorMessage);
}

// --- COMPUTE ---
function recompute(){
  const args =  Object.keys(_values)
  .filter(key => _defined.includes(key))
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
        let template = `
          \\begin{bmatrix}
            ${value.map(row => {
              return row.map(cell => {
                if(typeof cell === "number"){
                  return String(cell).includes(".") ? cell.toFixed(2) : cell;
                } 
                return "";
              }).join(" & ");
            }).join(" \\\\") }
          \\end{bmatrix}
        `;

        output = output.replaceAll(`{{${key}}}`, template);
      } else if(typeof value === "object"){
        // Eigenvectors
        if(value.hasOwnProperty("eigenvectors")){
          const values = Object.values(value.eigenvectors).map(({value}) => {
            if(typeof value === "number"){
              return String(value).includes(".") ? value.toFixed(2) : value;
            }
            return "";
          });
          const string = `EigenValues(${values.join(", ")})`;
          output = output.replaceAll(`{{${key}}}`, string);
        } else {
          output = output.replaceAll(`{{${key}}}`, "\\text{Unsupported object}");
        }
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
  const [variable, row, col] = id.split("-");
  const node = document.getElementById(id);
  const config = _config[variable];
  let value = parseFloat(node.value) ?? undefined;

  // Validate
  if(typeof config.min === "number" && (value < config.min || isNaN(value))){
    value = config.min;
  }

  if(typeof config.max === "number" && value > config.max){
    node.value = config.max;
    value = config.max;
  }

  _values[variable][row][col] = value || 0;

  recompute();
}

// --- INITIALIZATION ---

function getVariables(equation){
  const matches = equation.match(/\{\{([^{}]+)\}\}/g);
  if(!matches) return [];
  return [...new Set(matches.map((match) => match.replace(/[^A-Z0-9_]/gi, "")))];
}

function parseEquations(){
  if(typeof equations === "string") equations = [equations];

  // Create a new set
  let _defined = new Set();
  let _computed = new Set();

  equations.forEach((equation, i) => {
    const definition = equation.replace(/\s/g, "");
    let sides = definition.split("=").filter(f => f);

    if(sides.length === 1){
      // console.log("Equation", i + 1, "is a definition.")
      
      getVariables(sides[0]).forEach((variable) => {
        if(!_defined.has(variable) && !_computed.has(variable)) _defined.add(variable);
      });
    } else if(sides.length === 0){
      return handleError(`Equation ${i + 1} has no content.`);
    } else {
      // console.log("Equation", i + 1, "is a computation.");

      sides.forEach((side, j) => {
        getVariables(side).forEach((variable) => {
          if(j === 0){
            if(!_defined.has(variable)) _defined.add(variable);
          } else {
            console.log(variable, _defined, _computed)
            if(_defined.has(variable)){
              return handleError(`Variable '${variable}' is a defined value.`);
            }

            if(!_computed.has(variable)) _computed.add(variable);
          }
        });
      });

    }
  });

  return [[..._defined], [..._computed]];
}

function init(config){
  // Equations
  if(typeof equations === "undefined"){
    return handleError("No equations are defined.")
  }
  
  const [definedDefinitions, computedDefinitions] = parseEquations(equations);

  // Undefined variables
  definedDefinitions.forEach(key => {
    if(!config.hasOwnProperty(key)){
      return handleError(`Undefined variable '${key}' in config.`);
    }
  });

  // Answer defined in config
  computedDefinitions.forEach(key => {
    if(config.hasOwnProperty(key)){
      return handleError(`Cannot define variable '${key}' in config since it is a computed value.`);
    }
  });

  _defined = definedDefinitions;
  _computed = computedDefinitions;

  // Remove unused keys
  const allKeys = Object.keys(config);
  const usedKeys = [..._defined, ..._computed];

  allKeys.forEach(key => {
    if(!usedKeys.includes(key)){
      delete config[key];
    }
  });

  // Validate compute function
  if(typeof compute === "undefined"){
    return handleError("No compute function is defined.")
  }

  const computeString = compute.toString().replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "");
  const returnRegex = /return\s+((?:[^;\n]*\{[^\}]*\})|(?:[^;\n]*))(?=(;|\/\/|\/\*|$))/gm;
  const returnMatch = returnRegex.exec(computeString);
  
  if(!returnMatch){
    return handleError("No return statement found in compute function.");
  }
  
  const removeRhsRegex = /:\s*("[^"]*"|[^,}]*)/g;
  const removeParRegex = /\([^()]*\)/g;
  const removeCommentRegex = /\/\/[^\n]*|\/\*[^]*?\*\//g;
  
  let returnStatement = (returnMatch.length < 1 ? returnMatch.join("") : returnMatch[1]);
  returnStatement = returnStatement.replace(removeCommentRegex, "").replace(/\s|\/\//g, "");

  while(returnStatement.includes("(") || returnStatement.includes(")")){
    returnStatement = returnStatement.replace(removeParRegex, "");
  }
  returnStatement = returnStatement.replace(removeRhsRegex, "").replace(/[^A-Z0-9_,\{\}]/gi, "");
  const keyRegex = /[{(,]\s*[A-Za-z0-9_]+:?/g;
  const keyMatches = (returnStatement.match(keyRegex) || []).map(match => match.replace(/[^A-Za-z0-9_]/g, ""));

  const returnVariables = [...new Set(keyMatches.map((match) => match.replace(/\s/g, "").replace(/:|,/g, "")))];

  // compute() returns all required variables
  const missingComputedValues = computedDefinitions.filter(variable => !returnVariables.includes(variable));

  if(missingComputedValues.length > 0){
    return handleError(`Missing variable${missingComputedValues.length === 1 ? "" : "s"} ${missingComputedValues.join(", ")} in the compute function's return value.`);
  }

  // Fractions
  if(typeof fractions !== "undefined"){
    if(typeof fractions !== "number"){
      return handleError("Fractions must be a number.");
    }

    if(fractions < 0){
      return handleError("Fractions must be a positive integer.");
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
    "matrix": ["object", "undefined"],
  };

  Object.entries(config).forEach(([key, value]) => {
    if(typeof value !== "object"){
      return handleError(`Invalid type for '${key}'.`);
    }

    // Matrix
    if(isMatrix(value)){
      const hasMatrix = value.hasOwnProperty("matrix");
      const hasRows = value.hasOwnProperty("rows");
      const hasCols = value.hasOwnProperty("cols");

      if(hasMatrix && (hasRows || hasCols)){
        const attributes = hasRows && hasCols ? "'rows' and 'cols'" : hasRows ? "'rows'" : "'cols'";
        return handleError(`Cannot define 'matrix' and ${attributes} together for '${key}'.`);
      }
    }

    // Attributes
    Object.entries(value).forEach(([attribute, val]) => {
      if(!validTypes.hasOwnProperty(attribute)){
        return handleError(`Invalid attribute '${attribute}' for '${key}'.`);
      }

      if(!validTypes[attribute].includes(typeof val)){
        const expectedTypes = validTypes[attribute].join(", ");
        return handleError(`Invalid type for '${key}.${attribute}', got '${typeof val}', expected one of ${expectedTypes}.`);
      }
    });
  });

  // Set global variables
  _config = config;
  _values = Object.entries(config).reduce((acc, [key, value]) => {
    if(isMatrix(value)){
      if(value.hasOwnProperty("matrix")){
        acc[key] = value.matrix;
      } else {
        const defaultValue = typeof _config[key].min === "number" ? _config[key].min : 0;
        acc[key] = Array(value.rows || value.cols).fill().map(() => Array(value.cols || value.rows).fill(defaultValue));
      }

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

  definedDefinitions.sort().forEach((variable) => {
    const containerElement = document.createElement("div");

    const labelElement = document.createElement("label");
    labelElement.for = variable;
    labelElement.textContent = `${variable} =`;

    // Matrix
    if(isMatrix(_config[variable])){
      const tableElement = document.createElement("table");
      tableElement.id = variable;
      tableElement.className = "matrix";

      let rows, cols;
      let isCustom = _config[variable].hasOwnProperty("matrix");

      if(isCustom){
        _values[variable] = _config[variable].matrix;
        rows = _config[variable].matrix.length;
        cols = _config[variable].matrix[0].length;
      } else {
        rows = _config[variable].rows || _config[variable].cols;
        cols = _config[variable].cols || _config[variable].rows;
      }

      for(let i = 0; i < rows; i++){
        const rowElement = document.createElement("tr");

        for(let j = 0; j < cols; j++){
          const cellElement = document.createElement("td");

          const inputElement = document.createElement("input");
          inputElement.id = `${variable}-${i}-${j}`;
          inputElement.name = `${variable}-${i}-${j}`;
          inputElement.type = "number";

          if(isCustom){
            inputElement.value = _values[variable][i][j];
          } else if(typeof _config[variable].min === "number") {
            inputElement.value = _config[variable].min;
          }

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
    if(isMatrix(_config[key])){
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
    const isMatrix = ["rows", "cols", "matrix"].some(attribute => _config[variable].hasOwnProperty(attribute));

    if(isMatrix){
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